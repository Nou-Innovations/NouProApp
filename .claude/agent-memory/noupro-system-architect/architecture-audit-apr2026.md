---
name: Architecture Audit Apr 2026
description: Comprehensive architecture audit covering backend monolith, schema, API design, frontend structure, and domain boundaries
type: project
---

Full audit completed April 10, 2026. Key severity counts:
- CRITICAL: 5 findings (security, data integrity)
- WARNING: 10 findings (maintainability, consistency)
- INFO: 7 findings (nice-to-have improvements)

Top 3 priorities for Arnaud:
1. Fix the stock route param bug (companyId vs businessId destructure mismatch) -- line 4350
2. Add input validation to POST/PATCH routes (no zod/joi anywhere)
3. Fix shared/ importing from features/ (2 violations create circular dep risk)

Full findings delivered as conversation output (not stored in file due to length).
