PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_inventory_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`low_stock` integer DEFAULT 0 NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_inventory_items`("id", "name", "category", "low_stock", "notes", "created_at") SELECT "id", "name", "category", "low_stock", "notes", "created_at" FROM `inventory_items`;--> statement-breakpoint
DROP TABLE `inventory_items`;--> statement-breakpoint
ALTER TABLE `__new_inventory_items` RENAME TO `inventory_items`;--> statement-breakpoint
PRAGMA foreign_keys=ON;