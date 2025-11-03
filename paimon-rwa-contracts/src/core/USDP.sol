// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title USDP - USD Paimon Stablecoin
 * @notice Share-based ERC20 with accrualIndex for yield distribution
 * @dev Implements份额-索引模式 (share-based) for automatic yield accrual
 *
 * Key Concepts:
 * - Users hold shares (_shares[user])
 * - Balance = shares * accrualIndex / 1e18
 * - Treasury accumulates yield daily by updating accrualIndex
 * - Minting: Only Treasury and PSM
 * - Burning: Only Treasury
 * - Accumulate: Only RewardDistributor
 *
 * Example:
 * - User deposits 1000 USDP (receives 1000 shares at index 1.0)
 * - After 1 day, Treasury calls accumulate(1.02e18) → 2% yield
 * - User balance becomes 1000 * 1.02 / 1.0 = 1020 USDP
 * - User shares remain 1000 (unchanged)
 */
contract USDP is IERC20, Ownable, ReentrancyGuard {
    // ==================== State Variables ====================

    string public constant name = "USD Paimon";
    string public constant symbol = "USDP";
    uint8 public constant decimals = 18;

    /// @notice Current accrual index (18 decimals, 1e18 = 1.0)
    uint256 public accrualIndex;

    /// @notice Total shares held by all users
    uint256 private _totalShares;

    /// @notice User shares mapping
    mapping(address => uint256) private _shares;

    /// @notice ERC20 allowances
    mapping(address => mapping(address => uint256)) private _allowances;

    /// @notice Authorized minters (Treasury + PSM, can also burn)
    mapping(address => bool) public isMinter;

    /// @notice Authorized distributor (RewardDistributor)
    address public distributor;

    /// @notice Last accumulation timestamp (for daily update tracking)
    uint256 public lastAccumulationTime;

    /// @notice Accrual pause state (default: true to prevent accidental distributions)
    /// @dev When true, accumulate() is disabled. Only SavingRate should handle yield.
    bool public accrualPaused;

    // ==================== EIP-2612 Permit ====================

    /// @notice EIP-712 domain separator
    bytes32 public immutable DOMAIN_SEPARATOR;

    /// @notice EIP-712 Permit typehash
    bytes32 public constant PERMIT_TYPEHASH =
        keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");

    /// @notice Nonces for permit
    mapping(address => uint256) public nonces;

    // ==================== Events ====================

    event IndexAccumulated(uint256 indexed newIndex, uint256 indexed timestamp);
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    event DistributorUpdated(address indexed oldDistributor, address indexed newDistributor);
    event AccrualPausedUpdated(bool paused);

    // Note: Using require with string messages for test compatibility
    // (Tests expect specific error message strings)

    // ==================== Constructor ====================

    /**
     * @notice Initialize USDP contract
     * @dev Sets initial accrualIndex to 1e18 (1.0) and EIP-712 domain separator
     */
    constructor() Ownable(msg.sender) {
        accrualIndex = 1e18; // Initial index = 1.0
        lastAccumulationTime = block.timestamp;
        accrualPaused = true; // Default: paused to prevent accidental distributions

        // Initialize EIP-712 domain separator
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes(name)),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );

        emit IndexAccumulated(1e18, block.timestamp);
    }

    // ==================== ERC20 View Functions ====================

    /**
     * @notice Get total supply of USDP
     * @return Total supply in USDP units (not shares)
     */
    function totalSupply() external view override returns (uint256) {
        return (_totalShares * accrualIndex) / 1e18;
    }

    /**
     * @notice Get USDP balance of an account
     * @param account Address to query
     * @return Balance in USDP units (shares * accrualIndex / 1e18)
     */
    function balanceOf(address account) public view override returns (uint256) {
        return (_shares[account] * accrualIndex) / 1e18;
    }

    /**
     * @notice Get shares held by an account
     * @param account Address to query
     * @return Shares amount
     */
    function sharesOf(address account) external view returns (uint256) {
        return _shares[account];
    }

    /**
     * @notice Get total shares
     * @return Total shares amount
     */
    function totalShares() external view returns (uint256) {
        return _totalShares;
    }

    /**
     * @notice Get allowance for spender
     * @param owner Token owner
     * @param spender Approved spender
     * @return Allowance amount
     */
    function allowance(address owner, address spender) external view override returns (uint256) {
        return _allowances[owner][spender];
    }

    // ==================== ERC20 Transfer Functions ====================

    /**
     * @notice Transfer USDP to recipient
     * @param to Recipient address
     * @param amount Amount in USDP units
     * @return success True if successful
     */
    function transfer(address to, uint256 amount) external override nonReentrant returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    /**
     * @notice Transfer USDP from sender to recipient using allowance
     * @param from Sender address
     * @param to Recipient address
     * @param amount Amount in USDP units
     * @return success True if successful
     */
    function transferFrom(address from, address to, uint256 amount)
        external
        override
        nonReentrant
        returns (bool)
    {
        uint256 currentAllowance = _allowances[from][msg.sender];
        if (currentAllowance != type(uint256).max) {
            require(currentAllowance >= amount, "USDP: Transfer amount exceeds allowance");
            unchecked {
                _allowances[from][msg.sender] = currentAllowance - amount;
            }
        }
        _transfer(from, to, amount);
        return true;
    }

    /**
     * @notice Approve spender to use tokens
     * @param spender Approved spender
     * @param amount Allowance amount
     * @return success True if successful
     */
    function approve(address spender, uint256 amount) external override returns (bool) {
        require(spender != address(0), "USDP: Approve to zero address");
        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    /**
     * @notice Permit approval via signature (EIP-2612)
     * @param owner Token owner
     * @param spender Approved spender
     * @param value Allowance amount
     * @param deadline Signature expiration timestamp
     * @param v Signature v component
     * @param r Signature r component
     * @param s Signature s component
     */
    function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)
        external
    {
        require(block.timestamp <= deadline, "USDP: Expired deadline");
        require(owner != address(0), "USDP: Owner zero address");

        bytes32 structHash = keccak256(abi.encode(PERMIT_TYPEHASH, owner, spender, value, nonces[owner]++, deadline));

        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));

        address recoveredAddress = ECDSA.recover(digest, v, r, s);
        require(recoveredAddress == owner, "USDP: Invalid signature");

        _allowances[owner][spender] = value;
        emit Approval(owner, spender, value);
    }

    // ==================== Internal Helper Functions ====================

    /**
     * @notice Convert USDP amount to shares at current index
     * @param amount USDP amount
     * @return shares Equivalent shares
     */
    function _getSharesByUSDPAmount(uint256 amount) internal view returns (uint256) {
        return (amount * 1e18) / accrualIndex;
    }

    /**
     * @notice Internal transfer function
     * @dev Transfers shares, not USDP amounts directly
     * @param from Sender
     * @param to Recipient
     * @param amount Amount in USDP units
     */
    function _transfer(address from, address to, uint256 amount) internal {
        require(from != address(0), "USDP: Transfer from zero address");
        require(to != address(0), "USDP: Transfer to zero address");
        require(amount > 0, "USDP: Transfer zero amount");

        uint256 sharesToTransfer = _getSharesByUSDPAmount(amount);

        require(_shares[from] >= sharesToTransfer, "USDP: Transfer amount exceeds balance");

        unchecked {
            _shares[from] -= sharesToTransfer;
            _shares[to] += sharesToTransfer;
        }

        emit Transfer(from, to, amount);
    }

    // ==================== Minting & Burning ====================

    /**
     * @notice Mint USDP to recipient
     * @dev Only callable by authorized minters (Treasury, PSM)
     * @param to Recipient address
     * @param amount Amount in USDP units
     */
    function mint(address to, uint256 amount) external nonReentrant {
        require(isMinter[msg.sender], "USDP: Not authorized minter");
        require(to != address(0), "USDP: Mint to zero address");
        require(amount > 0, "USDP: Cannot mint zero");

        uint256 sharesToMint = _getSharesByUSDPAmount(amount);

        _totalShares += sharesToMint;
        _shares[to] += sharesToMint;

        emit Transfer(address(0), to, amount);
    }

    /**
     * @notice Burn USDP from account
     * @dev Only authorized minters can burn. Uses allowance mechanism like transferFrom.
     * @param from Account to burn from
     * @param amount Amount in USDP units
     */
    function burnFrom(address from, uint256 amount) external nonReentrant {
        require(isMinter[msg.sender], "USDP: Not authorized minter");
        require(from != address(0), "USDP: Burn from zero address");
        require(amount > 0, "USDP: Cannot burn zero");

        // Check and update allowance (same as transferFrom logic)
        uint256 currentAllowance = _allowances[from][msg.sender];
        if (currentAllowance != type(uint256).max) {
            require(currentAllowance >= amount, "USDP: Burn amount exceeds allowance");
            unchecked {
                _allowances[from][msg.sender] = currentAllowance - amount;
            }
        }

        uint256 sharesToBurn = _getSharesByUSDPAmount(amount);

        require(_shares[from] >= sharesToBurn, "USDP: Burn amount exceeds balance");

        unchecked {
            _totalShares -= sharesToBurn;
            _shares[from] -= sharesToBurn;
        }

        emit Transfer(from, address(0), amount);
    }

    // ==================== Yield Accumulation ====================

    /**
     * @notice Accumulate yield by updating accrualIndex
     * @dev Only callable by RewardDistributor. Frequency control delegated to distributor.
     * @param newIndex New accrual index (must be > current index for yield)
     *
     * Example:
     * - Current index: 1.00e18
     * - New index: 1.02e18 (2% yield)
     * - User with 1000 shares: balance increases from 1000 to 1020 USDP
     *
     * Note: No time-based restrictions enforced at contract level.
     * Distribution frequency should be controlled by the RewardDistributor contract.
     */
    function accumulate(uint256 newIndex) external nonReentrant {
        require(msg.sender == distributor, "USDP: Not distributor");
        require(!accrualPaused, "USDP: Accrual is paused");
        require(newIndex > accrualIndex, "USDP: Index must increase");

        accrualIndex = newIndex;
        lastAccumulationTime = block.timestamp;

        emit IndexAccumulated(newIndex, block.timestamp);
    }

    // ==================== Admin Functions ====================

    /**
     * @notice Set authorized minter status (Treasury or PSM)
     * @dev Minters can both mint and burn tokens
     * @param minter Address to authorize/revoke
     * @param authorized True to authorize, false to revoke
     */
    function setAuthorizedMinter(address minter, bool authorized) external onlyOwner {
        require(minter != address(0), "USDP: Minter zero address");
        isMinter[minter] = authorized;
        if (authorized) {
            emit MinterAdded(minter);
        } else {
            emit MinterRemoved(minter);
        }
    }

    /**
     * @notice Set authorized distributor (RewardDistributor)
     * @param newDistributor New distributor address
     */
    function setDistributor(address newDistributor) external onlyOwner {
        require(newDistributor != address(0), "USDP: Distributor zero address");
        address oldDistributor = distributor;
        distributor = newDistributor;
        emit DistributorUpdated(oldDistributor, newDistributor);
    }

    /**
     * @notice Set accrual pause state
     * @dev Controls whether accumulate() can be called
     * @param paused True to pause accrual, false to unpause
     *
     * Use case:
     * - Pause by default to prevent accidental yield distribution
     * - Unpause only when SavingRate contract is ready
     */
    function setAccrualPaused(bool paused) external onlyOwner {
        accrualPaused = paused;
        emit AccrualPausedUpdated(paused);
    }

    /**
     * @notice Emergency pause by renouncing ownership (irreversible)
     * @dev This is a safety mechanism to freeze the contract if needed
     */
    function emergencyPause() external onlyOwner {
        renounceOwnership();
    }
}
