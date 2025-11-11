/**
 * Custom hook to aggregate user's portfolio across all protocols
 * 聚合用户跨所有协议仓位的自定义 Hook
 *
 * This hook provides a unified view of all user positions including:
 * - Liquidity Pool (LP) positions and pending rewards
 * - USDP Vault collateral and debt positions
 * - veNFT locked positions and voting power
 * - Launchpad investments
 * - USDP Savings principal and interest
 * - Pending rewards across all protocols
 */

import { useMemo } from 'react';
import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { formatUnits } from 'viem';
import { testnet } from '@/config/chains/testnet';
import { VAULT_ABI } from '@/config/contracts/vault';
import { STABILITY_POOL_ABI } from '@/config/contracts/stabilityPool';
import { VEPAIMON_ABI } from '@/config/contracts/vePaimon';
import { DEX_PAIR_ABI } from '@/config/contracts/dexPair';
import { SAVINGRATE_ABI, SAVINGRATE_ADDRESS } from '@/config/contracts/savingRate';
import { useSavingPrincipal, useSavingAccruedInterest } from '@/hooks/useSavingRate';

/**
 * Liquidity Pool position interface
 * LP 仓位接口
 */
export interface LPPosition {
  pool: string; // Pool name (e.g., "USDP/USDC")
  lpToken: `0x${string}`; // LP token address
  liquidity: string; // Total liquidity in USD
  share: string; // User's share percentage
  apr: number; // Current APR
  pendingRewards: string; // Pending rewards in PAIMON
}

/**
 * USDP Vault position interface
 * Vault 仓位接口
 */
export interface VaultPosition {
  asset: string; // Collateral asset name (e.g., "HYD")
  assetAddress: `0x${string}`; // Asset contract address
  collateral: string; // Collateral amount
  collateralValueUSD: string; // Collateral value in USD
  borrowed: string; // Borrowed USDP amount
  ltv: number; // Current LTV ratio (percentage)
  healthFactor: number; // Health factor
  liquidationPrice: string; // Liquidation price
}

/**
 * veNFT position interface
 * veNFT 仓位接口
 */
export interface VeNFTPosition {
  tokenId: bigint; // NFT token ID
  lockedAmount: string; // Locked PAIMON amount
  lockEnd: number; // Lock expiry timestamp
  votingPower: string; // Current voting power
  remainingDays: number; // Days until lock expires
}

/**
 * Launchpad investment interface
 * Launchpad 投资接口
 */
export interface LaunchpadInvestment {
  projectId: bigint; // Project ID
  projectName: string; // Project name
  invested: string; // Amount invested (USDC/USDP)
  tokensReceived: string; // RWA tokens received
  status: 'pending' | 'approved' | 'settled' | 'rejected'; // Investment status
  investmentDate: number; // Investment timestamp
}

/**
 * USDP Savings position interface
 * USDP Savings 仓位接口
 */
export interface SavingsPosition {
  principal: string; // Principal USDP amount
  accruedInterest: string; // Accrued interest
  totalValue: string; // Principal + interest
  currentAPR: number; // Current APR
  depositDate: number; // Deposit timestamp
}

/**
 * User portfolio interface
 * 用户仓位接口
 */
export interface UserPortfolio {
  // LP Positions
  lpPositions: LPPosition[];
  totalLPValue: string; // Total value of all LP positions

  // Vault Positions
  vaultPositions: VaultPosition[];
  totalCollateralValue: string; // Total collateral value
  totalDebt: string; // Total USDP debt
  overallLTV: number; // Overall LTV across all positions

  // veNFT Positions
  veNFTPositions: VeNFTPosition[];
  totalLockedPAIMON: string; // Total locked PAIMON
  totalVotingPower: string; // Total voting power

  // Launchpad Investments
  launchpadInvestments: LaunchpadInvestment[];
  totalInvested: string; // Total amount invested

  // USDP Savings
  savingsPosition: SavingsPosition | null;

  // Aggregated Values
  totalNetWorth: string; // Sum of all position values minus debt
  totalPendingRewards: string; // Sum of all pending rewards

  // Risk Alerts
  riskAlerts: {
    type: 'liquidation' | 'expiry' | 'low_health';
    severity: 'high' | 'medium' | 'low';
    message: string;
  }[];

  // Loading states
  isLoading: boolean;
  isError: boolean;
}

/**
 * Hook to fetch and aggregate user's portfolio across all protocols
 * 获取和聚合用户跨所有协议仓位的 Hook
 *
 * @param {`0x${string}`} userAddress - User wallet address (optional, defaults to connected wallet)
 * @returns {UserPortfolio} Aggregated user portfolio
 *
 * @example
 * ```typescript
 * const portfolio = useUserPortfolio();
 * console.log('Total Net Worth:', portfolio.totalNetWorth);
 * console.log('LP Positions:', portfolio.lpPositions);
 * console.log('Risk Alerts:', portfolio.riskAlerts);
 * ```
 */
export function useUserPortfolio(userAddress?: `0x${string}`): UserPortfolio {
  const { address: connectedAddress } = useAccount();
  const targetAddress = userAddress || connectedAddress;

  // Query Vault debt
  const { data: vaultDebt, isLoading: isLoadingDebt } = useReadContract({
    address: testnet.tokens.vault,
    abi: VAULT_ABI,
    functionName: 'debtOf',
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    },
  });

  // Query Vault health factor
  const { data: healthFactor, isLoading: isLoadingHealth } = useReadContract({
    address: testnet.tokens.vault,
    abi: VAULT_ABI,
    functionName: 'healthFactor',
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    },
  });

  // Query Stability Pool balance
  const { data: stabilityBalance, isLoading: isLoadingStability } = useReadContract({
    address: testnet.tokens.stabilityPool,
    abi: STABILITY_POOL_ABI,
    functionName: 'balanceOf',
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    },
  });

  // Query total voting power for user (sum of all veNFTs)
  // Note: balanceOf returns the count of NFTs owned by user
  const { data: userVotingPower, isLoading: isLoadingVotingPower } = useReadContract({
    address: testnet.tokens.vePaimon,
    abi: VEPAIMON_ABI,
    functionName: 'balanceOf',
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    },
  });

  // Query user LP balances for known pairs
  const knownPairs = [
    { address: testnet.pools.usdpUsdc, name: 'USDP/USDC' },
    { address: testnet.pools.paimonWbnb, name: 'PAIMON/BNB' },
    { address: testnet.pools.hydUsdp, name: 'HYD/USDP' },
  ].filter((pair) => pair.address !== "0x0000000000000000000000000000000000000000");

  const { data: lpBalances, isLoading: isLoadingLPBalances } = useReadContracts({
    contracts: knownPairs.map((pair) => ({
      address: pair.address as `0x${string}`,
      abi: DEX_PAIR_ABI,
      functionName: 'balanceOf',
      args: targetAddress ? [targetAddress] : undefined,
    })),
    query: {
      enabled: !!targetAddress,
    },
  });

  // Query USDP Savings position
  const { data: savingPrincipal } = useSavingPrincipal(targetAddress);
  const { data: accruedInterest } = useSavingAccruedInterest(targetAddress);

  // Query SavingRate APR
  const { data: annualRate } = useReadContract({
    address: SAVINGRATE_ADDRESS,
    abi: SAVINGRATE_ABI,
    functionName: 'annualRate',
  });

  // Query user deposit details (including timestamp)
  const { data: depositDetails } = useReadContract({
    address: SAVINGRATE_ADDRESS,
    abi: SAVINGRATE_ABI,
    functionName: 'deposits',
    args: targetAddress ? [targetAddress] : undefined,
    query: {
      enabled: !!targetAddress,
    },
  });

  // Aggregate loading states
  const isLoading =
    isLoadingDebt ||
    isLoadingHealth ||
    isLoadingStability ||
    isLoadingVotingPower ||
    isLoadingLPBalances;

  // Calculate aggregated portfolio
  const portfolio = useMemo<UserPortfolio>(() => {
    // Vault Positions
    const totalDebt = vaultDebt ? formatUnits(vaultDebt as bigint, 18) : '0.00';
    const health = healthFactor ? Number(healthFactor) / 1e18 : 0;

    // Vault positions - requires querying all possible collateral types
    // TODO Phase 3.2+: Implement multi-collateral position queries
    // Required queries for each collateral type (HYD, USDC, etc.):
    // - Vault.getCollateralBalance(user, collateral) - Get collateral amount
    // - Vault.getCollateralValueUSD(user, collateral) - Get collateral value in USD
    // - Calculate LTV dynamically: (totalDebt / collateralValueUSD) * 100
    // - Calculate liquidation price from collateral, debt, and liquidation threshold
    // Implementation approach:
    // 1. Define supported collateral list [HYD, USDC, ...]
    // 2. Use useReadContracts to batch-query getCollateralBalance for all collaterals
    // 3. Filter non-zero positions
    // 4. For each position, query getCollateralValueUSD
    // 5. Calculate derived metrics (LTV, liquidation price)
    const vaultPositions: VaultPosition[] = [];

    // USDP Savings Position
    const savingsPrincipalValue = savingPrincipal
      ? formatUnits(savingPrincipal as bigint, 18)
      : '0.00';
    const interestValue = accruedInterest
      ? formatUnits(accruedInterest as bigint, 18)
      : '0.00';

    // Calculate APR from contract (annualRate is in basis points, e.g., 230 = 2.3%)
    const currentAPR = annualRate
      ? Number(annualRate) / 100
      : 0;

    // Extract deposit timestamp from deposits() return value
    // deposits returns [principal, accruedInterest, lastAccrualTime]
    const depositTimestamp = depositDetails && Array.isArray(depositDetails) && depositDetails[2]
      ? Number(depositDetails[2]) * 1000 // Convert seconds to milliseconds
      : 0;

    const savingsPosition: SavingsPosition | null =
      parseFloat(savingsPrincipalValue) > 0
        ? {
            principal: savingsPrincipalValue,
            accruedInterest: interestValue,
            totalValue: (
              parseFloat(savingsPrincipalValue) + parseFloat(interestValue)
            ).toFixed(2),
            currentAPR,
            depositDate: depositTimestamp || Date.now(), // Fallback to current time if no deposit data
          }
        : null;

    // LP Positions - process real contract data
    const lpPositions: LPPosition[] = [];
    if (lpBalances) {
      lpBalances.forEach((result, index) => {
        if (result.status === 'success' && result.result) {
          const balance = result.result as bigint;
          const balanceFormatted = formatUnits(balance, 18);

          // Only include positions with non-zero balance
          if (parseFloat(balanceFormatted) > 0) {
            lpPositions.push({
              pool: knownPairs[index].name,
              lpToken: knownPairs[index].address as `0x${string}`,
              liquidity: balanceFormatted,
              share: '0.00', // TODO: Calculate actual share percentage
              apr: 0, // TODO: Calculate APR from GaugeController
              pendingRewards: '0.00', // TODO: Query pending rewards
            });
          }
        }
      });
    }

    // veNFT Positions
    // Note: balanceOf returns count of NFTs, need to query each NFT individually
    // TODO Phase 3.2+: Implement via event indexing or multiple contract calls
    // Required: tokenOfOwnerByIndex(user, i) for each i < balanceOf
    // Then: locked(tokenId) to get amount, end timestamp, voting power
    const veNFTPositions: VeNFTPosition[] = [];
    const nftCount = userVotingPower ? Number(userVotingPower) : 0;
    // Placeholder: would need loop over nftCount and query each NFT

    // Launchpad Investments
    // TODO Phase 3.2+: Implement ProjectRegistry/IssuanceController queries
    // Required contracts: ProjectRegistry, IssuanceController
    // Query: getUserInvestments(address) or iterate over projects
    // Then: getInvestmentDetails(projectId, user)
    const launchpadInvestments: LaunchpadInvestment[] = [];

    // Calculate aggregated values
    const totalCollateralValue = vaultPositions
      .reduce((sum, pos) => sum + parseFloat(pos.collateralValueUSD), 0)
      .toFixed(2);

    const totalLPValue = lpPositions
      .reduce((sum, pos) => sum + parseFloat(pos.liquidity), 0)
      .toFixed(2);

    const totalLockedPAIMON = veNFTPositions
      .reduce((sum, pos) => sum + parseFloat(pos.lockedAmount), 0)
      .toFixed(2);

    const totalVotingPower = userVotingPower
      ? formatUnits(userVotingPower as bigint, 18)
      : '0.00';

    const totalInvested = launchpadInvestments
      .reduce((sum, inv) => sum + parseFloat(inv.invested), 0)
      .toFixed(2);

    const totalPendingRewards = lpPositions
      .reduce((sum, pos) => sum + parseFloat(pos.pendingRewards), 0)
      .toFixed(2);

    // Calculate total net worth
    const netWorth =
      parseFloat(totalCollateralValue) +
      parseFloat(totalLPValue) +
      parseFloat(totalLockedPAIMON) +
      parseFloat(totalInvested) +
      (savingsPosition ? parseFloat(savingsPosition.totalValue) : 0) -
      parseFloat(totalDebt);

    // Generate risk alerts
    const riskAlerts: UserPortfolio['riskAlerts'] = [];

    // Check liquidation risk
    vaultPositions.forEach((pos) => {
      if (pos.ltv > 80) {
        riskAlerts.push({
          type: 'liquidation',
          severity: 'high',
          message: `${pos.asset} vault position at ${pos.ltv}% LTV - immediate action required`,
        });
      } else if (pos.ltv > 65) {
        riskAlerts.push({
          type: 'liquidation',
          severity: 'medium',
          message: `${pos.asset} vault position at ${pos.ltv}% LTV - approaching liquidation threshold`,
        });
      }

      if (pos.healthFactor < 1.2) {
        riskAlerts.push({
          type: 'low_health',
          severity: 'high',
          message: `${pos.asset} vault health factor is ${pos.healthFactor.toFixed(2)} - risk of liquidation`,
        });
      }
    });

    // Check veNFT expiry
    veNFTPositions.forEach((pos) => {
      if (pos.remainingDays <= 7) {
        riskAlerts.push({
          type: 'expiry',
          severity: 'high',
          message: `veNFT #${pos.tokenId} expires in ${pos.remainingDays} days - voting power will be lost`,
        });
      } else if (pos.remainingDays <= 30) {
        riskAlerts.push({
          type: 'expiry',
          severity: 'medium',
          message: `veNFT #${pos.tokenId} expires in ${pos.remainingDays} days`,
        });
      }
    });

    return {
      // LP Positions
      lpPositions,
      totalLPValue,

      // Vault Positions
      vaultPositions,
      totalCollateralValue,
      totalDebt,
      overallLTV: parseFloat(totalDebt) > 0 && parseFloat(totalCollateralValue) > 0
        ? (parseFloat(totalDebt) / parseFloat(totalCollateralValue)) * 100
        : 0,

      // veNFT Positions
      veNFTPositions,
      totalLockedPAIMON,
      totalVotingPower,

      // Launchpad Investments
      launchpadInvestments,
      totalInvested,

      // USDP Savings
      savingsPosition,

      // Aggregated Values
      totalNetWorth: netWorth.toFixed(2),
      totalPendingRewards,

      // Risk Alerts
      riskAlerts,

      // Loading states
      isLoading,
      isError: false,
    };
  }, [
    vaultDebt,
    healthFactor,
    stabilityBalance,
    userVotingPower,
    lpBalances,
    savingPrincipal,
    accruedInterest,
    isLoading,
  ]);

  return portfolio;
}

/**
 * Hook to get specific portfolio metric by key
 * 根据键获取特定仓位指标的 Hook
 *
 * @param {keyof UserPortfolio} key - Portfolio metric key
 * @param {`0x${string}`} userAddress - User wallet address (optional)
 * @returns {any} Specific portfolio metric value
 *
 * @example
 * ```typescript
 * const netWorth = usePortfolioMetric('totalNetWorth');
 * const debt = usePortfolioMetric('totalDebt');
 * ```
 */
export function usePortfolioMetric(
  key: keyof Omit<UserPortfolio, 'isLoading' | 'isError'>,
  userAddress?: `0x${string}`
): any {
  const portfolio = useUserPortfolio(userAddress);
  return portfolio[key];
}

/**
 * Hook to check if user has any positions
 * 检查用户是否有任何仓位的 Hook
 *
 * @param {`0x${string}`} userAddress - User wallet address (optional)
 * @returns {boolean} True if user has any positions
 *
 * @example
 * ```typescript
 * const hasPositions = useHasPositions();
 * if (hasPositions) {
 *   // Show portfolio view
 * } else {
 *   // Show empty state
 * }
 * ```
 */
export function useHasPositions(userAddress?: `0x${string}`): boolean {
  const portfolio = useUserPortfolio(userAddress);

  return (
    portfolio.lpPositions.length > 0 ||
    portfolio.vaultPositions.length > 0 ||
    portfolio.veNFTPositions.length > 0 ||
    portfolio.launchpadInvestments.length > 0 ||
    portfolio.savingsPosition !== null
  );
}
