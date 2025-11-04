/**
 * @file webVitals.ts
 * @description Core Web Vitals monitoring and reporting utility (Task P2-007)
 *
 * Monitors:
 * - LCP (Largest Contentful Paint): Target <2.5s
 * - INP (Interaction to Next Paint): Target <200ms
 * - CLS (Cumulative Layout Shift): Target <0.1
 */

import { onCLS, onINP, onLCP, Metric } from 'web-vitals';

// Thresholds from Web Vitals spec
const THRESHOLDS = {
  LCP: 2500, // 2.5s in milliseconds
  INP: 200,  // 200ms
  CLS: 0.1,  // 0.1 units
} as const;

// Performance metric data structure
export interface WebVitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  navigationType: string;
}

/**
 * Determine rating based on threshold
 */
function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = {
    LCP: { good: 2500, poor: 4000 },
    INP: { good: 200, poor: 500 },
    CLS: { good: 0.1, poor: 0.25 },
  };

  const threshold = thresholds[name as keyof typeof thresholds];
  if (!threshold) return 'good';

  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Send metrics to backend API
 */
async function sendToBackend(metric: WebVitalsMetric): Promise<void> {
  try {
    // Only send in production to avoid noise during development
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Web Vitals]', metric);
      return;
    }

    await fetch('/api/analytics/web-vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metric),
    });
  } catch (error) {
    // Silently fail to avoid disrupting user experience
    console.error('[Web Vitals] Failed to send metric:', error);
  }
}

/**
 * Check if metric exceeds threshold and log warning
 */
function checkThreshold(metric: WebVitalsMetric): void {
  const threshold = THRESHOLDS[metric.name as keyof typeof THRESHOLDS];
  if (!threshold) return;

  if (
    (metric.name === 'CLS' && metric.value > threshold) ||
    (metric.name !== 'CLS' && metric.value > threshold)
  ) {
    console.warn(
      `⚠️  [Web Vitals Alert] ${metric.name} exceeded threshold: ${metric.value.toFixed(2)} > ${threshold}`,
      metric
    );
  }
}

/**
 * Process and report web vital metric
 */
function reportWebVital(metric: Metric): void {
  const webVitalsMetric: WebVitalsMetric = {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    timestamp: Date.now(),
    navigationType: metric.navigationType,
  };

  // Check threshold and log warning if exceeded
  checkThreshold(webVitalsMetric);

  // Send to backend
  sendToBackend(webVitalsMetric);
}

/**
 * Initialize Web Vitals monitoring
 * Should be called once when the app loads
 */
export function initWebVitals(): void {
  // Only run in browser environment
  if (typeof window === 'undefined') return;

  // Monitor Core Web Vitals
  onLCP(reportWebVital);
  onINP(reportWebVital);
  onCLS(reportWebVital);

  console.log('[Web Vitals] Monitoring initialized');
}
