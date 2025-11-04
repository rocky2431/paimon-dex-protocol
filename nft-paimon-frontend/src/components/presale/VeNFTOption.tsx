'use client';

import { Box, Typography, Slider, Grid, Chip, Button } from '@mui/material';
import {
  Lock as LockIcon,
  TrendingUp as TrendingUpIcon,
  HowToVote as VoteIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { VeNFTSettlementOption, SETTLEMENT_CONSTANTS, LOCK_DURATION_PRESETS } from '@/types/settlement';

interface VeNFTOptionProps {
  option: VeNFTSettlementOption;
  onLockDurationChange: (durationDays: number) => void;
  onSettle: () => void;
  settling: boolean;
}

/**
 * VeNFTOption Component
 * veNFT settlement option display with lock duration selector
 *
 * Features:
 * - Lock duration slider (3-48 months)
 * - Preset duration buttons
 * - Voting power preview
 * - Estimated APY display
 * - Lock end date
 * - Settlement button
 */
export function VeNFTOption({ option, onLockDurationChange, onSettle, settling }: VeNFTOptionProps) {
  const handlePresetClick = (days: number) => {
    onLockDurationChange(days);
  };

  const handleSliderChange = (_event: Event, value: number | number[]) => {
    const months = value as number;
    const days = Math.round(months * 30);
    onLockDurationChange(days);
  };

  return (
    <Box
      sx={{
        p: 3,
        backgroundColor: 'background.paper',
        borderRadius: 2,
        border: '2px solid #FF6B35',
        boxShadow: '0 4px 16px rgba(255, 107, 53, 0.12)',
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <LockIcon sx={{ fontSize: 28, color: '#FF6B35' }} />
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#FF6B35' }}>
          veNFT (Lock + Vote)
        </Typography>
        <Chip
          label="Higher Returns"
          size="small"
          sx={{
            backgroundColor: '#FF6B35',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: '0.7rem',
            ml: 'auto',
          }}
        />
      </Box>

      {/* USDP Amount */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
          You will receive
        </Typography>
        <Typography variant="h3" sx={{ fontWeight: 800, color: '#FF6B35' }}>
          {option.usdpAmount.toFixed(2)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          USDP tokens (locked)
        </Typography>
      </Box>

      {/* Lock Duration Selector */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
          Lock Duration
        </Typography>

        {/* Preset Buttons */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          {LOCK_DURATION_PRESETS.map((preset) => (
            <Button
              key={preset.months}
              size="small"
              variant={option.lockDurationDays === preset.days ? 'contained' : 'outlined'}
              onClick={() => handlePresetClick(preset.days)}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.75rem',
                borderColor: '#FFB74D',
                color: option.lockDurationDays === preset.days ? '#FFFFFF' : '#FFB74D',
                backgroundColor: option.lockDurationDays === preset.days ? '#FF6B35' : 'transparent',
                '&:hover': {
                  borderColor: '#FF6B35',
                  backgroundColor: option.lockDurationDays === preset.days ? '#FF5722' : 'rgba(255, 107, 53, 0.08)',
                },
              }}
            >
              {preset.label}
            </Button>
          ))}
        </Box>

        {/* Slider */}
        <Slider
          value={option.lockDurationMonths}
          onChange={handleSliderChange}
          min={SETTLEMENT_CONSTANTS.MIN_LOCK_DURATION_MONTHS}
          max={SETTLEMENT_CONSTANTS.MAX_LOCK_DURATION_MONTHS}
          step={1}
          marks={[
            { value: 3, label: '3m' },
            { value: 12, label: '1y' },
            { value: 24, label: '2y' },
            { value: 36, label: '3y' },
            { value: 48, label: '4y' },
          ]}
          valueLabelDisplay="auto"
          valueLabelFormat={(value) => `${value}m`}
          sx={{
            color: '#FF6B35',
            '& .MuiSlider-thumb': {
              backgroundColor: '#FF6B35',
              '&:hover, &.Mui-focusVisible': {
                boxShadow: '0 0 0 8px rgba(255, 107, 53, 0.16)',
              },
            },
            '& .MuiSlider-track': {
              backgroundColor: '#FF6B35',
            },
            '& .MuiSlider-rail': {
              backgroundColor: '#FFB74D',
              opacity: 0.3,
            },
            '& .MuiSlider-mark': {
              backgroundColor: '#FFB74D',
            },
            '& .MuiSlider-markLabel': {
              fontSize: '0.75rem',
              color: 'text.secondary',
            },
          }}
        />

        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
          {option.lockDurationMonths} months ({option.lockDurationDays} days)
        </Typography>
      </Box>

      {/* Benefits Grid */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Voting Power */}
        <Grid item xs={6}>
          <Box
            sx={{
              p: 2,
              backgroundColor: 'rgba(255, 107, 53, 0.05)',
              borderRadius: 1,
              border: '1px solid rgba(255, 107, 53, 0.1)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <VoteIcon sx={{ fontSize: 16, color: '#FF6B35' }} />
              <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                Voting Power
              </Typography>
            </Box>
            <Typography variant="h6" fontWeight={800} color="#FF6B35">
              {option.votingPower.toFixed(2)}
            </Typography>
          </Box>
        </Grid>

        {/* Estimated APY */}
        <Grid item xs={6}>
          <Box
            sx={{
              p: 2,
              backgroundColor: 'rgba(139, 195, 74, 0.05)',
              borderRadius: 1,
              border: '1px solid rgba(139, 195, 74, 0.1)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <TrendingUpIcon sx={{ fontSize: 16, color: '#8BC34A' }} />
              <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                Est. APY
              </Typography>
            </Box>
            <Typography variant="h6" fontWeight={800} color="#8BC34A">
              {option.estimatedAPY.toFixed(1)}%
            </Typography>
          </Box>
        </Grid>

        {/* Lock End Date */}
        <Grid item xs={12}>
          <Box
            sx={{
              p: 2,
              backgroundColor: 'rgba(255, 183, 77, 0.05)',
              borderRadius: 1,
              border: '1px solid rgba(255, 183, 77, 0.1)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <CalendarIcon sx={{ fontSize: 16, color: '#FFB74D' }} />
              <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                Lock Ends
              </Typography>
            </Box>
            <Typography variant="body2" fontWeight={700} color="text.primary">
              {option.lockEndDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {/* Benefits List */}
      <Box sx={{ mb: 3, p: 2, backgroundColor: 'rgba(255, 107, 53, 0.02)', borderRadius: 1 }}>
        <Typography variant="caption" fontWeight={700} textTransform="uppercase" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          Benefits
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
          <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            Earn protocol fees + bribes (~{option.estimatedAPY.toFixed(1)}% APY)
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            Vote on governance proposals
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            Boost LP rewards (up to 2.5x)
          </Typography>
          <Typography component="li" variant="body2" color="text.secondary">
            Participate in protocol revenue sharing
          </Typography>
        </Box>
      </Box>

      {/* Settlement Button */}
      <Button
        variant="contained"
        fullWidth
        size="large"
        disabled={settling}
        onClick={onSettle}
        sx={{
          py: 1.5,
          fontWeight: 700,
          fontSize: '1rem',
          textTransform: 'none',
          backgroundColor: '#FF6B35',
          '&:hover': {
            backgroundColor: '#FF5722',
          },
        }}
      >
        {settling ? 'Processing...' : 'Settle to veNFT'}
      </Button>
    </Box>
  );
}
