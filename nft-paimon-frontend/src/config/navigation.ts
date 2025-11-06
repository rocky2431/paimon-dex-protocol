/**
 * Navigation Configuration
 * 导航配置 - 6栏结构
 *
 * Structure: Trade | Earn | Borrow | Governance | Launch | Analytics
 * 参考: Camelot/Velodrome
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
  href?: string; // 如果有直接链接
  items?: NavItem[]; // 下拉菜单项
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
 * 6栏导航结构
 */
export const NAV_COLUMNS: NavColumn[] = [
  // 1. Trade (交易)
  {
    id: 'trade',
    label: 'Trade',
    icon: 'SwapHoriz',
    items: [
      {
        id: 'swap',
        label: 'Swap',
        href: '/',
        icon: 'SwapHoriz',
        enabled: features.psm,
      },
      {
        id: 'convert',
        label: 'Convert esPaimon',
        href: '/convert',
        icon: 'SwapVert',
        enabled: features.veNFT,
      },
      {
        id: 'liquidity',
        label: 'Liquidity',
        icon: 'Waves',
        children: [
          {
            id: 'liquidity-add',
            label: 'Add',
            href: '/liquidity/add',
            icon: 'AddCircle',
          },
          {
            id: 'liquidity-remove',
            label: 'Remove',
            href: '/liquidity/remove',
            icon: 'RemoveCircle',
          },
          {
            id: 'liquidity-stake',
            label: 'Stake LP',
            href: '/liquidity/stake',
            icon: 'Lock',
          },
        ],
      },
    ],
  },

  // 2. Earn (赚取)
  {
    id: 'earn',
    label: 'Earn',
    icon: 'TrendingUp',
    items: [
      {
        id: 'savings',
        label: 'Savings',
        href: '/savings',
        icon: 'Savings',
        enabled: features.savings,
      },
      {
        id: 'boost',
        label: 'Boost Staking',
        href: '/boost',
        icon: 'Bolt',
        enabled: features.boost,
        badge: 'HOT',
      },
      {
        id: 'nitro',
        label: 'Nitro Pools',
        href: '/nitro',
        icon: 'Rocket',
        enabled: features.nitro,
      },
      {
        id: 'rewards',
        label: 'Claim Rewards',
        href: '/rewards',
        icon: 'CardGiftcard',
        enabled: features.rewards,
      },
    ],
  },

  // 3. Borrow (借贷 - 合并 Vault + Treasury + Stability Pool)
  {
    id: 'borrow',
    label: 'Borrow',
    icon: 'AccountBalance',
    items: [
      {
        id: 'vault',
        label: 'Vault Dashboard',
        href: '/vault',
        icon: 'Dashboard',
        enabled: features.vault,
      },
      {
        id: 'borrow',
        label: 'Borrow USDP',
        href: '/vault/borrow',
        icon: 'CreditCard',
        enabled: features.vault,
      },
      {
        id: 'repay',
        label: 'Repay USDP',
        href: '/vault/repay',
        icon: 'Payment',
        enabled: features.vault,
      },
      {
        id: 'stability-pool',
        label: 'Stability Pool',
        href: '/stability-pool',
        icon: 'Shield',
        enabled: features.stabilityPool,
      },
      {
        id: 'treasury',
        label: 'Treasury (RWA)',
        icon: 'Vault',
        enabled: features.treasury,
        children: [
          {
            id: 'treasury-overview',
            label: 'Overview',
            href: '/treasury',
            icon: 'Dashboard',
          },
          {
            id: 'treasury-deposit',
            label: 'Deposit RWA',
            href: '/treasury/deposit',
            icon: 'Upload',
          },
          {
            id: 'treasury-positions',
            label: 'My Positions',
            href: '/treasury/positions',
            icon: 'ListAlt',
          },
        ],
      },
    ],
  },

  // 4. Governance (治理)
  {
    id: 'governance',
    label: 'Governance',
    icon: 'HowToVote',
    items: [
      {
        id: 'lock',
        label: 'Lock PAIMON',
        href: '/lock',
        icon: 'Lock',
        enabled: features.veNFT,
      },
      {
        id: 'vote',
        label: 'Vote on Gauges',
        href: '/vote',
        icon: 'HowToVote',
        enabled: features.gaugeVoting,
      },
      {
        id: 'bribes',
        label: 'Bribes Market',
        href: '/bribes',
        icon: 'AttachMoney',
        enabled: features.bribes,
      },
    ],
  },

  // 5. Launch (Launchpad - 独立突出)
  {
    id: 'launch',
    label: 'Launch',
    icon: 'RocketLaunch',
    enabled: features.launchpad,
    items: [
      {
        id: 'launchpad-projects',
        label: 'Project List',
        href: '/launchpad',
        icon: 'List',
      },
      {
        id: 'launchpad-participated',
        label: 'My Participations',
        href: '/launchpad?filter=participated',
        icon: 'Verified',
      },
    ],
  },

  // 6. Analytics (分析 - 独立入口, 无下拉)
  {
    id: 'analytics',
    label: 'Analytics',
    icon: 'BarChart',
    href: '/analytics',
  },

  // Phase 2: Presale (测试网隐藏)
  ...(features.presale
    ? [
        {
          id: 'presale',
          label: 'Presale',
          icon: 'LocalActivity',
          items: [
            {
              id: 'presale-mint',
              label: 'Mint Bond NFT',
              href: '/presale/mint',
              icon: 'LocalActivity',
            },
            {
              id: 'presale-dice',
              label: 'Dice Rolling',
              href: '/presale/dice',
              icon: 'Casino',
            },
            {
              id: 'presale-tasks',
              label: 'Social Tasks',
              href: '/presale/tasks',
              icon: 'EmojiEvents',
            },
            {
              id: 'presale-leaderboards',
              label: 'Leaderboards',
              href: '/presale/leaderboards',
              icon: 'Leaderboard',
            },
            {
              id: 'presale-bonds',
              label: 'Bond Dashboard',
              href: '/presale/bonds',
              icon: 'AccountBalanceWallet',
            },
          ],
        } as NavColumn,
      ]
    : []),
];

/**
 * 根据 feature flags 过滤导航项
 */
export function getNavigationColumns(): NavColumn[] {
  return NAV_COLUMNS.filter((column) => {
    // 如果栏目有 enabled 属性且为 false, 跳过
    if (column.enabled === false) {
      return false;
    }

    // 如果栏目有下拉菜单, 过滤子项
    if (column.items) {
      const enabledItems = column.items.filter((item) => {
        if (item.enabled === false) return false;
        if (item.children) {
          // 嵌套子菜单也需要过滤
          item.children = item.children.filter((child) => child.enabled !== false);
          return item.children.length > 0;
        }
        return true;
      });
      column.items = enabledItems;
      return enabledItems.length > 0;
    }

    return true;
  });
}

/**
 * 根据 href 获取 active 状态的栏目 ID
 */
export function getActiveColumn(pathname: string): string {
  if (pathname === '/') return 'trade';
  if (pathname.startsWith('/convert')) return 'trade';
  if (pathname.startsWith('/liquidity')) return 'trade';

  if (pathname.startsWith('/savings')) return 'earn';
  if (pathname.startsWith('/boost')) return 'earn';
  if (pathname.startsWith('/nitro')) return 'earn';
  if (pathname.startsWith('/rewards')) return 'earn';

  if (pathname.startsWith('/vault')) return 'borrow';
  if (pathname.startsWith('/stability-pool')) return 'borrow';
  if (pathname.startsWith('/treasury')) return 'borrow';

  if (pathname.startsWith('/lock')) return 'governance';
  if (pathname.startsWith('/vote')) return 'governance';
  if (pathname.startsWith('/bribes')) return 'governance';

  if (pathname.startsWith('/launchpad')) return 'launch';

  if (pathname.startsWith('/analytics')) return 'analytics';

  if (pathname.startsWith('/presale')) return 'presale';

  return '';
}
