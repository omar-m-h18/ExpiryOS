# Contributing to ExpiryTracker

Thank you for your interest in contributing! This document explains how to get
started and how we manage the project.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Branching Strategy](#branching-strategy)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Issue Labels](#issue-labels)
- [Code Style](#code-style)
- [Architecture Notes](#architecture-notes)

---

## Getting Started

**Prerequisites:** Node.js 20+, pnpm 9+, PostgreSQL 15+.

```bash
# 1. Fork and clone
git clone https://github.com/your-fork/expiry-tracker.git
cd expiry-tracker

# 2. Install dependencies
pnpm install

# 3. Configure environment
cp .env.example .env
# Edit .env — at minimum set DATABASE_URL and PORT

# 4. Push the database schema
pnpm --filter @workspace/db run push

# 5. Start development servers
pnpm --filter @workspace/api-server run dev   # API on PORT
pnpm --filter @workspace/expiry-tracker run dev  # Frontend (Vite)
```

---

## Project Structure

```
expiry-tracker/
├── artifacts/
│   ├── api-server/          # Express 5 REST API
│   │   └── src/
│   │       ├── config/      # Environment-driven configuration
│   │       ├── lib/         # Shared utilities (logger, status computation)
│   │       ├── repositories/ # Data-access layer (swap DB here)
│   │       └── routes/      # Thin HTTP handlers
│   └── expiry-tracker/      # React + Vite frontend
│       └── src/
│           ├── components/  # Reusable UI components
│           ├── hooks/       # Custom React hooks
│           ├── lib/         # Frontend utilities
│           └── pages/       # Route-level page components
├── lib/
│   ├── api-spec/            # OpenAPI specification (source of truth)
│   ├── api-client-react/    # Orval-generated TanStack Query hooks
│   ├── api-zod/             # Orval-generated Zod validation schemas
│   └── db/                  # Drizzle ORM schema and database connection
└── .env.example             # Annotated environment variable reference
```

### Key architectural decisions

- **OpenAPI-first**: `lib/api-spec/openapi.yaml` is the contract. Client hooks
  and server Zod schemas are generated from it. Never hand-edit generated files.
- **Repository pattern**: all database access goes through `IItemsRepository`.
  To swap databases, implement the interface and update the singleton export.
- **Status is derived**: expiry status is never stored. It is computed at
  request time from the current date and `expiration_date`.

---

## Development Workflow

1. **Open an issue** before starting significant work so we can align on scope.
2. **Create a branch** from `main` (see [Branching Strategy](#branching-strategy)).
3. **Make your changes** following the [Code Style](#code-style) guidelines.
4. **Run typechecks** before opening a PR:
   ```bash
   pnpm --filter @workspace/api-server run typecheck
   pnpm --filter @workspace/expiry-tracker exec tsc --noEmit
   ```
5. **Open a pull request** against `main`.

---

## Branching Strategy

We use a lightweight trunk-based model:

| Branch pattern     | Purpose                                  |
|--------------------|------------------------------------------|
| `main`             | Always deployable; protected             |
| `feat/<slug>`      | New features                             |
| `fix/<slug>`       | Bug fixes                                |
| `docs/<slug>`      | Documentation-only changes               |
| `refactor/<slug>`  | Non-behaviour-changing code improvements |
| `chore/<slug>`     | Dependency updates, config, tooling      |

Delete branches after merging.

---

## Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) spec:

```
<type>(<scope>): <short summary>

[optional body]

[optional footer]
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Examples:**
```
feat(api): add pagination to GET /items
fix(status): correct off-by-one on expiry boundary date
docs(contributing): add branching strategy section
```

Commits on `main` should represent a single logical change.

---

## Pull Request Process

1. Fill in the PR template completely.
2. Link the related issue (`Closes #123`).
3. Ensure all type checks pass.
4. Request review from at least one maintainer.
5. Squash-merge into `main` with a conventional commit message.

---

## Issue Labels

| Label              | Meaning                                       |
|--------------------|-----------------------------------------------|
| `bug`              | Something is broken                           |
| `enhancement`      | New feature request                           |
| `documentation`    | Docs-only change needed                       |
| `good first issue` | Suitable for first-time contributors          |
| `help wanted`      | Maintainers welcome external input            |
| `question`         | Needs discussion before implementation        |
| `wontfix`          | Intentionally out of scope                    |
| `dependencies`     | Dependency update                             |
| `performance`      | Performance-related issue or improvement      |
| `accessibility`    | Accessibility (a11y) concern                  |
| `security`         | Security concern — see SECURITY.md            |

---

## Code Style

- **TypeScript** everywhere. Avoid `any`; prefer explicit types.
- **No magic numbers** — use `config/index.ts` for tuneable values.
- **JSDoc** on all exported functions and modules.
- **Comments explain intent**, not obvious mechanics.
- **Components stay small** — extract reusable logic into hooks or utilities.
- **Business logic** belongs in `lib/` or repository methods, not in route
  handlers or React components.

---

## Architecture Notes

### Adding a new database backend

1. Create `artifacts/api-server/src/repositories/<name>.repository.ts`.
2. Implement the `IItemsRepository` interface.
3. Update the export in `repositories/items.repository.ts`.
4. No other files need to change.

### Planned extension points

The following features are not yet implemented but the architecture is designed
to accommodate them without major refactoring:

- **Authentication** — add auth middleware in `api-server/src/middleware/` and
  a `userId` column to the items table.
- **Notifications** — add a `notifications/` module that reads from the
  repository on a schedule.
- **Import/Export** — add routes that call `findAll()` and format the output.
- **Multi-user** — add tenant scoping to the repository interface.
- **Testing** — inject a mock `IItemsRepository` in tests; no real DB needed.
- **Docker** — add a `Dockerfile` and `docker-compose.yml` at the repo root.
- **CI/CD** — add a `.github/workflows/ci.yml` that runs typechecks.
