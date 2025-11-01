/**
 * Constants for Nitro Pool components
 * Nitro 池组件的常量
 */

// Time constants
export const SECONDS_PER_DAY = 24 * 60 * 60;

// APR thresholds
export const HIGH_APR_THRESHOLD = 10000; // 100% (basis points)

// Pool constraints (from NitroPool.sol)
export const MIN_LOCK_DURATION = 7 * SECONDS_PER_DAY; // 7 days
export const MAX_LOCK_DURATION = 365 * SECONDS_PER_DAY; // 365 days
export const MAX_REWARD_TOKENS = 10;

// Display constants
export const MAX_VISIBLE_REWARD_TOKENS = 3;
export const POOL_NAME_MAX_LENGTH = 50;

/**
 * Format APR from basis points to percentage
 * 将 APR 从基点转换为百分比
 */
export function formatAPR(aprBps: number): string {
  return (aprBps / 100).toFixed(2);
}

/**
 * Format lock duration from seconds to days
 * 将锁定时长从秒转换为天
 */
export function formatLockDuration(seconds: bigint): number {
  return Number(seconds) / SECONDS_PER_DAY;
}

/**
 * Validate Ethereum address format
 * 验证以太坊地址格式
 */
export function isValidAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address);
}

/**
 * Truncate long text with ellipsis
 * 截断长文本并添加省略号
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Sanitize HTML to prevent XSS
 * 清理 HTML 以防止 XSS
 */
export function sanitizeHTML(text: string): string {
  return text.replace(/[<>]/g, '');
}
