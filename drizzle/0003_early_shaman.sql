ALTER TABLE `commercials` ADD `avatarUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `commercials` ADD `accountStatus` enum('pending','active','blocked') DEFAULT 'pending' NOT NULL;