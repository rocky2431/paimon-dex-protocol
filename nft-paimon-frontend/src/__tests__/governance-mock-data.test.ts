/**
 * Governance Mock Data Removal Tests (gap-3.2.1)
 *
 * Verify that all governance-related components use real on-chain data
 * instead of MOCK data.
 *
 * Task: gap-3.2.1
 * Focus: Remove all governance MOCK data (MOCK_GAUGES, MOCK_BRIBES, MOCK_REWARDS)
 *
 * Test Dimensions:
 * 1. Functional - Components use real hooks
 * 2. Boundary - No MOCK constants remaining
 * 3. Exception - No placeholder addresses in governance
 * 4. Security - No hardcoded test data in production components
 */

import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';

describe('Governance Mock Data Removal (gap-3.2.1)', () => {
  /**
   * TEST 1: No MOCK_GAUGES in codebase
   */
  it('[TEST 1] should not have MOCK_GAUGES anywhere', () => {
    const votingHookPath = path.join(process.cwd(), 'src/components/voting/hooks/useVoting.ts');
    const hookSource = fs.readFileSync(votingHookPath, 'utf8');

    // Should NOT contain MOCK_GAUGES
    expect(hookSource).not.toContain('MOCK_GAUGES');
    expect(hookSource).not.toContain('MOCK_');
  });

  /**
   * TEST 2: Voting components use useGauges hook
   */
  it('[TEST 2] should use useGauges hook for real gauge data', () => {
    const votingHookPath = path.join(process.cwd(), 'src/components/voting/hooks/useVoting.ts');
    const hookSource = fs.readFileSync(votingHookPath, 'utf8');

    // Should import useGauges
    expect(hookSource).toContain('useGauges');

    // Should use real gauge data
    expect(hookSource).toContain('const { gauges');
  });

  /**
   * TEST 3: No MOCK_BRIBES in bribe components
   */
  it('[TEST 3] should not have MOCK_BRIBES in bribes components', () => {
    const bribesDir = path.join(process.cwd(), 'src/components/bribes');
    const files = fs.readdirSync(bribesDir, { recursive: true });

    const tsxFiles = files.filter(
      (file) => typeof file === 'string' && file.endsWith('.tsx') && !file.includes('test')
    );

    tsxFiles.forEach((file) => {
      const filePath = path.join(bribesDir, String(file));
      const content = fs.readFileSync(filePath, 'utf8');

      // Should NOT contain MOCK_BRIBES
      expect(content).not.toContain('MOCK_BRIBES');
      expect(content).not.toContain('MOCK_BRIBE');
    });
  });

  /**
   * TEST 4: Bribes components use useBribes hook
   */
  it('[TEST 4] should have useBribes hook for real bribe data', () => {
    const useBribesPath = path.join(
      process.cwd(),
      'src/components/bribes/hooks/useBribes.ts'
    );

    expect(fs.existsSync(useBribesPath)).toBe(true);

    const hookSource = fs.readFileSync(useBribesPath, 'utf8');

    // Should NOT contain MOCK data
    expect(hookSource).not.toContain('MOCK_');
  });

  /**
   * TEST 5: No MOCK_REWARDS in governance components
   */
  it('[TEST 5] should not have MOCK_REWARDS in governance components', () => {
    const votingDir = path.join(process.cwd(), 'src/components/voting');
    const bribesDir = path.join(process.cwd(), 'src/components/bribes');

    [votingDir, bribesDir].forEach((dir) => {
      const files = fs.readdirSync(dir, { recursive: true });
      const tsxFiles = files.filter(
        (file) => typeof file === 'string' && file.endsWith('.tsx') && !file.includes('test')
      );

      tsxFiles.forEach((file) => {
        const filePath = path.join(dir, String(file));
        const content = fs.readFileSync(filePath, 'utf8');

        // Should NOT contain MOCK_REWARDS
        expect(content).not.toContain('MOCK_REWARDS');
        expect(content).not.toContain('MOCK_REWARD');
      });
    });
  });

  /**
   * TEST 6: Gauge constants use real contract addresses
   */
  it('[TEST 6] should use real gauge addresses from config', () => {
    const votingConstantsPath = path.join(
      process.cwd(),
      'src/components/voting/constants.ts'
    );
    const constantsSource = fs.readFileSync(votingConstantsPath, 'utf8');

    // Should import from config
    expect(constantsSource).toContain('@/config');

    // Should NOT have hardcoded placeholder addresses in governance
    const lines = constantsSource.split('\n');
    const nonTestLines = lines.filter((line) => !line.includes('test') && !line.includes('TODO'));

    // Check for placeholder patterns in non-TODO lines
    nonTestLines.forEach((line) => {
      if (line.includes('0x')) {
        // If line contains address, it should not be a simple placeholder pattern like 0x...0001
        expect(line).not.toMatch(/0x0+1['\s]/);
        expect(line).not.toMatch(/0x0+2['\s]/);
        expect(line).not.toMatch(/0x0+3['\s]/);
      }
    });
  });

  /**
   * TEST 7: Voting components integration with real data
   */
  it('[TEST 7] should integrate with real gauge controller', () => {
    const votingHookPath = path.join(process.cwd(), 'src/components/voting/hooks/useVoting.ts');
    const hookSource = fs.readFileSync(votingHookPath, 'utf8');

    // Should use GaugeController contract
    expect(hookSource).toContain('GAUGE_CONTROLLER');
    expect(hookSource).toContain('batchVote');
  });

  /**
   * TEST 8: No mock pool data in governance sections
   */
  it('[TEST 8] should not have MOCK_POOLS in voting components', () => {
    const votingDir = path.join(process.cwd(), 'src/components/voting');
    const files = fs.readdirSync(votingDir, { recursive: true });
    const componentFiles = files.filter(
      (file) => typeof file === 'string' && file.endsWith('.tsx') && !file.includes('test')
    );

    componentFiles.forEach((file) => {
      const filePath = path.join(votingDir, String(file));
      const content = fs.readFileSync(filePath, 'utf8');

      // Should NOT contain MOCK_POOLS
      expect(content).not.toContain('MOCK_POOLS');
      expect(content).not.toContain('MOCK_POOL');
    });
  });
});
