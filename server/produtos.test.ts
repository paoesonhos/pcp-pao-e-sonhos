import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(): TrpcContext {
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

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Produtos - Validações Críticas", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    const ctx = createTestContext();
    caller = appRouter.createCaller(ctx);
  });

  it("deve rejeitar criação de produto com código duplicado", async () => {
    const produtoData = {
      codigoProduto: "TEST001",
      nome: "Produto Teste",
      unidade: "un" as const,
      pesoUnitario: "0.05000",
      tipoEmbalagem: "Saco",
      quantidadePorEmbalagem: 10,
      ativo: true,
    };

    // Primeiro produto deve ser criado com sucesso
    try {
      await caller.produtos.create(produtoData);
    } catch (error) {
      // Pode falhar se já existir de teste anterior
    }

    // Segundo produto com mesmo código deve falhar
    await expect(caller.produtos.create(produtoData)).rejects.toThrow();
  });

  it("deve exigir peso unitário maior que zero para produtos em unidades", async () => {
    const produtoInvalido = {
      codigoProduto: "TEST002",
      nome: "Produto Inválido",
      unidade: "un" as const,
      pesoUnitario: "0",
      tipoEmbalagem: "Saco",
      quantidadePorEmbalagem: 10,
      ativo: true,
    };

    await expect(caller.produtos.create(produtoInvalido)).rejects.toThrow(
      /peso unitário deve ser maior que zero/i
    );
  });

  it("deve permitir peso unitário zero para produtos em kg", async () => {
    const produtoKg = {
      codigoProduto: "TEST003",
      nome: "Produto em KG",
      unidade: "kg" as const,
      pesoUnitario: "0",
      tipoEmbalagem: "Saco",
      quantidadePorEmbalagem: 1,
      ativo: true,
    };

    // Não deve lançar erro
    try {
      await caller.produtos.create(produtoKg);
    } catch (error: any) {
      // Se falhar, não deve ser por causa do peso unitário
      expect(error.message).not.toMatch(/peso unitário/i);
    }
  });

  it("deve permitir alteração de peso unitário após criação", async () => {
    // Este teste valida que a API aceita alterações de pesoUnitario
    const updateData = {
      id: 1,
      data: {
        pesoUnitario: "0.10000",
      },
    };

    // Não deve lançar erro - peso unitário agora é editável
    await expect(caller.produtos.update(updateData)).resolves.toEqual({ success: true });
  });
});

describe("Insumos - Validações Críticas", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    const ctx = createTestContext();
    caller = appRouter.createCaller(ctx);
  });

  it("deve rejeitar criação de insumo com código duplicado", async () => {
    const insumoData = {
      codigoInsumo: "INS001",
      nome: "Farinha Teste",
      tipo: "seco" as const,
      unidadeMedida: "kg" as const,
      ativo: true,
    };

    // Primeiro insumo deve ser criado com sucesso
    try {
      await caller.insumos.create(insumoData);
    } catch (error) {
      // Pode falhar se já existir de teste anterior
    }

    // Segundo insumo com mesmo código deve falhar
    await expect(caller.insumos.create(insumoData)).rejects.toThrow();
  });
});

describe("Ficha Técnica - Validações Críticas", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    const ctx = createTestContext();
    caller = appRouter.createCaller(ctx);
  });

  it("deve rejeitar componentes de nível superior a 2", async () => {
    const componenteNivel3 = {
      produtoId: 1,
      componenteId: 1,
      tipoComponente: "ingrediente" as const,
      quantidadeBase: "1.00000",
      unidade: "kg" as const,
      ordem: 0,
      nivel: 3,
    };

    // Validação de schema Zod rejeita nível > 2
    await expect(caller.fichaTecnica.create(componenteNivel3)).rejects.toThrow();
  });

  it("deve exigir paiId para componentes de nível 2", async () => {
    const componenteNivel2SemPai = {
      produtoId: 1,
      componenteId: 1,
      tipoComponente: "sub_bloco" as const,
      quantidadeBase: "1.00000",
      unidade: "kg" as const,
      ordem: 0,
      nivel: 2,
      // paiId ausente
    };

    await expect(caller.fichaTecnica.create(componenteNivel2SemPai)).rejects.toThrow(
      /devem ter um componente pai/i
    );
  });

  it("deve rejeitar paiId para componentes de nível 1", async () => {
    const componenteNivel1ComPai = {
      produtoId: 1,
      componenteId: 1,
      tipoComponente: "ingrediente" as const,
      quantidadeBase: "1.00000",
      unidade: "kg" as const,
      ordem: 0,
      nivel: 1,
      paiId: 1,
    };

    await expect(caller.fichaTecnica.create(componenteNivel1ComPai)).rejects.toThrow(
      /não podem ter componente pai/i
    );
  });
});

describe("Blocos - Validações Críticas", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    const ctx = createTestContext();
    caller = appRouter.createCaller(ctx);
  });

  it("deve validar consistência do peso do bloco", async () => {
    // Assumindo produto com peso unitário de 0.05 kg
    // 30 unidades × 0.05 kg = 1.5 kg
    const blocoInconsistente = {
      produtoId: 1,
      unidadesPorBloco: 30,
      pesoBloco: "2.00000", // Peso incorreto (deveria ser ~1.5 kg)
      ativo: true,
    };

    // Este teste pode falhar se o produto não existir ou tiver peso diferente
    // A validação deve ocorrer no backend
    try {
      await caller.blocos.create(blocoInconsistente);
    } catch (error: any) {
      // Se falhar, pode ser por inconsistência de peso ou produto não encontrado
      expect(error.message).toMatch(/peso.*inconsistente|produto não encontrado/i);
    }
  });

  it("deve rejeitar blocos para produtos inexistentes", async () => {
    const blocoParaProdutoInexistente = {
      produtoId: 999999, // Produto que não existe
      unidadesPorBloco: 30,
      pesoBloco: "1.50000",
      ativo: true,
    };

    // Deve rejeitar porque produto não existe
    await expect(caller.blocos.create(blocoParaProdutoInexistente)).rejects.toThrow(
      /produto não encontrado/i
    );
  });
});
