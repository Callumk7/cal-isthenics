import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  createWorkoutTemplate,
  deleteWorkoutTemplate,
  listWorkoutTemplates,
  readWorkoutTemplate,
  updateWorkoutTemplate,
} from "./server-functions"

const mocks = vi.hoisted(() => ({
  requireCurrentSession: vi.fn(),
  listWorkoutTemplates: vi.fn(),
  getWorkoutTemplate: vi.fn(),
  createWorkoutTemplate: vi.fn(),
  updateWorkoutTemplate: vi.fn(),
  deleteWorkoutTemplate: vi.fn(),
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
vi.mock("../auth/current-session", () => ({
  requireCurrentSession: mocks.requireCurrentSession,
}))
vi.mock("../db/client", () => ({ db: {} }))
vi.mock("./templates", () => mocks)

describe("authenticated workout template server operations", () => {
  beforeEach(() => vi.clearAllMocks())

  it("passes only the authenticated user to every operation", async () => {
    mocks.requireCurrentSession.mockResolvedValue({ userId: "owner" })

    await listWorkoutTemplates()
    await readWorkoutTemplate({ data: { id: "template" } })
    await createWorkoutTemplate({ data: { name: "Push", exercises: [] } })
    await updateWorkoutTemplate({
      data: { id: "template", name: "Pull", exercises: [] },
    })
    await deleteWorkoutTemplate({ data: { id: "template" } })

    expect(mocks.listWorkoutTemplates).toHaveBeenCalledWith(
      expect.anything(),
      "owner"
    )
    expect(mocks.getWorkoutTemplate).toHaveBeenCalledWith(
      expect.anything(),
      "owner",
      "template"
    )
    expect(mocks.createWorkoutTemplate).toHaveBeenCalledWith(
      expect.anything(),
      "owner",
      { name: "Push", exercises: [] }
    )
    expect(mocks.updateWorkoutTemplate).toHaveBeenCalledWith(
      expect.anything(),
      "owner",
      { id: "template", name: "Pull", exercises: [] }
    )
    expect(mocks.deleteWorkoutTemplate).toHaveBeenCalledWith(
      expect.anything(),
      "owner",
      "template"
    )
  })

  it("rejects unauthenticated reads and mutations before domain operations", async () => {
    mocks.requireCurrentSession.mockRejectedValue(
      new Response("Unauthorized", { status: 401 })
    )

    await expect(listWorkoutTemplates()).rejects.toMatchObject({ status: 401 })
    await expect(
      createWorkoutTemplate({ data: { name: "Push", exercises: [] } })
    ).rejects.toMatchObject({ status: 401 })
    expect(mocks.listWorkoutTemplates).not.toHaveBeenCalled()
    expect(mocks.createWorkoutTemplate).not.toHaveBeenCalled()
  })
})
