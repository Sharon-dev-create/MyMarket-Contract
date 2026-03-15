// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {MyMarket} from "src/MyMarket.sol";
import {ERC20Mock} from "lib/openzeppelin-contracts/contracts/mocks/token/ERC20Mock.sol";
import {IERC20Errors} from "lib/openzeppelin-contracts/contracts/interfaces/draft-IERC6093.sol";
import {DeployMyMarketAndLog} from "script/DeployMyMarketAndLog.s.sol";
import {Test} from "forge-std/Test.sol";

contract MyMarketTest is Test {
    MyMarket terminus;
    ERC20Mock token;
    DeployMyMarketAndLog deployScript;

    address seller = address(1);
    address buyer = address(2);

    uint256 constant PRICE = 1 ether;
    function setUp() public {
        // Deploy a mock ERC20 token for testing
        token = new ERC20Mock();

        // Deploy the marketplace with the token address
        terminus = new MyMarket(address(token));

        // Initialize deploy script 
        deployScript = new DeployMyMarketAndLog();
    }

    function testDeploysMyMarket() public {
        address token = address(0x123);

        vm.setEnv("PAYMENT_TOKEN", vm.toString(token));

        MyMarket deployed = deployScript.run();

        assertTrue(address(deployed) != address(0));
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
        terminus.createOrderToken(0);

        token.mint(buyer, 1);
        vm.startPrank(buyer);
        token.approve(address(terminus), 1);
        vm.expectRevert(bytes("Invalid amount"));
        terminus.depositToken(0);
        vm.stopPrank();
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

        vm.expectRevert(bytes("Only seller can create order"));
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

    function testConfirmDeliveryTransfersEth() public {
        uint256 orderId = _createEthOrder();
        vm.deal(buyer, PRICE);
        vm.prank(buyer);
        terminus.depositEth{value: PRICE}(orderId);

        vm.prank(seller);
        terminus.markShipped(orderId);

        uint256 sellerBalBefore = seller.balance;
        vm.prank(buyer);
        terminus.confirmDelivery(orderId);
        assertEq(seller.balance, sellerBalBefore + PRICE);

        (, , , MyMarket.OrderState state, , ) = terminus.orders(orderId);
        assertEq(uint256(state), uint256(MyMarket.OrderState.Delivered));
    }

    function testConfirmDeliveryTransfersToken() public {
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
        assertEq(token.balanceOf(seller), sellerBalBefore + PRICE);
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

    function testClaimAfterTimeoutTransfersEth() public {
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
        assertEq(seller.balance, sellerBalBefore + PRICE);
    }

    function testClaimAfterTimeoutTransfersToken() public {
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

    function testRefundBuyerTransfersEth() public {
        uint256 orderId = _createEthOrder();
        vm.deal(buyer, PRICE);
        vm.prank(buyer);
        terminus.depositEth{value: PRICE}(orderId);

        uint256 buyerBalBefore = buyer.balance;
        vm.prank(buyer);
        terminus.refundBuyer(orderId);
        assertEq(buyer.balance, buyerBalBefore + PRICE);

        (, , , MyMarket.OrderState state, , ) = terminus.orders(orderId);
        assertEq(uint256(state), uint256(MyMarket.OrderState.Refunded));
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

}
