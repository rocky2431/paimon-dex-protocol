'use client';

import React from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Stack,
} from '@mui/material';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import Link from 'next/link';

export interface ComingSoonProps {
  /**
   * Feature name to display
   */
  featureName: string;

  /**
   * Optional description of the feature
   */
  description?: string;

  /**
   * Optional estimated release date
   */
  estimatedRelease?: string;

  /**
   * Locale for translations
   */
  locale?: 'en' | 'zh';

  /**
   * Optional custom return URL (defaults to '/')
   */
  returnUrl?: string;
}

/**
 * ComingSoon Component
 *
 * Displays a placeholder page for features under development.
 * Follows Material Design 3 with warm color palette.
 *
 * @example
 * ```tsx
 * <ComingSoon
 *   featureName="Lending Protocol"
 *   description="Decentralized lending and borrowing"
 *   estimatedRelease="Q2 2025"
 *   locale="en"
 * />
 * ```
 */
export function ComingSoon({
  featureName,
  description,
  estimatedRelease,
  locale = 'en',
  returnUrl = '/',
}: ComingSoonProps) {
  const t = locale === 'zh' ? translations.zh : translations.en;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #FFF8E1 0%, #FFE4B5 100%)',
        py: 8,
      }}
    >
      <Container maxWidth="md">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 4, sm: 6, md: 8 },
            textAlign: 'center',
            borderRadius: 4,
            border: '2px solid',
            borderColor: 'primary.light',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            boxShadow: '0 8px 32px rgba(255, 152, 0, 0.15)',
          }}
        >
          {/* Icon */}
          <Box
            sx={{
              mb: 4,
              display: 'flex',
              justifyContent: 'center',
              animation: 'float 3s ease-in-out infinite',
              '@keyframes float': {
                '0%, 100%': { transform: 'translateY(0)' },
                '50%': { transform: 'translateY(-10px)' },
              },
            }}
          >
            <Box
              sx={{
                width: 100,
                height: 100,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #FF9800 0%, #FF5722 100%)',
                boxShadow: '0 8px 24px rgba(255, 152, 0, 0.3)',
              }}
            >
              <RocketLaunchIcon sx={{ fontSize: 60, color: 'white' }} />
            </Box>
          </Box>

          {/* Title */}
          <Typography
            variant="h3"
            sx={{
              mb: 2,
              fontWeight: 700,
              background: 'linear-gradient(90deg, #FF9800, #FF5722)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {t.comingSoon}
          </Typography>

          {/* Feature Name */}
          <Typography
            variant="h5"
            sx={{
              mb: 3,
              color: 'text.primary',
              fontWeight: 600,
            }}
          >
            {featureName}
          </Typography>

          {/* Description */}
          {description && (
            <Typography
              variant="body1"
              sx={{
                mb: 4,
                color: 'text.secondary',
                maxWidth: 600,
                mx: 'auto',
                lineHeight: 1.7,
              }}
            >
              {description}
            </Typography>
          )}

          {/* Estimated Release */}
          {estimatedRelease && (
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              justifyContent="center"
              sx={{
                mb: 4,
                p: 2,
                borderRadius: 2,
                backgroundColor: 'rgba(255, 152, 0, 0.08)',
              }}
            >
              <AccessTimeIcon sx={{ color: 'primary.main' }} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t.estimatedRelease}: <strong>{estimatedRelease}</strong>
              </Typography>
            </Stack>
          )}

          {/* Under Development Message */}
          <Typography
            variant="body2"
            sx={{
              mb: 4,
              color: 'text.secondary',
              fontStyle: 'italic',
            }}
          >
            {t.underDevelopment}
          </Typography>

          {/* Return Button */}
          <Button
            component={Link}
            href={returnUrl}
            variant="contained"
            size="large"
            sx={{
              px: 4,
              py: 1.5,
              borderRadius: 3,
              background: 'linear-gradient(90deg, #FF9800, #FF5722)',
              boxShadow: '0 4px 12px rgba(255, 152, 0, 0.3)',
              '&:hover': {
                background: 'linear-gradient(90deg, #F57C00, #E64A19)',
                boxShadow: '0 6px 16px rgba(255, 152, 0, 0.4)',
              },
            }}
          >
            {t.returnHome}
          </Button>
        </Paper>

        {/* Bottom Message */}
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            textAlign: 'center',
            mt: 4,
            color: 'text.secondary',
          }}
        >
          {t.stayTuned}
        </Typography>
      </Container>
    </Box>
  );
}

// Translations
const translations = {
  en: {
    comingSoon: 'Coming Soon',
    estimatedRelease: 'Estimated Release',
    underDevelopment:
      'This feature is currently under development. Stay tuned for updates!',
    returnHome: 'Return to Home',
    stayTuned: 'Stay tuned for more exciting features 🚀',
  },
  zh: {
    comingSoon: '即将推出',
    estimatedRelease: '预计发布时间',
    underDevelopment: '此功能正在开发中，敬请期待！',
    returnHome: '返回首页',
    stayTuned: '更多精彩功能，敬请期待 🚀',
  },
};

export default ComingSoon;
