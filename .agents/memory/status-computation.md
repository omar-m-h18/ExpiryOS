---
name: Status Computation
description: Expiry status is never stored in DB; always computed at request time from expiration_date. Logic lives in lib/status.ts.
---

# Status Computation

**Location:** `artifacts/api-server/src/lib/status.ts`
**Functions:** `computeStatus(expirationDate: string)`, `enrichItem(row)`

**Why never stored:** Status updates automatically at midnight with no background jobs; threshold changes need no migration.

**Date parsing:** Always append `T00:00:00` when constructing Date from a YYYY-MM-DD string to force local-timezone interpretation and avoid UTC-midnight off-by-one errors.

**Threshold:** Controlled by `EXPIRING_SOON_DAYS` env var (default 30), loaded from `config/index.ts`. Never hard-code 30 elsewhere.
