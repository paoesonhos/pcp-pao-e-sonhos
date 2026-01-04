import { eq, and, like, or, desc, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, categorias, insumos, produtos, fichaTecnica, blocos, Categoria, InsertCategoria, Insumo, InsertInsumo, Produto, InsertProduto, FichaTecnica, InsertFichaTecnica, Bloco, InsertBloco } from "../drizzle/schema";
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

  let conditions = [eq(produtos.codigoProduto, codigo)];
  if (excludeId) {
    const result = await db
      .select()
      .from(produtos)
      .where(and(conditions[0], eq(produtos.id, excludeId)))
      .limit(1);
    return result.length > 0;
  }

  const result = await db.select().from(produtos).where(conditions[0]).limit(1);
  return result.length > 0;
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
