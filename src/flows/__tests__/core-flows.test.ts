import { beforeEach, describe, expect, it } from "vitest"

import {
  archiveExerciseCategory,
  archiveExerciseVariant,
  createExerciseCategory,
  createExerciseVariant,
  getActiveExerciseLibrary,
  getExerciseManagementLibrary,
} from "@/exercises/library"
import { createInMemoryD1 } from "@/test/in-memory-d1"
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
const db = createInMemoryD1()
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

describe("core workout flows at the server boundary", () => {
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
    if (!template.ok) return

    const logged = await createWorkoutFromTemplate(
      db,
      owner,
      {
        templateId: template.value.id,
        workoutDate: "2030-02-03",
        exercises: [{ sets: [8, 7] }, { sets: [5] }, { sets: [6] }],
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
    if (!logged.ok) return
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

  it("retains archived template rows and blocks starting until they are removed", async () => {
    const { variants } = await categoryAndVariants()
    const template = await createWorkoutTemplate(db, owner, {
      name: "Pull",
      exercises: [
        { variantId: variants[0].id, setCount: 1 },
        { variantId: variants[1].id, setCount: 1 },
      ],
    })
    if (!template.ok) return
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
        exercises: [{ sets: [8] }, { sets: [5] }],
      })
    ).resolves.toMatchObject({
      ok: false,
      error: "template_ineligible",
      message: expect.stringContaining("Ring row"),
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
        exercises: [{ sets: [5] }],
      })
    ).resolves.toMatchObject({ ok: true })
  })

  it("preserves snapshots through archive and supports the null-source edit path", async () => {
    const { category, variants } = await categoryAndVariants()
    const logged = await createWorkout(db, owner, {
      workoutDate: "2030-02-03",
      name: "Snapshot",
      exercises: [
        { variantId: variants[0].id, sets: [8] },
        { variantId: variants[1].id, sets: [4] },
      ],
    })
    if (!logged.ok) return
    await archiveExerciseCategory(db, owner, category.id)
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
    db._tables.exerciseVariants.rows = db._tables.exerciseVariants.rows.filter(
      (row) => row.id !== variants[0].id
    )
    await expect(
      updateWorkout(db, owner, {
        id: logged.value.id,
        workoutDate: "2030-02-04",
        name: "Still editable",
        exercises: [{ variantId: variants[1].id, sets: [6] }],
      })
    ).resolves.toMatchObject({
      ok: true,
      value: { exercises: [{ variantName: "Pull-up" }] },
    })
    await expect(
      deleteWorkout(db, owner, logged.value.id)
    ).resolves.toMatchObject({ ok: true })
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
    if (!template.ok) return
    const logged = await createWorkoutFromTemplate(db, owner, {
      templateId: template.value.id,
      workoutDate: "2030-02-03",
      exercises: [{ sets: [8] }, { sets: [4] }],
    })
    if (!logged.ok) return
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
    await deleteWorkoutTemplate(db, owner, template.value.id)
    await expect(getWorkout(db, owner, logged.value.id)).resolves.toMatchObject(
      {
        name: "Edited workout only",
      }
    )
  })

  it("covers same-date ordering, set extremes, empty inputs, and ownership", async () => {
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
    expect(
      first.ok && first.value.exercises.map((row) => row.sets.length)
    ).toEqual([1, 5])
    await expect(
      listWorkouts(db, owner, { from: "2030-03-04", to: "2030-03-04" })
    ).resolves.toMatchObject([{ name: "Second" }, { name: "First" }])

    const emptyTemplate = await createWorkoutTemplate(db, owner, {
      name: "Empty",
      exercises: [],
    })
    expect(emptyTemplate).toMatchObject({
      ok: true,
      value: { canStart: false },
    })
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
    if (emptyTemplate.ok)
      await expect(
        createWorkoutFromTemplate(db, owner, {
          templateId: emptyTemplate.value.id,
          workoutDate: "2030-03-04",
          exercises: [],
        })
      ).resolves.toMatchObject({ ok: false, error: "template_ineligible" })

    await expect(listWorkouts(db, other)).resolves.toEqual([])
    if (!first.ok || !second.ok) return
    await expect(getWorkout(db, other, first.value.id)).resolves.toBeUndefined()
    await expect(
      updateWorkout(db, other, {
        id: first.value.id,
        workoutDate: "2030-03-04",
        exercises: [{ variantId: variants[0].id, sets: [1] }],
      })
    ).resolves.toEqual({ ok: false, error: "not_found" })
    await expect(deleteWorkout(db, other, second.value.id)).resolves.toEqual({
      ok: false,
      error: "not_found",
    })
    await expect(
      deleteWorkoutTemplate(
        db,
        other,
        emptyTemplate.ok ? emptyTemplate.value.id : "x"
      )
    ).resolves.toEqual({
      ok: false,
      error: "not_found",
    })
    await expect(
      createExerciseVariant(db, other, {
        categoryId: db._tables.exerciseCategories.rows[0].id as string,
        name: "Stolen",
        difficultyMultiplier: 1,
      })
    ).resolves.toMatchObject({ ok: false, error: "not_found" })
  })
})
