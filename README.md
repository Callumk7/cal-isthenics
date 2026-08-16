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
```

Commit generated files in `drizzle/`. Apply migrations locally before testing and remotely before deploying code that depends on them.

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
