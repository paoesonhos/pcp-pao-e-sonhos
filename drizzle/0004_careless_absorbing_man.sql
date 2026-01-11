ALTER TABLE `mapa_rascunho` DROP FOREIGN KEY `mapa_rascunho_produtoId_produtos_id_fk`;
--> statement-breakpoint
ALTER TABLE `mapa_rascunho` MODIFY COLUMN `produtoId` int;--> statement-breakpoint
ALTER TABLE `mapa_rascunho` ADD `codigoProduto` varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE `mapa_rascunho` ADD `nomeProduto` varchar(200) NOT NULL;--> statement-breakpoint
ALTER TABLE `mapa_rascunho` ADD `unidade` varchar(20) NOT NULL;