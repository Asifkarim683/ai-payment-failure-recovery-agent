CREATE TABLE `policy_rules` (
	`id` varchar(64) NOT NULL,
	`rootCause` varchar(64) NOT NULL,
	`action` varchar(64) NOT NULL,
	`maxRetries` int NOT NULL,
	`cooldownMinutes` int NOT NULL,
	`amountCeiling` decimal(14,2) NOT NULL,
	`confidenceFloor` decimal(5,4) NOT NULL,
	`permittedChannels` json NOT NULL,
	`requiresApproval` int NOT NULL,
	`updatedAt` timestamp NOT NULL,
	CONSTRAINT `policy_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recovery_approvals` (
	`id` varchar(64) NOT NULL,
	`eventId` varchar(64) NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL,
	`reviewedBy` varchar(180),
	`reviewedAt` timestamp,
	CONSTRAINT `recovery_approvals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recovery_audit_events` (
	`id` varchar(64) NOT NULL,
	`eventId` varchar(64) NOT NULL,
	`stepName` varchar(40) NOT NULL,
	`detailJson` json NOT NULL,
	`timestamp` timestamp NOT NULL,
	CONSTRAINT `recovery_audit_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recovery_cases` (
	`id` varchar(64) NOT NULL,
	`runId` varchar(64) NOT NULL,
	`merchantId` varchar(64) NOT NULL,
	`merchantName` varchar(180) NOT NULL,
	`amount` decimal(14,2) NOT NULL,
	`paymentStatus` varchar(40) NOT NULL,
	`declineCode` varchar(64),
	`attemptCount` int NOT NULL,
	`rootCause` varchar(64),
	`confidence` decimal(5,4),
	`recommendedAction` varchar(64),
	`actionGated` int NOT NULL,
	`gateReason` text,
	`actionResult` varchar(40),
	`amountRecovered` decimal(14,2) NOT NULL,
	`createdAt` timestamp NOT NULL,
	CONSTRAINT `recovery_cases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recovery_runs` (
	`id` varchar(64) NOT NULL,
	`startedAt` timestamp NOT NULL,
	`finishedAt` timestamp,
	`status` enum('queued','running','completed') NOT NULL,
	`totalAtRisk` decimal(14,2) NOT NULL,
	`totalRecovered` decimal(14,2) NOT NULL,
	`eventCount` int NOT NULL,
	CONSTRAINT `recovery_runs_id` PRIMARY KEY(`id`)
);
