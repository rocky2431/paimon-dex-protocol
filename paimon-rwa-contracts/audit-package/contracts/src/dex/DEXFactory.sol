// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./DEXPair.sol";

/**
 * @title DEXFactory
 * @notice Factory contract for creating and managing DEX liquidity pairs
 * @dev Creates DEXPair contracts using CREATE2 for deterministic addresses
 */
contract DEXFactory {
    /// @notice Treasury address for fee collection
    address public treasury;

    /// @notice Mapping from token pair to pair address
    mapping(address => mapping(address => address)) public getPair;

    /// @notice Array of all created pairs
    address[] public allPairs;

    /// @notice Emitted when a new pair is created
    event PairCreated(address indexed token0, address indexed token1, address pair, uint256 pairCount);

    /**
     * @notice Constructor sets the treasury address
     * @param _treasury Treasury address
     */
    constructor(address _treasury) {
        require(_treasury != address(0), "ZERO_ADDRESS");
        treasury = _treasury;
    }

    /**
     * @notice Returns the number of pairs created
     */
    function allPairsLength() external view returns (uint256) {
        return allPairs.length;
    }

    /**
     * @notice Create a new liquidity pair for two tokens
     * @param tokenA First token address
     * @param tokenB Second token address
     * @return pair Address of the created pair
     */
    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenA != tokenB, "IDENTICAL_ADDRESSES");
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), "ZERO_ADDRESS");
        require(getPair[token0][token1] == address(0), "PAIR_EXISTS");

        bytes memory bytecode = type(DEXPair).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        assembly {
            pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }

        DEXPair(pair).initialize(token0, token1);
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair; // Populate mapping in the reverse direction
        allPairs.push(pair);

        emit PairCreated(token0, token1, pair, allPairs.length);
    }

    /**
     * @notice Set new treasury address
     * @param _treasury New treasury address
     */
    function setTreasury(address _treasury) external {
        require(msg.sender == treasury, "FORBIDDEN");
        require(_treasury != address(0), "ZERO_ADDRESS");
        treasury = _treasury;
    }
}
