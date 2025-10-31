// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/AggregatorV3Interface.sol";

/**
 * @title MockV3Aggregator
 * @notice Mock Chainlink AggregatorV3Interface for testing
 * @dev Based on Chainlink's test helper with additional control methods
 */
contract MockV3Aggregator is AggregatorV3Interface {
  uint8 public decimals;
  int256 public latestAnswer;
  uint256 public latestTimestamp;
  uint256 public latestRound;

  mapping(uint256 => int256) public getAnswer;
  mapping(uint256 => uint256) public getTimestamp;
  mapping(uint256 => uint256) private getStartedAt;

  constructor(uint8 _decimals, int256 _initialAnswer) {
    decimals = _decimals;
    updateAnswer(_initialAnswer);
  }

  /**
   * @notice Update the price answer
   * @param _answer New price value
   */
  function updateAnswer(int256 _answer) public {
    latestAnswer = _answer;
    latestTimestamp = block.timestamp;
    latestRound++;
    getAnswer[latestRound] = _answer;
    getTimestamp[latestRound] = block.timestamp;
    getStartedAt[latestRound] = block.timestamp;
  }

  /**
   * @notice Update round data with full control
   * @param _roundId Round ID
   * @param _answer Price value
   * @param _startedAt Round start timestamp
   * @param _updatedAt Round update timestamp
   * @param _answeredInRound Deprecated (kept for compatibility)
   */
  function updateRoundData(
    uint80 _roundId,
    int256 _answer,
    uint256 _startedAt,
    uint256 _updatedAt,
    uint80 _answeredInRound
  ) public {
    latestRound = _roundId;
    latestAnswer = _answer;
    latestTimestamp = _updatedAt;
    getAnswer[_roundId] = _answer;
    getTimestamp[_roundId] = _updatedAt;
    getStartedAt[_roundId] = _startedAt;
  }

  /**
   * @notice Get latest round data (AggregatorV3Interface)
   * @return roundId Round ID
   * @return answer Price value
   * @return startedAt Round start timestamp
   * @return updatedAt Round update timestamp
   * @return answeredInRound Deprecated (always returns roundId)
   */
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
    return (
      uint80(latestRound),
      latestAnswer,
      getStartedAt[latestRound],
      latestTimestamp,
      uint80(latestRound)
    );
  }

  /**
   * @notice Get specific round data (AggregatorV3Interface)
   * @param _roundId Round ID to query
   */
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
    return (
      _roundId,
      getAnswer[_roundId],
      getStartedAt[_roundId],
      getTimestamp[_roundId],
      _roundId
    );
  }

  /**
   * @notice Get description (AggregatorV3Interface)
   */
  function description() external pure returns (string memory) {
    return "MockV3Aggregator";
  }

  /**
   * @notice Get version (AggregatorV3Interface)
   */
  function version() external pure returns (uint256) {
    return 3;
  }
}
