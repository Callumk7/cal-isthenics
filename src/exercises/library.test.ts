import { describe, expect, it, vi } from "vitest"

import {
  archiveExerciseCategory,
  archiveExerciseVariant,
  createExerciseCategory,
  createExerciseVariant,
  editExerciseVariant,
  getActiveExerciseLibrary,
  getExerciseManagementLibrary,
  getExerciseVariantReference,
  parseDifficultyMultiplier,
  renameExerciseCategory,
} from "./library"

function insertDatabase() {
  const values = vi.fn().mockResolvedValue(undefined)
  return { db: { insert: vi.fn(() => ({ values })) } as never, values }
}

function updateDatabase(returned: unknown) {
  const all = vi.fn().mockResolvedValue(returned ? [returned] : [])
  const returning = vi.fn(() => ({ all }))
  const where = vi.fn(() => ({ returning }))
  const set = vi.fn(() => ({ where }))
  return { db: { update: vi.fn(() => ({ set })) } as never, set, where }
}

describe("exercise library domain operations", () => {
  it("converts display multipliers to exact integer thousandths", () => {
    expect(parseDifficultyMultiplier(1.25)).toEqual({ value: 1250 })
    expect(parseDifficultyMultiplier("0.001")).toEqual({ value: 1 })
    expect(parseDifficultyMultiplier(0)).toMatchObject({
      error: expect.anything(),
    })
    expect(parseDifficultyMultiplier(-1)).toMatchObject({
      error: expect.anything(),
    })
    expect(parseDifficultyMultiplier("1.2345")).toMatchObject({
      error: expect.anything(),
    })
    expect(parseDifficultyMultiplier(1.005)).toEqual({ value: 1005 })
    expect(parseDifficultyMultiplier(1.001)).toEqual({ value: 1001 })
    expect(parseDifficultyMultiplier(1.015)).toEqual({ value: 1015 })
    expect(parseDifficultyMultiplier("1.005")).toEqual({ value: 1005 })
    expect(parseDifficultyMultiplier("0x10")).toMatchObject({
      error: expect.anything(),
    })
    expect(parseDifficultyMultiplier("1e3")).toMatchObject({
      error: expect.anything(),
    })
    expect(parseDifficultyMultiplier(" 1.25 ")).toEqual({ value: 1250 })
  })

  it("validates all fields before attempting a variant write", async () => {
    const db = { insert: vi.fn(), query: { exerciseCategories: {} } } as never

    await expect(
      createExerciseVariant(db, "owner", {
        categoryId: "category",
        name: "  ",
        difficultyMultiplier: "nope",
      })
    ).resolves.toEqual({
      ok: false,
      error: "validation",
      fieldErrors: {
        name: "Enter a name.",
        difficultyMultiplier:
          "Enter a positive multiplier with no more than three decimal places.",
      },
    })
    expect(
      (db as { insert: ReturnType<typeof vi.fn> }).insert
    ).not.toHaveBeenCalled()
  })

  it("creates trimmed categories and rejects invalid names without writing", async () => {
    const { db, values } = insertDatabase()
    const now = new Date("2030-01-01")

    const created = await createExerciseCategory(
      db,
      "owner",
      { name: " Pull " },
      now
    )
    expect(created).toMatchObject({
      ok: true,
      value: { userId: "owner", name: "Pull" },
    })
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Pull", createdAt: now })
    )

    const invalid = insertDatabase()
    await expect(
      createExerciseCategory(invalid.db, "owner", { name: "" })
    ).resolves.toMatchObject({
      ok: false,
      error: "validation",
      fieldErrors: { name: expect.any(String) },
    })
    expect(invalid.values).not.toHaveBeenCalled()
  })

  it("only creates variants beneath an active category owned by the user", async () => {
    const values = vi.fn().mockResolvedValue(undefined)
    const findFirst = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ id: "category" })
    const db = {
      query: { exerciseCategories: { findFirst } },
      insert: vi.fn(() => ({ values })),
    } as never
    const input = {
      categoryId: "category",
      name: "Archer",
      difficultyMultiplier: 1.5,
    }

    await expect(
      createExerciseVariant(db, "owner", input)
    ).resolves.toMatchObject({
      ok: false,
      error: "not_found",
      fieldErrors: { categoryId: expect.any(String) },
    })
    expect(values).not.toHaveBeenCalled()

    await expect(
      createExerciseVariant(db, "owner", input)
    ).resolves.toMatchObject({
      ok: true,
      value: {
        userId: "owner",
        categoryId: "category",
        difficultyMultiplier: 1500,
      },
    })
  })

  it("supports owned rename, multiplier edit, and archive mutations", async () => {
    const category = { id: "category", userId: "owner", name: "Push" }
    const variant = {
      id: "variant",
      userId: "owner",
      name: "Dip",
      difficultyMultiplier: 1200,
    }
    const categoryRename = updateDatabase(category)
    const categoryArchive = updateDatabase(category)
    const variantEdit = updateDatabase(variant)
    const variantArchive = updateDatabase(variant)

    await expect(
      renameExerciseCategory(categoryRename.db, "owner", {
        id: "category",
        name: " Push ",
      })
    ).resolves.toMatchObject({ ok: true })
    await expect(
      archiveExerciseCategory(categoryArchive.db, "owner", "category")
    ).resolves.toMatchObject({ ok: true })
    await expect(
      editExerciseVariant(variantEdit.db, "owner", {
        id: "variant",
        name: "Ring dip",
        difficultyMultiplier: 1.2,
      })
    ).resolves.toMatchObject({ ok: true })
    await expect(
      archiveExerciseVariant(variantArchive.db, "owner", "variant")
    ).resolves.toMatchObject({ ok: true })
    expect(variantEdit.set).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Ring dip", difficultyMultiplier: 1200 })
    )
    expect(categoryArchive.set).toHaveBeenCalledWith(
      expect.objectContaining({ archivedAt: expect.any(Date) })
    )
    expect(variantArchive.set).toHaveBeenCalledWith(
      expect.objectContaining({ archivedAt: expect.any(Date) })
    )
  })

  it("returns not_found for identifiers outside the user's mutation scope", async () => {
    const { db } = updateDatabase(undefined)
    await expect(
      renameExerciseCategory(db, "other-user", { id: "category", name: "New" })
    ).resolves.toEqual({ ok: false, error: "not_found" })
  })

  it("separates active picker, full management, and archived reference reads", async () => {
    const categoryFindMany = vi.fn().mockResolvedValue([])
    const variantFindFirst = vi.fn().mockResolvedValue({
      id: "archived-variant",
      archivedAt: new Date(),
      category: { id: "archived-category", archivedAt: new Date() },
    })
    const db = {
      query: {
        exerciseCategories: { findMany: categoryFindMany },
        exerciseVariants: { findFirst: variantFindFirst },
      },
    } as never

    await getActiveExerciseLibrary(db, "owner")
    await getExerciseManagementLibrary(db, "owner")
    await expect(
      getExerciseVariantReference(db, "owner", "archived-variant")
    ).resolves.toMatchObject({ id: "archived-variant" })

    const activeConfig = categoryFindMany.mock.calls[0][0]
    const managementConfig = categoryFindMany.mock.calls[1][0]
    expect(activeConfig.with.variants.where).toBeDefined()
    expect(managementConfig.with.variants.where).toBeDefined()
    expect(activeConfig.where).not.toEqual(managementConfig.where)
    expect(variantFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ with: { category: true } })
    )
  })
})
