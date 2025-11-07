/**
 * Discover Hub - Launchpad (V3 - 探索中心)
 *
 * 功能: RWA 项目 Launchpad + 数据分析
 * 路由: /launchpad
 * Tabs: Projects | Analytics
 *
 * 设计理念:
 * - Projects: 项目列表 + Funnel 流程可视化（募资 → 审批 → 参与 → 结算）
 * - Analytics: 历史数据 + 行业趋势分析
 * - 侧栏固定: 系统指标（总募资额、项目数、参与用户）
 */

'use client';

import { Container, Typography, Box, Grid, Card, CardContent, Alert, Chip } from '@mui/material';
import { Navigation } from '@/components/layout/Navigation';
import { SubNavigation, useTabState } from '@/components/layout/SubNavigation';
import { ProjectList } from '@/components/launchpad/ProjectList';
import { useSystemMetrics } from '@/hooks/useSystemMetrics';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import GroupIcon from '@mui/icons-material/Group';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';

export default function LaunchpadHub() {
  const [currentTab, setCurrentTab] = useTabState('projects');

  // System metrics for global launchpad stats
  const metrics = useSystemMetrics();

  const LAUNCHPAD_TABS = [
    { value: 'projects', label: 'Projects' },
    { value: 'analytics', label: 'Analytics' },
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
            Discover Hub
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
            Explore RWA tokenization projects and participate in fundraising
          </Typography>
        </Box>

        {/* Global Launchpad Metrics */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ backgroundColor: 'rgba(255, 107, 0, 0.05)', border: '1px solid rgba(255, 107, 0, 0.2)' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Total Raised</Typography>
                <Typography variant="h5" fontWeight={700}>${metrics.totalRaised}</Typography>
                <Typography variant="caption" color="text.disabled">Across all projects</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ backgroundColor: 'rgba(255, 107, 0, 0.05)', border: '1px solid rgba(255, 107, 0, 0.2)' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Active Projects</Typography>
                <Typography variant="h5" fontWeight={700}>{metrics.activeProjects}</Typography>
                <Chip label="Fundraising" size="small" sx={{ mt: 1 }} />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ backgroundColor: 'rgba(255, 107, 0, 0.05)', border: '1px solid rgba(255, 107, 0, 0.2)' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Participants</Typography>
                <Typography variant="h5" fontWeight={700} color="primary">{metrics.totalParticipants}</Typography>
                <Typography variant="caption" color="text.disabled">Unique investors</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ backgroundColor: 'rgba(255, 107, 0, 0.05)', border: '1px solid rgba(255, 107, 0, 0.2)' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Avg. Success Rate</Typography>
                <Typography variant="h5" fontWeight={700}>
                  {metrics.activeProjects > 0
                    ? ((metrics.activeProjects / (metrics.activeProjects + 1)) * 100).toFixed(2)
                    : '0.00'}%
                </Typography>
                <Typography variant="caption" color="text.disabled">Funded projects</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Sub-navigation tabs */}
        <SubNavigation
          tabs={LAUNCHPAD_TABS}
          currentTab={currentTab}
          onChange={setCurrentTab}
          variant="standard"
        />

        {/* Projects Tab */}
        {currentTab === 'projects' && (
          <>
            <Box sx={{ mb: 4, textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#ff6b00', mb: 1 }}>
                RWA Tokenization Projects
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Browse and invest in real-world asset projects with full governance approval
              </Typography>
            </Box>

            {/* Launchpad Funnel Process */}
            <Card sx={{ mb: 4, backgroundColor: 'rgba(255, 152, 0, 0.03)', border: '2px dashed rgba(255, 152, 0, 0.3)' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 3 }}>
                  <RocketLaunchIcon sx={{ fontSize: 28, color: '#ff6b00' }} />
                  <Typography variant="h6" fontWeight={700} color="primary">
                    Launchpad Funnel Process
                  </Typography>
                </Box>

                <Grid container spacing={2} alignItems="center">
                  {/* Step 1: Fundraising */}
                  <Grid item xs={12} md={2.5}>
                    <Box
                      sx={{
                        p: 2,
                        backgroundColor: 'rgba(255, 107, 0, 0.1)',
                        borderRadius: 2,
                        textAlign: 'center',
                        border: '2px solid rgba(255, 107, 0, 0.3)',
                      }}
                    >
                      <RocketLaunchIcon sx={{ fontSize: 40, color: '#ff6b00', mb: 1 }} />
                      <Typography variant="h6" fontWeight={700} sx={{ color: '#ff6b00', mb: 0.5 }}>
                        1. Fundraising
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Project listed, users invest
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={0.5} sx={{ textAlign: 'center' }}>
                    <ArrowForwardIcon sx={{ color: '#ff6b00', fontSize: 32, transform: { xs: 'rotate(90deg)', md: 'none' } }} />
                  </Grid>

                  {/* Step 2: Governance Approval */}
                  <Grid item xs={12} md={2.5}>
                    <Box
                      sx={{
                        p: 2,
                        backgroundColor: 'rgba(255, 152, 0, 0.1)',
                        borderRadius: 2,
                        textAlign: 'center',
                        border: '2px solid rgba(255, 152, 0, 0.3)',
                      }}
                    >
                      <HowToVoteIcon sx={{ fontSize: 40, color: '#FF9800', mb: 1 }} />
                      <Typography variant="h6" fontWeight={700} sx={{ color: '#FF9800', mb: 0.5 }}>
                        2. Approval
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        veNFT governance vote
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={0.5} sx={{ textAlign: 'center' }}>
                    <ArrowForwardIcon sx={{ color: '#ff6b00', fontSize: 32, transform: { xs: 'rotate(90deg)', md: 'none' } }} />
                  </Grid>

                  {/* Step 3: Participation */}
                  <Grid item xs={12} md={2.5}>
                    <Box
                      sx={{
                        p: 2,
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        borderRadius: 2,
                        textAlign: 'center',
                        border: '2px solid rgba(76, 175, 80, 0.3)',
                      }}
                    >
                      <GroupIcon sx={{ fontSize: 40, color: '#4CAF50', mb: 1 }} />
                      <Typography variant="h6" fontWeight={700} sx={{ color: '#4CAF50', mb: 0.5 }}>
                        3. Participation
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Users receive RWA tokens
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={0.5} sx={{ textAlign: 'center' }}>
                    <ArrowForwardIcon sx={{ color: '#ff6b00', fontSize: 32, transform: { xs: 'rotate(90deg)', md: 'none' } }} />
                  </Grid>

                  {/* Step 4: Settlement */}
                  <Grid item xs={12} md={2.5}>
                    <Box
                      sx={{
                        p: 2,
                        backgroundColor: 'rgba(139, 69, 19, 0.1)',
                        borderRadius: 2,
                        textAlign: 'center',
                        border: '2px solid rgba(139, 69, 19, 0.3)',
                      }}
                    >
                      <AccountBalanceIcon sx={{ fontSize: 40, color: '#8B4513', mb: 1 }} />
                      <Typography variant="h6" fontWeight={700} sx={{ color: '#8B4513', mb: 0.5 }}>
                        4. Settlement
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Funds → Treasury, whitelist RWA
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                <Alert severity="info" icon={<InfoIcon />} sx={{ mt: 3 }}>
                  All projects require vePAIMON governance approval before settlement. This ensures community oversight and quality control.
                </Alert>
              </CardContent>
            </Card>

            {/* Project List */}
            <Card>
              <CardContent>
                <ProjectList />
              </CardContent>
            </Card>
          </>
        )}

        {/* Analytics Tab */}
        {currentTab === 'analytics' && (
          <>
            <Box sx={{ mb: 4, textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#ff6b00', mb: 1 }}>
                Launchpad Analytics
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Historical data and trend analysis for RWA projects
              </Typography>
            </Box>

            {/* Analytics Overview Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                      Fundraising Timeline
                    </Typography>
                    <Alert severity="info">
                      Historical fundraising data visualization coming soon. Track project progress from listing to settlement.
                    </Alert>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                      Approval Rate
                    </Typography>
                    <Alert severity="info">
                      Governance approval statistics coming soon. View voting trends and project success rates.
                    </Alert>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                      Investor Analytics
                    </Typography>
                    <Alert severity="info">
                      Participant metrics coming soon. Analyze investment patterns and user engagement.
                    </Alert>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Asset Tier Distribution */}
            <Card sx={{ backgroundColor: 'rgba(255, 152, 0, 0.05)', border: '1px solid rgba(255, 152, 0, 0.2)' }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} color="primary" sx={{ mb: 2 }}>
                  RWA Asset Tier Distribution
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ p: 2, backgroundColor: 'background.paper', borderRadius: 2 }}>
                      <Chip label="Tier 1" color="success" size="small" sx={{ mb: 1 }} />
                      <Typography variant="body2" fontWeight={600}>US Treasuries</Typography>
                      <Typography variant="h5" fontWeight={700} color="success.main">0 Projects</Typography>
                      <Typography variant="caption" color="text.disabled">$0.00 Raised</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ p: 2, backgroundColor: 'background.paper', borderRadius: 2 }}>
                      <Chip label="Tier 2" color="warning" size="small" sx={{ mb: 1 }} />
                      <Typography variant="body2" fontWeight={600}>Investment Grade Credit</Typography>
                      <Typography variant="h5" fontWeight={700} color="warning.main">0 Projects</Typography>
                      <Typography variant="caption" color="text.disabled">$0.00 Raised</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ p: 2, backgroundColor: 'background.paper', borderRadius: 2 }}>
                      <Chip label="Tier 3" color="error" size="small" sx={{ mb: 1 }} />
                      <Typography variant="body2" fontWeight={600}>RWA Revenue Pools</Typography>
                      <Typography variant="h5" fontWeight={700} color="error.main">0 Projects</Typography>
                      <Typography variant="caption" color="text.disabled">$0.00 Raised</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </>
        )}

        <Box sx={{ height: { xs: 40, sm: 60 } }} />
      </Container>
    </Box>
  );
}
