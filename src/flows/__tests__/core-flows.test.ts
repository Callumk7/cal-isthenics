import { beforeEach, describe, expect, it } from "vitest"

import {
  archiveExerciseCategory,
  archiveExerciseVariant,
  createExerciseCategory,
  createExerciseVariant,
  getActiveExerciseLibrary,
  getExerciseManagementLibrary,
  restoreExerciseCategory,
  restoreExerciseVariant,
} from "@/exercises/library"
import { createInMemoryDrizzle } from "@/test/in-memory-drizzle"
import {
  createWorkoutTemplate,
  deleteWorkoutTemplate,
  getWorkoutTemplate,
  listWorkoutTemplateSummaries,
  updateWorkoutTemplate,
} from "@/templates/templates"
import {
  createWorkout,
  createWorkoutFromTemplate,
  deleteWorkout,
  getWorkout,
  listWorkouts,
  updateWorkout,
} from "@/workouts/workouts"

const owner = "owner"
const other = "other"
const db = createInMemoryDrizzle()
const at = (minute: number) => new Date(`2030-01-01T00:${minute}:00.000Z`)

async function categoryAndVariants(names = ["Ring row", "Pull-up"]) {
  const category = await createExerciseCategory(
    db,
    owner,
    { name: "Pull" },
    at(0)
  )
  if (!category.ok) throw new Error("fixture category failed")
  const variants = []
  for (const [index, name] of names.entries()) {
    const variant = await createExerciseVariant(
      db,
      owner,
      {
        categoryId: category.value.id,
        name,
        difficultyMultiplier: index ? "1.5" : "1.25",
      },
      at(index + 1)
    )
    if (!variant.ok) throw new Error("fixture variant failed")
    variants.push(variant.value)
  }
  return { category: category.value, variants }
}

beforeEach(() => db.reset())

describe("workout domain orchestration with an in-memory Drizzle fake", () => {
  it("runs creation through template logging, workout editing, and deletion", async () => {
    const { variants } = await categoryAndVariants()
    const template = await createWorkoutTemplate(
      db,
      owner,
      {
        name: "Pull strength",
        exercises: [
          { variantId: variants[0].id, setCount: 2 },
          { variantId: variants[1].id, setCount: 1 },
          { variantId: variants[0].id, setCount: 1 },
        ],
      },
      at(4)
    )
    expect(template).toMatchObject({ ok: true, value: { canStart: true } })
    if (!template.ok) throw new Error("fixture template failed")

    const logged = await createWorkoutFromTemplate(
      db,
      owner,
      {
        templateId: template.value.id,
        workoutDate: "2030-02-03",
        name: "Pull strength",
        exercises: [
          { variantId: variants[0].id, sets: [8, 7] },
          { variantId: variants[1].id, sets: [5] },
          { variantId: variants[0].id, sets: [6] },
        ],
      },
      at(5)
    )
    expect(logged).toMatchObject({
      ok: true,
      value: {
        name: "Pull strength",
        exercises: [
          {
            position: 0,
            variantName: "Ring row",
            sets: [{ reps: 8 }, { reps: 7 }],
          },
          { position: 1, variantName: "Pull-up", sets: [{ reps: 5 }] },
          { position: 2, variantName: "Ring row", sets: [{ reps: 6 }] },
        ],
      },
    })
    if (!logged.ok) throw new Error("fixture workout failed")
    await expect(listWorkouts(db, owner)).resolves.toHaveLength(1)
    await expect(getWorkout(db, owner, logged.value.id)).resolves.toBeDefined()

    const edited = await updateWorkout(
      db,
      owner,
      {
        id: logged.value.id,
        workoutDate: "2030-02-03",
        name: "Heavy pull",
        exercises: [
          { variantId: variants[1].id, sets: [6] },
          { variantId: variants[0].id, sets: [10, 9] },
        ],
      },
      at(6)
    )
    expect(edited).toMatchObject({
      ok: true,
      value: {
        name: "Heavy pull",
        exercises: [
          { position: 0, variantName: "Pull-up", sets: [{ reps: 6 }] },
          {
            position: 1,
            variantName: "Ring row",
            sets: [{ reps: 10 }, { reps: 9 }],
          },
        ],
      },
    })
    expect(db._tables.workoutTemplates.rows).toHaveLength(1)
    expect(db._tables.workoutTemplateExercises.rows).toHaveLength(3)
    await expect(deleteWorkout(db, owner, logged.value.id)).resolves.toEqual({
      ok: true,
      value: { id: logged.value.id },
    })
    await expect(
      getWorkout(db, owner, logged.value.id)
    ).resolves.toBeUndefined()
    await expect(listWorkouts(db, owner)).resolves.toEqual([])
    expect(db._tables.workouts.rows).toHaveLength(0)
    expect(db._tables.workoutExercises.rows).toHaveLength(0)
    expect(db._tables.workoutSets.rows).toHaveLength(0)
    expect(db._tables.workoutTemplateExercises.rows).toHaveLength(3)
  })

  it("keeps non-template archive changes out of active selectors", async () => {
    const { variants } = await categoryAndVariants()
    const template = await createWorkoutTemplate(db, owner, {
      name: "Rows",
      exercises: [{ variantId: variants[0].id, setCount: 2 }],
    })
    expect(template.ok).toBe(true)
    await archiveExerciseVariant(db, owner, variants[1].id)
    await expect(getActiveExerciseLibrary(db, owner)).resolves.toMatchObject([
      { variants: [{ id: variants[0].id }] },
    ])
    await expect(
      getExerciseManagementLibrary(db, owner)
    ).resolves.toMatchObject([
      {
        variants: [
          { id: variants[1].id, archivedAt: expect.any(Date) },
          { id: variants[0].id },
        ],
      },
    ])
    await expect(
      createWorkoutTemplate(db, owner, {
        name: "Invalid",
        exercises: [{ variantId: variants[1].id, setCount: 1 }],
      })
    ).resolves.toMatchObject({
      ok: false,
      error: "validation",
      fieldErrors: {
        exercises: ["Archived variants can't be added to a template."],
      },
    })
    await expect(
      listWorkoutTemplateSummaries(db, owner)
    ).resolves.toMatchObject([{ name: "Rows", canStart: true }])
  })

  it("restores an archived variant to pickers and re-enables its template", async () => {
    const { variants } = await categoryAndVariants()
    const template = await createWorkoutTemplate(db, owner, {
      name: "Restorable rows",
      exercises: [{ variantId: variants[0].id, setCount: 2 }],
    })
    expect(template.ok).toBe(true)

    await archiveExerciseVariant(db, owner, variants[0].id, at(5))
    await expect(
      listWorkoutTemplateSummaries(db, owner)
    ).resolves.toMatchObject([{ name: "Restorable rows", canStart: false }])
    await expect(getActiveExerciseLibrary(db, owner)).resolves.toMatchObject([
      { variants: [{ id: variants[1].id }] },
    ])

    await expect(
      restoreExerciseVariant(db, owner, variants[0].id, at(6))
    ).resolves.toMatchObject({ ok: true, value: { archivedAt: null } })
    const activeLibrary = await getActiveExerciseLibrary(db, owner)
    expect(activeLibrary[0]?.variants).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: variants[0].id })])
    )
    await expect(
      listWorkoutTemplateSummaries(db, owner)
    ).resolves.toMatchObject([{ name: "Restorable rows", canStart: true }])
  })

  it("restores a category without reviving individually archived variants", async () => {
    const { category, variants } = await categoryAndVariants()
    await archiveExerciseVariant(db, owner, variants[1].id, at(5))
    await archiveExerciseCategory(db, owner, category.id, at(6))

    await expect(
      restoreExerciseCategory(db, owner, category.id, at(7))
    ).resolves.toMatchObject({ ok: true, value: { archivedAt: null } })
    await expect(getActiveExerciseLibrary(db, owner)).resolves.toMatchObject([
      { variants: [{ id: variants[0].id }] },
    ])
    const managedLibrary = await getExerciseManagementLibrary(db, owner)
    expect(managedLibrary[0]).toMatchObject({ archivedAt: null })
    expect(managedLibrary[0]?.variants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: variants[1].id,
          archivedAt: expect.any(Date),
        }),
      ])
    )
  })

  it("retains archived template rows and blocks starting until they are removed", async () => {
    const { variants } = await categoryAndVariants()
    const template = await createWorkoutTemplate(db, owner, {
      name: "Pull",
      exercises: [
        { variantId: variants[0].id, setCount: 1 },
        { variantId: variants[1].id, setCount: 1 },
      ],
    })
    expect(template.ok).toBe(true)
    if (!template.ok) throw new Error("fixture template failed")
    await archiveExerciseVariant(db, owner, variants[0].id)
    const archivedDetail = await getWorkoutTemplate(
      db,
      owner,
      template.value.id
    )
    expect(archivedDetail?.canStart).toBe(false)
    expect(archivedDetail?.exercises[0]).toMatchObject({
      variantName: "Ring row",
      archived: true,
    })
    await expect(
      listWorkoutTemplateSummaries(db, owner)
    ).resolves.toMatchObject([{ canStart: false }])
    await expect(
      createWorkoutFromTemplate(db, owner, {
        templateId: template.value.id,
        workoutDate: "2030-02-03",
        exercises: [
          { variantId: variants[0].id, sets: [8] },
          { variantId: variants[1].id, sets: [5] },
        ],
      })
    ).resolves.toMatchObject({
      ok: false,
      error: "validation",
    })

    const updated = await updateWorkoutTemplate(db, owner, {
      id: template.value.id,
      name: "Available pull",
      exercises: [{ variantId: variants[1].id, setCount: 1 }],
    })
    expect(updated).toMatchObject({ ok: true, value: { canStart: true } })
    await expect(
      createWorkoutFromTemplate(db, owner, {
        templateId: template.value.id,
        workoutDate: "2030-02-03",
        exercises: [{ variantId: variants[1].id, sets: [5] }],
      })
    ).resolves.toMatchObject({ ok: true })
  })

  it("preserves workout snapshots when the source category is archived", async () => {
    const { category, variants } = await categoryAndVariants()
    const logged = await createWorkout(db, owner, {
      workoutDate: "2030-02-03",
      name: "Snapshot",
      exercises: [
        { variantId: variants[0].id, sets: [8] },
        { variantId: variants[1].id, sets: [4] },
      ],
    })
    expect(logged.ok).toBe(true)
    if (!logged.ok) throw new Error("fixture workout failed")

    await expect(
      archiveExerciseCategory(db, owner, category.id)
    ).resolves.toMatchObject({ ok: true })

    await expect(getWorkout(db, owner, logged.value.id)).resolves.toMatchObject(
      {
        exercises: [
          {
            categoryName: "Pull",
            variantName: "Ring row",
            difficultyMultiplier: 1250,
          },
          {
            categoryName: "Pull",
            variantName: "Pull-up",
            difficultyMultiplier: 1500,
          },
        ],
      }
    )
  })

  it("allows an edit to remove every exercise while rejecting an empty create", async () => {
    const { variants } = await categoryAndVariants()
    const logged = await createWorkout(db, owner, {
      workoutDate: "2030-02-03",
      name: "Rows to remove",
      exercises: [
        { variantId: variants[0].id, sets: [8] },
        { variantId: variants[1].id, sets: [4] },
      ],
    })
    expect(logged.ok).toBe(true)
    if (!logged.ok) throw new Error("fixture workout failed")

    await expect(
      updateWorkout(db, owner, {
        id: logged.value.id,
        workoutDate: "2030-02-04",
        name: "All rows removed",
        exercises: [],
      })
    ).resolves.toMatchObject({
      ok: true,
      value: { name: "All rows removed", exercises: [] },
    })
    const after = await getWorkout(db, owner, logged.value.id)
    expect(after?.workoutDate).toBe("2030-02-04")
    expect(after?.exercises).toEqual([])
    expect(db._tables.workoutExercises.rows).toHaveLength(0)
    expect(db._tables.workoutSets.rows).toHaveLength(0)

    await expect(
      createWorkout(db, owner, {
        workoutDate: "2030-02-05",
        name: "Empty create",
        exercises: [],
      })
    ).resolves.toMatchObject({ ok: false, error: "validation" })
  })

  it("keeps templates and saved workouts independent", async () => {
    const { variants } = await categoryAndVariants()
    const template = await createWorkoutTemplate(db, owner, {
      name: "Original",
      exercises: [
        { variantId: variants[0].id, setCount: 1 },
        { variantId: variants[1].id, setCount: 1 },
      ],
    })
    expect(template.ok).toBe(true)
    if (!template.ok) throw new Error("fixture template failed")
    const logged = await createWorkoutFromTemplate(db, owner, {
      templateId: template.value.id,
      workoutDate: "2030-02-03",
      name: "Original",
      exercises: [
        { variantId: variants[0].id, sets: [8] },
        { variantId: variants[1].id, sets: [4] },
      ],
    })
    expect(logged.ok).toBe(true)
    if (!logged.ok) throw new Error("fixture workout failed")
    const snapshot = logged.value.exercises.map(
      ({ position, variantName, sets }) => ({
        position,
        variantName,
        reps: sets.map((set) => set.reps),
      })
    )
    await updateWorkoutTemplate(db, owner, {
      id: template.value.id,
      name: "Reordered",
      exercises: [
        { variantId: variants[1].id, setCount: 3 },
        { variantId: variants[0].id, setCount: 1 },
      ],
    })
    expect(
      (await getWorkout(db, owner, logged.value.id))?.exercises.map(
        ({ position, variantName, sets }) => ({
          position,
          variantName,
          reps: sets.map((set) => set.reps),
        })
      )
    ).toEqual(snapshot)
    await updateWorkout(db, owner, {
      id: logged.value.id,
      workoutDate: "2030-02-03",
      name: "Edited workout only",
      exercises: [{ variantId: variants[0].id, sets: [12] }],
    })
    const reordered = await getWorkoutTemplate(db, owner, template.value.id)
    expect(reordered?.name).toBe("Reordered")
    expect(reordered?.exercises[0]).toMatchObject({
      variantId: variants[1].id,
      setCount: 3,
    })
    await expect(
      deleteWorkoutTemplate(db, owner, template.value.id)
    ).resolves.toEqual({ ok: true, value: { id: template.value.id } })
    await expect(
      getWorkoutTemplate(db, owner, template.value.id)
    ).resolves.toBeUndefined()
    await expect(getWorkout(db, owner, logged.value.id)).resolves.toMatchObject(
      {
        name: "Edited workout only",
      }
    )
  })

  it("orders same-date workouts by creation time and preserves set counts", async () => {
    const { variants } = await categoryAndVariants()
    const first = await createWorkout(
      db,
      owner,
      {
        workoutDate: "2030-03-04",
        name: "First",
        exercises: [
          { variantId: variants[0].id, sets: [1] },
          { variantId: variants[0].id, sets: [1, 2, 3, 4, 5] },
        ],
      },
      at(10)
    )
    const second = await createWorkout(
      db,
      owner,
      {
        workoutDate: "2030-03-04",
        name: "Second",
        exercises: [{ variantId: variants[1].id, sets: [2] }],
      },
      at(11)
    )
    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)
    if (!first.ok || !second.ok) throw new Error("fixture workout failed")

    expect(first.value.exercises.map((row) => row.sets.length)).toEqual([1, 5])
    await expect(
      listWorkouts(db, owner, { from: "2030-03-04", to: "2030-03-04" })
    ).resolves.toMatchObject([{ name: "Second" }, { name: "First" }])
  })

  it("rejects empty workout inputs and prevents starting an empty template", async () => {
    const emptyTemplate = await createWorkoutTemplate(db, owner, {
      name: "Empty",
      exercises: [],
    })
    expect(emptyTemplate).toMatchObject({
      ok: true,
      value: { canStart: false },
    })
    if (!emptyTemplate.ok) throw new Error("fixture template failed")

    await expect(
      createWorkoutTemplate(db, owner, { name: " ", exercises: [] })
    ).resolves.toMatchObject({
      ok: false,
      fieldErrors: { name: "Enter a name." },
    })
    await expect(
      createWorkout(db, owner, {
        workoutDate: "2030-03-04",
        name: " ",
        exercises: [],
      })
    ).resolves.toMatchObject({
      ok: false,
      fieldErrors: { exercises: expect.anything() },
    })
    await expect(
      createWorkoutFromTemplate(db, owner, {
        templateId: emptyTemplate.value.id,
        workoutDate: "2030-03-04",
        exercises: [],
      })
    ).resolves.toMatchObject({ ok: false, error: "validation" })
  })

  it("keeps workouts, templates, and exercise categories owner-scoped", async () => {
    const { variants } = await categoryAndVariants()
    const workout = await createWorkout(db, owner, {
      workoutDate: "2030-03-04",
      exercises: [{ variantId: variants[0].id, sets: [1] }],
    })
    const template = await createWorkoutTemplate(db, owner, {
      name: "Owned",
      exercises: [{ variantId: variants[0].id, setCount: 1 }],
    })
    expect(workout.ok).toBe(true)
    expect(template.ok).toBe(true)
    if (!workout.ok || !template.ok) throw new Error("fixture creation failed")

    await expect(listWorkouts(db, other)).resolves.toEqual([])
    await expect(
      getWorkout(db, other, workout.value.id)
    ).resolves.toBeUndefined()
    await expect(
      updateWorkout(db, other, {
        id: workout.value.id,
        workoutDate: "2030-03-04",
        exercises: [{ variantId: variants[0].id, sets: [1] }],
      })
    ).resolves.toEqual({ ok: false, error: "not_found" })
    await expect(deleteWorkout(db, other, workout.value.id)).resolves.toEqual({
      ok: false,
      error: "not_found",
    })
    await expect(
      deleteWorkoutTemplate(db, other, template.value.id)
    ).resolves.toEqual({ ok: false, error: "not_found" })
    await expect(
      createExerciseVariant(db, other, {
        categoryId: db._tables.exerciseCategories.rows[0].id as string,
        name: "Stolen",
        difficultyMultiplier: 1,
      })
    ).resolves.toMatchObject({ ok: false, error: "not_found" })
  })
})
