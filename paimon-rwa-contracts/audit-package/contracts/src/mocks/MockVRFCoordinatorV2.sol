// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockVRFCoordinatorV2
 * @notice Mock implementation of Chainlink VRF Coordinator V2 for testing
 */
contract MockVRFCoordinatorV2 {
    uint256 private requestIdCounter;
    mapping(uint256 => address) public requestIdToRequester;

    event RandomWordsRequested(
        bytes32 indexed keyHash,
        uint256 requestId,
        uint256 preSeed,
        uint64 indexed subId,
        uint16 minimumRequestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords,
        address indexed sender
    );

    /**
     * @notice Request random words from VRF
     * @dev Mock implementation - just increments requestId
     */
    function requestRandomWords(
        bytes32 keyHash,
        uint64 subId,
        uint16 minimumRequestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords
    ) external returns (uint256 requestId) {
        requestIdCounter++;
        requestId = requestIdCounter;
        requestIdToRequester[requestId] = msg.sender;

        emit RandomWordsRequested(
            keyHash, requestId, 0, subId, minimumRequestConfirmations, callbackGasLimit, numWords, msg.sender
        );

        return requestId;
    }

    /**
     * @notice Fulfill random words request (test helper)
     * @dev Manually trigger callback with specified random values
     */
    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) external {
        address requester = requestIdToRequester[requestId];
        require(requester != address(0), "MockVRF: request not found");

        // Call the callback function on the requester contract
        (bool success,) =
            requester.call(abi.encodeWithSignature("rawFulfillRandomWords(uint256,uint256[])", requestId, randomWords));
        require(success, "MockVRF: callback failed");
    }

    /**
     * @notice Get request ID counter (test helper)
     */
    function getRequestIdCounter() external view returns (uint256) {
        return requestIdCounter;
    }
}
