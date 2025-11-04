/**
 * Swap Types Tests
 * TDD: RED phase - Verify Token enum includes USDP
 *
 * Test Dimensions:
 * 1. Functional - Token enum includes all required tokens
 * 2. Boundary - Token values are valid strings
 * 3. Exception - No duplicate token values
 */

import { Token, TokenInfo, SwapFormData, SwapCalculation, SwapValidation } from '../types';

describe('Token Enum - Functional Tests', () => {
  it('should include USDC token', () => {
    expect(Token.USDC).toBe('USDC');
  });

  it('should include USDP token', () => {
    expect(Token.USDP).toBe('USDP');
  });

  it('should have exactly 2 tokens', () => {
    const tokens = Object.values(Token);
    expect(tokens).toHaveLength(2);
  });
});

describe('Token Enum - Boundary Tests', () => {
  it('should have all token values as uppercase strings', () => {
    const tokens = Object.values(Token);
    tokens.forEach((token) => {
      expect(typeof token).toBe('string');
      expect(token).toBe(token.toUpperCase());
    });
  });

  it('should not have empty token values', () => {
    const tokens = Object.values(Token);
    tokens.forEach((token) => {
      expect(token).not.toBe('');
      expect(token.length).toBeGreaterThan(0);
    });
  });
});

describe('Token Enum - Exception Tests', () => {
  it('should not have duplicate token values', () => {
    const tokens = Object.values(Token);
    const uniqueTokens = new Set(tokens);
    expect(tokens.length).toBe(uniqueTokens.size);
  });

  it('should have valid token keys', () => {
    const tokenKeys = Object.keys(Token);
    tokenKeys.forEach((key) => {
      expect(key).toMatch(/^[A-Z]+$/); // All uppercase
    });
  });
});

describe('TokenInfo Interface - Functional Tests', () => {
  const mockTokenInfo: TokenInfo = {
    symbol: Token.USDP,
    name: 'USD Paimon',
    decimals: 18,
    address: '0x0000000000000000000000000000000000000001' as `0x${string}`,
    icon: '/tokens/usdp.svg',
  };

  it('should accept valid TokenInfo object', () => {
    expect(mockTokenInfo.symbol).toBe(Token.USDP);
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
  it('should support USDC to USDP swap', () => {
    const formData: SwapFormData = {
      inputAmount: '100',
      outputAmount: '99.9',
      inputToken: Token.USDC,
      outputToken: Token.USDP,
    };

    expect(formData.inputToken).toBe(Token.USDC);
    expect(formData.outputToken).toBe(Token.USDP);
  });

  it('should support USDP to USDC swap', () => {
    const formData: SwapFormData = {
      inputAmount: '100',
      outputAmount: '99.9',
      inputToken: Token.USDP,
      outputToken: Token.USDC,
    };

    expect(formData.inputToken).toBe(Token.USDP);
    expect(formData.outputToken).toBe(Token.USDC);
  });
});
