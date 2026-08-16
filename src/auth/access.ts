export type AuthRedirect = "/login" | "/sample" | null

/** Decide whether a route transition must cross the authentication boundary. */
export function getAuthRedirect(
  pathname: string,
  authenticated: boolean
): AuthRedirect {
  if (pathname === "/login") return authenticated ? "/sample" : null
  return authenticated ? null : "/login"
}
