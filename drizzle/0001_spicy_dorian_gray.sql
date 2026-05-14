CREATE TABLE `businesses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`commercialId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`qrCode` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `businesses_id` PRIMARY KEY(`id`),
	CONSTRAINT `businesses_qrCode_unique` UNIQUE(`qrCode`)
);
--> statement-breakpoint
CREATE TABLE `commercials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(64) NOT NULL,
	`email` varchar(320) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`fullName` varchar(255) NOT NULL,
	`personalQrCode` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `commercials_id` PRIMARY KEY(`id`),
	CONSTRAINT `commercials_username_unique` UNIQUE(`username`),
	CONSTRAINT `commercials_email_unique` UNIQUE(`email`),
	CONSTRAINT `commercials_personalQrCode_unique` UNIQUE(`personalQrCode`)
);
--> statement-breakpoint
CREATE TABLE `leadFiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`commercialId` int NOT NULL,
	`originalName` varchar(255) NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`storageUrl` varchar(1024) NOT NULL,
	`mimeType` varchar(128) NOT NULL,
	`fileSize` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `leadFiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`commercialId` int NOT NULL,
	`businessId` int,
	`fullName` varchar(255) NOT NULL,
	`phone` varchar(32) NOT NULL,
	`email` varchar(320) NOT NULL,
	`privacyAccepted` boolean NOT NULL DEFAULT false,
	`marketingAccepted` boolean NOT NULL DEFAULT false,
	`notes` text,
	`status` enum('new','contacted','in_progress','closed') NOT NULL DEFAULT 'new',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
