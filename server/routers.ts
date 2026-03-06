import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { eq, sql, asc } from "drizzle-orm";
import { modoPreparo } from "../drizzle/schema";




// ==================== SCHEMAS DE VALIDAÇÃO ====================

const categoriaSchema = z.object({
  nome: z.string().min(1).max(100),
  descricao: z.string().optional(),
  ativo: z.boolean().default(true),
});

const insumoSchema = z.object({
  codigoInsumo: z.string().min(1).max(50),
  nome: z.string().min(1).max(200),
  tipo: z.enum(["seco", "molhado"]),
  unidadeMedida: z.enum(["kg", "un"]).default("kg"),
  ativo: z.boolean().default(true),
});

const produtoSchema = z.object({
  codigoProduto: z.string().min(1).max(50),
  nome: z.string().min(1).max(200),
  unidade: z.enum(["kg", "un"]),
  pesoUnitario: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  }, "Peso unitário deve ser um número válido"),
  percentualPerdaLiquida: z.string().optional(),
  shelfLife: z.number().int().optional(),
  categoriaId: z.number().int().optional(),
  tipoEmbalagem: z.string().min(1).max(100),
  quantidadePorEmbalagem: z.number().int().min(1),
  destinoId: z.number().int().optional(),
  saldoEstoque: z.string().default("0"),
  estoqueMinimoDias: z.number().int().min(1).default(4),
  ativo: z.boolean().default(true),
});

const fichaTecnicaItemSchema = z.object({
  produtoId: z.number().int(),
  componenteId: z.number().int(),
  tipoComponente: z.enum(["ingrediente", "massa_base", "sub_bloco"]),
  quantidadeBase: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Quantidade base deve ser um número positivo"),
  unidade: z.enum(["kg", "un"]),
  receitaMinima: z.string().optional(),
  ordem: z.number().int().default(0),
  nivel: z.number().int().min(1).max(2),
  paiId: z.number().int().optional(),
});

const blocoSchema = z.object({
  produtoId: z.number().int(),
  unidadesPorBloco: z.number().int().default(30),
  pesoBloco: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, "Peso do bloco deve ser um número positivo"),
  ativo: z.boolean().default(true),
});

const modoPreparoSchema = z.object({
  produtoId: z.number().int(),
  ordem: z.number().int().default(1),
  descricao: z.string().min(1),
  tempoMinutos: z.number().int().min(0).default(0),
});
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ==================== CATEGORIAS ====================
  categorias: router({
    list: protectedProcedure
      .input(z.object({
        ativo: z.boolean().optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return await db.listCategorias(input);
      }),

    getById: protectedProcedure
      .input(z.number().int())
      .query(async ({ input }) => {
        const categoria = await db.getCategoriaById(input);
        if (!categoria) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Categoria não encontrada" });
        }
        return categoria;
      }),

    create: protectedProcedure
      .input(categoriaSchema)
      .mutation(async ({ input }) => {
        await db.createCategoria(input);
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number().int(),
        data: categoriaSchema.partial(),
      }))
      .mutation(async ({ input }) => {
        await db.updateCategoria(input.id, input.data);
        return { success: true };
      }),

    toggle: protectedProcedure
      .input(z.number().int())
      .mutation(async ({ input }) => {
        await db.toggleCategoria(input);
        return { success: true };
      }),
  }),

  // ==================== INSUMOS ====================
  insumos: router({
    list: protectedProcedure
      .input(z.object({
        ativo: z.boolean().optional(),
        search: z.string().optional(),
        tipo: z.enum(["seco", "molhado"]).optional(),
      }).optional())
      .query(async ({ input }) => {
        return await db.listInsumos(input);
      }),

    getById: protectedProcedure
      .input(z.number().int())
      .query(async ({ input }) => {
        const insumo = await db.getInsumoById(input);
        if (!insumo) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Insumo não encontrado" });
        }
        return insumo;
      }),

    checkCodigo: protectedProcedure
      .input(z.object({
        codigo: z.string(),
        excludeId: z.number().int().optional(),
      }))
      .query(async ({ input }) => {
        const exists = await db.checkInsumoCodigoExists(input.codigo, input.excludeId);
        return { exists };
      }),

    create: protectedProcedure
      .input(insumoSchema)
      .mutation(async ({ input }) => {
        // Validar código único
        const exists = await db.checkInsumoCodigoExists(input.codigoInsumo);
        if (exists) {
          throw new TRPCError({ 
            code: "CONFLICT", 
            message: "Código de insumo já existe" 
          });
        }

        await db.createInsumo(input);
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number().int(),
        data: insumoSchema.partial(),
      }))
      .mutation(async ({ input }) => {
        // Se estiver alterando o código, validar unicidade
        if (input.data.codigoInsumo) {
          const exists = await db.checkInsumoCodigoExists(input.data.codigoInsumo, input.id);
          if (exists) {
            throw new TRPCError({ 
              code: "CONFLICT", 
              message: "Código de insumo já existe" 
            });
          }
        }

        await db.updateInsumo(input.id, input.data);
        return { success: true };
      }),

    toggle: protectedProcedure
      .input(z.number().int())
      .mutation(async ({ input }) => {
        await db.toggleInsumo(input);
        return { success: true };
      }),
  }),

  // ==================== PRODUTOS ====================
  produtos: router({
    list: protectedProcedure
      .input(z.object({
        ativo: z.boolean().optional(),
        search: z.string().optional(),
        categoriaId: z.number().int().optional(),
      }).optional())
      .query(async ({ input }) => {
        return await db.listProdutos(input);
      }),

    getById: protectedProcedure
      .input(z.number().int())
      .query(async ({ input }) => {
        const produto = await db.getProdutoById(input);
        if (!produto) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Produto não encontrado" });
        }
        return produto;
      }),

    checkCodigo: protectedProcedure
      .input(z.object({
        codigo: z.string(),
        excludeId: z.number().int().optional(),
      }))
      .query(async ({ input }) => {
        const exists = await db.checkProdutoCodigoExists(input.codigo, input.excludeId);
        return { exists };
      }),

    create: protectedProcedure
      .input(produtoSchema)
      .mutation(async ({ input }) => {
        // Validar código único
        const exists = await db.checkProdutoCodigoExists(input.codigoProduto);
        if (exists) {
          throw new TRPCError({ 
            code: "CONFLICT", 
            message: "Código de produto já existe" 
          });
        }

        // Validar peso unitário obrigatório para produtos em 'un'
        if (input.unidade === "un") {
          const peso = parseFloat(input.pesoUnitario);
          if (peso <= 0) {
            throw new TRPCError({ 
              code: "BAD_REQUEST", 
              message: "Peso unitário deve ser maior que zero para produtos em unidades" 
            });
          }
        }

        await db.createProduto(input);
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number().int(),
        data: produtoSchema.partial(),
      }))
      .mutation(async ({ input }) => {
        // Se estiver alterando o código, validar unicidade
        if (input.data.codigoProduto) {
          const exists = await db.checkProdutoCodigoExists(input.data.codigoProduto, input.id);
          if (exists) {
            throw new TRPCError({ 
              code: "CONFLICT", 
              message: "Código de produto já existe" 
            });
          }
        }

        await db.updateProduto(input.id, input.data);
        return { success: true };
      }),

    toggle: protectedProcedure
      .input(z.number().int())
      .mutation(async ({ input }) => {
        await db.toggleProduto(input);
        return { success: true };
      }),
  }),

  // ==================== FICHA TÉCNICA ====================
  fichaTecnica: router({
    getByProduto: protectedProcedure
      .input(z.number().int())
      .query(async ({ input }) => {
        return await db.getFichaTecnicaByProduto(input);
      }),

    create: protectedProcedure
      .input(fichaTecnicaItemSchema)
      .mutation(async ({ input }) => {
        // Validar máximo 2 níveis
        if (input.nivel > 2) {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: "A estrutura hierárquica não pode ultrapassar 2 níveis" 
          });
        }

        // Se for nível 2, deve ter paiId
        if (input.nivel === 2 && !input.paiId) {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: "Componentes de nível 2 devem ter um componente pai" 
          });
        }

        // Se for nível 1, não deve ter paiId
        if (input.nivel === 1 && input.paiId) {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: "Componentes de nível 1 não podem ter componente pai" 
          });
        }

        await db.createFichaTecnicaItem(input);
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number().int(),
        data: fichaTecnicaItemSchema.partial(),
      }))
      .mutation(async ({ input }) => {
        await db.updateFichaTecnicaItem(input.id, input.data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.number().int())
      .mutation(async ({ input }) => {
        await db.deleteFichaTecnicaItem(input);
        return { success: true };
      }),
  }),

  // ==================== BLOCOS ====================
  blocos: router({
    getByProduto: protectedProcedure
      .input(z.number().int())
      .query(async ({ input }) => {
        return await db.getBlocoByProduto(input);
      }),

    create: protectedProcedure
      .input(blocoSchema)
      .mutation(async ({ input }) => {
        // Validar que o produto existe e é em unidades
        const produto = await db.getProdutoById(input.produtoId);
        if (!produto) {
          throw new TRPCError({ 
            code: "NOT_FOUND", 
            message: "Produto não encontrado" 
          });
        }

        // Validar consistência: pesoBloco = unidadesPorBloco × pesoUnitario
        const pesoBloco = parseFloat(input.pesoBloco);
        const pesoUnitario = parseFloat(produto.pesoUnitario);
        const pesoEsperado = input.unidadesPorBloco * pesoUnitario;
        const tolerancia = 0.001; // 1 grama de tolerância

        if (Math.abs(pesoBloco - pesoEsperado) > tolerancia) {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: `Peso do bloco inconsistente. Esperado: ${pesoEsperado.toFixed(5)} kg (${input.unidadesPorBloco} × ${pesoUnitario.toFixed(5)} kg)` 
          });
        }

        await db.createBloco(input);
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number().int(),
        data: blocoSchema.partial(),
      }))
      .mutation(async ({ input }) => {
        await db.updateBloco(input.id, input.data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.number().int())
      .mutation(async ({ input }) => {
        await db.deleteBloco(input);
        return { success: true };
      }),
  }),

  // ==================== MODO DE PREPARO ====================
  modoPreparo: router({
    getByProduto: protectedProcedure
      .input(z.number().int())
      .query(async ({ input }) => {
        return await db.getModoPreparoByProduto(input);
      }),

    create: protectedProcedure
      .input(modoPreparoSchema)
      .mutation(async ({ input }) => {
        await db.createModoPreparo(input);
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number().int(),
        data: modoPreparoSchema.partial(),
      }))
      .mutation(async ({ input }) => {
        await db.updateModoPreparo(input.id, input.data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.number().int())
      .mutation(async ({ input }) => {
        await db.deleteModoPreparo(input);
        return { success: true };
      }),
  }),

  // ImportaV5 - Com persistência no banco de dados
  importaV5: router({
    importar: protectedProcedure
      .input(
        z.object({
          dataReferencia: z.string(),
          csvContent: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Parser CSV ultra-simples
        const linhas = input.csvContent
          .replace(/\r\n/g, "\n")
          .replace(/\r/g, "\n")
          .split("\n")
          .filter((l) => l.trim());

        if (linhas.length < 2) {
          return { success: false, erro: "Arquivo vazio ou sem dados", dados: [], importacaoId: null };
        }

        // Detectar separador (ponto-e-vírgula ou vírgula)
        const primeiraLinha = linhas[0];
        const separador = primeiraLinha.includes(";") ? ";" : ",";

        // Detectar formato do cabeçalho
        // Formato 1: codigo;nome;unidade;dia2;dia3;dia4;dia5;dia6;dia7 (9 colunas)
        // Formato 2: nome_produto;unidade_medida;2;3;4;5;6;7 (8 colunas)
        const headerCols = primeiraLinha.split(separador);
        const temCodigo = headerCols.length >= 9;

        // Pular cabeçalho, processar dados
        const dados = [];
        for (let i = 1; i < linhas.length; i++) {
          const linha = linhas[i].trim();
          if (!linha) continue;

          const cols = linha.split(separador);
          
          // Converter vírgula decimal para ponto
          const converterNumero = (val: string) => {
            const limpo = val.trim().replace(",", ".");
            const num = parseFloat(limpo);
            return isNaN(num) ? 0 : num;
          };

          if (temCodigo) {
            // Formato com código (9 colunas)
            if (cols.length < 9) continue;
            dados.push({
              codigo_produto: cols[0].trim(),
              nome_produto: cols[1].trim(),
              unidade_medida: cols[2].trim(),
              dia2: converterNumero(cols[3]),
              dia3: converterNumero(cols[4]),
              dia4: converterNumero(cols[5]),
              dia5: converterNumero(cols[6]),
              dia6: converterNumero(cols[7]),
              dia7: converterNumero(cols[8]),
            });
          } else {
            // Formato sem código (8 colunas): nome_produto;unidade_medida;2;3;4;5;6;7
            if (cols.length < 8) continue;
            dados.push({
              codigo_produto: "", // Sem código
              nome_produto: cols[0].trim(),
              unidade_medida: cols[1].trim(),
              dia2: converterNumero(cols[2]),
              dia3: converterNumero(cols[3]),
              dia4: converterNumero(cols[4]),
              dia5: converterNumero(cols[5]),
              dia6: converterNumero(cols[6]),
              dia7: converterNumero(cols[7]),
            });
          }
        }

        if (dados.length === 0) {
          return { success: false, erro: "Nenhum produto válido encontrado", dados: [], importacaoId: null };
        }

        // Salvar no banco de dados
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { importacoesV5, vendasV5 } = await import("../drizzle/schema");

        // Criar importação
        const [importacao] = await database.insert(importacoesV5).values({
          dataReferencia: input.dataReferencia,
          usuarioId: ctx.user.id,
        });

        const importacaoId = importacao.insertId;

        // Inserir vendas
        for (const item of dados) {
          await database.insert(vendasV5).values({
            importacaoId,
            codigoProduto: item.codigo_produto,
            nomeProduto: item.nome_produto,
            unidadeMedida: item.unidade_medida,
            dia2: String(item.dia2),
            dia3: String(item.dia3),
            dia4: String(item.dia4),
            dia5: String(item.dia5),
            dia6: String(item.dia6),
            dia7: String(item.dia7),
          });
        }

        return {
          success: true,
          importacaoId,
          dataReferencia: input.dataReferencia,
          totalProdutos: dados.length,
          dados,
        };
      }),

    listar: protectedProcedure.query(async () => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const { importacoesV5 } = await import("../drizzle/schema");
      const { desc } = await import("drizzle-orm");
      
      const lista = await database
        .select()
        .from(importacoesV5)
        .orderBy(desc(importacoesV5.createdAt))
        .limit(20);
      
      return lista;
    }),

    getMapa: protectedProcedure
      .input(z.number().int())
      .query(async ({ input: importacaoId }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { importacoesV5, vendasV5 } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");

        const [importacao] = await database
          .select()
          .from(importacoesV5)
          .where(eq(importacoesV5.id, importacaoId));

        if (!importacao) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Importação não encontrada" });
        }

        const vendas = await database
          .select()
          .from(vendasV5)
          .where(eq(vendasV5.importacaoId, importacaoId));

        return {
          importacao,
          vendas,
        };
      }),
  }),

  // ==================== MAPA DE PRODUÇÃO ====================
  mapaProducao: router({
    // Buscar última importação e gerar mapa de produção
    gerarMapa: protectedProcedure.query(async () => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const { importacoesV5, vendasV5 } = await import("../drizzle/schema");
      const { desc, eq } = await import("drizzle-orm");

      // PRIMEIRO: Verificar se existe Mapa Base salvo (fonte unica de verdade)
      const mapaBaseSalvo = await db.getMapaBase();
      if (mapaBaseSalvo && mapaBaseSalvo.length > 0) {
        return {
          success: true,
          importacao: null,
          mapa: mapaBaseSalvo.map((item, idx) => {
            const qtdImportada = parseFloat(item.quantidade);
            const qtdPlanejada = parseFloat(item.qtdPlanejada);
            return {
              id: idx + 1,
              codigo: item.codigoProduto,
              nome: item.nomeProduto,
              unidade: item.unidade,
              qtdImportada: qtdImportada,
              percentualAjuste: item.percentualAjuste,
              qtdPlanejada: qtdPlanejada,
              equipe: item.equipe || "Equipe 1",
              diaProduzir: item.diaProduzir,
              produtoId: item.produtoId || 0,
            };
          }),
        };
      }

      // Buscar última importação
      const [ultimaImportacao] = await database
        .select()
        .from(importacoesV5)
        .orderBy(desc(importacoesV5.createdAt))
        .limit(1);

      if (!ultimaImportacao) {
        return { success: false, erro: "Nenhuma importação encontrada", mapa: [], importacao: null };
      }

      // Buscar vendas da última importação
      const vendas = await database
        .select()
        .from(vendasV5)
        .where(eq(vendasV5.importacaoId, ultimaImportacao.id));

      // Buscar todos os produtos para vincular pelo nome
      const { produtos } = await import("../drizzle/schema");
      const todosProdutos = await database.select().from(produtos);
      const produtosPorNome = new Map(todosProdutos.map(p => [p.nome.toLowerCase().trim(), p]));

      // Gerar mapa de produção expandido (uma linha por produto por dia)
      const mapa: Array<{
        id: number;
        codigo: string;
        nome: string;
        unidade: string;
        qtdImportada: number;
        percentualAjuste: number;
        qtdPlanejada: number;
        equipe: string;
        diaProduzir: number;
        produtoId: number;
      }> = [];

      let idCounter = 1;
      for (const venda of vendas) {
        // Para cada dia (2-7), criar uma linha se houver quantidade
        const dias = [
          { dia: 2, qtd: parseFloat(venda.dia2 || "0") },
          { dia: 3, qtd: parseFloat(venda.dia3 || "0") },
          { dia: 4, qtd: parseFloat(venda.dia4 || "0") },
          { dia: 5, qtd: parseFloat(venda.dia5 || "0") },
          { dia: 6, qtd: parseFloat(venda.dia6 || "0") },
          { dia: 7, qtd: parseFloat(venda.dia7 || "0") },
        ];

        for (const d of dias) {
          if (d.qtd > 0) {
            const produtoCadastrado = produtosPorNome.get(venda.nomeProduto.toLowerCase().trim());
            mapa.push({
              id: idCounter++,
              codigo: venda.codigoProduto,
              nome: venda.nomeProduto,
              unidade: venda.unidadeMedida,
              qtdImportada: d.qtd,
              percentualAjuste: 0,
              qtdPlanejada: d.qtd,
              equipe: "Equipe 1",
              diaProduzir: d.dia,
              produtoId: produtoCadastrado?.id || 0,
            });
          }
        }
      }

      // ========== INTELIGÊNCIA DE REPOSIÇÃO ==========
      // Buscar produtos com destino Congelado ou Pré-Preparo que estão em ruptura
      const { destinos } = await import("../drizzle/schema");
      const { and, inArray } = await import("drizzle-orm");

      // Buscar destinos de expedição
      const destinosExpedicao = await database
        .select()
        .from(destinos)
        .where(eq(destinos.ativo, true));

      const destinoIds = destinosExpedicao
        .filter(d => d.nome === 'Congelado' || d.nome === 'Pré-Preparo')
        .map(d => d.id);

      if (destinoIds.length > 0) {
        // Buscar produtos com esses destinos
        const produtosExpedicao = await database
          .select()
          .from(produtos)
          .where(and(
            eq(produtos.ativo, true),
            inArray(produtos.destinoId, destinoIds)
          ));

        // Calcular média diária de cada produto (soma dos 6 dias / 6)
        for (const produto of produtosExpedicao) {
          // Buscar vendas deste produto na última importação
          const vendaProduto = vendas.find(v => v.codigoProduto === produto.codigoProduto);
          
          let mediaDiaria = 0;
          if (vendaProduto) {
            const totalSemana = 
              parseFloat(vendaProduto.dia2 || "0") +
              parseFloat(vendaProduto.dia3 || "0") +
              parseFloat(vendaProduto.dia4 || "0") +
              parseFloat(vendaProduto.dia5 || "0") +
              parseFloat(vendaProduto.dia6 || "0") +
              parseFloat(vendaProduto.dia7 || "0");
            mediaDiaria = totalSemana / 6;
          }

          // Calcular estoque mínimo
          const estoqueMinimo = mediaDiaria * produto.estoqueMinimoDias;
          const saldoAtual = parseFloat(produto.saldoEstoque || "0");

          // Se em ruptura, adicionar ao mapa na segunda-feira (dia 2)
          if (saldoAtual < estoqueMinimo && mediaDiaria > 0) {
            // Quantidade sugerida: estoqueMinimoDias * média diária
            const qtdSugerida = Math.ceil(produto.estoqueMinimoDias * mediaDiaria);

            // Verificar se já não existe no mapa
            const jaExiste = mapa.some(
              m => m.codigo === produto.codigoProduto && m.diaProduzir === 2
            );

            if (!jaExiste) {
              mapa.push({
                id: idCounter++,
                codigo: produto.codigoProduto,
                nome: produto.nome + " [REPOSIÇÃO]",
                unidade: produto.unidade,
                qtdImportada: 0,
                percentualAjuste: 0,
                qtdPlanejada: qtdSugerida,
                equipe: "Reposição de Estoque",
                diaProduzir: 2, // Segunda-feira
                produtoId: produto.id,
              });
            }
          }
        }
      }

      return {
        success: true,
        importacao: ultimaImportacao,
        mapa,
      };
    }),

    // Salvar alterações do mapa (rascunho)
    salvarRascunho: protectedProcedure
      .input(z.object({
        importacaoId: z.number().int().nullable(),
        itens: z.array(z.object({
          produtoId: z.number().int(),
          codigoProduto: z.string(),
          nomeProduto: z.string(),
          unidade: z.string(),
          qtdImportada: z.string(),
          percentualAjuste: z.number().int(),
          qtdPlanejada: z.string(),
          diaProduzir: z.number().int(),
          equipe: z.string(),
          isReposicao: z.boolean().optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        return await db.salvarMapaRascunho(input.importacaoId, input.itens);
      }),

    // Carregar rascunho salvo
    carregarRascunho: protectedProcedure.query(async () => {
      const rascunho = await db.getMapaRascunho();
      return {
        success: true,
        mapa: rascunho.map((item, idx) => ({
          id: idx + 1,
          codigo: item.codigoProduto,
          nome: item.nomeProduto,
          unidade: item.unidade,
          qtdImportada: parseFloat(item.qtdImportada),
          percentualAjuste: item.percentualAjuste,
          qtdPlanejada: parseFloat(item.qtdPlanejada),
          equipe: item.equipe || "Equipe 1",
          diaProduzir: item.diaProduzir,
          produtoId: item.produtoId,
          isReposicao: item.isReposicao,
        })),
      };
    }),

    // Verificar se existe rascunho
    hasRascunho: protectedProcedure.query(async () => {
      return await db.hasMapaRascunho();
    }),

    // Limpar rascunho
    limparRascunho: protectedProcedure.mutation(async () => {
      return await db.limparMapaRascunho();
    }),

    // Salvar como Mapa Base (template)
    salvarMapaBase: protectedProcedure
      .input(z.object({
        itens: z.array(z.object({
          produtoId: z.number().int(),
          codigoProduto: z.string(),
          nomeProduto: z.string(),
          unidade: z.string(),
          quantidade: z.string(),
          percentualAjuste: z.number().int(),
          diaProduzir: z.number().int(),
          equipe: z.string(),
        })),
      }))
      .mutation(async ({ input }) => {
        // Consolidar com shelf life ANTES de salvar
        const itensConsolidados = await db.consolidarComShelfLife(input.itens);
        return await db.salvarMapaBase(itensConsolidados);
      }),

    // Carregar Mapa Base
    carregarMapaBase: protectedProcedure.query(async () => {
      const mapaBase = await db.getMapaBase();
      return {
        success: true,
        mapa: mapaBase.map((item, idx) => {
          // Usar qtdPlanejada do banco (já consolidado com shelf life)
          // Se não existir, usar quantidade * percentualAjuste como fallback
          const qtdPlanejada = item.qtdPlanejada !== null && item.qtdPlanejada !== undefined
            ? parseFloat(item.qtdPlanejada)
            : parseFloat(item.quantidade) * (1 + item.percentualAjuste / 100);
          
          return {
            id: idx + 1,
            codigo: item.codigoProduto,
            nome: item.nomeProduto,
            unidade: item.unidade,
            qtdImportada: parseFloat(item.quantidade),
            percentualAjuste: item.percentualAjuste,
            qtdPlanejada: qtdPlanejada,
            equipe: item.equipe || "Equipe 1",
            diaProduzir: item.diaProduzir,
            produtoId: item.produtoId,
          };
        }),
      };
    }),

    // Verificar se existe Mapa Base
    hasMapaBase: protectedProcedure.query(async () => {
      return await db.hasMapaBase();
    }),

    // Validar cadastro de produtos do mapa (verificar se estão cadastrados)
    validarCadastroProdutos: protectedProcedure
      .input(z.object({
        nomesProdutos: z.array(z.string()),
      }))
      .mutation(async ({ input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        const { produtos } = await import("../drizzle/schema");
        const { sql } = await import("drizzle-orm");
        
        // Buscar todos os produtos cadastrados
        const produtosCadastrados = await database.select().from(produtos);
        const nomesCadastrados = new Set(produtosCadastrados.map(p => p.nome.toUpperCase().trim()));
        
        // Verificar quais produtos do mapa não estão cadastrados
        const produtosNaoCadastrados: string[] = [];
        for (const nome of input.nomesProdutos) {
          const nomeNormalizado = nome.toUpperCase().trim();
          if (!nomesCadastrados.has(nomeNormalizado)) {
            // Evitar duplicatas na lista
            if (!produtosNaoCadastrados.includes(nome)) {
              produtosNaoCadastrados.push(nome);
            }
          }
        }
        
        // Buscar próximo código sequencial
        // Usar COALESCE para tratar valores não-numéricos e converter apenas os numéricos
        const todosCodigosProdutos = await database
          .select({ codigo: produtos.codigoProduto })
          .from(produtos);
        
        let maxCodigo = 0;
        for (const p of todosCodigosProdutos) {
          const num = parseInt(p.codigo, 10);
          if (!isNaN(num) && num > maxCodigo) {
            maxCodigo = num;
          }
        }
        const proximoCodigo = maxCodigo + 1;
        
        return {
          success: true,
          produtosNaoCadastrados,
          proximoCodigo,
          totalNaoCadastrados: produtosNaoCadastrados.length,
        };
      }),

    // Validar ruptura de estoque após salvar
    validarRupturaEstoque: protectedProcedure.query(async () => {
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const { produtos, destinos, mapaRascunho } = await import("../drizzle/schema");
      
      // Buscar rascunho salvo
      const rascunho = await database.select().from(mapaRascunho);
      if (rascunho.length === 0) {
        return { success: true, produtosEmRuptura: [], itensAdicionados: [] };
      }
      
      // Calcular média diária do mapa recém salvo
      // Agrupar por produto e calcular média
      const mediaPorProduto = new Map<string, { total: number; dias: Set<number>; codigo: string; nome: string; unidade: string }>();
      
      for (const item of rascunho) {
        const key = item.codigoProduto;
        if (!mediaPorProduto.has(key)) {
          mediaPorProduto.set(key, {
            total: 0,
            dias: new Set(),
            codigo: item.codigoProduto,
            nome: item.nomeProduto,
            unidade: item.unidade,
          });
        }
        const entry = mediaPorProduto.get(key)!;
        entry.total += parseFloat(item.qtdPlanejada);
        entry.dias.add(item.diaProduzir);
      }
      
      // Buscar produtos com destino "Congelado"
      const produtosCongelados = await database
        .select()
        .from(produtos)
        .leftJoin(destinos, eq(produtos.destinoId, destinos.id))
        .where(sql`LOWER(${destinos.nome}) = 'congelado'`);
      
      const produtosEmRuptura: Array<{
        codigoProduto: string;
        nomeProduto: string;
        unidade: string;
        saldoAtual: number;
        estoqueMinimo: number;
        mediaDiaria: number;
        qtdSugerida: number;
      }> = [];
      
      const itensAdicionados: Array<{
        codigoProduto: string;
        nomeProduto: string;
        unidade: string;
        qtdSugerida: number;
      }> = [];
      
      for (const { produtos: produto } of produtosCongelados) {
        if (!produto) continue;
        
        const mediaInfo = mediaPorProduto.get(produto.codigoProduto);
        if (!mediaInfo) continue;
        
        const diasComProducao = mediaInfo.dias.size || 1;
        const mediaDiaria = mediaInfo.total / diasComProducao;
        const estoqueMinimoDias = produto.estoqueMinimoDias || 4;
        const estoqueMinimo = mediaDiaria * estoqueMinimoDias;
        const saldoAtual = parseFloat(produto.saldoEstoque || '0');
        
        if (saldoAtual < estoqueMinimo) {
          const qtdSugerida = estoqueMinimoDias * mediaDiaria;
          
          produtosEmRuptura.push({
            codigoProduto: produto.codigoProduto,
            nomeProduto: produto.nome,
            unidade: produto.unidade,
            saldoAtual,
            estoqueMinimo,
            mediaDiaria,
            qtdSugerida,
          });
          
          // Verificar se já existe item [REPOSIÇÃO] na segunda-feira
          const jaExiste = rascunho.some(
            item => item.codigoProduto === produto.codigoProduto && 
                    item.diaProduzir === 2 && 
                    item.nomeProduto.includes('[REPOSIÇÃO]')
          );
          
          if (!jaExiste) {
            // Inserir no rascunho para segunda-feira
            await database.insert(mapaRascunho).values({
              importacaoId: null,
              produtoId: produto.id,
              codigoProduto: produto.codigoProduto,
              nomeProduto: produto.nome + ' [REPOSIÇÃO]',
              unidade: produto.unidade,
              qtdImportada: '0',
              percentualAjuste: 0,
              qtdPlanejada: qtdSugerida.toFixed(2),
              diaProduzir: 2, // Segunda-feira
              equipe: 'Reposição',
              isReposicao: true,
            });
            
            itensAdicionados.push({
              codigoProduto: produto.codigoProduto,
              nomeProduto: produto.nome + ' [REPOSIÇÃO]',
              unidade: produto.unidade,
              qtdSugerida,
            });
          }
        }
      }
      
      return {
        success: true,
        produtosEmRuptura,
        itensAdicionados,
      };
    }),
  }),

  // ==================== PCP - CÁLCULO E PROCESSAMENTO ====================
  pcp: router({
    // Processa um item do mapa de produção e retorna explosão de insumos
    processarItem: protectedProcedure
      .input(z.object({
        codigoProduto: z.string(),
        nomeProduto: z.string(),
        unidade: z.enum(["kg", "un"]),
        qtdPlanejada: z.number(),
      }))
      .query(async ({ input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { produtos, fichaTecnica, insumos } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const { arredondarPesagem, arredondarUnidades, processarDivisora, explodirInsumos } = await import("@shared/pcp-utils");

        // Buscar produto pelo código
        const [produto] = await database
          .select()
          .from(produtos)
          .where(eq(produtos.codigoProduto, input.codigoProduto))
          .limit(1);

        if (!produto) {
          return {
            success: false,
            erro: `Produto ${input.codigoProduto} não encontrado no cadastro`,
            resultado: null,
          };
        }

        // Buscar ficha técnica do produto
        const fichaItens = await database
          .select()
          .from(fichaTecnica)
          .where(eq(fichaTecnica.produtoId, produto.id));

        if (fichaItens.length === 0) {
          return {
            success: false,
            erro: `Produto ${input.codigoProduto} não possui ficha técnica cadastrada`,
            resultado: null,
          };
        }

        // Buscar nomes dos insumos
        const insumosDb = await database.select().from(insumos);
        const insumosMap = new Map(insumosDb.map(i => [i.id, i]));

        // Preparar ficha técnica para processamento
        const fichaTecnicaProcessada = fichaItens.map(item => {
          const insumo = insumosMap.get(item.componenteId);
          return {
            componenteId: item.componenteId,
            nomeComponente: insumo?.nome || `Insumo ${item.componenteId}`,
            tipoComponente: item.tipoComponente as 'ingrediente' | 'massa_base' | 'sub_bloco',
            quantidadeBase: parseFloat(item.quantidadeBase),
            unidade: item.unidade as 'kg' | 'un',
            nivel: item.nivel,
            paiId: item.paiId || undefined,
          };
        });

        // Processar divisora se produto for em kg
        let divisora = null;
        let massaParaExplosao = input.qtdPlanejada;
        const pesoUnitario = parseFloat(produto.pesoUnitario);

        if (input.unidade === 'kg' && pesoUnitario > 0) {
          divisora = processarDivisora(input.qtdPlanejada, pesoUnitario);
          massaParaExplosao = divisora.massaTotal;
        } else if (input.unidade === 'un') {
          // Arredondar unidades para baixo
          massaParaExplosao = arredondarUnidades(input.qtdPlanejada);
        }

        // Explodir insumos
        const insumosExplodidos = explodirInsumos(massaParaExplosao, fichaTecnicaProcessada);

        return {
          success: true,
          resultado: {
            codigoProduto: input.codigoProduto,
            nomeProduto: input.nomeProduto,
            unidade: input.unidade,
            qtdPlanejada: input.qtdPlanejada,
            pesoUnitario,
            divisora,
            insumos: insumosExplodidos,
          },
        };
      }),

    // Processa múltiplos itens do mapa de produção com Motor de Cálculo v3.0
    processarMapa: protectedProcedure
      .input(z.array(z.object({
        codigoProduto: z.string(),
        nomeProduto: z.string(),
        unidade: z.enum(["kg", "un"]),
        qtdPlanejada: z.number(),
        diaProduzir: z.number(),
      })))
      .query(async ({ input }) => {
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { produtos, fichaTecnica, insumos, blocos } = await import("../drizzle/schema");
        const { 
          passo1ConversaoAssadoCru,
          passo2ExplosaoParidade,
          passo3BlocosPedacos,
          calcularRendimentoFicha,
          aplicarParidade,
          explodirRecursivoV3,
          consolidarInsumosV3,
          consolidarMassasBaseV3,
        } = await import("@shared/motor-calculo-v3");
        
        // Tipo para componente da ficha técnica
        type ComponenteFicha = {
          componenteId: number;
          nomeComponente: string;
          tipoComponente: 'ingrediente' | 'massa_base';
          quantidadeBase: number;
          unidade: 'kg' | 'un';
        };

        // Buscar todos os produtos e insumos de uma vez
        const produtosDb = await database.select().from(produtos);
        const produtosMap = new Map(produtosDb.map(p => [p.codigoProduto, p]));
        const produtosIdMap = new Map(produtosDb.map(p => [p.id, p]));

        const insumosDb = await database.select().from(insumos);
        const insumosMap = new Map(insumosDb.map(i => [i.id, i]));

        // Buscar todos os blocos
        const blocosDb = await database.select().from(blocos);
        const blocosMap = new Map(blocosDb.map(b => [b.produtoId, b]));

        // Buscar todas as fichas técnicas
        const fichasDb = await database.select().from(fichaTecnica);
        const fichasMap = new Map<number, typeof fichasDb>();
        for (const ficha of fichasDb) {
          if (!fichasMap.has(ficha.produtoId)) {
            fichasMap.set(ficha.produtoId, []);
          }
          fichasMap.get(ficha.produtoId)!.push(ficha);
        }

        // Buscar todos os modos de preparo
        const modoPreparoDb = await database.select().from(modoPreparo).orderBy(asc(modoPreparo.ordem));
        const modoPreparoMap = new Map<number, typeof modoPreparoDb>();
        for (const mp of modoPreparoDb) {
          if (!modoPreparoMap.has(mp.produtoId)) {
            modoPreparoMap.set(mp.produtoId, []);
          }
          modoPreparoMap.get(mp.produtoId)!.push(mp);
        }

        // Função para buscar ficha técnica
        const buscaFichaTecnica = (produtoId: number): ComponenteFicha[] | null => {
          const fichaItens = fichasMap.get(produtoId);
          if (!fichaItens || fichaItens.length === 0) return null;
          
          return fichaItens.map(ft => {
            let nomeComponente = '';
            if (ft.tipoComponente === 'ingrediente') {
              const insumo = insumosMap.get(ft.componenteId);
              nomeComponente = insumo?.nome || `Insumo ${ft.componenteId}`;
            } else {
              const prod = produtosIdMap.get(ft.componenteId);
              nomeComponente = prod?.nome || `Produto ${ft.componenteId}`;
            }
            
            return {
              componenteId: ft.componenteId,
              nomeComponente,
              tipoComponente: ft.tipoComponente as 'ingrediente' | 'massa_base',
              quantidadeBase: parseFloat(ft.quantidadeBase),
              unidade: ft.unidade as 'kg' | 'un',
            };
          });
        };

        // Função para buscar dados de blocos
        const buscaBlocos = (produtoId: number) => {
          const bloco = blocosMap.get(produtoId);
          if (!bloco) return null;
          return {
            divisora: bloco.unidadesPorBloco,
            pesoBloco: parseFloat(bloco.pesoBloco),
          };
        };

        // Estrutura de resultados
        const resultados: Array<{
          codigoProduto: string;
          nomeProduto: string;
          unidade: string;
          qtdPlanejada: number;
          diaProduzir: number;
          pesoUnitario: number;
          // Dados de embalagem
          tipoEmbalagem: string;
          quantidadePorEmbalagem: number;
          // Passo 1
          passo1: {
            valorMapa: number;
            massaCruaTeorica: number;
            qtdInteira: number;
            massaTotalFinal: number;
          } | null;
          // Passo 3
          passo3: {
            qtdInteira: number;
            divisora: number;
            blocos: number;
            pedacos: number;
            pesoBloco: number;
            pesoUnitarioReal: number;
            pesoPedaco: number;
            instrucaoBlocos: string;
            instrucaoPedaco: string;
          } | null;
          // Componentes diretos (Passo 2 individual)
          insumos: Array<{
            componenteId: number;
            nomeComponente: string;
            tipoComponente: string;
            quantidadeCalculada: number;
            quantidadeAjustada: number;
            unidade: string;
            editavel: boolean;
          }>;
          // Modo de Preparo
          modoPreparo: Array<{
            ordem: number;
            descricao: string;
            tempoMinutos: number;
          }>;
          erro?: string;
        }> = [];

        // Maps para consolidação global
        const massasBaseMap = new Map<number, { produtoId: number; nomeProduto: string; quantidadeTotal: number; produtosFilhos: string[] }>();
        const insumosGlobalMap = new Map<number, { quantidade: number; nome: string; unidade: 'kg' | 'un'; origens: string[] }>();

        for (const item of input) {
          const produto = produtosMap.get(item.codigoProduto);

          if (!produto) {
            resultados.push({
              codigoProduto: item.codigoProduto,
              nomeProduto: item.nomeProduto,
              unidade: item.unidade,
              qtdPlanejada: item.qtdPlanejada,
              diaProduzir: item.diaProduzir,
              pesoUnitario: 0,
              tipoEmbalagem: '',
              quantidadePorEmbalagem: 0,
              passo1: null,
              passo3: null,
              insumos: [],
              modoPreparo: [],
              erro: `Produto não cadastrado`,
            });
            continue;
          }

          const fichaItens = fichasMap.get(produto.id) || [];

          if (fichaItens.length === 0) {
            resultados.push({
              codigoProduto: item.codigoProduto,
              nomeProduto: item.nomeProduto,
              unidade: item.unidade,
              qtdPlanejada: item.qtdPlanejada,
              diaProduzir: item.diaProduzir,
              pesoUnitario: parseFloat(produto.pesoUnitario),
              tipoEmbalagem: produto.tipoEmbalagem || '',
              quantidadePorEmbalagem: produto.quantidadePorEmbalagem || 0,
              passo1: null,
              passo3: null,
              insumos: [],
              modoPreparo: modoPreparoMap.get(produto.id)?.map(mp => ({
                ordem: mp.ordem,
                descricao: mp.descricao,
                tempoMinutos: mp.tempoMinutos,
              })) || [],
              erro: `Sem ficha técnica`,
            });
            continue;
          }

          const pesoUnitario = parseFloat(produto.pesoUnitario);
          const percentualPerdaLiquida = produto.percentualPerdaLiquida 
            ? parseFloat(produto.percentualPerdaLiquida) / 100 
            : 0;

          // ========== PASSO 1: Conversão Assado → Cru ==========
          const passo1 = passo1ConversaoAssadoCru(
            item.qtdPlanejada,
            pesoUnitario,
            percentualPerdaLiquida
          );

          // ========== PASSO 2: Explosão com Paridade ==========
          const fichaTecnicaComponentes = buscaFichaTecnica(produto.id);
          const passo2 = fichaTecnicaComponentes 
            ? passo2ExplosaoParidade(passo1.massaTotalFinal, fichaTecnicaComponentes)
            : { rendimentoFicha: 0, ingredientes: [] };

          // ========== PASSO 3: Blocos e Pedaços ==========
          const dadosBlocos = buscaBlocos(produto.id);
          const passo3 = dadosBlocos 
            ? passo3BlocosPedacos(passo1.qtdInteira, dadosBlocos)
            : null;

          resultados.push({
            codigoProduto: item.codigoProduto,
            nomeProduto: item.nomeProduto,
            unidade: item.unidade,
            qtdPlanejada: item.qtdPlanejada,
            diaProduzir: item.diaProduzir,
            pesoUnitario,
            tipoEmbalagem: produto.tipoEmbalagem || '',
            quantidadePorEmbalagem: produto.quantidadePorEmbalagem || 0,
            passo1,
            passo3,
            insumos: passo2.ingredientes.map(ing => ({
              componenteId: ing.componenteId,
              nomeComponente: ing.nomeComponente,
              tipoComponente: ing.tipoComponente,
              quantidadeCalculada: ing.quantidadeCalculada,
              quantidadeAjustada: ing.quantidadeAjustada,
              unidade: ing.unidade,
              editavel: ing.editavel,
            })),
            modoPreparo: modoPreparoMap.get(produto.id)?.map(mp => ({
              ordem: mp.ordem,
              descricao: mp.descricao,
              tempoMinutos: mp.tempoMinutos,
            })) || [],
          });

          // Explosão recursiva para consolidação global
          if (fichaTecnicaComponentes) {
            explodirRecursivoV3(
              produto.id,
              produto.nome,
              passo1.massaTotalFinal,
              buscaFichaTecnica,
              massasBaseMap,
              insumosGlobalMap
            );
          }
        }

        // Consolidar massas base e insumos globais
        const massasBaseConsolidadas = consolidarMassasBaseV3(massasBaseMap, buscaFichaTecnica);
        const insumosConsolidados = consolidarInsumosV3(insumosGlobalMap);

        // Converter para formato compatível com frontend existente
        const intermediarios = massasBaseConsolidadas.map(mb => ({
          produtoId: mb.produtoId,
          nomeProduto: mb.nomeProduto,
          quantidadeTotal: mb.quantidadeTotal,
          quantidadeArredondada: mb.quantidadeArredondada,
          unidade: 'kg' as const,
          nivel: 1,
          produtosFilhos: mb.produtosFilhos,
          ingredientes: mb.ingredientes.map(ing => ({
            tipoComponente: 'massa_base',
            componenteId: ing.componenteId,
            nomeComponente: ing.nomeComponente,
            quantidadeBase: 0, // não usado no frontend
            quantidadeCalculada: ing.quantidadeCalculada,
            quantidadeArredondada: ing.quantidadeAjustada,
            unidade: ing.unidade,
            editavel: ing.editavel,
          })),
          modoPreparo: modoPreparoMap.get(mb.produtoId)?.map(mp => ({
            ordem: mp.ordem,
            descricao: mp.descricao,
            tempoMinutos: mp.tempoMinutos,
          })) || [],
        }));

        const insumosGlobais = insumosConsolidados.map(ins => ({
          componenteId: ins.componenteId,
          nomeComponente: ins.nomeComponente,
          quantidadeTotal: ins.quantidadeTotal,
          quantidadeArredondada: ins.quantidadeArredondada,
          unidade: ins.unidade,
          editavel: ins.editavel,
          origens: ins.origens,
        }));

        return {
          success: true,
          resultados,
          intermediarios,
          insumosGlobais,
        };
      }),
  }),

  // ==================== DESTINOS ====================
  destinos: router({
    list: protectedProcedure
      .input(z.object({
        ativo: z.boolean().optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return await db.listDestinos(input);
      }),

    getById: protectedProcedure
      .input(z.number().int())
      .query(async ({ input }) => {
        const destino = await db.getDestinoById(input);
        if (!destino) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Destino não encontrado" });
        }
        return destino;
      }),

    create: protectedProcedure
      .input(z.object({
        nome: z.string().min(1).max(100),
        descricao: z.string().optional(),
        ativo: z.boolean().default(true),
      }))
      .mutation(async ({ input }) => {
        await db.createDestino(input);
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number().int(),
        data: z.object({
          nome: z.string().min(1).max(100).optional(),
          descricao: z.string().optional(),
          ativo: z.boolean().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        await db.updateDestino(input.id, input.data);
        return { success: true };
      }),

    toggle: protectedProcedure
      .input(z.number().int())
      .mutation(async ({ input }) => {
        await db.toggleDestino(input);
        return { success: true };
      }),
  }),

  // ==================== EXPEDIÇÃO ====================
  expedicao: router({
    // Listar produtos para expedição (somente Congelado)
    listarProdutos: protectedProcedure
      .query(async () => {
        return await db.getProdutosParaExpedicao(['Congelado']);
      }),

    // Confirmar separação (baixa em lote)
    confirmarSeparacao: protectedProcedure
      .input(z.object({
        itens: z.array(z.object({
          produtoId: z.number().int(),
          quantidade: z.number().positive(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        const userId = ctx.user?.id;
        if (!userId) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário não autenticado" });
        }

        for (const item of input.itens) {
          await db.atualizarSaldoEstoque(
            item.produtoId,
            item.quantidade,
            'saida',
            'Separação para expedição',
            userId
          );
        }

        return { success: true, message: `${input.itens.length} itens processados` };
      }),

    // Atualizar saldo de estoque manualmente
    atualizarSaldo: protectedProcedure
      .input(z.object({
        produtoId: z.number().int(),
        novoSaldo: z.number().min(0),
      }))
      .mutation(async ({ input }) => {
        await db.atualizarSaldoEstoqueDireto(input.produtoId, input.novoSaldo);
        return { success: true };
      }),

    // Registrar entrada de estoque
    registrarEntrada: protectedProcedure
      .input(z.object({
        produtoId: z.number().int(),
        quantidade: z.number().positive(),
        motivo: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const userId = ctx.user?.id;
        if (!userId) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário não autenticado" });
        }

        const novoSaldo = await db.atualizarSaldoEstoque(
          input.produtoId,
          input.quantidade,
          'entrada',
          input.motivo || 'Entrada manual',
          userId
        );

        return { success: true, novoSaldo };
      }),

    // Histórico de movimentações
    historico: protectedProcedure
      .input(z.object({
        produtoId: z.number().int().optional(),
      }).optional())
      .query(async ({ input }) => {
        return await db.getMovimentacoesEstoque(input?.produtoId);
      }),
  }),

});

export type AppRouter = typeof appRouter;
