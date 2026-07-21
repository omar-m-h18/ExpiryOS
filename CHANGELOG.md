# Changelog

All notable changes to this project are documented here.

This project follows [Semantic Versioning](https://semver.org/) and
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) conventions.

---

## [Unreleased]

### Changed
- Extracted status computation into `lib/status.ts` with full JSDoc.
- Introduced `repositories/items.repository.ts` with `IItemsRepository`
  interface and `DrizzleItemsRepository` implementation — decouples data
  access from route handlers.
- Centralised all configurable thresholds in `config/index.ts` (previously
  hard-coded magic numbers in route handlers).
- Thinned route handlers to validation + delegation only.
- Added global Express error handler for consistent error response shape.
- Replaced hardcoded hex status colours with CSS design tokens (`success`,
  `warning`) for correct dark-mode support.
- Added light/dark mode toggle with system-preference detection and
  `localStorage` persistence.
- Improved "Needs Attention" dashboard section to include both expired and
  expiring-soon items sorted by urgency.
- Replaced filter/sort dropdowns on the items list with pill-tab filters and
  a single sort-toggle button.
- Added mobile bottom tab bar; desktop sidebar unchanged.

### Added
- `LICENSE` (MIT)
- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `.env.example` with annotated variable reference
- JSDoc/TSDoc comments across exported modules

---

## [1.0.0] — 2026-07-17

### Added
- Initial release.
- Full CRUD for tracked items (title, category, expiration date, notes).
- Dynamic status classification: `active`, `expiring_soon`, `expired`.
- Dashboard with summary cards and "Needs Attention" list.
- Item search, status filtering, and sort order on the items list.
- Light/dark mode theme toggle.
- Mobile-responsive layout with bottom tab bar.
- OpenAPI-first design with Orval-generated React Query hooks and Zod schemas.
- PostgreSQL storage via Drizzle ORM.
- Structured JSON logging via Pino.
