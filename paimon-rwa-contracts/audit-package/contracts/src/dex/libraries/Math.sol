// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Math
 * @notice Math library for DEX calculations
 */
library Math {
    /**
     * @notice Calculate square root using Babylonian method
     * @param y Input value
     * @return z Square root of y
     */
    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    /**
     * @notice Return minimum of two values
     */
    function min(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = x < y ? x : y;
    }
}
