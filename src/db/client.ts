/**
 * Server-only database client.
 *
 * Import this module only from server functions, API routes, or other
 * server-side modules within TanStack Start. The DB binding is provided by
 * Wrangler locally and by Cloudflare Workers in production.
 */
import { env } from "cloudflare:workers"
import { drizzle } from "drizzle-orm/d1"

import * as schema from "./schema"

/** The typed Drizzle client backed by the Cloudflare D1 DB binding. */
export const db = drizzle(env.DB, { schema })
