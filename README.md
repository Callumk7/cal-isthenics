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

CI runs `pnpm test`, `pnpm typecheck`, and `pnpm lint` on every push to `main` and on pull requests.

## Database

Drizzle ORM with a local SQLite database (`better-sqlite3`).

Database scripts:

```bash
pnpm db:generate  # generate SQL migrations from the schema
pnpm db:migrate   # apply pending migrations to the local SQLite file
pnpm db:push      # push schema changes directly (development shortcut)
pnpm db:studio    # open Drizzle Studio in the browser
```

The local database file lives at `./sqlite/cal.db` by default. Override with the `DATABASE_URL` environment variable.

The database layer lives in `src/db/` and is **server-side only** — never import it from client components.

## Deployment

Deployment is not defined yet. For now, verify the app builds successfully with:

```bash
pnpm build
```

A TanStack Start-compatible deployment target and any required environment configuration will be documented once selected.

## Agent context

See [`AGENTS.md`](./AGENTS.md) for a concise project overview intended for coding agents.

> **Note:** This repo supports collaborative work with [Callum's Hermes Prime Bot](https://github.com/apps/callum-s-hermes-prime-bot) — issues, PRs, and code review can be authored by the dedicated GitHub App.
