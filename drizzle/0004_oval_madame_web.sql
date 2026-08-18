CREATE TABLE `running_workouts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`workout_date` text NOT NULL,
	`distance_metres` integer NOT NULL,
	`duration_seconds` integer NOT NULL,
	`calories` integer NOT NULL,
	`manual_speed_milli_kmh` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "running_workouts_valid_date_check" CHECK(length("running_workouts"."workout_date") = 10 and coalesce(date("running_workouts"."workout_date"), '') = "running_workouts"."workout_date"),
	CONSTRAINT "running_workouts_positive_distance_check" CHECK("running_workouts"."distance_metres" > 0),
	CONSTRAINT "running_workouts_positive_duration_check" CHECK("running_workouts"."duration_seconds" > 0),
	CONSTRAINT "running_workouts_positive_calories_check" CHECK("running_workouts"."calories" > 0),
	CONSTRAINT "running_workouts_positive_manual_speed_check" CHECK("running_workouts"."manual_speed_milli_kmh" is null or "running_workouts"."manual_speed_milli_kmh" > 0)
);
--> statement-breakpoint
CREATE INDEX `running_workouts_user_date_idx` ON `running_workouts` (`user_id`,`workout_date`);