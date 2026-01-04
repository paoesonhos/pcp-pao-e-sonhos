CREATE TABLE `blocos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`produtoId` int NOT NULL,
	`unidadesPorBloco` int NOT NULL DEFAULT 30,
	`pesoBloco` decimal(10,5) NOT NULL,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `blocos_id` PRIMARY KEY(`id`),
	CONSTRAINT `blocos_produtoId_unique` UNIQUE(`produtoId`)
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
	`ordem` int NOT NULL DEFAULT 0,
	`nivel` int NOT NULL DEFAULT 1,
	`paiId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ficha_tecnica_id` PRIMARY KEY(`id`)
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
	`pesoUnitario` decimal(10,5) NOT NULL,
	`percentualPerdaLiquida` decimal(5,2),
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
ALTER TABLE `blocos` ADD CONSTRAINT `blocos_produtoId_produtos_id_fk` FOREIGN KEY (`produtoId`) REFERENCES `produtos`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ficha_tecnica` ADD CONSTRAINT `ficha_tecnica_produtoId_produtos_id_fk` FOREIGN KEY (`produtoId`) REFERENCES `produtos`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ficha_tecnica` ADD CONSTRAINT `ficha_tecnica_paiId_ficha_tecnica_id_fk` FOREIGN KEY (`paiId`) REFERENCES `ficha_tecnica`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `produtos` ADD CONSTRAINT `produtos_categoriaId_categorias_id_fk` FOREIGN KEY (`categoriaId`) REFERENCES `categorias`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `bloco_produto_idx` ON `blocos` (`produtoId`);--> statement-breakpoint
CREATE INDEX `produto_idx` ON `ficha_tecnica` (`produtoId`);--> statement-breakpoint
CREATE INDEX `componente_idx` ON `ficha_tecnica` (`componenteId`,`tipoComponente`);--> statement-breakpoint
CREATE INDEX `pai_idx` ON `ficha_tecnica` (`paiId`);--> statement-breakpoint
CREATE INDEX `codigo_insumo_idx` ON `insumos` (`codigoInsumo`);--> statement-breakpoint
CREATE INDEX `codigo_produto_idx` ON `produtos` (`codigoProduto`);--> statement-breakpoint
CREATE INDEX `categoria_idx` ON `produtos` (`categoriaId`);