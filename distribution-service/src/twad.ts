import Decimal from 'decimal.js';
import { EpochSnapshot, TWADWeight } from './types';

/**
 * TWADCalculator calculates Time-Weighted Average Debt weights for reward distribution
 */
export class TWADCalculator {
  /**
   * Calculate weights for all users in a snapshot
   */
  calculateWeights(snapshot: EpochSnapshot): TWADWeight[] {
    // Validate snapshot data integrity
    this.validateSnapshot(snapshot);

    const weights: TWADWeight[] = [];

    for (const user of snapshot.users) {
      // Calculate debt weight
      const debtWeight = this.calculateDebtWeight(user.debt, snapshot.totalDebt);

      // Calculate LP weights for each pool
      const lpWeights: Record<string, number> = {};
      Object.entries(user.lpShares).forEach(([poolAddress, shares]) => {
        const totalShares = snapshot.totalLpShares[poolAddress] || 0n;
        lpWeights[poolAddress] = this.calculateWeight(shares, totalShares);
      });

      // Calculate stability pool weight
      const stabilityPoolWeight = this.calculateWeight(
        user.stabilityPoolShares,
        snapshot.totalStabilityPoolShares
      );

      weights.push({
        address: user.address,
        debtWeight,
        lpWeights,
        stabilityPoolWeight
      });
    }

    // Validate weights sum to 1.0 (or 0 if no activity)
    this.validateWeights(weights, snapshot);

    return weights;
  }

  /**
   * Calculate weight for a single value
   */
  private calculateWeight(userValue: bigint, totalValue: bigint): number {
    if (totalValue === 0n) {
      return 0;
    }

    // Use decimal.js for high precision
    const userDecimal = new Decimal(userValue.toString());
    const totalDecimal = new Decimal(totalValue.toString());

    const weight = userDecimal.div(totalDecimal).toNumber();

    // Ensure weight is between 0 and 1
    if (weight < 0 || weight > 1) {
      throw new Error('Invalid weight calculated');
    }

    return weight;
  }

  /**
   * Calculate debt weight
   */
  private calculateDebtWeight(userDebt: bigint, totalDebt: bigint): number {
    // Validate debt is non-negative
    if (userDebt < 0n) {
      throw new Error('Invalid debt value');
    }

    return this.calculateWeight(userDebt, totalDebt);
  }

  /**
   * Validate snapshot data integrity
   */
  private validateSnapshot(snapshot: EpochSnapshot): void {
    // Check if total debt matches sum of user debts
    let sumDebt = 0n;
    for (const user of snapshot.users) {
      if (user.debt < 0n) {
        throw new Error('Invalid debt value');
      }
      sumDebt += user.debt;
    }

    if (sumDebt !== snapshot.totalDebt) {
      throw new Error('Total debt mismatch');
    }

    // Check if total LP shares match sum of user LP shares
    const sumLpShares: Record<string, bigint> = {};
    for (const user of snapshot.users) {
      Object.entries(user.lpShares).forEach(([poolAddress, shares]) => {
        sumLpShares[poolAddress] = (sumLpShares[poolAddress] || 0n) + shares;
      });
    }

    Object.entries(snapshot.totalLpShares).forEach(([poolAddress, totalShares]) => {
      const sumShares = sumLpShares[poolAddress] || 0n;
      if (sumShares !== totalShares) {
        throw new Error(`Total LP shares mismatch for pool ${poolAddress}`);
      }
    });

    // Check if total stability pool shares match
    let sumStabilityPoolShares = 0n;
    for (const user of snapshot.users) {
      sumStabilityPoolShares += user.stabilityPoolShares;
    }

    if (sumStabilityPoolShares !== snapshot.totalStabilityPoolShares) {
      throw new Error('Total stability pool shares mismatch');
    }
  }

  /**
   * Validate that weights sum correctly
   */
  private validateWeights(weights: TWADWeight[], snapshot: EpochSnapshot): void {
    if (weights.length === 0) {
      return;
    }

    // Validate debt weights sum
    if (snapshot.totalDebt > 0n) {
      const totalDebtWeight = weights.reduce((sum, w) => sum + w.debtWeight, 0);
      if (Math.abs(totalDebtWeight - 1.0) > 1e-10) {
        // Allow small floating point error
        throw new Error('Debt weights do not sum to 1.0');
      }
    }

    // Validate LP weights sum for each pool
    Object.keys(snapshot.totalLpShares).forEach(poolAddress => {
      const totalShares = snapshot.totalLpShares[poolAddress];
      if (totalShares > 0n) {
        const totalLpWeight = weights.reduce(
          (sum, w) => sum + (w.lpWeights[poolAddress] || 0),
          0
        );
        if (Math.abs(totalLpWeight - 1.0) > 1e-10) {
          throw new Error(`LP weights for pool ${poolAddress} do not sum to 1.0`);
        }
      }
    });

    // Validate stability pool weights sum
    if (snapshot.totalStabilityPoolShares > 0n) {
      const totalStabilityWeight = weights.reduce((sum, w) => sum + w.stabilityPoolWeight, 0);
      if (Math.abs(totalStabilityWeight - 1.0) > 1e-10) {
        throw new Error('Stability pool weights do not sum to 1.0');
      }
    }
  }
}
