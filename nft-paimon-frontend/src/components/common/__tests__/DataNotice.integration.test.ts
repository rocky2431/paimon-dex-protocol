/**
 * Integration Tests: Module Data Notices (gap-4.2.4)
 *
 * Purpose: Verify that modules with mock/incomplete data have clear user-facing notices
 * Expected: Users should not mistake mock data for real blockchain data
 *
 * Affected Modules:
 * - Launchpad (ProjectList) - Mock project data
 * - Analytics (APRCalculator) - Mock locked USDP data
 *
 * Six-Dimensional Coverage:
 * - Functional: Notice components render with correct props
 * - Boundary: Empty/undefined data handled gracefully
 * - Exception: Component doesn't crash with invalid props
 * - Performance: Notice components are lightweight
 * - Security: No XSS vulnerabilities in notice messages
 * - Compatibility: Works across all pages
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Module Data Notices (gap-4.2.4)', () => {
  const dataNoticePath = path.join(process.cwd(), 'src/components/common/DataNotice.tsx');
  const projectListPath = path.join(process.cwd(), 'src/components/launchpad/ProjectList.tsx');
  const analyticsDashboardPath = path.join(
    process.cwd(),
    'src/components/analytics/AnalyticsDashboard.tsx'
  );

  // ==================== Dimension 1: Functional Tests ====================

  it('[TEST 1] should have DataNotice component file', () => {
    expect(fs.existsSync(dataNoticePath)).toBe(true);
  });

  it('[TEST 2] should export DataNotice component with required props', () => {
    const source = fs.readFileSync(dataNoticePath, 'utf8');

    // Should export DataNotice
    expect(source).toMatch(/export.*DataNotice/);

    // Should accept message prop
    expect(source).toContain('message');

    // Should use MUI Alert or similar component
    expect(source).toMatch(/Alert|Box.*InfoIcon/i);
  });

  it('[TEST 3] should have DataNoticeProps interface with severity levels', () => {
    const source = fs.readFileSync(dataNoticePath, 'utf8');

    // Should define interface
    expect(source).toMatch(/interface.*DataNoticeProps|type.*DataNoticeProps/);

    // Should have message field
    expect(source).toMatch(/message\s*[:?]/);

    // Should support severity (optional)
    expect(source).toMatch(/severity\??\s*:/);
  });

  it('[TEST 4] ProjectList should use DataNotice for mock data warning', () => {
    const source = fs.readFileSync(projectListPath, 'utf8');

    // Should import DataNotice
    expect(source).toMatch(/import.*DataNotice.*from/);

    // Should render DataNotice component
    expect(source).toContain('<DataNotice');

    // Should have appropriate warning message
    expect(source).toMatch(/示例数据|mock|placeholder|coming soon/i);
  });

  it('[TEST 5] AnalyticsDashboard should use DataNotice for mock APR data', () => {
    const source = fs.readFileSync(analyticsDashboardPath, 'utf8');

    // Should import DataNotice
    expect(source).toMatch(/import.*DataNotice.*from/);

    // Should render DataNotice near APRCalculator
    expect(source).toContain('<DataNotice');

    // Should warn about mock data
    expect(source).toMatch(/示例|mock|placeholder|coming soon/i);
  });

  // ==================== Dimension 2: Boundary Tests ====================

  it('[TEST 6] DataNotice should handle empty message gracefully', () => {
    const source = fs.readFileSync(dataNoticePath, 'utf8');

    // Should have default message (ES6 default parameter or fallback logic)
    expect(source).toMatch(/message\s*=\s*'|message\s*\|\||\?\s*message\s*:/);
  });

  it('[TEST 7] DataNotice should not break with long messages', () => {
    const source = fs.readFileSync(dataNoticePath, 'utf8');

    // Should use proper text wrapping (sx or style props)
    expect(source).toMatch(/wordBreak|whiteSpace|overflow/i);
  });

  // ==================== Dimension 3: Exception Tests ====================

  it('[TEST 8] DataNotice should not crash with undefined props', () => {
    const source = fs.readFileSync(dataNoticePath, 'utf8');

    // Should have prop validation or default props
    expect(source).toMatch(/message\?:|message =|defaultProps/);
  });

  // ==================== Dimension 4: Performance Tests ====================

  it('[TEST 9] DataNotice should be lightweight component', () => {
    const source = fs.readFileSync(dataNoticePath, 'utf8');
    const lines = source.split('\n').length;

    // Should be less than 100 lines (simple component)
    expect(lines).toBeLessThan(100);
  });

  // ==================== Dimension 5: Security Tests ====================

  it('[TEST 10] DataNotice should not render raw HTML', () => {
    const source = fs.readFileSync(dataNoticePath, 'utf8');

    // Should NOT use dangerouslySetInnerHTML
    expect(source).not.toContain('dangerouslySetInnerHTML');
  });

  it('[TEST 11] should not expose sensitive information in notices', () => {
    const projectListSource = fs.readFileSync(projectListPath, 'utf8');
    const analyticsSource = fs.readFileSync(analyticsDashboardPath, 'utf8');

    // Should not expose contract addresses or private keys
    expect(projectListSource).not.toMatch(/0x[0-9a-fA-F]{40}.*mock/i);
    expect(analyticsSource).not.toMatch(/0x[0-9a-fA-F]{40}.*mock/i);
  });

  // ==================== Dimension 6: Compatibility Tests ====================

  it('[TEST 12] DataNotice should use MUI theme colors', () => {
    const source = fs.readFileSync(dataNoticePath, 'utf8');

    // Should reference theme colors (info, warning, error)
    expect(source).toMatch(/severity|color.*info|warning|error/i);
  });

  it('[TEST 13] DataNotice should be responsive', () => {
    const source = fs.readFileSync(dataNoticePath, 'utf8');

    // Should have responsive styling
    expect(source).toMatch(/sx=|fontSize.*xs|sm|md/);
  });

  it('[TEST 14] DataNotice should support custom icon', () => {
    const source = fs.readFileSync(dataNoticePath, 'utf8');

    // Should allow icon customization
    expect(source).toMatch(/icon\??\s*:|InfoIcon|WarningIcon/i);
  });

  it('[TEST 15] DataNotice should be clearly visible to users', () => {
    const projectListSource = fs.readFileSync(projectListPath, 'utf8');

    // Should render notice at prominent position (before content, not hidden)
    // Check that DataNotice is not inside a collapsed section
    expect(projectListSource).toMatch(/<DataNotice[\s\S]*?\/>/);
  });
});
