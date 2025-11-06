'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Button,
  Alert,
  LinearProgress,
  CircularProgress,
  Divider,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import type { RWAProject } from '@/types/launchpad';

interface VoteExecutionPanelProps {
  project: RWAProject;
}

/**
 * VoteExecutionPanel Component
 *
 * Display vote execution button when threshold is met
 *
 * Features:
 * - Vote threshold progress indicator
 * - Execute vote button (enabled when >50% voting power reached)
 * - Transaction processing state
 * - Success/failure feedback
 * - Anyone can execute (not just voters)
 *
 * TODO: Integration with wagmi
 * - useReadContract to check if threshold met
 * - useReadContract to check if already executed
 * - useWriteContract for executeVote() transaction
 * - useWaitForTransaction for confirmation
 */
export function VoteExecutionPanel({ project }: VoteExecutionPanelProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executed, setExecuted] = useState(false);

  // TODO: Replace with actual wagmi hooks
  // const { data: totalVotingPower } = useReadContract({
  //   address: VOTING_ESCROW_ADDRESS,
  //   abi: VotingEscrowABI,
  //   functionName: 'totalSupply',
  // });
  // const { data: isExecuted } = useReadContract({
  //   address: PROJECT_REGISTRY_ADDRESS,
  //   abi: ProjectRegistryABI,
  //   functionName: 'isVoteExecuted',
  //   args: [project.id],
  // });

  // Mock data
  const totalVotingPower = BigInt('10000000000000000000'); // 10 total voting power
  const totalVotes = project.approveVotes + project.rejectVotes;
  const approvePercentage = totalVotes > 0
    ? (Number(project.approveVotes) / Number(totalVotingPower)) * 100
    : 0;
  const rejectPercentage = totalVotes > 0
    ? (Number(project.rejectVotes) / Number(totalVotingPower)) * 100
    : 0;

  const thresholdMet = approvePercentage > 50 || rejectPercentage > 50;
  const voteOutcome = approvePercentage > 50 ? 'approve' : rejectPercentage > 50 ? 'reject' : null;

  const formatVotingPower = (power: bigint): string => {
    return (Number(power) / 1e18).toFixed(2);
  };

  const handleExecuteVote = async () => {
    if (!thresholdMet || executed) return;

    setIsExecuting(true);
    try {
      // TODO: Implement actual execute vote transaction
      // const { hash } = await writeContract({
      //   address: PROJECT_REGISTRY_ADDRESS,
      //   abi: ProjectRegistryABI,
      //   functionName: 'executeVote',
      //   args: [project.id],
      // });
      // await waitForTransaction({ hash });

      // Mock delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setExecuted(true);
      alert('Vote executed successfully! Project status updated.');
    } catch (error) {
      console.error('Vote execution failed:', error);
      alert('Failed to execute vote. Please try again.');
    } finally {
      setIsExecuting(false);
    }
  };

  if (executed) {
    return (
      <Card
        sx={{
          borderRadius: 2,
          border: '2px solid #8BC34A',
          backgroundColor: '#F1F8E9',
        }}
      >
        <CardContent>
          <Box textAlign="center" py={3}>
            <CheckCircleOutlineIcon
              sx={{ fontSize: 64, color: '#8BC34A', mb: 2 }}
            />
            <Typography variant="h6" fontWeight="bold" color="#8BC34A" mb={1}>
              Vote Executed
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              The voting result has been executed successfully
            </Typography>
            <Typography variant="body2" fontWeight="600">
              Outcome: Project {voteOutcome === 'approve' ? 'Approved ✓' : 'Rejected ✗'}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        borderRadius: 2,
        border: thresholdMet ? '2px solid #FF6B35' : '1px solid #FFE0B2',
        backgroundColor: thresholdMet ? '#FFF8F0' : '#FFFFFF',
      }}
    >
      <CardContent>
        <Typography variant="h6" fontWeight="bold" color="#FF6B35" mb={2}>
          Vote Execution
        </Typography>

        {/* Threshold Progress */}
        <Box mb={3}>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="body2" color="text.secondary">
              Approve Threshold Progress
            </Typography>
            <Typography variant="body2" fontWeight="600" color="#8BC34A">
              {approvePercentage.toFixed(1)}% / 50%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.min(approvePercentage, 100)}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: '#E0E0E0',
              '& .MuiLinearProgress-bar': {
                backgroundColor: '#8BC34A',
                borderRadius: 4,
              },
            }}
          />

          <Box display="flex" justifyContent="space-between" mb={1} mt={2}>
            <Typography variant="body2" color="text.secondary">
              Reject Threshold Progress
            </Typography>
            <Typography variant="body2" fontWeight="600" color="#F44336">
              {rejectPercentage.toFixed(1)}% / 50%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.min(rejectPercentage, 100)}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: '#E0E0E0',
              '& .MuiLinearProgress-bar': {
                backgroundColor: '#F44336',
                borderRadius: 4,
              },
            }}
          />
        </Box>

        <Divider sx={{ my: 2, borderColor: '#FFE0B2' }} />

        {/* Vote Statistics */}
        <Box mb={3}>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="body2" color="text.secondary">
              Total Approve Votes
            </Typography>
            <Typography variant="body2" fontWeight="600">
              {formatVotingPower(project.approveVotes)}
            </Typography>
          </Box>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="body2" color="text.secondary">
              Total Reject Votes
            </Typography>
            <Typography variant="body2" fontWeight="600">
              {formatVotingPower(project.rejectVotes)}
            </Typography>
          </Box>
          <Box display="flex" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">
              Total Voting Power
            </Typography>
            <Typography variant="body2" fontWeight="600">
              {formatVotingPower(totalVotingPower)}
            </Typography>
          </Box>
        </Box>

        {/* Execute Button */}
        {thresholdMet ? (
          <>
            <Alert
              severity="success"
              sx={{ mb: 2, backgroundColor: '#F1F8E9' }}
              icon={<CheckCircleOutlineIcon />}
            >
              <Typography variant="body2" fontWeight="600">
                Threshold Met: {voteOutcome === 'approve' ? 'Approved' : 'Rejected'}
              </Typography>
              <Typography variant="caption">
                The vote can now be executed by anyone to update the project status.
              </Typography>
            </Alert>

            <Button
              variant="contained"
              fullWidth
              disabled={isExecuting}
              onClick={handleExecuteVote}
              startIcon={
                isExecuting ? (
                  <CircularProgress size={20} sx={{ color: 'white' }} />
                ) : (
                  <PlayArrowIcon />
                )
              }
              sx={{
                backgroundColor: '#FF6B35',
                color: 'white',
                fontWeight: 'bold',
                py: 1.5,
                '&:hover': { backgroundColor: '#FF8A65' },
                '&:disabled': {
                  backgroundColor: '#E0E0E0',
                  color: '#9E9E9E',
                },
              }}
            >
              {isExecuting ? 'Executing...' : 'Execute Vote'}
            </Button>
          </>
        ) : (
          <Alert
            severity="info"
            sx={{ backgroundColor: '#FFF8F0' }}
            icon={<InfoOutlinedIcon />}
          >
            <Typography variant="caption">
              The vote execution threshold has not been met yet. Continue voting to
              reach {'>'}50% of total voting power for either approve or reject.
            </Typography>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
