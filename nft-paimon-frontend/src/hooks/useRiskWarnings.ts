/**
 * Risk Warnings Hook
 * 风险预警 Hook
 *
 * Purpose: Detect and categorize portfolio risks for user alerts
 * 目的：检测并分类投资组合风险以提醒用户
 *
 * Risk Types:
 * - Liquidation: Health factor or LTV approaching dangerous levels
 * - Expiry: veNFT lock expiration warnings
 * - Rewards: Large unclaimed rewards reminders
 * - Low Health: Health factor below safe thresholds
 *
 * Severity Levels:
 * - high: Immediate action required (liquidation imminent, expires in ≤7 days)
 * - medium: Warning (approaching thresholds, expires in ≤30 days)
 * - low: Info (general reminders, large unclaimed rewards)
 */

import { useMemo } from 'react';
import type { UserPortfolio, VaultPosition, VeNFTPosition } from './useUserPortfolio';

/**
 * Risk Alert interface
 * 风险警告接口
 */
export interface RiskAlert {
  type: 'liquidation' | 'expiry' | 'low_health' | 'rewards';
  severity: 'high' | 'medium' | 'low';
  message: string;
}

/**
 * Risk Warnings Hook
 * 风险预警 Hook
 *
 * @param {UserPortfolio} portfolio - User portfolio data from useUserPortfolio
 * @returns {RiskAlert[]} Array of risk alerts sorted by severity
 *
 * @example
 * ```typescript
 * const portfolio = useUserPortfolio();
 * const warnings = useRiskWarnings(portfolio);
 *
 * warnings.forEach(warning => {
 *   console.log(`[${warning.severity}] ${warning.type}: ${warning.message}`);
 * });
 * ```
 */
export function useRiskWarnings(portfolio: UserPortfolio): RiskAlert[] {
  const riskAlerts = useMemo<RiskAlert[]>(() => {
    const alerts: RiskAlert[] = [];

    // Skip if portfolio is still loading
    if (portfolio.isLoading) {
      return [];
    }

    // ==================== 1. Liquidation Risk Checks ====================

    // Check Vault positions for liquidation risk
    portfolio.vaultPositions.forEach((pos: VaultPosition) => {
      // Health Factor < 1.15 → Critical (liquidation imminent)
      if (pos.healthFactor < 1.15) {
        alerts.push({
          type: 'liquidation',
          severity: 'high',
          message: `${pos.asset} vault position at critical risk - health factor ${pos.healthFactor.toFixed(2)} (liquidation threshold: 1.15)`,
        });
      }
      // Health Factor < 1.2 → Danger (approaching liquidation)
      else if (pos.healthFactor < 1.2) {
        alerts.push({
          type: 'low_health',
          severity: 'high',
          message: `${pos.asset} vault position approaching liquidation - health factor ${pos.healthFactor.toFixed(2)}`,
        });
      }
      // Health Factor < 1.5 → Warning (collateral ratio low)
      else if (pos.healthFactor < 1.5) {
        alerts.push({
          type: 'low_health',
          severity: 'medium',
          message: `${pos.asset} vault position has low collateral ratio - health factor ${pos.healthFactor.toFixed(2)} (recommended: ≥1.5)`,
        });
      }

      // LTV checks (alternative risk indicator)
      // LTV > 80% → High risk
      if (pos.ltv > 80) {
        alerts.push({
          type: 'liquidation',
          severity: 'high',
          message: `${pos.asset} vault position at ${pos.ltv}% LTV - immediate action required`,
        });
      }
      // LTV > 65% → Approaching threshold
      else if (pos.ltv > 65) {
        alerts.push({
          type: 'liquidation',
          severity: 'medium',
          message: `${pos.asset} vault position at ${pos.ltv}% LTV - approaching liquidation threshold`,
        });
      }
    });

    // ==================== 2. veNFT Expiry Warnings ====================

    portfolio.veNFTPositions.forEach((pos: VeNFTPosition) => {
      // Expires in ≤7 days → High severity
      if (pos.remainingDays <= 7) {
        alerts.push({
          type: 'expiry',
          severity: 'high',
          message: `veNFT #${pos.tokenId} expires in ${pos.remainingDays} days - voting power will be lost`,
        });
      }
      // Expires in ≤30 days → Medium severity
      else if (pos.remainingDays <= 30) {
        alerts.push({
          type: 'expiry',
          severity: 'medium',
          message: `veNFT #${pos.tokenId} expires in ${pos.remainingDays} days`,
        });
      }
    });

    // ==================== 3. Large Unclaimed Rewards ====================

    // Check if user has large unclaimed rewards (>$1000)
    const totalRewards = parseFloat(portfolio.totalPendingRewards || '0');
    if (totalRewards > 1000) {
      alerts.push({
        type: 'rewards',
        severity: 'low',
        message: `You have $${totalRewards.toFixed(2)} in unclaimed rewards - consider claiming to compound returns`,
      });
    }

    // ==================== Sort by Severity ====================

    // Sort alerts: high → medium → low
    const severityOrder: Record<RiskAlert['severity'], number> = {
      high: 0,
      medium: 1,
      low: 2,
    };

    return alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }, [
    portfolio.vaultPositions,
    portfolio.veNFTPositions,
    portfolio.totalPendingRewards,
    portfolio.isLoading,
  ]);

  return riskAlerts;
}

/**
 * Helper hook to check if user has any high-severity warnings
 * 检查用户是否有高严重性警告的辅助 Hook
 *
 * @param {UserPortfolio} portfolio - User portfolio data
 * @returns {boolean} True if any high-severity warnings exist
 *
 * @example
 * ```typescript
 * const portfolio = useUserPortfolio();
 * const hasCriticalRisks = useHasCriticalRisks(portfolio);
 *
 * if (hasCriticalRisks) {
 *   // Show urgent notification banner
 * }
 * ```
 */
export function useHasCriticalRisks(portfolio: UserPortfolio): boolean {
  const warnings = useRiskWarnings(portfolio);
  return warnings.some((w) => w.severity === 'high');
}

/**
 * Helper hook to get warning count by severity
 * 按严重性获取警告数量的辅助 Hook
 *
 * @param {UserPortfolio} portfolio - User portfolio data
 * @returns {Record<'high' | 'medium' | 'low', number>} Warning counts by severity
 *
 * @example
 * ```typescript
 * const portfolio = useUserPortfolio();
 * const counts = useRiskWarningCounts(portfolio);
 * // { high: 2, medium: 1, low: 0 }
 * ```
 */
export function useRiskWarningCounts(
  portfolio: UserPortfolio
): Record<'high' | 'medium' | 'low', number> {
  const warnings = useRiskWarnings(portfolio);

  return useMemo(() => {
    const counts = { high: 0, medium: 0, low: 0 };
    warnings.forEach((w) => {
      counts[w.severity]++;
    });
    return counts;
  }, [warnings]);
}
