import { eq } from "drizzle-orm"
import type { DrizzleD1Database } from "drizzle-orm/d1"

import type * as schema from "../db/schema"
import { sessions } from "../db/schema"
import { generateSessionToken, hashSessionToken } from "./crypto"

type Database = DrizzleD1Database<typeof schema>

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
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.tokenHash, tokenHash),
    with: { user: true },
  })

  if (!session || session.revokedAt || session.expiresAt <= now)
    return undefined
  return session
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
