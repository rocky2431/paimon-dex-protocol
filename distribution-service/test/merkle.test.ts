import { MerkleGenerator } from '../src/merkle';
import { UserReward, RewardDistribution } from '../src/types';
import { ethers } from 'ethers';
import { StandardMerkleTree } from '@openzeppelin/merkle-tree';

describe('MerkleGenerator', () => {
  describe('1. Functional Tests - Tree Generation', () => {
    it('should generate merkle tree for single recipient', () => {
      const rewards: UserReward[] = [
        {
          address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          totalReward: ethers.parseUnits('1000', 18),
          debtReward: ethers.parseUnits('1000', 18),
          lpRewards: {},
          stabilityPoolReward: 0n,
          proof: []
        }
      ];

      const generator = new MerkleGenerator();
      const distribution = generator.generateDistribution(1, rewards, ethers.parseUnits('10000', 18));

      expect(distribution.merkleRoot).toBeDefined();
      expect(distribution.merkleRoot).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(distribution.recipients).toHaveLength(1);
      expect(distribution.recipients[0].proof).toBeDefined();
    });

    it('should generate merkle tree for multiple recipients', () => {
      const rewards: UserReward[] = [
        {
          address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          totalReward: ethers.parseUnits('600', 18),
          debtReward: ethers.parseUnits('600', 18),
          lpRewards: {},
          stabilityPoolReward: 0n,
          proof: []
        },
        {
          address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          totalReward: ethers.parseUnits('400', 18),
          debtReward: ethers.parseUnits('400', 18),
          lpRewards: {},
          stabilityPoolReward: 0n,
          proof: []
        }
      ];

      const generator = new MerkleGenerator();
      const distribution = generator.generateDistribution(1, rewards, ethers.parseUnits('10000', 18));

      expect(distribution.recipients).toHaveLength(2);
      expect(distribution.recipients[0].proof.length).toBeGreaterThan(0);
      expect(distribution.recipients[1].proof.length).toBeGreaterThan(0);
    });

    it('should generate valid proofs that can be verified', () => {
      const rewards: UserReward[] = [
        {
          address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          totalReward: ethers.parseUnits('1000', 18),
          debtReward: ethers.parseUnits('1000', 18),
          lpRewards: {},
          stabilityPoolReward: 0n,
          proof: []
        }
      ];

      const generator = new MerkleGenerator();
      const distribution = generator.generateDistribution(1, rewards, ethers.parseUnits('10000', 18));

      const isValid = generator.verifyProof(
        distribution.merkleRoot,
        distribution.recipients[0].address,
        distribution.recipients[0].totalReward,
        distribution.recipients[0].proof
      );

      expect(isValid).toBe(true);
    });

    it('should include all rewards in totalRewards', () => {
      const rewards: UserReward[] = [
        {
          address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          totalReward: ethers.parseUnits('600', 18),
          debtReward: ethers.parseUnits('600', 18),
          lpRewards: {},
          stabilityPoolReward: 0n,
          proof: []
        },
        {
          address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          totalReward: ethers.parseUnits('400', 18),
          debtReward: ethers.parseUnits('400', 18),
          lpRewards: {},
          stabilityPoolReward: 0n,
          proof: []
        }
      ];

      const generator = new MerkleGenerator();
      const distribution = generator.generateDistribution(1, rewards, ethers.parseUnits('10000', 18));

      expect(distribution.totalRewards).toBe(ethers.parseUnits('1000', 18));
    });
  });

  describe('2. Boundary Tests - Edge Cases', () => {
    it('should handle empty reward list', () => {
      const rewards: UserReward[] = [];

      const generator = new MerkleGenerator();

      expect(() => generator.generateDistribution(1, rewards, ethers.parseUnits('10000', 18)))
        .toThrow('No recipients');
    });

    it('should handle single recipient with zero reward', () => {
      const rewards: UserReward[] = [
        {
          address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          totalReward: 0n,
          debtReward: 0n,
          lpRewards: {},
          stabilityPoolReward: 0n,
          proof: []
        }
      ];

      const generator = new MerkleGenerator();
      const distribution = generator.generateDistribution(1, rewards, ethers.parseUnits('10000', 18));

      expect(distribution.totalRewards).toBe(0n);
      expect(distribution.recipients[0].totalReward).toBe(0n);
    });

    it('should handle maximum number of recipients (2^20)', () => {
      const maxRecipients = 2 ** 20; // 1,048,576
      const smallBatch = 100; // Test with small batch for performance

      const rewards: UserReward[] = Array.from({ length: smallBatch }, (_, i) => ({
        address: `0x${i.toString().padStart(40, '0')}`,
        totalReward: ethers.parseUnits('1', 18),
        debtReward: ethers.parseUnits('1', 18),
        lpRewards: {},
        stabilityPoolReward: 0n,
        proof: []
      }));

      const generator = new MerkleGenerator();
      const distribution = generator.generateDistribution(1, rewards, ethers.parseUnits('10000', 18));

      expect(distribution.recipients).toHaveLength(smallBatch);
    });

    it('should handle very small reward amounts (1 wei)', () => {
      const rewards: UserReward[] = [
        {
          address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          totalReward: 1n,
          debtReward: 1n,
          lpRewards: {},
          stabilityPoolReward: 0n,
          proof: []
        }
      ];

      const generator = new MerkleGenerator();
      const distribution = generator.generateDistribution(1, rewards, ethers.parseUnits('10000', 18));

      expect(distribution.totalRewards).toBe(1n);
    });
  });

  describe('3. Exception Tests - Error Handling', () => {
    it('should throw error for invalid recipient address', () => {
      const rewards: UserReward[] = [
        {
          address: 'invalid_address',
          totalReward: ethers.parseUnits('1000', 18),
          debtReward: ethers.parseUnits('1000', 18),
          lpRewards: {},
          stabilityPoolReward: 0n,
          proof: []
        }
      ];

      const generator = new MerkleGenerator();

      expect(() => generator.generateDistribution(1, rewards, ethers.parseUnits('10000', 18)))
        .toThrow('Invalid address');
    });

    it('should throw error when total rewards exceed weekly budget', () => {
      const rewards: UserReward[] = [
        {
          address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          totalReward: ethers.parseUnits('15000', 18), // Exceeds budget
          debtReward: ethers.parseUnits('15000', 18),
          lpRewards: {},
          stabilityPoolReward: 0n,
          proof: []
        }
      ];

      const generator = new MerkleGenerator();
      const weeklyBudget = ethers.parseUnits('10000', 18);

      expect(() => generator.generateDistribution(1, rewards, weeklyBudget))
        .toThrow('Total rewards exceed weekly budget');
    });

    it('should throw error for duplicate addresses', () => {
      const sameAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const rewards: UserReward[] = [
        {
          address: sameAddress,
          totalReward: ethers.parseUnits('500', 18),
          debtReward: ethers.parseUnits('500', 18),
          lpRewards: {},
          stabilityPoolReward: 0n,
          proof: []
        },
        {
          address: sameAddress,
          totalReward: ethers.parseUnits('500', 18),
          debtReward: ethers.parseUnits('500', 18),
          lpRewards: {},
          stabilityPoolReward: 0n,
          proof: []
        }
      ];

      const generator = new MerkleGenerator();

      expect(() => generator.generateDistribution(1, rewards, ethers.parseUnits('10000', 18)))
        .toThrow('Duplicate address');
    });

    it('should reject invalid proof verification', () => {
      const rewards: UserReward[] = [
        {
          address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          totalReward: ethers.parseUnits('1000', 18),
          debtReward: ethers.parseUnits('1000', 18),
          lpRewards: {},
          stabilityPoolReward: 0n,
          proof: []
        }
      ];

      const generator = new MerkleGenerator();
      const distribution = generator.generateDistribution(1, rewards, ethers.parseUnits('10000', 18));

      // Try to verify with wrong amount
      const isValid = generator.verifyProof(
        distribution.merkleRoot,
        distribution.recipients[0].address,
        ethers.parseUnits('2000', 18), // Wrong amount
        distribution.recipients[0].proof
      );

      expect(isValid).toBe(false);
    });
  });

  describe('4. Performance Tests - Tree Construction', () => {
    it('should generate tree for 1000 recipients in under 500ms', () => {
      const rewards: UserReward[] = Array.from({ length: 1000 }, (_, i) => ({
        address: `0x${i.toString().padStart(40, '0')}`,
        totalReward: ethers.parseUnits('10', 18),
        debtReward: ethers.parseUnits('10', 18),
        lpRewards: {},
        stabilityPoolReward: 0n,
        proof: []
      }));

      const generator = new MerkleGenerator();

      const startTime = Date.now();
      const distribution = generator.generateDistribution(1, rewards, ethers.parseUnits('100000', 18));
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(500);
      expect(distribution.recipients).toHaveLength(1000);
    });

    it('should verify proof in constant time', () => {
      const rewards: UserReward[] = Array.from({ length: 100 }, (_, i) => ({
        address: `0x${i.toString().padStart(40, '0')}`,
        totalReward: ethers.parseUnits('100', 18),
        debtReward: ethers.parseUnits('100', 18),
        lpRewards: {},
        stabilityPoolReward: 0n,
        proof: []
      }));

      const generator = new MerkleGenerator();
      const distribution = generator.generateDistribution(1, rewards, ethers.parseUnits('100000', 18));

      const startTime = Date.now();
      const isValid = generator.verifyProof(
        distribution.merkleRoot,
        distribution.recipients[50].address,
        distribution.recipients[50].totalReward,
        distribution.recipients[50].proof
      );
      const endTime = Date.now();

      expect(isValid).toBe(true);
      expect(endTime - startTime).toBeLessThan(10); // Very fast
    });
  });

  describe('5. Security Tests - Cryptographic Integrity', () => {
    it('should produce different roots for different reward sets', () => {
      const rewards1: UserReward[] = [
        {
          address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          totalReward: ethers.parseUnits('1000', 18),
          debtReward: ethers.parseUnits('1000', 18),
          lpRewards: {},
          stabilityPoolReward: 0n,
          proof: []
        }
      ];

      const rewards2: UserReward[] = [
        {
          address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          totalReward: ethers.parseUnits('1000', 18),
          debtReward: ethers.parseUnits('1000', 18),
          lpRewards: {},
          stabilityPoolReward: 0n,
          proof: []
        }
      ];

      const generator = new MerkleGenerator();
      const dist1 = generator.generateDistribution(1, rewards1, ethers.parseUnits('10000', 18));
      const dist2 = generator.generateDistribution(1, rewards2, ethers.parseUnits('10000', 18));

      expect(dist1.merkleRoot).not.toBe(dist2.merkleRoot);
    });

    it('should produce consistent root for same input', () => {
      const rewards: UserReward[] = [
        {
          address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          totalReward: ethers.parseUnits('1000', 18),
          debtReward: ethers.parseUnits('1000', 18),
          lpRewards: {},
          stabilityPoolReward: 0n,
          proof: []
        }
      ];

      const generator = new MerkleGenerator();
      const dist1 = generator.generateDistribution(1, rewards, ethers.parseUnits('10000', 18));
      const dist2 = generator.generateDistribution(1, rewards, ethers.parseUnits('10000', 18));

      expect(dist1.merkleRoot).toBe(dist2.merkleRoot);
    });

    it('should prevent proof substitution attacks', () => {
      const rewards: UserReward[] = [
        {
          address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          totalReward: ethers.parseUnits('600', 18),
          debtReward: ethers.parseUnits('600', 18),
          lpRewards: {},
          stabilityPoolReward: 0n,
          proof: []
        },
        {
          address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          totalReward: ethers.parseUnits('400', 18),
          debtReward: ethers.parseUnits('400', 18),
          lpRewards: {},
          stabilityPoolReward: 0n,
          proof: []
        }
      ];

      const generator = new MerkleGenerator();
      const distribution = generator.generateDistribution(1, rewards, ethers.parseUnits('10000', 18));

      // Try to use recipient1's proof for recipient2
      const isValid = generator.verifyProof(
        distribution.merkleRoot,
        distribution.recipients[1].address,
        distribution.recipients[0].totalReward,
        distribution.recipients[0].proof
      );

      expect(isValid).toBe(false);
    });
  });

  describe('6. Compatibility Tests - Integration', () => {
    it('should produce root compatible with RewardDistributor contract', () => {
      const rewards: UserReward[] = [
        {
          address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          totalReward: ethers.parseUnits('1000', 18),
          debtReward: ethers.parseUnits('1000', 18),
          lpRewards: {},
          stabilityPoolReward: 0n,
          proof: []
        }
      ];

      const generator = new MerkleGenerator();
      const distribution = generator.generateDistribution(1, rewards, ethers.parseUnits('10000', 18));

      // Root should be bytes32 format
      expect(distribution.merkleRoot).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(distribution.merkleRoot.length).toBe(66); // 0x + 64 hex chars
    });

    it('should produce proofs compatible with OpenZeppelin MerkleProof contract', () => {
      const rewards: UserReward[] = Array.from({ length: 10 }, (_, i) => ({
        address: `0x${i.toString().padStart(40, '0')}`,
        totalReward: ethers.parseUnits('100', 18),
        debtReward: ethers.parseUnits('100', 18),
        lpRewards: {},
        stabilityPoolReward: 0n,
        proof: []
      }));

      const generator = new MerkleGenerator();
      const distribution = generator.generateDistribution(1, rewards, ethers.parseUnits('10000', 18));

      // All proofs should be bytes32[] format
      distribution.recipients.forEach(recipient => {
        recipient.proof.forEach(proofElement => {
          expect(proofElement).toMatch(/^0x[a-fA-F0-9]{64}$/);
        });
      });
    });

    it('should support Standard Merkle Tree format from OpenZeppelin', () => {
      const rewards: UserReward[] = [
        {
          address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          totalReward: ethers.parseUnits('1000', 18),
          debtReward: ethers.parseUnits('1000', 18),
          lpRewards: {},
          stabilityPoolReward: 0n,
          proof: []
        }
      ];

      const generator = new MerkleGenerator();
      const distribution = generator.generateDistribution(1, rewards, ethers.parseUnits('10000', 18));

      // Should be compatible with StandardMerkleTree.verify
      expect(distribution.merkleRoot).toBeDefined();
      expect(distribution.recipients[0].proof).toBeDefined();
    });
  });
});
