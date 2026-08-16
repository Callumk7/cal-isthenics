export const DEFAULT_AUTHENTICATED_PATH = "/sample"

/**
 * Accept only same-origin application paths as post-login destinations.
 * In particular, protocol-relative URLs (`//example.com`) and absolute URLs are
 * rejected so this value can never become an open redirect.
 */
export function getSafeReturnTo(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.startsWith("/")) return undefined
  if (value.startsWith("//") || value.includes("\\")) return undefined

  try {
    const url = new URL(value, "https://form.local")
    if (url.origin !== "https://form.local" || url.pathname === "/login")
      return undefined
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return undefined
  }
}

export function getLoginHref(pathname: string, search = ""): string {
  const returnTo = getSafeReturnTo(`${pathname}${search}`)
  if (!returnTo || returnTo === "/") return "/login"
  return `/login?returnTo=${encodeURIComponent(returnTo)}`
}
