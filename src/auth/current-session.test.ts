import { beforeEach, describe, expect, it, vi } from "vitest"

import { getCurrentSession, requireCurrentSession } from "./current-session"

const { findActiveSession, getCookie } = vi.hoisted(() => ({
  findActiveSession: vi.fn(),
  getCookie: vi.fn(),
}))

vi.mock("@tanstack/react-start/server", () => ({ getCookie }))
vi.mock("./sessions", () => ({ findActiveSession }))
vi.mock("../db/client", () => ({ db: { name: "test-db" } }))

describe("current request session", () => {
  beforeEach(() => {
    getCookie.mockReset()
    findActiveSession.mockReset()
  })

  it("resolves the session from the request cookie", async () => {
    const session = { userId: "owner" }
    getCookie.mockReturnValue("token")
    findActiveSession.mockResolvedValue(session)

    await expect(getCurrentSession()).resolves.toBe(session)
    expect(findActiveSession).toHaveBeenCalledWith({ name: "test-db" }, "token")
  })

  it("rejects missing and implausibly large tokens without querying D1", async () => {
    getCookie
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce("x".repeat(257))

    await expect(getCurrentSession()).resolves.toBeUndefined()
    await expect(getCurrentSession()).resolves.toBeUndefined()
    expect(findActiveSession).not.toHaveBeenCalled()
  })

  it("rejects unauthenticated protected server operations", async () => {
    getCookie.mockReturnValue(undefined)

    await expect(requireCurrentSession()).rejects.toMatchObject({ status: 401 })
  })
})
