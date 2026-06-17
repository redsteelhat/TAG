# Contributing

## Branch Naming

Use short, scoped branch names:

```text
feature/auth-foundation
feature/profit-engine
fix/fuel-cost-rounding
docs/api-contract
```

## Commit Style

Prefer concise conventional commits:

```text
docs: add mvp scope
feat(api): add trip endpoints
fix(shared): handle zero km metrics
test(shared): cover package allocation
```

## Pull Request Checklist

- Scope is clear and linked to MVP/P0/P1 item.
- Calculation changes include tests.
- API changes update contract or Swagger.
- UI changes cover mobile and desktop states where relevant.
- Sensitive data is not logged.
- Docs are updated when behavior changes.

