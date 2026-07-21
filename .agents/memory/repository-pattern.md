---
name: Repository Pattern
description: IItemsRepository interface in api-server decouples data access from route handlers; DrizzleItemsRepository is the default impl.
---

# Repository Pattern

The items data-access layer uses the repository pattern.

**Interface:** `artifacts/api-server/src/repositories/items.repository.ts` — `IItemsRepository`
**Default impl:** `DrizzleItemsRepository` (PostgreSQL via Drizzle ORM)
**Singleton export:** `itemsRepository` — all route handlers import this.

**Why:** Future contributors can swap the database (SQLite, MongoDB, Supabase, in-memory for tests) by implementing `IItemsRepository` and updating the singleton export. No route handlers or other files need to change.

**How to apply:** Any new data-access method must be added to the interface first, then implemented in DrizzleItemsRepository (and any other implementations).
