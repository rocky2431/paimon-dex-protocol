import { createObjectCsvWriter } from 'csv-writer';
import * as fs from 'fs';
import * as path from 'path';
import { EpochSnapshot, TWADWeight, RewardDistribution } from './types';

/**
 * OutputFormatter handles CSV and JSON output for snapshots, weights, and rewards
 */
export class OutputFormatter {
  private outputDir: string;

  constructor(outputDir: string) {
    this.outputDir = outputDir;
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  /**
   * Write epoch snapshot to CSV
   */
  async writeSnapshotCsv(snapshot: EpochSnapshot, filename: string): Promise<void> {
    const csvPath = path.join(this.outputDir, filename);

    const csvWriter = createObjectCsvWriter({
      path: csvPath,
      header: [
        { id: 'address', title: 'Address' },
        { id: 'debt', title: 'Debt' },
        { id: 'stabilityPoolShares', title: 'Stability Pool Shares' },
        ...snapshot.users[0]
          ? Object.keys(snapshot.users[0].lpShares).map((poolAddress, i) => ({
              id: `lp_${poolAddress}`,
              title: `LP Pool ${i + 1} (${poolAddress})`
            }))
          : [],
        { id: 'timestamp', title: 'Timestamp' }
      ]
    });

    const records = snapshot.users.map(user => {
      const record: any = {
        address: user.address,
        debt: user.debt.toString(),
        stabilityPoolShares: user.stabilityPoolShares.toString(),
        timestamp: new Date(user.timestamp * 1000).toISOString()
      };

      // Add LP shares
      Object.entries(user.lpShares).forEach(([poolAddress, shares]) => {
        record[`lp_${poolAddress}`] = shares.toString();
      });

      return record;
    });

    await csvWriter.writeRecords(records);

    console.log(`✅ Snapshot written to ${csvPath}`);
  }

  /**
   * Write TWAD weights to CSV
   */
  async writeWeightsCsv(weights: TWADWeight[], filename: string): Promise<void> {
    const csvPath = path.join(this.outputDir, filename);

    // Collect all LP pool addresses
    const lpPools = new Set<string>();
    weights.forEach(w => {
      Object.keys(w.lpWeights).forEach(pool => lpPools.add(pool));
    });

    const csvWriter = createObjectCsvWriter({
      path: csvPath,
      header: [
        { id: 'address', title: 'Address' },
        { id: 'debtWeight', title: 'Debt Weight' },
        { id: 'stabilityPoolWeight', title: 'Stability Pool Weight' },
        ...Array.from(lpPools).map((pool, i) => ({
          id: `lp_${pool}`,
          title: `LP Pool ${i + 1} Weight (${pool})`
        }))
      ]
    });

    const records = weights.map(weight => {
      const record: any = {
        address: weight.address,
        debtWeight: weight.debtWeight.toFixed(18),
        stabilityPoolWeight: weight.stabilityPoolWeight.toFixed(18)
      };

      // Add LP weights
      Array.from(lpPools).forEach(pool => {
        record[`lp_${pool}`] = (weight.lpWeights[pool] || 0).toFixed(18);
      });

      return record;
    });

    await csvWriter.writeRecords(records);

    console.log(`✅ Weights written to ${csvPath}`);
  }

  /**
   * Write reward distribution to CSV
   */
  async writeRewardsCsv(distribution: RewardDistribution, filename: string): Promise<void> {
    const csvPath = path.join(this.outputDir, filename);

    // Collect all LP pool addresses
    const lpPools = new Set<string>();
    distribution.recipients.forEach(r => {
      Object.keys(r.lpRewards).forEach(pool => lpPools.add(pool));
    });

    const csvWriter = createObjectCsvWriter({
      path: csvPath,
      header: [
        { id: 'address', title: 'Address' },
        { id: 'totalReward', title: 'Total Reward' },
        { id: 'debtReward', title: 'Debt Reward' },
        { id: 'stabilityPoolReward', title: 'Stability Pool Reward' },
        ...Array.from(lpPools).map((pool, i) => ({
          id: `lp_${pool}`,
          title: `LP Pool ${i + 1} Reward (${pool})`
        })),
        { id: 'proofLength', title: 'Proof Length' }
      ]
    });

    const records = distribution.recipients.map(recipient => {
      const record: any = {
        address: recipient.address,
        totalReward: recipient.totalReward.toString(),
        debtReward: recipient.debtReward.toString(),
        stabilityPoolReward: recipient.stabilityPoolReward.toString(),
        proofLength: recipient.proof.length
      };

      // Add LP rewards
      Array.from(lpPools).forEach(pool => {
        record[`lp_${pool}`] = (recipient.lpRewards[pool] || 0n).toString();
      });

      return record;
    });

    await csvWriter.writeRecords(records);

    console.log(`✅ Rewards written to ${csvPath}`);
  }

  /**
   * Write Merkle distribution to JSON
   */
  async writeMerkleJson(distribution: RewardDistribution, filename: string): Promise<void> {
    const jsonPath = path.join(this.outputDir, filename);

    // Convert BigInt to string for JSON serialization
    const jsonData = {
      epoch: distribution.epoch,
      merkleRoot: distribution.merkleRoot,
      totalRewards: distribution.totalRewards.toString(),
      weeklyBudget: distribution.weeklyBudget.toString(),
      timestamp: distribution.timestamp,
      recipientCount: distribution.recipients.length,
      recipients: distribution.recipients.map(r => ({
        address: r.address,
        totalReward: r.totalReward.toString(),
        debtReward: r.debtReward.toString(),
        lpRewards: Object.entries(r.lpRewards).reduce((acc, [pool, amount]) => {
          acc[pool] = amount.toString();
          return acc;
        }, {} as Record<string, string>),
        stabilityPoolReward: r.stabilityPoolReward.toString(),
        proof: r.proof
      }))
    };

    fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));

    console.log(`✅ Merkle data written to ${jsonPath}`);
  }

  /**
   * Write summary report
   */
  async writeSummary(
    snapshot: EpochSnapshot,
    weights: TWADWeight[],
    distribution: RewardDistribution
  ): Promise<void> {
    const summaryPath = path.join(this.outputDir, 'summary.txt');

    const summary = `
Paimon Distribution Summary
============================

Epoch: ${distribution.epoch}
Block Range: ${snapshot.startBlock} - ${snapshot.endBlock}
Timestamp: ${new Date(distribution.timestamp * 1000).toISOString()}

Snapshot Data:
--------------
Total Recipients: ${snapshot.users.length}
Total Debt: ${snapshot.totalDebt.toString()}
Total Stability Pool Shares: ${snapshot.totalStabilityPoolShares.toString()}

Reward Distribution:
--------------------
Total Rewards: ${distribution.totalRewards.toString()}
Weekly Budget: ${distribution.weeklyBudget.toString()}
Utilization: ${(Number(distribution.totalRewards) / Number(distribution.weeklyBudget) * 100).toFixed(2)}%

Merkle Tree:
------------
Root: ${distribution.merkleRoot}
Max Proof Length: ${Math.max(...distribution.recipients.map(r => r.proof.length))}
Min Proof Length: ${Math.min(...distribution.recipients.map(r => r.proof.length))}

Top 10 Recipients:
------------------
${distribution.recipients
  .sort((a, b) => Number(b.totalReward - a.totalReward))
  .slice(0, 10)
  .map((r, i) => `${i + 1}. ${r.address}: ${r.totalReward.toString()}`)
  .join('\n')}
`;

    fs.writeFileSync(summaryPath, summary);

    console.log(`✅ Summary written to ${summaryPath}`);
  }
}
