// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/AggregatorV3Interface.sol";

/**
 * @title MockChainlinkFeed
 * @notice Mock Chainlink price feed for testing
 */
contract MockChainlinkFeed is AggregatorV3Interface {
    uint8 private _decimals;
    int256 private _answer;
    uint256 private _timestamp;
    uint80 private _roundId;

    constructor(uint8 decimals_) {
        _decimals = decimals_;
        _timestamp = block.timestamp;
        _roundId = 1;
    }

    function updateAnswer(int256 newAnswer) external {
        _answer = newAnswer;
        _timestamp = block.timestamp;
        _roundId++;
    }

    function decimals() external view returns (uint8) {
        return _decimals;
    }

    function description() external pure returns (string memory) {
        return "Mock Chainlink Feed";
    }

    function version() external pure returns (uint256) {
        return 1;
    }

    function getRoundData(uint80 _id)
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (_id, _answer, _timestamp, _timestamp, _id);
    }

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (_roundId, _answer, _timestamp, _timestamp, _roundId);
    }
}
