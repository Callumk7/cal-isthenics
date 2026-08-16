# Cal Isthenics

A fresh web app for personalised calisthenics training. The current product surface is a landing page for **FORM**, focused on adaptive programming, progress tracking, consistency, mobility, and long-term bodyweight strength development.

## Tech stack

- [TanStack Start](https://tanstack.com/start) and TanStack Router
- React 19 and TypeScript
- Vite
- Tailwind CSS v4
- shadcn/ui-style components built with React Aria Components
- Vitest, Testing Library, ESLint, Prettier

## Getting started

Install dependencies:

```bash
pnpm install
```

Start the local development server:

```bash
pnpm dev
```

The app runs on [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
pnpm dev       # start local dev server on port 3000
pnpm build     # create a production build
pnpm preview   # preview the built app
pnpm test      # run Vitest tests
pnpm lint      # run ESLint
pnpm typecheck # run TypeScript checks without emitting files
pnpm check     # check formatting with Prettier
pnpm format    # format source files with Prettier
```

## Project structure

- `src/routes/` — file-based TanStack Router routes
- `src/routes/__root.tsx` — root HTML shell, metadata, styles, scripts, and not-found UI
- `src/routes/index.tsx` — current landing page
- `src/router.tsx` — router creation and typing
- `src/routeTree.gen.ts` — generated route tree; do not edit manually
- `src/components/ui/` — reusable UI primitives/components
- `src/hooks/` — shared React hooks
- `src/lib/` — shared utilities
- `public/` — static assets and web metadata

## Testing

Tests run with Vitest + jsdom. Run them with:

```bash
pnpm test        # run all tests once
pnpm test:watch  # watch mode for local development
```

Test files are colocated next to the code they cover and named `*.test.ts` / `*.test.tsx` (e.g. `src/lib/utils.test.ts`). A setup file at `src/test/setup.ts` installs `@testing-library/jest-dom` matchers automatically.

CI checks generated Cloudflare types and D1 migration drift, applies migrations to an isolated local D1 database, and runs the tests, typecheck, lint, and production build on every push to `main` and on pull requests.

## Database

Drizzle ORM with Cloudflare D1. Wrangler provides an isolated local D1 database during development and the `DB` binding in production.

Database scripts:

```bash
pnpm db:generate        # generate a SQL migration from src/db/schema.ts
pnpm db:migrate         # apply pending migrations to local D1
pnpm db:migrate:remote  # apply pending migrations to production D1
pnpm auth:provision     # create or replace the local owner account
```

Commit generated files in `drizzle/`. Apply migrations locally before testing and remotely before deploying code that depends on them.

### Provisioning the owner account

There is no public signup. After applying migrations, pipe a password to the provisioning command. The script derives a salted PBKDF2-SHA-256 hash before writing to D1; neither the plaintext password nor a raw session token belongs in the database, a migration, or source control.

```bash
# Local D1 (the leading space helps keep the command out of shells configured with HISTCONTROL=ignorespace)
 read -rsp "Password: " CAL_PASSWORD; printf '%s' "$CAL_PASSWORD" | pnpm auth:provision; unset CAL_PASSWORD

# Production D1: authenticate Wrangler first and explicitly select --remote
 read -rsp "Password: " CAL_PASSWORD; printf '%s' "$CAL_PASSWORD" | pnpm auth:provision -- --remote; unset CAL_PASSWORD
```

The command can instead read a temporary `CAL_PASSWORD` environment variable, which is useful for a secret-injected non-interactive environment. Do not put that value in `.env`, shell history, CI configuration, or the repository. Running the command again replaces the owner's password and deletes all of its sessions, providing a repeatable recovery and revocation workflow.

The database layer lives in `src/db/` and is **server-side only** — never import it from client components.

## Deployment

The app deploys to Cloudflare Workers using Wrangler and the official Cloudflare Vite plugin.

Authenticate once and create the production D1 database. Wrangler resolves the configured binding by the `cal-isthenics-db` database name:

```bash
pnpm exec wrangler login
pnpm exec wrangler d1 create cal-isthenics-db
```

Then migrate and deploy:

```bash
pnpm db:migrate:remote
pnpm deploy
```

Useful Cloudflare commands:

```bash
pnpm cf-typegen             # regenerate Worker binding/runtime types
pnpm exec wrangler whoami   # check Cloudflare authentication
pnpm exec wrangler deploy --dry-run
```

## Agent context

See [`AGENTS.md`](./AGENTS.md) for a concise project overview intended for coding agents.

> **Note:** This repo supports collaborative work with [Callum's Hermes Prime Bot](https://github.com/apps/callum-s-hermes-prime-bot) — issues, PRs, and code review can be authored by the dedicated GitHub App.
