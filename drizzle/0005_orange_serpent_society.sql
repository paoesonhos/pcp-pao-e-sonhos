ALTER TABLE `mapa_base` DROP FOREIGN KEY `mapa_base_produtoId_produtos_id_fk`;
--> statement-breakpoint
ALTER TABLE `mapa_base` MODIFY COLUMN `produtoId` int;--> statement-breakpoint
ALTER TABLE `mapa_base` ADD `codigoProduto` varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE `mapa_base` ADD `nomeProduto` varchar(200) NOT NULL;--> statement-breakpoint
ALTER TABLE `mapa_base` ADD `unidade` varchar(20) NOT NULL;