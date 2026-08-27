import { and, asc, eq, isNotNull, isNull } from "drizzle-orm"
import type { DrizzleD1Database } from "drizzle-orm/d1"

import type * as schema from "../db/schema"
import { exerciseCategories, exerciseVariants } from "../db/schema"

export type ExerciseLibraryDatabase = DrizzleD1Database<typeof schema>

export type LibraryFieldErrors = Partial<
  Record<"name" | "difficultyMultiplier" | "categoryId", string>
>

export type LibraryMutationResult<T> =
  | { ok: true; value: T }
  | {
      ok: false
      error: "validation" | "not_found"
      fieldErrors?: LibraryFieldErrors
    }

const MAX_NAME_LENGTH = 100

function validateName(
  name: unknown
): { value: string } | { error: LibraryFieldErrors } {
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

/** Convert a form-facing multiplier (for example 1.25) to integer thousandths. */
export function parseDifficultyMultiplier(
  value: unknown
): { value: number } | { error: LibraryFieldErrors } {
  const text =
    typeof value === "number"
      ? String(value)
      : typeof value === "string"
        ? value.trim()
        : ""
  const match = /^(\d+)(?:\.(\d{1,3}))?$/.exec(text)
  if (!match) {
    return {
      error: {
        difficultyMultiplier:
          "Enter a positive multiplier with no more than three decimal places.",
      },
    }
  }
  const fraction = match[2] ? match[2].padEnd(3, "0") : "000"
  const thousandths = Number(match[1]) * 1000 + Number(fraction)

  if (!Number.isSafeInteger(thousandths) || thousandths <= 0) {
    return {
      error: {
        difficultyMultiplier:
          "Enter a positive multiplier with no more than three decimal places.",
      },
    }
  }
  return { value: thousandths }
}

export async function getActiveExerciseLibrary(
  db: ExerciseLibraryDatabase,
  userId: string
) {
  const categories = await db.query.exerciseCategories.findMany({
    where: and(
      eq(exerciseCategories.userId, userId),
      isNull(exerciseCategories.archivedAt)
    ),
    with: {
      variants: {
        where: and(
          eq(exerciseVariants.userId, userId),
          isNull(exerciseVariants.archivedAt)
        ),
        orderBy: [asc(exerciseVariants.name)],
      },
    },
    orderBy: [asc(exerciseCategories.name)],
  })

  return categories.filter((category) => category.variants.length > 0)
}

/** Includes archived rows so templates and historical references remain resolvable. */
export async function getExerciseManagementLibrary(
  db: ExerciseLibraryDatabase,
  userId: string
) {
  return db.query.exerciseCategories.findMany({
    where: eq(exerciseCategories.userId, userId),
    with: {
      variants: {
        where: eq(exerciseVariants.userId, userId),
        orderBy: [asc(exerciseVariants.name)],
      },
    },
    orderBy: [asc(exerciseCategories.name)],
  })
}

/** Resolve a variant for an existing reference, including archived records. */
export async function getExerciseVariantReference(
  db: ExerciseLibraryDatabase,
  userId: string,
  variantId: string
) {
  return db.query.exerciseVariants.findFirst({
    where: and(
      eq(exerciseVariants.id, variantId),
      eq(exerciseVariants.userId, userId)
    ),
    with: { category: true },
  })
}

export async function createExerciseCategory(
  db: ExerciseLibraryDatabase,
  userId: string,
  input: { name: unknown },
  now = new Date()
): Promise<LibraryMutationResult<typeof exerciseCategories.$inferSelect>> {
  const name = validateName(input.name)
  if ("error" in name)
    return { ok: false, error: "validation", fieldErrors: name.error }

  const value = {
    id: crypto.randomUUID(),
    userId,
    name: name.value,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
  }
  await db.insert(exerciseCategories).values(value)
  return { ok: true, value }
}

export async function renameExerciseCategory(
  db: ExerciseLibraryDatabase,
  userId: string,
  input: { id: string; name: unknown },
  now = new Date()
): Promise<LibraryMutationResult<typeof exerciseCategories.$inferSelect>> {
  const name = validateName(input.name)
  if ("error" in name)
    return { ok: false, error: "validation", fieldErrors: name.error }

  const values = await db
    .update(exerciseCategories)
    .set({ name: name.value, updatedAt: now })
    .where(
      and(
        eq(exerciseCategories.id, input.id),
        eq(exerciseCategories.userId, userId),
        isNull(exerciseCategories.archivedAt)
      )
    )
    .returning()
    .all()
  if (values.length === 0) return { ok: false, error: "not_found" }
  return { ok: true, value: values[0] }
}

export async function archiveExerciseCategory(
  db: ExerciseLibraryDatabase,
  userId: string,
  id: string,
  now = new Date()
): Promise<LibraryMutationResult<typeof exerciseCategories.$inferSelect>> {
  const values = await db
    .update(exerciseCategories)
    .set({ archivedAt: now, updatedAt: now })
    .where(
      and(
        eq(exerciseCategories.id, id),
        eq(exerciseCategories.userId, userId),
        isNull(exerciseCategories.archivedAt)
      )
    )
    .returning()
    .all()
  if (values.length === 0) return { ok: false, error: "not_found" }
  return { ok: true, value: values[0] }
}

/**
 * Restore only an archived category owned by the current user. Variant archive
 * timestamps are deliberately untouched: a category archive never implies an
 * individual variant archive.
 */
export async function restoreExerciseCategory(
  db: ExerciseLibraryDatabase,
  userId: string,
  id: string,
  now = new Date()
): Promise<LibraryMutationResult<typeof exerciseCategories.$inferSelect>> {
  const values = await db
    .update(exerciseCategories)
    .set({ archivedAt: null, updatedAt: now })
    .where(
      and(
        eq(exerciseCategories.id, id),
        eq(exerciseCategories.userId, userId),
        isNotNull(exerciseCategories.archivedAt)
      )
    )
    .returning()
    .all()
  if (values.length === 0) return { ok: false, error: "not_found" }
  return { ok: true, value: values[0] }
}

async function findActiveOwnedCategory(
  db: ExerciseLibraryDatabase,
  userId: string,
  categoryId: string
) {
  return db.query.exerciseCategories.findFirst({
    where: and(
      eq(exerciseCategories.id, categoryId),
      eq(exerciseCategories.userId, userId),
      isNull(exerciseCategories.archivedAt)
    ),
    columns: { id: true },
  })
}

export async function createExerciseVariant(
  db: ExerciseLibraryDatabase,
  userId: string,
  input: { categoryId: string; name: unknown; difficultyMultiplier: unknown },
  now = new Date()
): Promise<LibraryMutationResult<typeof exerciseVariants.$inferSelect>> {
  const name = validateName(input.name)
  const multiplier = parseDifficultyMultiplier(input.difficultyMultiplier)
  if ("error" in name || "error" in multiplier) {
    return {
      ok: false,
      error: "validation",
      fieldErrors: {
        ...("error" in name ? name.error : {}),
        ...("error" in multiplier ? multiplier.error : {}),
      },
    }
  }

  if (!(await findActiveOwnedCategory(db, userId, input.categoryId))) {
    return {
      ok: false,
      error: "not_found",
      fieldErrors: { categoryId: "Category was not found." },
    }
  }

  const value = {
    id: crypto.randomUUID(),
    userId,
    categoryId: input.categoryId,
    name: name.value,
    difficultyMultiplier: multiplier.value,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
  }
  await db.insert(exerciseVariants).values(value)
  return { ok: true, value }
}

export async function editExerciseVariant(
  db: ExerciseLibraryDatabase,
  userId: string,
  input: { id: string; name: unknown; difficultyMultiplier: unknown },
  now = new Date()
): Promise<LibraryMutationResult<typeof exerciseVariants.$inferSelect>> {
  const name = validateName(input.name)
  const multiplier = parseDifficultyMultiplier(input.difficultyMultiplier)
  if ("error" in name || "error" in multiplier) {
    return {
      ok: false,
      error: "validation",
      fieldErrors: {
        ...("error" in name ? name.error : {}),
        ...("error" in multiplier ? multiplier.error : {}),
      },
    }
  }

  const values = await db
    .update(exerciseVariants)
    .set({
      name: name.value,
      difficultyMultiplier: multiplier.value,
      updatedAt: now,
    })
    .where(
      and(
        eq(exerciseVariants.id, input.id),
        eq(exerciseVariants.userId, userId),
        isNull(exerciseVariants.archivedAt)
      )
    )
    .returning()
    .all()
  if (values.length === 0) return { ok: false, error: "not_found" }
  return { ok: true, value: values[0] }
}

export async function archiveExerciseVariant(
  db: ExerciseLibraryDatabase,
  userId: string,
  id: string,
  now = new Date()
): Promise<LibraryMutationResult<typeof exerciseVariants.$inferSelect>> {
  const values = await db
    .update(exerciseVariants)
    .set({ archivedAt: now, updatedAt: now })
    .where(
      and(
        eq(exerciseVariants.id, id),
        eq(exerciseVariants.userId, userId),
        isNull(exerciseVariants.archivedAt)
      )
    )
    .returning()
    .all()
  if (values.length === 0) return { ok: false, error: "not_found" }
  return { ok: true, value: values[0] }
}

/** Restore only an individually archived variant owned by the current user. */
export async function restoreExerciseVariant(
  db: ExerciseLibraryDatabase,
  userId: string,
  id: string,
  now = new Date()
): Promise<LibraryMutationResult<typeof exerciseVariants.$inferSelect>> {
  const values = await db
    .update(exerciseVariants)
    .set({ archivedAt: null, updatedAt: now })
    .where(
      and(
        eq(exerciseVariants.id, id),
        eq(exerciseVariants.userId, userId),
        isNotNull(exerciseVariants.archivedAt)
      )
    )
    .returning()
    .all()
  if (values.length === 0) return { ok: false, error: "not_found" }
  return { ok: true, value: values[0] }
}
