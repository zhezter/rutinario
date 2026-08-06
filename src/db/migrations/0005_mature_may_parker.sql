CREATE TABLE `day_closures` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`closed_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `day_closures_date_unique` ON `day_closures` (`date`);