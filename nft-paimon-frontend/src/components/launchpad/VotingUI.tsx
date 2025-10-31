'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Button,
  LinearProgress,
  Alert,
  Divider,
  CircularProgress,
} from '@mui/material';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import type { RWAProject } from '@/types/launchpad';

interface VotingUIProps {
  project: RWAProject;
}

type VoteType = 'approve' | 'reject';

/**
 * VotingUI Component
 *
 * veNFT governance voting interface for project approval/rejection
 *
 * Features:
 * - Display approve/reject vote counts
 * - Show user's voting power from veNFT balance
 * - Approve and Reject voting buttons
 * - Already voted status check
 * - Vote confirmation and transaction processing
 * - Visual representation of vote distribution
 *
 * TODO: Integration points for wagmi hooks:
 * - useAccount() - for wallet connection
 * - useReadContract() - for veNFT balance (voting power)
 * - useReadContract() - for hasVoted() status
 * - useWriteContract() - for vote() transaction
 */
export function VotingUI({ project }: VotingUIProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [votedFor, setVotedFor] = useState<VoteType | null>(null);

  // TODO: Replace with actual wagmi hooks
  // const { address, isConnected } = useAccount();
  // const { data: votingPower } = useReadContract({ contract: veNFT, function: 'balanceOf' });
  // const { data: hasVoted } = useReadContract({ contract: ProjectRegistry, function: 'hasVoted' });
  const isConnected = false; // Mock: wallet not connected
  const votingPower = BigInt('500000000000000000'); // Mock: 0.5 voting power
  const hasVoted = false; // Mock: user hasn't voted yet

  const totalVotes = project.approveVotes + project.rejectVotes;
  const approvePercentage =
    totalVotes > 0 ? (Number(project.approveVotes) / Number(totalVotes)) * 100 : 0;
  const rejectPercentage =
    totalVotes > 0 ? (Number(project.rejectVotes) / Number(totalVotes)) * 100 : 0;

  const formatVotingPower = (power: bigint): string => {
    return (Number(power) / 1e18).toFixed(2);
  };

  const handleVote = async (voteType: VoteType) => {
    if (hasVoted || !isConnected) return;

    setIsProcessing(true);
    try {
      // TODO: Implement actual voting transaction with wagmi
      // const { hash } = await writeContract({
      //   address: PROJECT_REGISTRY_ADDRESS,
      //   abi: ProjectRegistryABI,
      //   functionName: 'vote',
      //   args: [project.id, voteType === 'approve'],
      // });
      // await waitForTransaction({ hash });

      console.log('Vote transaction:', {
        projectId: project.id,
        voteType,
        votingPower,
      });

      // Mock delay for demo
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setVotedFor(voteType);
      alert(`Vote submitted successfully! You voted to ${voteType} this project.`);
    } catch (error) {
      console.error('Voting failed:', error);
      alert('Voting transaction failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isConnected) {
    return (
      <Card
        sx={{
          borderRadius: 2,
          border: '2px solid #FFB74D',
          backgroundColor: '#FFF8F0',
        }}
      >
        <CardContent>
          <Box textAlign="center" py={3}>
            <HowToVoteIcon sx={{ fontSize: 48, color: '#FFB74D', mb: 2 }} />
            <Typography variant="h6" fontWeight="bold" color="#FFB74D" mb={1}>
              Connect to Vote
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Connect your wallet to participate in governance voting
            </Typography>
            <Button
              variant="contained"
              fullWidth
              sx={{
                backgroundColor: '#FFB74D',
                color: 'white',
                fontWeight: 'bold',
                '&:hover': { backgroundColor: '#FFD54F' },
              }}
              onClick={() => {
                // TODO: Trigger wallet connection
                console.log('Connect wallet clicked');
              }}
            >
              Connect Wallet
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (hasVoted || votedFor) {
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
            <ThumbUpIcon sx={{ fontSize: 48, color: '#8BC34A', mb: 2 }} />
            <Typography variant="h6" fontWeight="bold" color="#8BC34A" mb={1}>
              Vote Submitted
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              You have already voted on this project
            </Typography>
            <Typography variant="body2" fontWeight="600">
              Your vote: {votedFor || 'Approve'}
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
        border: '2px solid #FFB74D',
        backgroundColor: '#FFFFFF',
      }}
    >
      <CardContent>
        <Typography variant="h6" fontWeight="bold" color="#FFB74D" mb={3}>
          Governance Voting
        </Typography>

        {/* Voting Power Display */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
          p={2}
          sx={{
            backgroundColor: '#FFF8F0',
            borderRadius: 2,
            border: '1px solid #FFE0B2',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Your Voting Power
          </Typography>
          <Typography variant="body1" fontWeight="bold" color="#FFB74D">
            {formatVotingPower(votingPower)} veNFT
          </Typography>
        </Box>

        {/* Vote Distribution */}
        <Typography variant="subtitle2" fontWeight="bold" mb={2}>
          Current Vote Distribution
        </Typography>

        <Box mb={3}>
          {/* Approve Votes */}
          <Box mb={2}>
            <Box display="flex" justifyContent="space-between" mb={0.5}>
              <Typography variant="body2" color="#8BC34A" fontWeight="600">
                ✓ Approve
              </Typography>
              <Typography variant="body2" fontWeight="600">
                {formatVotingPower(project.approveVotes)} ({approvePercentage.toFixed(1)}
                %)
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={approvePercentage}
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
          </Box>

          {/* Reject Votes */}
          <Box>
            <Box display="flex" justifyContent="space-between" mb={0.5}>
              <Typography variant="body2" color="#F44336" fontWeight="600">
                ✗ Reject
              </Typography>
              <Typography variant="body2" fontWeight="600">
                {formatVotingPower(project.rejectVotes)} ({rejectPercentage.toFixed(1)}%)
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={rejectPercentage}
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
        </Box>

        <Divider sx={{ my: 3, borderColor: '#FFE0B2' }} />

        {/* Voting Buttons */}
        <Typography variant="subtitle2" fontWeight="bold" mb={2}>
          Cast Your Vote
        </Typography>

        <Box display="flex" gap={2} mb={3}>
          <Button
            variant="contained"
            fullWidth
            disabled={isProcessing}
            onClick={() => handleVote('approve')}
            startIcon={
              isProcessing && votedFor === 'approve' ? (
                <CircularProgress size={16} sx={{ color: 'white' }} />
              ) : (
                <ThumbUpIcon />
              )
            }
            sx={{
              backgroundColor: '#8BC34A',
              color: 'white',
              fontWeight: 'bold',
              py: 1.5,
              '&:hover': { backgroundColor: '#9CCC65' },
              '&:disabled': {
                backgroundColor: '#E0E0E0',
                color: '#9E9E9E',
              },
            }}
          >
            Approve
          </Button>

          <Button
            variant="contained"
            fullWidth
            disabled={isProcessing}
            onClick={() => handleVote('reject')}
            startIcon={
              isProcessing && votedFor === 'reject' ? (
                <CircularProgress size={16} sx={{ color: 'white' }} />
              ) : (
                <ThumbDownIcon />
              )
            }
            sx={{
              backgroundColor: '#F44336',
              color: 'white',
              fontWeight: 'bold',
              py: 1.5,
              '&:hover': { backgroundColor: '#EF5350' },
              '&:disabled': {
                backgroundColor: '#E0E0E0',
                color: '#9E9E9E',
              },
            }}
          >
            Reject
          </Button>
        </Box>

        {/* Voting Info */}
        <Alert
          severity="info"
          icon={<InfoOutlinedIcon />}
          sx={{ backgroundColor: '#FFF8F0' }}
        >
          <Typography variant="caption">
            Your vote is weighted by your veNFT balance. Once you vote, it cannot be
            changed. Please review compliance documents before voting.
          </Typography>
        </Alert>
      </CardContent>
    </Card>
  );
}
