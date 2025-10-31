'use client';

import { Box, Typography, LinearProgress, Grid, Chip } from '@mui/material';
import { People as PeopleIcon, Check as CheckIcon } from '@mui/icons-material';
import { ReferralData } from '@/types/tasks';

interface InviteTrackerProps {
  referralData: ReferralData;
}

/**
 * InviteTracker Component
 * Tracks invite count and referral rewards
 *
 * Displays:
 * - Total invites and rewards earned
 * - Milestone progress (1/5/10 invites)
 * - Milestone rewards status
 */
export function InviteTracker({ referralData }: InviteTrackerProps) {
  const { inviteCount, rewardsEarned, milestones } = referralData;

  return (
    <Box
      sx={{
        backgroundColor: 'background.paper',
        borderRadius: 2,
        p: 3,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <PeopleIcon sx={{ color: '#FFB74D', fontSize: 28 }} />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Referral Stats
        </Typography>
      </Box>

      {/* Stats Grid */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Total Invites */}
        <Grid item xs={6}>
          <Box
            sx={{
              backgroundColor: 'rgba(255, 183, 77, 0.1)',
              borderRadius: 1.5,
              p: 2,
              textAlign: 'center',
            }}
          >
            <Typography
              variant="h3"
              sx={{
                fontWeight: 800,
                color: '#FFB74D',
                lineHeight: 1,
              }}
            >
              {inviteCount}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Total Invites
            </Typography>
          </Box>
        </Grid>

        {/* Rewards Earned */}
        <Grid item xs={6}>
          <Box
            sx={{
              backgroundColor: 'rgba(139, 195, 74, 0.1)',
              borderRadius: 1.5,
              p: 2,
              textAlign: 'center',
            }}
          >
            <Typography
              variant="h3"
              sx={{
                fontWeight: 800,
                color: '#8BC34A',
                lineHeight: 1,
              }}
            >
              {rewardsEarned}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              USDC Earned
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {/* Milestones */}
      <Typography
        variant="subtitle2"
        sx={{
          fontWeight: 700,
          mb: 2,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          color: 'text.secondary',
        }}
      >
        Referral Milestones
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {milestones.map((milestone, index) => {
          const progress = Math.min((inviteCount / milestone.count) * 100, 100);
          const isAchieved = milestone.achieved;

          return (
            <Box
              key={index}
              sx={{
                border: '1px solid',
                borderColor: isAchieved ? '#8BC34A' : 'divider',
                borderRadius: 1.5,
                p: 2,
                backgroundColor: isAchieved ? 'rgba(139, 195, 74, 0.05)' : 'transparent',
                transition: 'all 0.2s ease-in-out',
              }}
            >
              {/* Milestone Header */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 1.5,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>
                    {milestone.count} {milestone.count === 1 ? 'Invite' : 'Invites'}
                  </Typography>
                  {isAchieved && (
                    <Chip
                      icon={<CheckIcon sx={{ fontSize: 16 }} />}
                      label="Achieved"
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(139, 195, 74, 0.1)',
                        color: '#8BC34A',
                        fontWeight: 700,
                        height: 24,
                        fontSize: '0.75rem',
                      }}
                    />
                  )}
                </Box>

                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    color: '#FFB74D',
                  }}
                >
                  {milestone.reward}
                </Typography>
              </Box>

              {/* Progress Bar */}
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'rgba(255, 183, 77, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                    backgroundColor: isAchieved ? '#8BC34A' : '#FFB74D',
                  },
                }}
              />

              {/* Progress Text */}
              {!isAchieved && (
                <Typography
                  variant="caption"
                  sx={{
                    mt: 0.5,
                    display: 'block',
                    textAlign: 'right',
                    color: 'text.secondary',
                    fontWeight: 600,
                  }}
                >
                  {inviteCount} / {milestone.count} invites
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>

      {/* Info Note */}
      <Box
        sx={{
          mt: 3,
          p: 2,
          backgroundColor: 'rgba(255, 107, 53, 0.05)',
          borderRadius: 1.5,
          border: '1px solid rgba(255, 107, 53, 0.2)',
        }}
      >
        <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
          Each successful referral earns you 5 USDC. Reach milestones to unlock better dice types
          and earn bonus rolls!
        </Typography>
      </Box>
    </Box>
  );
}
