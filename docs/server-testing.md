# Server testing

FORM's domain functions accept a `DrizzleD1Database`. Production supplies Cloudflare D1, while Vitest runs in Node with jsdom. The test config aliases `cloudflare:workers` to `src/test/cloudflare-workers.ts`, whose `env` is intentionally empty; the unit-test suite does not run workerd, Miniflare, or a SQL engine.

## Unit-test boundaries

Use the smallest boundary that proves the behavior, and name the boundary explicitly:

1. **Per-operation database mocks** — use `vi.fn()` query and mutation builders for isolated validation, row construction, and write-intent tests. Each operation receives controlled responses.
2. **Domain orchestration with an in-memory Drizzle fake** — use `createInMemoryDrizzle()` from `src/test/in-memory-drizzle.ts` when a unit test needs to chain real exercise, template, and workout domain operations. The fake stores plain camel-case rows and implements only the Drizzle calls those modules currently use. Domain functions remain real, but SQL and D1 are not exercised.
3. **Server-function wrapper tests** — mock `createServerFn`, `requireCurrentSession`, and the relevant domain module. These tests verify input forwarding, session ownership, and database selection without retesting domain behavior.
4. **Component interaction tests** — render real components while mocking their `*/server-functions` dependencies. Assert both the dependency call and the resulting UI state.
5. **Route rendering smoke tests** — use a memory router with mocked server-function boundaries to verify that loader data reaches the intended route component. These are independent route renders, not stateful user journeys.

Integration tests against workerd or local D1 can be added separately. Unit-test names and descriptions should not imply that those production boundaries were exercised.

## Using the in-memory Drizzle fake

Create one fake and reset it before every test:

```ts
const db = createInMemoryDrizzle()

beforeEach(() => db.reset())
```

Prefer seeding through real domain creation functions. For prerequisite rows that have no operation in the unit under test, call `db.seed("users", row)` or another supported table. Stored rows are available for narrowly scoped invariants, for example `db._tables.workouts.rows`.

Test database-produced states at the nearest unit seam rather than imitating foreign-key behavior with direct row mutation. For example, pass `sourceVariantId: null` to `editorFromWorkout()` instead of treating the fake as proof of D1's `ON DELETE SET NULL` behavior.

The fake supports the tables in `src/db/schema.ts`; the `findMany`/`findFirst` projections, limits, ordering, and relation shapes used by the exercise, template, and workout domains; `eq`, `and`, `inArray`, `isNull`, `gte`, and `lte`; inserts, updates, deletes, projected `returning()`, and ordered batches. Workout/template child deletion is cascaded only to support current domain unit tests.

## Limits

This is a bounded Drizzle test double, not D1-compatible test scaffolding or a SQL engine. It does not reproduce SQL coercion, constraints, indexes, arbitrary joins, foreign-key semantics, transactions, or rollback. Keep its surface narrow and add a focused fake contract test whenever its behavior grows.

Schema definition tests, migration drift checks, and applying migrations to local D1 remain useful CI guards, but they do not turn these unit tests into database integration tests.
