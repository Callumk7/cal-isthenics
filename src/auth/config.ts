export const SESSION_COOKIE_NAME = "form_session"
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30

export const sessionCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_DURATION_SECONDS,
}
