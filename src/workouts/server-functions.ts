import { createServerFn } from "@tanstack/react-start"

import { requireCurrentSession } from "../auth/current-session"
import { db } from "../db/client"
import {
  createWorkout as createWorkoutOp,
  createWorkoutFromTemplate as createWorkoutFromTemplateOp,
  deleteWorkout as deleteWorkoutOp,
  getWorkout,
  listWorkouts as listWorkoutsOp,
  updateWorkout as updateWorkoutOp
  
} from "./workouts"
import type {WorkoutInput} from "./workouts";

async function userId() {
  return (await requireCurrentSession()).userId
}

export const listWorkouts = createServerFn({ method: "GET" })
  .validator(
    (input: { from?: string; to?: string; limit?: number } = {}) => input
  )
  .handler(async ({ data }) => listWorkoutsOp(db, await userId(), data))

export const readWorkout = createServerFn({ method: "GET" })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) => getWorkout(db, await userId(), data.id))

export const createWorkout = createServerFn({ method: "POST" })
  .validator((input: WorkoutInput) => input)
  .handler(async ({ data }) => createWorkoutOp(db, await userId(), data))

export const createWorkoutFromTemplate = createServerFn({ method: "POST" })
  .validator(
    (
      input: Omit<WorkoutInput, "exercises"> & {
        templateId: string
        exercises: unknown
      }
    ) => input
  )
  .handler(async ({ data }) =>
    createWorkoutFromTemplateOp(db, await userId(), data)
  )

export const updateWorkout = createServerFn({ method: "POST" })
  .validator((input: WorkoutInput & { id: string }) => input)
  .handler(async ({ data }) => updateWorkoutOp(db, await userId(), data))

export const deleteWorkout = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) => deleteWorkoutOp(db, await userId(), data.id))
