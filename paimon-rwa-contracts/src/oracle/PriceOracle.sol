// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// ============================================================
// INTERFACES
// ============================================================

interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}

interface IPyth {
    struct Price {
        int64 price;
        uint64 conf;
        int32 expo;
        uint256 publishTime;
    }

    function getPrice(bytes32 id) external view returns (Price memory price); // Deprecated
    function getPriceUnsafe(bytes32 id) external view returns (Price memory price);
    function getPriceNoOlderThan(bytes32 id, uint256 age) external view returns (Price memory price);
}

/**
 * @title PriceOracle
 * @notice Dual-oracle price feed with circuit breaker pattern
 * @dev Integrates Chainlink (primary) + Pyth Network (fallback) for BSC deployment
 *
 * Architecture:
 * - Primary: Chainlink (push model, 15min heartbeat, 0.1% deviation)
 * - Fallback: Pyth Network (pull model, <400ms latency)
 * - Circuit Breaker: 5% deviation threshold trips failover
 * - Staleness Check: 1 hour maximum age
 * - Recovery: 30 minute delay after circuit breaker trips
 *
 * Security:
 * - ReentrancyGuard on price reads
 * - Ownable for feed management
 * - Price validation (non-zero, non-negative, non-stale)
 * - Decimal normalization to 8 decimals
 *
 * Gas Optimization:
 * - Immutable Pyth address
 * - Custom errors
 * - Minimal storage per feed
 */
contract PriceOracle is Ownable, ReentrancyGuard {
    // ============================================================
    // TYPES
    // ============================================================

    struct CircuitBreakerState {
        bool isTripped;
        uint256 trippedAt;
    }

    // ============================================================
    // STATE VARIABLES
    // ============================================================

    /// @notice Pyth Network contract
    IPyth public immutable pyth;

    /// @notice Deviation threshold in basis points (500 = 5%)
    uint256 public deviationThreshold;

    /// @notice Staleness threshold in seconds (3600 = 1 hour)
    uint256 public stalenessThreshold;

    /// @notice Recovery delay in seconds (1800 = 30 minutes)
    uint256 public constant RECOVERY_DELAY = 1800;

    /// @notice Price precision (basis points denominator)
    uint256 public constant BASIS_POINTS = 10000;

    /// @notice Target decimal precision (8 decimals)
    uint8 public constant TARGET_DECIMALS = 8;

    /// @notice Mapping from feed ID to Chainlink aggregator address
    mapping(bytes32 => address) public priceFeeds;

    /// @notice Circuit breaker state per feed
    mapping(bytes32 => CircuitBreakerState) public circuitBreakerState;

    // ============================================================
    // EVENTS
    // ============================================================

    event PriceFeedAdded(bytes32 indexed feedId, address indexed aggregator);
    event PriceFeedRemoved(bytes32 indexed feedId);
    event PriceReturned(bytes32 indexed feedId, uint256 price, string source);
    event CircuitBreakerTripped(bytes32 indexed feedId, uint256 chainlinkPrice, uint256 pythPrice);
    event CircuitBreakerRecovered(bytes32 indexed feedId);
    event DeviationThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);

    // ============================================================
    // ERRORS
    // ============================================================

    error InvalidPythAddress();
    error InvalidAggregatorAddress();
    error PriceFeedNotFound();
    error PriceFeedAlreadyExists();
    error InvalidChainlinkPrice();
    error StalePrice();
    error AllOraclesFailed();
    error DeviationTooHigh();

    // ============================================================
    // CONSTRUCTOR
    // ============================================================

    constructor(
        address _pyth,
        uint256 _deviationThreshold,
        uint256 _stalenessThreshold
    ) Ownable(msg.sender) {
        if (_pyth == address(0)) revert InvalidPythAddress();
        pyth = IPyth(_pyth);
        deviationThreshold = _deviationThreshold;
        stalenessThreshold = _stalenessThreshold;
    }

    // ============================================================
    // FEED MANAGEMENT (OWNER ONLY)
    // ============================================================

    /**
     * @notice Add new price feed
     * @param feedId Unique feed identifier (e.g., keccak256("USDC/USD"))
     * @param aggregator Chainlink aggregator address
     */
    function addPriceFeed(bytes32 feedId, address aggregator) external onlyOwner {
        if (priceFeeds[feedId] != address(0)) revert PriceFeedAlreadyExists();
        if (aggregator == address(0)) revert InvalidAggregatorAddress();

        priceFeeds[feedId] = aggregator;
        emit PriceFeedAdded(feedId, aggregator);
    }

    /**
     * @notice Remove price feed
     * @param feedId Feed identifier to remove
     */
    function removePriceFeed(bytes32 feedId) external onlyOwner {
        if (priceFeeds[feedId] == address(0)) revert PriceFeedNotFound();

        delete priceFeeds[feedId];
        delete circuitBreakerState[feedId];
        emit PriceFeedRemoved(feedId);
    }

    /**
     * @notice Update deviation threshold
     * @param newThreshold New threshold in basis points
     */
    function setDeviationThreshold(uint256 newThreshold) external onlyOwner {
        uint256 oldThreshold = deviationThreshold;
        deviationThreshold = newThreshold;
        emit DeviationThresholdUpdated(oldThreshold, newThreshold);
    }

    /**
     * @notice Get price feed address
     * @param feedId Feed identifier
     * @return Chainlink aggregator address (zero if not found)
     */
    function getPriceFeed(bytes32 feedId) external view returns (address) {
        return priceFeeds[feedId];
    }

    // ============================================================
    // PRICE RETRIEVAL
    // ============================================================

    /**
     * @notice Get price from dual-oracle system
     * @param feedId Feed identifier
     * @return price Price normalized to 8 decimals
     * @dev Flow:
     *   1. Try Chainlink (primary)
     *   2. Validate with Pyth (cross-check)
     *   3. If deviation >5% → Use Pyth (trip circuit breaker)
     *   4. If Chainlink fails → Use Pyth directly
     *   5. If both fail → Revert
     */
    function getPrice(bytes32 feedId) external nonReentrant returns (uint256 price) {
        address aggregator = priceFeeds[feedId];
        if (aggregator == address(0)) revert PriceFeedNotFound();

        // Cache storage variables to save gas (avoid multiple SLOADs)
        uint256 cachedStalenessThreshold = stalenessThreshold;
        uint256 cachedDeviationThreshold = deviationThreshold;

        // Check if circuit breaker is tripped
        CircuitBreakerState storage cbState = circuitBreakerState[feedId];

        // Try Chainlink first
        (bool chainlinkSuccess, uint256 chainlinkPrice, , bool isCriticalError) =
            _getChainlinkPrice(aggregator, cachedStalenessThreshold);

        // If Chainlink had a critical error (e.g., negative price), revert immediately
        if (isCriticalError) {
            revert InvalidChainlinkPrice();
        }

        // Try Pyth
        (bool pythSuccess, uint256 pythPrice) = _getPythPrice(feedId, cachedStalenessThreshold);

        // If both failed, revert
        if (!chainlinkSuccess && !pythSuccess) {
            revert AllOraclesFailed();
        }

        // If only Pyth works, use it
        if (!chainlinkSuccess && pythSuccess) {
            emit PriceReturned(feedId, pythPrice, "Pyth");
            return pythPrice;
        }

        // If only Chainlink works, use it (staleness already checked)
        if (chainlinkSuccess && !pythSuccess) {
            emit PriceReturned(feedId, chainlinkPrice, "Chainlink");
            return chainlinkPrice;
        }

        // Both work - validate deviation
        uint256 deviation = _calculateDeviation(chainlinkPrice, pythPrice);

        // Check if circuit breaker should trip (>= threshold, not just >)
        if (deviation >= cachedDeviationThreshold) {
            // Trip circuit breaker
            if (!cbState.isTripped) {
                cbState.isTripped = true;
                cbState.trippedAt = block.timestamp;
                emit CircuitBreakerTripped(feedId, chainlinkPrice, pythPrice);
            }
            // Use Pyth as fallback
            emit PriceReturned(feedId, pythPrice, "Pyth");
            return pythPrice;
        }

        // Prices converged - check recovery
        if (cbState.isTripped) {
            // Check if recovery delay passed
            if (block.timestamp >= cbState.trippedAt + RECOVERY_DELAY) {
                cbState.isTripped = false;
                cbState.trippedAt = 0;
                emit CircuitBreakerRecovered(feedId);
            }
        }

        // Use Chainlink (primary) - staleness already checked in _getChainlinkPrice
        emit PriceReturned(feedId, chainlinkPrice, "Chainlink");
        return chainlinkPrice;
    }

    // ============================================================
    // INTERNAL HELPERS
    // ============================================================

    /**
     * @notice Get price from Chainlink
     * @param aggregator Chainlink aggregator address
     * @param stalenessThreshold_ Cached staleness threshold
     * @return success Whether fetch succeeded
     * @return price Price normalized to 8 decimals
     * @return updatedAt Last update timestamp
     * @return isCriticalError Whether error requires revert (not just fallback)
     */
    function _getChainlinkPrice(address aggregator, uint256 stalenessThreshold_)
        internal
        view
        returns (bool success, uint256 price, uint256 updatedAt, bool isCriticalError)
    {
        try AggregatorV3Interface(aggregator).latestRoundData() returns (
            uint80 roundId,
            int256 answer,
            uint256 /* startedAt */,
            uint256 updatedAt_,
            uint80 /* answeredInRound */
        ) {
            // Check for negative price - this is a critical error that must revert
            if (answer < 0) {
                return (false, 0, 0, true);
            }

            // Check for zero price, invalid round, future timestamp, or stale data - return false for fallback
            if (answer == 0 || roundId == 0 || updatedAt_ > block.timestamp) {
                return (false, 0, 0, false);
            }

            // Check staleness - if data is too old, fallback to Pyth
            if (block.timestamp - updatedAt_ > stalenessThreshold_) {
                return (false, 0, 0, false);
            }

            // Normalize to 8 decimals
            uint8 decimals = AggregatorV3Interface(aggregator).decimals();
            uint256 normalizedPrice = _normalizePrice(uint256(int256(answer)), decimals);

            return (true, normalizedPrice, updatedAt_, false);
        } catch {
            return (false, 0, 0, false);
        }
    }

    /**
     * @notice Get price from Pyth
     * @param feedId Feed identifier
     * @param stalenessThreshold_ Cached staleness threshold
     * @return success Whether fetch succeeded
     * @return price Price normalized to 8 decimals
     */
    function _getPythPrice(bytes32 feedId, uint256 stalenessThreshold_) internal view returns (bool success, uint256 price) {
        try pyth.getPriceUnsafe(feedId) returns (IPyth.Price memory pythPrice) {
            // Validate price
            if (pythPrice.price <= 0) {
                return (false, 0);
            }

            // Check staleness
            if (block.timestamp > pythPrice.publishTime + stalenessThreshold_) {
                return (false, 0);
            }

            // Check confidence level (< 1% of price)
            // conf and price are both in the same units, so we can compare directly
            uint256 absPrice = pythPrice.price > 0 ? uint256(uint64(pythPrice.price)) : uint256(uint64(-pythPrice.price));
            uint256 maxConfidence = absPrice / 100; // 1% threshold
            if (pythPrice.conf > maxConfidence) {
                return (false, 0); // Price confidence too low
            }

            // Convert Pyth price (int64 with expo) to uint256 with 8 decimals
            // Pyth uses: actualPrice = price * 10^expo
            // We need to convert to 8 decimals format
            uint256 normalizedPrice = _normalizePythPrice(pythPrice.price, pythPrice.expo);

            return (true, normalizedPrice);
        } catch {
            return (false, 0);
        }
    }

    /**
     * @notice Normalize price to 8 decimals
     * @param price Original price
     * @param decimals Original decimals
     * @return Normalized price with 8 decimals
     */
    function _normalizePrice(uint256 price, uint8 decimals) internal pure returns (uint256) {
        if (decimals == TARGET_DECIMALS) {
            return price;
        } else if (decimals < TARGET_DECIMALS) {
            return price * (10 ** (TARGET_DECIMALS - decimals));
        } else {
            return price / (10 ** (decimals - TARGET_DECIMALS));
        }
    }

    /**
     * @notice Normalize Pyth price to 8 decimals
     * @param price Pyth price (int64)
     * @param expo Pyth exponent (int32)
     * @return Normalized price with 8 decimals
     */
    function _normalizePythPrice(int64 price, int32 expo) internal pure returns (uint256) {
        // Convert to uint256
        uint256 absPrice = uint256(int256(price));

        // Pyth expo is negative (e.g., -8 means divide by 10^8)
        // Target is 8 decimals, so if expo is -8, we're already correct
        int32 targetExpo = -8;
        int32 adjustment = targetExpo - expo;

        if (adjustment == 0) {
            return absPrice;
        } else if (adjustment > 0) {
            // Need to multiply
            return absPrice * (10 ** uint256(int256(adjustment)));
        } else {
            // Need to divide
            return absPrice / (10 ** uint256(int256(-adjustment)));
        }
    }

    /**
     * @notice Calculate deviation between Chainlink and Pyth prices
     * @param chainlinkPrice Chainlink price
     * @param pythPrice Pyth price (reference)
     * @return deviation Deviation in basis points (relative to Pyth)
     */
    function _calculateDeviation(uint256 chainlinkPrice, uint256 pythPrice) internal pure returns (uint256) {
        if (chainlinkPrice == 0 || pythPrice == 0) {
            return type(uint256).max; // Max deviation if either price is zero
        }

        uint256 diff = chainlinkPrice > pythPrice ? chainlinkPrice - pythPrice : pythPrice - chainlinkPrice;

        // Check for overflow before multiplication
        // If diff * BASIS_POINTS would overflow, deviation is definitely > threshold
        if (diff > type(uint256).max / BASIS_POINTS) {
            return type(uint256).max; // Massive deviation
        }

        // Use Pyth as reference (denominator) for deviation calculation
        return (diff * BASIS_POINTS) / pythPrice;
    }
}
