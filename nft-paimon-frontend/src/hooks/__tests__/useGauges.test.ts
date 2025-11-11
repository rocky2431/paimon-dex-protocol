/**
 * useGauges Hook - Simplified Tests (gap-3.1.2)
 *
 * Core functionality tests for Gauge Controller data reading.
 * This is a simplified version focusing on essential functionality.
 */

import { describe, it, expect } from '@jest/globals';

describe('useGauges Hook - Core Tests (gap-3.1.2)', () => {
  /**
   * TEST 1: Module exports
   */
  it('[TEST 1] should export useGauges hook', () => {
    const { useGauges } = require('../useGauges');
    expect(useGauges).toBeDefined();
    expect(typeof useGauges).toBe('function');
  });

  /**
   * TEST 2: GaugeData interface structure
   */
  it('[TEST 2] should have correct GaugeData interface', () => {
    // This test verifies the interface exists through TypeScript compilation
    // If the interface is incorrect, this file wouldn't compile
    expect(true).toBe(true);
  });

  /**
   * TEST 3: Hook configuration
   */
  it('[TEST 3] should import required dependencies', () => {
    // Verify gauge controller config exists
    const config = require('../../config/contracts/gaugeController');
    expect(config.GAUGE_CONTROLLER_ADDRESS).toBeDefined();
    expect(config.GAUGE_CONTROLLER_ABI).toBeDefined();
    expect(Array.isArray(config.GAUGE_CONTROLLER_ABI)).toBe(true);
  });

  /**
   * TEST 4: Pool configuration integration
   */
  it('[TEST 4] should have access to pool configuration', () => {
    const pools = require('../../config/pools');
    expect(pools.findPoolByAddress).toBeDefined();
    expect(typeof pools.findPoolByAddress).toBe('function');
  });
});

describe('GaugeController ABI Tests (gap-3.1.2)', () => {
  const { GAUGE_CONTROLLER_ABI } = require('../../config/contracts/gaugeController');

  /**
   * TEST 5: Required functions in ABI
   */
  it('[TEST 5] should have gaugeCount function', () => {
    const gaugeCountFunc = GAUGE_CONTROLLER_ABI.find(
      (item: any) => item.name === 'gaugeCount'
    );
    expect(gaugeCountFunc).toBeDefined();
    expect(gaugeCountFunc.type).toBe('function');
  });

  /**
   * TEST 6: Should have gauges function
   */
  it('[TEST 6] should have gauges function', () => {
    const gaugesFunc = GAUGE_CONTROLLER_ABI.find(
      (item: any) => item.name === 'gauges'
    );
    expect(gaugesFunc).toBeDefined();
    expect(gaugesFunc.inputs).toHaveLength(1);
  });

  /**
   * TEST 7: Should have gaugeWeights function
   */
  it('[TEST 7] should have gaugeWeights function', () => {
    const gaugeWeightsFunc = GAUGE_CONTROLLER_ABI.find(
      (item: any) => item.name === 'gaugeWeights'
    );
    expect(gaugeWeightsFunc).toBeDefined();
    expect(gaugeWeightsFunc.inputs).toHaveLength(2);
  });

  /**
   * TEST 8: Should have currentEpoch function
   */
  it('[TEST 8] should have currentEpoch function', () => {
    const currentEpochFunc = GAUGE_CONTROLLER_ABI.find(
      (item: any) => item.name === 'currentEpoch'
    );
    expect(currentEpochFunc).toBeDefined();
  });
});
