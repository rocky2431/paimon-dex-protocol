// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../interfaces/AggregatorV3Interface.sol";

/**
 * @title RWAPriceOracle
 * @notice Dual-source RWA price oracle with Chainlink integration
 * @dev Combines Chainlink Price Feeds with Custodian NAV updates
 *
 * Features:
 * - Chainlink Price Feed integration with L2 Sequencer checks
 * - Custodian NAV update mechanism (trusted oracle role)
 * - Dual-source averaging (50% Chainlink, 50% NAV)
 * - Deviation detection (±15% circuit breaker)
 * - Stale price protection (>1h Chainlink, >24h NAV)
 * - Emergency pause mechanism
 *
 * Security:
 * - ReentrancyGuard on state-changing functions
 * - Pausable for emergency stops
 * - Access control for trusted oracle
 * - Price validation (5-step process)
 * - L2 Sequencer Uptime checks
 * - Grace period after sequencer recovery
 *
 * Task: RWA-007 (RWAPriceOracle Contract)
 * Priority: P1
 */
contract RWAPriceOracle is Ownable, ReentrancyGuard, Pausable {
  // ============================================================
  // STATE VARIABLES
  // ============================================================

  /// @notice Chainlink Price Feed address
  address public chainlinkFeed;

  /// @notice L2 Sequencer Uptime Feed address
  address public sequencerUptimeFeed;

  /// @notice Trusted oracle address for NAV updates
  address public trustedOracle;

  /// @notice Latest NAV price (18 decimals)
  uint256 public latestNAV;

  /// @notice Timestamp of last NAV update
  uint256 public navUpdatedAt;

  /// @notice Staleness threshold for Chainlink (1 hour)
  uint256 public constant CHAINLINK_TIMEOUT = 3600;

  /// @notice Staleness threshold for NAV (24 hours)
  uint256 public constant NAV_TIMEOUT = 86400;

  /// @notice Grace period after sequencer recovery (1 hour)
  uint256 public constant GRACE_PERIOD = 3600;

  /// @notice Maximum allowed deviation percentage (15%)
  uint256 public constant MAX_DEVIATION_PERCENT = 15;

  /// @notice Target decimals for internal price format
  uint8 public constant TARGET_DECIMALS = 18;

  // ============================================================
  // EVENTS
  // ============================================================

  event NAVUpdated(uint256 newNAV, uint256 timestamp);
  event TrustedOracleUpdated(address oldOracle, address newOracle);

  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  /**
   * @notice Initialize RWAPriceOracle
   * @param _chainlinkFeed Chainlink Price Feed address
   * @param _sequencerUptimeFeed L2 Sequencer Uptime Feed address
   * @param _trustedOracle Trusted oracle address for NAV updates
   */
  constructor(
    address _chainlinkFeed,
    address _sequencerUptimeFeed,
    address _trustedOracle
  ) Ownable(msg.sender) {
    require(_chainlinkFeed != address(0), "Invalid Chainlink feed");
    require(_sequencerUptimeFeed != address(0), "Invalid sequencer feed");
    require(_trustedOracle != address(0), "Invalid trusted oracle");

    chainlinkFeed = _chainlinkFeed;
    sequencerUptimeFeed = _sequencerUptimeFeed;
    trustedOracle = _trustedOracle;
  }

  // ============================================================
  // EXTERNAL FUNCTIONS
  // ============================================================

  /**
   * @notice Get current price with dual-source logic
   * @dev Returns scaled price in TARGET_DECIMALS (18)
   * @return price Current price in 18 decimals
   */
  function getPrice() external view whenNotPaused returns (uint256 price) {
    // Check L2 Sequencer status
    _checkSequencerUptime();

    // Try to get Chainlink price (may fail)
    (bool chainlinkSuccess, uint256 chainlinkPrice) = _tryGetChainlinkPrice();

    // Check if NAV is fresh (< 24h old)
    bool navFresh = _isNAVFresh();

    // Dual-source logic with fallback
    if (chainlinkSuccess && navFresh && latestNAV > 0) {
      // Both sources available: check circuit breaker, then average
      _checkCircuitBreaker(chainlinkPrice, latestNAV);
      price = (chainlinkPrice + latestNAV) / 2;
    } else if (chainlinkSuccess) {
      // Only Chainlink available (NAV stale or zero)
      price = chainlinkPrice;
    } else if (navFresh && latestNAV > 0) {
      // Only NAV available (Chainlink failed)
      price = latestNAV;
    } else {
      // No valid price source available
      revert("No valid price source available");
    }

    return price;
  }

  /**
   * @notice Get formatted price with decimals
   * @return price Current price
   * @return decimals Number of decimals
   */
  function getFormattedPrice() external view whenNotPaused returns (uint256 price, uint8 decimals) {
    price = this.getPrice();
    decimals = TARGET_DECIMALS;
  }

  /**
   * @notice Update NAV price (trusted oracle only)
   * @param newNAV New NAV price in 18 decimals
   */
  function updateNAV(uint256 newNAV) external nonReentrant {
    require(msg.sender == trustedOracle, "Only trusted oracle");

    latestNAV = newNAV;
    navUpdatedAt = block.timestamp;

    emit NAVUpdated(newNAV, block.timestamp);
  }

  /**
   * @notice Set trusted oracle address (owner only)
   * @param newOracle New trusted oracle address
   */
  function setTrustedOracle(address newOracle) external onlyOwner {
    require(newOracle != address(0), "Invalid oracle address");

    address oldOracle = trustedOracle;
    trustedOracle = newOracle;

    emit TrustedOracleUpdated(oldOracle, newOracle);
  }

  /**
   * @notice Pause oracle (emergency only)
   */
  function pause() external onlyOwner {
    _pause();
  }

  /**
   * @notice Unpause oracle
   */
  function unpause() external onlyOwner {
    _unpause();
  }

  // ============================================================
  // INTERNAL FUNCTIONS
  // ============================================================

  /**
   * @notice Check L2 Sequencer Uptime
   * @dev Reverts if sequencer is down or grace period not over
   */
  function _checkSequencerUptime() internal view {
    AggregatorV3Interface sequencer = AggregatorV3Interface(sequencerUptimeFeed);

    (
      /*uint80 roundId*/,
      int256 answer,
      uint256 startedAt,
      /*uint256 updatedAt*/,
      /*uint80 answeredInRound*/
    ) = sequencer.latestRoundData();

    // answer == 0: Sequencer is up
    // answer == 1: Sequencer is down
    require(answer == 0, "Sequencer is down");

    // Check grace period after sequencer recovery
    uint256 timeSinceUp = block.timestamp - startedAt;
    require(timeSinceUp > GRACE_PERIOD, "Grace period not over");
  }

  /**
   * @notice Try to get Chainlink price (doesn't revert on failure)
   * @return success Whether price retrieval was successful
   * @return price Validated and scaled price (0 if failed)
   */
  function _tryGetChainlinkPrice() internal view returns (bool success, uint256 price) {
    try this._getChainlinkPriceExternal() returns (uint256 _price) {
      return (true, _price);
    } catch {
      return (false, 0);
    }
  }

  /**
   * @notice Get Chainlink price with validation (external for try-catch)
   * @return price Validated and scaled price
   */
  function _getChainlinkPriceExternal() external view returns (uint256 price) {
    require(msg.sender == address(this), "Internal only");
    return _getChainlinkPrice();
  }

  /**
   * @notice Get Chainlink price with validation (internal implementation)
   * @return price Validated and scaled price
   */
  function _getChainlinkPrice() internal view returns (uint256 price) {
    AggregatorV3Interface priceFeed = AggregatorV3Interface(chainlinkFeed);

    (
      uint80 roundId,
      int256 answer,
      /*uint256 startedAt*/,
      uint256 updatedAt,
      /*uint80 answeredInRound*/
    ) = priceFeed.latestRoundData();

    // 5-step price validation (2025 standard)
    require(answer > 0, "Invalid price: answer must be positive");
    require(roundId != 0, "Invalid roundId");
    require(updatedAt != 0, "Invalid updatedAt timestamp");
    require(updatedAt <= block.timestamp, "Invalid updatedAt: future timestamp");
    require(block.timestamp - updatedAt <= CHAINLINK_TIMEOUT, "Stale price data");

    // Scale from feed decimals to TARGET_DECIMALS (18)
    uint8 feedDecimals = priceFeed.decimals();
    if (feedDecimals < TARGET_DECIMALS) {
      price = uint256(answer) * 10**(TARGET_DECIMALS - feedDecimals);
    } else if (feedDecimals > TARGET_DECIMALS) {
      price = uint256(answer) / 10**(feedDecimals - TARGET_DECIMALS);
    } else {
      price = uint256(answer);
    }

    return price;
  }

  /**
   * @notice Check if NAV price is fresh
   * @return True if NAV is fresh (< 24h old)
   */
  function _isNAVFresh() internal view returns (bool) {
    if (navUpdatedAt == 0) {
      return false;
    }
    return (block.timestamp - navUpdatedAt) <= NAV_TIMEOUT;
  }

  /**
   * @notice Check circuit breaker for price deviation
   * @param chainlinkPrice Chainlink price
   * @param navPrice NAV price
   */
  function _checkCircuitBreaker(uint256 chainlinkPrice, uint256 navPrice) internal pure {
    // Calculate absolute deviation percentage
    uint256 diff;
    if (chainlinkPrice > navPrice) {
      diff = chainlinkPrice - navPrice;
    } else {
      diff = navPrice - chainlinkPrice;
    }

    // Use the smaller value as base for percentage calculation
    uint256 base = chainlinkPrice < navPrice ? chainlinkPrice : navPrice;
    uint256 deviationPercent = (diff * 100) / base;

    // Trigger circuit breaker if deviation exceeds threshold
    if (deviationPercent > MAX_DEVIATION_PERCENT) {
      // Note: Cannot emit events from view/pure functions
      // Event removed to maintain view semantics of getPrice()
      revert("Circuit breaker: price deviation exceeds threshold");
    }
  }
}
