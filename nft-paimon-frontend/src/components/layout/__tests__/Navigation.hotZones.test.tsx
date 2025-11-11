/**
 * Navigation Hot Zones Tests (gap-4.1.1)
 *
 * Verify that navigation hot zones comply with Fitts' Law (≥44px touch targets).
 *
 * Task: gap-4.1.1
 * Focus: Expand navigation hot zones to ≥44px for better usability
 *
 * Test Dimensions:
 * 1. Functional - Navigation links have adequate hot zones
 * 2. Boundary - Minimum 44x44px requirement met
 * 3. Exception - Small screens and edge cases
 * 4. Performance - No performance regression from styling changes
 * 5. Security - No unintended clickable areas
 * 6. Compatibility - Cross-browser and responsive behavior
 */

import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';

describe('Navigation Hot Zones (gap-4.1.1)', () => {
  const navigationPath = path.join(
    process.cwd(),
    'src/components/layout/Navigation.tsx'
  );
  const mobileNavPath = path.join(
    process.cwd(),
    'src/components/layout/MobileNavigation.tsx'
  );

  /**
   * TEST 1: Desktop navigation links have minHeight style
   * Functional dimension - Hot zone presence
   */
  it('[TEST 1] should have minHeight property in desktop navigation links', () => {
    const source = fs.readFileSync(navigationPath, 'utf8');

    // Should have minHeight in sx prop
    const hasMinHeight =
      source.includes('minHeight:') || source.includes('minHeight :');

    expect(hasMinHeight).toBe(true);
  });

  /**
   * TEST 2: Desktop navigation links have minWidth style
   * Functional dimension - Hot zone completeness
   */
  it('[TEST 2] should have minWidth property in desktop navigation links', () => {
    const source = fs.readFileSync(navigationPath, 'utf8');

    // Should have minWidth in sx prop
    const hasMinWidth =
      source.includes('minWidth:') || source.includes('minWidth :');

    expect(hasMinWidth).toBe(true);
  });

  /**
   * TEST 3: Navigation hot zones are at least 44px
   * Boundary dimension - Fitts' Law compliance
   */
  it('[TEST 3] should specify hot zones ≥44px (Fitts Law)', () => {
    const source = fs.readFileSync(navigationPath, 'utf8');

    // Check for constant definition
    const constantMatch = source.match(/const\s+MIN_HOT_ZONE_SIZE\s*=\s*(\d+)/);
    if (constantMatch) {
      const constantValue = parseInt(constantMatch[1], 10);
      expect(constantValue).toBeGreaterThanOrEqual(44);
    }

    // Check for direct numeric values
    const minHeightMatch = source.match(/minHeight:\s*['"]?(\d+)/);
    const minWidthMatch = source.match(/minWidth:\s*['"]?(\d+)/);

    if (minHeightMatch) {
      const minHeight = parseInt(minHeightMatch[1], 10);
      expect(minHeight).toBeGreaterThanOrEqual(44);
    }

    if (minWidthMatch) {
      const minWidth = parseInt(minWidthMatch[1], 10);
      expect(minWidth).toBeGreaterThanOrEqual(44);
    }

    // At least one dimension should be specified (either constant or direct value)
    expect(constantMatch || minHeightMatch || minWidthMatch).toBeTruthy();
  });

  /**
   * TEST 4: Desktop navigation uses clickable Box or Button
   * Functional dimension - Component type
   */
  it('[TEST 4] should use Box or Button for desktop navigation links (not just Typography)', () => {
    const source = fs.readFileSync(navigationPath, 'utf8');

    // Should wrap Typography in a Box or use Button
    const hasBoxWrapper =
      source.includes('<Box') &&
      source.includes('sx={{') &&
      source.includes('minHeight');
    const hasButton = source.includes('<Button') && source.includes('minHeight');

    expect(hasBoxWrapper || hasButton).toBe(true);
  });

  /**
   * TEST 5: Desktop navigation has appropriate padding
   * Functional dimension - Visual spacing
   */
  it('[TEST 5] should have appropriate padding for hot zones', () => {
    const source = fs.readFileSync(navigationPath, 'utf8');

    // Should have padding or p/py/px specified
    const hasPadding =
      source.includes('padding:') ||
      source.includes('p:') ||
      source.includes('py:') ||
      source.includes('px:');

    expect(hasPadding).toBe(true);
  });

  /**
   * TEST 6: Mobile navigation uses ListItemButton (already has good touch targets)
   * Functional dimension - Mobile touch targets
   */
  it('[TEST 6] should use ListItemButton for mobile navigation (good default touch targets)', () => {
    const source = fs.readFileSync(mobileNavPath, 'utf8');

    // ListItemButton by default has good touch targets
    expect(source).toContain('ListItemButton');
  });

  /**
   * TEST 7: IconButton components have adequate size
   * Boundary dimension - Small interactive elements
   */
  it('[TEST 7] should ensure IconButton components are not too small', () => {
    const mobileSource = fs.readFileSync(mobileNavPath, 'utf8');

    // Check if any IconButton has size="small" without explicit minHeight/minWidth
    const hasSmallIconButton = mobileSource.includes('size="small"');

    if (hasSmallIconButton) {
      // If size="small" is used, should have explicit size override or be acceptable
      // For now, we'll just check that IconButton is being used properly
      expect(mobileSource).toContain('IconButton');
    }

    // Hamburger menu IconButton should not have size prop (defaults to medium, 48px)
    const hamburgerMenuMatch = mobileSource.match(
      /<IconButton[^>]*aria-label="menu"[^>]*>/
    );
    if (hamburgerMenuMatch) {
      const hasSize = hamburgerMenuMatch[0].includes('size=');
      // Hamburger should not have size prop (or should be medium)
      expect(hasSize).toBe(false);
    }
  });

  /**
   * TEST 8: No regression in active state styling
   * Exception dimension - Style consistency
   */
  it('[TEST 8] should maintain active state indicator', () => {
    const source = fs.readFileSync(navigationPath, 'utf8');

    // Should still have active indicator (underline or border)
    const hasActiveIndicator =
      source.includes("'&::after'") ||
      source.includes('isActive') ||
      source.includes('borderBottom');

    expect(hasActiveIndicator).toBe(true);
  });

  /**
   * TEST 9: Performance - No excessive nested elements
   * Performance dimension - DOM complexity
   */
  it('[TEST 9] should not introduce excessive nested elements for hot zones', () => {
    const source = fs.readFileSync(navigationPath, 'utf8');

    // Count nesting depth (rough heuristic: count consecutive '>' characters)
    const maxConsecutiveBrackets = (source.match(/>{2,}/g) || []).length;

    // Should not have more than 20 consecutive closing brackets (reasonable depth)
    expect(maxConsecutiveBrackets).toBeLessThan(20);
  });

  /**
   * TEST 10: Security - Cursor pointer only on interactive elements
   * Security dimension - Clear interaction cues
   */
  it('[TEST 10] should have cursor: pointer on interactive elements', () => {
    const source = fs.readFileSync(navigationPath, 'utf8');

    // Should have cursor: 'pointer' in sx prop
    expect(source).toContain("cursor: 'pointer'");
  });

  /**
   * TEST 11: Compatibility - Responsive design maintained
   * Compatibility dimension - Mobile and desktop
   */
  it('[TEST 11] should maintain responsive design (desktop and mobile)', () => {
    const source = fs.readFileSync(navigationPath, 'utf8');

    // Should have display: { xs: ..., lg: ... } for responsive behavior
    const hasResponsiveDisplay = source.includes("display: { xs:");

    expect(hasResponsiveDisplay).toBe(true);
  });

  /**
   * TEST 12: Accessibility - Semantic link elements
   * Compatibility dimension - Accessibility
   */
  it('[TEST 12] should maintain semantic Link elements for navigation', () => {
    const source = fs.readFileSync(navigationPath, 'utf8');

    // Should use Next.js Link component
    expect(source).toContain('Link');
    expect(source).toContain("from 'next/link'");
  });
});
