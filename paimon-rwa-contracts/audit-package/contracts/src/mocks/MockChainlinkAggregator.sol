// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockChainlinkAggregator
 * @notice Mock contract for testing Chainlink AggregatorV3Interface
 * @dev Simulates Chainlink price feed behavior for testing purposes
 */
contract MockChainlinkAggregator {
    struct RoundData {
        uint80 roundId;
        int256 answer;
        uint256 startedAt;
        uint256 updatedAt;
        uint80 answeredInRound;
    }

    RoundData private _latestRoundData;
    uint8 private _decimals;
    string private _description;

    bool private _shouldRevert;
    bool private _shouldReturnStaleData;
    bool private _shouldReturnZeroPrice;

    constructor(uint8 decimals_, string memory description_) {
        _decimals = decimals_;
        _description = description_;

        // Initialize with valid data
        _latestRoundData = RoundData({
            roundId: 1,
            answer: 1_00000000, // $1.00 with 8 decimals
            startedAt: block.timestamp,
            updatedAt: block.timestamp,
            answeredInRound: 1
        });
    }

    // ============================================================
    // AGGREGATOR V3 INTERFACE
    // ============================================================

    function decimals() external view returns (uint8) {
        return _decimals;
    }

    function description() external view returns (string memory) {
        return _description;
    }

    function version() external pure returns (uint256) {
        return 3;
    }

    function getRoundData(uint80 _roundId)
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
        require(!_shouldRevert, "Mock: getRoundData reverted");
        return (
            _roundId,
            _latestRoundData.answer,
            _latestRoundData.startedAt,
            _latestRoundData.updatedAt,
            _latestRoundData.answeredInRound
        );
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
        require(!_shouldRevert, "Mock: latestRoundData reverted");

        if (_shouldReturnZeroPrice) {
            return (
                _latestRoundData.roundId,
                0,
                _latestRoundData.startedAt,
                _latestRoundData.updatedAt,
                _latestRoundData.answeredInRound
            );
        }

        if (_shouldReturnStaleData) {
            return (
                _latestRoundData.roundId,
                _latestRoundData.answer,
                _latestRoundData.startedAt,
                block.timestamp - 7200, // 2 hours old
                _latestRoundData.answeredInRound
            );
        }

        return (
            _latestRoundData.roundId,
            _latestRoundData.answer,
            _latestRoundData.startedAt,
            _latestRoundData.updatedAt,
            _latestRoundData.answeredInRound
        );
    }

    // ============================================================
    // TEST HELPERS
    // ============================================================

    function setLatestAnswer(int256 answer) external {
        _latestRoundData.answer = answer;
        _latestRoundData.updatedAt = block.timestamp;
        _latestRoundData.roundId++;
    }

    function setLatestRoundData(
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) external {
        _latestRoundData = RoundData({
            roundId: roundId,
            answer: answer,
            startedAt: startedAt,
            updatedAt: updatedAt,
            answeredInRound: answeredInRound
        });
    }

    function setShouldRevert(bool shouldRevert_) external {
        _shouldRevert = shouldRevert_;
    }

    function setShouldReturnStaleData(bool shouldReturnStale_) external {
        _shouldReturnStaleData = shouldReturnStale_;
    }

    function setShouldReturnZeroPrice(bool shouldReturnZero_) external {
        _shouldReturnZeroPrice = shouldReturnZero_;
    }

    function setUpdatedAt(uint256 timestamp) external {
        _latestRoundData.updatedAt = timestamp;
    }
}
