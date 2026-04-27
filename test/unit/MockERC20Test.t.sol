// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test, console} from "forge-std/Test.sol";
import {MockERC20} from "test/mocks/MockERC20.sol";

contract MockERC20Test is Test {
    MockERC20 token;
    address deployer = address(this);
    address user1 = address(1);
    address user2 = address(2);

    function setUp() public {
        token = new MockERC20();
    }

    function testConstructor() public {
        // Check initial supply is minted to deployer
        uint256 expectedInitialSupply = 1_000_000 * 10 ** token.decimals();
        assertEq(token.totalSupply(), expectedInitialSupply);
        assertEq(token.balanceOf(deployer), expectedInitialSupply);

        // Check token metadata
        assertEq(token.name(), "Mock USDC");
        assertEq(token.symbol(), "mUSDC");
        assertEq(token.decimals(), 18);
    }

    function testMint() public {
        uint256 mintAmount = 1000 * 10 ** token.decimals();

        // Mint to user1
        token.mint(user1, mintAmount);

        // Check balance increased
        assertEq(token.balanceOf(user1), mintAmount);
        assertEq(token.totalSupply(), (1_000_000 + 1000) * 10 ** token.decimals());
    }

    function testMintMultipleTimes() public {
        uint256 mintAmount1 = 500 * 10 ** token.decimals();
        uint256 mintAmount2 = 300 * 10 ** token.decimals();

        // Mint to user1 twice
        token.mint(user1, mintAmount1);
        token.mint(user1, mintAmount2);

        // Check total balance
        assertEq(token.balanceOf(user1), mintAmount1 + mintAmount2);
        assertEq(token.totalSupply(), (1_000_000 + 500 + 300) * 10 ** token.decimals());
    }

    function testTransfer() public {
        uint256 transferAmount = 100 * 10 ** token.decimals();

        // Transfer from deployer to user1
        vm.prank(deployer);
        token.transfer(user1, transferAmount);

        // Check balances
        assertEq(token.balanceOf(user1), transferAmount);
        assertEq(token.balanceOf(deployer), (1_000_000 - 100) * 10 ** token.decimals());
    }

    function testApproveAndTransferFrom() public {
        uint256 approveAmount = 200 * 10 ** token.decimals();
        uint256 transferAmount = 50 * 10 ** token.decimals();

        // Approve user1 to spend deployer's tokens
        vm.prank(deployer);
        token.approve(user1, approveAmount);

        // Check allowance
        assertEq(token.allowance(deployer, user1), approveAmount);

        // Transfer from deployer to user2 via user1
        vm.prank(user1);
        token.transferFrom(deployer, user2, transferAmount);

        // Check balances and allowance
        assertEq(token.balanceOf(user2), transferAmount);
        assertEq(token.balanceOf(deployer), (1_000_000 - 50) * 10 ** token.decimals());
        assertEq(token.allowance(deployer, user1), approveAmount - transferAmount);
    }
}