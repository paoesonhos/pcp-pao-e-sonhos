import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";
import * as dbImportacoes from "./db-importacoes";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("Importação de Vendas", () => {
  let produtoId: number;
  let categoriaId: number;

  beforeAll(async () => {
    let categorias = await db.listCategorias({ ativo: true });
    
    if (categorias.length === 0) {
      await db.createCategoria({
        nome: "Pães",
        descricao: "Categoria de teste",
        ativo: true,
      });
      categorias = await db.listCategorias({ ativo: true });
    }
    
    categoriaId = categorias[0].id;

    let produtos = await db.listProdutos({ search: "301" });
    
    if (produtos.length === 0) {
      await db.createProduto({
        codigoProduto: "301",
        nome: "PÃO DOCE",
        unidade: "un",
        pesoUnitario: "0.050",
        percentualPerdaLiquida: "0.00",
        shelfLife: 2,
        categoriaId,
        tipoEmbalagem: "Saco plástico",
        quantidadePorEmbalagem: 10,
        ativo: true,
      });
      produtos = await db.listProdutos({ search: "301" });
    }
    
    produtoId = produtos[0].id;
  });

  it("deve validar que data de referência do histórico seja segunda-feira", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const csvSegQua = `id,Produto,unidade de medida,segunda-feira,terça-feira,quarta-feira
301,PÃO DOCE,un,10.20,8.16,4.08`;

    const csvQuiSab = `id,Produto,unidade de medida,quinta-feira,sexta-feira,sábado
301,PÃO DOCE,un,3.60,2.88,1.44`;

    await expect(
      caller.importacoes.importar({
        dataReferenciaHistorico: "2026-01-07",
        dataReferenciaPlanejamento: "2026-01-12",
        arquivoSegQua: csvSegQua,
        arquivoQuiSab: csvQuiSab,
      })
    ).rejects.toThrow("Data de referência do histórico deve ser uma segunda-feira");
  });

  it("deve validar que data de referência do planejamento seja segunda-feira", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const csvSegQua = `id,Produto,unidade de medida,segunda-feira,terça-feira,quarta-feira
301,PÃO DOCE,un,10.20,8.16,4.08`;

    const csvQuiSab = `id,Produto,unidade de medida,quinta-feira,sexta-feira,sábado
301,PÃO DOCE,un,3.60,2.88,1.44`;

    await expect(
      caller.importacoes.importar({
        dataReferenciaHistorico: "2026-01-12",
        dataReferenciaPlanejamento: "2026-01-14",
        arquivoSegQua: csvSegQua,
        arquivoQuiSab: csvQuiSab,
      })
    ).rejects.toThrow("Data de referência do planejamento deve ser uma segunda-feira");
  });

  it("deve rejeitar CSV vazio", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.importacoes.importar({
        dataReferenciaHistorico: "2026-01-12",
        dataReferenciaPlanejamento: "2026-01-19",
        arquivoSegQua: "",
        arquivoQuiSab: "id,Produto,unidade de medida,quinta-feira,sexta-feira,sábado",
      })
    ).rejects.toThrow("Arquivo CSV vazio ou inválido");
  });

  it("deve rejeitar produto não encontrado", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const csvSegQua = `id,Produto,unidade de medida,segunda-feira,terça-feira,quarta-feira
999,PRODUTO INEXISTENTE,un,10.20,8.16,4.08`;

    const csvQuiSab = `id,Produto,unidade de medida,quinta-feira,sexta-feira,sábado
301,PÃO DOCE,un,3.60,2.88,1.44`;

    await expect(
      caller.importacoes.importar({
        dataReferenciaHistorico: "2026-01-12",
        dataReferenciaPlanejamento: "2026-01-19",
        arquivoSegQua: csvSegQua,
        arquivoQuiSab: csvQuiSab,
      })
    ).rejects.toThrow("produto não encontrado");
  });

  it("deve rejeitar unidade de medida inválida", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const csvSegQua = `id,Produto,unidade de medida,segunda-feira,terça-feira,quarta-feira
301,PÃO DOCE,litros,10.20,8.16,4.08`;

    const csvQuiSab = `id,Produto,unidade de medida,quinta-feira,sexta-feira,sábado
301,PÃO DOCE,un,3.60,2.88,1.44`;

    await expect(
      caller.importacoes.importar({
        dataReferenciaHistorico: "2026-01-12",
        dataReferenciaPlanejamento: "2026-01-19",
        arquivoSegQua: csvSegQua,
        arquivoQuiSab: csvQuiSab,
      })
    ).rejects.toThrow("unidade de medida inválida");
  });

  it("deve importar vendas e gerar mapa de produção com sucesso", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const csvSegQua = `id,Produto,unidade de medida,segunda-feira,terça-feira,quarta-feira
301,PÃO DOCE,un,10,8,4`;

    const csvQuiSab = `id,Produto,unidade de medida,quinta-feira,sexta-feira,sábado
301,PÃO DOCE,un,3,2,1`;

    const result = await caller.importacoes.importar({
      dataReferenciaHistorico: "2026-01-12",
      dataReferenciaPlanejamento: "2026-01-19",
      arquivoSegQua: csvSegQua,
      arquivoQuiSab: csvQuiSab,
    });

    expect(result.success).toBe(true);
    expect(result.importacaoId).toBeGreaterThan(0);
    expect(result.totalVendas).toBe(6);
    expect(result.totalMapaProducao).toBe(6);

    const mapa = await dbImportacoes.getMapaProducaoByImportacao(result.importacaoId);
    expect(mapa.length).toBe(6);

    const segunda = mapa.find((m) => m.diaSemana === 1);
    expect(segunda?.quantidadePlanejada).toBe("10.00000");
  });

  it("deve atualizar quantidade planejada no mapa", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const csvSegQua = `id,Produto,unidade de medida,segunda-feira,terça-feira,quarta-feira
301,PÃO DOCE,un,10,8,4`;

    const csvQuiSab = `id,Produto,unidade de medida,quinta-feira,sexta-feira,sábado
301,PÃO DOCE,un,3,2,1`;

    const importResult = await caller.importacoes.importar({
      dataReferenciaHistorico: "2026-01-12",
      dataReferenciaPlanejamento: "2026-01-19",
      arquivoSegQua: csvSegQua,
      arquivoQuiSab: csvQuiSab,
    });

    const mapa = await dbImportacoes.getMapaProducaoByImportacao(importResult.importacaoId);
    const itemSegunda = mapa.find((m) => m.diaSemana === 1);

    expect(itemSegunda).toBeDefined();

    const updateResult = await caller.mapaProducao.updateQuantidade({
      id: itemSegunda!.id,
      quantidadePlanejada: "15.50000",
    });

    expect(updateResult.success).toBe(true);

    const mapaAtualizado = await dbImportacoes.getMapaProducaoByImportacao(importResult.importacaoId);
    const itemAtualizado = mapaAtualizado.find((m) => m.diaSemana === 1);
    expect(itemAtualizado?.quantidadePlanejada).toBe("15.50000");
  });
});
