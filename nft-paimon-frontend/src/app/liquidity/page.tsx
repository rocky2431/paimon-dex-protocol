/**
 * Liquidity Hub (V3 - 流动性中心)
 *
 * 功能: Swap + Pools + My Liquidity + Nitro & Boost 统一管理
 * 路由: /liquidity
 * Tabs: Swap | Pools | My Liquidity | Nitro & Boost
 *
 * 设计理念:
 * - Swap: DEX 交易入口（PSMSwapCard + DEX SwapCard）
 * - Pools: 浏览所有池子（TVL、APR、Gauge 权重）+ Add/Remove 流动性
 * - My Liquidity: 用户 LP 持仓 + 质押管理
 * - Nitro & Boost: Nitro Pool 加速 + Boost 倍数质押
 * - 侧栏固定: 总 TVL、交易量、用户LP价值
 */

'use client';

import { Container, Typography, Box, Grid, Card, CardContent, Alert, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button } from '@mui/material';
import { Navigation } from '@/components/layout/Navigation';
import { SubNavigation, useTabState } from '@/components/layout/SubNavigation';
import { useAccount } from 'wagmi';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import AddIcon from '@mui/icons-material/Add';
import InfoIcon from '@mui/icons-material/Info';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import BoltIcon from '@mui/icons-material/Bolt';
import DiamondIcon from '@mui/icons-material/Diamond';

// Swap Tab components
import { SwapCard } from '@/components/swap/SwapCard';
import { PSMSwapCard } from '@/components/swap/PSMSwapCard';

// Pools Tab components
import { AddLiquidityCard } from '@/components/liquidity/AddLiquidityCard';
import { RemoveLiquidityCard } from '@/components/liquidity/RemoveLiquidityCard';

// My Liquidity Tab components
import { StakingCard } from '@/components/liquidity/StakingCard';

// Nitro & Boost Tab components
import { NitroPoolList } from '@/components/nitro';
import { BoostStakingCard, BoostCalculator } from '@/components/boost';

export default function LiquidityHub() {
  const { address, isConnected } = useAccount();
  const [currentTab, setCurrentTab] = useTabState('swap');

  const LIQUIDITY_TABS = [
    { value: 'swap', label: 'Swap' },
    { value: 'pools', label: 'Pools' },
    { value: 'my-liquidity', label: 'My Liquidity' },
    { value: 'nitro', label: 'Nitro & Boost' },
  ];

  // Mock pool data (will be replaced with real contract queries)
  const MOCK_POOLS = [
    {
      id: 1,
      name: 'USDP/USDC',
      tvl: '$1,200,000',
      volume24h: '$450,000',
      apr: '25%',
      gaugeWeight: '35%',
      hasNitro: true,
    },
    {
      id: 2,
      name: 'USDP/ETH',
      tvl: '$800,000',
      volume24h: '$320,000',
      apr: '18%',
      gaugeWeight: '25%',
      hasNitro: false,
    },
    {
      id: 3,
      name: 'USDC/ETH',
      tvl: '$1,500,000',
      volume24h: '$680,000',
      apr: '15%',
      gaugeWeight: '40%',
      hasNitro: true,
    },
    {
      id: 4,
      name: 'PAIMON/USDP',
      tvl: '$650,000',
      volume24h: '$180,000',
      apr: '32%',
      gaugeWeight: '20%',
      hasNitro: true,
    },
  ];

  // Mock Nitro Pools data (符合 NitroPool 接口)
  const MOCK_NITRO_POOLS = [
    {
      id: 1n,
      name: 'USDP/USDC Nitro',
      lpToken: '0x0000000000000000000000000000000000000001' as `0x${string}`,
      lockDuration: 604800n, // 7 days in seconds
      apr: 45,
      active: true,
    },
    {
      id: 2n,
      name: 'USDC/ETH Nitro',
      lpToken: '0x0000000000000000000000000000000000000002' as `0x${string}`,
      lockDuration: 1209600n, // 14 days in seconds
      apr: 38,
      active: true,
    },
    {
      id: 3n,
      name: 'PAIMON/USDP Nitro',
      lpToken: '0x0000000000000000000000000000000000000003' as `0x${string}`,
      lockDuration: 259200n, // 3 days in seconds
      apr: 64,
      active: true,
    },
  ];

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Navigation />

      <Container maxWidth="xl" sx={{ pt: 12, pb: 8, px: { xs: 2, sm: 3 }, minHeight: '100vh' }}>
        <Box sx={{ height: { xs: 40, sm: 60 } }} />

        {/* Header */}
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              color: '#ff6b00',
              mb: 2,
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
            }}
          >
            Liquidity Hub
          </Typography>
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{
              maxWidth: 700,
              mx: 'auto',
              fontSize: { xs: '1rem', sm: '1.125rem' },
            }}
          >
            Trade, provide liquidity, earn fees and rewards
          </Typography>
        </Box>

        {/* Global Liquidity Metrics */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ backgroundColor: 'rgba(255, 107, 0, 0.05)', border: '1px solid rgba(255, 107, 0, 0.2)' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Total TVL</Typography>
                <Typography variant="h5" fontWeight={700}>$4.15M</Typography>
                <Chip label="+12.3%" size="small" color="success" sx={{ mt: 1 }} />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ backgroundColor: 'rgba(255, 107, 0, 0.05)', border: '1px solid rgba(255, 107, 0, 0.2)' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">24h Volume</Typography>
                <Typography variant="h5" fontWeight={700}>$1.63M</Typography>
                <Typography variant="caption" color="text.disabled">4 active pools</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ backgroundColor: 'rgba(255, 107, 0, 0.05)', border: '1px solid rgba(255, 107, 0, 0.2)' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Your LP Value</Typography>
                <Typography variant="h5" fontWeight={700} color="primary">$0.00</Typography>
                <Typography variant="caption" color="text.disabled">0 positions</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ backgroundColor: 'rgba(255, 107, 0, 0.05)', border: '1px solid rgba(255, 107, 0, 0.2)' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Your Rewards</Typography>
                <Typography variant="h5" fontWeight={700} color="primary">0 PAIMON</Typography>
                <Typography variant="caption" color="text.disabled">Unclaimed</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Sub-navigation tabs */}
        <SubNavigation
          tabs={LIQUIDITY_TABS}
          currentTab={currentTab}
          onChange={setCurrentTab}
          variant="standard"
        />

        {/* Swap Tab */}
        {currentTab === 'swap' && (
          <>
            <Box sx={{ mb: 4, textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#ff6b00', mb: 1 }}>
                Token Swap
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Trade tokens instantly with low fees (0.25%)
              </Typography>
            </Box>

            <Grid container spacing={3} justifyContent="center">
              <Grid item xs={12} lg={5}>
                <Card sx={{ backgroundColor: 'rgba(255, 107, 0, 0.03)', border: '1px solid rgba(255, 107, 0, 0.2)' }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: '#ff9800' }}>
                      PSM Swap
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      1:1 USDC ↔ USDP exchange (0.1% fee)
                    </Typography>
                    <PSMSwapCard />
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} lg={5}>
                <Card sx={{ backgroundColor: 'rgba(255, 152, 0, 0.03)', border: '1px solid rgba(255, 152, 0, 0.2)' }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 2, color: '#ff6b00' }}>
                      DEX Swap
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Trade any token pair (0.25% fee)
                    </Typography>
                    <SwapCard />
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Alert severity="info" icon={<InfoIcon />} sx={{ mt: 4 }}>
              PSM is recommended for USDC↔USDP swaps (lower fees). Use DEX for all other pairs.
            </Alert>
          </>
        )}

        {/* Pools Tab */}
        {currentTab === 'pools' && (
          <>
            <Box sx={{ mb: 4, textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#ff6b00', mb: 1 }}>
                Liquidity Pools
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Browse pools, add/remove liquidity, earn trading fees
              </Typography>
            </Box>

            {/* Pools List Table */}
            <Card sx={{ mb: 4, backgroundColor: 'rgba(255, 107, 0, 0.02)', border: '1px solid rgba(255, 107, 0, 0.15)' }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 3, color: '#ff6b00' }}>
                  All Pools
                </Typography>
                <TableContainer sx={{ maxHeight: 440 }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Pool</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>TVL</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>24h Volume</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>APR</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Gauge Weight</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {MOCK_POOLS.map((pool) => (
                        <TableRow key={pool.id} sx={{ '&:hover': { backgroundColor: 'rgba(255, 107, 0, 0.05)' } }}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography fontWeight={600}>{pool.name}</Typography>
                              {pool.hasNitro && (
                                <Chip
                                  label="NITRO"
                                  size="small"
                                  icon={<LocalFireDepartmentIcon />}
                                  sx={{
                                    backgroundColor: '#FF5722',
                                    color: 'white',
                                    fontWeight: 700,
                                    fontSize: '0.65rem',
                                  }}
                                />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography fontWeight={600}>{pool.tvl}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography color="text.secondary">{pool.volume24h}</Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <TrendingUpIcon sx={{ color: '#4CAF50', fontSize: 18 }} />
                              <Typography fontWeight={700} color="success.main">
                                {pool.apr}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip label={pool.gaugeWeight} size="small" color="primary" />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="contained"
                              size="small"
                              startIcon={<AddIcon />}
                              sx={{ fontWeight: 700 }}
                            >
                              Add
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>

            {/* Add/Remove Liquidity Grid */}
            <Grid container spacing={3}>
              <Grid item xs={12} lg={6}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#FF9800', mb: 3 }}>
                  Add Liquidity
                </Typography>
                <AddLiquidityCard />
              </Grid>
              <Grid item xs={12} lg={6}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#FF5722', mb: 3 }}>
                  Remove Liquidity
                </Typography>
                <RemoveLiquidityCard />
              </Grid>
            </Grid>

            <Alert severity="info" icon={<MonetizationOnIcon />} sx={{ mt: 4 }}>
              Earn 0.175% of all trades proportional to your pool share. Fees accrue in real-time.
            </Alert>
          </>
        )}

        {/* My Liquidity Tab */}
        {currentTab === 'my-liquidity' && (
          <>
            <Box sx={{ mb: 4, textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#ff6b00', mb: 1 }}>
                My Liquidity & Staking
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Manage your LP positions and stake for PAIMON rewards
              </Typography>
            </Box>

            <Box sx={{ mb: 4 }}>
              <StakingCard />
            </Box>

            {!isConnected && (
              <Alert severity="info" sx={{ mt: 4 }}>
                Connect your wallet to view your liquidity positions
              </Alert>
            )}

            {/* How Liquidity Mining Works */}
            <Card sx={{ mt: 6, backgroundColor: 'rgba(255, 152, 0, 0.05)', border: '1px solid rgba(255, 152, 0, 0.2)' }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} color="primary" sx={{ mb: 2 }}>
                  How Liquidity Mining Works
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" fontWeight={700} color="primary">1</Typography>
                      <Typography variant="body2" fontWeight={600}>Select Pool</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" fontWeight={700} color="primary">2</Typography>
                      <Typography variant="body2" fontWeight={600}>Stake LP Tokens</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" fontWeight={700} color="primary">3</Typography>
                      <Typography variant="body2" fontWeight={600}>Earn PAIMON</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" fontWeight={700} color="primary">4</Typography>
                      <Typography variant="body2" fontWeight={600}>Claim Rewards</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </>
        )}

        {/* Nitro & Boost Tab */}
        {currentTab === 'nitro' && (
          <>
            <Box sx={{ mb: 4, textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#ff6b00', mb: 1 }}>
                Nitro Pools & Boost Staking
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Accelerate your rewards with Nitro pools and boost your earnings
              </Typography>
            </Box>

            {/* Nitro Pools Section */}
            <Box sx={{ mb: 6 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <LocalFireDepartmentIcon sx={{ fontSize: 32, color: '#FF5722' }} />
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#FF5722' }}>
                  Active Nitro Pools
                </Typography>
              </Box>

              <NitroPoolList pools={MOCK_NITRO_POOLS} locale="en" showFilter={false} />

              <Alert severity="warning" icon={<BoltIcon />} sx={{ mt: 3 }}>
                Nitro pools provide temporary boosted rewards. Duration and multiplier vary by pool.
              </Alert>
            </Box>

            {/* Boost Staking Section */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <DiamondIcon sx={{ fontSize: 32, color: '#D2691E' }} />
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#D2691E' }}>
                  Boost Staking
                </Typography>
              </Box>

              <Grid container spacing={3}>
                <Grid item xs={12} lg={6}>
                  <BoostStakingCard />
                </Grid>
                <Grid item xs={12} lg={6}>
                  <BoostCalculator userBalance="0" currentMultiplier={10000} />
                </Grid>
              </Grid>

              <Alert severity="info" icon={<InfoIcon />} sx={{ mt: 3 }}>
                Stake PAIMON to boost your LP rewards by up to 2.5x. Longer lock = higher boost.
              </Alert>
            </Box>
          </>
        )}

        <Box sx={{ height: { xs: 40, sm: 60 } }} />
      </Container>
    </Box>
  );
}
