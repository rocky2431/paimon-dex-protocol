// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title VRFConfig
 * @notice Configuration constants for Chainlink VRF V2 on BSC
 * @dev Provides network-specific VRF parameters for BSC testnet and mainnet
 */
library VRFConfig {
    // ==================== BSC Mainnet Configuration ====================

    /// @notice VRF Coordinator V2 address on BSC Mainnet
    address public constant BSC_MAINNET_VRF_COORDINATOR = 0xc587d9053cd1118f25F645F9E08BB98c9712A4EE;

    /// @notice 200 gwei gas lane key hash on BSC Mainnet
    bytes32 public constant BSC_MAINNET_KEY_HASH = 0x114f3da0a805b6a67d6e9cd2ec746f7028f1b7376365af575cfea3550dd1aa04;

    /// @notice Recommended LINK funding for mainnet subscription (100 LINK)
    uint256 public constant BSC_MAINNET_LINK_FUNDING = 100 ether;

    // ==================== BSC Testnet Configuration ====================

    /// @notice VRF Coordinator V2 address on BSC Testnet (Chapel)
    address public constant BSC_TESTNET_VRF_COORDINATOR = 0x6A2AAd07396B36Fe02a22b33cf443582f682c82f;

    /// @notice 50 gwei gas lane key hash on BSC Testnet
    bytes32 public constant BSC_TESTNET_KEY_HASH = 0xd4bb89654db74673a187bd804519e65e3f71a52bc55f11da7601a13dcf505314;

    /// @notice Recommended LINK funding for testnet subscription (10 LINK)
    uint256 public constant BSC_TESTNET_LINK_FUNDING = 10 ether;

    // ==================== Common Configuration ====================

    /// @notice Number of block confirmations before VRF fulfillment
    /// @dev 3 confirmations provide good balance between speed and security
    uint16 public constant REQUEST_CONFIRMATIONS = 3;

    /// @notice Callback gas limit for fulfillRandomWords
    /// @dev 200,000 gas is sufficient for updating NFT state and emitting events
    uint32 public constant CALLBACK_GAS_LIMIT = 200_000;

    /// @notice Number of random words to request
    /// @dev We only need 1 random number for each dice roll
    uint32 public constant NUM_WORDS = 1;

    // ==================== Helper Functions ====================

    /**
     * @notice Get VRF Coordinator address for a network
     * @param chainId Chain ID (56 for BSC Mainnet, 97 for BSC Testnet)
     * @return coordinator VRF Coordinator address
     */
    function getCoordinator(uint256 chainId) internal pure returns (address coordinator) {
        if (chainId == 56) {
            return BSC_MAINNET_VRF_COORDINATOR;
        } else if (chainId == 97) {
            return BSC_TESTNET_VRF_COORDINATOR;
        } else {
            revert("VRFConfig: unsupported chain");
        }
    }

    /**
     * @notice Get key hash for a network
     * @param chainId Chain ID (56 for BSC Mainnet, 97 for BSC Testnet)
     * @return keyHash VRF key hash
     */
    function getKeyHash(uint256 chainId) internal pure returns (bytes32 keyHash) {
        if (chainId == 56) {
            return BSC_MAINNET_KEY_HASH;
        } else if (chainId == 97) {
            return BSC_TESTNET_KEY_HASH;
        } else {
            revert("VRFConfig: unsupported chain");
        }
    }

    /**
     * @notice Get recommended LINK funding for a network
     * @param chainId Chain ID (56 for BSC Mainnet, 97 for BSC Testnet)
     * @return funding Recommended LINK amount in wei
     */
    function getRecommendedFunding(uint256 chainId) internal pure returns (uint256 funding) {
        if (chainId == 56) {
            return BSC_MAINNET_LINK_FUNDING;
        } else if (chainId == 97) {
            return BSC_TESTNET_LINK_FUNDING;
        } else {
            revert("VRFConfig: unsupported chain");
        }
    }

    /**
     * @notice Validate VRF configuration parameters
     * @param coordinator VRF Coordinator address
     * @param keyHash VRF key hash
     * @param subscriptionId VRF subscription ID
     */
    function validateConfig(address coordinator, bytes32 keyHash, uint64 subscriptionId) internal pure {
        require(coordinator != address(0), "VRFConfig: zero coordinator");
        require(keyHash != bytes32(0), "VRFConfig: zero key hash");
        require(subscriptionId != 0, "VRFConfig: zero subscription ID");
    }
}
