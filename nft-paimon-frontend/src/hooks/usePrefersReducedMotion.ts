/**
 * usePrefersReducedMotion Hook
 *
 * Detects user's motion preference for accessibility
 * Respects OS-level "prefers-reduced-motion" setting
 *
 * Usage:
 * ```tsx
 * const prefersReducedMotion = usePrefersReducedMotion();
 *
 * <Box
 *   sx={{
 *     transition: prefersReducedMotion ? 'none' : 'transform 0.3s',
 *   }}
 * />
 * ```
 *
 * Cross-browser support via MUI's useMediaQuery
 * SSR-safe (defaults to false on server)
 *
 * @returns boolean - true if user prefers reduced motion
 */

'use client';

import { useMediaQuery } from '@mui/material';

export const usePrefersReducedMotion = (): boolean => {
  // MUI's useMediaQuery handles SSR automatically
  // Returns false on server, correct value on client
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)', {
    // Default to false on server to avoid hydration mismatch
    noSsr: false,
  });

  return prefersReducedMotion;
};
