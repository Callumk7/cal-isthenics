import { and, asc, desc, eq, gte, inArray, isNull, lte } from "drizzle-orm"
import type { DrizzleD1Database } from "drizzle-orm/d1"

import type * as schema from "../db/schema"
import {
  exerciseVariants,
  workoutExercises,
  workoutSets,
  workouts,
} from "../db/schema"

export type WorkoutDatabase = DrizzleD1Database<typeof schema>
export type WorkoutInput = {
  workoutDate: unknown
  name?: unknown
  notes?: unknown
  /** A stable ID generated once per client-side draft. */
  clientRequestId?: unknown
  exercises: unknown
}
export type WorkoutExerciseInput = {
  variantId: unknown
  notes?: unknown
  sets: unknown
}
export type WorkoutMutationResult<T> =
  | { ok: true; value: T }
  | {
      ok: false
      error:
        | "validation"
        | "not_found"
        | "request_conflict"
        | "repeat_unavailable"
      message?: string
      fieldErrors?: Record<string, JsonValue>
    }

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

export type WorkoutDetail = Omit<
  typeof workouts.$inferSelect,
  "clientRequestId" | "requestPayloadHash"
> & {
  exercises: Array<
    typeof workoutExercises.$inferSelect & {
      sets: Array<typeof workoutSets.$inferSelect>
    }
  >
}

type Variant = typeof exerciseVariants.$inferSelect & {
  category: typeof schema.exerciseCategories.$inferSelect
}
type ValidExercise = { variantId: string; notes: string | null; reps: number[] }

export type RepeatUnavailableEntry = {
  sourceExerciseId: string
  sourceVariantId: string | null
  categoryName: string
  variantName: string
  reason: "missing_variant" | "archived_variant" | "archived_category"
}

export type RepeatWorkoutDetail = WorkoutDetail & {
  exercises: Array<
    WorkoutDetail["exercises"][number] & {
      activeVariant: {
        id: string
        categoryId: string
        name: string
        categoryName: string
      }
    }
  >
}

export type PreviousPerformanceCue = {
  variantId: string
  cue: { workoutDate: string; reps: number[] } | null
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const REP_ERROR = "Enter a positive whole number of reps."

function optionalText(
  value: unknown,
  field: string,
  max: number
): { value: string | null } | { error: string } {
  if (value === undefined || value === null || value === "")
    return { value: null }
  if (typeof value !== "string") return { error: `${field} must be text.` }
  const text = value.trim()
  if (!text) return { value: null }
  if (text.length > max)
    return { error: `${field} must be ${max} characters or fewer.` }
  return { value: text }
}

export function parseReps(
  value: unknown
): { value: number } | { error: string } {
  const text =
    typeof value === "number"
      ? String(value)
      : typeof value === "string"
        ? value.trim()
        : ""
  if (!/^\d+$/.test(text)) return { error: REP_ERROR }
  const parsed = Number(text)
  return Number.isSafeInteger(parsed) && parsed > 0
    ? { value: parsed }
    : { error: REP_ERROR }
}

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return (
    !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
  )
}

async function validateInput(
  db: WorkoutDatabase,
  userId: string,
  input: WorkoutInput,
  requireExercise = true
) {
  const fieldErrors: Record<string, JsonValue> = {}
  if (!validDate(input.workoutDate))
    fieldErrors.workoutDate = "Enter a valid calendar date."
  const name = optionalText(input.name, "Name", 100)
  const notes = optionalText(input.notes, "Notes", 5000)
  const requestId = optionalText(
    input.clientRequestId,
    "Client request ID",
    200
  )
  if ("error" in requestId) fieldErrors.clientRequestId = requestId.error
  if ("error" in name) fieldErrors.name = name.error
  if ("error" in notes) fieldErrors.notes = notes.error

  const entries: ValidExercise[] = []
  const ids: string[] = []
  const exerciseErrors: Array<Record<string, JsonValue> | null> = []
  if (
    !Array.isArray(input.exercises) ||
    (requireExercise && input.exercises.length === 0)
  )
    fieldErrors.exercises = [{ exercise: "Add at least one exercise." }]
  else
    input.exercises.forEach((raw, index) => {
      const errors: Record<string, JsonValue> = {}
      if (!raw || typeof raw !== "object") {
        exerciseErrors[index] = { exercise: "Enter a valid exercise." }
        return
      }
      const item = raw as WorkoutExerciseInput
      if (typeof item.variantId !== "string" || !item.variantId)
        errors.variantId = "Variant was not found."
      const exerciseNotes = optionalText(item.notes, "Exercise notes", 2000)
      if ("error" in exerciseNotes) errors.notes = exerciseNotes.error
      const reps: number[] = []
      const setErrors: Array<string | null> = []
      if (!Array.isArray(item.sets) || item.sets.length === 0)
        setErrors[0] = REP_ERROR
      else
        item.sets.forEach((set, setIndex) => {
          const value =
            typeof set === "object" && set !== null && "reps" in set
              ? (set as { reps: unknown }).reps
              : set
          const parsed = parseReps(value)
          if ("error" in parsed) setErrors[setIndex] = parsed.error
          else reps[setIndex] = parsed.value
        })
      if (setErrors.some(Boolean)) errors.sets = setErrors
      if (Object.keys(errors).length) exerciseErrors[index] = errors
      else {
        entries[index] = {
          variantId: item.variantId as string,
          notes: "value" in exerciseNotes ? exerciseNotes.value : null,
          reps,
        }
        ids.push(item.variantId as string)
      }
    })
  if (exerciseErrors.some(Boolean)) fieldErrors.exercises = exerciseErrors
  if (Object.keys(fieldErrors).length) return { error: fieldErrors }

  const found = ids.length
    ? await db.query.exerciseVariants.findMany({
        where: and(
          inArray(exerciseVariants.id, ids),
          eq(exerciseVariants.userId, userId),
          isNull(exerciseVariants.archivedAt)
        ),
        with: { category: true },
      })
    : []
  const variants = new Map(
    found
      .filter(
        (variant) =>
          variant.archivedAt === null && variant.category.archivedAt === null
      )
      .map((variant) => [variant.id, variant as Variant])
  )
  entries.forEach((entry, index) => {
    if (!variants.has(entry.variantId))
      exerciseErrors[index] = { variantId: "Variant was not found." }
  })
  if (exerciseErrors.some(Boolean))
    return { error: { exercises: exerciseErrors } }
  return {
    value: {
      workoutDate: input.workoutDate as string,
      name: "value" in name ? name.value : null,
      notes: "value" in notes ? notes.value : null,
      clientRequestId: "value" in requestId ? requestId.value : null,
      entries,
      variants,
    },
  }
}

function buildRows(
  userId: string,
  values: Awaited<ReturnType<typeof validateInput>> & {
    value: NonNullable<Awaited<ReturnType<typeof validateInput>>["value"]>
  },
  now: Date,
  id: string = crypto.randomUUID()
) {
  const workout = {
    id,
    userId,
    workoutDate: values.value.workoutDate,
    name: values.value.name,
    notes: values.value.notes,
    clientRequestId: values.value.clientRequestId,
    requestPayloadHash: values.value.clientRequestId
      ? JSON.stringify({
          workoutDate: values.value.workoutDate,
          name: values.value.name,
          notes: values.value.notes,
          exercises: values.value.entries,
        })
      : null,
    createdAt: now,
    updatedAt: now,
  }
  const exercises = values.value.entries.map((entry, position) => {
    const variant = values.value.variants.get(entry.variantId)!
    return {
      id: crypto.randomUUID(),
      workoutId: id,
      sourceVariantId: variant.id,
      position,
      categoryName: variant.category.name,
      variantName: variant.name,
      difficultyMultiplier: variant.difficultyMultiplier,
      notes: entry.notes,
      createdAt: now,
      updatedAt: now,
    }
  })
  const sets = exercises.flatMap((exercise, index) =>
    values.value.entries[index].reps.map((reps, position) => ({
      id: crypto.randomUUID(),
      workoutExerciseId: exercise.id,
      position,
      reps,
      createdAt: now,
      updatedAt: now,
    }))
  )
  return { workout, exercises, sets }
}

export async function getWorkout(
  db: WorkoutDatabase,
  userId: string,
  id: string
): Promise<WorkoutDetail | undefined> {
  return db.query.workouts.findFirst({
    where: and(eq(workouts.id, id), eq(workouts.userId, userId)),
    with: {
      exercises: {
        orderBy: [asc(workoutExercises.position)],
        with: { sets: { orderBy: [asc(workoutSets.position)] } },
      },
    },
  })
}

export async function getRepeatWorkout(
  db: WorkoutDatabase,
  userId: string,
  id: string
): Promise<
  | { ok: true; value: RepeatWorkoutDetail }
  | {
      ok: false
      error: "not_found" | "repeat_unavailable"
      unavailable?: RepeatUnavailableEntry[]
    }
> {
  const source = await getWorkout(db, userId, id)
  if (!source) return { ok: false, error: "not_found" }
  const sourceIds = source.exercises
    .map((exercise) => exercise.sourceVariantId)
    .filter((variantId): variantId is string => variantId !== null)
  const active = sourceIds.length
    ? await db.query.exerciseVariants.findMany({
        where: and(
          inArray(exerciseVariants.id, sourceIds),
          eq(exerciseVariants.userId, userId)
        ),
        with: { category: true },
      })
    : []
  const variants = new Map(
    active.map((variant) => [variant.id, variant as Variant])
  )
  const unavailable = source.exercises.flatMap((exercise) => {
    const variant = exercise.sourceVariantId
      ? variants.get(exercise.sourceVariantId)
      : undefined
    const reason: RepeatUnavailableEntry["reason"] | null = !variant
      ? "missing_variant"
      : variant.archivedAt !== null
        ? "archived_variant"
        : variant.category.archivedAt !== null
          ? "archived_category"
          : null
    return reason
      ? [
          {
            sourceExerciseId: exercise.id,
            sourceVariantId: exercise.sourceVariantId,
            categoryName: exercise.categoryName,
            variantName: exercise.variantName,
            reason,
          },
        ]
      : []
  })
  if (unavailable.length)
    return { ok: false, error: "repeat_unavailable", unavailable }
  return {
    ok: true,
    value: {
      ...source,
      exercises: source.exercises.map((exercise) => {
        const variant = variants.get(exercise.sourceVariantId!)!
        return {
          ...exercise,
          activeVariant: {
            id: variant.id,
            categoryId: variant.categoryId,
            name: variant.name,
            categoryName: variant.category.name,
          },
        }
      }),
    },
  }
}

export async function getPreviousPerformanceCues(
  db: WorkoutDatabase,
  userId: string,
  variantIds: string[],
  workoutDate: string
): Promise<PreviousPerformanceCue[] | undefined> {
  if (!validDate(workoutDate)) return undefined
  const uniqueIds = [...new Set(variantIds)]
  const variants = uniqueIds.length
    ? await db.query.exerciseVariants.findMany({
        where: and(
          inArray(exerciseVariants.id, uniqueIds),
          eq(exerciseVariants.userId, userId)
        ),
        with: { category: true },
      })
    : []
  if (
    variants.length !== uniqueIds.length ||
    variants.some(
      (variant) =>
        variant.archivedAt !== null || variant.category.archivedAt !== null
    )
  )
    return undefined

  const history = await db.query.workouts.findMany({
    where: and(
      eq(workouts.userId, userId),
      lte(workouts.workoutDate, workoutDate)
    ),
    orderBy: [
      desc(workouts.workoutDate),
      desc(workouts.createdAt),
      desc(workouts.id),
    ],
    with: {
      exercises: {
        orderBy: [asc(workoutExercises.position)],
        with: { sets: { orderBy: [asc(workoutSets.position)] } },
      },
    },
  })
  return variantIds.map((variantId) => {
    for (const workout of history) {
      const exercise = workout.exercises.find(
        (entry) => entry.sourceVariantId === variantId
      )
      if (exercise)
        return {
          variantId,
          cue: {
            workoutDate: workout.workoutDate,
            reps: exercise.sets.map((set) => set.reps),
          },
        }
    }
    return { variantId, cue: null }
  })
}

export async function createWorkout(
  db: WorkoutDatabase,
  userId: string,
  input: WorkoutInput,
  now = new Date()
): Promise<WorkoutMutationResult<WorkoutDetail>> {
  const validated = await validateInput(db, userId, input)
  if ("error" in validated)
    return { ok: false, error: "validation", fieldErrors: validated.error }
  const rows = buildRows(userId, validated, now)

  if (rows.workout.clientRequestId) {
    const existing = await db.query.workouts.findFirst({
      where: and(
        eq(workouts.userId, userId),
        eq(workouts.clientRequestId, rows.workout.clientRequestId)
      ),
    })
    if (existing) {
      return existing.requestPayloadHash === rows.workout.requestPayloadHash
        ? { ok: true, value: (await getWorkout(db, userId, existing.id))! }
        : { ok: false, error: "request_conflict" }
    }

    // The database unique index is the concurrency boundary. If another request
    // wins this insert, its row is read below; only the winning request writes
    // children, so retries never duplicate exercise or set rows.
    await db.insert(workouts).values(rows.workout).onConflictDoNothing()
    const persisted = await db.query.workouts.findFirst({
      where: and(
        eq(workouts.userId, userId),
        eq(workouts.clientRequestId, rows.workout.clientRequestId)
      ),
    })
    if (!persisted || persisted.id !== rows.workout.id)
      return persisted?.requestPayloadHash === rows.workout.requestPayloadHash
        ? { ok: true, value: (await getWorkout(db, userId, persisted.id))! }
        : { ok: false, error: "request_conflict" }
  } else {
    await db.insert(workouts).values(rows.workout)
  }

  await db.batch([
    db.insert(workoutExercises).values(rows.exercises),
    ...(rows.sets.length ? [db.insert(workoutSets).values(rows.sets)] : []),
  ])
  return {
    ok: true,
    value: {
      ...rows.workout,
      exercises: rows.exercises.map((exercise) => ({
        ...exercise,
        sets: rows.sets.filter((set) => set.workoutExerciseId === exercise.id),
      })),
    },
  }
}

export async function createWorkoutFromTemplate(
  db: WorkoutDatabase,
  userId: string,
  input: Omit<WorkoutInput, "exercises"> & {
    templateId: string
    exercises: unknown
  },
  now = new Date()
): Promise<WorkoutMutationResult<WorkoutDetail>> {
  // Eligibility is checked when the template is selected. From that point on,
  // the submitted editor state is an independent draft: the source template
  // may be edited or deleted without changing which performance data is saved.
  return createWorkout(db, userId, input, now)
}

export async function updateWorkout(
  db: WorkoutDatabase,
  userId: string,
  input: WorkoutInput & { id: string },
  now = new Date()
): Promise<WorkoutMutationResult<WorkoutDetail>> {
  const existing = await db.query.workouts.findFirst({
    where: and(eq(workouts.id, input.id), eq(workouts.userId, userId)),
  })
  if (!existing) return { ok: false, error: "not_found" }
  const validated = await validateInput(db, userId, input, false)
  if ("error" in validated)
    return { ok: false, error: "validation", fieldErrors: validated.error }
  const rows = buildRows(userId, validated, now, input.id)
  rows.workout.createdAt = existing.createdAt
  await db.batch([
    db
      .update(workouts)
      .set({
        workoutDate: rows.workout.workoutDate,
        name: rows.workout.name,
        notes: rows.workout.notes,
        updatedAt: now,
      })
      .where(and(eq(workouts.id, input.id), eq(workouts.userId, userId))),
    db.delete(workoutExercises).where(eq(workoutExercises.workoutId, input.id)),
    ...(rows.exercises.length
      ? [db.insert(workoutExercises).values(rows.exercises)]
      : []),
    ...(rows.sets.length ? [db.insert(workoutSets).values(rows.sets)] : []),
  ])
  return {
    ok: true,
    value: {
      ...rows.workout,
      exercises: rows.exercises.map((exercise) => ({
        ...exercise,
        sets: rows.sets.filter((set) => set.workoutExerciseId === exercise.id),
      })),
    },
  }
}

export async function deleteWorkout(
  db: WorkoutDatabase,
  userId: string,
  id: string
): Promise<WorkoutMutationResult<{ id: string }>> {
  const deleted = await db
    .delete(workouts)
    .where(and(eq(workouts.id, id), eq(workouts.userId, userId)))
    .returning({ id: workouts.id })
    .all()
  return deleted.length
    ? { ok: true, value: { id } }
    : { ok: false, error: "not_found" }
}

export async function listWorkouts(
  db: WorkoutDatabase,
  userId: string,
  filters: { from?: string; to?: string; limit?: number } = {}
) {
  const conditions = [eq(workouts.userId, userId)]
  if (filters.from) conditions.push(gte(workouts.workoutDate, filters.from))
  if (filters.to) conditions.push(lte(workouts.workoutDate, filters.to))
  const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100)
  return db.query.workouts.findMany({
    where: and(...conditions),
    orderBy: [desc(workouts.workoutDate), desc(workouts.createdAt)],
    with: { exercises: true },
    limit,
  })
}
