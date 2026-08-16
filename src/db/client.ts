/**
 * Server-only database client.
 *
 * ⚠️  This module must NEVER be imported from client components or
 * browser-executed code. It uses `better-sqlite3`, a Node.js native
 * module, and will throw at runtime in a browser context.
 *
 * Import it only from server functions, API routes, or other
 * server-side modules within TanStack Start.
 */
import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"

import * as schema from "./schema"

const DATABASE_URL = process.env.DATABASE_URL ?? "./sqlite/cal.db"

// Lazy singleton: one connection per process.
let _db: ReturnType<typeof drizzle<typeof schema>> | undefined

function getDb() {
  if (!_db) {
    const sqlite = new Database(DATABASE_URL)
    _db = drizzle(sqlite, { schema })
  }
  return _db
}

/**
 * The typed Drizzle database instance.
 * Initialised on first access (lazy singleton).
 */
export const db = getDb()
