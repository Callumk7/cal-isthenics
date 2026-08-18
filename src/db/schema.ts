import { relations, sql } from "drizzle-orm"
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core"

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}

/** The single manually provisioned account. Passwords are stored as hashes only. */
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  passwordHash: text("password_hash").notNull(),
  ...timestamps,
})

/** Server-side sessions, addressed by a SHA-256 hash of the browser's token. */
export const sessions = sqliteTable(
  "sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_expires_at_idx").on(table.expiresAt),
  ]
)

/** A user-owned exercise family, retained when archived. */
export const exerciseCategories = sqliteTable(
  "exercise_categories",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
    ...timestamps,
  },
  (table) => [
    index("exercise_categories_user_id_idx").on(table.userId),
    index("exercise_categories_user_archived_idx").on(
      table.userId,
      table.archivedAt
    ),
  ]
)

/** A progression within a category. Multiplier values are integer thousandths. */
export const exerciseVariants = sqliteTable(
  "exercise_variants",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => exerciseCategories.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    difficultyMultiplier: integer("difficulty_multiplier").notNull(),
    archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
    ...timestamps,
  },
  (table) => [
    index("exercise_variants_user_id_idx").on(table.userId),
    index("exercise_variants_category_id_idx").on(table.categoryId),
    index("exercise_variants_user_archived_idx").on(
      table.userId,
      table.archivedAt
    ),
    check(
      "exercise_variants_positive_multiplier_check",
      sql`${table.difficultyMultiplier} > 0`
    ),
  ]
)

export const workoutTemplates = sqliteTable(
  "workout_templates",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    ...timestamps,
  },
  (table) => [index("workout_templates_user_id_idx").on(table.userId)]
)

/** Ordered template entries; the count replaces valueless template-set rows. */
export const workoutTemplateExercises = sqliteTable(
  "workout_template_exercises",
  {
    id: text("id").primaryKey(),
    templateId: text("template_id")
      .notNull()
      .references(() => workoutTemplates.id, { onDelete: "cascade" }),
    variantId: text("variant_id")
      .notNull()
      .references(() => exerciseVariants.id, { onDelete: "restrict" }),
    position: integer("position").notNull(),
    setCount: integer("set_count").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("workout_template_exercises_order_idx").on(
      table.templateId,
      table.position
    ),
    index("workout_template_exercises_variant_id_idx").on(table.variantId),
    check(
      "workout_template_exercises_nonnegative_position_check",
      sql`${table.position} >= 0`
    ),
    check(
      "workout_template_exercises_positive_set_count_check",
      sql`${table.setCount} > 0`
    ),
  ]
)

export const workouts = sqliteTable(
  "workouts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Calendar-only ISO date. Intentionally not unique per user. */
    workoutDate: text("workout_date").notNull(),
    name: text("name"),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    index("workouts_user_date_idx").on(table.userId, table.workoutDate),
    check(
      "workouts_valid_date_check",
      sql`length(${table.workoutDate}) = 10 and coalesce(date(${table.workoutDate}), '') = ${table.workoutDate}`
    ),
  ]
)

/** Ordered exercise with immutable library snapshots for historical calculations. */
export const workoutExercises = sqliteTable(
  "workout_exercises",
  {
    id: text("id").primaryKey(),
    workoutId: text("workout_id")
      .notNull()
      .references(() => workouts.id, { onDelete: "cascade" }),
    sourceVariantId: text("source_variant_id").references(
      () => exerciseVariants.id,
      { onDelete: "set null" }
    ),
    position: integer("position").notNull(),
    categoryName: text("category_name").notNull(),
    variantName: text("variant_name").notNull(),
    difficultyMultiplier: integer("difficulty_multiplier").notNull(),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("workout_exercises_order_idx").on(
      table.workoutId,
      table.position
    ),
    index("workout_exercises_source_variant_id_idx").on(table.sourceVariantId),
    check(
      "workout_exercises_nonnegative_position_check",
      sql`${table.position} >= 0`
    ),
    check(
      "workout_exercises_positive_multiplier_check",
      sql`${table.difficultyMultiplier} > 0`
    ),
  ]
)

export const workoutSets = sqliteTable(
  "workout_sets",
  {
    id: text("id").primaryKey(),
    workoutExerciseId: text("workout_exercise_id")
      .notNull()
      .references(() => workoutExercises.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    reps: integer("reps").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("workout_sets_order_idx").on(
      table.workoutExerciseId,
      table.position
    ),
    check(
      "workout_sets_nonnegative_position_check",
      sql`${table.position} >= 0`
    ),
    check("workout_sets_positive_reps_check", sql`${table.reps} > 0`),
  ]
)

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  exerciseCategories: many(exerciseCategories),
  exerciseVariants: many(exerciseVariants),
  workoutTemplates: many(workoutTemplates),
  workouts: many(workouts),
}))
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}))
export const exerciseCategoriesRelations = relations(
  exerciseCategories,
  ({ one, many }) => ({
    user: one(users, {
      fields: [exerciseCategories.userId],
      references: [users.id],
    }),
    variants: many(exerciseVariants),
  })
)
export const exerciseVariantsRelations = relations(
  exerciseVariants,
  ({ one, many }) => ({
    user: one(users, {
      fields: [exerciseVariants.userId],
      references: [users.id],
    }),
    category: one(exerciseCategories, {
      fields: [exerciseVariants.categoryId],
      references: [exerciseCategories.id],
    }),
    templateExercises: many(workoutTemplateExercises),
    workoutExercises: many(workoutExercises),
  })
)
export const workoutTemplatesRelations = relations(
  workoutTemplates,
  ({ one, many }) => ({
    user: one(users, {
      fields: [workoutTemplates.userId],
      references: [users.id],
    }),
    exercises: many(workoutTemplateExercises),
  })
)
export const workoutTemplateExercisesRelations = relations(
  workoutTemplateExercises,
  ({ one }) => ({
    template: one(workoutTemplates, {
      fields: [workoutTemplateExercises.templateId],
      references: [workoutTemplates.id],
    }),
    variant: one(exerciseVariants, {
      fields: [workoutTemplateExercises.variantId],
      references: [exerciseVariants.id],
    }),
  })
)
export const workoutsRelations = relations(workouts, ({ one, many }) => ({
  user: one(users, { fields: [workouts.userId], references: [users.id] }),
  exercises: many(workoutExercises),
}))
export const workoutExercisesRelations = relations(
  workoutExercises,
  ({ one, many }) => ({
    workout: one(workouts, {
      fields: [workoutExercises.workoutId],
      references: [workouts.id],
    }),
    sourceVariant: one(exerciseVariants, {
      fields: [workoutExercises.sourceVariantId],
      references: [exerciseVariants.id],
    }),
    sets: many(workoutSets),
  })
)
export const workoutSetsRelations = relations(workoutSets, ({ one }) => ({
  workoutExercise: one(workoutExercises, {
    fields: [workoutSets.workoutExerciseId],
    references: [workoutExercises.id],
  }),
}))

export type User = typeof users.$inferSelect
export type ExerciseCategory = typeof exerciseCategories.$inferSelect
export type NewExerciseCategory = typeof exerciseCategories.$inferInsert
export type ExerciseVariant = typeof exerciseVariants.$inferSelect
export type NewExerciseVariant = typeof exerciseVariants.$inferInsert
export type WorkoutTemplate = typeof workoutTemplates.$inferSelect
export type NewWorkoutTemplate = typeof workoutTemplates.$inferInsert
export type WorkoutTemplateExercise =
  typeof workoutTemplateExercises.$inferSelect
export type NewWorkoutTemplateExercise =
  typeof workoutTemplateExercises.$inferInsert
export type Workout = typeof workouts.$inferSelect
export type NewWorkout = typeof workouts.$inferInsert
export type WorkoutExercise = typeof workoutExercises.$inferSelect
export type NewWorkoutExercise = typeof workoutExercises.$inferInsert
export type WorkoutSet = typeof workoutSets.$inferSelect
export type NewWorkoutSet = typeof workoutSets.$inferInsert
