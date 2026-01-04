import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, index, unique } from "drizzle-orm/mysql-core";
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
 * Produtos finais produzidos pela padaria
 */
export const produtos = mysqlTable("produtos", {
  id: int("id").autoincrement().primaryKey(),
  codigoProduto: varchar("codigoProduto", { length: 50 }).notNull().unique(),
  nome: varchar("nome", { length: 200 }).notNull(),
  unidade: mysqlEnum("unidade", ["kg", "un"]).notNull(),
  pesoUnitario: decimal("pesoUnitario", { precision: 10, scale: 5 }).notNull(), // IMUTÁVEL após criação
  percentualPerdaLiquida: decimal("percentualPerdaLiquida", { precision: 5, scale: 2 }),
  shelfLife: int("shelfLife"), // Dias de validade
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
 * Ficha técnica - relaciona produtos com seus componentes
 * Suporta até 2 níveis de hierarquia:
 * - Nível 1: ingredientes diretos, sub-receitas (massa base)
 * - Nível 2: sub-blocos dentro de sub-receitas
 */
export const fichaTecnica = mysqlTable("ficha_tecnica", {
  id: int("id").autoincrement().primaryKey(),
  produtoId: int("produtoId").notNull().references(() => produtos.id, { onDelete: "cascade" }),
  componenteId: int("componenteId").notNull(), // ID do Insumo ou Produto
  tipoComponente: mysqlEnum("tipoComponente", ["ingrediente", "massa_base", "sub_bloco"]).notNull(),
  quantidadeBase: decimal("quantidadeBase", { precision: 10, scale: 5 }).notNull(),
  unidade: mysqlEnum("unidade", ["kg", "un"]).notNull(),
  receitaMinima: decimal("receitaMinima", { precision: 10, scale: 5 }),
  ordem: int("ordem").default(0).notNull(),
  nivel: int("nivel").default(1).notNull(), // 1 ou 2
  paiId: int("paiId").references((): any => fichaTecnica.id, { onDelete: "cascade" }), // Para sub-blocos (nível 2)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  produtoIdx: index("produto_idx").on(table.produtoId),
  componenteIdx: index("componente_idx").on(table.componenteId, table.tipoComponente),
  paiIdx: index("pai_idx").on(table.paiId),
}));

export type FichaTecnica = typeof fichaTecnica.$inferSelect;
export type InsertFichaTecnica = typeof fichaTecnica.$inferInsert;

/**
 * Configuração de blocos da divisora
 * Apenas para produtos com unidade = 'un'
 */
export const blocos = mysqlTable("blocos", {
  id: int("id").autoincrement().primaryKey(),
  produtoId: int("produtoId").notNull().unique().references(() => produtos.id, { onDelete: "cascade" }),
  unidadesPorBloco: int("unidadesPorBloco").default(30).notNull(),
  pesoBloco: decimal("pesoBloco", { precision: 10, scale: 5 }).notNull(), // Peso total do bloco em kg
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  produtoIdx: index("bloco_produto_idx").on(table.produtoId),
}));

export type Bloco = typeof blocos.$inferSelect;
export type InsertBloco = typeof blocos.$inferInsert;

/**
 * Relations para queries mais eficientes
 */
export const produtosRelations = relations(produtos, ({ one, many }) => ({
  categoria: one(categorias, {
    fields: [produtos.categoriaId],
    references: [categorias.id],
  }),
  fichaTecnica: many(fichaTecnica),
  bloco: one(blocos, {
    fields: [produtos.id],
    references: [blocos.produtoId],
  }),
}));

export const categoriasRelations = relations(categorias, ({ many }) => ({
  produtos: many(produtos),
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
