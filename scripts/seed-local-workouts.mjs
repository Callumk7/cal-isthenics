import { spawnSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

if (process.argv.length > 2) {
  console.error("Usage: pnpm db:seed")
  process.exit(1)
}

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm"
const database = "cal-isthenics-db"
const seedPrefix = "local-seed"

function runWrangler(arguments_, options = {}) {
  return spawnSync(
    pnpm,
    ["exec", "wrangler", "d1", "execute", database, "--local", ...arguments_],
    { cwd: projectRoot, encoding: "utf8", ...options }
  )
}

// Fail before generating data when local setup has not been completed. There is
// deliberately no remote option: this script must never write production data.
const ownerQuery = runWrangler([
  "--json",
  "--command",
  "SELECT id FROM users WHERE id = 'owner' LIMIT 1;",
])
if (ownerQuery.error) throw ownerQuery.error
if (ownerQuery.status !== 0) {
  process.stderr.write(ownerQuery.stderr)
  console.error("Apply local migrations first with: pnpm db:migrate")
  process.exit(ownerQuery.status ?? 1)
}

let ownerExists = false
try {
  const result = JSON.parse(ownerQuery.stdout)
  ownerExists = result.some((query) =>
    query.results?.some((row) => row.id === "owner")
  )
} catch {
  process.stderr.write(ownerQuery.stdout)
  console.error("Could not read the local D1 response.")
  process.exit(1)
}
if (!ownerExists) {
  console.error(
    "The local owner account does not exist. Provision it first with: pnpm auth:provision"
  )
  process.exit(1)
}

const categories = [
  { id: `${seedPrefix}-category-push`, name: "Push-up" },
  { id: `${seedPrefix}-category-pull`, name: "Pull-up" },
  { id: `${seedPrefix}-category-dip`, name: "Dip" },
  { id: `${seedPrefix}-category-row`, name: "Row" },
  { id: `${seedPrefix}-category-squat`, name: "Squat" },
  { id: `${seedPrefix}-category-core`, name: "Core" },
]
const variants = [
  {
    id: `${seedPrefix}-variant-push-standard`,
    categoryId: `${seedPrefix}-category-push`,
    name: "Standard push-up",
    multiplier: 1000,
  },
  {
    id: `${seedPrefix}-variant-push-decline`,
    categoryId: `${seedPrefix}-category-push`,
    name: "Decline push-up",
    multiplier: 1250,
  },
  {
    id: `${seedPrefix}-variant-pull-standard`,
    categoryId: `${seedPrefix}-category-pull`,
    name: "Pull-up",
    multiplier: 1300,
  },
  {
    id: `${seedPrefix}-variant-dip-parallel`,
    categoryId: `${seedPrefix}-category-dip`,
    name: "Parallel bar dip",
    multiplier: 1200,
  },
  {
    id: `${seedPrefix}-variant-row-inverted`,
    categoryId: `${seedPrefix}-category-row`,
    name: "Inverted row",
    multiplier: 850,
  },
  {
    id: `${seedPrefix}-variant-squat-standard`,
    categoryId: `${seedPrefix}-category-squat`,
    name: "Bodyweight squat",
    multiplier: 1000,
  },
  {
    id: `${seedPrefix}-variant-squat-split`,
    categoryId: `${seedPrefix}-category-squat`,
    name: "Bulgarian split squat",
    multiplier: 1350,
  },
  {
    id: `${seedPrefix}-variant-core-knee-raise`,
    categoryId: `${seedPrefix}-category-core`,
    name: "Hanging knee raise",
    multiplier: 900,
  },
]
const variantById = new Map(variants.map((variant) => [variant.id, variant]))
const categoryById = new Map(
  categories.map((category) => [category.id, category])
)

const plans = [
  {
    key: "push",
    name: "Push day",
    notes: "Dummy local seed data · push session",
    exercises: [
      [`${seedPrefix}-variant-push-standard`, 12],
      [`${seedPrefix}-variant-push-decline`, 7],
      [`${seedPrefix}-variant-dip-parallel`, 8],
    ],
  },
  {
    key: "pull",
    name: "Pull day",
    notes: "Dummy local seed data · pull session",
    exercises: [
      [`${seedPrefix}-variant-pull-standard`, 5],
      [`${seedPrefix}-variant-row-inverted`, 10],
      [`${seedPrefix}-variant-core-knee-raise`, 8],
    ],
  },
  {
    key: "legs",
    name: "Leg day",
    notes: "Dummy local seed data · leg session",
    exercises: [
      [`${seedPrefix}-variant-squat-standard`, 16],
      [`${seedPrefix}-variant-squat-split`, 8],
      [`${seedPrefix}-variant-core-knee-raise`, 10],
    ],
  },
]

const seedToday = new Date()
function calendarDaysAgo(days) {
  const date = new Date(
    Date.UTC(
      seedToday.getFullYear(),
      seedToday.getMonth(),
      seedToday.getDate(),
      12
    )
  )
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString().slice(0, 10)
}

const workouts = []
const runningWorkouts = []
for (let weekAgo = 15; weekAgo >= 0; weekAgo--) {
  const progress = 15 - weekAgo
  plans.forEach((plan, planIndex) => {
    const workoutId = `${seedPrefix}-workout-${String(progress).padStart(2, "0")}-${plan.key}`
    const workoutDate = calendarDaysAgo(weekAgo * 7 + (5 - planIndex * 2))
    const timestamp = Date.parse(`${workoutDate}T12:00:00.000Z`) + planIndex
    workouts.push({
      id: workoutId,
      workoutDate,
      name: plan.name,
      notes: plan.notes,
      timestamp,
      exercises: plan.exercises.map(([variantId, startingReps], position) => {
        const reps = startingReps + Math.floor(progress / 4)
        return {
          id: `${workoutId}-exercise-${position}`,
          variantId,
          position,
          reps: [reps, Math.max(1, reps - 1), Math.max(1, reps - 2)],
        }
      }),
    })
  })

  const workoutDate = calendarDaysAgo(weekAgo * 7)
  const distanceMetres = 3000 + Math.floor(progress / 4) * 1000
  const secondsPerKilometre = 390 - progress * 4
  runningWorkouts.push({
    id: `${seedPrefix}-run-${String(progress).padStart(2, "0")}`,
    workoutDate,
    distanceMetres,
    durationSeconds: Math.round((distanceMetres / 1000) * secondsPerKilometre),
    calories: Math.round((distanceMetres / 1000) * 65),
    manualSpeedMilliKmH:
      progress % 5 === 0
        ? Math.round((3_600_000 / secondsPerKilometre) * 1.02)
        : null,
    timestamp: Date.parse(`${workoutDate}T09:00:00.000Z`),
  })
}

function sqlValue(value) {
  if (value === null) return "NULL"
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value))
      throw new Error(`Unsafe SQL number: ${value}`)
    return String(value)
  }
  return `'${String(value).replaceAll("'", "''")}'`
}

function values(items) {
  return `(${items.map(sqlValue).join(", ")})`
}

const now = Date.now()
const statements = [
  "-- Generated by scripts/seed-local-workouts.mjs. Local D1 only.",
  `DELETE FROM workout_sets WHERE workout_exercise_id IN (SELECT id FROM workout_exercises WHERE workout_id LIKE ${sqlValue(`${seedPrefix}-workout-%`)});`,
  `DELETE FROM workout_exercises WHERE workout_id LIKE ${sqlValue(`${seedPrefix}-workout-%`)};`,
  `DELETE FROM workouts WHERE id LIKE ${sqlValue(`${seedPrefix}-workout-%`)};`,
  `DELETE FROM running_workouts WHERE id LIKE ${sqlValue(`${seedPrefix}-run-%`)};`,
]

for (const category of categories) {
  statements.push(
    `INSERT INTO exercise_categories (id, user_id, name, archived_at, created_at, updated_at) VALUES ${values([category.id, "owner", category.name, null, now, now])} ON CONFLICT(id) DO UPDATE SET user_id = excluded.user_id, name = excluded.name, archived_at = NULL, updated_at = excluded.updated_at;`
  )
}
for (const variant of variants) {
  statements.push(
    `INSERT INTO exercise_variants (id, user_id, category_id, name, difficulty_multiplier, archived_at, created_at, updated_at) VALUES ${values([variant.id, "owner", variant.categoryId, variant.name, variant.multiplier, null, now, now])} ON CONFLICT(id) DO UPDATE SET user_id = excluded.user_id, category_id = excluded.category_id, name = excluded.name, difficulty_multiplier = excluded.difficulty_multiplier, archived_at = NULL, updated_at = excluded.updated_at;`
  )
}
for (const workout of workouts) {
  statements.push(
    `INSERT INTO workouts (id, user_id, workout_date, name, notes, created_at, updated_at) VALUES ${values([workout.id, "owner", workout.workoutDate, workout.name, workout.notes, workout.timestamp, workout.timestamp])};`
  )
  for (const exercise of workout.exercises) {
    const variant = variantById.get(exercise.variantId)
    const category = categoryById.get(variant.categoryId)
    statements.push(
      `INSERT INTO workout_exercises (id, workout_id, source_variant_id, position, category_name, variant_name, difficulty_multiplier, notes, created_at, updated_at) VALUES ${values([exercise.id, workout.id, variant.id, exercise.position, category.name, variant.name, variant.multiplier, null, workout.timestamp, workout.timestamp])};`
    )
    exercise.reps.forEach((reps, position) => {
      statements.push(
        `INSERT INTO workout_sets (id, workout_exercise_id, position, reps, created_at, updated_at) VALUES ${values([`${exercise.id}-set-${position}`, exercise.id, position, reps, workout.timestamp, workout.timestamp])};`
      )
    })
  }
}
for (const run of runningWorkouts) {
  statements.push(
    `INSERT INTO running_workouts (id, user_id, workout_date, distance_metres, duration_seconds, calories, manual_speed_milli_kmh, created_at, updated_at) VALUES ${values([run.id, "owner", run.workoutDate, run.distanceMetres, run.durationSeconds, run.calories, run.manualSpeedMilliKmH, run.timestamp, run.timestamp])};`
  )
}

const temporaryDirectory = mkdtempSync(join(tmpdir(), "form-local-seed-"))
const sqlFile = join(temporaryDirectory, "seed.sql")
let executionStatus = 0
try {
  writeFileSync(sqlFile, `${statements.join("\n")}\n`)
  const result = runWrangler(["--yes", "--file", sqlFile])
  if (result.error) throw result.error
  if (result.status !== 0) {
    process.stdout.write(result.stdout)
    process.stderr.write(result.stderr)
    executionStatus = result.status ?? 1
  }
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true })
}
if (executionStatus !== 0) process.exit(executionStatus)

console.log(
  `Seeded local D1 with ${workouts.length} calisthenics workouts and ${runningWorkouts.length} runs.`
)
console.log(
  "Run this command again to replace only the generated seed records."
)
