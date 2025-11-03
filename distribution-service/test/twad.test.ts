import { TWADCalculator } from '../src/twad';
import { EpochSnapshot, TWADWeight } from '../src/types';
import { ethers } from 'ethers';

describe('TWADCalculator', () => {
  describe('1. Functional Tests - Weight Calculation', () => {
    it('should calculate equal weights for equal debt', () => {
      const snapshot: EpochSnapshot = {
        epoch: 1,
        startBlock: 990000,
        endBlock: 1000000,
        timestamp: 1700000000,
        users: [
          {
            address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            debt: ethers.parseUnits('1000', 18),
            lpShares: {},
            stabilityPoolShares: 0n,
            timestamp: 1700000000
          },
          {
            address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
            debt: ethers.parseUnits('1000', 18),
            lpShares: {},
            stabilityPoolShares: 0n,
            timestamp: 1700000000
          }
        ],
        totalDebt: ethers.parseUnits('2000', 18),
        totalLpShares: {},
        totalStabilityPoolShares: 0n
      };

      const calculator = new TWADCalculator();
      const weights = calculator.calculateWeights(snapshot);

      expect(weights).toHaveLength(2);
      expect(weights[0].debtWeight).toBeCloseTo(0.5, 5);
      expect(weights[1].debtWeight).toBeCloseTo(0.5, 5);
    });

    it('should calculate proportional weights for different debt amounts', () => {
      const snapshot: EpochSnapshot = {
        epoch: 1,
        startBlock: 990000,
        endBlock: 1000000,
        timestamp: 1700000000,
        users: [
          {
            address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            debt: ethers.parseUnits('3000', 18),
            lpShares: {},
            stabilityPoolShares: 0n,
            timestamp: 1700000000
          },
          {
            address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
            debt: ethers.parseUnits('1000', 18),
            lpShares: {},
            stabilityPoolShares: 0n,
            timestamp: 1700000000
          }
        ],
        totalDebt: ethers.parseUnits('4000', 18),
        totalLpShares: {},
        totalStabilityPoolShares: 0n
      };

      const calculator = new TWADCalculator();
      const weights = calculator.calculateWeights(snapshot);

      expect(weights[0].debtWeight).toBeCloseTo(0.75, 5);
      expect(weights[1].debtWeight).toBeCloseTo(0.25, 5);
    });

    it('should calculate LP weights independently for each pool', () => {
      const lpToken1 = '0x6666666666666666666666666666666666666666';
      const lpToken2 = '0x7777777777777777777777777777777777777777';

      const snapshot: EpochSnapshot = {
        epoch: 1,
        startBlock: 990000,
        endBlock: 1000000,
        timestamp: 1700000000,
        users: [
          {
            address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            debt: 0n,
            lpShares: {
              [lpToken1]: ethers.parseUnits('100', 18),
              [lpToken2]: ethers.parseUnits('200', 18)
            },
            stabilityPoolShares: 0n,
            timestamp: 1700000000
          }
        ],
        totalDebt: 0n,
        totalLpShares: {
          [lpToken1]: ethers.parseUnits('100', 18),
          [lpToken2]: ethers.parseUnits('200', 18)
        },
        totalStabilityPoolShares: 0n
      };

      const calculator = new TWADCalculator();
      const weights = calculator.calculateWeights(snapshot);

      expect(weights[0].lpWeights[lpToken1]).toBeCloseTo(1.0, 5);
      expect(weights[0].lpWeights[lpToken2]).toBeCloseTo(1.0, 5);
    });

    it('should calculate stability pool weights correctly', () => {
      const snapshot: EpochSnapshot = {
        epoch: 1,
        startBlock: 990000,
        endBlock: 1000000,
        timestamp: 1700000000,
        users: [
          {
            address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            debt: 0n,
            lpShares: {},
            stabilityPoolShares: ethers.parseUnits('600', 18),
            timestamp: 1700000000
          },
          {
            address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
            debt: 0n,
            lpShares: {},
            stabilityPoolShares: ethers.parseUnits('400', 18),
            timestamp: 1700000000
          }
        ],
        totalDebt: 0n,
        totalLpShares: {},
        totalStabilityPoolShares: ethers.parseUnits('1000', 18)
      };

      const calculator = new TWADCalculator();
      const weights = calculator.calculateWeights(snapshot);

      expect(weights[0].stabilityPoolWeight).toBeCloseTo(0.6, 5);
      expect(weights[1].stabilityPoolWeight).toBeCloseTo(0.4, 5);
    });
  });

  describe('2. Boundary Tests - Edge Cases', () => {
    it('should handle zero total debt', () => {
      const snapshot: EpochSnapshot = {
        epoch: 1,
        startBlock: 990000,
        endBlock: 1000000,
        timestamp: 1700000000,
        users: [
          {
            address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            debt: 0n,
            lpShares: {},
            stabilityPoolShares: 0n,
            timestamp: 1700000000
          }
        ],
        totalDebt: 0n,
        totalLpShares: {},
        totalStabilityPoolShares: 0n
      };

      const calculator = new TWADCalculator();
      const weights = calculator.calculateWeights(snapshot);

      expect(weights[0].debtWeight).toBe(0);
      expect(weights[0].stabilityPoolWeight).toBe(0);
    });

    it('should handle single user with all weight', () => {
      const snapshot: EpochSnapshot = {
        epoch: 1,
        startBlock: 990000,
        endBlock: 1000000,
        timestamp: 1700000000,
        users: [
          {
            address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            debt: ethers.parseUnits('1000', 18),
            lpShares: {},
            stabilityPoolShares: ethers.parseUnits('500', 18),
            timestamp: 1700000000
          }
        ],
        totalDebt: ethers.parseUnits('1000', 18),
        totalLpShares: {},
        totalStabilityPoolShares: ethers.parseUnits('500', 18)
      };

      const calculator = new TWADCalculator();
      const weights = calculator.calculateWeights(snapshot);

      expect(weights[0].debtWeight).toBeCloseTo(1.0, 5);
      expect(weights[0].stabilityPoolWeight).toBeCloseTo(1.0, 5);
    });

    it('should handle very small debt amounts (precision test)', () => {
      const snapshot: EpochSnapshot = {
        epoch: 1,
        startBlock: 990000,
        endBlock: 1000000,
        timestamp: 1700000000,
        users: [
          {
            address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            debt: 1n, // 1 wei
            lpShares: {},
            stabilityPoolShares: 0n,
            timestamp: 1700000000
          },
          {
            address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
            debt: 2n, // 2 wei
            lpShares: {},
            stabilityPoolShares: 0n,
            timestamp: 1700000000
          }
        ],
        totalDebt: 3n,
        totalLpShares: {},
        totalStabilityPoolShares: 0n
      };

      const calculator = new TWADCalculator();
      const weights = calculator.calculateWeights(snapshot);

      expect(weights[0].debtWeight).toBeCloseTo(1 / 3, 5);
      expect(weights[1].debtWeight).toBeCloseTo(2 / 3, 5);
    });

    it('should handle very large debt amounts', () => {
      const largeDebt = ethers.MaxUint256 / 4n;
      const snapshot: EpochSnapshot = {
        epoch: 1,
        startBlock: 990000,
        endBlock: 1000000,
        timestamp: 1700000000,
        users: [
          {
            address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            debt: largeDebt,
            lpShares: {},
            stabilityPoolShares: 0n,
            timestamp: 1700000000
          },
          {
            address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
            debt: largeDebt,
            lpShares: {},
            stabilityPoolShares: 0n,
            timestamp: 1700000000
          }
        ],
        totalDebt: largeDebt * 2n,
        totalLpShares: {},
        totalStabilityPoolShares: 0n
      };

      const calculator = new TWADCalculator();
      const weights = calculator.calculateWeights(snapshot);

      expect(weights[0].debtWeight).toBeCloseTo(0.5, 5);
      expect(weights[1].debtWeight).toBeCloseTo(0.5, 5);
    });
  });

  describe('3. Exception Tests - Error Handling', () => {
    it('should throw error when total doesn\'t match sum', () => {
      const snapshot: EpochSnapshot = {
        epoch: 1,
        startBlock: 990000,
        endBlock: 1000000,
        timestamp: 1700000000,
        users: [
          {
            address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            debt: ethers.parseUnits('1000', 18),
            lpShares: {},
            stabilityPoolShares: 0n,
            timestamp: 1700000000
          }
        ],
        totalDebt: ethers.parseUnits('2000', 18), // Wrong total
        totalLpShares: {},
        totalStabilityPoolShares: 0n
      };

      const calculator = new TWADCalculator();

      expect(() => calculator.calculateWeights(snapshot))
        .toThrow('Total debt mismatch');
    });

    it('should throw error for negative weights (impossible case)', () => {
      const snapshot: EpochSnapshot = {
        epoch: 1,
        startBlock: 990000,
        endBlock: 1000000,
        timestamp: 1700000000,
        users: [
          {
            address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            debt: -100n as any, // Simulate corruption
            lpShares: {},
            stabilityPoolShares: 0n,
            timestamp: 1700000000
          }
        ],
        totalDebt: 0n,
        totalLpShares: {},
        totalStabilityPoolShares: 0n
      };

      const calculator = new TWADCalculator();

      expect(() => calculator.calculateWeights(snapshot))
        .toThrow('Invalid debt value');
    });
  });

  describe('4. Performance Tests - Calculation Speed', () => {
    it('should calculate weights for 1000 users in under 100ms', () => {
      const users = Array.from({ length: 1000 }, (_, i) => ({
        address: `0x${i.toString().padStart(40, '0')}`,
        debt: ethers.parseUnits('1000', 18),
        lpShares: {},
        stabilityPoolShares: ethers.parseUnits('500', 18),
        timestamp: 1700000000
      }));

      const snapshot: EpochSnapshot = {
        epoch: 1,
        startBlock: 990000,
        endBlock: 1000000,
        timestamp: 1700000000,
        users,
        totalDebt: ethers.parseUnits('1000000', 18),
        totalLpShares: {},
        totalStabilityPoolShares: ethers.parseUnits('500000', 18)
      };

      const calculator = new TWADCalculator();

      const startTime = Date.now();
      const weights = calculator.calculateWeights(snapshot);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100);
      expect(weights).toHaveLength(1000);
    });
  });

  describe('5. Security Tests - Precision & Manipulation', () => {
    it('should maintain precision with decimal.js', () => {
      const snapshot: EpochSnapshot = {
        epoch: 1,
        startBlock: 990000,
        endBlock: 1000000,
        timestamp: 1700000000,
        users: [
          {
            address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            debt: ethers.parseUnits('1', 18) + 1n, // 1.000000000000000001
            lpShares: {},
            stabilityPoolShares: 0n,
            timestamp: 1700000000
          }
        ],
        totalDebt: ethers.parseUnits('1', 18) + 1n,
        totalLpShares: {},
        totalStabilityPoolShares: 0n
      };

      const calculator = new TWADCalculator();
      const weights = calculator.calculateWeights(snapshot);

      expect(weights[0].debtWeight).toBeCloseTo(1.0, 18); // 18 decimal places
    });

    it('should prevent weight sum exceeding 1.0', () => {
      const snapshot: EpochSnapshot = {
        epoch: 1,
        startBlock: 990000,
        endBlock: 1000000,
        timestamp: 1700000000,
        users: Array.from({ length: 100 }, (_, i) => ({
          address: `0x${i.toString().padStart(40, '0')}`,
          debt: ethers.parseUnits('10', 18),
          lpShares: {},
          stabilityPoolShares: 0n,
          timestamp: 1700000000
        })),
        totalDebt: ethers.parseUnits('1000', 18),
        totalLpShares: {},
        totalStabilityPoolShares: 0n
      };

      const calculator = new TWADCalculator();
      const weights = calculator.calculateWeights(snapshot);

      const totalWeight = weights.reduce((sum, w) => sum + w.debtWeight, 0);
      expect(totalWeight).toBeCloseTo(1.0, 10);
      // Allow tiny floating point error (within 1e-10)
      expect(totalWeight).toBeLessThanOrEqual(1.0 + 1e-10);
    });
  });

  describe('6. Compatibility Tests - Integration', () => {
    it('should produce weights compatible with reward allocation', () => {
      const snapshot: EpochSnapshot = {
        epoch: 1,
        startBlock: 990000,
        endBlock: 1000000,
        timestamp: 1700000000,
        users: [
          {
            address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            debt: ethers.parseUnits('600', 18),
            lpShares: {},
            stabilityPoolShares: 0n,
            timestamp: 1700000000
          },
          {
            address: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
            debt: ethers.parseUnits('400', 18),
            lpShares: {},
            stabilityPoolShares: 0n,
            timestamp: 1700000000
          }
        ],
        totalDebt: ethers.parseUnits('1000', 18),
        totalLpShares: {},
        totalStabilityPoolShares: 0n
      };

      const calculator = new TWADCalculator();
      const weights = calculator.calculateWeights(snapshot);

      // Simulate reward allocation
      const weeklyBudget = ethers.parseUnits('10000', 18);
      const reward1 = (weeklyBudget * BigInt(Math.floor(weights[0].debtWeight * 1e18))) / ethers.parseUnits('1', 18);
      const reward2 = (weeklyBudget * BigInt(Math.floor(weights[1].debtWeight * 1e18))) / ethers.parseUnits('1', 18);

      expect(reward1 + reward2).toBeLessThanOrEqual(weeklyBudget);
    });
  });
});
