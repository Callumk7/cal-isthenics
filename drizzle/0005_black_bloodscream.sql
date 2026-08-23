ALTER TABLE `workouts` ADD `client_request_id` text;--> statement-breakpoint
ALTER TABLE `workouts` ADD `request_payload_hash` text;--> statement-breakpoint
CREATE UNIQUE INDEX `workouts_user_client_request_id_idx` ON `workouts` (`user_id`,`client_request_id`);