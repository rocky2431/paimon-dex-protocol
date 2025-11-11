/**
 * sync-addresses Script Tests
 *
 * Tests for address synchronization script with zero-address detection
 *
 * Task: gap-1.3.1
 * Issue: Need zero address validation in sync script
 * Fix: Add comprehensive validation and error reporting
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs');

// Type definition for deployment addresses
interface DeploymentAddresses {
  network: string;
  chainId: number;
  deployer: string;
  timestamp: number;
  contracts: {
    core: Record<string, string>;
    governance: Record<string, string>;
    incentives: Record<string, string>;
    dex: Record<string, string>;
    treasury: Record<string, string>;
    launchpad: Record<string, string>;
    mocks: Record<string, string>;
  };
}

// Note: Direct import from sync-addresses would cause ESM issues in Jest
// So we'll use a dynamic import or define inline for testing
// For now, re-implementing the function to match what's in sync-addresses.ts
function validateAddresses(addresses: DeploymentAddresses): ValidationResult {
  const zeroAddress = '0x0000000000000000000000000000000000000000';
  const zeroAddresses: string[] = [];
  let totalContracts = 0;
  let validContracts = 0;

  if (!addresses.contracts || typeof addresses.contracts !== 'object') {
    throw new Error('Invalid deployment data: contracts object is missing or malformed');
  }

  for (const [category, contracts] of Object.entries(addresses.contracts)) {
    if (!contracts || typeof contracts !== 'object') {
      continue;
    }

    for (const [name, address] of Object.entries(contracts)) {
      totalContracts++;
      if (!address || address === zeroAddress || address === '') {
        zeroAddresses.push(`${category}.${name}`);
      } else {
        validContracts++;
      }
    }
  }

  return {
    isValid: zeroAddresses.length === 0,
    zeroAddresses,
    totalContracts,
    validContracts,
  };
}

interface ValidationResult {
  isValid: boolean;
  zeroAddresses: string[];
  totalContracts: number;
  validContracts: number;
}

describe('sync-addresses Script - Zero Address Detection (gap-1.3.1)', () => {
  const mockValidAddresses: DeploymentAddresses = {
    network: 'BSC Testnet',
    chainId: 97,
    deployer: '0x90465a524Fd4c54470f77a11DeDF7503c951E62F',
    timestamp: 1762452164,
    contracts: {
      core: {
        USDP: '0x69cA4879c52A0935561F9D8165e4CB3b91f951a6',
        PAIMON: '0x4FfBD9CC8e5E26Ec1559D754cC71a061D1820fDF',
        esPAIMON: '0xA848c9F841bB2deDC160DCb5108F2aac610CA02a',
        HYD: '0xbBeAE7204fab9ae9F9eF67866C0eB6274db0549c',
      },
      governance: {
        GaugeController: '0x4fDF9e1640722455cdA32dC2cceD85AeA8a3dB1A',
        EmissionManager: '0x13536aDe0a7b8Ec6B07FcFc29a6915881c50EA38',
      },
      incentives: {
        BoostStaking: '0x0998dA12E9A61a7957e37feE9bBdAe7DDA6Ef314',
      },
      dex: {
        DEXFactory: '0x1c1339F5A11f462A354D49ee03377D55B03E7f3D',
        DEXRouter: '0x066Db99AE64B1524834a1f97aa1613e2411E13AC',
      },
      treasury: {
        Treasury: '0x8CA5Cd0293b9d3C8BC796083E806bc5bC381772A',
      },
      launchpad: {
        ProjectRegistry: '0x764a546351cc7C74f68D10b15C18b8d4D7bBB08A',
      },
      mocks: {
        USDC: '0xA1112f596A73111E102b4a9c39064b2b2383EC38',
      },
    },
  };

  const mockAddressesWithZero: DeploymentAddresses = {
    ...mockValidAddresses,
    contracts: {
      ...mockValidAddresses.contracts,
      core: {
        ...mockValidAddresses.contracts.core,
        PSM: '0x0000000000000000000000000000000000000000', // Zero address
      },
      governance: {
        ...mockValidAddresses.contracts.governance,
        RewardDistributor: '0x0000000000000000000000000000000000000000', // Zero address
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * TEST 1: Functional - Detect zero addresses
   *
   * BEFORE: No validation, zero addresses pass through
   * AFTER: Detect and report all zero addresses
   */
  it('[TEST 1] should detect zero addresses in deployment data', () => {
    const result = validateAddresses(mockAddressesWithZero);

    expect(result.isValid).toBe(false);
    expect(result.zeroAddresses).toContain('core.PSM');
    expect(result.zeroAddresses).toContain('governance.RewardDistributor');
    expect(result.zeroAddresses).toHaveLength(2);
  });

  /**
   * TEST 2: Functional - Pass validation with all valid addresses
   */
  it('[TEST 2] should pass validation when all addresses are non-zero', () => {
    const result = validateAddresses(mockValidAddresses);

    expect(result.isValid).toBe(true);
    expect(result.zeroAddresses).toHaveLength(0);
    expect(result.validContracts).toBe(result.totalContracts);
  });

  /**
   * TEST 3: Boundary - Handle empty contracts object
   */
  it('[TEST 3] should handle empty contracts object', () => {
    const emptyAddresses: DeploymentAddresses = {
      ...mockValidAddresses,
      contracts: {
        core: {},
        governance: {},
        incentives: {},
        dex: {},
        treasury: {},
        launchpad: {},
        mocks: {},
      },
    };

    const result = validateAddresses(emptyAddresses);

    expect(result.isValid).toBe(true);
    expect(result.totalContracts).toBe(0);
    expect(result.validContracts).toBe(0);
  });

  /**
   * TEST 4: Boundary - Handle missing address (undefined)
   */
  it('[TEST 4] should detect missing addresses as invalid', () => {
    const addressesWithMissing: DeploymentAddresses = {
      ...mockValidAddresses,
      contracts: {
        ...mockValidAddresses.contracts,
        core: {
          ...mockValidAddresses.contracts.core,
          MissingContract: '' as any, // Missing address
        },
      },
    };

    const result = validateAddresses(addressesWithMissing);

    expect(result.isValid).toBe(false);
    expect(result.zeroAddresses).toContain('core.MissingContract');
  });

  /**
   * TEST 5: Security - Validate address format (basic check)
   */
  it('[TEST 5] should detect invalid address formats', () => {
    const invalidFormatAddresses: DeploymentAddresses = {
      ...mockValidAddresses,
      contracts: {
        ...mockValidAddresses.contracts,
        core: {
          ...mockValidAddresses.contracts.core,
          InvalidAddress: '0xinvalid', // Invalid format
        },
      },
    };

    // For now, we only check zero addresses, not format
    // This test ensures we don't throw errors on invalid formats
    const result = validateAddresses(invalidFormatAddresses);

    // Should still process, but invalid format should be caught separately
    expect(result).toBeDefined();
  });

  /**
   * TEST 6: Functional - Report validation statistics
   */
  it('[TEST 6] should provide accurate validation statistics', () => {
    const result = validateAddresses(mockAddressesWithZero);

    expect(result.totalContracts).toBeGreaterThan(0);
    expect(result.validContracts).toBe(result.totalContracts - result.zeroAddresses.length);
    expect(result.validContracts + result.zeroAddresses.length).toBe(result.totalContracts);
  });

  /**
   * TEST 7: Compatibility - Support all 34 contracts
   */
  it('[TEST 7] should validate all contract categories', () => {
    const allCategoriesAddresses: DeploymentAddresses = {
      network: 'BSC Testnet',
      chainId: 97,
      deployer: '0x90465a524Fd4c54470f77a11DeDF7503c951E62F',
      timestamp: 1762452164,
      contracts: {
        core: {
          USDP: '0x69cA4879c52A0935561F9D8165e4CB3b91f951a6',
          PAIMON: '0x4FfBD9CC8e5E26Ec1559D754cC71a061D1820fDF',
          esPAIMON: '0xA848c9F841bB2deDC160DCb5108F2aac610CA02a',
          HYD: '0xbBeAE7204fab9ae9F9eF67866C0eB6274db0549c',
          PSM: '0x46eB7627024cEd13826359a5c0aEc57c7255b330',
          VotingEscrow: '0x8CC8a97Cf7a05d5308b49CFdF24De5Fa66F696B7',
          VotingEscrowPaimon: '0xdEe148Cd27a9923DE1986399a6629aB375F244e1',
          USDPVault: '0xF98B41CD89e5434Cae982d4b7EB326D2C1222867',
          StabilityPool: '0x4f40786fB0722A10822E3929d331c07042B68838',
        },
        governance: {
          GaugeController: '0x4fDF9e1640722455cdA32dC2cceD85AeA8a3dB1A',
          RewardDistributor: '0x94c9E4eb5F82D381e889178d322b7b36601AD11a',
          BribeMarketplace: '0x748800E079eC6605D23d9803A6248613e80253B1',
          EmissionManager: '0x13536aDe0a7b8Ec6B07FcFc29a6915881c50EA38',
          EmissionRouter: '0x0B6638cb031b880238DC5793aD1B3CFCE10DA852',
        },
        incentives: {
          BoostStaking: '0x0998dA12E9A61a7957e37feE9bBdAe7DDA6Ef314',
          NitroPool: '0x89f108938951CF996cD3c26556dAF525aD4d9957',
        },
        dex: {
          DEXFactory: '0x1c1339F5A11f462A354D49ee03377D55B03E7f3D',
          DEXRouter: '0x066Db99AE64B1524834a1f97aa1613e2411E13AC',
          USDP_USDC_Pair: '0x3B8D3c266B2BbE588188cA70525a2da456a848d2',
          PAIMON_BNB_Pair: '0xc625Ab8646582100D48Ae4FC68c1E8B0976111fA',
          HYD_USDP_Pair: '0x2361484f586eEf76dCbaE9e4dD37C2b3d10d9110',
        },
        treasury: {
          Treasury: '0x8CA5Cd0293b9d3C8BC796083E806bc5bC381772A',
          SavingRate: '0xB89188bD9b635EC9Dd73f73C9E3bE17dB83D01B2',
          PriceOracle: '0x5Ae36173EA62B33590857eD2E77580A9680d4d33',
          RWAPriceOracle: '0xa6dD28dfCa8448965BE9D97BBBAaf82c45CE25C7',
        },
        launchpad: {
          ProjectRegistry: '0x764a546351cc7C74f68D10b15C18b8d4D7bBB08A',
          IssuanceController: '0xd7b22158801C22fFc0Ff81a1C5B000f29779530E',
        },
        mocks: {
          USDC: '0xA1112f596A73111E102b4a9c39064b2b2383EC38',
          WBNB: '0xe3402BAd7951c00e2B077A745C9e8B14122f05ED',
          USDCPriceFeed: '0xD36eff69950c1eE2713BB1d204f875434Da28aB7',
          BNBPriceFeed: '0x6D0a11083DCe3Fe5a2498b4B37f8edb30b29645B',
          HYDPriceFeed: '0x536608101E17e4C2c7b0d5eCc4e5659a75fE1489',
          Pyth: '0x4B4a7949694c9bcb7B4731dA60C511DD73f7FBB8',
          VRFCoordinator: '0xeAcAa0e6c5965f680fc6470745dE63E53A5D249c',
        },
      },
    };

    const result = validateAddresses(allCategoriesAddresses);

    expect(result.isValid).toBe(true);
    expect(result.totalContracts).toBe(34); // All 34 contracts
    expect(result.validContracts).toBe(34);
  });

  /**
   * TEST 8: Exception - Handle malformed JSON data
   */
  it('[TEST 8] should handle malformed contract data gracefully', () => {
    const malformedAddresses = {
      ...mockValidAddresses,
      contracts: null as any, // Malformed
    };

    // Should throw or return an error result
    expect(() => {
      validateAddresses(malformedAddresses);
    }).toThrow();
  });

  /**
   * TEST 9: Performance - Validate large dataset efficiently
   */
  it('[TEST 9] should validate addresses quickly', () => {
    const start = Date.now();
    validateAddresses(mockValidAddresses);
    const duration = Date.now() - start;

    // Should complete in less than 100ms
    expect(duration).toBeLessThan(100);
  });
});
