CREATE TABLE `mapa_base` (
	`id` int AUTO_INCREMENT NOT NULL,
	`produtoId` int NOT NULL,
	`quantidade` decimal(10,2) NOT NULL,
	`percentualAjuste` int NOT NULL DEFAULT 0,
	`diaProduzir` int NOT NULL,
	`equipe` varchar(50) DEFAULT 'Equipe 1',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mapa_base_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mapa_rascunho` (
	`id` int AUTO_INCREMENT NOT NULL,
	`importacaoId` int,
	`produtoId` int NOT NULL,
	`qtdImportada` decimal(10,2) NOT NULL,
	`percentualAjuste` int NOT NULL DEFAULT 0,
	`qtdPlanejada` decimal(10,2) NOT NULL,
	`diaProduzir` int NOT NULL,
	`equipe` varchar(50) DEFAULT 'Equipe 1',
	`isReposicao` boolean DEFAULT false,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mapa_rascunho_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `mapa_base` ADD CONSTRAINT `mapa_base_produtoId_produtos_id_fk` FOREIGN KEY (`produtoId`) REFERENCES `produtos`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mapa_rascunho` ADD CONSTRAINT `mapa_rascunho_importacaoId_importacoes_v5_id_fk` FOREIGN KEY (`importacaoId`) REFERENCES `importacoes_v5`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mapa_rascunho` ADD CONSTRAINT `mapa_rascunho_produtoId_produtos_id_fk` FOREIGN KEY (`produtoId`) REFERENCES `produtos`(`id`) ON DELETE cascade ON UPDATE no action;