import { describe, expect, it, vi } from "vitest"

import {
  createWorkoutTemplate,
  deleteWorkoutTemplate,
  getWorkoutTemplate,
  listWorkoutTemplateSummaries,
  parseSetCount,
  updateWorkoutTemplate,
} from "../templates"

const activeVariant: {
  id: string
  userId: string
  categoryId: string
  name: string
  difficultyMultiplier: number
  archivedAt: Date | null
  createdAt: Date
  updatedAt: Date
  category: { id: string; name: string; archivedAt: Date | null }
} = {
  id: "variant",
  userId: "owner",
  categoryId: "category",
  name: "Push-up",
  difficultyMultiplier: 1000,
  archivedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  category: { id: "category", name: "Push", archivedAt: null },
}

function templateDatabase(variants = [activeVariant]) {
  const templateValues = vi.fn()
  const exerciseValues = vi.fn()
  const insert = vi.fn((table) => ({
    values: table === undefined ? templateValues : exerciseValues,
  }))
  let insertCount = 0
  insert.mockImplementation(() => ({
    values: insertCount++ === 0 ? templateValues : exerciseValues,
  }))
  const batch = vi.fn().mockResolvedValue([])
  return {
    db: {
      batch,
      insert,
      query: {
        exerciseVariants: { findMany: vi.fn().mockResolvedValue(variants) },
        workoutTemplates: { findFirst: vi.fn() },
      },
    } as never,
    batch,
    templateValues,
    exerciseValues,
  }
}

describe("workout template domain operations", () => {
  it("lists template summaries with eligibility from one relational query", async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        id: "ready",
        name: "Ready",
        updatedAt: new Date("2030-01-01"),
        exercises: [
          { variant: { archivedAt: null, category: { archivedAt: null } } },
        ],
      },
      {
        id: "archived",
        name: "Archived",
        updatedAt: new Date("2030-01-02"),
        exercises: [
          {
            variant: { archivedAt: new Date(), category: { archivedAt: null } },
          },
        ],
      },
      {
        id: "empty",
        name: "Empty",
        updatedAt: new Date("2030-01-03"),
        exercises: [],
      },
    ])

    const summaries = await listWorkoutTemplateSummaries(
      { query: { workoutTemplates: { findMany } } } as never,
      "owner"
    )

    expect(findMany).toHaveBeenCalledOnce()
    expect(summaries).toEqual([
      expect.objectContaining({
        id: "ready",
        exerciseCount: 1,
        canStart: true,
      }),
      expect.objectContaining({
        id: "archived",
        exerciseCount: 1,
        canStart: false,
      }),
      expect.objectContaining({
        id: "empty",
        exerciseCount: 0,
        canStart: false,
      }),
    ])
  })

  it("parses only positive whole set counts", () => {
    expect(parseSetCount(1)).toEqual({ value: 1 })
    expect(parseSetCount("5")).toEqual({ value: 5 })
    expect(parseSetCount(" 3 ")).toEqual({ value: 3 })
    for (const value of [0, -1, 1.5, "1.5", "1e3", "", "abc", NaN]) {
      expect(parseSetCount(value)).toEqual({
        error: "Enter a positive whole number of sets.",
      })
    }
  })

  it("trims names and atomically saves ordered entries, including duplicates", async () => {
    const { db, batch, templateValues, exerciseValues } = templateDatabase()
    const now = new Date("2030-01-01")
    const result = await createWorkoutTemplate(
      db,
      "owner",
      {
        name: " Push day ",
        exercises: [
          { variantId: "variant", setCount: "2" },
          { variantId: "variant", setCount: 3 },
        ],
      },
      now
    )

    expect(result).toMatchObject({ ok: true, value: { name: "Push day" } })
    expect(batch).toHaveBeenCalledOnce()
    expect(templateValues).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Push day", createdAt: now })
    )
    expect(exerciseValues).toHaveBeenCalledWith([
      expect.objectContaining({
        variantId: "variant",
        position: 0,
        setCount: 2,
      }),
      expect.objectContaining({
        variantId: "variant",
        position: 1,
        setCount: 3,
      }),
    ])
  })

  it("rejects invalid names, foreign variants, and archived references without writing", async () => {
    const invalid = templateDatabase()
    await expect(
      createWorkoutTemplate(invalid.db, "owner", { name: " ", exercises: [] })
    ).resolves.toMatchObject({
      ok: false,
      fieldErrors: { name: "Enter a name." },
    })
    expect(invalid.batch).not.toHaveBeenCalled()

    const foreign = templateDatabase([])
    await expect(
      createWorkoutTemplate(foreign.db, "owner", {
        name: "Push",
        exercises: [{ variantId: "other-user-variant", setCount: 1 }],
      })
    ).resolves.toEqual({
      ok: false,
      error: "validation",
      fieldErrors: { exercises: ["Variant was not found."] },
    })
    expect(foreign.batch).not.toHaveBeenCalled()

    const archived = templateDatabase([
      { ...activeVariant, archivedAt: new Date() },
      {
        ...activeVariant,
        id: "category-archived",
        category: { ...activeVariant.category, archivedAt: new Date() },
      },
    ])
    await expect(
      createWorkoutTemplate(archived.db, "owner", {
        name: "Push",
        exercises: [
          { variantId: "variant", setCount: 1 },
          { variantId: "category-archived", setCount: 1 },
        ],
      })
    ).resolves.toMatchObject({
      fieldErrors: {
        exercises: [
          "Archived variants can't be added to a template.",
          "This variant's category is archived.",
        ],
      },
    })
    expect(archived.batch).not.toHaveBeenCalled()
  })

  it("replaces only an owned template's entries in one batch", async () => {
    const update = vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn() })) }))
    const remove = vi.fn(() => ({ where: vi.fn() }))
    const insertValues = vi.fn()
    const batch = vi.fn().mockResolvedValue([])
    const findFirst = vi.fn().mockResolvedValue({
      id: "template",
      userId: "owner",
      name: "Push",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    const db = {
      batch,
      update,
      delete: remove,
      insert: vi.fn(() => ({ values: insertValues })),
      query: {
        workoutTemplates: { findFirst },
        workoutTemplateExercises: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        exerciseVariants: {
          findMany: vi.fn().mockResolvedValue([activeVariant]),
        },
      },
    } as never

    await expect(
      updateWorkoutTemplate(db, "owner", {
        id: "template",
        name: " Pull ",
        exercises: [{ variantId: "variant", setCount: 4 }],
      })
    ).resolves.toMatchObject({ ok: true, value: { name: "Pull" } })
    expect(update).toHaveBeenCalledOnce()
    expect(remove).toHaveBeenCalledOnce()
    expect(insertValues).toHaveBeenCalledWith([
      expect.objectContaining({ position: 0, setCount: 4 }),
    ])

    findFirst.mockResolvedValueOnce(undefined)
    await expect(
      updateWorkoutTemplate(db, "other", {
        id: "template",
        name: "Pull",
        exercises: [],
      })
    ).resolves.toEqual({ ok: false, error: "not_found" })
    expect(batch).toHaveBeenCalledOnce()
  })

  it("keeps already-present archived exercises editable while rejecting new archived additions", async () => {
    const archivedVariant = {
      ...activeVariant,
      id: "archived-variant",
      archivedAt: new Date(),
    }
    const update = vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn() })) }))
    const remove = vi.fn(() => ({ where: vi.fn() }))
    const insertValues = vi.fn()
    const batch = vi.fn().mockResolvedValue([])
    const db = {
      batch,
      update,
      delete: remove,
      insert: vi.fn(() => ({ values: insertValues })),
      query: {
        workoutTemplates: {
          findFirst: vi.fn().mockResolvedValue({
            id: "template",
            userId: "owner",
            name: "Push",
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        },
        workoutTemplateExercises: {
          findMany: vi
            .fn()
            .mockResolvedValue([
              { variantId: "archived-variant" },
              { variantId: "active" },
            ]),
        },
        exerciseVariants: {
          findMany: vi.fn().mockResolvedValue([archivedVariant, activeVariant]),
        },
      },
    } as never

    await expect(
      updateWorkoutTemplate(db, "owner", {
        id: "template",
        name: "Push",
        exercises: [
          { variantId: "archived-variant", setCount: 2 },
          { variantId: "archived-variant", setCount: 3 },
        ],
      })
    ).resolves.toMatchObject({
      ok: true,
      value: { name: "Push", canStart: false },
    })
    expect(batch).toHaveBeenCalledOnce()

    const strictBatch = vi.fn().mockResolvedValue([])
    const strictDb = {
      batch: strictBatch,
      update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn() })) })),
      delete: vi.fn(() => ({ where: vi.fn() })),
      insert: vi.fn(() => ({ values: vi.fn() })),
      query: {
        workoutTemplates: {
          findFirst: vi.fn().mockResolvedValue({
            id: "template",
            userId: "owner",
            name: "Push",
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        },
        workoutTemplateExercises: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        exerciseVariants: {
          findMany: vi.fn().mockResolvedValue([archivedVariant]),
        },
      },
    } as never
    await expect(
      updateWorkoutTemplate(strictDb, "owner", {
        id: "template",
        name: "Push",
        exercises: [{ variantId: "archived-variant", setCount: 2 }],
      })
    ).resolves.toMatchObject({
      ok: false,
      error: "validation",
      fieldErrors: {
        exercises: ["Archived variants can't be added to a template."],
      },
    })
    expect(strictBatch).not.toHaveBeenCalled()
  })

  it("keeps archived entries visible and computes template start eligibility", async () => {
    const findFirst = vi.fn()
    const db = { query: { workoutTemplates: { findFirst } } } as never
    findFirst.mockResolvedValueOnce({
      id: "template",
      userId: "owner",
      name: "Push",
      createdAt: new Date(),
      updatedAt: new Date(),
      exercises: [
        {
          id: "entry",
          variantId: "variant",
          position: 0,
          setCount: 2,
          variant: { ...activeVariant, archivedAt: new Date() },
        },
      ],
    })
    await expect(
      getWorkoutTemplate(db, "owner", "template")
    ).resolves.toMatchObject({
      exercises: [
        expect.objectContaining({
          variantArchived: true,
          archived: true,
          position: 0,
        }),
      ],
      canStart: false,
    })
    findFirst.mockResolvedValueOnce({
      id: "empty",
      userId: "owner",
      name: "Empty",
      createdAt: new Date(),
      updatedAt: new Date(),
      exercises: [],
    })
    await expect(
      getWorkoutTemplate(db, "owner", "empty")
    ).resolves.toMatchObject({
      canStart: false,
    })
    findFirst.mockResolvedValueOnce(undefined)
    await expect(
      getWorkoutTemplate(db, "other", "template")
    ).resolves.toBeUndefined()
  })

  it("hard deletes only the owned template and reports missing templates", async () => {
    const all = vi
      .fn()
      .mockResolvedValueOnce([{ id: "template" }])
      .mockResolvedValueOnce([])
    const returning = vi.fn(() => ({ all }))
    const where = vi.fn(() => ({ returning }))
    const remove = vi.fn(() => ({ where }))
    const db = { delete: remove } as never

    await expect(
      deleteWorkoutTemplate(db, "owner", "template")
    ).resolves.toEqual({
      ok: true,
      value: { id: "template" },
    })
    await expect(
      deleteWorkoutTemplate(db, "other", "template")
    ).resolves.toEqual({
      ok: false,
      error: "not_found",
    })
    expect(remove).toHaveBeenCalledTimes(2)
  })

  it("creates an empty template without an exercise insert statement", async () => {
    const { db, batch, templateValues, exerciseValues } = templateDatabase()

    await expect(
      createWorkoutTemplate(db, "owner", { name: "Empty", exercises: [] })
    ).resolves.toMatchObject({
      ok: true,
      value: { name: "Empty", exercises: [], canStart: false },
    })
    expect(batch).toHaveBeenCalledOnce()
    expect(batch.mock.calls[0][0]).toHaveLength(1)
    expect(templateValues).toHaveBeenCalledTimes(1)
    expect(exerciseValues).not.toHaveBeenCalled()
  })

  it("replaces with an empty exercise list without an insert statement", async () => {
    const update = vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn() })) }))
    const remove = vi.fn(() => ({ where: vi.fn() }))
    const insertValues = vi.fn()
    const batch = vi.fn().mockResolvedValue([])
    const db = {
      batch,
      update,
      delete: remove,
      insert: vi.fn(() => ({ values: insertValues })),
      query: {
        workoutTemplates: {
          findFirst: vi.fn().mockResolvedValue({
            id: "template",
            userId: "owner",
            name: "Old",
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        },
        workoutTemplateExercises: { findMany: vi.fn().mockResolvedValue([]) },
        exerciseVariants: { findMany: vi.fn().mockResolvedValue([]) },
      },
    } as never

    await expect(
      updateWorkoutTemplate(db, "owner", {
        id: "template",
        name: "Empty",
        exercises: [],
      })
    ).resolves.toMatchObject({
      ok: true,
      value: { name: "Empty", canStart: false },
    })
    expect(update).toHaveBeenCalledOnce()
    expect(remove).toHaveBeenCalledOnce()
    expect(insertValues).not.toHaveBeenCalled()
    expect(batch).toHaveBeenCalledOnce()
    expect(batch.mock.calls[0][0]).toHaveLength(2)
  })
})
