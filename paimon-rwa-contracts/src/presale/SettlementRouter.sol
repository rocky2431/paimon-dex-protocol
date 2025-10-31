// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../core/VotingEscrow.sol";
import "../treasury/Treasury.sol";
import "./RWABondNFT.sol";
import "./RemintController.sol";
import "../core/HYD.sol";
import "../core/PSM.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SettlementRouter
 * @notice Routes Bond NFT settlement to either veNFT conversion or cash redemption
 * @dev Simplified 2-option settlement for RWA Bond NFTs after 90-day maturity
 *
 * Settlement Options:
 * 1. veNFT Conversion: 1 USDC principal + yield → 1 HYD locked (3-48 months)
 * 2. Cash Redemption: Receive principal (100 USDC) + base yield (0.5 USDC) + Remint yield
 *
 * Key Features:
 * - Maturity enforcement: only settle after 90 days
 * - Integration with VotingEscrow.createLockFromBondNFT()
 * - Integration with Treasury.fulfillRedemption()
 * - NFT burns after settlement
 * - Settlement events for analytics
 */
contract SettlementRouter is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ==================== State Variables ====================

    RWABondNFT public immutable bondNFT;
    RemintController public immutable remintController;
    VotingEscrow public immutable votingEscrow;
    Treasury public immutable treasury;
    HYD public immutable hyd;
    PSM public immutable psm;
    IERC20 public immutable usdc;

    uint256 public constant BOND_PRINCIPAL = 100 * 1e6; // 100 USDC
    uint256 public constant BASE_YIELD = 5 * 1e5; // 0.5 USDC
    uint256 public constant MIN_LOCK_DURATION = 90 days;
    uint256 public constant MAX_LOCK_DURATION = 1460 days;

    // ==================== Events ====================

    event SettledToVeNFT(
        address indexed user,
        uint256 indexed bondTokenId,
        uint256 indexed veNFTTokenId,
        uint256 hydAmount,
        uint256 lockDuration
    );

    event SettledToCash(
        address indexed user,
        uint256 indexed bondTokenId,
        uint256 totalAmount
    );

    // ==================== Constructor ====================

    constructor(
        address _bondNFT,
        address _remintController,
        address _votingEscrow,
        address _treasury,
        address _hyd,
        address _psm,
        address _usdc
    ) {
        require(_bondNFT != address(0), "SettlementRouter: zero bondNFT");
        require(_remintController != address(0), "SettlementRouter: zero remintController");
        require(_votingEscrow != address(0), "SettlementRouter: zero votingEscrow");
        require(_treasury != address(0), "SettlementRouter: zero treasury");
        require(_hyd != address(0), "SettlementRouter: zero HYD");
        require(_psm != address(0), "SettlementRouter: zero PSM");
        require(_usdc != address(0), "SettlementRouter: zero USDC");

        bondNFT = RWABondNFT(_bondNFT);
        remintController = RemintController(_remintController);
        votingEscrow = VotingEscrow(_votingEscrow);
        treasury = Treasury(payable(_treasury));
        hyd = HYD(_hyd);
        psm = PSM(_psm);
        usdc = IERC20(_usdc);
    }

    // ==================== Settlement Functions ====================

    /**
     * @notice Settle mature Bond NFT to veNFT with custom lock duration
     * @param bondTokenId Bond NFT token ID to settle
     * @param lockDuration veNFT lock duration (90-1460 days)
     * @return veNFTTokenId The minted veNFT token ID
     */
    function settleToVeNFT(uint256 bondTokenId, uint256 lockDuration)
        external
        nonReentrant
        returns (uint256 veNFTTokenId)
    {
        // Validate caller is NFT owner
        require(bondNFT.ownerOf(bondTokenId) == msg.sender, "SettlementRouter: caller is not NFT owner");

        // Validate bond is matured
        require(bondNFT.isMatured(bondTokenId), "SettlementRouter: bond not matured");

        // Validate lock duration
        require(lockDuration >= MIN_LOCK_DURATION, "SettlementRouter: lock duration too short");
        require(lockDuration <= MAX_LOCK_DURATION, "SettlementRouter: lock duration too long");

        // Calculate total USDC value using bondNFT's calculateTotalYield
        // (This includes both base yield and accumulated Remint)
        uint256 totalYield = bondNFT.calculateTotalYield(bondTokenId);
        uint256 totalUSDC = BOND_PRINCIPAL + totalYield;

        // Convert USDC to HYD amount (1:1 ratio)
        uint256 hydAmount = totalUSDC * 1e12; // Convert from 6 decimals (USDC) to 18 decimals (HYD)

        // Mint HYD to VotingEscrow
        hyd.mint(address(votingEscrow), hydAmount);

        // Create veNFT lock
        veNFTTokenId = votingEscrow.createLockFromBondNFT(msg.sender, hydAmount, lockDuration);

        // Burn Bond NFT
        bondNFT.burn(bondTokenId);

        emit SettledToVeNFT(msg.sender, bondTokenId, veNFTTokenId, hydAmount, lockDuration);
    }

    /**
     * @notice Settle mature Bond NFT for cash redemption
     * @param bondTokenId Bond NFT token ID to settle
     */
    function settleToCash(uint256 bondTokenId) external nonReentrant {
        // Validate caller is NFT owner
        require(bondNFT.ownerOf(bondTokenId) == msg.sender, "SettlementRouter: caller is not NFT owner");

        // Validate bond is matured
        require(bondNFT.isMatured(bondTokenId), "SettlementRouter: bond not matured");

        // Calculate total redemption amount using bondNFT's calculateTotalYield
        // (This includes both base yield and accumulated Remint)
        uint256 totalYield = bondNFT.calculateTotalYield(bondTokenId);
        uint256 totalAmount = BOND_PRINCIPAL + totalYield;

        // Fulfill redemption from Treasury
        treasury.fulfillRedemption(msg.sender, totalAmount);

        // Burn Bond NFT
        bondNFT.burn(bondTokenId);

        emit SettledToCash(msg.sender, bondTokenId, totalAmount);
    }
}
