import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import {
  importacoesV2,
  vendasV2,
  produtos,
  InsertImportacaoV2,
  InsertVendaV2,
} from "../drizzle/schema";

/**
 * Criar nova importação V2
 */
export async function criarImportacaoV2(
  dataReferencia: string,
  usuarioId: number
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(importacoesV2).values({
    dataReferencia,
    usuarioId,
  });

  return result[0].insertId;
}

/**
 * Buscar produto pelo código
 */
export async function getProdutoByCodigo(codigoProduto: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(produtos)
    .where(eq(produtos.codigoProduto, codigoProduto))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Inserir venda V2 (com tratamento de duplicatas)
 */
export async function inserirVendaV2(
  importacaoId: number,
  produtoId: number,
  diaSemana: number,
  quantidade: string,
  unidade: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db.insert(vendasV2).values({
      importacaoId,
      produtoId,
      diaSemana,
      quantidade: quantidade as any,
      unidade: unidade as "kg" | "un",
    });
  } catch (error: any) {
    // Ignorar duplicatas (unique constraint violation)
    if (error.code === "ER_DUP_ENTRY") {
      console.log(
        `[ImportaV2] Duplicata ignorada: produto ${produtoId}, dia ${diaSemana}`
      );
      return;
    }
    throw error;
  }
}

/**
 * Obter mapa de produção por importação
 */
export async function getMapaProducaoV2(importacaoId: number) {
  const db = await getDb();
  if (!db) return [];

  const vendas = await db
    .select()
    .from(vendasV2)
    .where(eq(vendasV2.importacaoId, importacaoId));

  const produtosMap = new Map();

  for (const venda of vendas) {
    const produto = await db
      .select()
      .from(produtos)
      .where(eq(produtos.id, venda.produtoId))
      .limit(1);

    if (produto.length === 0) continue;

    const key = venda.produtoId;
    if (!produtosMap.has(key)) {
      produtosMap.set(key, {
        produtoId: venda.produtoId,
        codigoProduto: produto[0].codigoProduto,
        nomeProduto: produto[0].nome,
        unidade: produto[0].unidade,
        dia2: "0",
        dia3: "0",
        dia4: "0",
        dia5: "0",
        dia6: "0",
        dia7: "0",
      });
    }

    const item = produtosMap.get(key);
    const diaKey = `dia${venda.diaSemana}`;
    if (diaKey in item) {
      item[diaKey] = venda.quantidade.toString();
    }
  }

  return Array.from(produtosMap.values());
}

/**
 * Atualizar quantidade no mapa de produção
 */
export async function atualizarQuantidadeV2(
  importacaoId: number,
  produtoId: number,
  diaSemana: number,
  quantidade: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const quantidadeNum = parseFloat(quantidade);
  await db
    .update(vendasV2)
    .set({ quantidade: quantidadeNum as any })
    .where(
      and(
        eq(vendasV2.importacaoId, importacaoId),
        eq(vendasV2.produtoId, produtoId),
        eq(vendasV2.diaSemana, diaSemana)
      )
    );
}
