import { describe, it, expect } from "vitest";
import * as dbImportacoesV2 from "./db-importacoes-v2";

describe("ImportacoesV2", () => {
  // Usar produto existente no banco (código 302)
  const produtoTestId = 2; // ID do produto com código 302

  it("deve criar uma importação V2", async () => {
    const importacaoId = await dbImportacoesV2.criarImportacaoV2(
      "2025-01-06",
      1
    );

    expect(importacaoId).toBeGreaterThan(0);
  });

  it("deve buscar produto pelo código", async () => {
    const produto = await dbImportacoesV2.getProdutoByCodigo("302");

    expect(produto).toBeDefined();
    expect(produto?.codigoProduto).toBe("302");
  });

  it("deve retornar undefined para produto inexistente", async () => {
    const produto = await dbImportacoesV2.getProdutoByCodigo("INEXISTENTE");

    expect(produto).toBeUndefined();
  });

  it("deve inserir venda V2", async () => {
    const importacaoId = await dbImportacoesV2.criarImportacaoV2(
      "2025-01-06",
      1
    );

    await dbImportacoesV2.inserirVendaV2(
      importacaoId,
      produtoTestId,
      2,
      "10.5",
      "un"
    );

    const mapa = await dbImportacoesV2.getMapaProducaoV2(importacaoId);

    expect(mapa.length).toBeGreaterThan(0);
    expect(mapa[0]?.dia2).toContain("10.5");
  });

  it("deve atualizar quantidade no mapa", async () => {
    const importacaoId = await dbImportacoesV2.criarImportacaoV2(
      "2025-01-06",
      1
    );

    await dbImportacoesV2.inserirVendaV2(
      importacaoId,
      produtoTestId,
      3,
      "5.0",
      "un"
    );

    await dbImportacoesV2.atualizarQuantidadeV2(
      importacaoId,
      produtoTestId,
      3,
      "15.5"
    );

    const mapa = await dbImportacoesV2.getMapaProducaoV2(importacaoId);

    expect(mapa[0]?.dia3).toContain("15.5");
  });

  it("deve obter mapa de produção com múltiplos dias", async () => {
    const importacaoId = await dbImportacoesV2.criarImportacaoV2(
      "2025-01-06",
      1
    );

    // Inserir vendas para dias 2, 3, 4
    await dbImportacoesV2.inserirVendaV2(
      importacaoId,
      produtoTestId,
      2,
      "10.0",
      "un"
    );
    await dbImportacoesV2.inserirVendaV2(
      importacaoId,
      produtoTestId,
      3,
      "12.5",
      "un"
    );
    await dbImportacoesV2.inserirVendaV2(
      importacaoId,
      produtoTestId,
      4,
      "8.0",
      "un"
    );

    const mapa = await dbImportacoesV2.getMapaProducaoV2(importacaoId);

    expect(mapa.length).toBe(1);
    expect(mapa[0]?.dia2).toContain("10");
    expect(mapa[0]?.dia3).toContain("12.5");
    expect(mapa[0]?.dia4).toContain("8");
  });
});
