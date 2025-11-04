/**
 * Core Web Vitals Measurement Utilities
 *
 * Uses chrome-devtools MCP for authoritative Core Web Vitals measurement.
 * Thresholds:
 * - LCP (Largest Contentful Paint): <2.5s
 * - INP (Interaction to Next Paint): <200ms
 * - CLS (Cumulative Layout Shift): <0.1
 */

import { Page } from '@playwright/test';

export interface CoreWebVitals {
  LCP: number; // Largest Contentful Paint (seconds)
  INP: number; // Interaction to Next Paint (milliseconds)
  CLS: number; // Cumulative Layout Shift (unitless)
  FCP: number; // First Contentful Paint (seconds)
  TTFB: number; // Time to First Byte (seconds)
}

export interface CoreWebVitalsThresholds {
  LCP: number;
  INP: number;
  CLS: number;
}

/**
 * Recommended thresholds for Core Web Vitals
 */
export const RECOMMENDED_THRESHOLDS: CoreWebVitalsThresholds = {
  LCP: 2.5, // seconds
  INP: 200, // milliseconds
  CLS: 0.1, // unitless
};

/**
 * Measure Core Web Vitals using Web Vitals library
 * This is a fallback method when chrome-devtools MCP is not available
 */
export async function measureCoreWebVitals(page: Page): Promise<Partial<CoreWebVitals>> {
  // Inject Web Vitals library
  await page.addScriptTag({
    url: 'https://unpkg.com/web-vitals@3/dist/web-vitals.iife.js',
  });

  // Wait for page to be fully loaded
  await page.waitForLoadState('networkidle');

  // Collect metrics
  const vitals = await page.evaluate(() => {
    return new Promise<Partial<CoreWebVitals>>((resolve) => {
      const metrics: Partial<CoreWebVitals> = {};

      // @ts-ignore - web-vitals library injected
      webVitals.onLCP((metric) => {
        metrics.LCP = metric.value / 1000; // Convert to seconds
      });

      // @ts-ignore
      webVitals.onINP((metric) => {
        metrics.INP = metric.value; // Already in milliseconds
      });

      // @ts-ignore
      webVitals.onCLS((metric) => {
        metrics.CLS = metric.value;
      });

      // @ts-ignore
      webVitals.onFCP((metric) => {
        metrics.FCP = metric.value / 1000;
      });

      // @ts-ignore
      webVitals.onTTFB((metric) => {
        metrics.TTFB = metric.value / 1000;
      });

      // Wait for all metrics to be collected (max 5 seconds)
      setTimeout(() => resolve(metrics), 5000);
    });
  });

  return vitals;
}

/**
 * Measure Core Web Vitals using Performance API
 */
export async function measurePerformanceMetrics(page: Page): Promise<{
  FCP: number;
  LCP: number;
  TTFB: number;
}> {
  await page.waitForLoadState('networkidle');

  const metrics = await page.evaluate(() => {
    const perfEntries = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paintEntries = performance.getEntriesByType('paint');

    const fcpEntry = paintEntries.find((entry) => entry.name === 'first-contentful-paint');
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
    const lcpEntry = lcpEntries[lcpEntries.length - 1];

    return {
      FCP: fcpEntry ? fcpEntry.startTime / 1000 : 0,
      LCP: lcpEntry ? lcpEntry.startTime / 1000 : 0,
      TTFB: perfEntries ? perfEntries.responseStart / 1000 : 0,
    };
  });

  return metrics;
}

/**
 * Check if Core Web Vitals meet the recommended thresholds
 */
export function checkThresholds(
  vitals: Partial<CoreWebVitals>,
  thresholds: CoreWebVitalsThresholds = RECOMMENDED_THRESHOLDS
): { passed: boolean; failures: string[] } {
  const failures: string[] = [];

  if (vitals.LCP !== undefined && vitals.LCP > thresholds.LCP) {
    failures.push(`LCP: ${vitals.LCP.toFixed(2)}s > ${thresholds.LCP}s`);
  }

  if (vitals.INP !== undefined && vitals.INP > thresholds.INP) {
    failures.push(`INP: ${vitals.INP.toFixed(0)}ms > ${thresholds.INP}ms`);
  }

  if (vitals.CLS !== undefined && vitals.CLS > thresholds.CLS) {
    failures.push(`CLS: ${vitals.CLS.toFixed(3)} > ${thresholds.CLS}`);
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

/**
 * Format Core Web Vitals for display
 */
export function formatVitals(vitals: Partial<CoreWebVitals>): string {
  const lines: string[] = ['Core Web Vitals:'];

  if (vitals.LCP !== undefined) {
    const status = vitals.LCP <= RECOMMENDED_THRESHOLDS.LCP ? '✓' : '✗';
    lines.push(`  ${status} LCP: ${vitals.LCP.toFixed(2)}s (target: <${RECOMMENDED_THRESHOLDS.LCP}s)`);
  }

  if (vitals.INP !== undefined) {
    const status = vitals.INP <= RECOMMENDED_THRESHOLDS.INP ? '✓' : '✗';
    lines.push(`  ${status} INP: ${vitals.INP.toFixed(0)}ms (target: <${RECOMMENDED_THRESHOLDS.INP}ms)`);
  }

  if (vitals.CLS !== undefined) {
    const status = vitals.CLS <= RECOMMENDED_THRESHOLDS.CLS ? '✓' : '✗';
    lines.push(`  ${status} CLS: ${vitals.CLS.toFixed(3)} (target: <${RECOMMENDED_THRESHOLDS.CLS})`);
  }

  if (vitals.FCP !== undefined) {
    lines.push(`  FCP: ${vitals.FCP.toFixed(2)}s`);
  }

  if (vitals.TTFB !== undefined) {
    lines.push(`  TTFB: ${vitals.TTFB.toFixed(2)}s`);
  }

  return lines.join('\n');
}

/**
 * Wait for page to be stable (no layout shifts for 1 second)
 */
export async function waitForPageStable(page: Page, timeout = 5000): Promise<void> {
  const startTime = Date.now();

  await page.evaluate((maxWait) => {
    return new Promise<void>((resolve) => {
      let lastShiftTime = Date.now();

      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'layout-shift') {
            lastShiftTime = Date.now();
          }
        }
      });

      observer.observe({ entryTypes: ['layout-shift'] });

      const checkStable = () => {
        const now = Date.now();
        const timeSinceLastShift = now - lastShiftTime;
        const totalTime = now - maxWait;

        if (timeSinceLastShift > 1000 || totalTime > maxWait) {
          observer.disconnect();
          resolve();
        } else {
          setTimeout(checkStable, 100);
        }
      };

      checkStable();
    });
  }, startTime + timeout);
}
