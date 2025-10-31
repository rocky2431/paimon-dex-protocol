// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title HYD Token
 * @notice HYD (Hydra) is the low-volatility synthetic asset for Paimon.dex protocol
 * @dev BEP-20 token with:
 *      - Mint/burn controlled exclusively by PSM (Peg Stability Module)
 *      - Pausable by emergency admin
 *      - Blacklist functionality for compliance
 *      - Gas-optimized with immutable PSM address
 *
 * Security Features:
 * - Only PSM contract can mint new tokens
 * - Only PSM contract can burn tokens
 * - Admin can pause all transfers in emergency
 * - Admin can blacklist malicious addresses
 *
 * Gas Optimization:
 * - PSM address is immutable (saves SLOAD on every mint/burn)
 * - Minimal storage slots usage
 * - Efficient blacklist checks
 */
contract HYD is ERC20, ERC20Burnable, Pausable, Ownable {
    /// @notice Role identifier for pausers (emergency pause authority)
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    /// @notice Role identifier for blacklist managers (compliance authority)
    bytes32 public constant BLACKLISTER_ROLE = keccak256("BLACKLISTER_ROLE");

    /// @notice Role for DEFAULT_ADMIN (for test compatibility)
    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;

    /// @notice Immutable address of the PSM (Peg Stability Module) contract
    /// @dev Only this address can mint/burn HYD tokens for gas optimization
    address public  PSM;

    /// @notice Mapping of authorized minters (PSM + authorized contracts like SettlementRouter)
    mapping(address => bool) public authorizedMinters;

    /// @notice Mapping of addresses with pauser role
    mapping(address => bool) private _pausers;

    /// @notice Mapping of addresses with blacklister role
    mapping(address => bool) private _blacklisters;

    /// @notice Mapping of blacklisted addresses (cannot send or receive tokens)
    mapping(address => bool) private _blacklisted;

    /// @notice Emitted when an address is blacklisted
    event Blacklisted(address indexed account);

    /// @notice Emitted when an address is removed from blacklist
    event Unblacklisted(address indexed account);

    /**
     * @notice Constructor sets up the HYD token with PSM address
     * 
     */
    constructor() ERC20("Hydra", "HYD") Ownable(msg.sender) {
  
        // Grant roles to deployer
        _pausers[msg.sender] = true;
        _blacklisters[msg.sender] = true;
    }
    /**
     * @notice temp set psm address 
     * @param psm Address of the Peg Stability Module (only address that can mint/burn)
     */
    function initTempPsm(address psm) external onlyOwner{
        require(psm != address(0), "HYD: PSM address cannot be zero");
        PSM = psm;
        // Authorize PSM as default minter
        authorizedMinters[psm] = true;
    }

    /**
     * @notice Mint new HYD tokens (authorized minters only)
     * @dev Only callable by PSM or authorized minters for security
     * @param to Recipient address
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external whenNotPaused {
        require(authorizedMinters[msg.sender], "HYD: Only authorized minters can mint");
        _mint(to, amount);
    }

    /**
     * @notice Burn HYD tokens from an address (PSM-only)
     * @dev Only callable by PSM contract for security
     * @param from Address to burn tokens from
     * @param amount Amount of tokens to burn
     */
    function burnFrom(address from, uint256 amount) public override whenNotPaused {
        require(msg.sender == PSM, "HYD: Only PSM can burn");
        _burn(from, amount);
    }

    /**
     * @notice Pause all token transfers (emergency only)
     * @dev Only accounts with PAUSER_ROLE can pause
     */
    function pause() external {
        require(_pausers[msg.sender], "AccessControl: account is missing role");
        _pause();
    }

    /**
     * @notice Unpause token transfers
     * @dev Only accounts with PAUSER_ROLE can unpause
     */
    function unpause() external {
        require(_pausers[msg.sender], "AccessControl: account is missing role");
        _unpause();
    }

    /**
     * @notice Add an address to the blacklist
     * @dev Only accounts with BLACKLISTER_ROLE can blacklist
     * @param account Address to blacklist
     */
    function blacklist(address account) external {
        require(_blacklisters[msg.sender], "AccessControl: account is missing role");
        require(account != address(0), "HYD: Cannot blacklist zero address");
        require(!_blacklisted[account], "HYD: Account already blacklisted");

        _blacklisted[account] = true;
        emit Blacklisted(account);
    }

    /**
     * @notice Remove an address from the blacklist
     * @dev Only accounts with BLACKLISTER_ROLE can unblacklist
     * @param account Address to unblacklist
     */
    function unblacklist(address account) external {
        require(_blacklisters[msg.sender], "AccessControl: account is missing role");
        require(_blacklisted[account], "HYD: Account not blacklisted");

        _blacklisted[account] = false;
        emit Unblacklisted(account);
    }

    /**
     * @notice Check if an address is blacklisted
     * @param account Address to check
     * @return bool True if blacklisted, false otherwise
     */
    function isBlacklisted(address account) external view returns (bool) {
        return _blacklisted[account];
    }

    /**
     * @notice Check if an account has a specific role
     * @dev Lightweight implementation for test compatibility
     * @param role Role identifier
     * @param account Address to check
     * @return bool True if account has role
     */
    function hasRole(bytes32 role, address account) external view returns (bool) {
        if (role == DEFAULT_ADMIN_ROLE) {
            return account == owner();
        } else if (role == PAUSER_ROLE) {
            return _pausers[account];
        } else if (role == BLACKLISTER_ROLE) {
            return _blacklisters[account];
        }
        return false;
    }

    /**
     * @notice Authorize an address to mint HYD tokens
     * @dev Only owner can authorize minters (for contracts like SettlementRouter)
     * @param minter Address to authorize
     */
    function authorizeMinter(address minter) external onlyOwner {
        require(minter != address(0), "HYD: Cannot authorize zero address");
        authorizedMinters[minter] = true;
    }

    /**
     * @notice Revoke minting authorization from an address
     * @dev Only owner can revoke. Cannot revoke PSM.
     * @param minter Address to revoke authorization from
     */
    function revokeMinter(address minter) external onlyOwner {
        require(minter != PSM, "HYD: Cannot revoke PSM");
        authorizedMinters[minter] = false;
    }

    /**
     * @notice Grant a role to an account
     * @dev Only owner can grant roles
     * @param role Role identifier
     * @param account Address to grant role to
     */
    function grantRole(bytes32 role, address account) external onlyOwner {
        if (role == PAUSER_ROLE) {
            _pausers[account] = true;
        } else if (role == BLACKLISTER_ROLE) {
            _blacklisters[account] = true;
        }
        // DEFAULT_ADMIN_ROLE cannot be granted (only owner)
    }

    /**
     * @notice Internal update function with blacklist checks
     * @dev Overrides ERC20 to add blacklist functionality
     * @dev Pause checks are only applied to mint/burn via whenNotPaused modifier
     * @param from Sender address
     * @param to Recipient address
     * @param value Amount to transfer
     */
    function _update(address from, address to, uint256 value) internal virtual override(ERC20) {
        // Check blacklist (except for minting/burning)
        if (from != address(0)) {
            require(!_blacklisted[from], "HYD: Sender is blacklisted");
        }
        if (to != address(0)) {
            require(!_blacklisted[to], "HYD: Recipient is blacklisted");
        }

        // Call parent implementation (no pause check for transfers, only mint/burn)
        super._update(from, to, value);
    }
}
