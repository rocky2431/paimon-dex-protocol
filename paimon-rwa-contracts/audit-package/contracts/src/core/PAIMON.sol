// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title PAIMON Token
 * @notice Platform utility token for Paimon.dex ve33 ecosystem
 * @dev Key Features:
 *      - Max supply: 10 billion PAIMON (10,000,000,000 tokens)
 *      - Role-based minting: Only addresses with MINTER_ROLE can mint
 *      - Burnable: Anyone can burn their own tokens permanently
 *      - Capped: Total supply cannot exceed max supply cap
 *      - Access Control: Admin can grant/revoke MINTER_ROLE
 *
 * Use Cases:
 * - Governance token emissions via GaugeController
 * - Protocol revenue buyback and burn mechanism
 * - Liquidity mining rewards
 * - Bribe marketplace incentives
 *
 * Security Features:
 * - OpenZeppelin AccessControl for role management
 * - ERC20Capped prevents supply overflow
 * - ERC20Burnable for deflationary mechanism
 * - Immutable max supply cap set at deployment
 *
 * Gas Optimization:
 * - Inherits OpenZeppelin's gas-optimized ERC20 implementation
 * - Role checks cached via AccessControl
 * - Standard 18 decimals for ecosystem compatibility
 */
contract PAIMON is ERC20, ERC20Burnable, ERC20Capped, AccessControl {
    /// @notice Role identifier for addresses allowed to mint new tokens
    /// @dev Typically granted to GaugeController and Treasury contracts
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /**
     * @notice Constructor initializes PAIMON token with max supply cap
     * @param maxSupply Maximum total supply of PAIMON tokens (10B with 18 decimals)
     * @dev Grants DEFAULT_ADMIN_ROLE and MINTER_ROLE to deployer
     */
    constructor(uint256 maxSupply)
        ERC20("PAIMON Token", "PAIMON")
        ERC20Capped(maxSupply)
    {
        // Grant DEFAULT_ADMIN_ROLE to deployer (can manage all roles)
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        // Grant MINTER_ROLE to deployer (can mint tokens initially)
        _grantRole(MINTER_ROLE, msg.sender);
    }

    /**
     * @notice Mint new PAIMON tokens to specified address
     * @param to Recipient address
     * @param amount Amount of tokens to mint (18 decimals)
     * @dev Only callable by addresses with MINTER_ROLE
     * @dev Reverts if minting would exceed max supply cap
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    /**
     * @notice Override required by Solidity for multiple inheritance
     * @dev Calls ERC20Capped._update which enforces supply cap
     */
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Capped)
    {
        super._update(from, to, value);
    }
}
