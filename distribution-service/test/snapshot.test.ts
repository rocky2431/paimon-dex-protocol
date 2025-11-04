import { SnapshotFetcher } from '../src/snapshot';
import { SnapshotConfig, EpochSnapshot } from '../src/types';
import { ethers } from 'ethers';

// Mock ethers provider and contracts
jest.mock('ethers', () => {
  const actual = jest.requireActual('ethers');
  return {
    ...actual,
    ethers: {
      ...actual.ethers,
      JsonRpcProvider: jest.fn(),
      Contract: jest.fn()
    }
  };
});

describe('SnapshotFetcher', () => {
  let config: SnapshotConfig;
  let mockProvider: any;
  let mockContract: any;

  beforeEach(() => {
    // Setup mock configuration with checksummed addresses
    config = {
      rpcUrl: 'https://bsc-testnet.example.com',
      contracts: {
        usdpVault: '0x1111111111111111111111111111111111111111',
        stabilityPool: '0x2222222222222222222222222222222222222222',
        gaugeController: '0x3333333333333333333333333333333333333333',
        rewardDistributor: '0x4444444444444444444444444444444444444444',
        emissionManager: '0x5555555555555555555555555555555555555555',
        lpTokens: [
          '0x6666666666666666666666666666666666666666',
          '0x7777777777777777777777777777777777777777'
        ]
      },
      snapshot: {
        blockRange: 7200,
        interval: 604800000
      },
      merkle: {
        treeHeight: 20
      },
      output: {
        dir: './output',
        snapshotCsv: 'snapshot.csv',
        weightsCsv: 'weights.csv',
        rewardsCsv: 'rewards.csv',
        merkleJson: 'merkle.json'
      },
      validation: {
        maxRewardDeviation: 0.01
      }
    };

    // Setup mocks
    mockContract = {
      debtOf: jest.fn(),
      balanceOf: jest.fn(),
      totalSupply: jest.fn()
    };

    mockProvider = {
      getBlockNumber: jest.fn().mockResolvedValue(1000000),
      getBlock: jest.fn().mockResolvedValue({ timestamp: 1700000000 })
    };

    (ethers.JsonRpcProvider as any) = jest.fn().mockReturnValue(mockProvider);
    (ethers.Contract as any) = jest.fn().mockReturnValue(mockContract);
  });

  describe('1. Functional Tests - Core Logic', () => {
    it('should fetch snapshot for single user with debt', async () => {
      const fetcher = new SnapshotFetcher(config);
      const userAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

      mockContract.debtOf.mockResolvedValue(ethers.parseUnits('1000', 18));
      mockContract.balanceOf.mockResolvedValue(ethers.parseUnits('500', 18));

      const snapshot = await fetcher.fetchUserSnapshot(userAddress, 1000000);

      expect(snapshot.address).toBe(userAddress);
      expect(snapshot.debt).toBe(ethers.parseUnits('1000', 18));
      expect(snapshot.lpShares).toBeDefined();
      expect(snapshot.stabilityPoolShares).toBeDefined();
    });

    it('should fetch epoch snapshot for multiple users', async () => {
      const fetcher = new SnapshotFetcher(config);
      const users = [
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
      ];

      mockContract.debtOf.mockResolvedValue(ethers.parseUnits('1000', 18));
      mockContract.balanceOf.mockResolvedValue(ethers.parseUnits('500', 18));

      const epochSnapshot = await fetcher.fetchEpochSnapshot(1, 990000, 1000000, users);

      expect(epochSnapshot.epoch).toBe(1);
      expect(epochSnapshot.users).toHaveLength(2);
      expect(epochSnapshot.totalDebt).toBeGreaterThan(0n);
    });

    it('should aggregate LP shares across multiple pools', async () => {
      const fetcher = new SnapshotFetcher(config);
      const userAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

      mockContract.debtOf.mockResolvedValue(0n);
      mockContract.balanceOf
        .mockResolvedValueOnce(ethers.parseUnits('100', 18))  // Pool 1
        .mockResolvedValueOnce(ethers.parseUnits('200', 18)); // Pool 2

      const snapshot = await fetcher.fetchUserSnapshot(userAddress, 1000000);

      const lpAddresses = Object.keys(snapshot.lpShares);
      expect(lpAddresses).toHaveLength(2);
      expect(snapshot.lpShares[config.contracts.lpTokens[0]]).toBe(ethers.parseUnits('100', 18));
      expect(snapshot.lpShares[config.contracts.lpTokens[1]]).toBe(ethers.parseUnits('200', 18));
    });
  });

  describe('2. Boundary Tests - Edge Cases', () => {
    it('should handle user with zero debt', async () => {
      const fetcher = new SnapshotFetcher(config);
      const userAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

      mockContract.debtOf.mockResolvedValue(0n);
      mockContract.balanceOf.mockResolvedValue(0n);

      const snapshot = await fetcher.fetchUserSnapshot(userAddress, 1000000);

      expect(snapshot.debt).toBe(0n);
      expect(snapshot.stabilityPoolShares).toBe(0n);
    });

    it('should handle empty user list', async () => {
      const fetcher = new SnapshotFetcher(config);

      const epochSnapshot = await fetcher.fetchEpochSnapshot(1, 990000, 1000000, []);

      expect(epochSnapshot.users).toHaveLength(0);
      expect(epochSnapshot.totalDebt).toBe(0n);
      expect(epochSnapshot.totalStabilityPoolShares).toBe(0n);
    });

    it('should handle maximum debt value', async () => {
      const fetcher = new SnapshotFetcher(config);
      const userAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      const maxDebt = ethers.MaxUint256 / 2n; // Half of max uint256

      mockContract.debtOf.mockResolvedValue(maxDebt);
      mockContract.balanceOf.mockResolvedValue(0n);

      const snapshot = await fetcher.fetchUserSnapshot(userAddress, 1000000);

      expect(snapshot.debt).toBe(maxDebt);
    });

    it('should handle very small debt amounts', async () => {
      const fetcher = new SnapshotFetcher(config);
      const userAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

      mockContract.debtOf.mockResolvedValue(1n); // 1 wei
      mockContract.balanceOf.mockResolvedValue(0n);

      const snapshot = await fetcher.fetchUserSnapshot(userAddress, 1000000);

      expect(snapshot.debt).toBe(1n);
    });
  });

  describe('3. Exception Tests - Error Handling', () => {
    it('should throw error on invalid RPC connection', async () => {
      mockProvider.getBlockNumber.mockRejectedValue(new Error('Network error'));

      const fetcher = new SnapshotFetcher(config);

      await expect(fetcher.fetchCurrentBlock()).rejects.toThrow('Network error');
    });

    it('should throw error on invalid user address', async () => {
      const fetcher = new SnapshotFetcher(config);
      const invalidAddress = 'not_an_address';

      await expect(fetcher.fetchUserSnapshot(invalidAddress, 1000000))
        .rejects.toThrow('Invalid address');
    });

    it('should throw error when contract call fails', async () => {
      const fetcher = new SnapshotFetcher(config);
      const userAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

      mockContract.debtOf.mockRejectedValue(new Error('Contract reverted'));

      await expect(fetcher.fetchUserSnapshot(userAddress, 1000000))
        .rejects.toThrow('Contract reverted');
    });

    it('should handle timeout gracefully', async () => {
      const fetcher = new SnapshotFetcher(config);
      const userAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

      mockContract.debtOf.mockImplementation(() =>
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 100))
      );

      await expect(fetcher.fetchUserSnapshot(userAddress, 1000000))
        .rejects.toThrow('Timeout');
    });

    it('should retry on transient failures', async () => {
      const fetcher = new SnapshotFetcher(config);
      const userAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

      let callCount = 0;
      mockContract.debtOf.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error('Transient error'));
        }
        return Promise.resolve(ethers.parseUnits('1000', 18));
      });

      const snapshot = await fetcher.fetchUserSnapshot(userAddress, 1000000);

      expect(callCount).toBe(3);
      expect(snapshot.debt).toBe(ethers.parseUnits('1000', 18));
    });
  });

  describe('4. Performance Tests - Gas & Time', () => {
    it('should fetch snapshot in under 2 seconds for 10 users', async () => {
      const fetcher = new SnapshotFetcher(config);
      const users = Array.from({ length: 10 }, (_, i) =>
        `0x${i.toString().padStart(40, '0')}`
      );

      mockContract.debtOf.mockResolvedValue(ethers.parseUnits('1000', 18));
      mockContract.balanceOf.mockResolvedValue(ethers.parseUnits('500', 18));

      const startTime = Date.now();
      await fetcher.fetchEpochSnapshot(1, 990000, 1000000, users);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(2000);
    });

    it('should batch contract calls for efficiency', async () => {
      const fetcher = new SnapshotFetcher(config);
      const users = Array.from({ length: 100 }, (_, i) =>
        `0x${i.toString().padStart(40, '0')}`
      );

      mockContract.debtOf.mockResolvedValue(ethers.parseUnits('1000', 18));
      mockContract.balanceOf.mockResolvedValue(ethers.parseUnits('500', 18));

      await fetcher.fetchEpochSnapshot(1, 990000, 1000000, users);

      // Verify contract calls were batched (exact count depends on implementation)
      const totalCalls = mockContract.debtOf.mock.calls.length;
      expect(totalCalls).toBeLessThanOrEqual(users.length * 1.1); // Allow 10% overhead
    });
  });

  describe('5. Security Tests - Data Integrity', () => {
    it('should validate block range to prevent historical manipulation', async () => {
      const fetcher = new SnapshotFetcher(config);

      await expect(
        fetcher.fetchEpochSnapshot(1, 1000000, 990000, []) // endBlock < startBlock
      ).rejects.toThrow('Invalid block range');
    });

    it('should sanitize user addresses to prevent injection', async () => {
      const fetcher = new SnapshotFetcher(config);
      const maliciousAddress = '<script>alert("xss")</script>';

      await expect(fetcher.fetchUserSnapshot(maliciousAddress, 1000000))
        .rejects.toThrow('Invalid address');
    });

    // Removed: BigInt overflow test
    // JavaScript BigInt does not overflow like Solidity uint256.
    // BigInt can represent arbitrarily large integers, so overflow detection is meaningless.

    it('should verify contract addresses are valid', async () => {
      const invalidConfig = { ...config };
      invalidConfig.contracts.usdpVault = 'invalid_address';

      expect(() => new SnapshotFetcher(invalidConfig))
        .toThrow('Invalid contract address');
    });
  });

  describe('6. Compatibility Tests - Integration', () => {
    it('should work with BSC mainnet RPC', async () => {
      const mainnetConfig = { ...config };
      mainnetConfig.rpcUrl = 'https://bsc-dataseed.binance.org/';

      const fetcher = new SnapshotFetcher(mainnetConfig);

      expect(fetcher).toBeDefined();
      expect(await fetcher.fetchCurrentBlock()).toBeGreaterThan(0);
    });

    it('should work with BSC testnet RPC', async () => {
      const testnetConfig = { ...config };
      testnetConfig.rpcUrl = 'https://data-seed-prebsc-1-s1.binance.org:8545/';

      const fetcher = new SnapshotFetcher(testnetConfig);

      expect(fetcher).toBeDefined();
      expect(await fetcher.fetchCurrentBlock()).toBeGreaterThan(0);
    });

    it('should handle different ERC20 implementations (USDT non-standard)', async () => {
      const fetcher = new SnapshotFetcher(config);
      const userAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

      // Simulate USDT returning boolean instead of void on transfer
      mockContract.balanceOf.mockResolvedValue(ethers.parseUnits('1000', 6)); // USDT has 6 decimals

      const snapshot = await fetcher.fetchUserSnapshot(userAddress, 1000000);

      expect(snapshot.lpShares).toBeDefined();
    });

    it('should support multiple concurrent snapshots', async () => {
      const fetcher = new SnapshotFetcher(config);
      const users1 = ['0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'];
      const users2 = ['0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'];

      mockContract.debtOf.mockResolvedValue(ethers.parseUnits('1000', 18));
      mockContract.balanceOf.mockResolvedValue(ethers.parseUnits('500', 18));

      const [snapshot1, snapshot2] = await Promise.all([
        fetcher.fetchEpochSnapshot(1, 990000, 1000000, users1),
        fetcher.fetchEpochSnapshot(2, 1000000, 1010000, users2)
      ]);

      expect(snapshot1.epoch).toBe(1);
      expect(snapshot2.epoch).toBe(2);
    });
  });
});
