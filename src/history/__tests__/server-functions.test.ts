import { beforeEach, describe, expect, it, vi } from "vitest"

import { listActivityHistory } from "../server-functions"

const mocks = vi.hoisted(() => ({
  requireCurrentSession: vi.fn(),
  listActivityHistory: vi.fn(),
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
vi.mock("../../auth/current-session", () => ({
  requireCurrentSession: mocks.requireCurrentSession,
}))
vi.mock("../../db/client", () => ({ db: {} }))
vi.mock("../activity-history", () => ({
  listActivityHistory: mocks.listActivityHistory,
}))

describe("authenticated history server operation", () => {
  beforeEach(() => vi.clearAllMocks())

  it("passes the authenticated owner to the history operation", async () => {
    mocks.requireCurrentSession.mockResolvedValue({ userId: "owner" })
    mocks.listActivityHistory.mockResolvedValue({ ok: true, value: {} })
    const data = { from: "2030-01-01" }

    await listActivityHistory({ data })

    expect(mocks.listActivityHistory).toHaveBeenCalledWith(
      expect.anything(),
      "owner",
      data
    )
  })

  it("rejects unauthenticated requests before querying history", async () => {
    mocks.requireCurrentSession.mockRejectedValue(
      new Response("Unauthorized", { status: 401 })
    )

    await expect(listActivityHistory({ data: {} })).rejects.toMatchObject({
      status: 401,
    })
    expect(mocks.listActivityHistory).not.toHaveBeenCalled()
  })
})
