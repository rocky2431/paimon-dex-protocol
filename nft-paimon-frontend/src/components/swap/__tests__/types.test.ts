/**
 * Swap Types Tests
 * TDD: Verify Token type and TOKEN_CONFIG work correctly with dynamic config
 *
 * Test Dimensions:
 * 1. Functional - TOKEN_CONFIG includes all deployed tokens
 * 2. Boundary - Token values are valid strings
 * 3. Exception - Zero-address tokens are filtered out
 */

import { Token, TokenInfo, SwapFormData, SwapCalculation, SwapValidation } from '../types';
import { TOKEN_CONFIG } from '../constants';
import { config } from '@/config';

describe('Token Type - Functional Tests', () => {
  it('should have usdc token in TOKEN_CONFIG', () => {
    expect(TOKEN_CONFIG['usdc']).toBeDefined();
    expect(TOKEN_CONFIG['usdc'].symbol).toBe('usdc');
  });

  it('should have usdp token in TOKEN_CONFIG', () => {
    expect(TOKEN_CONFIG['usdp']).toBeDefined();
    expect(TOKEN_CONFIG['usdp'].symbol).toBe('usdp');
  });

  it('should filter out tokens with zero address', () => {
    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

    // Check that all tokens in TOKEN_CONFIG have non-zero addresses
    Object.values(TOKEN_CONFIG).forEach((tokenInfo) => {
      expect(tokenInfo.address).not.toBe(ZERO_ADDRESS);
    });
  });

  it('should include all non-zero address tokens from config', () => {
    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
    const nonZeroTokens = Object.entries(config.tokenConfig).filter(
      ([_, token]) => token.address !== ZERO_ADDRESS
    );

    expect(Object.keys(TOKEN_CONFIG).length).toBe(nonZeroTokens.length);
  });
});

describe('Token Type - Boundary Tests', () => {
  it('should have all token symbols as lowercase strings', () => {
    Object.values(TOKEN_CONFIG).forEach((tokenInfo) => {
      expect(typeof tokenInfo.symbol).toBe('string');
      expect(tokenInfo.symbol).toBe(tokenInfo.symbol.toLowerCase());
    });
  });

  it('should not have empty token symbols', () => {
    Object.values(TOKEN_CONFIG).forEach((tokenInfo) => {
      expect(tokenInfo.symbol).not.toBe('');
      expect(tokenInfo.symbol.length).toBeGreaterThan(0);
    });
  });

  it('should have valid decimals (6 or 18)', () => {
    Object.values(TOKEN_CONFIG).forEach((tokenInfo) => {
      expect([6, 18]).toContain(tokenInfo.decimals);
    });
  });
});

describe('Token Type - Exception Tests', () => {
  it('should not have duplicate token symbols', () => {
    const symbols = Object.values(TOKEN_CONFIG).map((t) => t.symbol);
    const uniqueSymbols = new Set(symbols);
    expect(symbols.length).toBe(uniqueSymbols.size);
  });

  it('should not have duplicate token addresses', () => {
    const addresses = Object.values(TOKEN_CONFIG).map((t) => t.address);
    const uniqueAddresses = new Set(addresses);
    expect(addresses.length).toBe(uniqueAddresses.size);
  });

  it('should have valid token addresses (0x + 40 hex chars)', () => {
    Object.values(TOKEN_CONFIG).forEach((tokenInfo) => {
      expect(tokenInfo.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });
  });
});

describe('TokenInfo Interface - Functional Tests', () => {
  const mockTokenInfo: TokenInfo = {
    symbol: "usdp" as Token,
    name: 'USD Paimon',
    decimals: 18,
    address: '0x0000000000000000000000000000000000000001' as `0x${string}`,
    icon: '/tokens/usdp.svg',
  };

  it('should accept valid TokenInfo object', () => {
    expect(mockTokenInfo.symbol).toBe("usdp");
    expect(mockTokenInfo.name).toBe('USD Paimon');
    expect(mockTokenInfo.decimals).toBe(18);
  });

  it('should have valid address format', () => {
    expect(mockTokenInfo.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it('should have valid icon path', () => {
    expect(mockTokenInfo.icon).toMatch(/^\/tokens\/.*\.(svg|png)$/);
  });
});

describe('SwapFormData Interface - Functional Tests', () => {
  it('should support usdc to usdp swap', () => {
    const formData: SwapFormData = {
      inputAmount: '100',
      outputAmount: '99.9',
      inputToken: "usdc" as Token,
      outputToken: "usdp" as Token,
    };

    expect(formData.inputToken).toBe("usdc");
    expect(formData.outputToken).toBe("usdp");
  });

  it('should support usdp to usdc swap', () => {
    const formData: SwapFormData = {
      inputAmount: '100',
      outputAmount: '99.9',
      inputToken: "usdp" as Token,
      outputToken: "usdc" as Token,
    };

    expect(formData.inputToken).toBe("usdp");
    expect(formData.outputToken).toBe("usdc");
  });
});
