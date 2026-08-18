# Server testing

FORM's domain functions accept a `DrizzleD1Database`. Production supplies Cloudflare D1, while Vitest runs in Node with jsdom. The test config aliases `cloudflare:workers` to `src/test/cloudflare-workers.ts`, whose `env` is intentionally empty; the project does not run a workerd or Miniflare test pool.

## Test levels

Use the smallest boundary that proves the behavior:

1. **Per-operation fakes** — use `vi.fn()` query and mutation builders for isolated validation, row construction, and batching tests. These are fast and make write intent easy to assert, but each operation receives fresh mocked responses.
2. **Stateful in-memory D1** — use `createInMemoryD1()` from `src/test/in-memory-d1.ts` for a flow that chains real exercise, template, and workout domain operations. It stores plain camel-case rows and exposes the Drizzle surface those modules use. Do not mock domain operations in these tests.
3. **Server-function wrappers** — mock `createServerFn`, `requireCurrentSession`, and the relevant domain module. This verifies input forwarding, session ownership, and database selection without retesting domain behavior. See the existing `server-functions.test.ts` files.

Route/component integration tests mock only the `*/server-functions` modules. They are UI-boundary tests, not database tests.

## Using the stateful fake

Create one database and reset it before every test:

```ts
const db = createInMemoryD1()

beforeEach(() => db.reset())
```

Prefer seeding through real domain creation functions. For prerequisite rows that have no operation in the flow, call `db.seed("users", row)` (or another supported table). Stored rows are available for final invariants, for example `db._tables.workouts.rows`. Direct row changes should be reserved for states that are intentionally impossible through public operations, such as simulating a removed source variant.

The fake supports the tables in `src/db/schema.ts`; `findMany`/`findFirst` with projections, limits, ordering, and the relation shapes used by the exercise, template, and workout domains; `eq`, `and`, `inArray`, `isNull`, `gte`, and `lte`; inserts, updates, deletes, projected `returning()`, and ordered batches. Workout/template child deletion is cascaded for the domain flows.

## Limits

This is D1-compatible test scaffolding, not a SQL engine. It does not reproduce SQL coercion, constraints, indexes, arbitrary joins, transactions, or transaction rollback. Add only the narrow Drizzle surface used by domain operations. Real schema checks, foreign keys, and migration behavior remain covered by applying migrations to local D1 and by the migration drift gates in CI.
