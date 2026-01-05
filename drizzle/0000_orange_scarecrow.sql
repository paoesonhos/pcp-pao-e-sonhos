CREATE TABLE `blocos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`produtoId` int NOT NULL,
	`unidadesPorBloco` int NOT NULL DEFAULT 30,
	`pesoBloco` decimal(10,5) NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `blocos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `categorias` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(100) NOT NULL,
	`descricao` text,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `categorias_id` PRIMARY KEY(`id`),
	CONSTRAINT `categorias_nome_unique` UNIQUE(`nome`)
);
--> statement-breakpoint
CREATE TABLE `ficha_tecnica` (
	`id` int AUTO_INCREMENT NOT NULL,
	`produtoId` int NOT NULL,
	`componenteId` int NOT NULL,
	`tipoComponente` enum('ingrediente','massa_base','sub_bloco') NOT NULL,
	`quantidadeBase` decimal(10,5) NOT NULL,
	`unidade` enum('kg','un') NOT NULL,
	`receitaMinima` decimal(10,5),
	`ordem` int DEFAULT 0,
	`nivel` int NOT NULL,
	`paiId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ficha_tecnica_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `importacoes_v4` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dataReferencia` varchar(50) NOT NULL,
	`usuarioId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `importacoes_v4_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `insumos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codigoInsumo` varchar(50) NOT NULL,
	`nome` varchar(200) NOT NULL,
	`tipo` enum('seco','molhado') NOT NULL,
	`unidadeMedida` enum('kg','un') NOT NULL DEFAULT 'kg',
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `insumos_id` PRIMARY KEY(`id`),
	CONSTRAINT `insumos_codigoInsumo_unique` UNIQUE(`codigoInsumo`)
);
--> statement-breakpoint
CREATE TABLE `produtos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codigoProduto` varchar(50) NOT NULL,
	`nome` varchar(200) NOT NULL,
	`unidade` enum('kg','un') NOT NULL,
	`pesoUnitario` decimal(10,5) NOT NULL DEFAULT '0',
	`percentualPerdaLiquida` decimal(5,2) DEFAULT '0',
	`shelfLife` int,
	`categoriaId` int,
	`tipoEmbalagem` varchar(100) NOT NULL,
	`quantidadePorEmbalagem` int NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `produtos_id` PRIMARY KEY(`id`),
	CONSTRAINT `produtos_codigoProduto_unique` UNIQUE(`codigoProduto`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE TABLE `vendas_v4` (
	`id` int AUTO_INCREMENT NOT NULL,
	`importacaoId` int NOT NULL,
	`codigoProduto` varchar(50) NOT NULL,
	`nomeProduto` varchar(200) NOT NULL,
	`unidadeMedida` enum('kg','un') NOT NULL,
	`dia2` decimal(10,5) DEFAULT '0',
	`dia3` decimal(10,5) DEFAULT '0',
	`dia4` decimal(10,5) DEFAULT '0',
	`dia5` decimal(10,5) DEFAULT '0',
	`dia6` decimal(10,5) DEFAULT '0',
	`dia7` decimal(10,5) DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `vendas_v4_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `blocos` ADD CONSTRAINT `blocos_produtoId_produtos_id_fk` FOREIGN KEY (`produtoId`) REFERENCES `produtos`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ficha_tecnica` ADD CONSTRAINT `ficha_tecnica_produtoId_produtos_id_fk` FOREIGN KEY (`produtoId`) REFERENCES `produtos`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `importacoes_v4` ADD CONSTRAINT `importacoes_v4_usuarioId_users_id_fk` FOREIGN KEY (`usuarioId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `produtos` ADD CONSTRAINT `produtos_categoriaId_categorias_id_fk` FOREIGN KEY (`categoriaId`) REFERENCES `categorias`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendas_v4` ADD CONSTRAINT `vendas_v4_importacaoId_importacoes_v4_id_fk` FOREIGN KEY (`importacaoId`) REFERENCES `importacoes_v4`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ficha_produto_idx` ON `ficha_tecnica` (`produtoId`);--> statement-breakpoint
CREATE INDEX `codigo_insumo_idx` ON `insumos` (`codigoInsumo`);--> statement-breakpoint
CREATE INDEX `codigo_produto_idx` ON `produtos` (`codigoProduto`);--> statement-breakpoint
CREATE INDEX `categoria_idx` ON `produtos` (`categoriaId`);--> statement-breakpoint
CREATE INDEX `venda_v4_importacao_idx` ON `vendas_v4` (`importacaoId`);--> statement-breakpoint
CREATE INDEX `venda_v4_codigo_idx` ON `vendas_v4` (`codigoProduto`);