# Technical Debt Log

## [Debt Title]

**Created**: YYYY-MM-DD
**Priority**: [Critical | High | Medium | Low]
**Category**: [Code Quality | Performance | Security | Documentation | Testing]
**Estimated Effort**: [Small (<1 day) | Medium (1-3 days) | Large (>3 days)]

### Description

[Describe the technical debt - what is the issue?]

### Why It Exists

[Explain why this debt was incurred - usually a tradeoff decision]

### Impact

[Describe the negative consequences of this debt]

### Proposed Solution

[Describe how to resolve this debt]

### Dependencies

[List any dependencies or blockers]

### Related Issues

- Link to related tasks/issues
- Link to ADRs

---

**Example Usage**:

```markdown
# Technical Debt Log

## Insufficient Test Coverage for RWABondNFT Edge Cases

**Created**: 2025-01-20
**Priority**: High
**Category**: Testing
**Estimated Effort**: Medium (2 days)

### Description

RWABondNFT contract has only 78% test coverage. Missing tests for:
- Dice roll edge cases (VRF callback failures)
- Concurrent minting scenarios
- Edge cases in remint logic

### Why It Exists

Rushed to meet testnet launch deadline. Focused on happy path testing.

### Impact

- Risk of bugs in production
- Difficult to refactor safely
- Violates 80% coverage requirement

### Proposed Solution

1. Add boundary tests for dice rolling (0, max values)
2. Add exception tests for VRF failures
3. Add concurrent minting stress tests
4. Add remint edge case tests

Target: 85% coverage

### Dependencies

- None (can be done immediately)

### Related Issues

- Task #45: Improve test coverage
- ADR-003: Test strategy requirements
```
