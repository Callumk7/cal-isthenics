/**
 * Placeholder schema — proves the generate/migrate pipeline works.
 *
 * `app_meta` is a minimal key/value table used only to validate that
 * Drizzle can generate and apply migrations against the local SQLite db.
 *
 * Do NOT build domain tables (exercises, workouts, etc.) here — those
 * belong in a later, purpose-designed schema ticket.
 */
import { sqliteTable, text } from "drizzle-orm/sqlite-core"

// Minimal placeholder table: key/value store for app-level metadata.
export const appMeta = sqliteTable("app_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
})
