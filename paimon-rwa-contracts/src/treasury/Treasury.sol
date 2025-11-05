// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @dev Interface for DEXPair
interface IDEXPair {
    /// @notice Get token0 address
    /// @return Address of token0 in the pair
    function token0() external view returns (address);

    /// @notice Get token1 address
    /// @return Address of token1 in the pair
    function token1() external view returns (address);

    /// @notice Claim accumulated treasury fees
    /// @param to Recipient address for the fees
    function claimTreasuryFees(address to) external;
}

/**
 * @title Treasury
 * @notice Protocol treasury for collecting and managing protocol fees
 * @dev Implements secure fee collection and multi-sig controlled withdrawals
 *
 * Key Features:
 * - Collects DEX treasury fees (30% of 0.25% = 0.075%)
 * - Receives USDC from Bond NFT sales
 * - Fulfills bond redemptions at maturity
 * - Multi-sig authorization via Ownable2Step
 * - Emergency pause functionality
 * - SafeERC20 for secure token transfers
 * - ReentrancyGuard on all state-changing functions
 * - ETH support for native token handling
 *
 * Security:
 * - Only owner can withdraw funds
 * - Pausable in emergency
 * - ReentrancyGuard prevents reentrancy attacks
 * - Ownable2Step prevents accidental ownership transfer
 *
 * Architecture Note:
 * - Treasury is ONLY for protocol asset management
 * - User RWA collateral/lending is handled by USDPVault
 * - Clear separation of concerns: Protocol treasury vs User lending
 */
contract Treasury is Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ==================== State Variables ====================

    /// @notice USDC token address (for bond redemptions)
    IERC20 public immutable usdcToken;

    /// @notice Total USDC received from Bond NFT sales
    uint256 public totalBondSales;

    /// @notice Authorized Bond NFT contract address
    address public bondNFTContract;

    /// @notice Authorized Settlement Router address
    address public settlementRouter;

    // ==================== Events ====================

    /// @notice Emitted when DEX fees are claimed
    event DEXFeesClaimed(address indexed pair, address indexed recipient, uint256 token0Amount, uint256 token1Amount);

    /// @notice Emitted when tokens are withdrawn
    event Withdraw(address indexed token, address indexed recipient, uint256 amount);

    /// @notice Emitted when ETH is withdrawn
    event WithdrawETH(address indexed recipient, uint256 amount);

    /// @notice Emitted when bond sales are received
    event BondSalesReceived(uint256 indexed amount, uint256 indexed totalSales);

    /// @notice Emitted when redemption is fulfilled
    event RedemptionFulfilled(address indexed user, uint256 indexed amount);

    // ==================== Custom Errors ====================

    error ZeroAddress();
    error ZeroAmount();
    error NoPairs();
    error InsufficientBalance();
    error TransferFailed();
    error Unauthorized();

    // ==================== Constructor ====================

    /**
     * @notice Constructor
     * @param initialOwner Initial owner address (should be multi-sig)
     * @param _usdcToken USDC token address (for bond redemptions)
     */
    constructor(address initialOwner, address _usdcToken) Ownable(initialOwner) {
        if (initialOwner == address(0)) revert ZeroAddress();
        if (_usdcToken == address(0)) revert ZeroAddress();
        usdcToken = IERC20(_usdcToken);
    }

    // ==================== Fee Collection ====================

    /**
     * @notice Claim treasury fees from DEX pairs
     * @param pairs Array of DEXPair addresses to claim from
     * @param recipient Address to receive claimed fees
     * @dev Only owner can call. Claims fees from multiple pairs in one transaction.
     */
    function claimDEXFees(address[] calldata pairs, address recipient)
        external
        onlyOwner
        whenNotPaused
        nonReentrant
    {
        if (pairs.length == 0) revert NoPairs();
        if (recipient == address(0)) revert ZeroAddress();

        for (uint256 i = 0; i < pairs.length; i++) {
            address pair = pairs[i];

            // Claim fees from pair (fees go directly to recipient)
            IDEXPair(pair).claimTreasuryFees(recipient);

            // Emit event
            emit DEXFeesClaimed(pair, recipient, 0, 0);
        }
    }

    // ==================== Withdrawal Functions ====================

    /**
     * @notice Withdraw ERC20 tokens from treasury
     * @param token Token address to withdraw
     * @param recipient Address to receive tokens
     * @param amount Amount to withdraw
     * @dev Only owner can withdraw. Uses SafeERC20 for security.
     */
    function withdraw(address token, address recipient, uint256 amount)
        external
        onlyOwner
        whenNotPaused
        nonReentrant
    {
        if (token == address(0)) revert ZeroAddress();
        if (recipient == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance < amount) revert InsufficientBalance();

        IERC20(token).safeTransfer(recipient, amount);

        emit Withdraw(token, recipient, amount);
    }

    /**
     * @notice Withdraw ETH from treasury
     * @param recipient Address to receive ETH
     * @param amount Amount of ETH to withdraw
     * @dev Only owner can withdraw ETH.
     */
    function withdrawETH(address recipient, uint256 amount)
        external
        onlyOwner
        whenNotPaused
        nonReentrant
    {
        if (recipient == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (address(this).balance < amount) revert InsufficientBalance();

        (bool success,) = recipient.call{value: amount}("");
        if (!success) revert TransferFailed();

        emit WithdrawETH(recipient, amount);
    }

    // ==================== Emergency Functions ====================

    /**
     * @notice Pause treasury (emergency only)
     * @dev Only owner can pause. Blocks all withdrawals and fee claims.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause treasury
     * @dev Only owner can unpause.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ==================== Query Functions ====================

    /**
     * @notice Get balance of specific token
     * @param token Token address
     * @return balance Token balance held by treasury
     */
    function getBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    /**
     * @notice Get balances of multiple tokens
     * @param tokens Array of token addresses
     * @return balances Array of token balances
     */
    function getBalances(address[] calldata tokens) external view returns (uint256[] memory) {
        uint256[] memory balances = new uint256[](tokens.length);
        for (uint256 i = 0; i < tokens.length; i++) {
            balances[i] = IERC20(tokens[i]).balanceOf(address(this));
        }
        return balances;
    }

    // ==================== Receive ETH ====================

    /**
     * @notice Receive ETH
     * @dev Allows treasury to receive native tokens
     */
    receive() external payable {}

    // ==================== Bond NFT Settlement Integration ====================

    /**
     * @notice Authorize Bond NFT contract
     * @param _bondNFTContract Address of the Bond NFT contract
     * @dev Only owner can authorize the bond NFT contract
     */
    function authorizeBondNFTContract(address _bondNFTContract) external onlyOwner {
        if (_bondNFTContract == address(0)) revert ZeroAddress();
        bondNFTContract = _bondNFTContract;
    }

    /**
     * @notice Authorize Settlement Router contract
     * @param _settlementRouter Address of the Settlement Router contract
     * @dev Only owner can authorize the settlement router
     */
    function authorizeSettlementRouter(address _settlementRouter) external onlyOwner {
        if (_settlementRouter == address(0)) revert ZeroAddress();
        settlementRouter = _settlementRouter;
    }

    /**
     * @notice Receive USDC from Bond NFT sales
     * @param usdcAmount Amount of USDC received from NFT minting
     * @dev Only authorized Bond NFT contract can call this function.
     *      Tracks total bond sales for accounting purposes.
     */
    function receiveBondSales(uint256 usdcAmount) external whenNotPaused nonReentrant {
        if (msg.sender != bondNFTContract) revert Unauthorized();
        if (usdcAmount == 0) revert ZeroAmount();

        totalBondSales += usdcAmount;

        emit BondSalesReceived(usdcAmount, totalBondSales);
    }

    /**
     * @notice Fulfill cash redemption at bond maturity
     * @param user Address to receive the redemption payment
     * @param amount Amount of USDC to pay (principal + yield)
     * @dev Only authorized Settlement Router can call this function.
     *      Transfers USDC from treasury to user for bond redemption.
     */
    function fulfillRedemption(address user, uint256 amount) external whenNotPaused nonReentrant {
        if (msg.sender != settlementRouter) revert Unauthorized();
        if (user == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        // Check treasury has sufficient USDC balance
        uint256 balance = usdcToken.balanceOf(address(this));
        if (balance < amount) revert InsufficientBalance();

        // Transfer USDC to user
        usdcToken.safeTransfer(user, amount);

        emit RedemptionFulfilled(user, amount);
    }
}
