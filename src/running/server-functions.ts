import { createServerFn } from "@tanstack/react-start"

import { requireCurrentSession } from "../auth/current-session"
import { db } from "../db/client"
import {
  createRunningWorkout as createRunningWorkoutOp,
  deleteRunningWorkout as deleteRunningWorkoutOp,
  getRunningWorkout,
  listRunningWorkouts as listRunningWorkoutsOp,
  updateRunningWorkout as updateRunningWorkoutOp,
} from "./running-workouts"
import type { RunningWorkoutInput } from "./running-workouts"

async function userId() {
  return (await requireCurrentSession()).userId
}

export const listRunningWorkouts = createServerFn({ method: "GET" })
  .validator(
    (input: { from?: string; to?: string; limit?: number } = {}) => input
  )
  .handler(async ({ data }) => listRunningWorkoutsOp(db, await userId(), data))

export const readRunningWorkout = createServerFn({ method: "GET" })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) => getRunningWorkout(db, await userId(), data.id))

export const createRunningWorkout = createServerFn({ method: "POST" })
  .validator((input: RunningWorkoutInput) => input)
  .handler(async ({ data }) => createRunningWorkoutOp(db, await userId(), data))

export const updateRunningWorkout = createServerFn({ method: "POST" })
  .validator((input: RunningWorkoutInput & { id: string }) => input)
  .handler(async ({ data }) => updateRunningWorkoutOp(db, await userId(), data))

export const deleteRunningWorkout = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) =>
    deleteRunningWorkoutOp(db, await userId(), data.id)
  )
