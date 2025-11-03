// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {MockERC20} from "./MockERC20.sol";

/**
 * @title MockRWAAsset
 * @notice Mock RWA (Real World Asset) token for testing
 */
contract MockRWAAsset is MockERC20 {
    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals
    ) MockERC20(name, symbol, decimals) {}
}
