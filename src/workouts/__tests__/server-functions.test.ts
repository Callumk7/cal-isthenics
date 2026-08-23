import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  prepareRepeatWorkout,
  readPreviousPerformanceCues,
} from "../server-functions"

const mocks = vi.hoisted(() => ({
  requireCurrentSession: vi.fn(),
  getRepeatWorkout: vi.fn(),
  getPreviousPerformanceCues: vi.fn(),
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
vi.mock("../workouts", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  ...mocks,
}))

describe("repeat and cue server contracts", () => {
  beforeEach(() => vi.clearAllMocks())

  it("uses the authenticated owner for both reads", async () => {
    mocks.requireCurrentSession.mockResolvedValue({ userId: "owner" })
    await prepareRepeatWorkout({ data: { id: "workout" } })
    await readPreviousPerformanceCues({
      data: { variantIds: ["variant"], workoutDate: "2030-02-03" },
    })
    expect(mocks.getRepeatWorkout).toHaveBeenCalledWith(
      expect.anything(),
      "owner",
      "workout"
    )
    expect(mocks.getPreviousPerformanceCues).toHaveBeenCalledWith(
      expect.anything(),
      "owner",
      ["variant"],
      "2030-02-03"
    )
  })

  it("rejects unauthenticated reads before reaching domain operations", async () => {
    mocks.requireCurrentSession.mockRejectedValue(
      new Response("Unauthorized", { status: 401 })
    )
    await expect(
      prepareRepeatWorkout({ data: { id: "workout" } })
    ).rejects.toMatchObject({ status: 401 })
    expect(mocks.getRepeatWorkout).not.toHaveBeenCalled()
  })
})
