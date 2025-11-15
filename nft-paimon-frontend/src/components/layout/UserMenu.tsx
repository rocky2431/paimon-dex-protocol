/**
 * UserMenu Component
 *
 * User information dropdown menu for navigation bar (Task 33)
 *
 * Features:
 * - Display user address (abbreviated format)
 * - Display balance
 * - Dropdown menu with:
 *   - Go to User Center
 *   - Disconnect wallet
 * - Auto-connect support via Reown AppKit
 */

'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  Typography,
  Divider,
  IconButton,
  Skeleton,
} from '@mui/material';
import {
  AccountBalanceWallet as WalletIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  KeyboardArrowDown as ArrowDownIcon,
} from '@mui/icons-material';
import { useAccount, useBalance, useDisconnect } from 'wagmi';
import { useRouter } from 'next/navigation';
import { formatEther } from 'viem';

/**
 * Format address to abbreviated format (0x1234...5678)
 */
function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format balance to readable format (max 4 decimals)
 */
function formatBalance(balance: string): string {
  const num = parseFloat(balance);
  if (num === 0) return '0';
  if (num < 0.0001) return '< 0.0001';
  if (num < 1) return num.toFixed(4);
  if (num < 1000) return num.toFixed(2);
  if (num < 1000000) return `${(num / 1000).toFixed(2)}K`;
  return `${(num / 1000000).toFixed(2)}M`;
}

export function UserMenu() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  // Get BNB balance
  const { data: balanceData, isLoading: balanceLoading } = useBalance({
    address: address,
  });

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleGoToUserCenter = () => {
    handleClose();
    router.push('/user-center');
  };

  const handleDisconnect = () => {
    handleClose();
    disconnect();
  };

  // If not connected, show Reown AppKit button
  if (!isConnected || !address) {
    return (
      <Box sx={{ flexShrink: 0 }}>
        <w3m-button />
      </Box>
    );
  }

  // Connected state - show user menu button
  return (
    <>
      <Button
        onClick={handleClick}
        variant="outlined"
        sx={{
          minWidth: 200,
          height: 44,
          px: 2,
          borderRadius: 2,
          borderColor: 'primary.main',
          borderWidth: 2,
          textTransform: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          '&:hover': {
            borderWidth: 2,
            borderColor: 'primary.main',
            backgroundColor: 'rgba(255, 152, 0, 0.05)',
          },
        }}
      >
        {/* Wallet Icon */}
        <WalletIcon sx={{ fontSize: 20, color: 'primary.main' }} />

        {/* Address and Balance */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 700,
              color: 'text.primary',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              lineHeight: 1,
            }}
          >
            {formatAddress(address)}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontWeight: 600,
              fontSize: '0.75rem',
              lineHeight: 1,
              mt: 0.5,
            }}
          >
            {balanceLoading ? (
              <Skeleton width={60} height={12} />
            ) : (
              `${formatBalance(formatEther(balanceData?.value || 0n))} BNB`
            )}
          </Typography>
        </Box>

        {/* Dropdown Arrow */}
        <ArrowDownIcon
          sx={{
            fontSize: 20,
            color: 'text.secondary',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        />
      </Button>

      {/* Dropdown Menu */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        sx={{
          mt: 1,
          '& .MuiPaper-root': {
            minWidth: 220,
            borderRadius: 2,
            border: '2px solid',
            borderColor: 'primary.main',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
          },
        }}
      >
        {/* Menu Header - User Address */}
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            已连接钱包
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontFamily: 'monospace',
              fontWeight: 700,
              color: 'primary.main',
              mt: 0.5,
            }}
          >
            {formatAddress(address)}
          </Typography>
        </Box>

        <Divider />

        {/* Menu Item: Go to User Center */}
        <MenuItem
          onClick={handleGoToUserCenter}
          sx={{
            py: 1.5,
            px: 2,
            display: 'flex',
            gap: 1.5,
            '&:hover': {
              backgroundColor: 'rgba(255, 152, 0, 0.08)',
            },
          }}
        >
          <PersonIcon sx={{ fontSize: 20, color: 'primary.main' }} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            前往用户中心
          </Typography>
        </MenuItem>

        <Divider />

        {/* Menu Item: Disconnect */}
        <MenuItem
          onClick={handleDisconnect}
          sx={{
            py: 1.5,
            px: 2,
            display: 'flex',
            gap: 1.5,
            '&:hover': {
              backgroundColor: 'rgba(244, 67, 54, 0.08)',
            },
          }}
        >
          <LogoutIcon sx={{ fontSize: 20, color: 'error.main' }} />
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'error.main' }}>
            断开连接
          </Typography>
        </MenuItem>
      </Menu>
    </>
  );
}
