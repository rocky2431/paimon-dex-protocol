// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IUSDP Interface
 * @notice Interface for USDP token with mint/burn capabilities
 * @dev Used by PSM and Treasury contracts
 */
interface IUSDP is IERC20 {
    /**
     * @notice Mint new USDP tokens
     * @dev Only authorized minters (PSM, Treasury) can call
     * @param to Address to receive minted tokens
     * @param amount Amount of USDP to mint (18 decimals)
     */
    function mint(address to, uint256 amount) external;

    /**
     * @notice Burn USDP tokens from an address
     * @dev Requires allowance if caller is not the token holder
     * @param from Address to burn tokens from
     * @param amount Amount of USDP to burn (18 decimals)
     */
    function burnFrom(address from, uint256 amount) external;
}
