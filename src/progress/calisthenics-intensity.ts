import { and, asc, eq, gte, lte } from "drizzle-orm"
import type { DrizzleD1Database } from "drizzle-orm/d1"

import type * as schema from "../db/schema"
import { workouts } from "../db/schema"

export type IntensityDatabase = DrizzleD1Database<typeof schema>

export type CalisthenicsWorkoutIntensity = {
  id: string
  name: string | null
  workoutDate: string
  /** Relative score stored as integer thousandths to avoid rounding drift. */
  scoreMilli: number
  exercises: Array<{
    categoryName: string
    variantName: string
    scoreMilli: number
  }>
}

export type CalisthenicsIntensityDay = {
  workoutDate: string
  scoreMilli: number
  workouts: CalisthenicsWorkoutIntensity[]
}

export function aggregateCalisthenicsIntensity(
  rows: Array<{
    id: string
    name: string | null
    workoutDate: string
    exercises: Array<{
      categoryName: string
      variantName: string
      difficultyMultiplier: number
      sourceVariant?: {
        name: string
        difficultyMultiplier: number
        category: { name: string }
      } | null
      sets: Array<{ reps: number }>
    }>
  }>
): CalisthenicsIntensityDay[] {
  const days = new Map<string, CalisthenicsWorkoutIntensity[]>()

  for (const row of rows) {
    const exercises = row.exercises.map((exercise) => {
      const current = exercise.sourceVariant
      const multiplier =
        current?.difficultyMultiplier ?? exercise.difficultyMultiplier
      return {
        categoryName: current?.category.name ?? exercise.categoryName,
        variantName: current?.name ?? exercise.variantName,
        scoreMilli: exercise.sets.reduce(
          (total, set) => total + set.reps * multiplier,
          0
        ),
      }
    })
    const workout = {
      id: row.id,
      name: row.name,
      workoutDate: row.workoutDate,
      scoreMilli: exercises.reduce(
        (total, exercise) => total + exercise.scoreMilli,
        0
      ),
      exercises,
    }
    const dateWorkouts = days.get(row.workoutDate) ?? []
    dateWorkouts.push(workout)
    days.set(row.workoutDate, dateWorkouts)
  }

  return [...days.entries()].map(([workoutDate, dateWorkouts]) => ({
    workoutDate,
    scoreMilli: dateWorkouts.reduce(
      (total, workout) => total + workout.scoreMilli,
      0
    ),
    workouts: dateWorkouts,
  }))
}

export async function listCalisthenicsIntensity(
  db: IntensityDatabase,
  userId: string,
  range: { from: string; to: string }
): Promise<CalisthenicsIntensityDay[]> {
  const rows = await db.query.workouts.findMany({
    where: and(
      eq(workouts.userId, userId),
      gte(workouts.workoutDate, range.from),
      lte(workouts.workoutDate, range.to)
    ),
    orderBy: [asc(workouts.workoutDate), asc(workouts.createdAt)],
    with: {
      exercises: {
        with: {
          sets: true,
          sourceVariant: { with: { category: true } },
        },
      },
    },
  })
  return aggregateCalisthenicsIntensity(rows)
}

export function formatRelativeScore(scoreMilli: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }).format(
    scoreMilli / 1000
  )
}

function formatDate(year: number, monthIndex: number, day: number): string {
  return [
    year,
    String(monthIndex + 1).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-")
}

export function trailingTwelveMonthRange(today = new Date()) {
  const to = formatDate(today.getFullYear(), today.getMonth(), today.getDate())
  const fromYear = today.getFullYear() - 1
  const fromMonthIndex = today.getMonth()
  // The prior year's month can be shorter than this year's (e.g. Feb 29 rolls
  // forward into March), so clamp the day to the last valid day of that month.
  // Date.UTC(year, month + 1, 0) is the calendar date one day before
  // `month + 1` — the last day of `month` — computed deterministically in UTC.
  const lastDayOfFromMonth = new Date(
    Date.UTC(fromYear, fromMonthIndex + 1, 0)
  ).getUTCDate()
  const from = formatDate(
    fromYear,
    fromMonthIndex,
    Math.min(today.getDate(), lastDayOfFromMonth)
  )
  return { from, to }
}
