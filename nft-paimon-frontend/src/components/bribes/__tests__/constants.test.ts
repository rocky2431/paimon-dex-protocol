/**
 * Bribes Constants Tests
 * TDD: RED phase - Verify esPaimon token support
 *
 * Test Dimensions:
 * 1. Functional - esPaimon token in whitelist
 * 2. Boundary - Token properties validation
 * 3. Exception - Invalid token address handling
 * 4. Security - Address case sensitivity
 * 5. Compatibility - Token config structure
 */

import {
  WHITELISTED_BRIBE_TOKENS,
  getBribeTokenByAddress,
  calculatePlatformFee,
  calculateNetBribeAmount,
  PLATFORM_FEE_RATE,
  FEE_DENOMINATOR,
} from '../constants';

describe('WHITELISTED_BRIBE_TOKENS - Functional Tests', () => {
  it('should include esPaimon token in whitelist', () => {
    const esPaimonToken = WHITELISTED_BRIBE_TOKENS.find(
      (token) => token.symbol === 'esPAIMON'
    );
    expect(esPaimonToken).toBeDefined();
    expect(esPaimonToken?.symbol).toBe('esPAIMON');
  });

  it('should have at least 5 whitelisted tokens (USDC, BUSD, WBNB, PAIMON, esPAIMON)', () => {
    expect(WHITELISTED_BRIBE_TOKENS.length).toBeGreaterThanOrEqual(5);
  });

  it('should have USDC, BUSD, WBNB, PAIMON, and esPAIMON tokens', () => {
    const symbols = WHITELISTED_BRIBE_TOKENS.map((t) => t.symbol);
    expect(symbols).toContain('USDC');
    expect(symbols).toContain('BUSD');
    expect(symbols).toContain('WBNB');
    expect(symbols).toContain('PAIMON');
    expect(symbols).toContain('esPAIMON');
  });

  it('should have valid esPaimon token address format', () => {
    const esPaimonToken = WHITELISTED_BRIBE_TOKENS.find(
      (token) => token.symbol === 'esPAIMON'
    );
    expect(esPaimonToken?.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it('should have correct esPaimon token decimals (18)', () => {
    const esPaimonToken = WHITELISTED_BRIBE_TOKENS.find(
      (token) => token.symbol === 'esPAIMON'
    );
    expect(esPaimonToken?.decimals).toBe(18);
  });

  it('should have esPaimon token name', () => {
    const esPaimonToken = WHITELISTED_BRIBE_TOKENS.find(
      (token) => token.symbol === 'esPAIMON'
    );
    expect(esPaimonToken?.name).toBeTruthy();
    expect(esPaimonToken?.name.length).toBeGreaterThan(0);
  });

  it('should have esPaimon token icon path', () => {
    const esPaimonToken = WHITELISTED_BRIBE_TOKENS.find(
      (token) => token.symbol === 'esPAIMON'
    );
    expect(esPaimonToken?.logoURI).toMatch(/^\/tokens\/.*\.(svg|png)$/);
  });
});

describe('WHITELISTED_BRIBE_TOKENS - Boundary Tests', () => {
  it('should not have empty token addresses', () => {
    WHITELISTED_BRIBE_TOKENS.forEach((token) => {
      expect(token.address).toBeTruthy();
      expect(token.address.length).toBe(42); // 0x + 40 hex chars
    });
  });

  it('should not have zero decimals', () => {
    WHITELISTED_BRIBE_TOKENS.forEach((token) => {
      expect(token.decimals).toBeGreaterThan(0);
      expect(token.decimals).toBeLessThanOrEqual(18);
    });
  });

  it('should not have empty token symbols', () => {
    WHITELISTED_BRIBE_TOKENS.forEach((token) => {
      expect(token.symbol).toBeTruthy();
      expect(token.symbol.length).toBeGreaterThan(0);
    });
  });

  it('should not have empty token names', () => {
    WHITELISTED_BRIBE_TOKENS.forEach((token) => {
      expect(token.name).toBeTruthy();
      expect(token.name.length).toBeGreaterThan(0);
    });
  });
});

describe('WHITELISTED_BRIBE_TOKENS - Exception Tests', () => {
  it('should not have duplicate token addresses', () => {
    const addresses = WHITELISTED_BRIBE_TOKENS.map((t) => t.address.toLowerCase());
    const uniqueAddresses = new Set(addresses);
    expect(addresses.length).toBe(uniqueAddresses.size);
  });

  it('should not have duplicate token symbols', () => {
    const symbols = WHITELISTED_BRIBE_TOKENS.map((t) => t.symbol);
    const uniqueSymbols = new Set(symbols);
    expect(symbols.length).toBe(uniqueSymbols.size);
  });

  it('should have all tokens with logoURI', () => {
    WHITELISTED_BRIBE_TOKENS.forEach((token) => {
      expect(token.logoURI).toBeTruthy();
    });
  });
});

describe('getBribeTokenByAddress - Functional Tests', () => {
  it('should find esPaimon token by address', () => {
    const esPaimonToken = WHITELISTED_BRIBE_TOKENS.find(
      (token) => token.symbol === 'esPAIMON'
    );
    if (!esPaimonToken) {
      throw new Error('esPaimon token not found in whitelist');
    }

    const found = getBribeTokenByAddress(esPaimonToken.address);
    expect(found).toBeDefined();
    expect(found?.symbol).toBe('esPAIMON');
  });

  it('should find USDC token by address', () => {
    const usdcToken = WHITELISTED_BRIBE_TOKENS.find(
      (token) => token.symbol === 'USDC'
    );
    if (!usdcToken) {
      throw new Error('USDC token not found in whitelist');
    }

    const found = getBribeTokenByAddress(usdcToken.address);
    expect(found).toBeDefined();
    expect(found?.symbol).toBe('USDC');
  });

  it('should return undefined for non-whitelisted address', () => {
    const randomAddress = '0x0000000000000000000000000000000000000999' as `0x${string}`;
    const found = getBribeTokenByAddress(randomAddress);
    expect(found).toBeUndefined();
  });
});

describe('getBribeTokenByAddress - Security Tests', () => {
  it('should be case-insensitive when finding tokens', () => {
    const esPaimonToken = WHITELISTED_BRIBE_TOKENS.find(
      (token) => token.symbol === 'esPAIMON'
    );
    if (!esPaimonToken) {
      throw new Error('esPaimon token not found in whitelist');
    }

    const uppercase = esPaimonToken.address.toUpperCase() as `0x${string}`;
    const lowercase = esPaimonToken.address.toLowerCase() as `0x${string}`;

    expect(getBribeTokenByAddress(uppercase)).toBeDefined();
    expect(getBribeTokenByAddress(lowercase)).toBeDefined();
  });
});

describe('calculatePlatformFee - Functional Tests', () => {
  it('should calculate 2% platform fee correctly', () => {
    const amount = 10000n; // 10,000 tokens
    const fee = calculatePlatformFee(amount);
    const expected = (amount * BigInt(PLATFORM_FEE_RATE)) / BigInt(FEE_DENOMINATOR);
    expect(fee).toBe(expected);
    expect(fee).toBe(200n); // 2% of 10,000 = 200
  });

  it('should return 0 fee for 0 amount', () => {
    const fee = calculatePlatformFee(0n);
    expect(fee).toBe(0n);
  });
});

describe('calculateNetBribeAmount - Functional Tests', () => {
  it('should calculate net amount (98%) correctly', () => {
    const amount = 10000n; // 10,000 tokens
    const net = calculateNetBribeAmount(amount);
    expect(net).toBe(9800n); // 98% of 10,000 = 9,800
  });

  it('should return 0 net amount for 0 input', () => {
    const net = calculateNetBribeAmount(0n);
    expect(net).toBe(0n);
  });

  it('should satisfy: net amount + fee = original amount', () => {
    const amount = 50000n;
    const fee = calculatePlatformFee(amount);
    const net = calculateNetBribeAmount(amount);
    expect(net + fee).toBe(amount);
  });
});

describe('calculateNetBribeAmount - Boundary Tests', () => {
  it('should handle very large amounts', () => {
    const amount = 1000000000000000000n; // 1 token with 18 decimals
    const net = calculateNetBribeAmount(amount);
    const fee = calculatePlatformFee(amount);
    expect(net + fee).toBe(amount);
  });

  it('should handle minimum amount (1 wei)', () => {
    const amount = 1n;
    const net = calculateNetBribeAmount(amount);
    expect(net).toBe(1n); // Fee will be 0 due to rounding
  });
});

describe('Platform Fee Configuration - Functional Tests', () => {
  it('should have correct platform fee rate (2%)', () => {
    expect(PLATFORM_FEE_RATE).toBe(200);
    expect(FEE_DENOMINATOR).toBe(10000);
    expect(PLATFORM_FEE_RATE / FEE_DENOMINATOR).toBe(0.02); // 2%
  });
});
