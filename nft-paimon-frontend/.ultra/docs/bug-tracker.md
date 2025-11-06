# Bug Tracker - Frontend Refactor V2

**Last Updated:** 2025-11-07  
**Project:** nft-paimon-frontend  
**Version:** 0.1.0

---

## Bug Classification

Bugs are classified using the following priority levels:

- **P0 (Critical)** - Blocks core functionality, requires immediate fix
- **P1 (High)** - Important functionality impaired, fix within 1-2 days
- **P2 (Medium)** - Non-critical issues, fix within 1 week
- **P3 (Low)** - Minor issues, cosmetic fixes, fix when convenient

---

## Active Bugs

### P0 - Critical Bugs

None reported.

---

### P1 - High Priority Bugs

None reported.

---

### P2 - Medium Priority Bugs

None reported.

---

### P3 - Low Priority Bugs

None reported.

---

## Resolved Bugs

### Recently Fixed (Last 7 Days)

| ID | Priority | Title | Fixed Date | PR/Commit | Notes |
|----|----------|-------|------------|-----------|-------|
| - | - | - | - | - | No recent fixes |

---

## Known Issues (Not Bugs)

These are expected behaviors or limitations:

1. **Mock Data Usage**
   - **Component:** Nitro page, Boost page
   - **Status:** Temporary - will be replaced with real contract data
   - **Impact:** None (demo purposes only)

2. **Missing Contract Addresses**
   - **Component:** Various pages depending on feature flags
   - **Status:** Awaiting testnet deployment
   - **Impact:** Features disabled via feature flags

---

## Bug Reporting Guidelines

### How to Report a Bug

1. **Check if already reported** - Search this file first
2. **Create a detailed report** - Use the template below
3. **Assign priority** - Based on classification above
4. **Add to appropriate section** - P0/P1/P2/P3

### Bug Report Template

```markdown
#### Bug ID: BUG-YYYY-MM-DD-XXX

**Priority:** P0/P1/P2/P3

**Component:** Component name (e.g., Vault Dashboard)

**Description:**
Clear description of the issue

**Steps to Reproduce:**
1. Step one
2. Step two
3. Step three

**Expected Behavior:**
What should happen

**Actual Behavior:**
What actually happens

**Environment:**
- Browser: Chrome 120
- Wallet: MetaMask 11.0
- Network: BSC Testnet

**Screenshots/Logs:**
Attach if available

**Possible Fix:**
Optional - suggest a solution

**Reported By:** Name/Date
```

---

## Bug Investigation Checklist

When investigating a bug, check:

- [ ] Can it be reproduced consistently?
- [ ] Does it occur in multiple browsers?
- [ ] Does it occur with different wallets?
- [ ] Is it related to network conditions?
- [ ] Are there console errors?
- [ ] Is TypeScript compilation clean?
- [ ] Are dependencies up to date?
- [ ] Is it a configuration issue?

---

## Testing Coverage

After fixing a bug:

1. **Add regression test** - Prevent recurrence
2. **Test all 6 dimensions:**
   - Functional - Core logic works
   - Boundary - Edge cases handled
   - Exception - Errors handled gracefully
   - Performance - No performance regression
   - Security - No security vulnerabilities
   - Compatibility - Works across browsers

3. **Update documentation** - If behavior changed

---

## Contact

For bug reports or questions:
- **Developer:** Claude (Ultra Builder Pro)
- **Project Manager:** Rocky243
- **Repository:** paimon-contracts/nft-paimon-frontend

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-07 | Initial bug tracker creation |

---

**Note:** This file should be updated whenever a bug is reported, investigated, or fixed.
