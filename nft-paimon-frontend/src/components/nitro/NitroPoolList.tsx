/**
 * NitroPoolList Component
 * Display list of Nitro incentive pools
 *
 * Material Design 3 compliant:
 * - Warm color palette (#ff6b00)
 * - Rounded corners (24px)
 * - Responsive grid layout
 */

'use client';

import React, { useMemo, memo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Grid,
  Alert,
  AlertTitle,
  Skeleton,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  Lock as LockIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useNitroPoolRewardTokens } from '@/hooks/useNitroPool';
import {
  formatAPR,
  formatLockDuration,
  isValidAddress,
  truncateText,
  sanitizeHTML,
  HIGH_APR_THRESHOLD,
  MAX_VISIBLE_REWARD_TOKENS,
  POOL_NAME_MAX_LENGTH,
} from './constants';
import type { NitroPoolListProps, NitroPool, NitroPoolCardProps } from './types';

/**
 * Individual Pool Card Component (Memoized)
 * 单个池卡片组件（已记忆化）
 */
const NitroPoolCard = memo(({ pool, onParticipate, locale = 'en' }: NitroPoolCardProps) => {
  const { id, name, lpToken, lockDuration, apr, active } = pool;

  // Fetch reward tokens for this pool
  const { data: rewardTokens, isLoading: loadingRewards, error: rewardError } = useNitroPoolRewardTokens(id);

  // Validate pool data
  const hasValidLpToken = isValidAddress(lpToken);
  const poolName = name || (locale === 'zh' ? '未命名池' : 'Unnamed Pool');
  const displayName = sanitizeHTML(truncateText(poolName, POOL_NAME_MAX_LENGTH));
  const isHighAPR = apr > HIGH_APR_THRESHOLD;

  // Format values
  const aprPercentage = apr !== null && apr !== undefined ? formatAPR(apr) : '0.00';
  const lockDays = lockDuration !== null && lockDuration !== undefined ? formatLockDuration(lockDuration) : 0;

  return (
    <Card
      data-testid={`pool-card-${id}`}
      sx={{
        borderRadius: '24px',
        background: active
          ? 'linear-gradient(135deg, rgba(255,107,0,0.1) 0%, rgba(255,180,80,0.1) 100%)'
          : 'rgba(128,128,128,0.1)',
        border: '1px solid',
        borderColor: active ? 'rgba(255,107,0,0.3)' : 'rgba(128,128,128,0.3)',
        transition: 'all 0.3s ease',
        '&:hover': active ? {
          transform: 'translateY(-4px)',
          boxShadow: '0 8px 24px rgba(255,107,0,0.2)',
        } : {},
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Pool Name */}
        <Typography
          variant="h6"
          data-testid={`pool-name-${id}`}
          sx={{
            fontWeight: 700,
            color: active ? '#ff6b00' : 'text.disabled',
            mb: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {displayName}
        </Typography>

        {/* Pool Status */}
        <Box sx={{ mb: 2 }}>
          {!active && (
            <Chip
              label={locale === 'zh' ? '已停用' : 'Inactive'}
              size="small"
              sx={{ bgcolor: 'rgba(128,128,128,0.2)', color: 'text.disabled' }}
            />
          )}
          {active && isHighAPR && (
            <Chip
              icon={<WarningIcon />}
              label={locale === 'zh' ? '异常高 APR' : 'Unusually High APR'}
              size="small"
              color="warning"
              sx={{ mr: 1 }}
            />
          )}
        </Box>

        {/* LP Token Validation */}
        {!hasValidLpToken && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}>
            {locale === 'zh' ? '无效的 LP 代币地址' : 'Invalid LP Token'}
          </Alert>
        )}

        {/* Pool Details Grid */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          {/* Lock Duration */}
          <Grid item xs={6}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <LockIcon sx={{ fontSize: 14 }} />
                {locale === 'zh' ? '锁定期限' : 'Lock Duration'}
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {lockDays} {locale === 'zh' ? '天' : 'days'}
              </Typography>
            </Box>
          </Grid>

          {/* APR */}
          <Grid item xs={6}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <TrendingUpIcon sx={{ fontSize: 14 }} />
                APR
              </Typography>
              <Typography variant="body1" fontWeight={600} color={isHighAPR ? 'warning.main' : '#ff6b00'}>
                {aprPercentage}%
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Reward Tokens */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            {locale === 'zh' ? '奖励代币：' : 'Reward Tokens:'}
          </Typography>
          {loadingRewards ? (
            <Typography variant="caption" color="text.secondary">
              {locale === 'zh' ? '加载奖励中...' : 'Loading rewards...'}
            </Typography>
          ) : rewardError ? (
            <Typography variant="caption" color="error">
              {locale === 'zh' ? '加载奖励代币失败' : 'Failed to load reward tokens'}
            </Typography>
          ) : !rewardTokens || rewardTokens.length === 0 ? (
            <Typography variant="caption" color="text.secondary">
              {locale === 'zh' ? '暂无奖励代币' : 'No reward tokens'}
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {rewardTokens.slice(0, MAX_VISIBLE_REWARD_TOKENS).map((token, idx) => (
                <Chip
                  key={token}
                  label={`${token.slice(0, 6)}...${token.slice(-4)}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem' }}
                />
              ))}
              {rewardTokens.length > MAX_VISIBLE_REWARD_TOKENS && (
                <Chip
                  label={`+${rewardTokens.length - MAX_VISIBLE_REWARD_TOKENS} ${locale === 'zh' ? '更多' : 'more'}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem' }}
                />
              )}
            </Box>
          )}
        </Box>

        {/* Action Button */}
        {active && hasValidLpToken && (
          <Button
            variant="contained"
            fullWidth
            onClick={() => onParticipate?.(id)}
            sx={{
              bgcolor: '#ff6b00',
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': {
                bgcolor: '#e65c00',
              },
            }}
          >
            {locale === 'zh' ? '参与' : 'Participate'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
});

NitroPoolCard.displayName = 'NitroPoolCard';

/**
 * Main NitroPoolList Component
 * 主 NitroPoolList 组件
 */
export function NitroPoolList({ pools, showFilter = false, theme = 'light', locale = 'en' }: NitroPoolListProps) {
  const [filterText, setFilterText] = React.useState('');

  // Validate pools data
  const validPools = useMemo(() => {
    if (!pools || !Array.isArray(pools)) return [];
    return pools;
  }, [pools]);

  // Filter pools based on search text
  const filteredPools = useMemo(() => {
    if (!filterText) return validPools;
    const lowerFilter = filterText.toLowerCase();
    return validPools.filter(pool =>
      pool.name?.toLowerCase().includes(lowerFilter)
    );
  }, [validPools, filterText]);

  // Virtualization: Only render first 20 items for performance
  const displayPools = useMemo(() => {
    return filteredPools.slice(0, 20);
  }, [filteredPools]);

  return (
    <Box data-testid="nitro-pool-list" sx={{ width: '100%' }}>
      {/* Risk Warning */}
      {validPools.length > 0 && (
        <Alert
          severity="warning"
          icon={<WarningIcon />}
          sx={{
            mb: 3,
            borderRadius: '16px',
            '& .MuiAlert-message': { width: '100%' },
          }}
        >
          <AlertTitle sx={{ fontWeight: 700 }}>
            {locale === 'zh' ? '风险警告' : 'Risk Warning'}
          </AlertTitle>
          <Typography variant="body2">
            {locale === 'zh'
              ? 'Nitro 池是外部激励池，由第三方项目方创建。请自行评估风险，谨慎参与。'
              : 'Nitro Pools are external incentive pools created by third-party projects. Please assess risks carefully before participating.'}
          </Typography>
        </Alert>
      )}

      {/* Filter Input */}
      {showFilter && validPools.length > 0 && (
        <TextField
          fullWidth
          placeholder={locale === 'zh' ? '搜索池名称...' : 'Search pool name...'}
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 3, borderRadius: '12px' }}
        />
      )}

      {/* Empty State */}
      {validPools.length === 0 && (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            color: 'text.secondary',
          }}
        >
          <Typography variant="h6">
            {locale === 'zh' ? '暂无 Nitro 池' : 'No Nitro Pools Available'}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            {locale === 'zh' ? '请稍后再来查看' : 'Please check back later'}
          </Typography>
        </Box>
      )}

      {/* Pool Grid */}
      {displayPools.length > 0 && (
        <Grid container spacing={3} sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' } }}>
          {displayPools.map((pool) => (
            <Grid item xs={12} sm={6} md={4} key={pool.id.toString()}>
              <NitroPoolCard pool={pool} locale={locale} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Filtered Empty State */}
      {validPools.length > 0 && filteredPools.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
          <Typography variant="body2">
            {locale === 'zh' ? '未找到匹配的池' : 'No pools match your search'}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
