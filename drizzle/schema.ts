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

/**
 * Importações de vendas históricas
 * Armazena metadados da importação bipartida (2 arquivos CSV)
 */
export const importacoesVendas = mysqlTable("importacoes_vendas", {
  id: int("id").autoincrement().primaryKey(),
  dataReferenciaHistorico: timestamp("dataReferenciaHistorico").notNull(), // Segunda-feira da semana histórica
  dataReferenciaPlanejamento: timestamp("dataReferenciaPlanejamento").notNull(), // Segunda-feira da semana planejada
  usuarioId: int("usuarioId").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  historicoIdx: index("historico_idx").on(table.dataReferenciaHistorico),
  planejamentoIdx: index("planejamento_idx").on(table.dataReferenciaPlanejamento),
}));

export type ImportacaoVendas = typeof importacoesVendas.$inferSelect;
export type InsertImportacaoVendas = typeof importacoesVendas.$inferInsert;

/**
 * Vendas históricas importadas dos arquivos CSV
 * Chave única: codigo_produto + data_venda
 */
export const vendasHistorico = mysqlTable("vendas_historico", {
  id: int("id").autoincrement().primaryKey(),
  importacaoId: int("importacaoId").notNull().references(() => importacoesVendas.id, { onDelete: "cascade" }),
  produtoId: int("produtoId").notNull().references(() => produtos.id),
  dataVenda: timestamp("dataVenda").notNull(), // Data específica da venda (seg, ter, qua, qui, sex, sab)
  quantidade: decimal("quantidade", { precision: 10, scale: 5 }).notNull(),
  unidade: mysqlEnum("unidade", ["kg", "un"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  importacaoIdx: index("venda_importacao_idx").on(table.importacaoId),
  produtoIdx: index("venda_produto_idx").on(table.produtoId),
  dataIdx: index("venda_data_idx").on(table.dataVenda),
  uniqueVenda: unique("unique_produto_data").on(table.produtoId, table.dataVenda),
}));

export type VendaHistorico = typeof vendasHistorico.$inferSelect;
export type InsertVendaHistorico = typeof vendasHistorico.$inferInsert;

/**
 * Mapa de produção planejado
 * Gerado a partir das vendas históricas, editável pelo usuário
 */
export const mapaProducao = mysqlTable("mapa_producao", {
  id: int("id").autoincrement().primaryKey(),
  importacaoId: int("importacaoId").notNull().references(() => importacoesVendas.id, { onDelete: "cascade" }),
  produtoId: int("produtoId").notNull().references(() => produtos.id),
  diaSemana: int("diaSemana").notNull(), // 0=Domingo, 1=Segunda, 2=Terça, ..., 6=Sábado
  dataPlanejada: timestamp("dataPlanejada").notNull(), // Data específica do dia planejado
  quantidadePlanejada: decimal("quantidadePlanejada", { precision: 10, scale: 5 }).notNull(),
  unidade: mysqlEnum("unidade", ["kg", "un"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  importacaoIdx: index("mapa_importacao_idx").on(table.importacaoId),
  produtoIdx: index("mapa_produto_idx").on(table.produtoId),
  diaIdx: index("mapa_dia_idx").on(table.diaSemana),
  uniqueMapa: unique("unique_mapa_produto_dia").on(table.importacaoId, table.produtoId, table.diaSemana),
}));

export type MapaProducao = typeof mapaProducao.$inferSelect;
export type InsertMapaProducao = typeof mapaProducao.$inferInsert;

/**
 * Relations para importações
 */
export const importacoesVendasRelations = relations(importacoesVendas, ({ one, many }) => ({
  usuario: one(users, {
    fields: [importacoesVendas.usuarioId],
    references: [users.id],
  }),
  vendas: many(vendasHistorico),
  mapa: many(mapaProducao),
}));

export const vendasHistoricoRelations = relations(vendasHistorico, ({ one }) => ({
  importacao: one(importacoesVendas, {
    fields: [vendasHistorico.importacaoId],
    references: [importacoesVendas.id],
  }),
  produto: one(produtos, {
    fields: [vendasHistorico.produtoId],
    references: [produtos.id],
  }),
}));

export const mapaProducaoRelations = relations(mapaProducao, ({ one }) => ({
  importacao: one(importacoesVendas, {
    fields: [mapaProducao.importacaoId],
    references: [importacoesVendas.id],
  }),
  produto: one(produtos, {
    fields: [mapaProducao.produtoId],
    references: [produtos.id],
  }),
}));
