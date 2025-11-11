'use client';

import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
} from '@mui/material';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import { PoolReward } from './types';
import { REWARDS_DESIGN_TOKENS } from './constants';

interface PoolRewardsListProps {
  poolRewards: PoolReward[];
  onClaimSingle: (gaugeAddress: `0x${string}`) => void;
  isLoading: boolean;
}

/**
 * PoolRewardsList Component
 * Displays rewards for each individual pool
 *
 * Features:
 * - Pool name and APR
 * - Staked LP balance
 * - Earned PAIMON rewards
 * - Individual claim button
 */
export const PoolRewardsList: React.FC<PoolRewardsListProps> = ({
  poolRewards,
  onClaimSingle,
  isLoading,
}) => {
  // Filter pools with staked balance
  const activeRewards = poolRewards.filter((pool) => pool.stakedBalance > 0n);

  if (activeRewards.length === 0) {
    return (
      <Card
        sx={{
          borderRadius: REWARDS_DESIGN_TOKENS.RADIUS_LARGE,
          background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.05) 0%, rgba(255, 152, 0, 0.02) 100%)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 152, 0, 0.1)',
        }}
      >
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <LocalFireDepartmentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" sx={{ color: 'text.secondary' }}>
            No active staking positions
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
            Stake LP tokens to start earning PAIMON rewards
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        borderRadius: REWARDS_DESIGN_TOKENS.RADIUS_LARGE,
        background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.05) 0%, rgba(255, 152, 0, 0.02) 100%)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 152, 0, 0.1)',
      }}
    >
      <CardContent sx={{ p: 0 }}>
        <Box sx={{ p: 3, pb: 2 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              background: 'linear-gradient(90deg, #ff9800, #ffb74d)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Pool Rewards
          </Typography>
        </Box>

        <TableContainer sx={{ maxHeight: 440 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Pool</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }} align="right">
                  APR
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }} align="right">
                  Staked
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }} align="right">
                  Earned
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }} align="center">
                  Action
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {activeRewards.map((poolReward, index) => {
                const hasRewards = poolReward.earnedRewards > 0n;

                return (
                  <TableRow
                    key={index}
                    sx={{
                      '&:last-child td, &:last-child th': { border: 0 },
                      '&:hover': {
                        backgroundColor: 'rgba(255, 152, 0, 0.05)',
                      },
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {poolReward.pool.name}
                        </Typography>
                        <Chip
                          label={poolReward.pool.type}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.65rem',
                            backgroundColor: 'rgba(255, 152, 0, 0.1)',
                            color: '#ff9800',
                          }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ color: '#4caf50', fontWeight: 600 }}>
                        {poolReward.apr}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {parseFloat(poolReward.stakedBalanceFormatted).toFixed(4)} LP
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                        {hasRewards && (
                          <LocalFireDepartmentIcon sx={{ fontSize: 18, color: '#ff9800' }} />
                        )}
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: hasRewards ? 700 : 400,
                            color: hasRewards ? '#ff9800' : 'text.secondary',
                          }}
                        >
                          {parseFloat(poolReward.earnedRewardsFormatted).toFixed(4)} PAIMON
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        variant="outlined"
                        size="small"
                        disabled={!hasRewards || isLoading}
                        onClick={() => onClaimSingle(poolReward.gauge)}
                        sx={{
                          borderRadius: REWARDS_DESIGN_TOKENS.RADIUS_PILL,
                          borderColor: '#ff9800',
                          color: '#ff9800',
                          '&:hover': {
                            borderColor: '#ffb74d',
                            backgroundColor: 'rgba(255, 152, 0, 0.1)',
                          },
                          '&:disabled': {
                            borderColor: 'rgba(255, 152, 0, 0.2)',
                            color: 'rgba(255, 152, 0, 0.3)',
                          },
                        }}
                      >
                        {isLoading ? 'Claiming...' : 'Claim'}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};
