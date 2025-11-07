/**
 * Navigation Configuration V2 - Flat Structure
 * 导航配置 V2 - 扁平化结构
 *
 * New Structure: Swap | Borrow | Liquidity | Vote | RWA | Portfolio
 * 参考: Velodrome (简洁扁平), Camelot (Portfolio中心)
 *
 * Design Principles:
 * - 扁平化：无下拉菜单，所有Tab在页面内切换
 * - 差异化：RWA独立顶级菜单
 * - 用户导向：按用户行为分类
 */

import { testnet } from './chains/testnet';

export interface NavItem {
  id: string;
  label: string;
  href?: string;
  icon: string;
  badge?: 'NEW' | 'BETA' | 'HOT';
  enabled?: boolean; // Feature flag 控制
  children?: NavItem[];
}

export interface NavColumn {
  id: string;
  label: string;
  icon: string;
  href: string; // V2: All entries have direct links (no dropdown)
  enabled?: boolean;
}

// Feature flags from generated config
const features = {
  psm: !!testnet.tokens.psm,
  vault: !!testnet.tokens.vault,
  stabilityPool: !!testnet.tokens.stabilityPool,
  savings: !!testnet.tokens.savingRate,
  veNFT: !!testnet.tokens.vePaimon,
  gaugeVoting: !!testnet.tokens.gaugeController,
  bribes: !!testnet.tokens.bribeMarketplace,
  boost: !!testnet.tokens.boostStaking,
  nitro: !!testnet.tokens.nitroPool,
  rewards: !!testnet.tokens.rewardDistributor,
  launchpad: !!testnet.tokens.launchpad,
  treasury: !!testnet.tokens.treasury,
  // Phase 2 features (测试网不部署)
  presale: false,
};

/**
 * V2 扁平化导航结构 - 6个核心入口
 * Swap | Borrow | Liquidity | Vote | RWA | Portfolio
 */
export const NAV_COLUMNS: NavColumn[] = [
  // 1. Swap (交易 - PSM + DEX)
  {
    id: 'swap',
    label: 'Swap',
    icon: 'SwapHoriz',
    href: '/swap',
    enabled: features.psm,
  },

  // 2. Borrow (借贷 - Dashboard + Stability Pool)
  // Tabs: Dashboard (Vault + RWA Deposit) | Stability Pool
  {
    id: 'borrow',
    label: 'Borrow',
    icon: 'AccountBalance',
    href: '/borrow',
    enabled: features.vault || features.stabilityPool,
  },

  // 3. Liquidity (流动性 - Pools + My Liquidity)
  // Tabs: Pools (主入口) | My Liquidity
  {
    id: 'liquidity',
    label: 'Liquidity',
    icon: 'Waves',
    href: '/liquidity',
  },

  // 4. Vote (治理 - Vote + Lock + Bribes)
  // Tabs: Vote (主入口) | Lock | Bribes
  {
    id: 'vote',
    label: 'Vote',
    icon: 'HowToVote',
    href: '/vote',
    enabled: features.gaugeVoting || features.veNFT,
  },

  // 5. RWA (RWA Launchpad - 核心差异化)
  {
    id: 'rwa',
    label: 'RWA',
    icon: 'RocketLaunch',
    href: '/rwa',
    enabled: features.launchpad,
  },

  // 6. Portfolio (个人中心 - Overview + Rewards + Savings)
  // Tabs: Overview (仪表板) | Rewards (合并Convert+Boost) | Savings (合并SavingRate)
  {
    id: 'portfolio',
    label: 'Portfolio',
    icon: 'AccountBalanceWallet',
    href: '/portfolio',
  },

  // Phase 2: Presale (测试网隐藏)
  ...(features.presale
    ? [
        {
          id: 'presale',
          label: 'Presale',
          icon: 'LocalActivity',
          href: '/presale',
        } as NavColumn,
      ]
    : []),
];

/**
 * V2: 根据 feature flags 过滤导航项
 * 扁平化结构，无需过滤子项
 */
export function getNavigationColumns(): NavColumn[] {
  return NAV_COLUMNS.filter((column) => {
    // 如果栏目有 enabled 属性且为 false, 跳过
    if (column.enabled === false) {
      return false;
    }
    return true;
  });
}

/**
 * V2: 根据 pathname 获取 active 状态的栏目 ID
 * 新路由映射:
 * - /swap → swap
 * - /borrow, /vault, /stability-pool, /treasury → borrow
 * - /liquidity, /pool, /liquidity/* → liquidity
 * - /vote, /lock, /bribes → vote
 * - /rwa, /launchpad → rwa
 * - /portfolio, /rewards, /convert, /boost, /savings → portfolio
 */
export function getActiveColumn(pathname: string): string {
  // Swap
  if (pathname === '/' || pathname === '/swap') return 'swap';

  // Borrow (合并 Vault + Treasury + Stability Pool)
  if (pathname.startsWith('/borrow')) return 'borrow';
  if (pathname.startsWith('/vault')) return 'borrow';
  if (pathname.startsWith('/stability-pool')) return 'borrow';
  if (pathname.startsWith('/treasury')) return 'borrow';

  // Liquidity
  if (pathname.startsWith('/liquidity')) return 'liquidity';
  if (pathname.startsWith('/pool')) return 'liquidity';

  // Vote (合并 Lock + Bribes)
  if (pathname.startsWith('/vote')) return 'vote';
  if (pathname.startsWith('/lock')) return 'vote';
  if (pathname.startsWith('/bribes')) return 'vote';

  // RWA (原 Launchpad)
  if (pathname.startsWith('/rwa')) return 'rwa';
  if (pathname.startsWith('/launchpad')) return 'rwa';

  // Portfolio (合并 Rewards + Convert + Boost + Savings)
  if (pathname.startsWith('/portfolio')) return 'portfolio';
  if (pathname.startsWith('/rewards')) return 'portfolio';
  if (pathname.startsWith('/convert')) return 'portfolio';
  if (pathname.startsWith('/boost')) return 'portfolio';
  if (pathname.startsWith('/savings')) return 'portfolio';

  // Phase 2: Presale
  if (pathname.startsWith('/presale')) return 'presale';

  return '';
}
