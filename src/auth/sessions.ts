import { and, eq, gt, isNull } from "drizzle-orm"
import type { DrizzleD1Database } from "drizzle-orm/d1"

import { sessions } from "../db/schema"
import type { users } from "../db/schema"
import { generateSessionToken, hashSessionToken } from "./crypto"

type Database = DrizzleD1Database<{
  sessions: typeof sessions
  users: typeof users
}>

export async function createSession(
  db: Database,
  userId: string,
  expiresAt: Date
) {
  const token = generateSessionToken()
  const tokenHash = await hashSessionToken(token)
  await db
    .insert(sessions)
    .values({ tokenHash, userId, expiresAt, createdAt: new Date() })
  return token
}

export async function findActiveSession(
  db: Database,
  token: string,
  now = new Date()
) {
  const tokenHash = await hashSessionToken(token)
  return db.query.sessions.findFirst({
    where: and(
      eq(sessions.tokenHash, tokenHash),
      isNull(sessions.revokedAt),
      gt(sessions.expiresAt, now)
    ),
    with: { user: true },
  })
}

export async function revokeSession(
  db: Database,
  token: string,
  revokedAt = new Date()
) {
  const tokenHash = await hashSessionToken(token)
  await db
    .update(sessions)
    .set({ revokedAt })
    .where(eq(sessions.tokenHash, tokenHash))
}
