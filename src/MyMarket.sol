//SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

contract MyMarket {
   // State variabes
   IERC20 public immutable paymentToken;

   // Events
   event OrderCreated(uint256 orderId, address seller);
   event OrderFunded(uint256 indexed orderId, address indexed buyer, uint256 amount);
   event OrderShipped(uint256 indexed orderId, address indexed seller);
   event OrderDelivered(uint256 indexed orderId, address indexed buyer);
   event Refunded(uint256 orderId);


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

   constructor(address token) {
      require(token != address(0), "Token address required");
      paymentToken = IERC20(token);
   }

   // Modifiers
   modifier onlySeller(uint256 orderId) {
      require(msg.sender == orders[orderId].seller, "Only seller can create order");
      _;
   }

   modifier onlyBuyer(uint256 orderId){
      require(msg.sender == orders[orderId].buyer, "Only buyer");
      _;
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
      orders[orderCount] = Order({
         buyer: address(0),
         seller: msg.sender,
         amount: price,
         state: OrderState.Created,
         shippedAt: block.timestamp,
         paymentType: paymentType
      });
      emit OrderCreated(orderCount, msg.sender);
   }

   function depositToken(uint256 orderId) external payable {
      //Order must exist
      Order storage order = orders[orderId];

      require(order.state == OrderState.Created, "Order already Funded");
      require(order.paymentType == PaymentType.TOKEN, "Order is ETH");
      require(order.amount > 0, "Invalid amount");

      bool ok = paymentToken.transferFrom(msg.sender, address(this), order.amount);
      require(ok, "Token transfer failed");
      order.buyer = msg.sender;
      order.state = OrderState.Funded;
      emit OrderFunded(orderId, msg.sender, order.amount);
   }

   function depositEth(uint256 orderId) external payable {
      Order storage order = orders[orderId];

      require(order.state == OrderState.Created, "Order already Funded");
      require(order.paymentType == PaymentType.ETH, "Order is token");
      require(msg.value == order.amount, "Incorrect amount");

      order.buyer = msg.sender;
      order.state = OrderState.Funded;
      emit OrderFunded(orderId, msg.sender, msg.value);
   }

   function markShipped(uint256 orderId) external onlySeller(orderId) {
      Order storage theOrder = orders[orderId];
      require(theOrder.state == OrderState.Funded, "Order not funded");

      theOrder.state = OrderState.Shipped;
      theOrder.shippedAt = block.timestamp;
      emit OrderShipped(orderId, msg.sender);
   }
   
   // The buyer confirms the delivery so the funds in the escrow can be released
   function confirmDelivery(uint256 orderId) public onlyBuyer(orderId){
      Order storage order = orders[orderId];
      require(order.state == OrderState.Shipped, "Order not shipped");

      order.state = OrderState.Delivered;
      if (order.paymentType == PaymentType.ETH) {
         (bool ok, ) = payable(order.seller).call{value: order.amount}("");
         require(ok, "ETH transfer failed");
      } else {
         bool ok = paymentToken.transfer(order.seller, order.amount);
         require(ok, "Token transfer failed");
      }
      emit OrderDelivered(orderId, msg.sender);
   }

   //function to allow the seller to claim the paid funds after timestamp where the buyer did not confirm delivery
   function claimAfterTimeout(uint256 orderId) external onlySeller(orderId)  {
      Order storage order = orders[orderId];
      require(order.state == OrderState.Shipped, "Not shipped");

      require(block.timestamp >= order.shippedAt + 7 days, 
               "Buyer confirmation period not over");

      order.state = OrderState.Delivered;
      if (order.paymentType == PaymentType.ETH) {
         (bool ok, ) = payable(order.seller).call{value: order.amount}("");
         require(ok, "ETH transfer failed");
      } else {
         bool ok = paymentToken.transfer(order.seller, order.amount);
         require(ok, "Token transfer failed");
      }
      emit OrderDelivered(orderId, order.buyer);
   }

   function refundBuyer(uint256 orderId) public{
      Order storage order = orders[orderId];

      require(msg.sender == order.buyer, "Not the buyer");
      require(order.state == OrderState.Funded, "Refund not allowed");

      order.state = OrderState.Refunded;

      if (order.paymentType == PaymentType.ETH) {
         (bool ok, ) = payable(order.buyer).call{value: order.amount}("");
         require(ok, "ETH transfer failed");
      } else {
         bool ok = paymentToken.transfer(order.buyer, order.amount);
         require(ok, "Token transfer failed");
      } 
      emit Refunded(orderId);
   }   
}
