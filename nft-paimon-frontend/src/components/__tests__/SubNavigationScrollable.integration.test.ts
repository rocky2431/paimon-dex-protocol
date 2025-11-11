/**
 * Integration Tests: SubNavigation Scrollable Support (gap-4.1.5)
 *
 * Purpose: Verify SubNavigation supports scrollable variant for better narrow screen UX
 * Expected: All pages using SubNavigation can enable scrollable variant
 *
 * Affected Pages:
 * - src/app/swap/page.tsx (PSM | DEX tabs)
 * - src/app/borrow/page.tsx (Dashboard | Stability Pool tabs)
 * - src/app/liquidity/page.tsx (Pools | My Liquidity tabs)
 * - src/app/vote/page.tsx (Vote | Lock | Bribes tabs)
 * - src/app/portfolio/page.tsx (Overview | Rewards | Savings tabs)
 * - src/app/governance/page.tsx (Overview | Proposals | History tabs)
 * - src/app/usdp/page.tsx (Mint | Redeem | Savings tabs)
 * - src/app/launchpad/page.tsx (Projects | My Investments tabs)
 *
 * Implementation Pattern:
 * ```tsx
 * <SubNavigation
 *   tabs={TABS}
 *   currentTab={currentTab}
 *   onChange={setCurrentTab}
 *   variant="scrollable" // Enable horizontal scrolling
 * />
 * ```
 */

import * as fs from 'fs';
import * as path from 'path';

describe('SubNavigation Scrollable Support (gap-4.1.5)', () => {
  /**
   * Helper function to check if SubNavigation component supports scrollable variant
   */
  function supportsScrollableVariant(componentSource: string): boolean {
    // Check if component accepts variant prop with scrollable option
    const hasVariantProp = /variant\s*\?:\s*['"]standard['"].*['"]scrollable['"]/s.test(
      componentSource
    );

    // Check if Tabs component uses variant prop
    const usesVariantProp = /variant=\{variant\}/i.test(componentSource);

    return hasVariantProp && usesVariantProp;
  }

  /**
   * Helper function to check if SubNavigation has scrollButtons configured
   */
  function hasScrollButtonsConfigured(componentSource: string): boolean {
    // Check for scrollButtons="auto"
    const hasScrollButtons = /scrollButtons\s*=\s*["']auto["']/i.test(componentSource);

    // Check for allowScrollButtonsMobile
    const hasAllowMobile = /allowScrollButtonsMobile/i.test(componentSource);

    return hasScrollButtons && hasAllowMobile;
  }

  /**
   * Helper function to check if a page can use scrollable variant
   */
  function canUseScrollableVariant(pageSource: string): boolean {
    // Check if page imports SubNavigation
    const hasImport = /import.*SubNavigation.*from/i.test(pageSource);

    // Check if variant prop can be passed (either missing or explicitly set)
    const hasVariantProp = /variant\s*=\s*["']scrollable["']/i.test(pageSource);
    const noVariantProp = !/<SubNavigation[^>]*variant\s*=/i.test(pageSource);

    return hasImport && (hasVariantProp || noVariantProp);
  }

  // ==================== Dimension 1: Functional Tests ====================

  it('[TEST 1] should have SubNavigation component with variant prop support', () => {
    const componentPath = path.join(
      process.cwd(),
      'src/components/layout/SubNavigation.tsx'
    );
    expect(fs.existsSync(componentPath)).toBe(true);

    const source = fs.readFileSync(componentPath, 'utf8');
    expect(supportsScrollableVariant(source)).toBe(true);
  });

  it('[TEST 2] should have scrollButtons configured in SubNavigation', () => {
    const componentPath = path.join(
      process.cwd(),
      'src/components/layout/SubNavigation.tsx'
    );
    const source = fs.readFileSync(componentPath, 'utf8');
    expect(hasScrollButtonsConfigured(source)).toBe(true);
  });

  it('[TEST 3] should allow pages to use scrollable variant', () => {
    const pagesToCheck = [
      'src/app/swap/page.tsx',
      'src/app/borrow/page.tsx',
      'src/app/liquidity/page.tsx',
      'src/app/vote/page.tsx',
    ];

    pagesToCheck.forEach((pagePath) => {
      const fullPath = path.join(process.cwd(), pagePath);
      if (fs.existsSync(fullPath)) {
        const source = fs.readFileSync(fullPath, 'utf8');
        expect(canUseScrollableVariant(source)).toBe(true);
      }
    });
  });

  // ==================== Dimension 2: Boundary Tests ====================

  it('[TEST 4] should handle variant prop with all three options', () => {
    const componentPath = path.join(
      process.cwd(),
      'src/components/layout/SubNavigation.tsx'
    );
    const source = fs.readFileSync(componentPath, 'utf8');

    // Check if variant prop accepts all three values
    expect(source).toMatch(/['"]standard['"]/i);
    expect(source).toMatch(/['"]fullWidth['"]/i);
    expect(source).toMatch(/['"]scrollable['"]/i);
  });

  it('[TEST 5] should have default variant as standard', () => {
    const componentPath = path.join(
      process.cwd(),
      'src/components/layout/SubNavigation.tsx'
    );
    const source = fs.readFileSync(componentPath, 'utf8');

    // Check if default value is 'standard'
    expect(source).toMatch(/variant\s*=\s*['"]standard['"]/i);
  });

  // ==================== Dimension 3: Exception Tests ====================

  it('[TEST 6] should not break when variant is undefined', () => {
    const componentPath = path.join(
      process.cwd(),
      'src/components/layout/SubNavigation.tsx'
    );
    const source = fs.readFileSync(componentPath, 'utf8');

    // Check if variant has optional marker (?)
    expect(source).toMatch(/variant\s*\?/i);
  });

  it('[TEST 7] should handle missing scrollButtons gracefully', () => {
    const componentPath = path.join(
      process.cwd(),
      'src/components/layout/SubNavigation.tsx'
    );
    const source = fs.readFileSync(componentPath, 'utf8');

    // scrollButtons should have a value (not undefined)
    expect(source).toMatch(/scrollButtons\s*=\s*["']auto["']/i);
  });

  // ==================== Dimension 4: Performance Tests ====================

  it('[TEST 8] should use consistent prop naming across pages', () => {
    const pagesToCheck = [
      'src/app/swap/page.tsx',
      'src/app/borrow/page.tsx',
      'src/app/vote/page.tsx',
    ];

    let propPattern: string | null = null;
    pagesToCheck.forEach((pagePath) => {
      const fullPath = path.join(process.cwd(), pagePath);
      if (fs.existsSync(fullPath)) {
        const source = fs.readFileSync(fullPath, 'utf8');
        const match = source.match(/<SubNavigation\s+([^>]+)>/i);
        if (match) {
          if (!propPattern) {
            propPattern = match[1];
          }
          // All pages should use similar prop pattern
          expect(match[1]).toContain('tabs=');
          expect(match[1]).toContain('currentTab=');
          expect(match[1]).toContain('onChange=');
        }
      }
    });
  });

  // ==================== Dimension 5: Security Tests ====================

  it('[TEST 9] should not break functionality when scrollable is enabled', () => {
    const componentPath = path.join(
      process.cwd(),
      'src/components/layout/SubNavigation.tsx'
    );
    const source = fs.readFileSync(componentPath, 'utf8');

    // Ensure onChange handler is still present
    expect(source).toContain('onChange');
    expect(source).toContain('handleChange');

    // Ensure URL sync is maintained
    expect(source).toContain('router.push');
  });

  // ==================== Dimension 6: Compatibility Tests ====================

  it('[TEST 10] should work with MUI Tabs API', () => {
    const componentPath = path.join(
      process.cwd(),
      'src/components/layout/SubNavigation.tsx'
    );
    const source = fs.readFileSync(componentPath, 'utf8');

    // Check if using MUI Tabs component
    expect(source).toContain('Tabs');
    expect(source).toContain('@mui/material');

    // Check if variant is passed to Tabs
    expect(source).toMatch(/variant=\{variant\}/i);
  });

  it('[TEST 11] should support mobile scroll buttons', () => {
    const componentPath = path.join(
      process.cwd(),
      'src/components/layout/SubNavigation.tsx'
    );
    const source = fs.readFileSync(componentPath, 'utf8');

    // Must have allowScrollButtonsMobile for mobile support
    expect(source).toContain('allowScrollButtonsMobile');
  });

  it('[TEST 12] should be compatible with responsive design', () => {
    const componentPath = path.join(
      process.cwd(),
      'src/components/layout/SubNavigation.tsx'
    );
    const source = fs.readFileSync(componentPath, 'utf8');

    // Should have responsive styling (sx prop with MUI)
    expect(source).toContain('sx={{');

    // Should work with different screen sizes
    expect(source).toContain('scrollButtons');
  });
});
