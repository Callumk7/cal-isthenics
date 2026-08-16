import { getCookie } from "@tanstack/react-start/server"

import { db } from "../db/client"
import { SESSION_COOKIE_NAME } from "./config"
import { findActiveSession } from "./sessions"

export type CurrentSession = NonNullable<
  Awaited<ReturnType<typeof findActiveSession>>
>

/** Resolve the authenticated session for the current server request. */
export async function getCurrentSession(): Promise<CurrentSession | undefined> {
  const token = getCookie(SESSION_COOKIE_NAME)
  if (!token || token.length > 256) return undefined
  return findActiveSession(db, token)
}

/**
 * Enforce authentication at the server-operation boundary. Protected server
 * functions and data operations should call this rather than relying on a
 * client-side route guard.
 */
export async function requireCurrentSession(): Promise<CurrentSession> {
  const session = await getCurrentSession()
  if (!session) throw new Response("Unauthorized", { status: 401 })
  return session
}
