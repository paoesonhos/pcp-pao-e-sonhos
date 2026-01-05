CREATE TABLE `importacoes_v5` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dataReferencia` varchar(50) NOT NULL,
	`usuarioId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `importacoes_v5_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vendas_v5` (
	`id` int AUTO_INCREMENT NOT NULL,
	`importacaoId` int NOT NULL,
	`codigoProduto` varchar(50) NOT NULL,
	`nomeProduto` varchar(200) NOT NULL,
	`unidadeMedida` varchar(20) NOT NULL,
	`dia2` decimal(10,2) DEFAULT '0',
	`dia3` decimal(10,2) DEFAULT '0',
	`dia4` decimal(10,2) DEFAULT '0',
	`dia5` decimal(10,2) DEFAULT '0',
	`dia6` decimal(10,2) DEFAULT '0',
	`dia7` decimal(10,2) DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vendas_v5_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `importacoes_v5` ADD CONSTRAINT `importacoes_v5_usuarioId_users_id_fk` FOREIGN KEY (`usuarioId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendas_v5` ADD CONSTRAINT `vendas_v5_importacaoId_importacoes_v5_id_fk` FOREIGN KEY (`importacaoId`) REFERENCES `importacoes_v5`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `venda_v5_importacao_idx` ON `vendas_v5` (`importacaoId`);--> statement-breakpoint
CREATE INDEX `venda_v5_codigo_idx` ON `vendas_v5` (`codigoProduto`);