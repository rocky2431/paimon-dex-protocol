/**
 * Comprehensive Core Web Vitals Test Suite
 *
 * Uses chrome-devtools MCP for authoritative measurement of:
 * - LCP (Largest Contentful Paint) < 2.5s
 * - INP (Interaction to Next Paint) < 200ms
 * - CLS (Cumulative Layout Shift) < 0.1
 *
 * Tests all major pages of the application.
 */

import { test, expect } from '@playwright/test';
import {
  measureCoreWebVitals,
  measurePerformanceMetrics,
  checkThresholds,
  formatVitals,
  waitForPageStable,
  RECOMMENDED_THRESHOLDS,
  type CoreWebVitals
} from './utils/core-web-vitals';

test.describe('Core Web Vitals - All Pages', () => {
  const pages = [
    { path: '/', name: 'Home' },
    { path: '/swap', name: 'Swap' },
    { path: '/treasury', name: 'Treasury' },
    { path: '/lock', name: 'veNFT Lock' },
    { path: '/vote', name: 'Gauge Voting' },
    { path: '/stability-pool', name: 'Stability Pool' },
    { path: '/launchpad', name: 'Launchpad' },
    { path: '/presale', name: 'Presale' },
  ];

  for (const { path, name } of pages) {
    test(`${name} page should meet Core Web Vitals thresholds`, async ({ page }) => {
      // Navigate to page
      await page.goto(path);

      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle');

      // Wait for page to stabilize (no layout shifts)
      await waitForPageStable(page);

      // Measure Core Web Vitals using Web Vitals library
      const vitals = await measureCoreWebVitals(page);

      // Also measure using Performance API
      const perfMetrics = await measurePerformanceMetrics(page);

      // Log all metrics
      console.log(`\n=== ${name} Page Metrics ===`);
      console.log(formatVitals(vitals));
      console.log(`\nPerformance API Metrics:`);
      console.log(`  FCP: ${perfMetrics.FCP.toFixed(2)}s`);
      console.log(`  LCP: ${perfMetrics.LCP.toFixed(2)}s`);
      console.log(`  TTFB: ${perfMetrics.TTFB.toFixed(2)}s`);

      // Check thresholds
      const { passed, failures } = checkThresholds(vitals);

      if (!passed) {
        console.error(`\n❌ ${name} Page - Core Web Vitals failures:`);
        failures.forEach((failure) => console.error(`  - ${failure}`));
      } else {
        console.log(`\n✅ ${name} Page - All Core Web Vitals passed`);
      }

      // Assert thresholds
      expect(passed).toBe(true);

      // Additional assertions
      if (vitals.LCP !== undefined) {
        expect(vitals.LCP).toBeLessThan(RECOMMENDED_THRESHOLDS.LCP);
      }

      if (vitals.INP !== undefined) {
        expect(vitals.INP).toBeLessThan(RECOMMENDED_THRESHOLDS.INP);
      }

      if (vitals.CLS !== undefined) {
        expect(vitals.CLS).toBeLessThan(RECOMMENDED_THRESHOLDS.CLS);
      }
    });
  }

  test('should maintain good performance under slow network', async ({ page, context }) => {
    // Simulate slow 3G network
    await context.route('**/*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 100)); // Add 100ms delay
      await route.continue();
    });

    await page.goto('/swap');
    await page.waitForLoadState('networkidle');

    const perfMetrics = await measurePerformanceMetrics(page);

    // Under slow network, we still expect reasonable load times
    expect(perfMetrics.LCP).toBeLessThan(5.0); // Allow up to 5s under slow network
    expect(perfMetrics.FCP).toBeLessThan(3.0); // Allow up to 3s for FCP

    console.log('\n=== Slow Network Performance ===');
    console.log(`  FCP: ${perfMetrics.FCP.toFixed(2)}s`);
    console.log(`  LCP: ${perfMetrics.LCP.toFixed(2)}s`);
    console.log(`  TTFB: ${perfMetrics.TTFB.toFixed(2)}s`);
  });

  test('should have minimal layout shift on mobile', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
    }

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await waitForPageStable(page);

    const vitals = await measureCoreWebVitals(page);

    // CLS should be especially low on mobile to ensure good UX
    if (vitals.CLS !== undefined) {
      expect(vitals.CLS).toBeLessThan(0.05); // Even stricter for mobile
    }

    console.log(`\n=== Mobile CLS ===`);
    console.log(`  CLS: ${vitals.CLS?.toFixed(3) || 'N/A'}`);
  });

  test('should load critical assets quickly', async ({ page }) => {
    const resourceTimings: Array<{ name: string; duration: number; size: number }> = [];

    // Collect resource timings
    page.on('response', async (response) => {
      const url = response.url();
      const timing = await response.timing();

      // Track critical resources
      if (
        url.includes('.js') ||
        url.includes('.css') ||
        url.includes('.woff') ||
        url.includes('/api/')
      ) {
        const size = parseInt(response.headers()['content-length'] || '0');
        resourceTimings.push({
          name: url.split('/').pop() || url,
          duration: timing.responseEnd,
          size,
        });
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Log slow resources
    const slowResources = resourceTimings
      .filter((r) => r.duration > 1000)
      .sort((a, b) => b.duration - a.duration);

    if (slowResources.length > 0) {
      console.log('\n⚠️  Slow Resources (>1s):');
      slowResources.forEach((r) => {
        console.log(`  - ${r.name}: ${r.duration.toFixed(0)}ms (${(r.size / 1024).toFixed(1)} KB)`);
      });
    }

    // No single resource should take more than 3 seconds
    const maxDuration = Math.max(...resourceTimings.map((r) => r.duration));
    expect(maxDuration).toBeLessThan(3000);
  });

  test('should optimize image loading', async ({ page }) => {
    const images: Array<{ src: string; format: string; loading: string }> = [];

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Collect all images
    const imageElements = await page.locator('img').all();

    for (const img of imageElements) {
      const src = await img.getAttribute('src');
      const loading = await img.getAttribute('loading');

      if (src) {
        const format = src.split('.').pop()?.toLowerCase() || '';
        images.push({ src, format, loading: loading || 'eager' });
      }
    }

    // Log image optimization status
    console.log('\n=== Image Optimization ===');
    console.log(`Total images: ${images.length}`);

    const webpImages = images.filter((i) => i.format === 'webp');
    console.log(`WebP images: ${webpImages.length} (${((webpImages.length / images.length) * 100).toFixed(0)}%)`);

    const lazyImages = images.filter((i) => i.loading === 'lazy');
    console.log(`Lazy-loaded images: ${lazyImages.length} (${((lazyImages.length / images.length) * 100).toFixed(0)}%)`);

    // Recommendations
    if (webpImages.length / images.length < 0.5) {
      console.log('⚠️  Consider converting more images to WebP format');
    }

    if (lazyImages.length / images.length < 0.5) {
      console.log('⚠️  Consider adding lazy loading to more images');
    }
  });

  test('should measure interaction responsiveness', async ({ page }) => {
    await page.goto('/swap');
    await page.waitForLoadState('networkidle');

    // Measure time to interact
    const startTime = Date.now();

    // Click a button and measure response time
    await page.click('button:has-text("Connect Wallet"), button:has-text("连接钱包")');

    const interactionTime = Date.now() - startTime;

    console.log(`\n=== Interaction Responsiveness ===`);
    console.log(`  Time to respond: ${interactionTime}ms`);

    // Interaction should be responsive (< 200ms)
    expect(interactionTime).toBeLessThan(200);
  });

  test('should generate performance report', async ({ page }) => {
    const report: Record<string, Partial<CoreWebVitals>> = {};

    // Test a subset of pages for the report
    const testPages = [
      { path: '/', name: 'Home' },
      { path: '/swap', name: 'Swap' },
      { path: '/treasury', name: 'Treasury' },
    ];

    for (const { path, name } of testPages) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await waitForPageStable(page);

      const vitals = await measureCoreWebVitals(page);
      report[name] = vitals;
    }

    // Generate summary
    console.log('\n=== Performance Report ===\n');
    console.log('Page | LCP | INP | CLS | Status');
    console.log('-----|-----|-----|-----|-------');

    for (const [pageName, vitals] of Object.entries(report)) {
      const { passed } = checkThresholds(vitals);
      const status = passed ? '✅ Pass' : '❌ Fail';

      console.log(
        `${pageName.padEnd(10)} | ${(vitals.LCP || 0).toFixed(2)}s | ${(vitals.INP || 0).toFixed(0)}ms | ${(vitals.CLS || 0).toFixed(3)} | ${status}`
      );
    }

    // All pages should pass
    const allPassed = Object.values(report).every((vitals) => checkThresholds(vitals).passed);
    expect(allPassed).toBe(true);
  });
});
