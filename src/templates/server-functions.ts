import { createServerFn } from "@tanstack/react-start"

import { requireCurrentSession } from "../auth/current-session"
import { db } from "../db/client"
import {
  createWorkoutTemplate as createWorkoutTemplateOp,
  deleteWorkoutTemplate as deleteWorkoutTemplateOp,
  getWorkoutTemplate,
  listWorkoutTemplates as listWorkoutTemplatesOp,
  listWorkoutTemplateSummaries as listWorkoutTemplateSummariesOp,
  updateWorkoutTemplate as updateWorkoutTemplateOp,
} from "./templates"

async function authenticatedUserId() {
  return (await requireCurrentSession()).userId
}

export const listWorkoutTemplates = createServerFn({ method: "GET" }).handler(
  async () => listWorkoutTemplatesOp(db, await authenticatedUserId())
)

export const listWorkoutTemplateSummaries = createServerFn({
  method: "GET",
}).handler(async () =>
  listWorkoutTemplateSummariesOp(db, await authenticatedUserId())
)

export const readWorkoutTemplate = createServerFn({ method: "GET" })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) =>
    getWorkoutTemplate(db, await authenticatedUserId(), data.id)
  )

export const createWorkoutTemplate = createServerFn({ method: "POST" })
  .validator((input: { name: unknown; exercises: unknown }) => input)
  .handler(async ({ data }) =>
    createWorkoutTemplateOp(db, await authenticatedUserId(), data)
  )

export const updateWorkoutTemplate = createServerFn({ method: "POST" })
  .validator(
    (input: { id: string; name: unknown; exercises: unknown }) => input
  )
  .handler(async ({ data }) =>
    updateWorkoutTemplateOp(db, await authenticatedUserId(), data)
  )

export const deleteWorkoutTemplate = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) =>
    deleteWorkoutTemplateOp(db, await authenticatedUserId(), data.id)
  )
