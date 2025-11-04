// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../core/VotingEscrow.sol";

/**
 * @title IGaugeControllerForBribes
 * @notice Minimal interface for BribeMarketplace to interact with GaugeController
 * @dev Implements Interface Segregation Principle (ISP)
 *
 * Purpose:
 * - Decouple BribeMarketplace from full GaugeController implementation
 * - Only expose methods needed for bribe claim verification
 * - Improve testability (easier to mock)
 * - Reduce compilation dependencies
 *
 * Used by:
 * - BribeMarketplace.claimBribe() for vote verification
 */
interface IGaugeControllerForBribes {
    /**
     * @notice Get VotingEscrow contract address
     * @return VotingEscrow contract for NFT ownership verification
     */
    function votingEscrow() external view returns (VotingEscrow);

    /**
     * @notice Get user's vote details for a veNFT
     * @param tokenId veNFT token ID
     * @return votedGauge Address of gauge user voted for
     * @return voteWeight User's vote weight (voting power * allocation %)
     * @return epoch Epoch when vote was cast
     */
    function getUserVote(uint256 tokenId)
        external
        view
        returns (address votedGauge, uint256 voteWeight, uint256 epoch);

    /**
     * @notice Get total vote weight for a gauge in an epoch
     * @param epoch Target epoch
     * @param gaugeAddress Gauge address
     * @return Total vote weight for gauge in epoch
     */
    function getGaugeWeightByAddress(uint256 epoch, address gaugeAddress) external view returns (uint256);
}
