'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
} from '@mui/material';
import { ContentCopy as CopyIcon, Share as ShareIcon } from '@mui/icons-material';
import { ReferralData } from '@/types/tasks';

interface ReferralCodeDisplayProps {
  referralData: ReferralData;
  onGenerateCode?: () => Promise<void>;
}

/**
 * ReferralCodeDisplay Component
 * Displays user's referral code with copy functionality
 *
 * Features:
 * - Display referral code
 * - One-click copy to clipboard
 * - Share button (future: native share API)
 * - Generate code if not exists
 */
export function ReferralCodeDisplay({ referralData, onGenerateCode }: ReferralCodeDisplayProps) {
  const [showCopied, setShowCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralData.code);
      setShowCopied(true);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleShare = async () => {
    const shareText = `Join Paimon DEX with my referral code: ${referralData.code}\n\nEarn USDC rewards and unlock exclusive dice bonuses!`;
    const shareUrl = `${window.location.origin}/presale/mint?ref=${referralData.code}`;

    // Try native share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Paimon DEX',
          text: shareText,
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled or error
        console.error('Share failed:', error);
      }
    } else {
      // Fallback: Copy share text to clipboard
      try {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        setShowCopied(true);
      } catch (error) {
        console.error('Failed to copy share text:', error);
      }
    }
  };

  const handleGenerate = async () => {
    if (!onGenerateCode) return;

    setIsGenerating(true);
    try {
      await onGenerateCode();
    } finally {
      setIsGenerating(false);
    }
  };

  // If no code exists, show generate button
  if (!referralData.code) {
    return (
      <Box
        sx={{
          backgroundColor: 'background.paper',
          borderRadius: 2,
          p: 3,
          border: '1px solid',
          borderColor: 'divider',
          textAlign: 'center',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          Generate Your Referral Code
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Create your unique referral code to invite friends and earn 5 USDC per invite
        </Typography>
        <Button
          variant="contained"
          onClick={handleGenerate}
          disabled={isGenerating}
          sx={{
            py: 1.5,
            px: 4,
            fontWeight: 700,
            textTransform: 'none',
            fontSize: '1rem',
            backgroundColor: '#FF6B35',
            '&:hover': {
              backgroundColor: '#FF5722',
            },
          }}
        >
          {isGenerating ? 'Generating...' : 'Generate Referral Code'}
        </Button>
      </Box>
    );
  }

  // Display existing code
  return (
    <>
      <Box
        sx={{
          backgroundColor: 'background.paper',
          borderRadius: 2,
          p: 3,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Your Referral Code
        </Typography>

        <Box
          sx={{
            display: 'flex',
            gap: 1,
            alignItems: 'stretch',
          }}
        >
          {/* Code Display */}
          <TextField
            value={referralData.code}
            fullWidth
            InputProps={{
              readOnly: true,
              sx: {
                fontFamily: 'monospace',
                fontSize: '1.125rem',
                fontWeight: 600,
                backgroundColor: 'rgba(255, 107, 53, 0.05)',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#FF6B35',
                  borderWidth: 2,
                },
              },
            }}
          />

          {/* Copy Button */}
          <Tooltip title="Copy to clipboard">
            <IconButton
              onClick={handleCopy}
              sx={{
                backgroundColor: '#FF6B35',
                color: 'white',
                width: 48,
                height: 48,
                '&:hover': {
                  backgroundColor: '#FF5722',
                },
              }}
            >
              <CopyIcon />
            </IconButton>
          </Tooltip>

          {/* Share Button */}
          <Tooltip title="Share">
            <IconButton
              onClick={handleShare}
              sx={{
                backgroundColor: '#FFB74D',
                color: 'white',
                width: 48,
                height: 48,
                '&:hover': {
                  backgroundColor: '#FFA726',
                },
              }}
            >
              <ShareIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Referral URL (optional, for desktop users) */}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            mt: 1,
            display: 'block',
            wordBreak: 'break-all',
          }}
        >
          Referral link:{' '}
          <Box component="span" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
            {window.location.origin}/presale/mint?ref={referralData.code}
          </Box>
        </Typography>
      </Box>

      {/* Snackbar for copy confirmation */}
      <Snackbar
        open={showCopied}
        autoHideDuration={2000}
        onClose={() => setShowCopied(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setShowCopied(false)}
          severity="success"
          sx={{
            backgroundColor: '#8BC34A',
            color: 'white',
            fontWeight: 600,
          }}
        >
          Copied to clipboard!
        </Alert>
      </Snackbar>
    </>
  );
}
