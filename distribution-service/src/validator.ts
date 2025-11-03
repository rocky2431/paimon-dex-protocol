import { RewardDistribution, ValidationResult } from './types';

/**
 * RewardValidator validates reward distributions before submission
 */
export class RewardValidator {
  /**
   * Validate a reward distribution
   */
  validate(distribution: RewardDistribution, maxDeviation: number = 0.01): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Check total rewards <= weekly budget
    if (distribution.totalRewards > distribution.weeklyBudget) {
      errors.push(
        `Total rewards (${distribution.totalRewards}) exceed weekly budget (${distribution.weeklyBudget})`
      );
    }

    // 2. Check reward deviation from budget
    const deviation = Number(distribution.weeklyBudget - distribution.totalRewards) /
                      Number(distribution.weeklyBudget);

    if (deviation > maxDeviation) {
      warnings.push(
        `Reward utilization is low: ${((1 - deviation) * 100).toFixed(2)}% ` +
        `(${distribution.totalRewards} / ${distribution.weeklyBudget})`
      );
    }

    // 3. Check for zero rewards
    const zeroRewards = distribution.recipients.filter(r => r.totalReward === 0n);
    if (zeroRewards.length > 0) {
      warnings.push(`${zeroRewards.length} recipients have zero rewards`);
    }

    // 4. Validate Merkle root format
    if (!/^0x[a-fA-F0-9]{64}$/.test(distribution.merkleRoot)) {
      errors.push('Invalid Merkle root format');
    }

    // 5. Check recipient count
    if (distribution.recipients.length === 0) {
      errors.push('No recipients in distribution');
    }

    if (distribution.recipients.length > 2 ** 20) {
      errors.push(`Too many recipients (${distribution.recipients.length}), max is 2^20`);
    }

    // 6. Validate sum of individual rewards equals totalRewards
    let sumRewards = 0n;
    for (const recipient of distribution.recipients) {
      sumRewards += recipient.totalReward;
    }

    if (sumRewards !== distribution.totalRewards) {
      errors.push(
        `Sum of individual rewards (${sumRewards}) does not match totalRewards (${distribution.totalRewards})`
      );
    }

    // 7. Check for duplicate addresses
    const addressSet = new Set<string>();
    const duplicates: string[] = [];
    for (const recipient of distribution.recipients) {
      const lowerAddr = recipient.address.toLowerCase();
      if (addressSet.has(lowerAddr)) {
        duplicates.push(recipient.address);
      }
      addressSet.add(lowerAddr);
    }

    if (duplicates.length > 0) {
      errors.push(`Duplicate addresses found: ${duplicates.join(', ')}`);
    }

    // 8. Validate proofs exist
    const missingProofs = distribution.recipients.filter(r => r.proof.length === 0);
    if (missingProofs.length > 0) {
      errors.push(`${missingProofs.length} recipients have missing proofs`);
    }

    // 9. Check reward breakdown consistency
    for (const recipient of distribution.recipients) {
      let sumBreakdown = recipient.debtReward + recipient.stabilityPoolReward;
      Object.values(recipient.lpRewards).forEach(amount => {
        sumBreakdown += amount;
      });

      if (sumBreakdown !== recipient.totalReward) {
        errors.push(
          `Reward breakdown mismatch for ${recipient.address}: ` +
          `total=${recipient.totalReward}, sum=${sumBreakdown}`
        );
      }
    }

    const valid = errors.length === 0;

    return {
      valid,
      errors,
      warnings,
      summary: {
        totalRewards: distribution.totalRewards,
        weeklyBudget: distribution.weeklyBudget,
        recipientCount: distribution.recipients.length,
        rewardDeviation: deviation
      }
    };
  }

  /**
   * Print validation result to console
   */
  printValidationResult(result: ValidationResult): void {
    console.log('\n========================================');
    console.log('Reward Distribution Validation Result');
    console.log('========================================\n');

    console.log('Summary:');
    console.log(`  Total Rewards: ${result.summary.totalRewards}`);
    console.log(`  Weekly Budget: ${result.summary.weeklyBudget}`);
    console.log(`  Recipient Count: ${result.summary.recipientCount}`);
    console.log(`  Budget Utilization: ${((1 - result.summary.rewardDeviation) * 100).toFixed(2)}%`);
    console.log();

    if (result.errors.length > 0) {
      console.log('❌ Errors:');
      result.errors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error}`);
      });
      console.log();
    }

    if (result.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      result.warnings.forEach((warning, i) => {
        console.log(`  ${i + 1}. ${warning}`);
      });
      console.log();
    }

    if (result.valid) {
      console.log('✅ Validation PASSED - Distribution is ready for submission');
    } else {
      console.log('❌ Validation FAILED - Please fix errors before submission');
    }

    console.log('========================================\n');
  }
}
