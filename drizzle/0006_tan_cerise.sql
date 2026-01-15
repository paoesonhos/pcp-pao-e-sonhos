CREATE TABLE `modo_preparo` (
	`id` int AUTO_INCREMENT NOT NULL,
	`produtoId` int NOT NULL,
	`ordem` int NOT NULL DEFAULT 1,
	`descricao` text NOT NULL,
	`tempoMinutos` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `modo_preparo_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `modo_preparo` ADD CONSTRAINT `modo_preparo_produtoId_produtos_id_fk` FOREIGN KEY (`produtoId`) REFERENCES `produtos`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `modo_preparo_produto_idx` ON `modo_preparo` (`produtoId`);