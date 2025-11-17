# Project Constitution

This document defines the core principles and standards for this project. It serves as the foundation for all development decisions.

## Development Principles

### 1. Specification-Driven
- Specifications are the source of truth
- Code derives from specs, not vice versa
- Changes require spec updates first

### 2. Test-First Development
- Write tests before implementation
- Coverage ≥80% (critical paths 100%)
- Integration tests with real services

### 3. Minimal Abstraction
- Use frameworks directly, avoid unnecessary wrappers
- Abstraction only when pattern repeats ≥3 times
- Favor composition over inheritance

### 4. Anti-Future-Proofing
- Build only for current requirements
- No speculative features
- Refactor when new requirements emerge

### 5. Library-First
- Extract reusable logic to libraries
- Libraries before applications
- Internal packages for shared code

### 6. Simplicity
- Maximum 3 projects for initial features
- Cyclomatic complexity <10
- Functions <50 lines

### 7. Single Source of Truth
- One canonical representation per concept
- Specs in `.ultra/specs/`
- Decisions in ADRs

### 8. Explicit Decisions
- All architecture decisions documented
- Rationale traces to requirements
- Trade-offs acknowledged

### 9. Living Documentation
- Documentation evolves with code
- Monthly ADR review
- Specs updated with every feature

## Quality Standards

### Code Quality
- SOLID principles enforced
- DRY: No duplication >3 lines
- KISS: Complexity <10
- YAGNI: Only current requirements
- Functions <50 lines
- Nesting <3 levels

### Testing
- Test coverage ≥80%
- Critical paths: 100%
- Six-dimensional coverage:
  1. Functional (core logic)
  2. Boundary (edge cases)
  3. Exception (error handling)
  4. Performance (load tests)
  5. Security (injection prevention)
  6. Compatibility (cross-platform)

### Frontend (if applicable)
- Avoid default fonts (Inter/Roboto/Open Sans)
- Use design tokens/CSS variables
- Prefer established UI libraries
- Core Web Vitals: LCP<2.5s, INP<200ms, CLS<0.1

## Technology Constraints

[Project-specific constraints - Fill based on your context]

Examples:
- Must use TypeScript
- Backend must support REST API
- Database must be PostgreSQL
- Authentication via JWT

## Git Workflow

- Branch naming: `feat/task-{id}-{description}`, `fix/bug-{id}-{description}`
- Commit format: Conventional Commits
- Independent branches: Each task gets its own branch
- Immediate merge: Merge to main after task completion

## Architecture Decision Process

All significant technical decisions must:
1. Be documented as ADRs in `.ultra/docs/decisions/`
2. Include context, decision, rationale, consequences
3. Be reviewed and approved
4. Link back to requirements in specs

## Customization

This template provides baseline principles. Customize the following sections for your project:

- **Technology Constraints**: Add your specific stack requirements
- **Performance Targets**: Define your specific metrics
- **Security Requirements**: Add compliance needs (GDPR, HIPAA, etc.)
- **Custom Principles**: Add project-specific rules

---

Last Updated: [AUTO-FILLED by /ultra-init]
