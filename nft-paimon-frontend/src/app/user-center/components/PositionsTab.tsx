/**
 * Positions Tab Component
 *
 * Migrated from /portfolio page (Task 30)
 *
 * Features:
 * - Liquidity Pool positions table
 * - USDP Vault positions table
 * - veNFT positions table
 * - Launchpad investments table
 * - USDP Savings summary
 */

'use client';

import { useMemo } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
} from '@mui/material';
import { useAccount } from 'wagmi';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import LockIcon from '@mui/icons-material/Lock';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import SavingsIcon from '@mui/icons-material/Savings';
import { useUserPortfolio } from '@/hooks/useUserPortfolio';

export function PositionsTab() {
  const { address } = useAccount();

  // Portfolio aggregation
  const portfolio = useUserPortfolio(address);

  // Format portfolio data for display (with null safety)
  const formattedPositions = useMemo(() => {
    return {
      liquidityPools: (portfolio?.lpPositions || []).map((pos) => ({
        pool: pos.pool,
        liquidity: `$${pos.liquidity}`,
        apr: `${pos.apr}%`,
        rewards: `${pos.pendingRewards} PAIMON`,
      })),
      vaultBorrows: (portfolio?.vaultPositions || []).map((pos) => ({
        asset: pos.asset,
        collateral: pos.collateralValueUSD,
        borrowed: pos.borrowed,
        ltv: `${pos.ltv.toFixed(0)}%`,
        liquidationPrice: pos.liquidationPrice,
      })),
      veNFT: (portfolio?.veNFTPositions || []).map((pos) => ({
        id: `#${pos.tokenId.toString()}`,
        locked: `${pos.lockedAmount} PAIMON`,
        expiry: new Date(pos.lockEnd * 1000).toLocaleDateString(),
        votingPower: pos.votingPower,
      })),
      launchpadInvestments: (portfolio?.launchpadInvestments || []).map((inv) => ({
        project: inv.projectName,
        invested: `$${inv.invested}`,
        tokens: `${inv.tokensReceived} tokens`,
        status: inv.status.charAt(0).toUpperCase() + inv.status.slice(1),
      })),
      savings: portfolio?.savingsPosition
        ? {
            principal: `${portfolio.savingsPosition.principal} USDP`,
            interest: `${portfolio.savingsPosition.accruedInterest} USDP`,
            apr: `${portfolio.savingsPosition.currentAPR}%`,
          }
        : {
            principal: '0 USDP',
            interest: '0 USDP',
            apr: '0%',
          },
    };
  }, [portfolio]);

  return (
    <>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#ff6b00', mb: 1 }}>
          All Positions
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Detailed view of your holdings across all protocols
        </Typography>
      </Box>

      {/* Liquidity Pool Positions */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <TrendingUpIcon sx={{ fontSize: 28, color: '#ff6b00' }} />
            <Typography variant="h6" fontWeight={700} sx={{ color: '#ff6b00' }}>
              Liquidity Pool Positions
            </Typography>
          </Box>
          <TableContainer sx={{ maxHeight: 440 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Pool</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Liquidity</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>APR</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Pending Rewards</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {formattedPositions.liquidityPools.map((position, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Typography fontWeight={600}>{position.pool}</Typography>
                    </TableCell>
                    <TableCell>{position.liquidity}</TableCell>
                    <TableCell>
                      <Chip label={position.apr} color="success" size="small" />
                    </TableCell>
                    <TableCell>
                      <Typography color="primary">{position.rewards}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* USDP Vault Positions */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <AccountBalanceWalletIcon sx={{ fontSize: 28, color: '#FF9800' }} />
            <Typography variant="h6" fontWeight={700} sx={{ color: '#FF9800' }}>
              USDP Vault Positions
            </Typography>
          </Box>
          <TableContainer sx={{ maxHeight: 440 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Asset</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Collateral</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Borrowed</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>LTV</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Liquidation Price</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {formattedPositions.vaultBorrows.map((position, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Typography fontWeight={600}>{position.asset}</Typography>
                    </TableCell>
                    <TableCell>{position.collateral}</TableCell>
                    <TableCell>
                      <Typography color="error.main">{position.borrowed}</Typography>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {position.ltv}
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={60}
                          sx={{ mt: 0.5, height: 6, borderRadius: 1 }}
                          color={60 > 80 ? 'error' : 60 > 65 ? 'warning' : 'success'}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography color="error.main">{position.liquidationPrice}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* veNFT Positions */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <LockIcon sx={{ fontSize: 28, color: '#8B4513' }} />
            <Typography variant="h6" fontWeight={700} sx={{ color: '#8B4513' }}>
              veNFT Positions
            </Typography>
          </Box>
          <TableContainer sx={{ maxHeight: 440 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Token ID</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Locked Amount</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Expiry Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Voting Power</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {formattedPositions.veNFT.map((position, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Chip label={position.id} size="small" color="primary" />
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={600}>{position.locked}</Typography>
                    </TableCell>
                    <TableCell>{position.expiry}</TableCell>
                    <TableCell>
                      <Typography color="success.main">{position.votingPower}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Launchpad Investments */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <RocketLaunchIcon sx={{ fontSize: 28, color: '#4CAF50' }} />
            <Typography variant="h6" fontWeight={700} sx={{ color: '#4CAF50' }}>
              Launchpad Investments
            </Typography>
          </Box>
          <TableContainer sx={{ maxHeight: 440 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Project</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Invested</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Tokens Received</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {formattedPositions.launchpadInvestments.map((position, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Typography fontWeight={600}>{position.project}</Typography>
                    </TableCell>
                    <TableCell>{position.invested}</TableCell>
                    <TableCell>{position.tokens}</TableCell>
                    <TableCell>
                      <Chip label={position.status} color="success" size="small" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* USDP Savings */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <SavingsIcon sx={{ fontSize: 28, color: '#D2691E' }} />
            <Typography variant="h6" fontWeight={700} sx={{ color: '#D2691E' }}>
              USDP Savings
            </Typography>
          </Box>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Box sx={{ p: 2, backgroundColor: 'rgba(210, 105, 30, 0.1)', borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Principal
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                  {formattedPositions.savings.principal}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ p: 2, backgroundColor: 'rgba(76, 175, 80, 0.1)', borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Accrued Interest
                </Typography>
                <Typography variant="h5" fontWeight={700} color="success.main">
                  {formattedPositions.savings.interest}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ p: 2, backgroundColor: 'rgba(255, 107, 0, 0.1)', borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Current APR
                </Typography>
                <Typography variant="h5" fontWeight={700} color="primary">
                  {formattedPositions.savings.apr}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </>
  );
}
