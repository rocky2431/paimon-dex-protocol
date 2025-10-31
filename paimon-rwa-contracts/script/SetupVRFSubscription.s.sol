// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/presale/VRFConfig.sol";

// VRF Coordinator V2 interface (minimal)
interface IVRFCoordinatorV2 {
        function createSubscription() external returns (uint64 subId);
        function fundSubscription(uint64 subId, uint96 amount) external;
        function addConsumer(uint64 subId, address consumer) external;
        function getSubscription(uint64 subId)
            external
            view
            returns (uint96 balance, uint64 reqCount, address owner, address[] memory consumers);
}

// LINK Token interface (minimal)
interface ILINK {
    function transferAndCall(address to, uint256 value, bytes calldata data) external returns (bool success);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

/**
 * @title SetupVRFSubscription
 * @notice Script to create and configure Chainlink VRF V2 subscription for RWABondNFT
 * @dev Run this script after deploying RWABondNFT to set up VRF subscription
 *
 * Usage:
 *   # BSC Testnet
 *   forge script script/SetupVRFSubscription.s.sol:SetupVRFSubscription \
 *     --rpc-url $BSC_TESTNET_RPC \
 *     --broadcast \
 *     --verify
 *
 *   # BSC Mainnet (use with caution!)
 *   forge script script/SetupVRFSubscription.s.sol:SetupVRFSubscription \
 *     --rpc-url $BSC_MAINNET_RPC \
 *     --broadcast \
 *     --verify
 */
contract SetupVRFSubscription is Script {
    // LINK Token addresses
    address constant BSC_MAINNET_LINK = 0x404460C6A5EdE2D891e8297795264fDe62ADBB75;
    address constant BSC_TESTNET_LINK = 0x84b9B910527Ad5C03A9Ca831909E21e236EA7b06;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        // Detect network
        uint256 chainId = block.chainid;
        console.log("Setting up VRF subscription on chain ID:", chainId);
        console.log("Deployer address:", deployer);

        // Get network-specific configuration
        address vrfCoordinator = VRFConfig.getCoordinator(chainId);
        bytes32 keyHash = VRFConfig.getKeyHash(chainId);
        uint256 recommendedFunding = VRFConfig.getRecommendedFunding(chainId);
        address linkToken = chainId == 56 ? BSC_MAINNET_LINK : BSC_TESTNET_LINK;

        console.log("VRF Coordinator:", vrfCoordinator);
        console.log("Key Hash:", vm.toString(keyHash));
        console.log("Recommended LINK funding:", recommendedFunding / 1e18, "LINK");
        console.log("LINK Token:", linkToken);

        vm.startBroadcast(deployerPrivateKey);

        // Check LINK balance
        ILINK link = ILINK(linkToken);
        uint256 linkBalance = link.balanceOf(deployer);
        console.log("Deployer LINK balance:", linkBalance / 1e18, "LINK");
        require(linkBalance >= recommendedFunding, "Insufficient LINK balance");

        // Create subscription
        IVRFCoordinatorV2 coordinator = IVRFCoordinatorV2(vrfCoordinator);
        uint64 subscriptionId = coordinator.createSubscription();
        console.log("Created subscription ID:", subscriptionId);

        // Fund subscription
        link.transferAndCall(vrfCoordinator, recommendedFunding, abi.encode(subscriptionId));
        console.log("Funded subscription with", recommendedFunding / 1e18, "LINK");

        // Add consumer (RWABondNFT contract address - update this!)
        // address rwaBondNFT = vm.envAddress("RWA_BOND_NFT_ADDRESS");
        // coordinator.addConsumer(subscriptionId, rwaBondNFT);
        // console.log("Added consumer:", rwaBondNFT);

        // Get subscription details
        (uint96 balance, uint64 reqCount, address owner, address[] memory consumers) =
            coordinator.getSubscription(subscriptionId);
        console.log("Subscription balance:", balance / 1e18, "LINK");
        console.log("Request count:", reqCount);
        console.log("Owner:", owner);
        console.log("Consumers count:", consumers.length);

        vm.stopBroadcast();

        console.log("\n===========================================");
        console.log("VRF Subscription Setup Complete!");
        console.log("===========================================");
        console.log("Subscription ID:", subscriptionId);
        console.log("Next steps:");
        console.log("1. Deploy RWABondNFT with this subscription ID");
        console.log("2. Add RWABondNFT as consumer using addConsumer()");
        console.log("3. Test dice rolling on testnet");
        console.log("===========================================\n");
    }

    /**
     * @notice Helper function to add consumer after RWABondNFT deployment
     * @dev Run this separately after deploying RWABondNFT
     */
    function addConsumer(uint64 subscriptionId, address consumer) external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        uint256 chainId = block.chainid;
        address vrfCoordinator = VRFConfig.getCoordinator(chainId);

        vm.startBroadcast(deployerPrivateKey);

        IVRFCoordinatorV2 coordinator = IVRFCoordinatorV2(vrfCoordinator);
        coordinator.addConsumer(subscriptionId, consumer);

        console.log("Added consumer", consumer, "to subscription", subscriptionId);

        vm.stopBroadcast();
    }
}
