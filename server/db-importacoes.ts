import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import {
  importacoesVendas,
  vendasHistorico,
  mapaProducao,
  produtos,
  InsertImportacaoVendas,
  InsertVendaHistorico,
  InsertMapaProducao,
} from "../drizzle/schema";

/**
 * Criar nova importação de vendas
 */
export async function createImportacao(data: InsertImportacaoVendas) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(importacoesVendas).values(data);
  return result[0].insertId;
}

/**
 * Inserir vendas históricas em lote
 */
export async function insertVendasHistorico(vendas: InsertVendaHistorico[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (vendas.length === 0) return;

  await db.insert(vendasHistorico).values(vendas);
}

/**
 * Inserir mapa de produção em lote
 */
export async function insertMapaProducao(mapas: InsertMapaProducao[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (mapas.length === 0) return;

  await db.insert(mapaProducao).values(mapas);
}

/**
 * Listar todas as importações
 */
export async function listImportacoes() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(importacoesVendas)
    .orderBy(importacoesVendas.createdAt);
}

/**
 * Obter importação por ID
 */
export async function getImportacaoById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(importacoesVendas)
    .where(eq(importacoesVendas.id, id))
    .limit(1);

  return result[0];
}

/**
 * Obter mapa de produção por importação ID
 */
export async function getMapaProducaoByImportacao(importacaoId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select({
      id: mapaProducao.id,
      importacaoId: mapaProducao.importacaoId,
      produtoId: mapaProducao.produtoId,
      diaSemana: mapaProducao.diaSemana,
      dataPlanejada: mapaProducao.dataPlanejada,
      quantidadePlanejada: mapaProducao.quantidadePlanejada,
      unidade: mapaProducao.unidade,
      codigoProduto: produtos.codigoProduto,
      nomeProduto: produtos.nome,
      categoriaId: produtos.categoriaId,
    })
    .from(mapaProducao)
    .innerJoin(produtos, eq(mapaProducao.produtoId, produtos.id))
    .where(eq(mapaProducao.importacaoId, importacaoId))
    .orderBy(produtos.codigoProduto, mapaProducao.diaSemana);
}

/**
 * Atualizar quantidade planejada no mapa de produção
 */
export async function updateQuantidadePlanejada(
  id: number,
  quantidadePlanejada: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(mapaProducao)
    .set({ quantidadePlanejada })
    .where(eq(mapaProducao.id, id));
}

/**
 * Buscar produto por código
 */
export async function getProdutoByCodigo(codigoProduto: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(produtos)
    .where(eq(produtos.codigoProduto, codigoProduto))
    .limit(1);

  return result[0];
}

/**
 * Deletar importação (cascade deleta vendas e mapa)
 */
export async function deleteImportacao(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(importacoesVendas).where(eq(importacoesVendas.id, id));
}
