'use client';

import { Tabs, Tab, Box } from '@mui/material';
import { useRouter, usePathname } from 'next/navigation';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import LockIcon from '@mui/icons-material/Lock';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';

export type LiquidityTabValue = 'add' | 'remove' | 'stake' | 'positions';

interface LiquidityTabsProps {
  /**
   * The currently active tab
   */
  activeTab: LiquidityTabValue;
}

/**
 * LiquidityTabs Component
 * Sub-navigation for liquidity management pages
 *
 * Features:
 * - Tab navigation between Add, Remove, Stake, and My Positions
 * - Material Design 3 styling
 * - Icon indicators for each tab
 * - Active tab highlighting
 */
export function LiquidityTabs({ activeTab }: LiquidityTabsProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleTabChange = (_event: React.SyntheticEvent, newValue: LiquidityTabValue) => {
    // Navigate to corresponding page
    switch (newValue) {
      case 'add':
        router.push('/liquidity/add');
        break;
      case 'remove':
        router.push('/liquidity/remove');
        break;
      case 'stake':
        router.push('/liquidity/stake');
        break;
      case 'positions':
        // TODO: Create /liquidity/positions page
        router.push('/liquidity/add'); // Fallback to add for now
        break;
    }
  };

  return (
    <Box
      sx={{
        borderBottom: 1,
        borderColor: 'divider',
        mb: 4,
      }}
    >
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        aria-label="liquidity navigation tabs"
        sx={{
          '& .MuiTabs-indicator': {
            backgroundColor: 'primary.main',
            height: 3,
          },
        }}
      >
        <Tab
          value="add"
          icon={<AddIcon />}
          iconPosition="start"
          label="Add Liquidity"
          sx={{
            textTransform: 'none',
            fontWeight: activeTab === 'add' ? 700 : 600,
            fontSize: '1rem',
            color: activeTab === 'add' ? 'primary.main' : 'text.secondary',
            '&:hover': {
              color: 'primary.main',
              backgroundColor: 'rgba(255, 152, 0, 0.05)',
            },
          }}
        />
        <Tab
          value="remove"
          icon={<RemoveIcon />}
          iconPosition="start"
          label="Remove Liquidity"
          sx={{
            textTransform: 'none',
            fontWeight: activeTab === 'remove' ? 700 : 600,
            fontSize: '1rem',
            color: activeTab === 'remove' ? 'primary.main' : 'text.secondary',
            '&:hover': {
              color: 'primary.main',
              backgroundColor: 'rgba(255, 152, 0, 0.05)',
            },
          }}
        />
        <Tab
          value="stake"
          icon={<LockIcon />}
          iconPosition="start"
          label="Stake LP"
          sx={{
            textTransform: 'none',
            fontWeight: activeTab === 'stake' ? 700 : 600,
            fontSize: '1rem',
            color: activeTab === 'stake' ? 'primary.main' : 'text.secondary',
            '&:hover': {
              color: 'primary.main',
              backgroundColor: 'rgba(255, 152, 0, 0.05)',
            },
          }}
        />
        <Tab
          value="positions"
          icon={<AccountBalanceWalletIcon />}
          iconPosition="start"
          label="My Positions"
          disabled // TODO: Remove when positions page is created
          sx={{
            textTransform: 'none',
            fontWeight: activeTab === 'positions' ? 700 : 600,
            fontSize: '1rem',
            color: activeTab === 'positions' ? 'primary.main' : 'text.secondary',
            '&:hover': {
              color: 'primary.main',
              backgroundColor: 'rgba(255, 152, 0, 0.05)',
            },
          }}
        />
      </Tabs>
    </Box>
  );
}
