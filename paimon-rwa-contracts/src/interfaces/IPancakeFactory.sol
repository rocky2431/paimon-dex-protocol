// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPancakeFactory
 * @notice Interface for PancakeSwap V2 Factory
 * @dev Based on Uniswap V2 Factory interface
 *
 * PancakeSwap V2 Factory Addresses:
 * - BSC Mainnet: 0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73
 * - BSC Testnet: 0x6725F303b657a9451d8BA641348b6761A6CC7a17
 *
 * References:
 * - https://docs.pancakeswap.finance/
 * - https://developer.pancakeswap.finance/contracts/v2/addresses
 */
interface IPancakeFactory {
    // ============================================================
    // EVENTS
    // ============================================================

    /**
     * @notice Emitted when a new pair is created
     * @param token0 Address of token0
     * @param token1 Address of token1
     * @param pair Address of the created pair
     * @param pairCount Total number of pairs created
     */
    event PairCreated(address indexed token0, address indexed token1, address pair, uint pairCount);

    // ============================================================
    // GETTERS
    // ============================================================

    /**
     * @notice Returns the fee recipient address
     * @return Address that receives protocol fees
     */
    function feeTo() external view returns (address);

    /**
     * @notice Returns the address with authority to set feeTo
     * @return Address with feeTo setter authority
     */
    function feeToSetter() external view returns (address);

    /**
     * @notice Returns the pair address for two tokens
     * @param tokenA Address of token A
     * @param tokenB Address of token B
     * @return pair Address of the pair contract (or address(0) if doesn't exist)
     */
    function getPair(address tokenA, address tokenB) external view returns (address pair);

    /**
     * @notice Returns the pair address at a specific index
     * @param index Index in the allPairs array
     * @return pair Address of the pair at the given index
     */
    function allPairs(uint index) external view returns (address pair);

    /**
     * @notice Returns the total number of pairs created
     * @return Total number of pairs
     */
    function allPairsLength() external view returns (uint);

    // ============================================================
    // SETTERS
    // ============================================================

    /**
     * @notice Creates a new pair for two tokens
     * @param tokenA Address of token A
     * @param tokenB Address of token B
     * @return pair Address of the newly created pair
     */
    function createPair(address tokenA, address tokenB) external returns (address pair);

    /**
     * @notice Sets the fee recipient address
     * @param feeTo New fee recipient address
     */
    function setFeeTo(address feeTo) external;

    /**
     * @notice Sets the address with authority to set feeTo
     * @param feeToSetter New feeToSetter address
     */
    function setFeeToSetter(address feeToSetter) external;
}
