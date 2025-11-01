/**
 * Type definitions for Nitro Pool components
 * Nitro 池组件的类型定义
 */

export interface NitroPool {
  id: bigint;
  name: string;
  lpToken: `0x${string}`;
  lockDuration: bigint;
  apr: number;
  active: boolean;
}

export interface NitroPoolListProps {
  pools: NitroPool[];
  showFilter?: boolean;
  theme?: 'light' | 'dark';
  locale?: 'en' | 'zh';
}

export interface NitroPoolCardProps {
  pool: NitroPool;
  onParticipate?: (poolId: bigint) => void;
  locale?: 'en' | 'zh';
}
