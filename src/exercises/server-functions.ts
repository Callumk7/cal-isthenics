import { createServerFn } from "@tanstack/react-start"

import { requireCurrentSession } from "../auth/current-session"
import { db } from "../db/client"
import {
  archiveExerciseCategory,
  archiveExerciseVariant,
  createExerciseCategory,
  createExerciseVariant,
  editExerciseVariant,
  getActiveExerciseLibrary,
  getExerciseManagementLibrary,
  getExerciseVariantReference,
  renameExerciseCategory,
} from "./library"

async function authenticatedUserId() {
  return (await requireCurrentSession()).userId
}

export const listActiveExercises = createServerFn({ method: "GET" }).handler(
  async () => getActiveExerciseLibrary(db, await authenticatedUserId())
)

export const listManagedExercises = createServerFn({ method: "GET" }).handler(
  async () => getExerciseManagementLibrary(db, await authenticatedUserId())
)

export const readExerciseVariantReference = createServerFn({ method: "GET" })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) =>
    getExerciseVariantReference(db, await authenticatedUserId(), data.id)
  )

export const addExerciseCategory = createServerFn({ method: "POST" })
  .validator((input: { name: unknown }) => input)
  .handler(async ({ data }) =>
    createExerciseCategory(db, await authenticatedUserId(), data)
  )

export const updateExerciseCategory = createServerFn({ method: "POST" })
  .validator((input: { id: string; name: unknown }) => input)
  .handler(async ({ data }) =>
    renameExerciseCategory(db, await authenticatedUserId(), data)
  )

export const removeExerciseCategory = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) =>
    archiveExerciseCategory(db, await authenticatedUserId(), data.id)
  )

export const addExerciseVariant = createServerFn({ method: "POST" })
  .validator(
    (input: {
      categoryId: string
      name: unknown
      difficultyMultiplier: unknown
    }) => input
  )
  .handler(async ({ data }) =>
    createExerciseVariant(db, await authenticatedUserId(), data)
  )

export const updateExerciseVariant = createServerFn({ method: "POST" })
  .validator(
    (input: { id: string; name: unknown; difficultyMultiplier: unknown }) =>
      input
  )
  .handler(async ({ data }) =>
    editExerciseVariant(db, await authenticatedUserId(), data)
  )

export const removeExerciseVariant = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) =>
    archiveExerciseVariant(db, await authenticatedUserId(), data.id)
  )
