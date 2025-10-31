/**
 * RWAAssetSelector Component
 * Dropdown selector for RWA assets with tier indicators
 */

'use client';

import { FormControl, Select, MenuItem, Box, Typography, Chip } from '@mui/material';
import { RWAAsset } from '@/types/treasury';
import { RWA_ASSETS, TREASURY_THEME } from './constants';

interface RWAAssetSelectorProps {
  selectedAsset: string | null;
  onSelectAsset: (assetAddress: string) => void;
}

export function RWAAssetSelector({ selectedAsset, onSelectAsset }: RWAAssetSelectorProps) {
  return (
    <FormControl fullWidth>
      <Typography
        variant="subtitle2"
        sx={{
          mb: 1,
          fontWeight: 600,
          color: TREASURY_THEME.SUBTITLE,
        }}
      >
        Select RWA Asset
      </Typography>
      <Select
        value={selectedAsset || ''}
        onChange={(e) => onSelectAsset(e.target.value)}
        displayEmpty
        sx={{
          backgroundColor: 'background.paper',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: TREASURY_THEME.EMPHASIS, // #FF8C00 deep orange
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: TREASURY_THEME.EMPHASIS,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: TREASURY_THEME.EMPHASIS,
          },
        }}
      >
        <MenuItem value="" disabled>
          <Typography sx={{ color: TREASURY_THEME.CAPTION }}>Choose an asset...</Typography>
        </MenuItem>
        {RWA_ASSETS.filter((asset) => asset.isActive).map((asset: RWAAsset) => (
          <MenuItem key={asset.address} value={asset.address}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
              }}
            >
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 600, color: TREASURY_THEME.SUBTITLE }}>
                  {asset.symbol}
                </Typography>
                <Typography variant="caption" sx={{ color: TREASURY_THEME.CAPTION }}>
                  {asset.name}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Chip
                  label={`T${asset.tier}`}
                  size="small"
                  sx={{
                    backgroundColor: getTierColor(asset.tier),
                    color: '#000',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 600,
                    color: TREASURY_THEME.EMPHASIS,
                  }}
                >
                  {asset.ltvRatio}% LTV
                </Typography>
              </Box>
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

// Helper function to get tier color
function getTierColor(tier: number): string {
  switch (tier) {
    case 1:
      return '#FFD700'; // Gold for T1
    case 2:
      return '#FFA500'; // Orange for T2
    case 3:
      return '#FF8C00'; // Dark orange for T3
    default:
      return '#FFB84D'; // Light orange fallback
  }
}
