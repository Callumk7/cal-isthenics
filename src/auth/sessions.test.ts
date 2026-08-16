import { getTableColumns, getTableName } from "drizzle-orm"
import { describe, expect, it, vi } from "vitest"

import { sessions, users } from "../db/schema"
import { createSession, findActiveSession, revokeSession } from "./sessions"

describe("authentication persistence", () => {
  it("defines user and revocable, expiring session records", () => {
    expect(getTableName(users)).toBe("users")
    expect(Object.keys(getTableColumns(users))).toEqual([
      "id",
      "passwordHash",
      "createdAt",
      "updatedAt",
    ])
    expect(Object.keys(getTableColumns(sessions))).toEqual([
      "tokenHash",
      "userId",
      "expiresAt",
      "createdAt",
      "revokedAt",
    ])
  })

  it("persists only a hash of a newly generated session token", async () => {
    const values = vi.fn().mockResolvedValue(undefined)
    const insert = vi.fn(() => ({ values }))
    const db = { insert } as never

    const token = await createSession(db, "owner", new Date("2030-01-01"))

    expect(insert).toHaveBeenCalledWith(sessions)
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "owner",
        expiresAt: new Date("2030-01-01"),
      })
    )
    expect(values.mock.calls[0][0].tokenHash).not.toBe(token)
  })

  it("returns only unexpired, unrevoked sessions", async () => {
    const activeSession = {
      userId: "owner",
      expiresAt: new Date("2029-01-02"),
      revokedAt: null,
    }
    const findFirst = vi
      .fn()
      .mockResolvedValueOnce(activeSession)
      .mockResolvedValueOnce({
        ...activeSession,
        expiresAt: new Date("2029-01-01"),
      })
      .mockResolvedValueOnce({
        ...activeSession,
        revokedAt: new Date("2028-12-31"),
      })
      .mockResolvedValueOnce(undefined)
    const db = { query: { sessions: { findFirst } } } as never
    const now = new Date("2029-01-01")

    await expect(findActiveSession(db, "active", now)).resolves.toEqual(
      activeSession
    )
    await expect(findActiveSession(db, "expired", now)).resolves.toBeUndefined()
    await expect(findActiveSession(db, "revoked", now)).resolves.toBeUndefined()
    await expect(findActiveSession(db, "missing", now)).resolves.toBeUndefined()

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ with: { user: true } })
    )
  })

  it("revokes sessions by their hashed token", async () => {
    const where = vi.fn().mockResolvedValue(undefined)
    const set = vi.fn(() => ({ where }))
    const db = { update: vi.fn(() => ({ set })) } as never

    await revokeSession(db, "secret-token", new Date("2029-01-02"))

    expect(set).toHaveBeenCalledWith({ revokedAt: new Date("2029-01-02") })
    expect(where).toHaveBeenCalledOnce()
  })
})
