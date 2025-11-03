import * as dotenv from 'dotenv';
import { SnapshotFetcher } from './snapshot';
import { TWADCalculator } from './twad';
import { MerkleGenerator } from './merkle';
import { OutputFormatter } from './output';
import { RewardValidator } from './validator';
import { SnapshotConfig, UserReward, TWADWeight } from './types';
import { ethers } from 'ethers';

dotenv.config();

/**
 * DistributionOrchestrator coordinates the entire distribution process
 */
export class DistributionOrchestrator {
  private config: SnapshotConfig;
  private snapshotFetcher: SnapshotFetcher;
  private twadCalculator: TWADCalculator;
  private merkleGenerator: MerkleGenerator;
  private outputFormatter: OutputFormatter;
  private validator: RewardValidator;

  constructor() {
    this.config = this.loadConfig();
    this.snapshotFetcher = new SnapshotFetcher(this.config);
    this.twadCalculator = new TWADCalculator();
    this.merkleGenerator = new MerkleGenerator();
    this.outputFormatter = new OutputFormatter(this.config.output.dir);
    this.validator = new RewardValidator();
  }

  /**
   * Load configuration from environment
   */
  private loadConfig(): SnapshotConfig {
    return {
      rpcUrl: process.env.RPC_URL || 'https://bsc-dataseed.binance.org/',
      contracts: {
        usdpVault: process.env.USDP_VAULT_ADDRESS || '',
        stabilityPool: process.env.STABILITY_POOL_ADDRESS || '',
        gaugeController: process.env.GAUGE_CONTROLLER_ADDRESS || '',
        rewardDistributor: process.env.REWARD_DISTRIBUTOR_ADDRESS || '',
        emissionManager: process.env.EMISSION_MANAGER_ADDRESS || '',
        lpTokens: (process.env.LP_TOKEN_ADDRESSES || '').split(',').filter(Boolean)
      },
      snapshot: {
        blockRange: parseInt(process.env.SNAPSHOT_BLOCK_RANGE || '7200'),
        interval: parseInt(process.env.SNAPSHOT_INTERVAL || '604800000')
      },
      merkle: {
        treeHeight: parseInt(process.env.MERKLE_TREE_HEIGHT || '20')
      },
      output: {
        dir: process.env.OUTPUT_DIR || './output',
        snapshotCsv: process.env.SNAPSHOT_OUTPUT_CSV || 'snapshot.csv',
        weightsCsv: process.env.WEIGHTS_OUTPUT_CSV || 'weights.csv',
        rewardsCsv: process.env.REWARDS_OUTPUT_CSV || 'rewards.csv',
        merkleJson: process.env.MERKLE_OUTPUT_JSON || 'merkle.json'
      },
      validation: {
        maxRewardDeviation: parseFloat(process.env.MAX_REWARD_DEVIATION || '0.01')
      }
    };
  }

  /**
   * Execute full distribution cycle
   */
  async execute(epoch: number, userAddresses: string[]): Promise<void> {
    console.log('\n🚀 Starting Distribution Orchestration');
    console.log(`Epoch: ${epoch}`);
    console.log(`Users: ${userAddresses.length}`);
    console.log('====================================\n');

    try {
      // Step 1: Fetch snapshot
      console.log('📸 Step 1: Fetching on-chain snapshot...');
      const currentBlock = await this.snapshotFetcher.fetchCurrentBlock();
      const startBlock = currentBlock - this.config.snapshot.blockRange;
      const endBlock = currentBlock;

      const snapshot = await this.snapshotFetcher.fetchEpochSnapshot(
        epoch,
        startBlock,
        endBlock,
        userAddresses
      );

      console.log(`   ✅ Snapshot complete: ${snapshot.users.length} users`);
      console.log(`   📊 Total Debt: ${snapshot.totalDebt}`);
      console.log(`   📊 Total Stability Pool: ${snapshot.totalStabilityPoolShares}`);

      await this.outputFormatter.writeSnapshotCsv(snapshot, this.config.output.snapshotCsv);

      // Step 2: Calculate TWAD weights
      console.log('\n⚖️  Step 2: Calculating TWAD weights...');
      const weights = this.twadCalculator.calculateWeights(snapshot);

      console.log(`   ✅ Weights calculated for ${weights.length} users`);

      await this.outputFormatter.writeWeightsCsv(weights, this.config.output.weightsCsv);

      // Step 3: Fetch weekly budget from EmissionManager
      console.log('\n💰 Step 3: Fetching weekly budget...');
      const weeklyBudget = await this.fetchWeeklyBudget(epoch);

      console.log(`   ✅ Weekly Budget: ${weeklyBudget}`);

      // Step 4: Allocate rewards
      console.log('\n🎁 Step 4: Allocating rewards...');
      const rewards = this.allocateRewards(weights, weeklyBudget, snapshot);

      console.log(`   ✅ Rewards allocated: ${rewards.length} recipients`);

      // Step 5: Generate Merkle tree
      console.log('\n🌳 Step 5: Generating Merkle tree...');
      const distribution = this.merkleGenerator.generateDistribution(epoch, rewards, weeklyBudget);

      console.log(`   ✅ Merkle Root: ${distribution.merkleRoot}`);
      console.log(`   ✅ Total Rewards: ${distribution.totalRewards}`);

      await this.outputFormatter.writeRewardsCsv(distribution, this.config.output.rewardsCsv);
      await this.outputFormatter.writeMerkleJson(distribution, this.config.output.merkleJson);

      // Step 6: Validate distribution
      console.log('\n✔️  Step 6: Validating distribution...');
      const validationResult = this.validator.validate(
        distribution,
        this.config.validation.maxRewardDeviation
      );

      this.validator.printValidationResult(validationResult);

      if (!validationResult.valid) {
        throw new Error('Distribution validation failed');
      }

      // Step 7: Write summary
      await this.outputFormatter.writeSummary(snapshot, weights, distribution);

      console.log('\n🎉 Distribution orchestration completed successfully!');
      console.log('====================================\n');
    } catch (error) {
      console.error('\n❌ Distribution orchestration failed:', (error as Error).message);
      throw error;
    }
  }

  /**
   * Fetch weekly budget from EmissionManager
   */
  private async fetchWeeklyBudget(epoch: number): Promise<bigint> {
    const provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
    const emissionManagerAbi = ['function getWeeklyBudget(uint256) view returns (uint256)'];
    const emissionManager = new ethers.Contract(
      this.config.contracts.emissionManager,
      emissionManagerAbi,
      provider
    );

    return await emissionManager.getWeeklyBudget(epoch);
  }

  /**
   * Allocate rewards based on weights
   */
  private allocateRewards(
    weights: TWADWeight[],
    weeklyBudget: bigint,
    snapshot: any
  ): UserReward[] {
    // Simple allocation: split budget equally across debt, LP, and stability pool
    // In production, this would be based on gauge weights from GaugeController

    const debtBudget = weeklyBudget * 40n / 100n;  // 40% for debt
    const stabilityBudget = weeklyBudget * 30n / 100n;  // 30% for stability pool
    const lpBudget = weeklyBudget * 30n / 100n;  // 30% for LP

    return weights.map(weight => {
      // Calculate debt reward
      const debtReward = (debtBudget * BigInt(Math.floor(weight.debtWeight * 1e18))) / ethers.parseUnits('1', 18);

      // Calculate stability pool reward
      const stabilityPoolReward = (stabilityBudget * BigInt(Math.floor(weight.stabilityPoolWeight * 1e18))) / ethers.parseUnits('1', 18);

      // Calculate LP rewards (distribute LP budget equally across pools)
      const lpRewards: Record<string, bigint> = {};
      const poolCount = Object.keys(weight.lpWeights).length;
      const lpBudgetPerPool = poolCount > 0 ? lpBudget / BigInt(poolCount) : 0n;

      Object.entries(weight.lpWeights).forEach(([pool, lpWeight]) => {
        lpRewards[pool] = (lpBudgetPerPool * BigInt(Math.floor(lpWeight * 1e18))) / ethers.parseUnits('1', 18);
      });

      // Calculate total
      let totalReward = debtReward + stabilityPoolReward;
      Object.values(lpRewards).forEach(amount => {
        totalReward += amount;
      });

      return {
        address: weight.address,
        totalReward,
        debtReward,
        lpRewards,
        stabilityPoolReward,
        proof: []
      };
    });
  }
}
