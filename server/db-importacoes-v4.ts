import { getDb } from "./db";
import { importacoesV4, vendasV4 } from "../drizzle/schema";
import { eq } from "drizzle-orm";

interface VendaV4Row {
  codigoProduto: string;
  nomeProduto: string;
  unidadeMedida: "kg" | "un";
  dia2: number;
  dia3: number;
  dia4: number;
  dia5: number;
  dia6: number;
  dia7: number;
}

/**
 * Parser robusto para CSV V4
 * Trata: vírgulas como separador decimal, aspas, valores vazios
 */
export function parseCSVV4(csvContent: string): { vendas: VendaV4Row[]; erros: string[] } {
  const vendas: VendaV4Row[] = [];
  const erros: string[] = [];
  const linhas = csvContent.trim().split("\n");

  // Pular cabeçalho
  for (let i = 1; i < linhas.length; i++) {
    const linha = linhas[i].trim();
    if (!linha) continue;

    try {
      // Parser simples que trata aspas e vírgulas
      const valores = parseCSVLine(linha);
      
      if (valores.length < 10) {
        erros.push(`Linha ${i + 1}: Número insuficiente de colunas`);
        continue;
      }

      const codigoProduto = valores[0]?.trim() || "";
      const nomeProduto = valores[1]?.trim() || "";
      const unidadeMedida = (valores[3]?.trim() || "kg").toLowerCase() as "kg" | "un";

      if (!codigoProduto || !nomeProduto) {
        erros.push(`Linha ${i + 1}: Código ou nome do produto vazio`);
        continue;
      }

      // Converter valores com vírgula para ponto
      const converterValor = (val: string): number => {
        if (!val || val.trim() === "") return 0;
        const numStr = val.trim().replace(/"/g, "").replace(",", ".");
        const num = parseFloat(numStr);
        return isNaN(num) ? 0 : num;
      };

      const venda: VendaV4Row = {
        codigoProduto,
        nomeProduto,
        unidadeMedida,
        dia2: converterValor(valores[4]),
        dia3: converterValor(valores[5]),
        dia4: converterValor(valores[6]),
        dia5: converterValor(valores[7]),
        dia6: converterValor(valores[8]),
        dia7: converterValor(valores[9]),
      };

      vendas.push(venda);
    } catch (error: any) {
      erros.push(`Linha ${i + 1}: ${error.message}`);
    }
  }

  return { vendas, erros };
}

/**
 * Parser de linha CSV que trata aspas e vírgulas
 */
function parseCSVLine(line: string): string[] {
  const resultado: string[] = [];
  let atual = "";
  let dentroAspas = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const proximoChar = line[i + 1];

    if (char === '"') {
      if (dentroAspas && proximoChar === '"') {
        atual += '"';
        i++; // Pular próxima aspas
      } else {
        dentroAspas = !dentroAspas;
      }
    } else if (char === "," && !dentroAspas) {
      resultado.push(atual);
      atual = "";
    } else {
      atual += char;
    }
  }

  resultado.push(atual);
  return resultado;
}

/**
 * Criar importação V4
 */
export async function criarImportacaoV4(dataReferencia: string, usuarioId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(importacoesV4).values({
    dataReferencia,
    usuarioId: usuarioId as any,
  });
  return (result as any)[0].insertId;
}

/**
 * Inserir vendas V4
 */
export async function inserirVendasV4(importacaoId: number, vendas: VendaV4Row[]): Promise<number> {
  if (vendas.length === 0) return 0;

  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(vendasV4).values(
    vendas.map((v) => ({
      importacaoId: importacaoId as any,
      codigoProduto: v.codigoProduto,
      nomeProduto: v.nomeProduto,
      unidadeMedida: v.unidadeMedida,
      dia2: v.dia2 as any,
      dia3: v.dia3 as any,
      dia4: v.dia4 as any,
      dia5: v.dia5 as any,
      dia6: v.dia6 as any,
      dia7: v.dia7 as any,
    }))
  );

  return (result as any)[0].affectedRows;
}

/**
 * Obter mapa de produção V4
 */
export async function getMapaProducaoV4(importacaoId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const vendas = await db
    .select()
    .from(vendasV4)
    .where(eq(vendasV4.importacaoId, importacaoId));

  return vendas.map((v: any) => ({
    codigoProduto: v.codigoProduto,
    nomeProduto: v.nomeProduto,
    unidadeMedida: v.unidadeMedida,
    dia2: Number(v.dia2),
    dia3: Number(v.dia3),
    dia4: Number(v.dia4),
    dia5: Number(v.dia5),
    dia6: Number(v.dia6),
    dia7: Number(v.dia7),
  }));
}
