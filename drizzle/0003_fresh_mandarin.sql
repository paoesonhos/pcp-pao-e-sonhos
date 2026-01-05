CREATE TABLE `importacoes_v2` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dataReferencia` varchar(50) NOT NULL,
	`usuarioId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `importacoes_v2_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vendas_v2` (
	`id` int AUTO_INCREMENT NOT NULL,
	`importacaoId` int NOT NULL,
	`produtoId` int NOT NULL,
	`diaSemana` int NOT NULL,
	`quantidade` decimal(10,5) NOT NULL,
	`unidade` enum('kg','un') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vendas_v2_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_v2_produto_dia` UNIQUE(`importacaoId`,`produtoId`,`diaSemana`)
);
--> statement-breakpoint
DROP TABLE `importacoes_vendas`;--> statement-breakpoint
DROP TABLE `mapa_producao`;--> statement-breakpoint
DROP TABLE `vendas_historico`;--> statement-breakpoint
ALTER TABLE `importacoes_v2` ADD CONSTRAINT `importacoes_v2_usuarioId_users_id_fk` FOREIGN KEY (`usuarioId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendas_v2` ADD CONSTRAINT `vendas_v2_importacaoId_importacoes_v2_id_fk` FOREIGN KEY (`importacaoId`) REFERENCES `importacoes_v2`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendas_v2` ADD CONSTRAINT `vendas_v2_produtoId_produtos_id_fk` FOREIGN KEY (`produtoId`) REFERENCES `produtos`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `venda_v2_importacao_idx` ON `vendas_v2` (`importacaoId`);--> statement-breakpoint
CREATE INDEX `venda_v2_produto_idx` ON `vendas_v2` (`produtoId`);--> statement-breakpoint
CREATE INDEX `venda_v2_dia_idx` ON `vendas_v2` (`diaSemana`);