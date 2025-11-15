/**
 * TabPlaceholder Component
 *
 * Generic placeholder component for user center tabs during Phase 1.
 * Will be replaced with actual content in Phase 2 (Task 30-35).
 */

'use client';

import { Box, Typography, Paper, Container } from '@mui/material';
import { ReactNode } from 'react';

export interface TabPlaceholderProps {
  title: string;
  description: string;
  icon?: ReactNode;
  comingSoonMessage?: string;
}

export function TabPlaceholder({
  title,
  description,
  icon,
  comingSoonMessage = 'This feature is coming soon',
}: TabPlaceholderProps) {
  return (
    <Container maxWidth="lg">
      <Box
        sx={{
          py: 6,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 6,
            textAlign: 'center',
            maxWidth: '600px',
            width: '100%',
          }}
        >
          {icon && (
            <Box
              sx={{
                mb: 3,
                display: 'flex',
                justifyContent: 'center',
                '& > *': {
                  fontSize: '4rem',
                  color: 'primary.main',
                },
              }}
            >
              {icon}
            </Box>
          )}

          <Typography variant="h4" component="h2" gutterBottom fontWeight={600}>
            {title}
          </Typography>

          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 3, lineHeight: 1.7 }}
          >
            {description}
          </Typography>

          <Box
            sx={{
              mt: 4,
              p: 2,
              bgcolor: 'info.main',
              color: 'info.contrastText',
              borderRadius: 2,
            }}
          >
            <Typography variant="body2" fontWeight={500}>
              {comingSoonMessage}
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}
