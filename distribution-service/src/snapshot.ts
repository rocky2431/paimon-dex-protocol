import { ethers } from 'ethers';
import { SnapshotConfig, UserSnapshot, EpochSnapshot } from './types';

/**
 * SnapshotFetcher fetches on-chain data for reward distribution
 */
export class SnapshotFetcher {
  private provider: ethers.JsonRpcProvider;
  private config: SnapshotConfig;
  private contracts: {
    usdpVault: ethers.Contract;
    stabilityPool: ethers.Contract;
    lpTokens: ethers.Contract[];
  };

  constructor(config: SnapshotConfig) {
    this.validateConfig(config);
    this.config = config;
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);

    // Initialize contracts
    const vaultAbi = ['function debtOf(address) view returns (uint256)'];
    const erc20Abi = ['function balanceOf(address) view returns (uint256)'];

    this.contracts = {
      usdpVault: new ethers.Contract(config.contracts.usdpVault, vaultAbi, this.provider),
      stabilityPool: new ethers.Contract(config.contracts.stabilityPool, erc20Abi, this.provider),
      lpTokens: config.contracts.lpTokens.map(
        address => new ethers.Contract(address, erc20Abi, this.provider)
      )
    };
  }

  /**
   * Validate configuration
   */
  private validateConfig(config: SnapshotConfig): void {
    if (!ethers.isAddress(config.contracts.usdpVault)) {
      throw new Error('Invalid contract address');
    }
    if (!ethers.isAddress(config.contracts.stabilityPool)) {
      throw new Error('Invalid contract address');
    }
    config.contracts.lpTokens.forEach(address => {
      if (!ethers.isAddress(address)) {
        throw new Error('Invalid contract address');
      }
    });
  }

  /**
   * Fetch current block number
   */
  async fetchCurrentBlock(): Promise<number> {
    try {
      return await this.provider.getBlockNumber();
    } catch (error) {
      throw new Error(`Failed to fetch block number: ${(error as Error).message}`);
    }
  }

  /**
   * Fetch snapshot for a single user at a specific block
   */
  async fetchUserSnapshot(userAddress: string, blockNumber: number): Promise<UserSnapshot> {
    // Validate address
    if (!ethers.isAddress(userAddress)) {
      throw new Error('Invalid address');
    }

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Fetch debt from USDPVault
        const debt = await this.contracts.usdpVault.debtOf(userAddress, { blockTag: blockNumber });

        // Fetch stability pool shares
        const stabilityPoolShares = await this.contracts.stabilityPool.balanceOf(
          userAddress,
          { blockTag: blockNumber }
        );

        // Fetch LP shares for each pool
        const lpShares: Record<string, bigint> = {};
        for (let i = 0; i < this.contracts.lpTokens.length; i++) {
          const lpToken = this.contracts.lpTokens[i];
          const shares = await lpToken.balanceOf(userAddress, { blockTag: blockNumber });
          lpShares[this.config.contracts.lpTokens[i]] = shares;
        }

        // Get block timestamp
        const block = await this.provider.getBlock(blockNumber);
        const timestamp = block?.timestamp || Math.floor(Date.now() / 1000);

        return {
          address: userAddress,
          debt,
          lpShares,
          stabilityPoolShares,
          timestamp
        };
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries - 1) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
        }
      }
    }

    throw lastError || new Error('Unknown error');
  }

  /**
   * Fetch epoch snapshot for multiple users
   */
  async fetchEpochSnapshot(
    epoch: number,
    startBlock: number,
    endBlock: number,
    userAddresses: string[]
  ): Promise<EpochSnapshot> {
    // Validate block range
    if (endBlock < startBlock) {
      throw new Error('Invalid block range');
    }

    // Use endBlock for snapshot (TWAD will be calculated separately)
    const block = await this.provider.getBlock(endBlock);
    const timestamp = block?.timestamp || Math.floor(Date.now() / 1000);

    // Fetch snapshots for all users
    const users: UserSnapshot[] = [];
    let totalDebt = 0n;
    const totalLpShares: Record<string, bigint> = {};
    let totalStabilityPoolShares = 0n;

    // Initialize totalLpShares
    this.config.contracts.lpTokens.forEach(address => {
      totalLpShares[address] = 0n;
    });

    for (const userAddress of userAddresses) {
      const userSnapshot = await this.fetchUserSnapshot(userAddress, endBlock);
      users.push(userSnapshot);

      // Accumulate totals
      totalDebt += userSnapshot.debt;

      Object.entries(userSnapshot.lpShares).forEach(([address, shares]) => {
        totalLpShares[address] = (totalLpShares[address] || 0n) + shares;
      });

      totalStabilityPoolShares += userSnapshot.stabilityPoolShares;

      // Check for overflow
      if (totalDebt < userSnapshot.debt) {
        throw new Error('Overflow');
      }
    }

    return {
      epoch,
      startBlock,
      endBlock,
      timestamp,
      users,
      totalDebt,
      totalLpShares,
      totalStabilityPoolShares
    };
  }
}
