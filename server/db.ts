import { eq, and, like, or, desc, asc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, categorias, insumos, produtos, fichaTecnica, blocos, destinos, movimentacoesEstoque, mapaBase, mapaRascunho, Categoria, InsertCategoria, Insumo, InsertInsumo, Produto, InsertProduto, FichaTecnica, InsertFichaTecnica, Bloco, InsertBloco, Destino, InsertDestino, MovimentacaoEstoque, InsertMovimentacaoEstoque, MapaBase, InsertMapaBase, MapaRascunho, InsertMapaRascunho } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ==================== CATEGORIAS ====================

export async function listCategorias(filters?: { ativo?: boolean; search?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let conditions = [];
  if (filters?.ativo !== undefined) {
    conditions.push(eq(categorias.ativo, filters.ativo));
  }
  if (filters?.search) {
    conditions.push(like(categorias.nome, `%${filters.search}%`));
  }

  const result = await db
    .select()
    .from(categorias)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(categorias.nome));

  return result;
}

export async function getCategoriaById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(categorias).where(eq(categorias.id, id)).limit(1);
  return result[0];
}

export async function createCategoria(data: InsertCategoria) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(categorias).values(data);
  return result;
}

export async function updateCategoria(id: number, data: Partial<InsertCategoria>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(categorias).set(data).where(eq(categorias.id, id));
}

export async function toggleCategoria(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const categoria = await getCategoriaById(id);
  if (!categoria) throw new Error("Categoria not found");

  await db.update(categorias).set({ ativo: !categoria.ativo }).where(eq(categorias.id, id));
}

// ==================== INSUMOS ====================

export async function listInsumos(filters?: { ativo?: boolean; search?: string; tipo?: "seco" | "molhado" }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let conditions = [];
  if (filters?.ativo !== undefined) {
    conditions.push(eq(insumos.ativo, filters.ativo));
  }
  if (filters?.tipo) {
    conditions.push(eq(insumos.tipo, filters.tipo));
  }
  if (filters?.search) {
    conditions.push(
      or(
        like(insumos.codigoInsumo, `%${filters.search}%`),
        like(insumos.nome, `%${filters.search}%`)
      )
    );
  }

  const result = await db
    .select()
    .from(insumos)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(insumos.codigoInsumo));

  return result;
}

export async function getInsumoById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(insumos).where(eq(insumos.id, id)).limit(1);
  return result[0];
}

export async function checkInsumoCodigoExists(codigo: string, excludeId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = [eq(insumos.codigoInsumo, codigo)];
  if (excludeId) {
    conditions.push(eq(insumos.id, excludeId));
  }

  const result = await db
    .select()
    .from(insumos)
    .where(excludeId ? and(conditions[0], eq(insumos.id, excludeId)) : conditions[0])
    .limit(1);

  return result.length > 0;
}

export async function createInsumo(data: InsertInsumo) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(insumos).values(data);
  return result;
}

export async function updateInsumo(id: number, data: Partial<InsertInsumo>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(insumos).set(data).where(eq(insumos.id, id));
}

export async function toggleInsumo(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const insumo = await getInsumoById(id);
  if (!insumo) throw new Error("Insumo not found");

  await db.update(insumos).set({ ativo: !insumo.ativo }).where(eq(insumos.id, id));
}

// ==================== PRODUTOS ====================

export async function listProdutos(filters?: { ativo?: boolean; search?: string; categoriaId?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let conditions = [];
  if (filters?.ativo !== undefined) {
    conditions.push(eq(produtos.ativo, filters.ativo));
  }
  if (filters?.categoriaId) {
    conditions.push(eq(produtos.categoriaId, filters.categoriaId));
  }
  if (filters?.search) {
    conditions.push(
      or(
        like(produtos.codigoProduto, `%${filters.search}%`),
        like(produtos.nome, `%${filters.search}%`)
      )
    );
  }

  const result = await db
    .select()
    .from(produtos)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(produtos.codigoProduto));

  return result;
}

export async function getProdutoById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(produtos).where(eq(produtos.id, id)).limit(1);
  return result[0];
}

export async function checkProdutoCodigoExists(codigo: string, excludeId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Buscar produtos com o mesmo código
  const result = await db
    .select()
    .from(produtos)
    .where(eq(produtos.codigoProduto, codigo))
    .limit(1);

  // Se não encontrou nenhum, não existe duplicata
  if (result.length === 0) return false;

  // Se encontrou e temos excludeId, verificar se é o mesmo produto
  if (excludeId && result[0].id === excludeId) {
    return false; // É o próprio produto, não é duplicata
  }

  return true; // Existe outro produto com o mesmo código
}

export async function createProduto(data: InsertProduto) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(produtos).values(data);
  return result;
}

export async function updateProduto(id: number, data: Partial<InsertProduto>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // IMPORTANTE: pesoUnitario não deve ser atualizado após criação
  const { pesoUnitario, ...updateData } = data;

  await db.update(produtos).set(updateData).where(eq(produtos.id, id));
}

export async function toggleProduto(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const produto = await getProdutoById(id);
  if (!produto) throw new Error("Produto not found");

  await db.update(produtos).set({ ativo: !produto.ativo }).where(eq(produtos.id, id));
}

// ==================== FICHA TÉCNICA ====================

export async function getFichaTecnicaByProduto(produtoId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(fichaTecnica)
    .where(eq(fichaTecnica.produtoId, produtoId))
    .orderBy(asc(fichaTecnica.nivel), asc(fichaTecnica.ordem));

  return result;
}

export async function createFichaTecnicaItem(data: InsertFichaTecnica) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(fichaTecnica).values(data);
  return result;
}

export async function updateFichaTecnicaItem(id: number, data: Partial<InsertFichaTecnica>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(fichaTecnica).set(data).where(eq(fichaTecnica.id, id));
}

export async function deleteFichaTecnicaItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(fichaTecnica).where(eq(fichaTecnica.id, id));
}

export async function getFichaTecnicaItemById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(fichaTecnica).where(eq(fichaTecnica.id, id)).limit(1);
  return result[0];
}

// ==================== BLOCOS ====================

export async function getBlocoByProduto(produtoId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(blocos).where(eq(blocos.produtoId, produtoId)).limit(1);
  return result[0];
}

export async function createBloco(data: InsertBloco) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(blocos).values(data);
  return result;
}

export async function updateBloco(id: number, data: Partial<InsertBloco>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(blocos).set(data).where(eq(blocos.id, id));
}

export async function deleteBloco(produtoId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(blocos).where(eq(blocos.produtoId, produtoId));
}

// ==================== DESTINOS ====================

export async function listDestinos(filters?: { ativo?: boolean; search?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let conditions = [];
  if (filters?.ativo !== undefined) {
    conditions.push(eq(destinos.ativo, filters.ativo));
  }
  if (filters?.search) {
    conditions.push(like(destinos.nome, `%${filters.search}%`));
  }

  const result = await db
    .select()
    .from(destinos)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(destinos.nome));

  return result;
}

export async function getDestinoById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(destinos).where(eq(destinos.id, id)).limit(1);
  return result[0];
}

export async function createDestino(data: InsertDestino) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(destinos).values(data);
  return result;
}

export async function updateDestino(id: number, data: Partial<InsertDestino>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(destinos).set(data).where(eq(destinos.id, id));
}

export async function toggleDestino(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const destino = await getDestinoById(id);
  if (!destino) throw new Error("Destino not found");

  await db.update(destinos).set({ ativo: !destino.ativo }).where(eq(destinos.id, id));
}

// ==================== EXPEDIÇÃO / ESTOQUE ====================

export async function getProdutosParaExpedicao(destinoNomes: string[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Buscar IDs dos destinos pelos nomes
  const destinosResult = await db
    .select()
    .from(destinos)
    .where(and(
      eq(destinos.ativo, true),
      sql`${destinos.nome} IN (${sql.join(destinoNomes.map(n => sql`${n}`), sql`, `)})`
    ));

  if (destinosResult.length === 0) return [];

  const destinoIds = destinosResult.map(d => d.id);

  // Buscar produtos com esses destinos
  const result = await db
    .select()
    .from(produtos)
    .where(and(
      eq(produtos.ativo, true),
      sql`${produtos.destinoId} IN (${sql.join(destinoIds.map(id => sql`${id}`), sql`, `)})`
    ))
    .orderBy(asc(produtos.codigoProduto));

  return result;
}

export async function atualizarSaldoEstoque(produtoId: number, quantidade: number, tipo: 'entrada' | 'saida', motivo: string, usuarioId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Registrar movimentação
  await db.insert(movimentacoesEstoque).values({
    produtoId,
    tipo,
    quantidade: quantidade.toFixed(5),
    motivo,
    usuarioId,
  });

  // Atualizar saldo do produto
  const produto = await getProdutoById(produtoId);
  if (!produto) throw new Error("Produto not found");

  const saldoAtual = parseFloat(produto.saldoEstoque || '0');
  const novoSaldo = tipo === 'entrada' 
    ? saldoAtual + quantidade 
    : Math.max(0, saldoAtual - quantidade);

  await db.update(produtos)
    .set({ saldoEstoque: novoSaldo.toFixed(5) })
    .where(eq(produtos.id, produtoId));

  return novoSaldo;
}

export async function getMovimentacoesEstoque(produtoId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let conditions = [];
  if (produtoId) {
    conditions.push(eq(movimentacoesEstoque.produtoId, produtoId));
  }

  const result = await db
    .select()
    .from(movimentacoesEstoque)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(movimentacoesEstoque.createdAt));

  return result;
}

export async function atualizarSaldoEstoqueDireto(produtoId: number, novoSaldo: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(produtos)
    .set({ saldoEstoque: novoSaldo.toFixed(5) })
    .where(eq(produtos.id, produtoId));
}

// ==================== MAPA BASE (TEMPLATE) ====================

export async function getMapaBase() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({
      id: mapaBase.id,
      produtoId: mapaBase.produtoId,
      codigoProduto: mapaBase.codigoProduto,
      nomeProduto: mapaBase.nomeProduto,
      unidade: mapaBase.unidade,
      quantidade: mapaBase.quantidade,
      percentualAjuste: mapaBase.percentualAjuste,
      diaProduzir: mapaBase.diaProduzir,
      equipe: mapaBase.equipe,
    })
    .from(mapaBase)
    .orderBy(asc(mapaBase.diaProduzir), asc(mapaBase.nomeProduto));

  return result;
}

export async function salvarMapaBase(itens: { produtoId: number; codigoProduto: string; nomeProduto: string; unidade: string; quantidade: string; percentualAjuste: number; diaProduzir: number; equipe: string }[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Limpar mapa base anterior
  await db.delete(mapaBase);

  // Inserir novos itens
  if (itens.length > 0) {
    await db.insert(mapaBase).values(itens.map(item => ({
      produtoId: item.produtoId || null,
      codigoProduto: item.codigoProduto,
      nomeProduto: item.nomeProduto,
      unidade: item.unidade,
      quantidade: item.quantidade,
      percentualAjuste: item.percentualAjuste,
      diaProduzir: item.diaProduzir,
      equipe: item.equipe || "Equipe 1",
    })));
  }

  return { success: true };
}

// ==================== MAPA RASCUNHO ====================

export async function getMapaRascunho() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({
      id: mapaRascunho.id,
      importacaoId: mapaRascunho.importacaoId,
      produtoId: mapaRascunho.produtoId,
      qtdImportada: mapaRascunho.qtdImportada,
      percentualAjuste: mapaRascunho.percentualAjuste,
      qtdPlanejada: mapaRascunho.qtdPlanejada,
      diaProduzir: mapaRascunho.diaProduzir,
      equipe: mapaRascunho.equipe,
      isReposicao: mapaRascunho.isReposicao,
      codigoProduto: produtos.codigoProduto,
      nomeProduto: produtos.nome,
      unidade: produtos.unidade,
    })
    .from(mapaRascunho)
    .innerJoin(produtos, eq(mapaRascunho.produtoId, produtos.id))
    .orderBy(asc(mapaRascunho.diaProduzir), asc(produtos.nome));

  return result;
}

export async function salvarMapaRascunho(importacaoId: number | null, itens: { produtoId: number; codigoProduto: string; nomeProduto: string; unidade: string; qtdImportada: string; percentualAjuste: number; qtdPlanejada: string; diaProduzir: number; equipe: string; isReposicao?: boolean }[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Limpar rascunho anterior
  await db.delete(mapaRascunho);

  // Inserir novos itens
  if (itens.length > 0) {
    await db.insert(mapaRascunho).values(itens.map(item => ({
      importacaoId: importacaoId,
      produtoId: item.produtoId || null,
      codigoProduto: item.codigoProduto,
      nomeProduto: item.nomeProduto,
      unidade: item.unidade,
      qtdImportada: item.qtdImportada,
      percentualAjuste: item.percentualAjuste,
      qtdPlanejada: item.qtdPlanejada,
      diaProduzir: item.diaProduzir,
      equipe: item.equipe || "Equipe 1",
      isReposicao: item.isReposicao || false,
    })));
  }

  return { success: true };
}

export async function limparMapaRascunho() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(mapaRascunho);
  return { success: true };
}

export async function hasMapaBase() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select({ count: sql<number>`count(*)` }).from(mapaBase);
  return result[0]?.count > 0;
}

export async function hasMapaRascunho() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select({ count: sql<number>`count(*)` }).from(mapaRascunho);
  return result[0]?.count > 0;
}
