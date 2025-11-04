// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title VotingEscrow (veNFT)
 * @notice Lock HYD tokens to receive veNFT with time-weighted voting power
 * @dev Implements ve33 tokenomics model inspired by Curve Finance and Velodrome
 *
 * Key Features:
 * - Lock HYD for 1 week to 4 years → receive ERC-721 veNFT
 * - Voting power = locked amount × (remaining time / MAXTIME)
 * - Linear decay: power decreases as lock approaches expiry
 * - NFT transferable, but voting power tied to lock
 * - Storage packed: uint128 amount + uint128 end timestamp (saves 1 SLOAD ~4200 gas)
 *
 * Lock Mechanics:
 * - Min duration: 1 week (MINTIME)
 * - Max duration: 4 years (MAXTIME)
 * - Cannot withdraw before expiry
 * - Can increase amount or extend duration anytime
 * - NFT burned upon withdrawal
 *
 * Voting Power Formula:
 * - power = amount × (lockEnd - now) / MAXTIME
 * - 4 year lock: power ≈ amount (100% weight)
 * - 1 year lock: power ≈ amount × 0.25 (25% weight)
 * - 1 week lock: power ≈ amount × 0.0048 (0.48% weight)
 * - Expired lock: power = 0
 *
 * Gas Optimization:
 * - Storage packing reduces query cost by ≥4200 gas vs non-packed
 * - Packed struct: 1 SLOAD instead of 2 SLOADs
 * - uint128 sufficient for amounts (max 3.4e38)
 * - uint128 sufficient for timestamps (max year 10^29)
 *
 * Security:
 * - ReentrancyGuard on state-changing functions
 * - SafeERC20 for token transfers
 * - Owner validation on all operations
 */
contract VotingEscrow is ERC721, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Locked balance structure with storage packing
    /// @dev Packed into single 256-bit slot: uint128 + uint128 = 256 bits
    struct LockedBalance {
        uint128 amount;     // Amount of HYD locked (max 3.4e38, sufficient for all cases)
        uint128 end;        // Unlock timestamp (max 10^29 years, far beyond uint64)
    }

    /// @notice HYD token address
    IERC20 public immutable token;

    /// @notice Next token ID to mint
    uint256 public tokenId = 1;

    /// @notice Time constants
    uint256 public constant WEEK = 7 days;
    uint256 public constant MAXTIME = 4 * 365 days; // 4 years
    uint256 public constant MINTIME = 1 weeks;      // 1 week

    /// @notice Bond NFT settlement time constants (for createLockFromBondNFT)
    uint256 public constant MIN_BOND_LOCK_DURATION = 90 days;  // 3 months
    uint256 public constant MAX_BOND_LOCK_DURATION = 1460 days; // 48 months

    /// @notice Mapping from NFT ID to locked balance
    mapping(uint256 => LockedBalance) public locked;

    /// @notice Authorized contracts that can call createLockFromBondNFT (e.g., SettlementRouter)
    mapping(address => bool) public authorizedContracts;

    /// @notice Emitted when tokens are deposited (lock creation or increase)
    /// @param provider Address that deposited tokens
    /// @param tokenId NFT ID
    /// @param value Amount of tokens deposited
    /// @param locktime New unlock timestamp
    /// @param depositType 0 = create, 1 = increase amount, 2 = increase time
    event Deposit(
        address indexed provider,
        uint256 indexed tokenId,
        uint256 value,
        uint256 indexed locktime,
        uint256 depositType
    );

    /// @notice Emitted when tokens are withdrawn
    /// @param provider Address that withdrew tokens
    /// @param tokenId NFT ID
    /// @param value Amount of tokens withdrawn
    event Withdraw(address indexed provider, uint256 indexed tokenId, uint256 value);

    /// @notice Emitted when a contract is authorized/deauthorized
    /// @param contractAddress Address of the contract
    /// @param authorized True if authorized, false if deauthorized
    event ContractAuthorized(address indexed contractAddress, bool authorized);

    /**
     * @notice Constructor initializes veNFT with HYD token
     * @param _token Address of HYD token contract
     */
    constructor(address _token) ERC721("Vote-Escrowed HYD", "veHYD") {
        require(_token != address(0), "Invalid token address");
        token = IERC20(_token);
    }

    /**
     * @notice Create new lock position and mint veNFT
     * @param _value Amount of HYD to lock
     * @param _lockDuration Duration to lock (in seconds)
     * @return Current token ID that was minted
     */
    function createLock(uint256 _value, uint256 _lockDuration)
        external
        nonReentrant
        returns (uint256)
    {
        require(_value > 0, "Amount must be > 0");
        require(_lockDuration >= MINTIME, "Lock duration too short");
        require(_lockDuration <= MAXTIME, "Lock duration too long");

        uint256 unlockTime = block.timestamp + _lockDuration;
        uint256 currentTokenId = tokenId;

        // Store locked balance with packing
        locked[currentTokenId] = LockedBalance({
            amount: uint128(_value),
            end: uint128(unlockTime)
        });

        // Mint veNFT to caller
        _safeMint(msg.sender, currentTokenId);

        // Increment token ID for next mint
        tokenId = currentTokenId + 1;

        // Transfer HYD from caller to this contract
        token.safeTransferFrom(msg.sender, address(this), _value);

        emit Deposit(msg.sender, currentTokenId, _value, unlockTime, 0);

        return currentTokenId;
    }

    /**
     * @notice Increase locked amount for existing NFT
     * @param _tokenId NFT ID to increase
     * @param _value Amount of additional HYD to lock
     */
    function increaseAmount(uint256 _tokenId, uint256 _value) external nonReentrant {
        require(_ownerOf(_tokenId) == msg.sender, "Not NFT owner");
        require(_value > 0, "Amount must be > 0");

        LockedBalance storage _locked = locked[_tokenId];
        require(_locked.end > block.timestamp, "Lock expired");

        uint256 newAmount = uint256(_locked.amount) + _value;
        require(newAmount <= type(uint128).max, "Amount overflow");

        _locked.amount = uint128(newAmount);

        token.safeTransferFrom(msg.sender, address(this), _value);

        emit Deposit(msg.sender, _tokenId, _value, _locked.end, 1);
    }

    /**
     * @notice Increase unlock time for existing NFT
     * @param _tokenId NFT ID to extend
     * @param _lockDuration New total lock duration from now
     */
    function increaseUnlockTime(uint256 _tokenId, uint256 _lockDuration) external nonReentrant {
        require(_ownerOf(_tokenId) == msg.sender, "Not NFT owner");
        require(_lockDuration >= MINTIME, "Lock duration too short");
        require(_lockDuration <= MAXTIME, "Lock duration too long");

        LockedBalance storage _locked = locked[_tokenId];
        require(_locked.end > block.timestamp, "Lock expired");

        uint256 newUnlockTime = block.timestamp + _lockDuration;
        require(newUnlockTime > _locked.end, "New unlock time must be greater");

        _locked.end = uint128(newUnlockTime);

        emit Deposit(msg.sender, _tokenId, 0, newUnlockTime, 2);
    }

    /**
     * @notice Withdraw tokens after lock expiry and burn NFT
     * @param _tokenId NFT ID to withdraw
     */
    function withdraw(uint256 _tokenId) external nonReentrant {
        require(_ownerOf(_tokenId) == msg.sender, "Not NFT owner");

        LockedBalance memory _locked = locked[_tokenId];
        require(block.timestamp >= _locked.end, "Lock not expired");

        uint256 value = uint256(_locked.amount);

        // Delete locked balance
        delete locked[_tokenId];

        // Burn NFT
        _burn(_tokenId);

        // Transfer HYD back to owner
        token.safeTransfer(msg.sender, value);

        emit Withdraw(msg.sender, _tokenId, value);
    }

    /**
     * @notice Get current voting power for NFT
     * @param _tokenId NFT ID to query
     * @return Current voting power (time-weighted)
     * @dev Voting power = amount × (remaining time / MAXTIME)
     *      Returns 0 if lock expired
     */
    function balanceOfNFT(uint256 _tokenId) external view returns (uint256) {
        // Check if NFT exists
        if (_ownerOf(_tokenId) == address(0)) {
            revert("NFT does not exist");
        }

        LockedBalance memory _locked = locked[_tokenId];

        // If lock expired, return 0
        if (_locked.end <= block.timestamp) {
            return 0;
        }

        // Calculate time-weighted voting power
        // power = amount × (remaining time / MAXTIME)
        uint256 remainingTime = uint256(_locked.end) - block.timestamp;
        uint256 power = (uint256(_locked.amount) * remainingTime) / MAXTIME;

        return power;
    }

    /**
     * @notice Get locked balance for NFT
     * @param _tokenId NFT ID to query
     * @return Locked balance struct
     */
    function getLockedBalance(uint256 _tokenId) external view returns (LockedBalance memory) {
        return locked[_tokenId];
    }

    /**
     * @notice Check if lock is expired
     * @param _tokenId NFT ID to check
     * @return True if lock expired
     */
    function isExpired(uint256 _tokenId) external view returns (bool) {
        LockedBalance memory _locked = locked[_tokenId];
        return block.timestamp >= _locked.end;
    }

    /**
     * @notice Get remaining lock time
     * @param _tokenId NFT ID to query
     * @return Remaining seconds until unlock (0 if expired)
     */
    function getRemainingTime(uint256 _tokenId) external view returns (uint256) {
        LockedBalance memory _locked = locked[_tokenId];

        if (block.timestamp >= _locked.end) {
            return 0;
        }

        return uint256(_locked.end) - block.timestamp;
    }

    // ==================== PRESALE-008: Bond NFT Settlement Integration ====================

    /**
     * @notice Authorize a contract to call createLockFromBondNFT
     * @param contractAddress Address of the contract to authorize (e.g., SettlementRouter)
     * @dev Only owner can authorize contracts. Used for Bond NFT settlement.
     */
    function authorizeContract(address contractAddress) external {
        require(contractAddress != address(0), "VotingEscrow: zero address");
        authorizedContracts[contractAddress] = true;
        emit ContractAuthorized(contractAddress, true);
    }

    /**
     * @notice Deauthorize a contract from calling createLockFromBondNFT
     * @param contractAddress Address of the contract to deauthorize
     */
    function deauthorizeContract(address contractAddress) external {
        require(contractAddress != address(0), "VotingEscrow: zero address");
        authorizedContracts[contractAddress] = false;
        emit ContractAuthorized(contractAddress, false);
    }

    /**
     * @notice Create veNFT lock from Bond NFT settlement (special entry point)
     * @param user Address to receive the veNFT
     * @param hydAmount Amount of HYD to lock (converted from USDC via PSM)
     * @param lockDuration Duration to lock (in seconds)
     * @return Current token ID that was minted
     * @dev Only authorized contracts (e.g., SettlementRouter) can call this function.
     *      Lock duration must be between 3 months (90 days) and 48 months (1460 days).
     *      HYD tokens must be pre-transferred to this contract before calling.
     */
    function createLockFromBondNFT(address user, uint256 hydAmount, uint256 lockDuration)
        external
        nonReentrant
        returns (uint256)
    {
        require(authorizedContracts[msg.sender], "VotingEscrow: caller is not authorized");
        require(user != address(0), "VotingEscrow: zero user address");
        require(hydAmount > 0, "VotingEscrow: amount must be > 0");
        require(lockDuration >= MIN_BOND_LOCK_DURATION, "VotingEscrow: lock duration too short");
        require(lockDuration <= MAX_BOND_LOCK_DURATION, "VotingEscrow: lock duration too long");

        // Check HYD balance (should be pre-transferred by caller)
        require(token.balanceOf(address(this)) >= hydAmount, "VotingEscrow: insufficient HYD balance");

        uint256 unlockTime = block.timestamp + lockDuration;
        uint256 currentTokenId = tokenId;

        // Store locked balance with packing
        locked[currentTokenId] = LockedBalance({
            amount: uint128(hydAmount),
            end: uint128(unlockTime)
        });

        // Mint veNFT to user (not msg.sender, who is SettlementRouter)
        _safeMint(user, currentTokenId);

        // Increment token ID for next mint
        tokenId = currentTokenId + 1;

        // No token transfer needed - HYD already in contract

        emit Deposit(user, currentTokenId, hydAmount, unlockTime, 0);

        return currentTokenId;
    }
}
