/**
 * Token Type Definitions
 * Token类型定义
 */

/**
 * Token information
 */
export interface Token {
  /** Token address */
  address: `0x${string}`;
  /** Token symbol */
  symbol: string;
  /** Token name */
  name: string;
  /** Decimals */
  decimals: number;
  /** Logo URI */
  icon?: string;
  /** Logo URI (alias for icon, for backward compatibility) */
  logoURI?: string;
}
