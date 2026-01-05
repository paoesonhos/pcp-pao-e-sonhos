import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import * as dbImportacoesV2 from "./db-importacoes-v2";

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

        // IMPORTANTE: pesoUnitario não pode ser alterado após criação
        if (input.data.pesoUnitario) {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: "Peso unitário não pode ser alterado após a criação do produto" 
          });
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

        if (produto.unidade !== "un") {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: "Apenas produtos em unidades podem ter configuração de blocos" 
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

  importacoesV2: router({
    importar: protectedProcedure
      .input(
        z.object({
          dataReferencia: z.string(),
          arquivoSegQua: z.string(),
          arquivoQuiSab: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const importacaoId = await dbImportacoesV2.criarImportacaoV2(
          input.dataReferencia,
          ctx.user.id
        );
        return { importacaoId };
      }),

    obterMapa: protectedProcedure
      .input(z.object({ importacaoId: z.number() }))
      .query(async ({ input }) => {
        return await dbImportacoesV2.getMapaProducaoV2(input.importacaoId);
      }),

    atualizarQuantidade: protectedProcedure
      .input(
        z.object({
          importacaoId: z.number(),
          produtoId: z.number(),
          diaSemana: z.number(),
          quantidade: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        await dbImportacoesV2.atualizarQuantidadeV2(
          input.importacaoId,
          input.produtoId,
          input.diaSemana,
          input.quantidade
        );
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
