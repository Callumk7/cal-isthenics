CREATE TABLE `exercise_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`archived_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `exercise_categories_user_id_idx` ON `exercise_categories` (`user_id`);--> statement-breakpoint
CREATE INDEX `exercise_categories_user_archived_idx` ON `exercise_categories` (`user_id`,`archived_at`);--> statement-breakpoint
CREATE TABLE `exercise_variants` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`category_id` text NOT NULL,
	`name` text NOT NULL,
	`difficulty_multiplier` integer NOT NULL,
	`archived_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `exercise_categories`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "exercise_variants_positive_multiplier_check" CHECK("exercise_variants"."difficulty_multiplier" > 0)
);
--> statement-breakpoint
CREATE INDEX `exercise_variants_user_id_idx` ON `exercise_variants` (`user_id`);--> statement-breakpoint
CREATE INDEX `exercise_variants_category_id_idx` ON `exercise_variants` (`category_id`);--> statement-breakpoint
CREATE INDEX `exercise_variants_user_archived_idx` ON `exercise_variants` (`user_id`,`archived_at`);--> statement-breakpoint
CREATE TABLE `workout_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`workout_id` text NOT NULL,
	`source_variant_id` text,
	`position` integer NOT NULL,
	`category_name` text NOT NULL,
	`variant_name` text NOT NULL,
	`difficulty_multiplier` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workout_id`) REFERENCES `workouts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_variant_id`) REFERENCES `exercise_variants`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "workout_exercises_nonnegative_position_check" CHECK("workout_exercises"."position" >= 0),
	CONSTRAINT "workout_exercises_positive_multiplier_check" CHECK("workout_exercises"."difficulty_multiplier" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workout_exercises_order_idx` ON `workout_exercises` (`workout_id`,`position`);--> statement-breakpoint
CREATE INDEX `workout_exercises_source_variant_id_idx` ON `workout_exercises` (`source_variant_id`);--> statement-breakpoint
CREATE TABLE `workout_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`workout_exercise_id` text NOT NULL,
	`position` integer NOT NULL,
	`reps` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workout_exercise_id`) REFERENCES `workout_exercises`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "workout_sets_nonnegative_position_check" CHECK("workout_sets"."position" >= 0),
	CONSTRAINT "workout_sets_positive_reps_check" CHECK("workout_sets"."reps" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workout_sets_order_idx` ON `workout_sets` (`workout_exercise_id`,`position`);--> statement-breakpoint
CREATE TABLE `workout_template_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`template_id` text NOT NULL,
	`variant_id` text NOT NULL,
	`position` integer NOT NULL,
	`set_count` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`template_id`) REFERENCES `workout_templates`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`variant_id`) REFERENCES `exercise_variants`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "workout_template_exercises_nonnegative_position_check" CHECK("workout_template_exercises"."position" >= 0),
	CONSTRAINT "workout_template_exercises_positive_set_count_check" CHECK("workout_template_exercises"."set_count" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workout_template_exercises_order_idx` ON `workout_template_exercises` (`template_id`,`position`);--> statement-breakpoint
CREATE INDEX `workout_template_exercises_variant_id_idx` ON `workout_template_exercises` (`variant_id`);--> statement-breakpoint
CREATE TABLE `workout_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `workout_templates_user_id_idx` ON `workout_templates` (`user_id`);--> statement-breakpoint
CREATE TABLE `workouts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`workout_date` text NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "workouts_valid_date_check" CHECK(length("workouts"."workout_date") = 10 and coalesce(date("workouts"."workout_date"), '') = "workouts"."workout_date")
);
--> statement-breakpoint
CREATE INDEX `workouts_user_date_idx` ON `workouts` (`user_id`,`workout_date`);