import { env } from "cloudflare:workers"
import { createServerFn } from "@tanstack/react-start"
import {
  deleteCookie,
  getCookie,
  getRequestIP,
  setCookie,
} from "@tanstack/react-start/server"

import { db } from "../db/client"
import { users } from "../db/schema"
import { verifyPassword } from "./crypto"
import {
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
  sessionCookieOptions,
} from "./config"
import { createSession, revokeSession } from "./sessions"
import { getCurrentSession, requireCurrentSession } from "./current-session"

const invalidCredentials = "The password you entered is incorrect."
const tooManyAttempts =
  "Too many sign-in attempts. Please wait a minute and try again."

export const getAuthState = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await getCurrentSession()
    return { authenticated: Boolean(session) }
  }
)

export const login = createServerFn({ method: "POST" })
  .validator((input: { password: string }) => input)
  .handler(async ({ data }) => {
    const rateLimit = await env.LOGIN_RATE_LIMITER.limit({
      key: getRequestIP() ?? "unknown",
    })
    if (!rateLimit.success) {
      return { ok: false as const, error: tooManyAttempts }
    }

    const user = await db.select().from(users).limit(1).get()

    if (!user || !(await verifyPassword(data.password, user.passwordHash))) {
      return { ok: false as const, error: invalidCredentials }
    }

    const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000)
    const token = await createSession(db, user.id, expiresAt)
    setCookie(SESSION_COOKIE_NAME, token, {
      ...sessionCookieOptions,
      expires: expiresAt,
    })

    return { ok: true as const }
  })

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  await requireCurrentSession()
  const token = getCookie(SESSION_COOKIE_NAME)
  try {
    if (token && token.length <= 256) await revokeSession(db, token)
  } finally {
    deleteCookie(SESSION_COOKIE_NAME, {
      path: sessionCookieOptions.path,
      secure: sessionCookieOptions.secure,
      httpOnly: sessionCookieOptions.httpOnly,
      sameSite: sessionCookieOptions.sameSite,
    })
  }
  return { ok: true as const }
})
