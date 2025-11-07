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
 * V3 Hub 架构 - 5个核心 Hub + 1个首页
 * Home | Liquidity | USDP | Governance | Discover | Portfolio
 *
 * 参考:
 * - Camelot: 模块化 Hub (Pools/Nitro/Rewards 集中管理)
 * - Velodrome: Tab 切换内容,侧栏固定上下文信息
 */
export const NAV_COLUMNS: NavColumn[] = [
  // 1. Liquidity Hub (流动性中心 - Swap + Pools + My Liquidity + Nitro & Boost)
  // Tabs: Swap | Pools | My Liquidity | Nitro & Boost
  // 核心流程: Swap → Add LP → Stake → Boost → Earn
  {
    id: 'liquidity',
    label: 'Liquidity',
    icon: 'Waves',
    href: '/liquidity',
  },

  // 2. USDP Hub (稳定币中心 - Vault + PSM + Stability + Savings)
  // Tabs: Vault | PSM | Stability | Savings
  // 核心流程: Deposit RWA → Borrow USDP / Swap USDC → Earn Savings / Stability
  {
    id: 'usdp',
    label: 'USDP',
    icon: 'AccountBalance',
    href: '/usdp',
    enabled: features.vault || features.psm || features.stabilityPool || features.savings,
  },

  // 3. Governance Hub (治理中心 - Lock + Vote + Bribes + Rewards)
  // Tabs: Vote | Lock | Bribes | Rewards
  // 核心流程: Lock PAIMON → Vote Gauges → Earn Bribes + Rewards
  {
    id: 'governance',
    label: 'Governance',
    icon: 'HowToVote',
    href: '/governance',
    enabled: features.veNFT || features.gaugeVoting || features.bribes || features.rewards,
  },

  // 4. Discover Hub (探索中心 - Launchpad + Analytics)
  // Tabs: Projects | Analytics
  // 核心流程: Browse RWA → Vote Approve → Participate → Settle
  {
    id: 'discover',
    label: 'Discover',
    icon: 'RocketLaunch',
    href: '/launchpad',
    enabled: features.launchpad,
  },

  // 5. Portfolio (个人中心 - 跨 Hub 聚合视图)
  // Tabs: Overview | Positions | Rewards
  // 核心功能: 资产聚合 + 风险监控 + 一键领取
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
 * V3: 根据 pathname 获取 active 状态的栏目 ID
 * Hub 路由映射:
 * - / → 首页 (不高亮任何 Hub)
 * - /liquidity, /swap, /pool → liquidity
 * - /usdp, /vault, /borrow, /stability-pool, /savings, /treasury → usdp
 * - /governance, /vote, /lock, /bribes, /rewards → governance
 * - /launchpad, /rwa → discover
 * - /portfolio, /convert, /boost → portfolio
 */
export function getActiveColumn(pathname: string): string {
  // 首页不高亮任何 Hub
  if (pathname === '/') return '';

  // Liquidity Hub (合并 Swap + Pools + My Liquidity + Nitro/Boost)
  if (pathname.startsWith('/liquidity')) return 'liquidity';
  if (pathname.startsWith('/swap')) return 'liquidity';
  if (pathname.startsWith('/pool')) return 'liquidity';

  // USDP Hub (合并 Vault + PSM + Stability + Savings)
  if (pathname.startsWith('/usdp')) return 'usdp';
  if (pathname.startsWith('/vault')) return 'usdp';
  if (pathname.startsWith('/borrow')) return 'usdp';
  if (pathname.startsWith('/stability-pool')) return 'usdp';
  if (pathname.startsWith('/savings')) return 'usdp';
  if (pathname.startsWith('/treasury')) return 'usdp';

  // Governance Hub (合并 Lock + Vote + Bribes + Rewards)
  if (pathname.startsWith('/governance')) return 'governance';
  if (pathname.startsWith('/vote')) return 'governance';
  if (pathname.startsWith('/lock')) return 'governance';
  if (pathname.startsWith('/bribes')) return 'governance';
  if (pathname.startsWith('/rewards')) return 'governance';

  // Discover Hub (Launchpad + Analytics)
  if (pathname.startsWith('/launchpad')) return 'discover';
  if (pathname.startsWith('/rwa')) return 'discover';
  if (pathname.startsWith('/analytics')) return 'discover';

  // Portfolio (跨 Hub 聚合视图)
  if (pathname.startsWith('/portfolio')) return 'portfolio';
  if (pathname.startsWith('/convert')) return 'portfolio';
  if (pathname.startsWith('/boost')) return 'portfolio';

  // Phase 2: Presale
  if (pathname.startsWith('/presale')) return 'presale';

  return '';
}
