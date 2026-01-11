import { mysqlTable, int, varchar, text, timestamp, boolean, index, unique, decimal, mysqlEnum } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Categorias de produtos (Pães, Bolos, Salgados, etc.)
 */
export const categorias = mysqlTable("categorias", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull().unique(),
  descricao: text("descricao"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Categoria = typeof categorias.$inferSelect;
export type InsertCategoria = typeof categorias.$inferInsert;

/**
 * Insumos (ingredientes) utilizados nas receitas
 */
export const insumos = mysqlTable("insumos", {
  id: int("id").autoincrement().primaryKey(),
  codigoInsumo: varchar("codigoInsumo", { length: 50 }).notNull().unique(),
  nome: varchar("nome", { length: 200 }).notNull(),
  tipo: mysqlEnum("tipo", ["seco", "molhado"]).notNull(),
  unidadeMedida: mysqlEnum("unidadeMedida", ["kg", "un"]).default("kg").notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  codigoIdx: index("codigo_insumo_idx").on(table.codigoInsumo),
}));

export type Insumo = typeof insumos.$inferSelect;
export type InsertInsumo = typeof insumos.$inferInsert;

/**
 * Produtos finais (pães, bolos, etc.)
 */
export const produtos = mysqlTable("produtos", {
  id: int("id").autoincrement().primaryKey(),
  codigoProduto: varchar("codigoProduto", { length: 50 }).notNull().unique(),
  nome: varchar("nome", { length: 200 }).notNull(),
  unidade: mysqlEnum("unidade", ["kg", "un"]).notNull(),
  pesoUnitario: decimal("pesoUnitario", { precision: 10, scale: 5 }).default("0").notNull(),
  percentualPerdaLiquida: decimal("percentualPerdaLiquida", { precision: 5, scale: 2 }).default("0"),
  shelfLife: int("shelfLife"),
  categoriaId: int("categoriaId").references(() => categorias.id),
  destinoId: int("destinoId"),
  saldoEstoque: decimal("saldoEstoque", { precision: 10, scale: 5 }).default("0").notNull(),
  estoqueMinimoDias: int("estoqueMinimoDias").default(4).notNull(),
  tipoEmbalagem: varchar("tipoEmbalagem", { length: 100 }).notNull(),
  quantidadePorEmbalagem: int("quantidadePorEmbalagem").notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  codigoIdx: index("codigo_produto_idx").on(table.codigoProduto),
  categoriaIdx: index("categoria_idx").on(table.categoriaId),
  destinoIdx: index("destino_idx").on(table.destinoId),
}));

export type Produto = typeof produtos.$inferSelect;
export type InsertProduto = typeof produtos.$inferInsert;

/**
 * Ficha Técnica - Componentes de receitas (hierarquia até 2 níveis)
 */
export const fichaTecnica = mysqlTable("ficha_tecnica", {
  id: int("id").autoincrement().primaryKey(),
  produtoId: int("produtoId").notNull().references(() => produtos.id, { onDelete: "cascade" }),
  componenteId: int("componenteId").notNull(),
  tipoComponente: mysqlEnum("tipoComponente", ["ingrediente", "massa_base", "sub_bloco"]).notNull(),
  quantidadeBase: decimal("quantidadeBase", { precision: 10, scale: 5 }).notNull(),
  unidade: mysqlEnum("unidade", ["kg", "un"]).notNull(),
  receitaMinima: decimal("receitaMinima", { precision: 10, scale: 5 }),
  ordem: int("ordem").default(0),
  nivel: int("nivel").notNull(),
  paiId: int("paiId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  produtoIdx: index("ficha_produto_idx").on(table.produtoId),
}));

export type FichaTecnica = typeof fichaTecnica.$inferSelect;
export type InsertFichaTecnica = typeof fichaTecnica.$inferInsert;

/**
 * Blocos da divisora (30 unidades por bloco)
 */
export const blocos = mysqlTable("blocos", {
  id: int("id").autoincrement().primaryKey(),
  produtoId: int("produtoId").notNull().references(() => produtos.id, { onDelete: "cascade" }),
  unidadesPorBloco: int("unidadesPorBloco").default(30).notNull(),
  pesoBloco: decimal("pesoBloco", { precision: 10, scale: 5 }).notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Bloco = typeof blocos.$inferSelect;
export type InsertBloco = typeof blocos.$inferInsert;

/**
 * Relations
 */
export const categoriasRelations = relations(categorias, ({ many }) => ({
  produtos: many(produtos),
}));

export const produtosRelations = relations(produtos, ({ one, many }) => ({
  categoria: one(categorias, {
    fields: [produtos.categoriaId],
    references: [categorias.id],
  }),
  destino: one(destinos, {
    fields: [produtos.destinoId],
    references: [destinos.id],
  }),
  fichaTecnica: many(fichaTecnica),
  blocos: many(blocos),
  movimentacoesEstoque: many(movimentacoesEstoque),
}));

export const fichaTecnicaRelations = relations(fichaTecnica, ({ one, many }) => ({
  produto: one(produtos, {
    fields: [fichaTecnica.produtoId],
    references: [produtos.id],
  }),
  pai: one(fichaTecnica, {
    fields: [fichaTecnica.paiId],
    references: [fichaTecnica.id],
    relationName: "subBlocos",
  }),
  filhos: many(fichaTecnica, {
    relationName: "subBlocos",
  }),
}));

export const blocosRelations = relations(blocos, ({ one }) => ({
  produto: one(produtos, {
    fields: [blocos.produtoId],
    references: [produtos.id],
  }),
}));

/**
 * Importação V4: Dados de vendas simples
 */
export const importacoesV4 = mysqlTable("importacoes_v4", {
  id: int("id").autoincrement().primaryKey(),
  dataReferencia: varchar("dataReferencia", { length: 50 }).notNull(),
  usuarioId: int("usuarioId").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ImportacaoV4 = typeof importacoesV4.$inferSelect;
export type InsertImportacaoV4 = typeof importacoesV4.$inferInsert;

/**
 * Vendas V4: Dados de vendas com todos os dias em colunas
 */
export const vendasV4 = mysqlTable("vendas_v4", {
  id: int("id").autoincrement().primaryKey(),
  importacaoId: int("importacaoId").notNull().references(() => importacoesV4.id, { onDelete: "cascade" }),
  codigoProduto: varchar("codigoProduto", { length: 50 }).notNull(),
  nomeProduto: varchar("nomeProduto", { length: 200 }).notNull(),
  unidadeMedida: mysqlEnum("unidadeMedida", ["kg", "un"]).notNull(),
  dia2: decimal("dia2", { precision: 10, scale: 5 }).default("0"),
  dia3: decimal("dia3", { precision: 10, scale: 5 }).default("0"),
  dia4: decimal("dia4", { precision: 10, scale: 5 }).default("0"),
  dia5: decimal("dia5", { precision: 10, scale: 5 }).default("0"),
  dia6: decimal("dia6", { precision: 10, scale: 5 }).default("0"),
  dia7: decimal("dia7", { precision: 10, scale: 5 }).default("0"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  importacaoIdx: index("venda_v4_importacao_idx").on(table.importacaoId),
  codigoIdx: index("venda_v4_codigo_idx").on(table.codigoProduto),
}));

export type VendaV4 = typeof vendasV4.$inferSelect;
export type InsertVendaV4 = typeof vendasV4.$inferInsert;

/**
 * Relations para importacoes V4
 */
export const importacoesV4Relations = relations(importacoesV4, ({ one, many }) => ({
  usuario: one(users, {
    fields: [importacoesV4.usuarioId],
    references: [users.id],
  }),
  vendas: many(vendasV4),
}));

export const vendasV4Relations = relations(vendasV4, ({ one }) => ({
  importacao: one(importacoesV4, {
    fields: [vendasV4.importacaoId],
    references: [importacoesV4.id],
  }),
}));


/**
 * Importação V5: Dados de vendas simples (versão funcional)
 */
export const importacoesV5 = mysqlTable("importacoes_v5", {
  id: int("id").autoincrement().primaryKey(),
  dataReferencia: varchar("dataReferencia", { length: 50 }).notNull(),
  usuarioId: int("usuarioId").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ImportacaoV5 = typeof importacoesV5.$inferSelect;
export type InsertImportacaoV5 = typeof importacoesV5.$inferInsert;

/**
 * Vendas V5: Dados de vendas com todos os dias em colunas
 */
export const vendasV5 = mysqlTable("vendas_v5", {
  id: int("id").autoincrement().primaryKey(),
  importacaoId: int("importacaoId").notNull().references(() => importacoesV5.id, { onDelete: "cascade" }),
  codigoProduto: varchar("codigoProduto", { length: 50 }).notNull(),
  nomeProduto: varchar("nomeProduto", { length: 200 }).notNull(),
  unidadeMedida: varchar("unidadeMedida", { length: 20 }).notNull(),
  dia2: decimal("dia2", { precision: 10, scale: 2 }).default("0"),
  dia3: decimal("dia3", { precision: 10, scale: 2 }).default("0"),
  dia4: decimal("dia4", { precision: 10, scale: 2 }).default("0"),
  dia5: decimal("dia5", { precision: 10, scale: 2 }).default("0"),
  dia6: decimal("dia6", { precision: 10, scale: 2 }).default("0"),
  dia7: decimal("dia7", { precision: 10, scale: 2 }).default("0"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  importacaoIdx: index("venda_v5_importacao_idx").on(table.importacaoId),
  codigoIdx: index("venda_v5_codigo_idx").on(table.codigoProduto),
}));

export type VendaV5 = typeof vendasV5.$inferSelect;
export type InsertVendaV5 = typeof vendasV5.$inferInsert;

/**
 * Relations para importacoes V5
 */
export const importacoesV5Relations = relations(importacoesV5, ({ one, many }) => ({
  usuario: one(users, {
    fields: [importacoesV5.usuarioId],
    references: [users.id],
  }),
  vendas: many(vendasV5),
}));

export const vendasV5Relations = relations(vendasV5, ({ one }) => ({
  importacao: one(importacoesV5, {
    fields: [vendasV5.importacaoId],
    references: [importacoesV5.id],
  }),
}));

/**
 * Destinos de produtos (Congelado, Pré-Preparo, Venda Direta, etc.)
 */
export const destinos = mysqlTable("destinos", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull().unique(),
  descricao: text("descricao"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Destino = typeof destinos.$inferSelect;
export type InsertDestino = typeof destinos.$inferInsert;

/**
 * Movimentações de estoque de produtos acabados
 */
export const movimentacoesEstoque = mysqlTable("movimentacoes_estoque", {
  id: int("id").autoincrement().primaryKey(),
  produtoId: int("produtoId").notNull().references(() => produtos.id, { onDelete: "cascade" }),
  tipo: mysqlEnum("tipo", ["entrada", "saida"]).notNull(),
  quantidade: decimal("quantidade", { precision: 10, scale: 5 }).notNull(),
  motivo: varchar("motivo", { length: 200 }),
  usuarioId: int("usuarioId").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MovimentacaoEstoque = typeof movimentacoesEstoque.$inferSelect;
export type InsertMovimentacaoEstoque = typeof movimentacoesEstoque.$inferInsert;

/**
 * Relations para destinos
 */
export const destinosRelations = relations(destinos, ({ many }) => ({
  produtos: many(produtos),
}));

/**
 * Relations para movimentações de estoque
 */
export const movimentacoesEstoqueRelations = relations(movimentacoesEstoque, ({ one }) => ({
  produto: one(produtos, {
    fields: [movimentacoesEstoque.produtoId],
    references: [produtos.id],
  }),
  usuario: one(users, {
    fields: [movimentacoesEstoque.usuarioId],
    references: [users.id],
  }),
}));


/**
 * Mapa Base: Template de produção semanal (último mapa salvo)
 */
export const mapaBase = mysqlTable("mapa_base", {
  id: int("id").autoincrement().primaryKey(),
  produtoId: int("produtoId"),
  codigoProduto: varchar("codigoProduto", { length: 50 }).notNull(),
  nomeProduto: varchar("nomeProduto", { length: 200 }).notNull(),
  unidade: varchar("unidade", { length: 20 }).notNull(),
  quantidade: decimal("quantidade", { precision: 10, scale: 2 }).notNull(),
  percentualAjuste: int("percentualAjuste").default(0).notNull(),
  diaProduzir: int("diaProduzir").notNull(), // 2=Seg, 3=Ter, etc.
  equipe: varchar("equipe", { length: 50 }).default("Equipe 1"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MapaBase = typeof mapaBase.$inferSelect;
export type InsertMapaBase = typeof mapaBase.$inferInsert;

/**
 * Mapa Rascunho: Edições temporárias do mapa de produção atual
 */
export const mapaRascunho = mysqlTable("mapa_rascunho", {
  id: int("id").autoincrement().primaryKey(),
  importacaoId: int("importacaoId").references(() => importacoesV5.id, { onDelete: "cascade" }),
  produtoId: int("produtoId"),
  codigoProduto: varchar("codigoProduto", { length: 50 }).notNull(),
  nomeProduto: varchar("nomeProduto", { length: 200 }).notNull(),
  unidade: varchar("unidade", { length: 20 }).notNull(),
  qtdImportada: decimal("qtdImportada", { precision: 10, scale: 2 }).notNull(),
  percentualAjuste: int("percentualAjuste").default(0).notNull(),
  qtdPlanejada: decimal("qtdPlanejada", { precision: 10, scale: 2 }).notNull(),
  diaProduzir: int("diaProduzir").notNull(),
  equipe: varchar("equipe", { length: 50 }).default("Equipe 1"),
  isReposicao: boolean("isReposicao").default(false),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MapaRascunho = typeof mapaRascunho.$inferSelect;
export type InsertMapaRascunho = typeof mapaRascunho.$inferInsert;

/**
 * Relations para mapa_base
 */
export const mapaBaseRelations = relations(mapaBase, ({ one }) => ({
  produto: one(produtos, {
    fields: [mapaBase.produtoId],
    references: [produtos.id],
  }),
}));

/**
 * Relations para mapa_rascunho
 */
export const mapaRascunhoRelations = relations(mapaRascunho, ({ one }) => ({
  produto: one(produtos, {
    fields: [mapaRascunho.produtoId],
    references: [produtos.id],
  }),
  importacao: one(importacoesV5, {
    fields: [mapaRascunho.importacaoId],
    references: [importacoesV5.id],
  }),
}));
