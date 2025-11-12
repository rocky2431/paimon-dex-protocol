'use client';

import { useState } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  Box,
  Typography,
  Avatar,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { Token, TokenInfo } from './types';
import { TOKEN_CONFIG, DESIGN_TOKENS, ANIMATION_CONFIG } from './constants';

interface TokenSelectorProps {
  selectedToken: Token;
  onTokenChange: (token: Token) => void;
  disabled?: boolean;
  excludeToken?: Token; // Hide this token from dropdown
  allowedTokens?: Token[]; // Only show these tokens (for PSM mode: USDC, USDP)
  'data-testid'?: string; // For E2E testing
}

/**
 * TokenSelector Component
 * OlympusDAO pill-shaped button (100px border-radius)
 *
 * Features:
 * - Pill-shaped design (OlympusDAO signature)
 * - Inset shadow borders (no solid borders)
 * - Hover translateY effect
 * - Smooth dropdown animation
 */
export const TokenSelector: React.FC<TokenSelectorProps> = ({
  selectedToken,
  onTokenChange,
  disabled = false,
  excludeToken,
  allowedTokens,
  'data-testid': testId,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const selectedTokenInfo = TOKEN_CONFIG[selectedToken];

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleTokenSelect = (token: Token) => {
    onTokenChange(token);
    handleClose();
  };

  // Get available tokens
  // 1. If allowedTokens is set, only show those tokens (PSM mode: USDC, USDP)
  // 2. Otherwise exclude the token from opposite field
  const availableTokens = Object.values(TOKEN_CONFIG).filter((token) => {
    // If allowedTokens is set, only show allowed tokens
    if (allowedTokens && allowedTokens.length > 0) {
      return allowedTokens.includes(token.symbol as Token);
    }
    // Otherwise exclude the opposite token
    return !excludeToken || token.symbol !== excludeToken;
  });

  return (
    <>
      <Button
        data-testid={testId}
        onClick={handleClick}
        disabled={disabled}
        sx={{
          borderRadius: DESIGN_TOKENS.RADIUS_PILL, // 100px - OlympusDAO pill
          padding: '8px 20px',
          fontSize: '1rem',
          fontWeight: 600,
          color: 'text.primary',
          backgroundColor: 'background.elevated',
          border: 'none',
          boxShadow: DESIGN_TOKENS.INSET_BORDER_MEDIUM,
          transition: `all ${ANIMATION_CONFIG.DURATION_NORMAL} ${ANIMATION_CONFIG.EASE_OUT_EXPO}`,
          textTransform: 'none',
          minWidth: 120,

          '&:hover': {
            backgroundColor: '#FFE0B2', // Peach color
            boxShadow: DESIGN_TOKENS.INSET_BORDER_STRONG,
            transform: 'translateY(-2px)', // OlympusDAO hover lift
          },

          '&:active': {
            transform: 'translateY(0)',
          },

          '&.Mui-disabled': {
            backgroundColor: 'background.default',
            color: 'text.disabled',
            boxShadow: DESIGN_TOKENS.INSET_BORDER_LIGHT,
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Token icon placeholder (using Avatar for now) */}
          <Avatar
            sx={{
              width: 24,
              height: 24,
              bgcolor: 'primary.main',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            {selectedTokenInfo.symbol.charAt(0)}
          </Avatar>

          <Typography variant="body1" fontWeight={600}>
            {selectedTokenInfo.symbol}
          </Typography>

          <KeyboardArrowDownIcon
            sx={{
              ml: 0.5,
              transition: `transform ${ANIMATION_CONFIG.DURATION_NORMAL} ${ANIMATION_CONFIG.EASE_OUT_EXPO}`,
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </Box>
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        sx={{
          mt: 1,
          '& .MuiPaper-root': {
            borderRadius: DESIGN_TOKENS.RADIUS_MEDIUM,
            boxShadow: DESIGN_TOKENS.SHADOW_CARD,
            minWidth: 200,
          },
        }}
      >
        {availableTokens.map((token) => (
          <MenuItem
            key={token.symbol}
            data-testid={`token-option-${token.symbol}`}
            onClick={() => handleTokenSelect(token.symbol)}
            selected={token.symbol === selectedToken}
            sx={{
              padding: '12px 16px',
              transition: `all ${ANIMATION_CONFIG.DURATION_FAST} ${ANIMATION_CONFIG.EASE_OUT_EXPO}`,

              '&:hover': {
                backgroundColor: 'background.elevated',
              },

              '&.Mui-selected': {
                backgroundColor: '#FFE0B2',
                '&:hover': {
                  backgroundColor: '#FFE0B2',
                },
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: 'primary.main',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                }}
              >
                {token.symbol.charAt(0)}
              </Avatar>

              <Box>
                <Typography variant="body1" fontWeight={600}>
                  {token.symbol}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {token.name}
                </Typography>
              </Box>
            </Box>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};
