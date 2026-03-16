// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "../test/mocks/MockERC20.sol";

contract DeployMockERC20 is Script {
    function run() external {
        vm.startBroadcast();
        MockERC20 token = new MockERC20();
        vm.stopBroadcast();

        console.log("MockERC20 deployed at:", address(token));
    }
}
