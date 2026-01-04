CREATE TABLE `importacoes_vendas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dataReferenciaHistorico` timestamp NOT NULL,
	`dataReferenciaPlanejamento` timestamp NOT NULL,
	`usuarioId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `importacoes_vendas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mapa_producao` (
	`id` int AUTO_INCREMENT NOT NULL,
	`importacaoId` int NOT NULL,
	`produtoId` int NOT NULL,
	`diaSemana` int NOT NULL,
	`dataPlanejada` timestamp NOT NULL,
	`quantidadePlanejada` decimal(10,5) NOT NULL,
	`unidade` enum('kg','un') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mapa_producao_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_mapa_produto_dia` UNIQUE(`importacaoId`,`produtoId`,`diaSemana`)
);
--> statement-breakpoint
CREATE TABLE `vendas_historico` (
	`id` int AUTO_INCREMENT NOT NULL,
	`importacaoId` int NOT NULL,
	`produtoId` int NOT NULL,
	`dataVenda` timestamp NOT NULL,
	`quantidade` decimal(10,5) NOT NULL,
	`unidade` enum('kg','un') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vendas_historico_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_produto_data` UNIQUE(`produtoId`,`dataVenda`)
);
--> statement-breakpoint
ALTER TABLE `importacoes_vendas` ADD CONSTRAINT `importacoes_vendas_usuarioId_users_id_fk` FOREIGN KEY (`usuarioId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mapa_producao` ADD CONSTRAINT `mapa_producao_importacaoId_importacoes_vendas_id_fk` FOREIGN KEY (`importacaoId`) REFERENCES `importacoes_vendas`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mapa_producao` ADD CONSTRAINT `mapa_producao_produtoId_produtos_id_fk` FOREIGN KEY (`produtoId`) REFERENCES `produtos`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendas_historico` ADD CONSTRAINT `vendas_historico_importacaoId_importacoes_vendas_id_fk` FOREIGN KEY (`importacaoId`) REFERENCES `importacoes_vendas`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendas_historico` ADD CONSTRAINT `vendas_historico_produtoId_produtos_id_fk` FOREIGN KEY (`produtoId`) REFERENCES `produtos`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `historico_idx` ON `importacoes_vendas` (`dataReferenciaHistorico`);--> statement-breakpoint
CREATE INDEX `planejamento_idx` ON `importacoes_vendas` (`dataReferenciaPlanejamento`);--> statement-breakpoint
CREATE INDEX `mapa_importacao_idx` ON `mapa_producao` (`importacaoId`);--> statement-breakpoint
CREATE INDEX `mapa_produto_idx` ON `mapa_producao` (`produtoId`);--> statement-breakpoint
CREATE INDEX `mapa_dia_idx` ON `mapa_producao` (`diaSemana`);--> statement-breakpoint
CREATE INDEX `venda_importacao_idx` ON `vendas_historico` (`importacaoId`);--> statement-breakpoint
CREATE INDEX `venda_produto_idx` ON `vendas_historico` (`produtoId`);--> statement-breakpoint
CREATE INDEX `venda_data_idx` ON `vendas_historico` (`dataVenda`);