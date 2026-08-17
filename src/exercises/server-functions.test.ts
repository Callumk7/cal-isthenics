import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  addExerciseCategory,
  listActiveExercises,
  readExerciseVariantReference,
  removeExerciseVariant,
} from "./server-functions"

const mocks = vi.hoisted(() => ({
  requireCurrentSession: vi.fn(),
  getActiveExerciseLibrary: vi.fn(),
  getExerciseVariantReference: vi.fn(),
  createExerciseCategory: vi.fn(),
  archiveExerciseVariant: vi.fn(),
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
vi.mock("./library", () => ({
  getActiveExerciseLibrary: mocks.getActiveExerciseLibrary,
  getExerciseManagementLibrary: vi.fn(),
  getExerciseVariantReference: mocks.getExerciseVariantReference,
  createExerciseCategory: mocks.createExerciseCategory,
  renameExerciseCategory: vi.fn(),
  archiveExerciseCategory: vi.fn(),
  createExerciseVariant: vi.fn(),
  editExerciseVariant: vi.fn(),
  archiveExerciseVariant: mocks.archiveExerciseVariant,
}))

describe("authenticated exercise server operations", () => {
  beforeEach(() => vi.clearAllMocks())

  it("passes only the current authenticated user's id into every operation", async () => {
    mocks.requireCurrentSession.mockResolvedValue({ userId: "owner" })
    mocks.getActiveExerciseLibrary.mockResolvedValue([])
    mocks.getExerciseVariantReference.mockResolvedValue(undefined)
    mocks.createExerciseCategory.mockResolvedValue({ ok: true })
    mocks.archiveExerciseVariant.mockResolvedValue({ ok: true })

    await listActiveExercises()
    await readExerciseVariantReference({ data: { id: "variant" } })
    await addExerciseCategory({ data: { name: "Push" } })
    await removeExerciseVariant({ data: { id: "variant" } })

    expect(mocks.getActiveExerciseLibrary).toHaveBeenCalledWith(
      expect.anything(),
      "owner"
    )
    expect(mocks.getExerciseVariantReference).toHaveBeenCalledWith(
      expect.anything(),
      "owner",
      "variant"
    )
    expect(mocks.createExerciseCategory).toHaveBeenCalledWith(
      expect.anything(),
      "owner",
      { name: "Push" }
    )
    expect(mocks.archiveExerciseVariant).toHaveBeenCalledWith(
      expect.anything(),
      "owner",
      "variant"
    )
  })

  it("rejects unauthenticated reads and mutations before accessing the library", async () => {
    mocks.requireCurrentSession.mockRejectedValue(
      new Response("Unauthorized", { status: 401 })
    )

    await expect(listActiveExercises()).rejects.toMatchObject({ status: 401 })
    await expect(
      addExerciseCategory({ data: { name: "Push" } })
    ).rejects.toMatchObject({ status: 401 })
    expect(mocks.getActiveExerciseLibrary).not.toHaveBeenCalled()
    expect(mocks.createExerciseCategory).not.toHaveBeenCalled()
  })
})
