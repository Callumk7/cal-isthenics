import { beforeEach, describe, expect, it, vi } from "vitest"

import { Route } from "./__root"

const { getAuthState } = vi.hoisted(() => ({
  getAuthState: vi.fn(),
}))

vi.mock("@/auth/server-functions", () => ({
  getAuthState,
  logout: vi.fn(),
}))

async function runBeforeLoad(pathname: string) {
  return Route.options.beforeLoad?.({ location: { pathname } } as never)
}

describe("root authentication guard", () => {
  beforeEach(() => getAuthState.mockReset())

  it("redirects an unauthenticated SSR or client route load to login", async () => {
    getAuthState.mockResolvedValue({ authenticated: false })

    await expect(runBeforeLoad("/sample")).rejects.toMatchObject({
      options: { to: "/login" },
    })
  })

  it("allows authenticated app route loads", async () => {
    getAuthState.mockResolvedValue({ authenticated: true })

    await expect(runBeforeLoad("/sample")).resolves.toBeUndefined()
  })

  it("redirects an authenticated user away from login", async () => {
    getAuthState.mockResolvedValue({ authenticated: true })

    await expect(runBeforeLoad("/login")).rejects.toMatchObject({
      options: { to: "/sample" },
    })
  })
})
