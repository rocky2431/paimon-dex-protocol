'use client';

import { Box, Typography, MenuItem, Select, Stack, Avatar } from '@mui/material';
import { useAccount, useReadContract } from 'wagmi';
import { erc20Abi, formatUnits } from 'viem';
import { Token } from './types';
import { SUPPORTED_TOKENS, LIQUIDITY_DESIGN_TOKENS, ANIMATION_CONFIG } from './constants';

/**
 * TokenSelector Component Props
 */
interface TokenSelectorProps {
  /** Label for the selector */
  label: string;
  /** Currently selected token */
  selectedToken: Token | null;
  /** Callback when token is selected */
  onTokenSelect: (token: Token) => void;
  /** Token to exclude from list (e.g., the other selected token) */
  excludeToken?: Token | null;
  /** Whether the component is disabled */
  disabled?: boolean;
}

/**
 * TokenSelector Component
 * Dropdown selector for choosing a token with balance display
 *
 * Features:
 * - Dropdown list of available tokens
 * - Token logo, symbol, and name display
 * - Real-time balance fetching
 * - Exclude option to prevent selecting same token twice
 */
export const TokenSelector: React.FC<TokenSelectorProps> = ({
  label,
  selectedToken,
  onTokenSelect,
  excludeToken,
  disabled = false,
}) => {
  const { address } = useAccount();

  // Get available tokens (excluding the excluded token)
  const availableTokens = Object.values(SUPPORTED_TOKENS).filter(
    (token) => !excludeToken || token.address !== excludeToken.address
  );

  // Fetch balance for selected token
  const { data: balance } = useReadContract({
    address: selectedToken?.address,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!selectedToken,
      refetchInterval: 10000, // Refresh every 10s
    },
  });

  const balanceFormatted = selectedToken && balance
    ? formatUnits(balance, selectedToken.decimals)
    : '0.00';

  return (
    <Box>
      {/* Label */}
      <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 1, display: 'block' }}>
        {label}
      </Typography>

      {/* Token selector dropdown */}
      <Select
        fullWidth
        value={selectedToken?.address || ''}
        onChange={(e) => {
          const token = availableTokens.find((t) => t.address === e.target.value);
          if (token) onTokenSelect(token);
        }}
        disabled={disabled}
        displayEmpty
        renderValue={(selected) => {
          if (!selected || !selectedToken) {
            return (
              <Typography color="text.disabled" fontSize="0.875rem">
                Select a token...
              </Typography>
            );
          }

          return (
            <Stack direction="row" spacing={1.5} alignItems="center">
              {/* Token logo */}
              <Avatar
                src={selectedToken.logoURI}
                alt={selectedToken.symbol}
                sx={{ width: 24, height: 24 }}
              />

              {/* Token symbol */}
              <Typography variant="body1" fontWeight={600} color="text.primary">
                {selectedToken.symbol}
              </Typography>

              {/* Balance */}
              {address && (
                <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto !important' }}>
                  Balance: {Number(balanceFormatted).toFixed(4)}
                </Typography>
              )}
            </Stack>
          );
        }}
        sx={{
          borderRadius: LIQUIDITY_DESIGN_TOKENS.RADIUS_MEDIUM,
          backgroundColor: 'background.elevated',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255, 152, 0, 0.2)',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'primary.main',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: 'primary.main',
            borderWidth: '2px',
          },
        }}
      >
        {availableTokens.map((token) => (
          <MenuItem key={token.address} value={token.address}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ width: '100%' }}>
              {/* Token logo */}
              <Avatar
                src={token.logoURI}
                alt={token.symbol}
                sx={{ width: 28, height: 28 }}
              />

              {/* Token info */}
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body2" fontWeight={600} color="text.primary">
                  {token.symbol}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  {token.name}
                </Typography>
              </Box>
            </Stack>
          </MenuItem>
        ))}
      </Select>
    </Box>
  );
};
