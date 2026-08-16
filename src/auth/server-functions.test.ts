import { beforeEach, describe, expect, it, vi } from "vitest"

import { SESSION_COOKIE_NAME, sessionCookieOptions } from "./config"
import { getAuthState, login, logout } from "./server-functions"

const mocks = vi.hoisted(() => ({
  createSession: vi.fn(),
  deleteCookie: vi.fn(),
  getCookie: vi.fn(),
  getCurrentSession: vi.fn(),
  getRequestIP: vi.fn(),
  limit: vi.fn(),
  requireCurrentSession: vi.fn(),
  revokeSession: vi.fn(),
  selectGet: vi.fn(),
  setCookie: vi.fn(),
  verifyPassword: vi.fn(),
}))

vi.mock("cloudflare:workers", () => ({
  env: { LOGIN_RATE_LIMITER: { limit: mocks.limit } },
}))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    validator() {
      return this
    },
    handler(handler: unknown) {
      return handler
    },
  }),
}))
vi.mock("@tanstack/react-start/server", () => ({
  deleteCookie: mocks.deleteCookie,
  getCookie: mocks.getCookie,
  getRequestIP: mocks.getRequestIP,
  setCookie: mocks.setCookie,
}))
vi.mock("../db/client", () => ({
  db: {
    select: () => ({
      from: () => ({ limit: () => ({ get: mocks.selectGet }) }),
    }),
  },
}))
vi.mock("./crypto", () => ({
  PASSWORD_HASH_ITERATIONS: 100_000,
  verifyPassword: mocks.verifyPassword,
}))
vi.mock("./sessions", () => ({
  createSession: mocks.createSession,
  revokeSession: mocks.revokeSession,
}))
vi.mock("./current-session", () => ({
  getCurrentSession: mocks.getCurrentSession,
  requireCurrentSession: mocks.requireCurrentSession,
}))

describe("authentication server operations", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getRequestIP.mockReturnValue("192.0.2.1")
    mocks.limit.mockResolvedValue({ success: true })
  })

  it("logs in with a valid password without returning credentials to the client", async () => {
    const user = { id: "owner", passwordHash: "stored-password-hash" }
    mocks.selectGet.mockResolvedValue(user)
    mocks.verifyPassword.mockResolvedValue(true)
    mocks.createSession.mockResolvedValue("raw-session-token")

    const result = await login({ data: { password: "valid-password" } })

    expect(result).toEqual({ ok: true })
    expect(mocks.verifyPassword).toHaveBeenCalledWith(
      "valid-password",
      "stored-password-hash"
    )
    expect(mocks.createSession).toHaveBeenCalledWith(
      expect.anything(),
      "owner",
      expect.any(Date)
    )
    expect(mocks.setCookie).toHaveBeenCalledWith(
      SESSION_COOKIE_NAME,
      "raw-session-token",
      expect.objectContaining(sessionCookieOptions)
    )
    expect(JSON.stringify(result)).not.toMatch(
      /valid-password|stored-password-hash|raw-session-token/
    )
  })

  it("rejects an invalid password without creating a session", async () => {
    mocks.selectGet.mockResolvedValue({
      id: "owner",
      passwordHash: "stored-password-hash",
    })
    mocks.verifyPassword.mockResolvedValue(false)

    await expect(
      login({ data: { password: "invalid-password" } })
    ).resolves.toEqual({
      ok: false,
      error: "The password you entered is incorrect.",
    })
    expect(mocks.createSession).not.toHaveBeenCalled()
    expect(mocks.setCookie).not.toHaveBeenCalled()
  })

  it("does not reveal whether the owner account exists", async () => {
    mocks.selectGet.mockResolvedValue(undefined)

    await expect(login({ data: { password: "anything" } })).resolves.toEqual({
      ok: false,
      error: "The password you entered is incorrect.",
    })
    expect(mocks.verifyPassword).toHaveBeenCalledWith(
      "anything",
      expect.stringMatching(/^pbkdf2-sha256\$100000\$/)
    )
  })

  it("rate limits login before reading credentials", async () => {
    mocks.limit.mockResolvedValue({ success: false })

    await expect(login({ data: { password: "anything" } })).resolves.toEqual({
      ok: false,
      error: "Too many sign-in attempts. Please wait a minute and try again.",
    })
    expect(mocks.selectGet).not.toHaveBeenCalled()
  })

  it("reports authentication state without exposing the session", async () => {
    mocks.getCurrentSession.mockResolvedValue({
      tokenHash: "session-token-hash",
      user: { passwordHash: "stored-password-hash" },
    })

    await expect(getAuthState()).resolves.toEqual({ authenticated: true })
  })

  it("revokes the current session and expires its cookie on logout", async () => {
    mocks.requireCurrentSession.mockResolvedValue({ userId: "owner" })
    mocks.getCookie.mockReturnValue("raw-session-token")

    await expect(logout()).resolves.toEqual({ ok: true })
    expect(mocks.revokeSession).toHaveBeenCalledWith(
      expect.anything(),
      "raw-session-token"
    )
    expect(mocks.deleteCookie).toHaveBeenCalledWith(
      SESSION_COOKIE_NAME,
      expect.objectContaining({ httpOnly: true, secure: true, path: "/" })
    )
  })

  it("rejects unauthenticated logout as a protected server operation", async () => {
    mocks.requireCurrentSession.mockRejectedValue(
      new Response("Unauthorized", { status: 401 })
    )

    await expect(logout()).rejects.toMatchObject({ status: 401 })
    expect(mocks.revokeSession).not.toHaveBeenCalled()
    expect(mocks.deleteCookie).not.toHaveBeenCalled()
  })
})
