//SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "forge-std/console2.sol";
import {MyMarket} from "src/MyMarket.sol";

contract DeployMyMarketAndLog is Script {
    function run() external returns (MyMarket deployed) {
        address token = vm.envAddress("PAYMENT_TOKEN");
        string memory apiKey = vm.envOr("ETHERSCAN_API_KEY", string(""));

        vm.startBroadcast();
        deployed = new MyMarket(token);
        vm.stopBroadcast();

        console2.log("MyMarket deployed at:", address(deployed));
        if (bytes(apiKey).length == 0) {
            console2.log("ETHERSCAN_API_KEY not set (needed for --verify).");
        }
    }
}
