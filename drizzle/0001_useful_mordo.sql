CREATE TABLE `employers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`contactEmail` varchar(320),
	`contactPhone` varchar(20),
	`address` text,
	`city` varchar(100),
	`province` varchar(100),
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `platformSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`commissionPercentage` decimal(5,2) DEFAULT '2',
	`platformName` varchar(255) DEFAULT 'Tipping Platform',
	`platformLogo` text,
	`minTipAmount` decimal(10,2) DEFAULT '1',
	`maxTipAmount` decimal(10,2) DEFAULT '5000',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platformSettings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workerId` int NOT NULL,
	`employerId` int NOT NULL,
	`paystackReference` varchar(255) NOT NULL,
	`tipAmount` decimal(10,2) NOT NULL,
	`platformCommission` decimal(10,2) NOT NULL,
	`workerAmount` decimal(10,2) NOT NULL,
	`customerMessage` text,
	`status` enum('pending','completed','failed') NOT NULL DEFAULT 'pending',
	`paystackResponse` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `transactions_paystackReference_unique` UNIQUE(`paystackReference`)
);
--> statement-breakpoint
CREATE TABLE `workers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`employerId` int NOT NULL,
	`fullName` varchar(255) NOT NULL,
	`role` varchar(100) NOT NULL,
	`phoneNumber` varchar(20),
	`idNumber` varchar(50),
	`bankName` varchar(100) NOT NULL,
	`accountHolder` varchar(255) NOT NULL,
	`accountNumber` varchar(50) NOT NULL,
	`branchCode` varchar(10) NOT NULL,
	`paystackSubaccountCode` varchar(255),
	`uniqueUrl` varchar(255) NOT NULL,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`totalTipsReceived` decimal(10,2) DEFAULT '0',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workers_id` PRIMARY KEY(`id`),
	CONSTRAINT `workers_uniqueUrl_unique` UNIQUE(`uniqueUrl`)
);
