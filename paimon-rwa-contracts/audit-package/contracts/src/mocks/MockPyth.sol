// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockPyth
 * @notice Mock contract for testing Pyth Network oracle
 * @dev Simulates Pyth Network IPyth interface for testing purposes
 */
contract MockPyth {
    struct Price {
        int64 price;
        uint64 conf;
        int32 expo;
        uint256 publishTime;
    }

    mapping(bytes32 => Price) private _prices;
    uint256 private _updateFee;

    bool private _shouldRevert;
    bool private _shouldReturnStaleData;
    bool private _shouldReturnZeroPrice;
    bool private _shouldRevertOnUpdate;

    constructor() {
        _updateFee = 0.01 ether; // 0.01 BNB update fee
    }

    // ============================================================
    // PYTH INTERFACE
    // ============================================================

    function getPrice(bytes32 id) external view returns (Price memory price) {
        require(!_shouldRevert, "Mock: getPrice reverted");

        if (_shouldReturnZeroPrice) {
            return Price({
                price: 0,
                conf: _prices[id].conf,
                expo: _prices[id].expo,
                publishTime: _prices[id].publishTime
            });
        }

        if (_shouldReturnStaleData) {
            return Price({
                price: _prices[id].price,
                conf: _prices[id].conf,
                expo: _prices[id].expo,
                publishTime: block.timestamp - 7200 // 2 hours old
            });
        }

        price = _prices[id];
        require(price.publishTime != 0, "Price not found");
        return price;
    }

    function getPriceUnsafe(bytes32 id) external view returns (Price memory price) {
        return _prices[id];
    }

    function getPriceNoOlderThan(bytes32 id, uint256 age)
        external
        view
        returns (Price memory price)
    {
        require(!_shouldRevert, "Mock: getPriceNoOlderThan reverted");

        price = _prices[id];
        require(price.publishTime != 0, "Price not found");
        require(block.timestamp - price.publishTime <= age, "Price too old");

        return price;
    }

    function updatePriceFeeds(bytes[] calldata updateData) external payable {
        require(!_shouldRevertOnUpdate, "Mock: updatePriceFeeds reverted");
        require(msg.value >= _updateFee * updateData.length, "Insufficient update fee");

        // Mock: decode and update prices
        // In real Pyth, updateData contains signed price updates
        // For testing, we just accept any update
    }

    function getUpdateFee(bytes[] calldata updateData) external view returns (uint256 feeAmount) {
        return _updateFee * updateData.length;
    }

    // ============================================================
    // TEST HELPERS
    // ============================================================

    function setPrice(
        bytes32 id,
        int64 price,
        uint64 conf,
        int32 expo,
        uint256 publishTime
    ) external {
        _prices[id] = Price({
            price: price,
            conf: conf,
            expo: expo,
            publishTime: publishTime
        });
    }

    function setPriceSimple(bytes32 id, int64 price, int32 expo) external {
        _prices[id] = Price({
            price: price,
            conf: uint64(uint256(int256(price)) / 100), // 1% conf
            expo: expo,
            publishTime: block.timestamp
        });
    }

    function setUpdateFee(uint256 fee) external {
        _updateFee = fee;
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

    function setShouldRevertOnUpdate(bool shouldRevertOnUpdate_) external {
        _shouldRevertOnUpdate = shouldRevertOnUpdate_;
    }

    function setPublishTime(bytes32 id, uint256 publishTime) external {
        _prices[id].publishTime = publishTime;
    }

    // Allow contract to receive ETH
    receive() external payable {}
}
