'use client';

import {
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
  Alert,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HowToVoteIcon from '@mui/icons-material/HowToVote';

interface VoteRecord {
  projectId: number;
  projectName: string;
  voteType: 'approve' | 'reject';
  votingPower: bigint;
  timestamp: number;
  executed: boolean;
}

interface VoteHistoryProps {
  userAddress: string;
}

/**
 * VoteHistory Component
 *
 * Display user's voting history across all projects
 *
 * Features:
 * - Table view of all past votes
 * - Vote type indicators (approve/reject)
 * - Voting power used for each vote
 * - Execution status
 * - Timestamp display
 *
 * TODO: Integration with wagmi
 * - useReadContract to fetch vote history from ProjectRegistry
 * - Filter by user address
 * - Real-time updates on new votes
 */
export function VoteHistory({ userAddress }: VoteHistoryProps) {
  // TODO: Replace with actual wagmi hook
  // const { data: voteHistory } = useReadContract({
  //   address: PROJECT_REGISTRY_ADDRESS,
  //   abi: ProjectRegistryABI,
  //   functionName: 'getUserVoteHistory',
  //   args: [userAddress],
  // });

  // Mock data for demonstration
  const mockVoteHistory: VoteRecord[] = [
    {
      projectId: 1,
      projectName: 'RWA Project #1',
      voteType: 'approve',
      votingPower: BigInt('500000000000000000'), // 0.5 voting power
      timestamp: Date.now() - 86400000 * 5, // 5 days ago
      executed: true,
    },
    {
      projectId: 2,
      projectName: 'RWA Project #2',
      voteType: 'reject',
      votingPower: BigInt('300000000000000000'), // 0.3 voting power
      timestamp: Date.now() - 86400000 * 10, // 10 days ago
      executed: false,
    },
  ];

  const voteHistory = mockVoteHistory;

  const formatVotingPower = (power: bigint): string => {
    return (Number(power) / 1e18).toFixed(2);
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (voteHistory.length === 0) {
    return (
      <Card sx={{ borderRadius: 2, border: '1px solid #FFE0B2' }}>
        <CardContent>
          <Box textAlign="center" py={4}>
            <HowToVoteIcon sx={{ fontSize: 48, color: '#FFB74D', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" mb={1}>
              No Voting History
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You haven&apos;t cast any votes yet
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ borderRadius: 2, border: '1px solid #FFE0B2' }}>
      <CardContent>
        <Typography variant="h6" fontWeight="bold" color="#FF6B35" mb={3}>
          Your Voting History
        </Typography>

        <TableContainer sx={{ maxHeight: 440 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight="600">
                    Project
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight="600">
                    Vote
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="subtitle2" fontWeight="600">
                    Voting Power
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight="600">
                    Date
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="subtitle2" fontWeight="600">
                    Status
                  </Typography>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {voteHistory.map((record, index) => (
                <TableRow
                  key={index}
                  sx={{
                    '&:last-child td, &:last-child th': { border: 0 },
                    '&:hover': { backgroundColor: '#FFF8F0' },
                  }}
                >
                  <TableCell>
                    <Typography variant="body2">{record.projectName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      #{record.projectId}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {record.voteType === 'approve' ? (
                      <Chip
                        icon={<CheckCircleIcon />}
                        label="Approve"
                        size="small"
                        sx={{
                          backgroundColor: '#C8E6C9',
                          color: '#2E7D32',
                          fontWeight: 600,
                        }}
                      />
                    ) : (
                      <Chip
                        icon={<CancelIcon />}
                        label="Reject"
                        size="small"
                        sx={{
                          backgroundColor: '#FFCDD2',
                          color: '#C62828',
                          fontWeight: 600,
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="600">
                      {formatVotingPower(record.votingPower)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatTimestamp(record.timestamp)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={record.executed ? 'Executed' : 'Pending'}
                      size="small"
                      sx={{
                        backgroundColor: record.executed ? '#8BC34A' : '#FFB74D',
                        color: 'white',
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Alert
          severity="info"
          sx={{ mt: 3, backgroundColor: '#FFF8F0' }}
          icon={<HowToVoteIcon />}
        >
          <Typography variant="caption">
            Your vote history is permanent and cannot be changed. Voting power is
            calculated at the time of voting based on your veNFT balance.
          </Typography>
        </Alert>
      </CardContent>
    </Card>
  );
}
