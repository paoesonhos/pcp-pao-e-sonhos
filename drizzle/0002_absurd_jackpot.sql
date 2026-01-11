CREATE TABLE `destinos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(100) NOT NULL,
	`descricao` text,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `destinos_id` PRIMARY KEY(`id`),
	CONSTRAINT `destinos_nome_unique` UNIQUE(`nome`)
);
--> statement-breakpoint
CREATE TABLE `movimentacoes_estoque` (
	`id` int AUTO_INCREMENT NOT NULL,
	`produtoId` int NOT NULL,
	`tipo` enum('entrada','saida') NOT NULL,
	`quantidade` decimal(10,5) NOT NULL,
	`motivo` varchar(200),
	`usuarioId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `movimentacoes_estoque_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `produtos` ADD `destinoId` int;--> statement-breakpoint
ALTER TABLE `produtos` ADD `saldoEstoque` decimal(10,5) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `produtos` ADD `estoqueMinimoDias` int DEFAULT 4 NOT NULL;--> statement-breakpoint
ALTER TABLE `movimentacoes_estoque` ADD CONSTRAINT `movimentacoes_estoque_produtoId_produtos_id_fk` FOREIGN KEY (`produtoId`) REFERENCES `produtos`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `movimentacoes_estoque` ADD CONSTRAINT `movimentacoes_estoque_usuarioId_users_id_fk` FOREIGN KEY (`usuarioId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `destino_idx` ON `produtos` (`destinoId`);