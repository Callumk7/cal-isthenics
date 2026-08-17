import { and, asc, eq, inArray } from "drizzle-orm"
import type { DrizzleD1Database } from "drizzle-orm/d1"

import type * as schema from "../db/schema"
import {
  exerciseVariants,
  workoutTemplateExercises,
  workoutTemplates,
} from "../db/schema"

export type TemplateDatabase = DrizzleD1Database<typeof schema>

export type TemplateFieldErrors = Partial<{
  name: string
  exercises: Array<string | undefined>
}>

export type TemplateMutationResult<T> =
  | { ok: true; value: T }
  | {
      ok: false
      error: "validation" | "not_found"
      fieldErrors?: TemplateFieldErrors
    }

export type WorkoutTemplateDetail = typeof workoutTemplates.$inferSelect & {
  exercises: Array<{
    id: string
    position: number
    setCount: number
    variantId: string
    variantName: string
    difficultyMultiplier: number
    variantArchived: boolean
    categoryId: string
    categoryName: string
    categoryArchived: boolean
    archived: boolean
  }>
  canStart: boolean
}

const MAX_NAME_LENGTH = 100
const SET_COUNT_ERROR = "Enter a positive whole number of sets."

function validateName(
  name: unknown
): { value: string } | { error: TemplateFieldErrors } {
  if (typeof name !== "string" || name.trim().length === 0) {
    return { error: { name: "Enter a name." } }
  }
  const value = name.trim()
  if (value.length > MAX_NAME_LENGTH) {
    return {
      error: { name: `Name must be ${MAX_NAME_LENGTH} characters or fewer.` },
    }
  }
  return { value }
}

export function parseSetCount(
  value: unknown
): { value: number } | { error: string } {
  const text =
    typeof value === "number"
      ? String(value)
      : typeof value === "string"
        ? value.trim()
        : ""
  if (!/^\d+$/.test(text)) return { error: SET_COUNT_ERROR }

  const parsed = Number(text)
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return { error: SET_COUNT_ERROR }
  }
  return { value: parsed }
}

export async function listWorkoutTemplates(
  db: TemplateDatabase,
  userId: string
) {
  return db.query.workoutTemplates.findMany({
    where: eq(workoutTemplates.userId, userId),
    orderBy: [asc(workoutTemplates.name)],
  })
}

function toDetail(
  template: typeof workoutTemplates.$inferSelect,
  exercises: Array<{
    id: string
    position: number
    setCount: number
    variantId: string
    variant: typeof exerciseVariants.$inferSelect & {
      category: typeof schema.exerciseCategories.$inferSelect
    }
  }>
): WorkoutTemplateDetail {
  const detailExercises = exercises.map((exercise) => {
    const variantArchived = exercise.variant.archivedAt !== null
    const categoryArchived = exercise.variant.category.archivedAt !== null
    const archived = variantArchived || categoryArchived

    return {
      id: exercise.id,
      position: exercise.position,
      setCount: exercise.setCount,
      variantId: exercise.variantId,
      variantName: exercise.variant.name,
      difficultyMultiplier: exercise.variant.difficultyMultiplier,
      variantArchived,
      categoryId: exercise.variant.categoryId,
      categoryName: exercise.variant.category.name,
      categoryArchived,
      archived,
    }
  })

  return {
    ...template,
    exercises: detailExercises,
    canStart:
      detailExercises.length > 0 && detailExercises.every((e) => !e.archived),
  }
}

export async function getWorkoutTemplate(
  db: TemplateDatabase,
  userId: string,
  id: string
): Promise<WorkoutTemplateDetail | undefined> {
  const template = await db.query.workoutTemplates.findFirst({
    where: and(
      eq(workoutTemplates.id, id),
      eq(workoutTemplates.userId, userId)
    ),
    with: {
      exercises: {
        orderBy: [asc(workoutTemplateExercises.position)],
        with: { variant: { with: { category: true } } },
      },
    },
  })
  if (!template) return undefined

  return toDetail(template, template.exercises)
}

type TemplateExerciseInput = { variantId: string; setCount: unknown }

type ResolvedVariant = typeof exerciseVariants.$inferSelect & {
  category: typeof schema.exerciseCategories.$inferSelect
}

async function validateExercises(
  db: TemplateDatabase,
  userId: string,
  exercises: unknown,
  existingVariantIds?: ReadonlySet<string>
): Promise<
  | {
      value: Array<TemplateExerciseInput & { setCount: number }>
      variants: Map<string, ResolvedVariant>
    }
  | { error: TemplateFieldErrors }
> {
  if (!Array.isArray(exercises)) {
    return { error: { exercises: ["Enter a valid exercise."] } }
  }

  const fieldErrors: Array<string | undefined> = []
  const entries: Array<TemplateExerciseInput & { setCount: number }> = []
  const ids: string[] = []

  exercises.forEach((entry, index) => {
    if (typeof entry !== "object" || entry === null) {
      fieldErrors[index] = "Variant was not found."
      return
    }
    const candidate = entry as { variantId?: unknown; setCount?: unknown }
    const setCount = parseSetCount(candidate.setCount)
    if ("error" in setCount) {
      fieldErrors[index] = setCount.error
      return
    }
    if (typeof candidate.variantId !== "string") {
      fieldErrors[index] = "Variant was not found."
      return
    }
    entries[index] = {
      variantId: candidate.variantId,
      setCount: setCount.value,
    }
    ids.push(candidate.variantId)
  })

  if (fieldErrors.some(Boolean)) return { error: { exercises: fieldErrors } }

  const variants = await db.query.exerciseVariants.findMany({
    where: and(
      inArray(exerciseVariants.id, ids),
      eq(exerciseVariants.userId, userId)
    ),
    with: { category: true },
  })
  const variantsById = new Map(
    variants.map((variant) => [variant.id, variant as ResolvedVariant])
  )

  entries.forEach((entry, index) => {
    const variant = variantsById.get(entry.variantId)
    if (!variant) {
      fieldErrors[index] = "Variant was not found."
    } else if (
      variant.archivedAt !== null &&
      !existingVariantIds?.has(entry.variantId)
    ) {
      fieldErrors[index] = "Archived variants can't be added to a template."
    } else if (
      variant.category.archivedAt !== null &&
      !existingVariantIds?.has(entry.variantId)
    ) {
      fieldErrors[index] = "This variant's category is archived."
    }
  })

  if (fieldErrors.some(Boolean)) return { error: { exercises: fieldErrors } }
  return { value: entries, variants: variantsById }
}

function detailFromValues(
  template: typeof workoutTemplates.$inferSelect,
  exercises: Array<typeof workoutTemplateExercises.$inferSelect>,
  variants: Map<string, ResolvedVariant>
): WorkoutTemplateDetail {
  return toDetail(
    template,
    exercises.map((exercise) => ({
      ...exercise,
      variant: variants.get(exercise.variantId)!,
    }))
  )
}

export async function createWorkoutTemplate(
  db: TemplateDatabase,
  userId: string,
  input: { name: unknown; exercises: unknown },
  now = new Date()
): Promise<TemplateMutationResult<WorkoutTemplateDetail>> {
  const name = validateName(input.name)
  if ("error" in name) {
    return { ok: false, error: "validation", fieldErrors: name.error }
  }
  const exercises = await validateExercises(db, userId, input.exercises)
  if ("error" in exercises) {
    return { ok: false, error: "validation", fieldErrors: exercises.error }
  }

  const template = {
    id: crypto.randomUUID(),
    userId,
    name: name.value,
    createdAt: now,
    updatedAt: now,
  }
  const templateExercises = exercises.value.map((exercise, position) => ({
    id: crypto.randomUUID(),
    templateId: template.id,
    variantId: exercise.variantId,
    position,
    setCount: exercise.setCount,
    createdAt: now,
    updatedAt: now,
  }))
  await db.batch([
    db.insert(workoutTemplates).values(template),
    db.insert(workoutTemplateExercises).values(templateExercises),
  ])

  return {
    ok: true,
    value: detailFromValues(template, templateExercises, exercises.variants),
  }
}

export async function updateWorkoutTemplate(
  db: TemplateDatabase,
  userId: string,
  input: { id: string; name: unknown; exercises: unknown },
  now = new Date()
): Promise<TemplateMutationResult<WorkoutTemplateDetail>> {
  const ownedTemplate = await db.query.workoutTemplates.findFirst({
    where: and(
      eq(workoutTemplates.id, input.id),
      eq(workoutTemplates.userId, userId)
    ),
  })
  if (!ownedTemplate) return { ok: false, error: "not_found" }

  const name = validateName(input.name)
  if ("error" in name) {
    return { ok: false, error: "validation", fieldErrors: name.error }
  }
  const existingExercises = await db.query.workoutTemplateExercises.findMany({
    where: eq(workoutTemplateExercises.templateId, input.id),
    columns: { variantId: true },
  })
  const existingVariantIds = new Set(
    existingExercises.map((exercise) => exercise.variantId)
  )
  const exercises = await validateExercises(
    db,
    userId,
    input.exercises,
    existingVariantIds
  )
  if ("error" in exercises) {
    return { ok: false, error: "validation", fieldErrors: exercises.error }
  }

  const template = {
    ...ownedTemplate,
    name: name.value,
    updatedAt: now,
  }
  const templateExercises = exercises.value.map((exercise, position) => ({
    id: crypto.randomUUID(),
    templateId: input.id,
    variantId: exercise.variantId,
    position,
    setCount: exercise.setCount,
    createdAt: now,
    updatedAt: now,
  }))
  await db.batch([
    db
      .update(workoutTemplates)
      .set({ name: name.value, updatedAt: now })
      .where(
        and(
          eq(workoutTemplates.id, input.id),
          eq(workoutTemplates.userId, userId)
        )
      ),
    db
      .delete(workoutTemplateExercises)
      .where(eq(workoutTemplateExercises.templateId, input.id)),
    db.insert(workoutTemplateExercises).values(templateExercises),
  ])

  return {
    ok: true,
    value: detailFromValues(template, templateExercises, exercises.variants),
  }
}

export async function deleteWorkoutTemplate(
  db: TemplateDatabase,
  userId: string,
  id: string
): Promise<TemplateMutationResult<{ id: string }>> {
  const values = await db
    .delete(workoutTemplates)
    .where(
      and(eq(workoutTemplates.id, id), eq(workoutTemplates.userId, userId))
    )
    .returning()
    .all()
  if (values.length === 0) return { ok: false, error: "not_found" }
  return { ok: true, value: { id } }
}
