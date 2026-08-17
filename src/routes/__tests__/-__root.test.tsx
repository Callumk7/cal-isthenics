import { beforeEach, describe, expect, it, vi } from "vitest"

import { Route } from "../__root"

const { getAuthState } = vi.hoisted(() => ({
  getAuthState: vi.fn(),
}))

vi.mock("@/auth/server-functions", () => ({
  getAuthState,
  logout: vi.fn(),
}))

async function runBeforeLoad(pathname: string, searchStr = "") {
  return Route.options.beforeLoad?.({
    location: { pathname, searchStr },
  } as never)
}

describe("root authentication guard", () => {
  beforeEach(() => getAuthState.mockReset())

  it("redirects an unauthenticated SSR or client route load to login", async () => {
    getAuthState.mockResolvedValue({ authenticated: false })

    await expect(runBeforeLoad("/progress")).rejects.toMatchObject({
      options: { href: "/login?returnTo=%2Fprogress" },
    })
  })

  it("allows authenticated app route loads", async () => {
    getAuthState.mockResolvedValue({ authenticated: true })

    await expect(runBeforeLoad("/progress")).resolves.toBeUndefined()
  })

  it("redirects an authenticated user away from login", async () => {
    getAuthState.mockResolvedValue({ authenticated: true })

    await expect(runBeforeLoad("/login")).rejects.toMatchObject({
      options: { href: "/progress" },
    })
  })

  it("returns an authenticated user to a safe preserved destination", async () => {
    getAuthState.mockResolvedValue({ authenticated: true })

    await expect(
      runBeforeLoad("/login", "?returnTo=%2Fhistory%3Fperiod%3Dmonth")
    ).rejects.toMatchObject({
      options: { href: "/history?period=month" },
    })
  })

  it("does not redirect an authenticated user to an external destination", async () => {
    getAuthState.mockResolvedValue({ authenticated: true })

    await expect(
      runBeforeLoad("/login", "?returnTo=https%3A%2F%2Fattacker.example")
    ).rejects.toMatchObject({ options: { href: "/progress" } })
  })
})
