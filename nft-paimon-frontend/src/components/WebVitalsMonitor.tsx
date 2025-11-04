'use client';

/**
 * @file WebVitalsMonitor.tsx
 * @description Client component for initializing Core Web Vitals monitoring (Task P2-007)
 *
 * Usage: Import and add to root layout.tsx
 */

import { useEffect } from 'react';
import { initWebVitals } from '@/lib/webVitals';

export default function WebVitalsMonitor() {
  useEffect(() => {
    // Initialize web vitals monitoring on mount
    initWebVitals();
  }, []);

  // This component doesn't render anything
  return null;
}
