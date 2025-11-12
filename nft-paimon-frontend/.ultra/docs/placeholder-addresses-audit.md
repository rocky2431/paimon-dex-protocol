# Placeholder Addresses Audit Report

**Date**: 2025-11-12
**Task**: mock-2.1
**Auditor**: Claude Code (Ultra Builder Pro 4.0)

---

## Executive Summary

This audit reviewed **21 placeholder addresses** found in the codebase. All addresses have been categorized into three groups based on risk level and required action:

- **Category A (Reasonable)**: 9 addresses - Inactive features with `isActive: false` flags (✅ Acceptable)
- **Category B (Zero-checks)**: 10 addresses - Normal conditional logic for validation (✅ Acceptable)
- **Category C (Needs Fix)**: 2 addresses - Should use real deployed addresses (⚠️ Requires Action)

**Overall Status**: 19/21 addresses (90.5%) are acceptable. 2 addresses require deployment updates.

---

## Category A: Reasonable Placeholders (9 addresses)

These addresses represent **inactive features** with explicit `isActive: false` flags. They are safe placeholders for future deployment.

### Treasury RWA Tokens (3 addresses)

**File**: `src/components/treasury/constants.ts`

| Line | Address | Name | Status |
|------|---------|------|--------|
| 14 | `0x0000...0001` | US Treasury T-Bill | `isActive: false` |
| 23 | `0x0000...0002` | Investment Grade Credit | `isActive: false` |
| 32 | `0x0000...0003` | Real Estate Pool | `isActive: false` |

**Rationale**: These are Tier 1/2/3 RWA collateral tokens that will be deployed in future phases. The `isActive: false` flag prevents users from selecting them in the UI.

**Action Required**: ✅ None - Add TODO comments for Phase 3.2+ deployment plan

---

### Liquidity Pool Addresses (6 addresses)

**File**: `src/components/liquidity/constants.ts`

| Line | Address | Description | Status |
|------|---------|-------------|--------|
| 30 | `0x0000...0000` | Pool placeholder | `isActive: false` |
| 33 | `0x0000...0000` | Pool placeholder | `isActive: false` |
| 92 | `0x0000...0010` | Example pool | `isActive: false` |
| 105 | `0x0000...0011` | Example pool | `isActive: false` |
| 118 | `0x0000...0012` | Example pool | `isActive: false` |
| 131+ | `0x0000...00XX` | Additional pool | `isActive: false` |

**Rationale**: These are example/template liquidity pool configurations. The `isActive: false` flag prevents them from appearing in the UI or being used in queries.

**Action Required**: ✅ None - Add TODO comments clarifying these are templates

---

## Category B: Zero-Address Checks (10 addresses)

These are **normal conditional logic patterns** that check for valid addresses before executing operations. Not actual placeholder addresses.

### Treasury Hooks (6 occurrences)

**Files**:
- `src/components/treasury/hooks/useDepositPreview.ts` (Lines 45, 73)
- `src/components/treasury/hooks/useRWABalance.ts` (Lines 29, 51, 63)
- `src/components/treasury/hooks/useRWAPrice.ts` (Line 16)

**Pattern**:
```typescript
// Validate address before contract call
assetAddress !== "0x0000000000000000000000000000000000000000"
```

**Rationale**: Standard validation to prevent contract calls with invalid addresses. This is a **security best practice**, not a placeholder issue.

**Action Required**: ✅ None - Add explanatory comment: "Zero-address validation (security check)"

---

### AMM & User Portfolio Hooks (4 occurrences)

**Files**:
- `src/hooks/useAMMSwap.ts` (Line 142)
- `src/hooks/useGauges.ts` (Line 202)
- `src/hooks/useSystemMetrics.ts` (Line 109)
- `src/hooks/useUserPortfolio.ts` (Line 202)

**Pattern**:
```typescript
// Filter out zero-addresses from query results
.filter((addr) => addr !== "0x0000000000000000000000000000000000000000")
```

**Rationale**: Filtering invalid addresses from contract query results. Common pattern when contracts return array of addresses.

**Action Required**: ✅ None - Add explanatory comment: "Filter zero-addresses from contract results"

---

## Category C: Needs Fixing (2 addresses)

These placeholder addresses **should be replaced** with real deployed contract addresses.

### 1. Analytics Contract Address

**File**: `src/components/analytics/hooks/useAnalytics.ts`
**Line**: 70
**Current Value**: `0x0000000000000000000000000000000000000A00`

**Issue**: Placeholder for analytics aggregator contract (not yet deployed)

**Impact**:
- Analytics features will fail if queried
- Currently marked with TODO comment

**Recommended Action**:
```typescript
// Option 1: Use TESTNET_ADDRESSES if contract is deployed
import { TESTNET_ADDRESSES } from '@/config/chains/generated/testnet';
const ANALYTICS_ADDRESS = TESTNET_ADDRESSES.analytics?.aggregator ?? '0x0A00...';

// Option 2: If not deployed, add isActive flag
const ANALYTICS_CONFIG = {
  address: '0x0A00...',
  isActive: false, // Deploy in Phase 3.2
};
```

**Priority**: Medium (feature not critical for MVP)

---

### 2. PSM Mainnet Address Placeholder

**File**: `src/hooks/useConfigValidation.ts`
**Line**: 53
**Current Value**: `0x0000000000000000000000000000000000000000`

**Issue**: Placeholder for PSM contract on mainnet (testnet already deployed)

**Impact**:
- Only affects mainnet deployment validation
- Testnet PSM address is correct: `TESTNET_ADDRESSES.core.psm`

**Recommended Action**:
```typescript
// Current (correct for testnet):
const expectedAddresses = {
  testnet: {
    PSM: TESTNET_ADDRESSES.core.psm, // ✅ Already deployed
  },
  mainnet: {
    PSM: '0x0000...0000' as `0x${string}`, // TODO: Update after mainnet deploy
  },
};
```

**Priority**: Low (mainnet not deployed yet, TODO comment already present)

---

## Previously Fixed (mock-1.6)

These placeholder addresses were successfully replaced in task mock-1.6:

| File | Line | Old Value | New Value | Status |
|------|------|-----------|-----------|--------|
| `src/components/bribes/constants.ts` | 13 | `0x0000...1000` | `TESTNET_ADDRESSES.governance.bribeMarketplace` | ✅ Fixed |
| `src/components/rewards/constants.ts` | 11 | `0x0000...0002` | `TESTNET_ADDRESSES.core.paimon` | ✅ Fixed |

**Verification**:
- BribeMarketplace: `0x748800E079eC6605D23d9803A6248613e80253B1` ✅
- PAIMON: `0x4FfBD9CC8e5E26Ec1559D754cC71a061D1820fDF` ✅

---

## Summary Table

| Category | Count | Status | Action Required |
|----------|-------|--------|-----------------|
| **A - Reasonable** | 9 | ✅ Acceptable | Add TODO comments |
| **B - Zero-checks** | 10 | ✅ Acceptable | Add explanatory comments |
| **C - Needs Fix** | 2 | ⚠️ Action needed | Deploy contracts or add isActive flags |
| **Previously Fixed** | 2 | ✅ Complete | None |
| **Total Audited** | 23 | 91.3% acceptable | 2 pending deployment |

---

## Recommendations

### Immediate Actions (Phase 2.0 - Current)

1. ✅ **Category A**: Add TODO comments to inactive features
   - Treasury RWA tokens: "TODO Phase 3.2+: Deploy and update address"
   - Liquidity pools: "TODO: Template - update with real pool after creation"

2. ✅ **Category B**: Add explanatory comments to zero-address checks
   - "Zero-address validation (security check)"
   - "Filter invalid addresses from contract results"

3. ⚠️ **Category C - Analytics**: Add `isActive: false` flag until contract deployed

4. ⚠️ **Category C - PSM Mainnet**: Keep TODO comment, update after mainnet deployment

### Future Actions (Phase 3.2+)

1. **Deploy Analytics Aggregator Contract**
   - Update `src/components/analytics/hooks/useAnalytics.ts` with real address
   - Remove `isActive: false` flag

2. **Mainnet Deployment**
   - Update `src/hooks/useConfigValidation.ts` with mainnet PSM address

3. **RWA Token Deployment**
   - Deploy US Treasury T-Bill token contract
   - Deploy Investment Grade Credit token contract
   - Deploy Real Estate Pool token contract
   - Update `src/components/treasury/constants.ts` with real addresses
   - Set `isActive: true` for deployed tokens

---

## Audit Conclusion

**Overall Assessment**: ✅ **PASS with Minor Actions**

- 90.5% of placeholder addresses are acceptable with proper documentation
- 2 addresses pending future contract deployments (expected for current phase)
- No security risks identified
- All critical contracts (PSM, PAIMON, BribeMarketplace) already using real addresses

**Next Steps**:
1. Add TODO comments to Category A addresses
2. Add explanatory comments to Category B zero-address checks
3. Update `.ultra/docs/hardcoded-data-scan-report.md` with audit status
4. Mark task mock-2.1 as completed

---

**Audit completed by**: Claude Code (Ultra Builder Pro 4.0)
**Date**: 2025-11-12
**Git Branch**: `feat/task-mock-2.1-audit-placeholders`
