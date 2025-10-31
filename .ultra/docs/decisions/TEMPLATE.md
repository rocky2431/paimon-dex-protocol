# ADR-XXX: [Short Title]

**Date**: YYYY-MM-DD
**Status**: [Proposed | Accepted | Deprecated | Superseded]
**Deciders**: [List of people involved]

## Context

[Describe the issue or situation that requires a decision]

## Decision

[Describe the decision that was made]

## Rationale

[Explain why this decision was made]

### Considered Alternatives

1. **Option A**: [Description]
   - Pros: ...
   - Cons: ...

2. **Option B**: [Description]
   - Pros: ...
   - Cons: ...

3. **Option C (Chosen)**: [Description]
   - Pros: ...
   - Cons: ...

## Consequences

### Positive
- [List positive impacts]

### Negative
- [List negative impacts]

### Neutral
- [List neutral impacts]

## Implementation

[Describe how this decision will be implemented]

## Validation

[How will we know if this decision was correct?]

## Related Decisions

- Links to related ADRs
- Links to technical design docs

---

**Example Usage**:

```markdown
# ADR-001: Use Foundry for Smart Contract Development

**Date**: 2025-01-15
**Status**: Accepted
**Deciders**: Core Dev Team

## Context

Need to choose a development framework for Solidity smart contracts. Main contenders are Hardhat and Foundry.

## Decision

Use Foundry as the primary smart contract development framework.

## Rationale

### Considered Alternatives

1. **Hardhat**: Mature ecosystem, JavaScript-based
   - Pros: Rich plugin ecosystem, familiar to JavaScript developers
   - Cons: Slower test execution, more complex setup

2. **Foundry (Chosen)**: Modern, Rust-based, Solidity-native tests
   - Pros: Fast test execution (10-100x faster), native Solidity tests, built-in fuzzing
   - Cons: Smaller ecosystem, newer tool

## Consequences

### Positive
- Faster development iteration (fast tests)
- Better test coverage (fuzzing)
- Simpler CI/CD (single binary)

### Negative
- Team needs to learn Foundry-specific patterns
- Some Hardhat plugins not available

## Implementation

1. Initialize Foundry project structure
2. Migrate existing tests from Hardhat
3. Update CI/CD pipelines
4. Document Foundry best practices

## Validation

- Test execution time <5s for full suite
- Coverage ≥80%
- All team members comfortable with Foundry within 2 weeks
```
