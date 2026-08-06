CREATE TABLE `actions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`procedure_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`duration_min` integer,
	`order_index` integer DEFAULT 0 NOT NULL,
	`schedule_type` text DEFAULT 'flexible' NOT NULL,
	`fixed_time` text,
	`anchor_type` text,
	`anchor_target` text,
	`frequency_type` text DEFAULT 'daily' NOT NULL,
	`frequency_value` integer,
	`min_viable_level` text DEFAULT 'essential' NOT NULL,
	`product` text,
	`instructions` text,
	`dependencies` text,
	`notes` text,
	`alternatives` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`procedure_id`) REFERENCES `procedures`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `completions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`action_id` integer NOT NULL,
	`date` text NOT NULL,
	`completed_at` integer NOT NULL,
	`level_used` text DEFAULT 'standard',
	FOREIGN KEY (`action_id`) REFERENCES `actions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `completions_action_date_unique` ON `completions` (`action_id`,`date`);--> statement-breakpoint
CREATE TABLE `domains` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`icon` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `inventory_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`used_in_action_id` integer,
	`amount_remaining` integer DEFAULT 100 NOT NULL,
	`replacement_interval_days` integer,
	`last_replaced_at` text,
	`notes` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`used_in_action_id`) REFERENCES `actions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `procedures` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`routine_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`routine_id`) REFERENCES `routines`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `routines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`system_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`system_id`) REFERENCES `systems`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `systems` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`domain_id` integer NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`) ON UPDATE no action ON DELETE cascade
);
