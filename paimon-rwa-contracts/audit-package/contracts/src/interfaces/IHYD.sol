// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IHYD Interface
 * @notice Interface for HYD token with mint/burn capabilities
 * @dev Legacy interface, maintained for backward compatibility with Treasury
 */
interface IHYD is IERC20 {
    /**
     * @notice Mint new HYD tokens
     * @dev Only authorized minters can call
     * @param to Address to receive minted tokens
     * @param amount Amount of HYD to mint (18 decimals)
     */
    function mint(address to, uint256 amount) external;

    /**
     * @notice Burn HYD tokens from an address
     * @dev Requires allowance if caller is not the token holder
     * @param from Address to burn tokens from
     * @param amount Amount of HYD to burn (18 decimals)
     */
    function burnFrom(address from, uint256 amount) external;
}
