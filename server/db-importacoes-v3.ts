import { getDb } from "./db";
import { importacoesV3, vendasV3 } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Criar nova importação V3
 */
export async function criarImportacaoV3(
  dataReferencia: string,
  usuarioId: number
) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  
  const result = await database
    .insert(importacoesV3)
    .values({
      dataReferencia,
      usuarioId,
    });

  return result[0].insertId;
}

/**
 * Parser CSV simples - converte arquivo em dados de vendas
 * Formato esperado:
 * id,Produto,unidade de medida,Unidade,2,3,4,5,6,7
 * TEST004,PAO DOCE,kg,kg,6.80,3.40,0.00,1.20,1.20,1.20
 */
export function parseCSVV3(csvContent: string) {
  const lines = csvContent.trim().split("\n");
  
  if (lines.length < 2) {
    throw new Error("Arquivo CSV vazio");
  }

  const vendas: any[] = [];
  const erros: string[] = [];

  // Pular header (linha 0)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse simples: split por vírgula, mas cuidado com aspas
    const values = parseCSVLine(line);

    if (values.length < 10) {
      erros.push(`Linha ${i + 1}: colunas insuficientes (esperado 10, recebido ${values.length})`);
      continue;
    }

    const codigoProduto = values[0];
    const nomeProduto = values[1];
    const unidadeMedida = values[2];
    const unidade = values[3].toLowerCase() as "kg" | "un";

    // Validar unidade
    if (unidade !== "kg" && unidade !== "un") {
      erros.push(`Linha ${i + 1}: unidade inválida "${unidade}"`);
      continue;
    }

    // Extrair quantidades para dias 2-7 (índices 4-9)
    const dias = [2, 3, 4, 5, 6, 7];
    const quantidades: Record<number, number> = {};

    for (let j = 0; j < dias.length; j++) {
      const valorStr = values[4 + j];
      // Converter vírgula para ponto
      const valor = parseFloat(valorStr.replace(",", "."));
      quantidades[dias[j]] = isNaN(valor) ? 0 : valor;
    }

    vendas.push({
      codigoProduto,
      nomeProduto,
      unidadeMedida,
      unidade,
      quantidades,
    });
  }

  if (erros.length > 0) {
    console.warn("Erros ao parsear CSV:", erros);
  }

  return { vendas, erros };
}

/**
 * Parse linha CSV considerando aspas
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      // Field separator
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Inserir vendas na base de dados
 */
export async function inserirVendasV3(
  importacaoId: number,
  vendas: any[]
) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const registros = vendas.map((venda) => ({
    importacaoId,
    codigoProduto: venda.codigoProduto,
    nomeProduto: venda.nomeProduto,
    unidade: venda.unidade,
    dia2: venda.quantidades[2] || 0,
    dia3: venda.quantidades[3] || 0,
    dia4: venda.quantidades[4] || 0,
    dia5: venda.quantidades[5] || 0,
    dia6: venda.quantidades[6] || 0,
    dia7: venda.quantidades[7] || 0,
  }));

  if (registros.length > 0) {
    await database.insert(vendasV3).values(registros);
  }

  return registros.length;
}

/**
 * Obter mapa de produção (grid Produto × Dias)
 */
export async function getMapaProducaoV3(importacaoId: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const vendas = await database
    .select()
    .from(vendasV3)
    .where(eq(vendasV3.importacaoId, importacaoId));

  return vendas.map((v: any) => ({
    codigoProduto: v.codigoProduto,
    nomeProduto: v.nomeProduto,
    unidade: v.unidade,
    dia2: parseFloat(v.dia2?.toString() || "0"),
    dia3: parseFloat(v.dia3?.toString() || "0"),
    dia4: parseFloat(v.dia4?.toString() || "0"),
    dia5: parseFloat(v.dia5?.toString() || "0"),
    dia6: parseFloat(v.dia6?.toString() || "0"),
    dia7: parseFloat(v.dia7?.toString() || "0"),
    total: (parseFloat(v.dia2?.toString() || "0") +
      parseFloat(v.dia3?.toString() || "0") +
      parseFloat(v.dia4?.toString() || "0") +
      parseFloat(v.dia5?.toString() || "0") +
      parseFloat(v.dia6?.toString() || "0") +
      parseFloat(v.dia7?.toString() || "0")),
  }));
}

/**
 * Deletar importação e suas vendas
 */
export async function deleteImportacaoV3(importacaoId: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  await database.delete(vendasV3).where(eq(vendasV3.importacaoId, importacaoId));
  await database.delete(importacoesV3).where(eq(importacoesV3.id, importacaoId));
}
