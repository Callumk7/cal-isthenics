import { readFileSync } from "node:fs"

import { getTableColumns, getTableName } from "drizzle-orm"
import { describe, expect, it } from "vitest"

import {
  exerciseCategories,
  exerciseVariants,
  workoutExercises,
  workouts,
  workoutSets,
  workoutTemplateExercises,
  workoutTemplates,
} from "../schema"

const migration = readFileSync(
  new URL("drizzle/0002_quiet_shocker.sql", `file://${process.cwd()}/`),
  "utf8"
)

describe("training schema", () => {
  it("exports every domain table and its history snapshots", () => {
    expect(
      [
        exerciseCategories,
        exerciseVariants,
        workoutTemplates,
        workoutTemplateExercises,
        workouts,
        workoutExercises,
        workoutSets,
      ].map(getTableName)
    ).toEqual([
      "exercise_categories",
      "exercise_variants",
      "workout_templates",
      "workout_template_exercises",
      "workouts",
      "workout_exercises",
      "workout_sets",
    ])

    expect(Object.keys(getTableColumns(workoutExercises))).toEqual(
      expect.arrayContaining([
        "sourceVariantId",
        "categoryName",
        "variantName",
        "difficultyMultiplier",
        "position",
      ])
    )
  })

  it("persists stable exercise and set ordering", () => {
    expect(migration).toContain(
      "CREATE UNIQUE INDEX `workout_template_exercises_order_idx` ON `workout_template_exercises` (`template_id`,`position`)"
    )
    expect(migration).toContain(
      "CREATE UNIQUE INDEX `workout_exercises_order_idx` ON `workout_exercises` (`workout_id`,`position`)"
    )
    expect(migration).toContain(
      "CREATE UNIQUE INDEX `workout_sets_order_idx` ON `workout_sets` (`workout_exercise_id`,`position`)"
    )
  })

  it("allows repeated variants and multiple workouts on one date", () => {
    expect(migration).not.toMatch(
      /UNIQUE INDEX[^\n]+workout_template_exercises[^\n]+variant_id/
    )
    expect(migration).not.toMatch(
      /UNIQUE INDEX[^\n]+workout_exercises[^\n]+source_variant_id/
    )
    expect(migration).not.toMatch(
      /UNIQUE INDEX[^\n]+workouts[^\n]+workout_date/
    )
    expect(migration).toContain(
      "CREATE INDEX `workouts_user_date_idx` ON `workouts` (`user_id`,`workout_date`)"
    )
  })

  it("constrains counts, reps, multipliers, positions, and calendar dates", () => {
    expect(migration).toMatch(/CHECK\([^)]*"set_count" > 0\)/)
    expect(migration).toMatch(/CHECK\([^)]*"reps" > 0\)/)
    expect(
      migration.match(/CHECK\([^)]*"difficulty_multiplier" > 0\)/g)
    ).toHaveLength(2)
    expect(migration.match(/CHECK\([^)]*"position" >= 0\)/g)).toHaveLength(3)
    expect(migration).toContain(
      'length("workouts"."workout_date") = 10 and coalesce(date("workouts"."workout_date"), \'\') = "workouts"."workout_date"'
    )
  })

  it("retains archived references, snapshots, and cascades owned aggregates", () => {
    expect(migration).toContain("`archived_at` integer")
    expect(migration).toContain(
      "FOREIGN KEY (`variant_id`) REFERENCES `exercise_variants`(`id`) ON UPDATE no action ON DELETE restrict"
    )
    expect(migration).toContain(
      "FOREIGN KEY (`source_variant_id`) REFERENCES `exercise_variants`(`id`) ON UPDATE no action ON DELETE set null"
    )
    expect(migration).toContain("`category_name` text NOT NULL")
    expect(migration).toContain("`variant_name` text NOT NULL")
    expect(
      migration.match(/ON DELETE cascade/g)?.length
    ).toBeGreaterThanOrEqual(5)
  })
})
