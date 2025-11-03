import { StandardMerkleTree } from '@openzeppelin/merkle-tree';
import { ethers } from 'ethers';
import { UserReward, RewardDistribution } from './types';

/**
 * MerkleGenerator generates Merkle trees for reward distribution
 */
export class MerkleGenerator {
  /**
   * Generate reward distribution with Merkle tree
   */
  generateDistribution(
    epoch: number,
    rewards: UserReward[],
    weeklyBudget: bigint
  ): RewardDistribution {
    // Validate inputs
    this.validateRewards(rewards, weeklyBudget);

    // Prepare tree data: [address, amount]
    const treeData: [string, string][] = rewards.map(reward => [
      reward.address,
      reward.totalReward.toString()
    ]);

    // Generate Merkle tree using OpenZeppelin library
    const tree = StandardMerkleTree.of(treeData, ['address', 'uint256']);

    // Get Merkle root
    const merkleRoot = tree.root;

    // Calculate total rewards
    let totalRewards = 0n;
    for (const reward of rewards) {
      totalRewards += reward.totalReward;
    }

    // Generate proofs for each recipient
    const recipients: UserReward[] = rewards.map(reward => {
      const proof = tree.getProof([reward.address, reward.totalReward.toString()]);

      return {
        ...reward,
        proof
      };
    });

    return {
      epoch,
      merkleRoot,
      totalRewards,
      recipients,
      weeklyBudget,
      timestamp: Math.floor(Date.now() / 1000)
    };
  }

  /**
   * Verify a Merkle proof
   */
  verifyProof(
    merkleRoot: string,
    address: string,
    amount: bigint,
    proof: string[]
  ): boolean {
    try {
      return StandardMerkleTree.verify(
        merkleRoot,
        ['address', 'uint256'],
        [address, amount.toString()],
        proof
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate reward data
   */
  private validateRewards(rewards: UserReward[], weeklyBudget: bigint): void {
    // Check for empty rewards
    if (rewards.length === 0) {
      throw new Error('No recipients');
    }

    // Validate addresses and check for duplicates
    const addressSet = new Set<string>();
    let totalRewards = 0n;

    for (const reward of rewards) {
      // Validate address
      if (!ethers.isAddress(reward.address)) {
        throw new Error('Invalid address');
      }

      // Check for duplicates
      if (addressSet.has(reward.address.toLowerCase())) {
        throw new Error('Duplicate address');
      }
      addressSet.add(reward.address.toLowerCase());

      // Accumulate total rewards
      totalRewards += reward.totalReward;
    }

    // Validate total doesn't exceed budget
    if (totalRewards > weeklyBudget) {
      throw new Error('Total rewards exceed weekly budget');
    }
  }
}
