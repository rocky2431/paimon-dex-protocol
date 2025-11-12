// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {DEXRouter} from "../src/dex/DEXRouter.sol";

/**
 * @title UpgradeRouter
 * @notice Deploy new DEXRouter with swap functions
 *
 * Usage:
 * PRIVATE_KEY=<key> BSC_TESTNET_RPC_URL=<rpc> forge script script/UpgradeRouter.s.sol \
 *   --rpc-url $BSC_TESTNET_RPC_URL --broadcast --verify
 */
contract UpgradeRouter is Script {
    // BSC Testnet addresses
    address constant FACTORY = 0x1c1339F5A11f462A354D49ee03377D55B03E7f3D;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("========================================");
        console.log("Upgrade DEXRouter");
        console.log("========================================");
        console.log("Deployer:", deployer);
        console.log("Factory:", FACTORY);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy new Router
        DEXRouter router = new DEXRouter(FACTORY);
        console.log("New DEXRouter deployed:", address(router));

        vm.stopBroadcast();

        console.log("");
        console.log("========================================");
        console.log("Deployment Complete!");
        console.log("========================================");
        console.log("");
        console.log("Update frontend config with:");
        console.log("  router:", address(router));
    }
}
