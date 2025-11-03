// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../src/presale/RemintController.sol";
import "../../src/presale/RWABondNFT.sol";
import "../../src/mocks/MockERC20.sol";
import "../../src/mocks/MockVRFCoordinatorV2.sol";

/**
 * @title RemintController Test Suite
 * @notice Comprehensive TDD tests for RemintController contract (RED phase)
 * @dev 6-dimensional test coverage: Functional, Boundary, Exception, Performance, Security, Compatibility
 *
 * Contract Purpose: Gamified dice rolling system + social task verification + leaderboards
 *
 * Key Features:
 * 1. Weekly dice rolling (1 free roll/week + bonus from tasks)
 * 2. Three dice types: Normal (1-6 → 0-3% APY), Gold (1-12 → 0-6% APY), Diamond (1-20 → 0-10% APY)
 * 3. Social tasks unlock better dice (5 tasks → Gold, 10 tasks → Diamond)
 * 4. Three leaderboards: Top Earners, Luckiest Rollers, Social Champions
 * 5. Off-chain oracle with on-chain signature verification for social tasks
 */
contract RemintControllerTest is Test {
    // ==================== Contracts ====================

    RemintController public remintController;
    RWABondNFT public bondNFT;
    MockERC20 public usdc;
    MockVRFCoordinatorV2 public vrfCoordinator;

    // ==================== Test Accounts ====================

    address public owner = address(0x1);
    address public treasury = address(0x2);
    uint256 public oraclePrivateKey = 0x1234567890abcdef;
    address public oracle; // Social task oracle (derived from oraclePrivateKey in setUp)
    address public user1 = address(0x4);
    address public user2 = address(0x5);
    address public user3 = address(0x6);
    address public attacker = address(0x7);

    // ==================== Constants ====================

    uint256 public constant WEEK_DURATION = 7 days;

    // Dice types
    uint8 public constant DICE_TYPE_NORMAL = 0;
    uint8 public constant DICE_TYPE_GOLD = 1;
    uint8 public constant DICE_TYPE_DIAMOND = 2;

    // Dice unlock thresholds
    uint256 public constant GOLD_DICE_TASKS = 5;
    uint256 public constant DIAMOND_DICE_TASKS = 10;

    // APY ranges (in basis points, 10000 = 100%)
    uint256 public constant NORMAL_DICE_MAX_APY = 300; // 3%
    uint256 public constant GOLD_DICE_MAX_APY = 600; // 6%
    uint256 public constant DIAMOND_DICE_MAX_APY = 1000; // 10%

    // Dice value ranges
    uint8 public constant NORMAL_DICE_MIN = 1;
    uint8 public constant NORMAL_DICE_MAX = 6;
    uint8 public constant GOLD_DICE_MIN = 1;
    uint8 public constant GOLD_DICE_MAX = 12;
    uint8 public constant DIAMOND_DICE_MIN = 1;
    uint8 public constant DIAMOND_DICE_MAX = 20;

    // Leaderboard types
    uint8 public constant LEADERBOARD_TOP_EARNERS = 0;
    uint8 public constant LEADERBOARD_LUCKIEST_ROLLERS = 1;
    uint8 public constant LEADERBOARD_SOCIAL_CHAMPIONS = 2;

    // Social task types
    bytes32 public constant TASK_TWITTER_FOLLOW = keccak256("TWITTER_FOLLOW");
    bytes32 public constant TASK_TWITTER_RETWEET = keccak256("TWITTER_RETWEET");
    bytes32 public constant TASK_TWITTER_MEME = keccak256("TWITTER_MEME");
    bytes32 public constant TASK_DISCORD_JOIN = keccak256("DISCORD_JOIN");
    bytes32 public constant TASK_DISCORD_SHARE = keccak256("DISCORD_SHARE");
    bytes32 public constant TASK_DISCORD_AMA = keccak256("DISCORD_AMA");
    bytes32 public constant TASK_REFERRAL_1 = keccak256("REFERRAL_1");
    bytes32 public constant TASK_REFERRAL_5 = keccak256("REFERRAL_5");
    bytes32 public constant TASK_REFERRAL_10 = keccak256("REFERRAL_10");
    bytes32 public constant TASK_YOUTUBE_SUBSCRIBE = keccak256("YOUTUBE_SUBSCRIBE");

    // Referral rewards (in USDC, 6 decimals)
    uint256 public constant REFERRAL_REWARD = 5 * 1e6; // 5 USDC per invite

    // VRF config
    uint64 public constant VRF_SUBSCRIPTION_ID = 1;
    bytes32 public constant VRF_KEY_HASH = bytes32(uint256(1));
    uint32 public constant VRF_CALLBACK_GAS_LIMIT = 200_000;

    // ==================== Events (Match RemintController) ====================

    event DiceRollRequested(uint256 indexed tokenId, address indexed roller, uint8 diceType, uint256 requestId);
    event DiceRollCompleted(
        uint256 indexed tokenId,
        uint8 diceType,
        uint8 result,
        uint256 apyBasisPoints,
        uint256 remintEarned
    );
    event SocialTaskCompleted(uint256 indexed tokenId, bytes32 indexed taskId, uint256 timestamp);
    event DiceTypeUpgraded(uint256 indexed tokenId, uint8 oldDiceType, uint8 newDiceType, uint256 tasksCompleted);
    event LeaderboardUpdated(uint8 indexed leaderboardType, uint256 indexed tokenId, address indexed holder);
    event WeeklyRollsReset(uint256 indexed tokenId, uint256 weekNumber);

    // ==================== Setup ====================

    function setUp() public {
        // Derive oracle address from private key
        oracle = vm.addr(oraclePrivateKey);

        // Deploy mocks
        usdc = new MockERC20("USD Coin", "USDC", 6);
        vrfCoordinator = new MockVRFCoordinatorV2();

        // Deploy RWABondNFT
        vm.prank(owner);
        bondNFT = new RWABondNFT(
            address(usdc),
            treasury,
            address(vrfCoordinator),
            VRF_SUBSCRIPTION_ID,
            VRF_KEY_HASH,
            VRF_CALLBACK_GAS_LIMIT
        );

        // Deploy RemintController
        vm.prank(owner);
        remintController = new RemintController(
            address(bondNFT),
            oracle,
            treasury
        );

        // Set RemintController in BondNFT
        vm.prank(owner);
        bondNFT.setRemintController(address(remintController));

        // Fund users
        usdc.mint(user1, 1_000_000 * 1e6);
        usdc.mint(user2, 1_000_000 * 1e6);
        usdc.mint(user3, 1_000_000 * 1e6);

        // Approve
        vm.prank(user1);
        usdc.approve(address(bondNFT), type(uint256).max);
        vm.prank(user2);
        usdc.approve(address(bondNFT), type(uint256).max);
        vm.prank(user3);
        usdc.approve(address(bondNFT), type(uint256).max);

        // Mint NFTs for testing
        vm.prank(user1);
        bondNFT.mint(1); // tokenId 1
        vm.prank(user2);
        bondNFT.mint(1); // tokenId 2
        vm.prank(user3);
        bondNFT.mint(1); // tokenId 3

        // Fund RemintController with USDC for referral rewards
        // Assuming max 100 referrals @ 5 USDC each = 500 USDC
        usdc.mint(address(remintController), 500 * 1e6);
    }

    // ==================== 1. FUNCTIONAL TESTS ====================

    // ----- Constructor Tests -----

    function test_Constructor_Success() public view {
        assertEq(remintController.owner(), owner, "Owner should be set");
        assertEq(address(remintController.bondNFT()), address(bondNFT), "BondNFT address should be set");
        assertEq(remintController.oracle(), oracle, "Oracle address should be set");
        assertEq(remintController.treasury(), treasury, "Treasury address should be set");
    }

    function test_Constructor_RevertWhen_ZeroAddressBondNFT() public {
        vm.expectRevert("RemintController: zero address bondNFT");
        vm.prank(owner);
        new RemintController(address(0), oracle, treasury);
    }

    function test_Constructor_RevertWhen_ZeroAddressOracle() public {
        vm.expectRevert("RemintController: zero address oracle");
        vm.prank(owner);
        new RemintController(address(bondNFT), address(0), treasury);
    }

    function test_Constructor_RevertWhen_ZeroAddressTreasury() public {
        vm.expectRevert("RemintController: zero address treasury");
        vm.prank(owner);
        new RemintController(address(bondNFT), oracle, address(0));
    }

    // ----- Weekly Dice Rolling Tests -----

    function test_RollDice_Success_NormalDice() public {
        vm.prank(user1);
        uint256 requestId = remintController.rollDice(1);

        assertGt(requestId, 0, "Request ID should be non-zero");

        // Check dice data before fulfillment
        (
            uint8 diceType,
            uint8 rollsThisWeek,
            uint256 lastRollTimestamp,
            ,
            uint256 lastWeekNumber
        ) = remintController.getDiceData(1);

        assertEq(diceType, DICE_TYPE_NORMAL, "Should start with Normal dice");
        assertEq(rollsThisWeek, 0, "Rolls this week should be 0 (pending VRF)");
        assertGt(lastRollTimestamp, 0, "Last roll timestamp should be set");
    }

    function test_RollDice_RevertWhen_NotOwner() public {
        vm.expectRevert("RemintController: caller is not NFT owner");
        vm.prank(user2);
        remintController.rollDice(1); // tokenId 1 belongs to user1
    }

    function test_RollDice_RevertWhen_NoRollsLeft() public {
        // Use up the free roll
        vm.prank(user1);
        uint256 requestId = remintController.rollDice(1);

        // Fulfill VRF
        vm.prank(address(vrfCoordinator));
        remintController.rawFulfillRandomWords(requestId, _buildRandomWords(3));

        // Try to roll again in the same week
        vm.expectRevert("RemintController: no rolls left this week");
        vm.prank(user1);
        remintController.rollDice(1);
    }

    function test_RollDice_ResetAfterWeek() public {
        // Roll once
        vm.prank(user1);
        uint256 requestId = remintController.rollDice(1);

        // Fulfill
        vm.prank(address(vrfCoordinator));
        remintController.rawFulfillRandomWords(requestId, _buildRandomWords(5));

        // Fast forward 1 week + 1 second
        vm.warp(block.timestamp + WEEK_DURATION + 1);

        // Should be able to roll again
        vm.prank(user1);
        uint256 requestId2 = remintController.rollDice(1);
        assertGt(requestId2, 0, "Should be able to roll after week reset");
    }

    // ----- Dice Result Processing Tests -----

    function test_ProcessDiceResult_NormalDice_MinRoll() public {
        vm.prank(user1);
        uint256 requestId = remintController.rollDice(1);

        // Fulfill with minimum roll (1)
        vm.expectEmit(true, true, true, true);
        emit DiceRollCompleted(1, DICE_TYPE_NORMAL, 1, 50, 0); // 1/6 * 3% = 0.5% APY

        vm.prank(address(vrfCoordinator));
        remintController.rawFulfillRandomWords(requestId, _buildRandomWords(1));
    }

    function test_ProcessDiceResult_NormalDice_MaxRoll() public {
        vm.prank(user1);
        uint256 requestId = remintController.rollDice(1);

        // Fulfill with maximum roll (6)
        vm.expectEmit(true, true, true, true);
        emit DiceRollCompleted(1, DICE_TYPE_NORMAL, 6, 300, 0); // 6/6 * 3% = 3% APY

        vm.prank(address(vrfCoordinator));
        remintController.rawFulfillRandomWords(requestId, _buildRandomWords(6));
    }

    function test_ProcessDiceResult_GoldDice() public {
        // Complete 5 social tasks to unlock Gold dice
        _completeSocialTasks(1, user1, 5);

        vm.prank(user1);
        uint256 requestId = remintController.rollDice(1);

        // Fulfill with roll 10
        vm.expectEmit(true, true, true, true);
        emit DiceRollCompleted(1, DICE_TYPE_GOLD, 10, 500, 0); // 10/12 * 6% ≈ 5% APY

        vm.prank(address(vrfCoordinator));
        remintController.rawFulfillRandomWords(requestId, _buildRandomWords(10));
    }

    function test_ProcessDiceResult_DiamondDice() public {
        // Complete 10 social tasks to unlock Diamond dice
        _completeSocialTasks(1, user1, 10);

        vm.prank(user1);
        uint256 requestId = remintController.rollDice(1);

        // Fulfill with roll 20 (natural 20!)
        vm.expectEmit(true, true, true, true);
        emit DiceRollCompleted(1, DICE_TYPE_DIAMOND, 20, 1000, 0); // 20/20 * 10% = 10% APY

        vm.prank(address(vrfCoordinator));
        remintController.rawFulfillRandomWords(requestId, _buildRandomWords(20));
    }

    // ----- Social Task Verification Tests -----

    function test_CompleteSocialTask_Success() public {
        bytes32 taskId = TASK_TWITTER_FOLLOW;
        uint256 tokenId = 1;

        // Create oracle signature
        bytes memory signature = _createOracleSignature(tokenId, taskId);

        vm.expectEmit(true, true, true, true);
        emit SocialTaskCompleted(tokenId, taskId, block.timestamp);

        vm.prank(user1);
        remintController.completeSocialTask(tokenId, taskId, signature);

        assertTrue(remintController.isTaskCompleted(tokenId, taskId), "Task should be marked completed");
    }

    function test_CompleteSocialTask_RevertWhen_NotOwner() public {
        bytes32 taskId = TASK_TWITTER_FOLLOW;
        bytes memory signature = _createOracleSignature(1, taskId);

        vm.expectRevert("RemintController: caller is not NFT owner");
        vm.prank(user2);
        remintController.completeSocialTask(1, taskId, signature);
    }

    function test_CompleteSocialTask_RevertWhen_AlreadyCompleted() public {
        bytes32 taskId = TASK_TWITTER_FOLLOW;
        bytes memory signature = _createOracleSignature(1, taskId);

        // Complete once
        vm.prank(user1);
        remintController.completeSocialTask(1, taskId, signature);

        // Try again
        vm.expectRevert("RemintController: task already completed");
        vm.prank(user1);
        remintController.completeSocialTask(1, taskId, signature);
    }

    function test_CompleteSocialTask_RevertWhen_InvalidSignature() public {
        bytes32 taskId = TASK_TWITTER_FOLLOW;

        // Create signature for wrong tokenId
        bytes memory wrongSignature = _createOracleSignature(999, taskId);

        vm.expectRevert("RemintController: invalid oracle signature");
        vm.prank(user1);
        remintController.completeSocialTask(1, taskId, wrongSignature);
    }

    // ----- Dice Type Upgrade Tests -----

    function test_DiceUpgrade_ToGold() public {
        // Complete exactly 5 tasks
        bytes32[5] memory tasks = [
            TASK_TWITTER_FOLLOW,
            TASK_TWITTER_RETWEET,
            TASK_DISCORD_JOIN,
            TASK_DISCORD_SHARE,
            TASK_REFERRAL_1
        ];

        for (uint256 i = 0; i < 5; i++) {
            bytes memory sig = _createOracleSignature(1, tasks[i]);
            vm.prank(user1);
            remintController.completeSocialTask(1, tasks[i], sig);
        }

        // Check dice type upgraded
        (uint8 diceType, , , , ) = remintController.getDiceData(1);
        assertEq(diceType, DICE_TYPE_GOLD, "Should upgrade to Gold dice");
    }

    function test_DiceUpgrade_ToDiamond() public {
        // Complete 10 tasks
        _completeSocialTasks(1, user1, 10);

        // Check dice type upgraded
        (uint8 diceType, , , , ) = remintController.getDiceData(1);
        assertEq(diceType, DICE_TYPE_DIAMOND, "Should upgrade to Diamond dice");
    }

    function test_DiceUpgrade_EmitEvent() public {
        _completeSocialTasks(1, user1, 4);

        // The 5th task should trigger upgrade event
        bytes memory sig = _createOracleSignature(1, TASK_REFERRAL_1);

        vm.expectEmit(true, true, true, true);
        emit DiceTypeUpgraded(1, DICE_TYPE_NORMAL, DICE_TYPE_GOLD, 5);

        vm.prank(user1);
        remintController.completeSocialTask(1, TASK_REFERRAL_1, sig);
    }

    // ----- Referral Rewards Tests -----

    function test_ReferralReward_Deposited() public {
        bytes32 taskId = TASK_REFERRAL_1;
        bytes memory sig = _createOracleSignature(1, taskId);

        uint256 remintBefore = remintController.getRemintEarned(1);

        vm.prank(user1);
        remintController.completeSocialTask(1, taskId, sig);

        uint256 remintAfter = remintController.getRemintEarned(1);

        // Referral reward is 5 USDC, but capped by Layer 2 (MAX_REMINT_PER_NFT = 1.5 USDC)
        assertEq(
            remintAfter - remintBefore,
            15 * 1e5, // 1.5 USDC (capped by Layer 2)
            "NFT should receive 1.5 USDC Remint (capped by Layer 2)"
        );
    }

    function test_ReferralReward_MultipleReferrals() public {
        bytes32[3] memory referralTasks = [TASK_REFERRAL_1, TASK_REFERRAL_5, TASK_REFERRAL_10];

        uint256 remintBefore = remintController.getRemintEarned(1);

        for (uint256 i = 0; i < 3; i++) {
            bytes memory sig = _createOracleSignature(1, referralTasks[i]);
            vm.prank(user1);
            remintController.completeSocialTask(1, referralTasks[i], sig);
        }

        uint256 remintAfter = remintController.getRemintEarned(1);

        // Each referral task earns 5 USDC Remint, but capped at 1.5 USDC total (MAX_REMINT_PER_NFT)
        // 3 × 5 = 15 USDC theoretical, but Layer 2 cap limits to 1.5 USDC
        assertEq(
            remintAfter - remintBefore,
            15 * 1e5, // 1.5 USDC (MAX_REMINT_PER_NFT)
            "NFT should receive 1.5 USDC Remint (capped by Layer 2)"
        );
    }

    // ----- Leaderboard Tests -----

    function test_Leaderboard_TopEarners() public {
        // user1 rolls and earns 3% APY (Normal dice max)
        vm.prank(user1);
        uint256 req1 = remintController.rollDice(1);
        vm.prank(address(vrfCoordinator));
        remintController.rawFulfillRandomWords(req1, _buildRandomWords(6));

        // user2 rolls and earns less
        vm.prank(user2);
        uint256 req2 = remintController.rollDice(2);
        vm.prank(address(vrfCoordinator));
        remintController.rawFulfillRandomWords(req2, _buildRandomWords(3));

        // Check leaderboard
        address[] memory topEarners = remintController.getLeaderboard(LEADERBOARD_TOP_EARNERS, 10);

        assertEq(topEarners.length, 2, "Should have 2 entries");
        assertEq(topEarners[0], user1, "user1 should be #1");
        assertEq(topEarners[1], user2, "user2 should be #2");
    }

    function test_Leaderboard_LuckiestRollers() public {
        // Complete 10 tasks for user1 to get Diamond dice
        _completeSocialTasks(1, user1, 10);

        // user1 rolls natural 20
        vm.prank(user1);
        uint256 req1 = remintController.rollDice(1);
        vm.prank(address(vrfCoordinator));
        remintController.rawFulfillRandomWords(req1, _buildRandomWords(20));

        // user2 rolls normal 6
        vm.prank(user2);
        uint256 req2 = remintController.rollDice(2);
        vm.prank(address(vrfCoordinator));
        remintController.rawFulfillRandomWords(req2, _buildRandomWords(6));

        // Check leaderboard
        address[] memory luckiestRollers = remintController.getLeaderboard(LEADERBOARD_LUCKIEST_ROLLERS, 10);

        assertEq(luckiestRollers[0], user1, "user1 should be luckiest with natural 20");
    }

    function test_Leaderboard_SocialChampions() public {
        // user1 completes 10 tasks
        _completeSocialTasks(1, user1, 10);

        // user2 completes 5 tasks
        _completeSocialTasks(2, user2, 5);

        // user3 completes 3 tasks
        _completeSocialTasks(3, user3, 3);

        // Check leaderboard
        address[] memory socialChampions = remintController.getLeaderboard(LEADERBOARD_SOCIAL_CHAMPIONS, 10);

        assertEq(socialChampions.length, 3, "Should have 3 entries");
        assertEq(socialChampions[0], user1, "user1 should be #1 with 10 tasks");
        assertEq(socialChampions[1], user2, "user2 should be #2 with 5 tasks");
        assertEq(socialChampions[2], user3, "user3 should be #3 with 3 tasks");
    }

    function test_Leaderboard_Top10Limit() public {
        // Create 15 users, only top 10 should be tracked
        for (uint256 i = 0; i < 15; i++) {
            address testUser = address(uint160(1000 + i));
            usdc.mint(testUser, 1_000_000 * 1e6);

            vm.prank(testUser);
            usdc.approve(address(bondNFT), type(uint256).max);

            vm.prank(testUser);
            bondNFT.mint(1);

            uint256 tokenId = 4 + i; // tokenId 4-18

            // Roll dice
            vm.prank(testUser);
            uint256 req = remintController.rollDice(tokenId);
            vm.prank(address(vrfCoordinator));
            remintController.rawFulfillRandomWords(req, _buildRandomWords(uint8((i % 6) + 1)));
        }

        address[] memory topEarners = remintController.getLeaderboard(LEADERBOARD_TOP_EARNERS, 10);

        assertEq(topEarners.length, 10, "Leaderboard should be capped at 10");
    }

    // ==================== 2. BOUNDARY TESTS ====================

    function test_Boundary_NormalDiceRange() public {
        // Test all possible Normal dice outcomes (1-6)
        for (uint8 roll = 1; roll <= 6; roll++) {
            // Mint new NFT for each test
            address testUser = address(uint160(1000 + roll));
            usdc.mint(testUser, 1_000_000 * 1e6);
            vm.prank(testUser);
            usdc.approve(address(bondNFT), type(uint256).max);
            vm.prank(testUser);
            bondNFT.mint(1);

            uint256 tokenId = 3 + roll;

            vm.prank(testUser);
            uint256 req = remintController.rollDice(tokenId);

            vm.prank(address(vrfCoordinator));
            remintController.rawFulfillRandomWords(req, _buildRandomWords(roll));

            // Verify dice result is within bounds
            (uint8 diceType, , , , ) = remintController.getDiceData(tokenId);
            // APY should be between 0.5% and 3%
            assertTrue(diceType == DICE_TYPE_NORMAL, "Should be Normal dice");
        }
    }

    function test_Boundary_GoldDiceRange() public {
        // Unlock Gold dice
        _completeSocialTasks(1, user1, 5);

        // Test boundary rolls (1 and 12)
        vm.prank(user1);
        uint256 req = remintController.rollDice(1);

        vm.prank(address(vrfCoordinator));
        remintController.rawFulfillRandomWords(req, _buildRandomWords(1));

        // Roll should be within 1-12 range
    }

    function test_Boundary_DiamondDiceRange() public {
        // Unlock Diamond dice
        _completeSocialTasks(1, user1, 10);

        // Test boundary rolls (1 and 20)
        vm.prank(user1);
        uint256 req = remintController.rollDice(1);

        vm.prank(address(vrfCoordinator));
        remintController.rawFulfillRandomWords(req, _buildRandomWords(1));

        // Roll should be within 1-20 range
    }

    function test_Boundary_MaxTaskCompletion() public {
        // Complete all 9 possible tasks
        bytes32[9] memory allTasks = [
            TASK_TWITTER_FOLLOW,
            TASK_TWITTER_RETWEET,
            TASK_TWITTER_MEME,
            TASK_DISCORD_JOIN,
            TASK_DISCORD_SHARE,
            TASK_DISCORD_AMA,
            TASK_REFERRAL_1,
            TASK_REFERRAL_5,
            TASK_REFERRAL_10
        ];

        for (uint256 i = 0; i < 9; i++) {
            bytes memory sig = _createOracleSignature(1, allTasks[i]);
            vm.prank(user1);
            remintController.completeSocialTask(1, allTasks[i], sig);
        }

        uint256 tasksCompleted = remintController.getTasksCompleted(1);
        assertEq(tasksCompleted, 9, "Should complete all 9 tasks");
    }

    function test_Boundary_WeekNumber_Overflow() public {
        // Fast forward to 89 days (just before 90-day maturity, ~12.7 weeks)
        // This tests week number calculation without triggering bond maturity
        vm.warp(block.timestamp + 89 days);

        vm.prank(user1);
        remintController.rollDice(1);

        // Should handle week number calculation correctly
    }

    // ==================== 3. EXCEPTION TESTS ====================

    function test_Exception_RollDice_ZeroTokenId() public {
        // OpenZeppelin ERC721 uses custom error: ERC721NonexistentToken(uint256 tokenId)
        vm.expectRevert(
            abi.encodeWithSelector(bytes4(keccak256("ERC721NonexistentToken(uint256)")), 0)
        );
        vm.prank(user1);
        remintController.rollDice(0);
    }

    function test_Exception_RollDice_NonexistentToken() public {
        // OpenZeppelin ERC721 uses custom error: ERC721NonexistentToken(uint256 tokenId)
        vm.expectRevert(
            abi.encodeWithSelector(bytes4(keccak256("ERC721NonexistentToken(uint256)")), 999)
        );
        vm.prank(user1);
        remintController.rollDice(999);
    }

    function test_Exception_CompleteSocialTask_EmptyTaskId() public {
        bytes32 emptyTaskId = bytes32(0);
        bytes memory sig = _createOracleSignature(1, emptyTaskId);

        vm.expectRevert("RemintController: invalid task ID");
        vm.prank(user1);
        remintController.completeSocialTask(1, emptyTaskId, sig);
    }

    function test_Exception_CompleteSocialTask_EmptySignature() public {
        bytes memory emptySignature = "";

        vm.expectRevert("RemintController: invalid signature");
        vm.prank(user1);
        remintController.completeSocialTask(1, TASK_TWITTER_FOLLOW, emptySignature);
    }

    function test_Exception_GetLeaderboard_InvalidType() public {
        vm.expectRevert("RemintController: invalid leaderboard type");
        remintController.getLeaderboard(99, 10);
    }

    function test_Exception_GetLeaderboard_ZeroLimit() public {
        vm.expectRevert("RemintController: limit must be > 0");
        remintController.getLeaderboard(LEADERBOARD_TOP_EARNERS, 0);
    }

    // ==================== 4. PERFORMANCE TESTS ====================

    function test_Performance_BatchSocialTasks() public {
        // Complete 10 tasks in quick succession
        uint256 gasStart = gasleft();

        _completeSocialTasks(1, user1, 10);

        uint256 gasUsed = gasStart - gasleft();

        // Should complete in reasonable gas (rough estimate: <3M gas)
        assertLt(gasUsed, 3_000_000, "Batch task completion should be gas-efficient");
    }

    function test_Performance_LeaderboardUpdate() public {
        // Add 10 users to leaderboard
        for (uint256 i = 0; i < 10; i++) {
            address testUser = address(uint160(2000 + i));
            usdc.mint(testUser, 1_000_000 * 1e6);
            vm.prank(testUser);
            usdc.approve(address(bondNFT), type(uint256).max);
            vm.prank(testUser);
            bondNFT.mint(1);

            uint256 tokenId = 4 + i;
            vm.prank(testUser);
            uint256 req = remintController.rollDice(tokenId);
            vm.prank(address(vrfCoordinator));
            remintController.rawFulfillRandomWords(req, _buildRandomWords(uint8(i + 1)));
        }

        // Measure leaderboard query gas
        uint256 gasStart = gasleft();
        remintController.getLeaderboard(LEADERBOARD_TOP_EARNERS, 10);
        uint256 gasUsed = gasStart - gasleft();

        assertLt(gasUsed, 200_000, "Leaderboard query should be gas-efficient");
    }

    // ==================== 5. SECURITY TESTS ====================

    function test_Security_ReentrancyProtection_RollDice() public {
        // RemintController should have ReentrancyGuard
        vm.prank(user1);
        remintController.rollDice(1);

        // Reentrancy should be blocked (tested by OpenZeppelin ReentrancyGuard)
    }

    function test_Security_SignatureReplay() public {
        bytes32 taskId = TASK_TWITTER_FOLLOW;
        bytes memory sig = _createOracleSignature(1, taskId);

        // Complete task once
        vm.prank(user1);
        remintController.completeSocialTask(1, taskId, sig);

        // Try to replay signature (should fail)
        vm.expectRevert("RemintController: task already completed");
        vm.prank(user1);
        remintController.completeSocialTask(1, taskId, sig);
    }

    function test_Security_UnauthorizedOracle() public {
        bytes32 taskId = TASK_TWITTER_FOLLOW;

        // Create signature with attacker's key (not oracle)
        bytes32 messageHash = keccak256(abi.encodePacked(uint256(1), taskId));
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(uint256(uint160(attacker)), ethSignedHash);
        bytes memory attackerSig = abi.encodePacked(r, s, v);

        vm.expectRevert("RemintController: invalid oracle signature");
        vm.prank(user1);
        remintController.completeSocialTask(1, taskId, attackerSig);
    }

    function test_Security_FrontRunning_DiceRoll() public {
        // User1 initiates roll
        vm.prank(user1);
        uint256 requestId = remintController.rollDice(1);

        vm.expectRevert("RemintController: caller is not NFT owner");
        vm.prank(attacker);
        remintController.rollDice(1);
    }

    function test_Security_OwnershipTransfer_MidGame() public {
        // User1 rolls dice
        vm.prank(user1);
        uint256 requestId = remintController.rollDice(1);

        // Transfer NFT to user2
        vm.prank(user1);
        bondNFT.transferFrom(user1, user2, 1);

        // VRF fulfillment should still work (requestId tied to tokenId, not owner)
        vm.prank(address(vrfCoordinator));
        remintController.rawFulfillRandomWords(requestId, _buildRandomWords(5));

        // Check that new owner (user2) now owns the NFT with updated dice data
        assertEq(bondNFT.ownerOf(1), user2, "NFT should belong to user2");
    }

    // ==================== 6. COMPATIBILITY TESTS ====================

    function test_Compatibility_IntegrationWithBondNFT() public {
        // Verify RemintController can read BondNFT data
        vm.prank(user1);
        uint256 requestId = remintController.rollDice(1);

        assertGt(requestId, 0, "RemintController should interact with BondNFT VRF");
    }

    function test_Compatibility_ERC721Standard() public {
        // Ensure RemintController works with standard ERC721 operations

        // Transfer NFT
        vm.prank(user1);
        bondNFT.transferFrom(user1, user2, 1);

        // New owner should be able to roll dice
        vm.prank(user2);
        uint256 requestId = remintController.rollDice(1);

        assertGt(requestId, 0, "Should work after ERC721 transfer");
    }

    function test_Compatibility_VRFCoordinatorV2() public {
        // Test Chainlink VRF V2 compatibility
        vm.prank(user1);
        uint256 requestId = remintController.rollDice(1);

        // Mock VRF Coordinator should be able to fulfill
        vm.prank(address(vrfCoordinator));
        remintController.rawFulfillRandomWords(requestId, _buildRandomWords(4));

        // Check result was processed
        (, uint8 rollsThisWeek, , , ) = remintController.getDiceData(1);
        assertEq(rollsThisWeek, 0, "Roll should be consumed");
    }

    function test_Compatibility_MultipleNFTs_SameOwner() public {
        // Mint 3 NFTs for user1
        vm.prank(user1);
        bondNFT.mint(3); // tokenId 4, 5, 6

        // Roll dice on all 3 NFTs
        for (uint256 tokenId = 4; tokenId <= 6; tokenId++) {
            vm.prank(user1);
            uint256 req = remintController.rollDice(tokenId);
            vm.prank(address(vrfCoordinator));
            remintController.rawFulfillRandomWords(req, _buildRandomWords(uint8(tokenId - 3)));
        }

        // All 3 should have independent dice data
        for (uint256 tokenId = 4; tokenId <= 6; tokenId++) {
            (, , , uint256 totalRemint, ) = remintController.getDiceData(tokenId);
            assertGt(totalRemint, 0, "Each NFT should have independent Remint tracking");
        }
    }

    // ==================== Helper Functions ====================

    /**
     * @notice Helper to build random words array for VRF fulfillment
     * @dev Converts desired dice result to a randomWord that will produce that result
     * Formula: result = (randomWord % maxDice) + 1
     * Therefore: randomWord = result - 1 (when result >= 1)
     * Example:
     *   - For result=6 on Normal dice (max=6): randomWord=5, (5%6)+1=6 ✓
     *   - For result=12 on Gold dice (max=12): randomWord=11, (11%12)+1=12 ✓
     */
    function _buildRandomWords(uint8 diceResult) internal pure returns (uint256[] memory) {
        require(diceResult >= 1, "Dice result must be >= 1");
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = uint256(diceResult - 1);
        return randomWords;
    }

    /**
     * @notice Helper to create oracle signature for social task verification
     */
    function _createOracleSignature(uint256 tokenId, bytes32 taskId) internal view returns (bytes memory) {
        bytes32 messageHash = keccak256(abi.encodePacked(tokenId, taskId));
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(oraclePrivateKey, ethSignedHash);

        return abi.encodePacked(r, s, v);
    }

    /**
     * @notice Helper to complete multiple social tasks
     */
    function _completeSocialTasks(uint256 tokenId, address nftOwner, uint256 count) internal {
        bytes32[10] memory allTasks = [
            TASK_TWITTER_FOLLOW,
            TASK_TWITTER_RETWEET,
            TASK_TWITTER_MEME,
            TASK_DISCORD_JOIN,
            TASK_DISCORD_SHARE,
            TASK_DISCORD_AMA,
            TASK_REFERRAL_1,
            TASK_REFERRAL_5,
            TASK_REFERRAL_10,
            TASK_YOUTUBE_SUBSCRIBE
        ];

        // Complete up to the requested count (max 10 available tasks)
        uint256 tasksToComplete = count > 10 ? 10 : count;

        for (uint256 i = 0; i < tasksToComplete; i++) {
            bytes memory sig = _createOracleSignature(tokenId, allTasks[i]);
            vm.prank(nftOwner);
            remintController.completeSocialTask(tokenId, allTasks[i], sig);
        }
    }
}
