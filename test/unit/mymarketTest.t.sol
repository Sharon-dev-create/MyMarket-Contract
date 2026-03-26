// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {MyMarket} from "src/MyMarket.sol";
import {ERC20Mock} from "lib/openzeppelin-contracts/contracts/mocks/token/ERC20Mock.sol";
import {IERC20Errors} from "lib/openzeppelin-contracts/contracts/interfaces/draft-IERC6093.sol";
import {DeployMyMarketAndLog} from "script/DeployMyMarketAndLog.s.sol";
import {DeployMockERC20} from "script/DeployMockERC20.s.sol";
import {Test, console} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {MockERC20} from "test/mocks/MockERC20.sol";

contract MyMarketTest is Test {
    MyMarket terminus;
    ERC20Mock token;
    MockERC20 token2;
    DeployMyMarketAndLog deployScript;
    DeployMockERC20 deploy;

    address seller = address(1);
    address buyer = address(2);
    address buyer2 = address(3);
    address feeRecipient = address(9);

    uint256 constant PRICE = 1 ether;
    function setUp() public {
        // Deploy a mock ERC20 token for testing
        token = new ERC20Mock();
        token2 = new MockERC20();

        // Deploy the marketplace with the token address
        terminus = new MyMarket(address(token));
        // terminus = new MyMarket(address(token2));

        // Initialize deploy script 
        deployScript = new DeployMyMarketAndLog();
        deploy = new DeployMockERC20();
    }

    function testDeployMockERC20() public {
        bytes32 transferSig = keccak256("Transfer(address,address,uint256)");

        vm.recordLogs();
        deploy.run();
        Vm.Log[] memory logs = vm.getRecordedLogs();

        address deployedToken = address(0);
        address mintedTo = address(0);
        uint256 mintedAmount = 0;

        for (uint256 i = 0; i < logs.length; i++) {
            Vm.Log memory entry = logs[i];
            if (entry.topics.length != 3) continue;
            if (entry.topics[0] != transferSig) continue;

            address from = address(uint160(uint256(entry.topics[1])));
            if (from != address(0)) continue; // only care about mint

            deployedToken = entry.emitter;
            mintedTo = address(uint160(uint256(entry.topics[2])));
            mintedAmount = abi.decode(entry.data, (uint256));
            break;
        }

        assertTrue(deployedToken != address(0), "DeployMockERC20: no mint log found");

        MockERC20 token = MockERC20(deployedToken);
        assertEq(token.name(), "Mock USDC");
        assertEq(token.symbol(), "mUSDC");

        uint256 expectedSupply = 1_000_000 * 10 ** token.decimals();
        assertEq(token.totalSupply(), expectedSupply);
        assertEq(mintedAmount, expectedSupply);
        assertEq(token.balanceOf(mintedTo), expectedSupply);
    }


    function testDeploysMyMarket() public {
        address token = address(0x123);

        vm.setEnv("PAYMENT_TOKEN", vm.toString(token));

        MyMarket deployed = deployScript.run();

        assertTrue(address(deployed) != address(0));
    }

    function testMint() public {
        uint256 amount = 1000 * 10 ** token.decimals();

        token.mint(buyer, amount);

        assertEq(token.balanceOf(buyer), amount);
    }

    function testRevertTransferInsufficientBalance() public {
        vm.prank(buyer);
        vm.expectRevert();

        token.transfer(address(1), 100);
    }

    function testReverTransferFromNoApproval() public {
        vm.prank(buyer);
        vm.expectRevert();

        token.transferFrom(address(1), buyer, 100);
    }

    function _createEthOrder() internal returns (uint256 orderId) {
        vm.prank(seller);

        terminus.createOrderEth(PRICE);
        return terminus.orderCount() - 1;
    }

    function _createTokenOrder() internal returns (uint256 orderId) {
        vm.prank(seller);

        terminus.createOrderToken(PRICE);
        return terminus.orderCount() - 1;
    }

    function _fundEthOrder() internal returns (uint256 orderId) {
        orderId = _createEthOrder();
        vm.deal(buyer, PRICE);
        vm.prank(buyer);
        terminus.depositEth{value: PRICE}(orderId);
    }

    function _fundTokenOrder() internal returns (uint256 orderId) {
        orderId = _createTokenOrder();
        token.mint(buyer, PRICE);
        vm.startPrank(buyer);
        token.approve(address(terminus), PRICE);
        terminus.depositToken(orderId);
        vm.stopPrank();
    }

    function testConstructorZeroAddressReverts() public {
        vm.expectRevert(bytes("Token address required"));
        new MyMarket(address(0));
    }

    function testOrderCreated() public {
        vm.prank(seller);
        terminus.createOrder(PRICE);

        (
            address buyerAddr,
            address sellerAddr,
            uint256 amount,
            MyMarket.OrderState state,
            ,
            MyMarket.PaymentType paymentType
        ) = terminus.orders(0);

        assertEq(buyerAddr, address(0));
        assertEq(sellerAddr, seller);
        assertEq(amount, PRICE);
        assertEq(uint256(state), uint256(MyMarket.OrderState.Created));
        assertEq(uint256(paymentType), uint256(MyMarket.PaymentType.TOKEN));
    }

    function testCreateOrderIncrementsCount() public {
        assertEq(terminus.orderCount(), 0);
        vm.prank(seller);
        terminus.createOrderEth(PRICE);
        assertEq(terminus.orderCount(), 1);
        vm.prank(seller);
        terminus.createOrderToken(PRICE);
        assertEq(terminus.orderCount(), 2);
    }

    function testBuyerHasDeposited() public {
        vm.prank(seller);
        terminus.createOrderEth(PRICE);

        vm.deal(buyer, PRICE);
        vm.prank(buyer);
        terminus.depositEth{value: PRICE}(0);
        (
            address buyerAddr,
            ,
            uint256 amount,
            MyMarket.OrderState state,
            ,
            MyMarket.PaymentType paymentType
        ) = terminus.orders(0);

        assertEq(buyerAddr, buyer);
        assertEq(amount, PRICE);
        assertEq(uint256(state), uint256(MyMarket.OrderState.Funded));
        assertEq(uint256(paymentType), uint256(MyMarket.PaymentType.ETH));
        assertEq(address(terminus).balance, PRICE);
    }

    function testBuyerHasDepositedToken() public {
        vm.prank(seller);
        terminus.createOrderToken(PRICE);

        token.mint(buyer, PRICE);
        vm.startPrank(buyer);
        token.approve(address(terminus), PRICE);
        terminus.depositToken(0);
        vm.stopPrank();

        (
            address buyerAddr,
            ,
            uint256 amount,
            MyMarket.OrderState state,
            ,
            MyMarket.PaymentType paymentType
        ) = terminus.orders(0);

        assertEq(buyerAddr, buyer);
        assertEq(amount, PRICE);
        assertEq(uint256(state), uint256(MyMarket.OrderState.Funded));
        assertEq(uint256(paymentType), uint256(MyMarket.PaymentType.TOKEN));
        assertEq(token.balanceOf(address(terminus)), PRICE);
    }

    function testDepositEthWrongAmountReverts() public {
        uint256 orderId = _createEthOrder();
        vm.deal(buyer, PRICE);
        vm.expectRevert(bytes("Incorrect amount"));
        vm.prank(buyer);
        terminus.depositEth{value: PRICE - 1}(orderId);
    }

    function testDepositEthOnTokenOrderReverts() public {
        uint256 orderId = _createTokenOrder();
        vm.deal(buyer, PRICE);
        vm.expectRevert(bytes("Order is token"));  
        vm.prank(buyer);
        terminus.depositEth{value: PRICE}(orderId);
    }

    function testDepositTokenOnEthOrderReverts() public {
        uint256 orderId = _createEthOrder();
        token.mint(buyer, PRICE);
        vm.startPrank(buyer);
        token.approve(address(terminus), PRICE);
        vm.expectRevert(bytes("Order is ETH"));
        terminus.depositToken(orderId);
        vm.stopPrank();
    }

    function testDepositTokenZeroAmountReverts() public {
        vm.prank(seller);
        vm.expectRevert(bytes("Invalid amount"));
        terminus.createOrderToken(0);
    }

    function testSecondDepositReverts() public {
        vm.prank(seller);
        terminus.createOrderEth(PRICE);

        vm.deal(buyer, PRICE * 2);
        vm.prank(buyer);
        terminus.depositEth{value: PRICE}(0);
        
        vm.expectRevert(bytes("Order already Funded"));

            vm.prank(buyer);
        terminus.depositEth{value: PRICE}(0);
    }

    function testMarkShippedOnlySellerReverts() public {
        uint256 orderId = _createEthOrder();
        vm.deal(buyer, PRICE);
        vm.prank(buyer);
        terminus.depositEth{value: PRICE}(orderId);

        vm.expectRevert(bytes("Only seller"));
        vm.prank(buyer);
        terminus.markShipped(orderId);
    }

    function testMarkShippedUpdatesStateAndTimestamp() public {
        uint256 orderId = _fundEthOrder();

        vm.warp(1_000);
        vm.prank(seller);
        terminus.markShipped(orderId);

        (, , , MyMarket.OrderState state, uint256 shippedAt, ) = terminus.orders(orderId);
        assertEq(uint256(state), uint256(MyMarket.OrderState.Shipped));
        assertEq(shippedAt, 1_000);
    }

    function testConfirmDeliveryCreditsEthWithdrawal() public {
        uint256 orderId = _createEthOrder();
        vm.deal(buyer, PRICE);
        vm.prank(buyer);
        terminus.depositEth{value: PRICE}(orderId);

        vm.prank(seller);
        terminus.markShipped(orderId);

        uint256 sellerBalBefore = seller.balance;
        vm.prank(buyer);
        terminus.confirmDelivery(orderId);
        assertEq(seller.balance, sellerBalBefore);
        assertEq(terminus.pendingEth(seller), PRICE);

        vm.prank(seller);
        terminus.withdrawEth();
        assertEq(seller.balance, sellerBalBefore + PRICE);
        assertEq(terminus.pendingEth(seller), 0);

        (, , , MyMarket.OrderState state, , ) = terminus.orders(orderId);
        assertEq(uint256(state), uint256(MyMarket.OrderState.Delivered));
    }

    function testConfirmDeliveryAppliesEthPlatformFee() public {
        terminus.setFeeRecipient(feeRecipient);
        terminus.setPlatformFeeBps(250); // 2.5%
        uint256 expectedFee = (PRICE * 250) / 10_000;

        uint256 orderId = _createEthOrder();
        vm.deal(buyer, PRICE);
        vm.prank(buyer);
        terminus.depositEth{value: PRICE}(orderId);

        vm.prank(seller);
        terminus.markShipped(orderId);

        vm.prank(buyer);
        terminus.confirmDelivery(orderId);

        assertEq(terminus.pendingEth(seller), PRICE - expectedFee);
        assertEq(terminus.pendingEth(feeRecipient), expectedFee);
    }

    function testConfirmDeliveryCreditsTokenWithdrawal() public {
        uint256 orderId = _createTokenOrder();
        token.mint(buyer, PRICE);
        vm.startPrank(buyer);
        token.approve(address(terminus), PRICE);
        terminus.depositToken(orderId);
        vm.stopPrank();

        vm.prank(seller);
        terminus.markShipped(orderId);

        uint256 sellerBalBefore = token.balanceOf(seller);
        vm.prank(buyer);
        terminus.confirmDelivery(orderId);
        assertEq(token.balanceOf(seller), sellerBalBefore);
        assertEq(terminus.pendingToken(seller), PRICE);

        vm.prank(seller);
        terminus.withdrawToken();
        assertEq(token.balanceOf(seller), sellerBalBefore + PRICE);
        assertEq(terminus.pendingToken(seller), 0);
    }

    function testConfirmDeliveryAppliesTokenPlatformFee() public {
        terminus.setFeeRecipient(feeRecipient);
        terminus.setPlatformFeeBps(500); // 5%
        uint256 expectedFee = (PRICE * 500) / 10_000;

        uint256 orderId = _createTokenOrder();
        token.mint(buyer, PRICE);
        vm.startPrank(buyer);
        token.approve(address(terminus), PRICE);
        terminus.depositToken(orderId);
        vm.stopPrank();

        vm.prank(seller);
        terminus.markShipped(orderId);

        vm.prank(buyer);
        terminus.confirmDelivery(orderId);

        assertEq(terminus.pendingToken(seller), PRICE - expectedFee);
        assertEq(terminus.pendingToken(feeRecipient), expectedFee);
    }

    function testConfirmDeliveryOnlyBuyerReverts() public {
        uint256 orderId = _fundEthOrder();
        vm.prank(seller);
        terminus.markShipped(orderId);

        vm.expectRevert(bytes("Only buyer"));
        vm.prank(seller);
        terminus.confirmDelivery(orderId);
    }

    function testConfirmDeliveryNotShippedReverts() public {
        uint256 orderId = _fundEthOrder();

        vm.expectRevert(bytes("Order not shipped"));
        vm.prank(buyer);
        terminus.confirmDelivery(orderId);
    }

    function testClaimAfterTimeoutCreditsEthWithdrawal() public {
        uint256 orderId = _createEthOrder();
        vm.deal(buyer, PRICE);
        vm.prank(buyer);
        terminus.depositEth{value: PRICE}(orderId);

        vm.prank(seller);
        terminus.markShipped(orderId);

        vm.warp(block.timestamp + 7 days);
        uint256 sellerBalBefore = seller.balance;
        vm.prank(seller);
        terminus.claimAfterTimeout(orderId);
        assertEq(seller.balance, sellerBalBefore);
        assertEq(terminus.pendingEth(seller), PRICE);

        vm.prank(seller);
        terminus.withdrawEth();
        assertEq(seller.balance, sellerBalBefore + PRICE);
    }

    function testClaimAfterTimeoutCreditsTokenWithdrawal() public {
        uint256 orderId = _createTokenOrder();
        token.mint(buyer, PRICE);
        vm.startPrank(buyer);
        token.approve(address(terminus), PRICE);
        terminus.depositToken(orderId);
        vm.stopPrank();

        vm.prank(seller);
        terminus.markShipped(orderId);

        vm.warp(block.timestamp + 7 days);
        uint256 sellerBalBefore = token.balanceOf(seller);
        vm.prank(seller);
        terminus.claimAfterTimeout(orderId);
        assertEq(token.balanceOf(seller), sellerBalBefore);
        assertEq(terminus.pendingToken(seller), PRICE);

        vm.prank(seller);
        terminus.withdrawToken();
        assertEq(token.balanceOf(seller), sellerBalBefore + PRICE);
    }

    function testClaimAfterTimeoutTooEarlyReverts() public {
        uint256 orderId = _createEthOrder();
        vm.deal(buyer, PRICE);
        vm.prank(buyer);
        terminus.depositEth{value: PRICE}(orderId);

        vm.prank(seller);
        terminus.markShipped(orderId);

        vm.expectRevert(bytes("Buyer confirmation period not over"));
        vm.prank(seller);
        terminus.claimAfterTimeout(orderId);
    }

    function testClaimAfterTimeoutNotShippedReverts() public {
        uint256 orderId = _fundEthOrder();
        vm.warp(block.timestamp + 7 days);

        vm.expectRevert(bytes("Not shipped"));
        vm.prank(seller);
        terminus.claimAfterTimeout(orderId);
    }

    function testRefundBuyerCreditsEthWithdrawal() public {
        uint256 orderId = _createEthOrder();
        vm.deal(buyer, PRICE);
        vm.prank(buyer);
        terminus.depositEth{value: PRICE}(orderId);

        uint256 buyerBalBefore = buyer.balance;
        vm.prank(buyer);
        terminus.refundBuyer(orderId);
        assertEq(buyer.balance, buyerBalBefore);
        assertEq(terminus.pendingEth(buyer), PRICE);

        vm.prank(buyer);
        terminus.withdrawEth();
        assertEq(buyer.balance, buyerBalBefore + PRICE);

        (, , , MyMarket.OrderState state, , ) = terminus.orders(orderId);
        assertEq(uint256(state), uint256(MyMarket.OrderState.Refunded));
    }

    function testDepositTokenNonpayableRevertsWithValue() public {
        uint256 orderId = _createTokenOrder();
        token.mint(buyer, PRICE);
        vm.startPrank(buyer);
        token.approve(address(terminus), PRICE);
        (bool ok, ) = address(terminus).call{value: 1}(
            abi.encodeWithSignature("depositToken(uint256)", orderId)
        );
        vm.stopPrank();
        assertFalse(ok);
    }

    function testMarkShippedInvalidOrderReverts() public {
        vm.expectRevert(bytes("Order does not exist"));
        vm.prank(seller);
        terminus.markShipped(0);
    }

// test reverts if buyer tries to call refund when order has already been delivered
    function testRefundBuyerNotFundedReverts() public {
        uint256 orderId = _createEthOrder();
        vm.deal(buyer, PRICE);
        vm.prank(buyer);
        terminus.depositEth{value: PRICE}(orderId);

        vm.prank(seller);
        terminus.markShipped(orderId);

        vm.expectRevert(bytes("Refund not allowed"));
        vm.prank(buyer);
        terminus.refundBuyer(orderId);
    }

    function testDepositTokenInsufficientBalanceReverts() public {
        uint256 orderId = _createTokenOrder();

        vm.prank(buyer);
        token.approve(address(terminus), PRICE);

        vm.expectRevert(
            abi.encodeWithSelector(
                IERC20Errors.ERC20InsufficientBalance.selector,
                buyer,
                0,
                PRICE
            )
        );
        vm.prank(buyer);
        terminus.depositToken(orderId);
    }

    function testRelistAfterDeliveredMakesOrderBuyableAgain() public {
        uint256 orderId = _createEthOrder();

        vm.deal(buyer, PRICE);
        vm.prank(buyer);
        terminus.depositEth{value: PRICE}(orderId);

        vm.prank(seller);
        terminus.markShipped(orderId);

        vm.prank(buyer);
        terminus.confirmDelivery(orderId);

        vm.prank(seller);
        terminus.relistOrder(orderId, PRICE, MyMarket.PaymentType.ETH);

        assertTrue(terminus.isOrderBuyable(orderId));

        vm.deal(buyer2, PRICE);
        vm.prank(buyer2);
        terminus.buy{value: PRICE}(orderId);

        (address buyerAddr, , , MyMarket.OrderState state, , ) = terminus.orders(orderId);
        assertEq(buyerAddr, buyer2);
        assertEq(uint256(state), uint256(MyMarket.OrderState.Funded));
    }

    function testRelistRevertsWhenOrderIsFundedOrShipped() public {
        uint256 orderId = _fundEthOrder();

        vm.expectRevert(bytes("Cannot relist active order"));
        vm.prank(seller);
        terminus.relistOrder(orderId, PRICE, MyMarket.PaymentType.ETH);

        vm.prank(seller);
        terminus.markShipped(orderId);

        vm.expectRevert(bytes("Cannot relist active order"));
        vm.prank(seller);
        terminus.relistOrder(orderId, PRICE, MyMarket.PaymentType.ETH);
    }

}
