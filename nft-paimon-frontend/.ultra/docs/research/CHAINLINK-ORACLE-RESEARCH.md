# Chainlink Oracle Integration - Research Summary

**Task**: DEFI-001
**Date**: 2025-10-25
**Status**: ✅ Research Complete

---

## Executive Summary

Implementing **dual-oracle architecture** with Chainlink (primary) + Pyth Network (fallback) for BSC deployment.

**Key Decisions**:
- ✅ Chainlink as primary (push model, 15min heartbeat, 0.1% deviation)
- ✅ Pyth as fallback (pull model, <400ms latency, lower gas for updates)
- ✅ 5% deviation threshold triggers circuit breaker
- ✅ 1 hour staleness threshold (3600s)
- ✅ 30 minute recovery delay after circuit breaker trips

---

## Verified Contract Addresses (BSC Mainnet)

| Asset | Chainlink Feed | Pyth Feed ID | Status |
|-------|---------------|--------------|--------|
| USDC/USD | `0x51597f405303C4377E36123cBc172b13269EA163` | `0xeaa020...c94a` | ✅ |
| USDT/USD | `0xB97Ad0E74fa7d920791E90258A6E2085088b4320` | `0x2b89b9...e53b` | ✅ |
| BNB/USD | `0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE` | `0x2f9586...1c4f` | ✅ |

**Pyth Contract (BSC)**: `0x4D7E825f80bDf85e913E0DD2A2D54927e9dE1594`

---

## Architecture Design

```
┌─────────────────────────────────────┐
│     PriceOracle (Our Contract)      │
│  ┌───────────────────────────────┐  │
│  │ 1. Try Chainlink (primary)    │  │
│  │ 2. Validate with Pyth         │  │
│  │ 3. Check deviation (5%)       │  │
│  │ 4. If >5% → Use Pyth fallback │  │
│  │ 5. Trip circuit breaker       │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
          │                  │
          ▼                  ▼
    ┌──────────┐      ┌──────────┐
    │Chainlink │      │   Pyth   │
    │ (Push)   │      │  (Pull)  │
    └──────────┘      └──────────┘
```

---

## Security Best Practices

1. **Price Validation**:
   - ✅ Check `roundId != 0`
   - ✅ Check `price > 0`
   - ✅ Check `updatedAt <= block.timestamp`
   - ✅ Check staleness: `block.timestamp - updatedAt <= 3600`

2. **Decimal Normalization**:
   - Chainlink: 8 decimals (standard)
   - Pyth: Variable (check `expo` field)
   - ✅ Normalize all to 8 decimals

3. **Circuit Breaker**:
   - Deviation = `|CL - Pyth| / CL * 10000` (basis points)
   - Trip threshold: 500 bps (5%)
   - Recovery delay: 1800s (30 minutes)

---

## Gas Costs

| Operation | Chainlink | Pyth | Notes |
|-----------|-----------|------|-------|
| Price Read | ~25K gas | ~25K gas (cached) | Similar |
| With Update | N/A | ~80K gas | Pyth requires update |
| Update Fee | $0 (included) | ~$0.01-0.10 USD | Per update |

**Recommendation**: Use Chainlink for frequent reads, Pyth for fallback validation.

---

## Test Coverage Requirements

- ✅ Happy path: Chainlink working, Pyth validates
- ✅ Staleness: Prices >1 hour old rejected
- ✅ Circuit breaker: 5% deviation triggers fallback
- ✅ Recovery: Automatic recovery after 30 minutes
- ✅ Fallback: Chainlink down → Pyth takes over
- ✅ Both down: Revert transaction
- ✅ Gas benchmarks: <100K per price read

Target: **>90% coverage**

---

## Common Pitfalls (Avoided)

1. ❌ Using deprecated `answeredInRound` check
2. ❌ Not validating `updatedAt > block.timestamp`
3. ❌ Mixing decimal precisions
4. ❌ Hardcoding Pyth update fee
5. ❌ No circuit breaker recovery mechanism

---

## Implementation Status

- [x] Research complete
- [x] Addresses verified
- [ ] Contracts implemented
- [ ] Tests written (>90% coverage)
- [ ] Gas benchmarks validated
- [ ] Security audit
- [ ] BSC Testnet deployment
- [ ] BSC Mainnet deployment

---

**Next Steps**: Implement `PriceOracle.sol` with TDD workflow (RED → GREEN → REFACTOR)

**Reference**: Full research report in `/DEFI-001-Research-Agent-Report.md`
