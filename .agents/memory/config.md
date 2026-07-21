---
name: Config Centralization
description: All tuneable thresholds and app-level constants live in artifacts/api-server/src/config/index.ts — never scatter magic numbers.
---

# Config Centralization

**Location:** `artifacts/api-server/src/config/index.ts`

**Exported constants:**
- `EXPIRING_SOON_DAYS` (default 30) — controls "expiring soon" status threshold
- `EXPIRING_THIS_WEEK_DAYS` (default 7) — controls dashboard "this week" bucket
- `APP_NAME` (default "ExpiryOS") — used in structured logs

**How to apply:** Any new tuneable value must be added here as an env-var-backed export. Never put magic numbers directly in route handlers, repositories, or business logic.
