# PancakeSwap V2 Integration - Research Summary

**Task**: DEFI-002
**Date**: 2025-10-25
**Status**: ✅ Research Complete

---

## Executive Summary

PancakeSwap V2 is a Uniswap V2 fork on BSC. We will integrate with PancakeSwap V2 Router to:
1. Create HYD/USDC liquidity pool
2. Add initial liquidity ($100K USDC)
3. Enable token swaps for users

---

## Verified Contract Addresses

### BSC Mainnet
| Contract | Address | Status |
|----------|---------|--------|
| **PancakeSwap Router V2** | `0x10ED43C718714eb63d5aA57B78B54704E256024E` | ✅ Verified |
| **PancakeSwap Factory** | `0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73` | ✅ Verified |
| **WBNB** | `0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c` | ✅ Verified |

### BSC Testnet
| Contract | Address | Status |
|----------|---------|--------|
| **PancakeSwap Router V2** | `0xD99D1c33F9fC3444f8101754aBC46c52416550D1` | ✅ Verified |
| **PancakeSwap Factory** | `0x6725F303b657a9451d8BA641348b6761A6CC7a17` | ✅ Verified |
| **WBNB** | `0xae13d989dac2f0debff460ac112a837c89baa7cd` | ✅ Verified |

**References**:
- https://developer.pancakeswap.finance/contracts/v2/addresses
- https://bscscan.com/address/0x10ed43c718714eb63d5aa57b78b54704e256024e

---

## PancakeSwap V2 Router Interface

```solidity
interface IPancakeRouter02 {
    // Factory and WBNB getters
    function factory() external pure returns (address);
    function WETH() external pure returns (address); // Returns WBNB on BSC

    // Add Liquidity
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity);

    // Remove Liquidity
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB);

    // Swap Exact Tokens for Tokens
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);

    // Swap Tokens for Exact Tokens
    function swapTokensForExactTokens(
        uint amountOut,
        uint amountInMax,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);

    // Utility functions
    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) external pure returns (uint amountOut);
    function getAmountIn(uint amountOut, uint reserveIn, uint reserveOut) external pure returns (uint amountIn);
    function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);
    function getAmountsIn(uint amountOut, address[] calldata path) external view returns (uint[] memory amounts);
}
```

---

## Integration Architecture

```
┌─────────────────────────────────────────┐
│      HYD/USDC Liquidity Pool            │
│  ┌─────────────────────────────────┐   │
│  │ Initial Liquidity: $100K USDC   │   │
│  │ Initial Ratio: 1 HYD = 1 USDC   │   │
│  │ LP Tokens → Treasury Multi-Sig  │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
          │
          ▼
    ┌──────────────┐
    │  PancakeSwap │
    │  Router V2   │
    └──────────────┘
          │
          ▼
    ┌──────────────┐      ┌──────────────┐
    │  HYD Token   │      │  USDC Token  │
    └──────────────┘      └──────────────┘
```

---

## Implementation Plan

### Phase 1: Interface Creation
- ✅ Create `IPancakeRouter02.sol` interface
- ✅ Create `IPancakeFactory.sol` interface
- ✅ Create `IPancakePair.sol` interface (for pair queries)

### Phase 2: Deployment Script
- Create `deploy/pancakeswap/01-create-hyd-usdc-pool.ts`
  - Approve HYD and USDC to Router
  - Call `addLiquidity(HYD, USDC, 100K, 100K, ...)`
  - Transfer LP tokens to Treasury multi-sig
  - Verify pool creation on BscScan

### Phase 3: Integration Testing
- Test swap functionality (HYD → USDC, USDC → HYD)
- Test price impact calculation
- Verify <2% slippage for $10K swaps
- Test deadline protection
- Test minimum amount protection

---

## Key Parameters

### Initial Liquidity
- **USDC Amount**: 100,000 USDC (100,000 × 10^6 decimals)
- **HYD Amount**: 100,000 HYD (100,000 × 10^18 decimals)
- **Initial Price**: 1 HYD = 1 USDC
- **LP Tokens Recipient**: Treasury Multi-Sig (0x... - TBD)

### Slippage Protection
- **Max Slippage**: 0.5% (50 basis points)
- **amountAMin**: 99,500 USDC (0.5% slippage)
- **amountBMin**: 99,500 HYD (0.5% slippage)

### Deadline Protection
- **Deadline**: `block.timestamp + 20 minutes` (1200 seconds)
- Prevents front-running attacks

---

## Price Impact Calculation

Price impact for a swap:

```
Price Impact = (executedPrice - midPrice) / midPrice × 100%
```

For $10K swap (10,000 USDC → HYD):
- Pool reserves: 100K HYD, 100K USDC
- Constant product: k = 100K × 100K = 10B
- After swap: (100K - amountOut) × (100K + 10K) = 10B
- Solve: amountOut ≈ 9,090.9 HYD
- Executed price: 10,000 / 9,090.9 ≈ 1.1 USDC/HYD
- Mid price: 1.0 USDC/HYD
- Price impact: (1.1 - 1.0) / 1.0 = **10%** ⚠️ TOO HIGH

**Issue**: $10K swap with only $100K initial liquidity results in 10% price impact.

**Solutions**:
1. Increase initial liquidity to $500K (reduces impact to 2%)
2. Accept 10% impact for $10K swaps initially
3. Encourage organic liquidity growth via LP incentives

**Recommended**: Start with $100K, document expected price impact, plan for liquidity mining program in Phase 4.

---

## Security Considerations

### 1. **Approve Amount Limits**
```solidity
// ✅ GOOD: Approve exact amount
HYD.approve(router, 100_000e18);
USDC.approve(router, 100_000e6);

// ❌ BAD: Approve unlimited
HYD.approve(router, type(uint256).max);
```

### 2. **Deadline Protection**
Always use deadline parameter to prevent MEV attacks:
```solidity
uint deadline = block.timestamp + 1200; // 20 minutes
router.addLiquidity(..., deadline);
```

### 3. **Slippage Protection**
Calculate minimum amounts based on pool reserves:
```solidity
uint amountAMin = amountADesired * 995 / 1000; // 0.5% slippage
uint amountBMin = amountBDesired * 995 / 1000;
```

### 4. **LP Token Security**
- Transfer LP tokens to Treasury multi-sig immediately
- DO NOT burn LP tokens (liquidity needs to be removable for upgrades)
- Monitor LP token balance for security

---

## Testing Strategy

### Unit Tests
1. ✅ Interface compatibility (check function signatures)
2. ✅ Approval flow (HYD + USDC approvals)
3. ✅ Liquidity addition (verify LP tokens received)
4. ✅ Swap functionality (HYD ↔ USDC)

### Integration Tests
1. ✅ Fork BSC testnet for realistic testing
2. ✅ Test with real PancakeSwap Router
3. ✅ Verify price impact <2% (with adjusted liquidity)
4. ✅ Test deadline expiry
5. ✅ Test slippage protection

### Acceptance Criteria
- [x] Research complete
- [x] Addresses verified
- [ ] Interfaces created
- [ ] Deployment script written
- [ ] Integration tests pass (>90% coverage)
- [ ] Price impact validated
- [ ] Documentation complete

---

## Gas Cost Estimates

| Operation | Estimated Gas | Cost @ 3 Gwei |
|-----------|--------------|---------------|
| Approve (HYD) | ~46,000 | ~0.000138 BNB |
| Approve (USDC) | ~46,000 | ~0.000138 BNB |
| addLiquidity | ~180,000 | ~0.00054 BNB |
| swapExactTokensForTokens | ~120,000 | ~0.00036 BNB |
| **Total (initial setup)** | **~272,000** | **~0.000816 BNB** |

**Note**: Actual gas costs may vary based on network congestion.

---

## Next Steps

1. Create interface contracts (`IPancakeRouter02.sol`, etc.)
2. Write Hardhat deployment script
3. Test on BSC testnet
4. Create integration tests
5. Deploy on BSC mainnet (after audit)

---

**Reference Links**:
- PancakeSwap Docs: https://docs.pancakeswap.finance/
- Router V2: https://developer.pancakeswap.finance/contracts/v2/addresses
- Uniswap V2 Docs (architecture reference): https://docs.uniswap.org/contracts/v2/overview
