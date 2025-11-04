// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/AggregatorV3Interface.sol";

/**
 * @title MockSequencerFeed
 * @notice Mock L2 Sequencer Uptime Feed for testing
 * @dev answer: 0 = sequencer is up, 1 = sequencer is down
 */
contract MockSequencerFeed is AggregatorV3Interface {
    int256 private _answer;
    uint256 private _timestamp;
    uint80 private _roundId;

    constructor() {
        _answer = 0; // Sequencer is up by default
        _timestamp = block.timestamp;
        _roundId = 1;
    }

    function updateAnswer(int256 newAnswer) external {
        _answer = newAnswer;
        _timestamp = block.timestamp;
        _roundId++;
    }

    function decimals() external pure returns (uint8) {
        return 0;
    }

    function description() external pure returns (string memory) {
        return "Mock Sequencer Uptime Feed";
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
