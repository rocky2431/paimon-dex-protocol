// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../src/presale/RWABondNFT.sol";
import "../../src/presale/RemintController.sol";
import "../../src/mocks/MockERC20.sol";
import "../../src/mocks/MockVRFCoordinatorV2.sol";

/**
 * @title BondNFT-VRF Integration Test Suite
 * @notice Integration tests for complete VRF callback flow with RWABondNFT and RemintController
 * @dev Tests end-to-end dice rolling: request → VRF callback → Remint update → Rarity upgrade
 */
contract BondNFTVRFIntegrationTest is Test {
    // ==================== Contracts ====================

    RWABondNFT public bondNFT;
    RemintController public remintController;
    MockERC20 public usdc;
    MockVRFCoordinatorV2 public vrfCoordinator;

    // ==================== Test Accounts ====================

    address public owner = address(0x1);
    address public treasury = address(0x2);
    address public user1 = address(0x4);
    address public user2 = address(0x5);

    // Oracle with known private key for signing
    uint256 public oraclePrivateKey = 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef;
    address public oracle;

    // ==================== Constants ====================

    uint256 public constant MINT_PRICE = 100 * 1e6;
    uint64 public constant VRF_SUBSCRIPTION_ID = 1;
    bytes32 public constant VRF_KEY_HASH = bytes32(uint256(1));
    uint32 public constant VRF_CALLBACK_GAS_LIMIT = 200_000;

    // ==================== Events ====================

    event DiceRollRequested(uint256 indexed tokenId, uint256 requestId, uint8 diceType);
    event DiceResult(uint256 indexed tokenId, uint256 result, uint256 remintEarned);
    event RarityUpgraded(uint256 indexed tokenId, string oldRarity, string newRarity);

    // ==================== Setup ====================

    function setUp() public {
        // Derive oracle address from private key
        oracle = vm.addr(oraclePrivateKey);

        // Deploy USDC mock
        usdc = new MockERC20("USD Coin", "USDC", 6);

        // Deploy Chainlink VRF Coordinator mock
        vrfCoordinator = new MockVRFCoordinatorV2();

        // Deploy RWABondNFT contract
        vm.prank(owner);
        bondNFT = new RWABondNFT(
            address(usdc),
            address(treasury),
            address(vrfCoordinator),
            VRF_SUBSCRIPTION_ID,
            VRF_KEY_HASH,
            VRF_CALLBACK_GAS_LIMIT
        );

        // Deploy RemintController contract
        vm.prank(owner);
        remintController = new RemintController(address(bondNFT), oracle, treasury);

        // Connect RemintController to BondNFT
        vm.prank(owner);
        bondNFT.setRemintController(address(remintController));

        // Fund users with USDC
        usdc.mint(user1, 1_000_000 * 1e6);
        usdc.mint(user2, 1_000_000 * 1e6);

        // Approve bondNFT to spend USDC
        vm.prank(user1);
        usdc.approve(address(bondNFT), type(uint256).max);
        vm.prank(user2);
        usdc.approve(address(bondNFT), type(uint256).max);

        // Approve remintController to spend USDC
        vm.prank(user1);
        usdc.approve(address(remintController), type(uint256).max);
        vm.prank(user2);
        usdc.approve(address(remintController), type(uint256).max);
    }

    // ==================== Integration Tests ====================

    /**
     * @notice Test complete VRF flow: mint → request dice roll → VRF callback → verify Remint update
     */
    function test_Integration_VRF_CompleteDiceRollFlow() public {
        // Step 1: User mints NFT
        vm.prank(user1);
        bondNFT.mint(1);

        uint256 tokenId = 1;
        assertEq(bondNFT.ownerOf(tokenId), user1, "User should own NFT");

        // Step 2: User requests dice roll via RemintController
        vm.prank(user1);
        remintController.rollDice(tokenId);

        // Step 3: Get VRF request ID
        uint256 requestId = vrfCoordinator.getRequestIdCounter();
        assertEq(requestId, 1, "Request ID should be 1");

        // Step 4: Simulate VRF callback with random number
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = 123456; // Deterministic random for testing

        // Calculate expected dice result (Normal dice: 1-6)
        uint256 expectedResult = (randomWords[0] % 6) + 1; // = (123456 % 6) + 1 = 1

        // Fulfill VRF callback (don't check event params as remintEarned is calculated)
        vrfCoordinator.fulfillRandomWords(requestId, randomWords);

        // Step 5: Verify Remint was updated (read from bondNFT, not remintController)
        (,,, uint128 accumulatedRemint,,) = bondNFT.getBondInfo(tokenId);
        assertTrue(accumulatedRemint > 0, "Remint should be earned from dice roll");
    }

    /**
     * @notice Test VRF callback triggers rarity upgrade
     */
    function test_Integration_VRF_RarityUpgradeOnCallback() public {
        // Step 1: Mint NFT
        vm.prank(user1);
        bondNFT.mint(1);

        uint256 tokenId = 1;
        string memory initialRarity = bondNFT.getRarityTier(tokenId);
        assertEq(initialRarity, "Bronze", "Initial rarity should be Bronze");

        // Step 2: Roll dice multiple times to accumulate Remint and cross Silver threshold (2 USDC)
        for (uint256 i = 0; i < 10; i++) {
            // Wait 1 week between rolls
            vm.warp(block.timestamp + 7 days);

            vm.prank(user1);
            remintController.rollDice(tokenId);

            uint256 requestId = vrfCoordinator.getRequestIdCounter();

            // Fulfill with high random number to get max reward
            uint256[] memory randomWords = new uint256[](1);
            randomWords[0] = type(uint256).max - i; // Different random for each roll

            vrfCoordinator.fulfillRandomWords(requestId, randomWords);

            // Check if we've crossed Silver threshold (read from bondNFT)
            (,,, uint128 accumulatedRemint,,) = bondNFT.getBondInfo(tokenId);
            if (accumulatedRemint >= 2 * 1e6) {
                string memory currentRarity = bondNFT.getRarityTier(tokenId);
                assertTrue(
                    keccak256(bytes(currentRarity)) != keccak256(bytes("Bronze")),
                    "Rarity should have upgraded from Bronze"
                );
                break;
            }
        }
    }

    /**
     * @notice Test multiple users rolling dice concurrently
     */
    function test_Integration_VRF_MultipleUsersConcurrent() public {
        // Mint NFTs for both users
        vm.prank(user1);
        bondNFT.mint(1);

        vm.prank(user2);
        bondNFT.mint(1);

        // Both users request dice rolls
        vm.prank(user1);
        remintController.rollDice(1);

        vm.prank(user2);
        remintController.rollDice(2);

        // Fulfill both VRF requests
        uint256[] memory randomWords1 = new uint256[](1);
        randomWords1[0] = 111111;

        uint256[] memory randomWords2 = new uint256[](1);
        randomWords2[0] = 222222;

        vrfCoordinator.fulfillRandomWords(1, randomWords1);
        vrfCoordinator.fulfillRandomWords(2, randomWords2);

        // Verify both users received Remint (read from bondNFT)
        (,,, uint128 remint1,,) = bondNFT.getBondInfo(1);
        (,,, uint128 remint2,,) = bondNFT.getBondInfo(2);

        assertTrue(remint1 > 0, "User 1 should have earned Remint");
        assertTrue(remint2 > 0, "User 2 should have earned Remint");

        // Results might differ due to different random values
        // (dice result determines APY which determines Remint)
    }

    /**
     * @notice Test VRF callback with upgraded dice (Gold dice: 1-12)
     */
    function test_Integration_VRF_GoldDiceCallback() public {
        // Mint NFT
        vm.prank(user1);
        bondNFT.mint(1);

        uint256 tokenId = 1;

        // Complete 5 social tasks to unlock Gold dice
        bytes32[] memory tasks = new bytes32[](5);
        tasks[0] = keccak256("TWITTER_FOLLOW");
        tasks[1] = keccak256("TWITTER_RETWEET");
        tasks[2] = keccak256("DISCORD_JOIN");
        tasks[3] = keccak256("DISCORD_SHARE");
        tasks[4] = keccak256("TWITTER_MEME");

        for (uint256 i = 0; i < 5; i++) {
            bytes memory signature = _createOracleSignature(tokenId, tasks[i]);
            vm.prank(user1);
            remintController.completeSocialTask(tokenId, tasks[i], signature);
        }

        // Verify dice upgraded to Gold
        (uint8 diceType,,,,) = remintController.getDiceData(tokenId);
        assertEq(diceType, 1, "Dice should be upgraded to Gold");

        // Roll Gold dice
        vm.warp(block.timestamp + 7 days); // Wait for new week
        vm.prank(user1);
        remintController.rollDice(tokenId);

        uint256 requestId = vrfCoordinator.getRequestIdCounter();

        // Fulfill VRF with max random
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = type(uint256).max;

        vrfCoordinator.fulfillRandomWords(requestId, randomWords);

        // Verify higher Remint earned (Gold dice has 0-6% APY vs Normal 0-3%)
        (,,, uint128 accumulatedRemint,,) = bondNFT.getBondInfo(tokenId);
        assertTrue(accumulatedRemint > 0, "Gold dice should earn Remint");
    }

    /**
     * @notice Test VRF callback accumulates Remint across multiple weeks (before maturity)
     */
    function test_Integration_VRF_HybridMechanismCaps() public {
        // Mint NFT
        vm.prank(user1);
        bondNFT.mint(1);

        uint256 tokenId = 1;
        uint128 previousRemint = 0;

        // Roll dice for 12 weeks (within 90-day maturity period)
        // Each week should accumulate more Remint
        for (uint256 i = 0; i < 12; i++) {
            // Wait 1 week
            vm.warp(block.timestamp + 7 days);

            vm.prank(user1);
            remintController.rollDice(tokenId);

            uint256 requestId = vrfCoordinator.getRequestIdCounter();

            // Fulfill with max random to maximize Remint
            uint256[] memory randomWords = new uint256[](1);
            randomWords[0] = type(uint256).max - i;

            vrfCoordinator.fulfillRandomWords(requestId, randomWords);

            (,,, uint128 currentRemint,,) = bondNFT.getBondInfo(tokenId);

            // Remint should increase each week
            if (i > 0) {
                assertTrue(currentRemint > previousRemint, "Remint should accumulate");
            }

            previousRemint = currentRemint;
        }

        // Verify final accumulated Remint is reasonable (max ~6 USDC for 12 weeks with Normal dice)
        (,,, uint128 finalRemint,,) = bondNFT.getBondInfo(tokenId);
        assertTrue(finalRemint > 0, "Should have accumulated some Remint");
        assertTrue(finalRemint <= 6 * 1e6, "Remint should be reasonable for 12 weeks");

        // Verify bond has not matured yet
        assertFalse(bondNFT.isMatured(tokenId), "Bond should not be matured yet");
    }

    // ==================== Helper Functions ====================

    /**
     * @notice Create oracle signature for social task completion
     * @dev Matches RemintController's verification logic (Eth signed message hash)
     */
    function _createOracleSignature(uint256 tokenId, bytes32 taskId) internal view returns (bytes memory) {
        // Create message hash (same as RemintController line 321)
        bytes32 messageHash = keccak256(abi.encodePacked(tokenId, taskId));

        // Create Ethereum signed message hash (same as RemintController line 322)
        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        // Sign with oracle's private key
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(oraclePrivateKey, ethSignedHash);

        return abi.encodePacked(r, s, v);
    }
}
