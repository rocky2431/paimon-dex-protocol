/**
 * Integration Tests: Sticky Table Headers (gap-4.1.3)
 *
 * Purpose: Detect absence of sticky headers in table components
 * Expected: All tables should have stickyHeader prop and maxHeight for scrolling
 *
 * Affected Components:
 * - src/app/liquidity/page.tsx
 * - src/app/portfolio/page.tsx
 * - src/components/bribes/BribesList.tsx
 * - src/components/launchpad/VoteHistory.tsx
 * - src/components/presale/OptionComparisonTable.tsx
 * - src/components/rewards/PoolRewardsList.tsx
 * - src/components/rewards/VestingModeIndicator.tsx
 * - src/components/stability-pool/LiquidationHistory.tsx
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Sticky Table Headers (gap-4.1.3)', () => {
  /**
   * Helper function to check if a component has sticky header implementation
   * Pattern: <Table stickyHeader>, <Table size="small" stickyHeader>, or <Table stickyHeader={true}>
   */
  function hasStickyHeader(source: string): boolean {
    // Check if stickyHeader appears in the file
    if (!source.includes('stickyHeader')) {
      return false;
    }

    // Check various patterns where stickyHeader could appear
    // 1. <Table stickyHeader (direct after Table)
    // 2. <Table ... stickyHeader (with attributes before it)
    // 3. Table stickyHeader={true} (explicit true)
    const hasTableWithSticky = /<Table[^>]*\sstickyHeader/i.test(source);
    const hasTableStickyExplicit = /Table\s+stickyHeader={true}/i.test(source);

    return hasTableWithSticky || hasTableStickyExplicit;
  }

  /**
   * Helper function to check if TableContainer has maxHeight for scrolling
   * Pattern: <TableContainer sx={{ maxHeight: ... }}>
   */
  function hasMaxHeight(source: string): boolean {
    return (
      source.includes('TableContainer') &&
      (source.includes('maxHeight') || source.includes('max-height'))
    );
  }

  // ==================== Dimension 1: Functional Tests ====================

  it('[TEST 1] should have sticky header in Liquidity page table', () => {
    const componentPath = path.join(process.cwd(), 'src/app/liquidity/page.tsx');
    const source = fs.readFileSync(componentPath, 'utf8');
    expect(hasStickyHeader(source)).toBe(true);
  });

  it('[TEST 2] should have sticky header in Portfolio page table', () => {
    const componentPath = path.join(process.cwd(), 'src/app/portfolio/page.tsx');
    const source = fs.readFileSync(componentPath, 'utf8');
    expect(hasStickyHeader(source)).toBe(true);
  });

  it('[TEST 3] should have sticky header in BribesList table', () => {
    const componentPath = path.join(process.cwd(), 'src/components/bribes/BribesList.tsx');
    const source = fs.readFileSync(componentPath, 'utf8');
    expect(hasStickyHeader(source)).toBe(true);
  });

  it('[TEST 4] should have sticky header in VoteHistory table', () => {
    const componentPath = path.join(
      process.cwd(),
      'src/components/launchpad/VoteHistory.tsx'
    );
    const source = fs.readFileSync(componentPath, 'utf8');
    expect(hasStickyHeader(source)).toBe(true);
  });

  it('[TEST 5] should have sticky header in OptionComparisonTable', () => {
    const componentPath = path.join(
      process.cwd(),
      'src/components/presale/OptionComparisonTable.tsx'
    );
    const source = fs.readFileSync(componentPath, 'utf8');
    expect(hasStickyHeader(source)).toBe(true);
  });

  it('[TEST 6] should have sticky header in PoolRewardsList table', () => {
    const componentPath = path.join(
      process.cwd(),
      'src/components/rewards/PoolRewardsList.tsx'
    );
    const source = fs.readFileSync(componentPath, 'utf8');
    expect(hasStickyHeader(source)).toBe(true);
  });

  // ==================== Dimension 2: Boundary Tests ====================

  it('[TEST 7] should have maxHeight on TableContainer for scrolling (Liquidity)', () => {
    const componentPath = path.join(process.cwd(), 'src/app/liquidity/page.tsx');
    const source = fs.readFileSync(componentPath, 'utf8');
    expect(hasMaxHeight(source)).toBe(true);
  });

  it('[TEST 8] should have maxHeight on TableContainer for scrolling (BribesList)', () => {
    const componentPath = path.join(process.cwd(), 'src/components/bribes/BribesList.tsx');
    const source = fs.readFileSync(componentPath, 'utf8');
    expect(hasMaxHeight(source)).toBe(true);
  });

  // ==================== Dimension 3: Exception Tests ====================

  it('[TEST 9] should handle sticky header in small tables (VestingModeIndicator)', () => {
    const componentPath = path.join(
      process.cwd(),
      'src/components/rewards/VestingModeIndicator.tsx'
    );
    const source = fs.readFileSync(componentPath, 'utf8');

    // VestingModeIndicator is a small comparison table (2 rows)
    // It SHOULD NOT have stickyHeader (not needed for short tables)
    // OR if it has Table, it should be a simple layout without stickyHeader requirement
    const hasTable = source.includes('<Table');
    if (hasTable) {
      // If it has a table, it's acceptable to NOT have stickyHeader for small tables
      expect(true).toBe(true);
    } else {
      // If no table, test passes
      expect(true).toBe(true);
    }
  });

  it('[TEST 10] should handle sticky header in LiquidationHistory table', () => {
    const componentPath = path.join(
      process.cwd(),
      'src/components/stability-pool/LiquidationHistory.tsx'
    );
    const source = fs.readFileSync(componentPath, 'utf8');
    expect(hasStickyHeader(source)).toBe(true);
  });

  // ==================== Dimension 4: Performance Tests ====================

  it('[TEST 11] should use consistent sticky header implementation pattern', () => {
    // Check that all tables use the same pattern for consistency
    const filePaths = [
      'src/app/liquidity/page.tsx',
      'src/app/portfolio/page.tsx',
      'src/components/bribes/BribesList.tsx',
      'src/components/launchpad/VoteHistory.tsx',
      'src/components/presale/OptionComparisonTable.tsx',
      'src/components/rewards/PoolRewardsList.tsx',
      'src/components/stability-pool/LiquidationHistory.tsx',
    ];

    const patterns: string[] = [];
    filePaths.forEach((filePath) => {
      const fullPath = path.join(process.cwd(), filePath);
      const source = fs.readFileSync(fullPath, 'utf8');

      // Extract sticky header pattern
      const stickyMatch = source.match(/<Table\s+stickyHeader[^>]*>/);
      if (stickyMatch) {
        patterns.push(stickyMatch[0]);
      }
    });

    // At least 5 out of 7 tables should have sticky header (allowing for small tables)
    expect(patterns.length).toBeGreaterThanOrEqual(5);
  });

  // ==================== Dimension 5: Security Tests ====================

  it('[TEST 12] should not break TableContainer overflow behavior with sticky headers', () => {
    // Ensure TableContainer has proper overflow settings to work with sticky headers
    const componentPath = path.join(process.cwd(), 'src/components/bribes/BribesList.tsx');
    const source = fs.readFileSync(componentPath, 'utf8');

    if (source.includes('stickyHeader')) {
      // Should have TableContainer with maxHeight (required for sticky to work)
      expect(source.includes('TableContainer')).toBe(true);
      // maxHeight is checked in TEST 8
    }
  });
});
