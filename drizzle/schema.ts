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
  tipoEmbalagem: varchar("tipoEmbalagem", { length: 100 }).notNull(),
  quantidadePorEmbalagem: int("quantidadePorEmbalagem").notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  codigoIdx: index("codigo_produto_idx").on(table.codigoProduto),
  categoriaIdx: index("categoria_idx").on(table.categoriaId),
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
  fichaTecnica: many(fichaTecnica),
  blocos: many(blocos),
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
 * Importacoes V3: Versao simplificada com upload unico
 */
export const importacoesV3 = mysqlTable("importacoes_v3", {
  id: int("id").autoincrement().primaryKey(),
  dataReferencia: varchar("dataReferencia", { length: 50 }).notNull(),
  usuarioId: int("usuarioId").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ImportacaoV3 = typeof importacoesV3.$inferSelect;
export type InsertImportacaoV3 = typeof importacoesV3.$inferInsert;

/**
 * Vendas V3: Dados de vendas simples com todos os dias em colunas
 */
export const vendasV3 = mysqlTable("vendas_v3", {
  id: int("id").autoincrement().primaryKey(),
  importacaoId: int("importacaoId").notNull().references(() => importacoesV3.id, { onDelete: "cascade" }),
  codigoProduto: varchar("codigoProduto", { length: 50 }).notNull(),
  nomeProduto: varchar("nomeProduto", { length: 200 }).notNull(),
  unidade: mysqlEnum("unidade", ["kg", "un"]).notNull(),
  dia2: decimal("dia2", { precision: 10, scale: 5 }).default("0"),
  dia3: decimal("dia3", { precision: 10, scale: 5 }).default("0"),
  dia4: decimal("dia4", { precision: 10, scale: 5 }).default("0"),
  dia5: decimal("dia5", { precision: 10, scale: 5 }).default("0"),
  dia6: decimal("dia6", { precision: 10, scale: 5 }).default("0"),
  dia7: decimal("dia7", { precision: 10, scale: 5 }).default("0"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  importacaoIdx: index("venda_v3_importacao_idx").on(table.importacaoId),
  codigoIdx: index("venda_v3_codigo_idx").on(table.codigoProduto),
}));

export type VendaV3 = typeof vendasV3.$inferSelect;
export type InsertVendaV3 = typeof vendasV3.$inferInsert;

/**
 * Relations para importacoes V3
 */
export const importacoesV3Relations = relations(importacoesV3, ({ one, many }) => ({
  usuario: one(users, {
    fields: [importacoesV3.usuarioId],
    references: [users.id],
  }),
  vendas: many(vendasV3),
}));

export const vendasV3Relations = relations(vendasV3, ({ one }) => ({
  importacao: one(importacoesV3, {
    fields: [vendasV3.importacaoId],
    references: [importacoesV3.id],
  }),
}));
