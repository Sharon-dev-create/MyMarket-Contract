//SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Ownable} from "lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";

contract MyMarket is Ownable, ReentrancyGuard {
   using SafeERC20 for IERC20;
   // State variabes
   IERC20 public immutable PAYMENT_TOKEN;

   // Pull-payment balances (escrow releases)
   mapping(address => uint256) public pendingEth;
   mapping(address => uint256) public pendingToken;

   // Platform fees (basis points, 1 bps = 0.01%)
   uint16 public constant BPS_DENOMINATOR = 10_000;
   uint16 public constant MAX_PLATFORM_FEE_BPS = 1_000; // 10%
   uint16 public platformFeeBps;
   address public feeRecipient;

   // Events
   event OrderCreated(uint256 orderId, address seller);
   event OrderFunded(uint256 indexed orderId, address indexed buyer, uint256 amount);
   event OrderShipped(uint256 indexed orderId, address indexed seller);
   event OrderDelivered(uint256 indexed orderId, address indexed buyer);
   event Refunded(uint256 orderId);
   event OrderRelisted(uint256 indexed orderId, address indexed seller, uint256 amount, PaymentType paymentType);
   event Withdrawal(address indexed account, uint256 amount, PaymentType paymentType);
   event PlatformFeeUpdated(uint16 feeBps);
   event FeeRecipientUpdated(address indexed recipient);
   event PlatformFeeAccrued(
      uint256 indexed orderId,
      address indexed recipient,
      uint256 amount,
      PaymentType paymentType
   );


   // enums to set states
   enum OrderState {
      Created,
      Funded,
      Shipped,
      Delivered,
      Refunded
   }

   enum PaymentType {
      ETH,
      TOKEN
   }

   //Store in the struct
   struct Order{
      address buyer;
      address seller;
      uint256 amount;
      OrderState state;
      uint256 shippedAt;
      PaymentType paymentType;
   }

   // Mapping--store multiple orders
   mapping(uint256 => Order) public orders;
   
   uint256 public orderCount;

   constructor(address token) Ownable(msg.sender) {
      require(token != address(0), "Token address required");
      PAYMENT_TOKEN = IERC20(token);
      feeRecipient = msg.sender;
   }

   // Modifiers
   modifier onlySeller(uint256 orderId) {
      require(msg.sender == orders[orderId].seller, "Only seller");
      _;
   }

   modifier onlyBuyer(uint256 orderId){
      require(msg.sender == orders[orderId].buyer, "Only buyer");
      _;
   }

   modifier validOrder(uint256 orderId) {
      require(orderId < orderCount, "Order does not exist");
      _;
   }

   function setPlatformFeeBps(uint16 newFeeBps) external onlyOwner {
      require(newFeeBps <= MAX_PLATFORM_FEE_BPS, "Fee too high");
      platformFeeBps = newFeeBps;
      emit PlatformFeeUpdated(newFeeBps);
   }

   function setFeeRecipient(address newRecipient) external onlyOwner {
      require(newRecipient != address(0), "Invalid recipient");
      feeRecipient = newRecipient;
      emit FeeRecipientUpdated(newRecipient);
   }

   function previewPlatformFee(uint256 amount) external view returns (uint256 fee, uint256 sellerProceeds) {
      fee = (amount * platformFeeBps) / BPS_DENOMINATOR;
      sellerProceeds = amount - fee;
   }

   //Seller calls createOrder()
   //Contract stores seller + price
   //Order state = Created
   function createOrder(uint256 price) external {
     _createOrder(price, PaymentType.TOKEN);
     orderCount++;
   }

   function createOrderEth(uint256 price) external {
      _createOrder(price, PaymentType.ETH);
      orderCount++;
   }

   function createOrderToken(uint256 price) external {
      _createOrder(price, PaymentType.TOKEN);
      orderCount++;
   }

   function _createOrder(uint256 price, PaymentType paymentType) internal {
      require(price > 0, "Invalid amount");
      orders[orderCount] = Order({
         buyer: address(0),
         seller: msg.sender,
         amount: price,
         state: OrderState.Created,
         shippedAt: 0,
         paymentType: paymentType
      });
      emit OrderCreated(orderCount, msg.sender);
   }

   function depositToken(uint256 orderId) external validOrder(orderId) {
      _fundToken(orderId, msg.sender);
   }

   function depositEth(uint256 orderId) external payable validOrder(orderId){
      _fundEth(orderId, msg.sender, msg.value);
   }

   function buy(uint256 orderId) external payable validOrder(orderId) {
      Order storage order = orders[orderId];
      if (order.paymentType == PaymentType.ETH) {
         _fundEth(orderId, msg.sender, msg.value);
      } else {
         require(msg.value == 0, "ETH not accepted for token orders");
         _fundToken(orderId, msg.sender);
      }
   }

   function relistOrder(
      uint256 orderId,
      uint256 price,
      PaymentType paymentType
   ) external validOrder(orderId) onlySeller(orderId) {
      require(price > 0, "Invalid amount");

      Order storage order = orders[orderId];
      require(
         order.state == OrderState.Created ||
            order.state == OrderState.Delivered ||
            order.state == OrderState.Refunded,
         "Cannot relist active order"
      );

      order.buyer = address(0);
      order.amount = price;
      order.state = OrderState.Created;
      order.shippedAt = 0;
      order.paymentType = paymentType;

      emit OrderRelisted(orderId, msg.sender, price, paymentType);
   }

   function isOrderBuyable(uint256 orderId) external view validOrder(orderId) returns (bool) {
      Order storage order = orders[orderId];
      return order.state == OrderState.Created && order.buyer == address(0) && order.amount > 0;
   }

   function _fundToken(uint256 orderId, address buyer) internal {
      Order storage order = orders[orderId];

      require(order.state == OrderState.Created, "Order already Funded");
      require(order.paymentType == PaymentType.TOKEN, "Order is ETH");
      require(order.amount > 0, "Invalid amount");

      order.state = OrderState.Funded;
      order.buyer = buyer;

      uint256 beforeBal = PAYMENT_TOKEN.balanceOf(address(this));
      PAYMENT_TOKEN.safeTransferFrom(buyer, address(this), order.amount);
      uint256 received = PAYMENT_TOKEN.balanceOf(address(this)) - beforeBal;
      require(received == order.amount, "Token transfer mismatch");

      emit OrderFunded(orderId, buyer, order.amount);
   }

   function _fundEth(uint256 orderId, address buyer, uint256 value) internal {
      Order storage order = orders[orderId];

      require(order.state == OrderState.Created, "Order already Funded");
      require(order.paymentType == PaymentType.ETH, "Order is token");
      require(value == order.amount, "Incorrect amount");

      order.buyer = buyer;
      order.state = OrderState.Funded;
      emit OrderFunded(orderId, buyer, value);
   }

   function markShipped(uint256 orderId) external validOrder(orderId) onlySeller(orderId) {
      Order storage theOrder = orders[orderId];
      require(theOrder.state == OrderState.Funded, "Order not funded");

      theOrder.state = OrderState.Shipped;
      theOrder.shippedAt = block.timestamp;
      emit OrderShipped(orderId, msg.sender);
   }
   
   function _accrueRelease(
      uint256 orderId,
      address buyer,
      address seller,
      uint256 amount,
      PaymentType paymentType
   ) internal {
      uint256 fee = (amount * platformFeeBps) / BPS_DENOMINATOR;
      uint256 sellerProceeds = amount - fee;

      if (paymentType == PaymentType.ETH) {
         pendingEth[seller] += sellerProceeds;
         if (fee > 0) {
            address recipient = feeRecipient;
            require(recipient != address(0), "Fee recipient not set");
            pendingEth[recipient] += fee;
         }
      } else {
         pendingToken[seller] += sellerProceeds;
         if (fee > 0) {
            address recipient = feeRecipient;
            require(recipient != address(0), "Fee recipient not set");
            pendingToken[recipient] += fee;
         }
      }

      emit OrderDelivered(orderId, buyer);
      if (fee > 0) {
         emit PlatformFeeAccrued(orderId, feeRecipient, fee, paymentType);
      }
   }

   // The buyer confirms the delivery so the funds in the escrow can be released
   function confirmDelivery(uint256 orderId) external validOrder(orderId) onlyBuyer(orderId){
      Order storage order = orders[orderId];
      require(order.state == OrderState.Shipped, "Order not shipped");

      order.state = OrderState.Delivered;
      _accrueRelease(orderId, msg.sender, order.seller, order.amount, order.paymentType);
   }

   //function to allow the seller to claim the paid funds after timestamp where the buyer did not confirm delivery
   function claimAfterTimeout(uint256 orderId) external validOrder(orderId) onlySeller(orderId)  {
      Order storage order = orders[orderId];
      require(order.state == OrderState.Shipped, "Not shipped");

      require(block.timestamp >= order.shippedAt + 7 days, 
               "Buyer confirmation period not over");

      order.state = OrderState.Delivered;
      _accrueRelease(orderId, order.buyer, order.seller, order.amount, order.paymentType);
   }

   function refundBuyer(uint256 orderId) external validOrder(orderId) onlyBuyer(orderId) {
      Order storage order = orders[orderId];
      require(order.state == OrderState.Funded, "Refund not allowed");

      order.state = OrderState.Refunded;

      if (order.paymentType == PaymentType.ETH) {
         pendingEth[order.buyer] += order.amount;
      } else {
         pendingToken[order.buyer] += order.amount;
      } 
      emit Refunded(orderId);
   }   

   function withdrawEth() external nonReentrant {
      uint256 amount = pendingEth[msg.sender];
      require(amount > 0, "Nothing to withdraw");
      pendingEth[msg.sender] = 0;
      (bool ok, ) = payable(msg.sender).call{value: amount}("");
      require(ok, "ETH transfer failed");
      emit Withdrawal(msg.sender, amount, PaymentType.ETH);
   }

   function withdrawToken() external nonReentrant {
      uint256 amount = pendingToken[msg.sender];
      require(amount > 0, "Nothing to withdraw");
      pendingToken[msg.sender] = 0;
      PAYMENT_TOKEN.safeTransfer(msg.sender, amount);
      emit Withdrawal(msg.sender, amount, PaymentType.TOKEN);
   }

   receive() external payable {
      revert("ETH not accepted");
   }

   fallback() external payable {
      revert("Function does not exist");
   }
}
