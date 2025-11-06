// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./VotingEscrow.sol";

/**
 * @title VotingEscrowPaimon (vePAIMON)
 * @notice Lock PAIMON tokens to receive vePAIMON NFT with time-weighted voting power
 * @dev Inherits VotingEscrow base contract, implements veNFT for PAIMON token
 *
 * Key Features:
 * - Lock PAIMON for 1 week to 4 years → receive ERC-721 vePAIMON NFT
 * - Voting power = locked amount × (remaining time / MAXTIME)
 * - Linear decay: power decreases as lock approaches expiry
 * - NFT transferable (ERC-721 standard, not overridden)
 * - Compatible with GaugeController for ve33 governance
 *
 * Differences from Base VotingEscrow:
 * - Binds to PAIMON token (passed via constructor)
 * - NFT name: "Vote-Escrowed PAIMON"
 * - NFT symbol: "vePAIMON"
 *
 * Inherited Functionality:
 * - createLock(): Create new veNFT position
 * - increaseAmount(): Add more PAIMON to existing lock
 * - increaseUnlockTime(): Extend lock duration
 * - withdraw(): Withdraw PAIMON after lock expires
 * - balanceOfNFT(): Query time-weighted voting power
 * - NFT transfers: ERC-721 standard (safeTransferFrom, transferFrom)
 *
 * Lock Mechanics (from base contract):
 * - Min duration: 1 week (MINTIME)
 * - Max duration: 4 years (MAXTIME)
 * - Cannot withdraw before expiry
 * - Can increase amount or extend duration anytime
 * - NFT burned upon withdrawal
 *
 * Voting Power Formula (from base contract):
 * - power = amount × (lockEnd - now) / MAXTIME
 * - 4 year lock: power ≈ amount (100% weight)
 * - 1 year lock: power ≈ amount × 0.25 (25% weight)
 * - 1 week lock: power ≈ amount × 0.0048 (0.48% weight)
 * - Expired lock: power = 0
 *
 * Gas Optimization (inherited):
 * - Storage packing: uint128 amount + uint128 end timestamp
 * - Packed struct saves ≥4200 gas per query (1 SLOAD vs 2)
 *
 * Security (inherited):
 * - ReentrancyGuard on state-changing functions
 * - SafeERC20 for token transfers
 * - Owner validation on all operations
 *
 * GaugeController Compatibility:
 * - balanceOfNFT(tokenId) → query voting power
 * - ownerOf(tokenId) → verify NFT ownership
 * - locked(tokenId) → get lock details (amount, end time)
 * - Epoch-aligned: 7-day cycles (WEEK constant)
 *
 * Example Usage:
 * ```solidity
 * // Lock 1000 PAIMON for 2 years
 * paimon.approve(address(vePaimon), 1000e18);
 * uint256 tokenId = vePaimon.createLock(1000e18, 2 * 365 days);
 *
 * // Query voting power
 * uint256 power = vePaimon.balanceOfNFT(tokenId);
 *
 * // Transfer NFT (voting power transfers with it)
 * vePaimon.transferFrom(alice, bob, tokenId);
 *
 * // After 2 years, withdraw PAIMON
 * vePaimon.withdraw(tokenId); // Burns NFT, returns 1000 PAIMON
 * ```
 */
contract VotingEscrowPaimon is VotingEscrow {
    /**
     * @notice Initialize vePAIMON contract with PAIMON token
     * @param _paimonToken Address of PAIMON token contract
     * @dev Calls VotingEscrow constructor with PAIMON token address
     *      Sets ERC721 name to "Vote-Escrowed PAIMON" and symbol to "vePAIMON"
     */
    constructor(address _paimonToken) VotingEscrow(_paimonToken) {
        // Constructor body intentionally empty
        // All initialization handled by base VotingEscrow constructor
        // Token binding, storage packing, and constants inherited
    }

    /**
     * @notice Override ERC721 name to return vePAIMON-specific name
     * @return NFT name "Vote-Escrowed PAIMON"
     */
    function name() public pure override returns (string memory) {
        return "Vote-Escrowed PAIMON";
    }

    /**
     * @notice Override ERC721 symbol to return vePAIMON-specific symbol
     * @return NFT symbol "vePAIMON"
     */
    function symbol() public pure override returns (string memory) {
        return "vePAIMON";
    }
}
