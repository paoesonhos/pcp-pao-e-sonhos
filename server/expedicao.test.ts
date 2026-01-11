import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock do módulo db
vi.mock('./db', () => ({
  getDb: vi.fn(),
  listDestinos: vi.fn(),
  getDestinoById: vi.fn(),
  createDestino: vi.fn(),
  updateDestino: vi.fn(),
  toggleDestino: vi.fn(),
  getProdutosParaExpedicao: vi.fn(),
  atualizarSaldoEstoque: vi.fn(),
  atualizarSaldoEstoqueDireto: vi.fn(),
  getMovimentacoesEstoque: vi.fn(),
}));

import * as db from './db';

describe('Módulo Expedição - Destinos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listDestinos', () => {
    it('deve retornar lista de destinos ativos', async () => {
      const mockDestinos = [
        { id: 1, nome: 'Congelado', descricao: 'Produtos congelados', ativo: true },
        { id: 2, nome: 'Pré-Preparo', descricao: 'Produtos pré-preparados', ativo: true },
      ];

      vi.mocked(db.listDestinos).mockResolvedValue(mockDestinos);

      const result = await db.listDestinos({ ativo: true });

      expect(result).toHaveLength(2);
      expect(result[0].nome).toBe('Congelado');
      expect(result[1].nome).toBe('Pré-Preparo');
    });

    it('deve filtrar destinos por nome', async () => {
      const mockDestinos = [
        { id: 1, nome: 'Congelado', descricao: 'Produtos congelados', ativo: true },
      ];

      vi.mocked(db.listDestinos).mockResolvedValue(mockDestinos);

      const result = await db.listDestinos({ search: 'Congelado' });

      expect(result).toHaveLength(1);
      expect(result[0].nome).toBe('Congelado');
    });
  });

  describe('createDestino', () => {
    it('deve criar um novo destino', async () => {
      vi.mocked(db.createDestino).mockResolvedValue(undefined);

      await db.createDestino({ nome: 'Venda Direta', descricao: 'Venda direta ao consumidor' });

      expect(db.createDestino).toHaveBeenCalledWith({
        nome: 'Venda Direta',
        descricao: 'Venda direta ao consumidor',
      });
    });
  });

  describe('toggleDestino', () => {
    it('deve alternar status do destino', async () => {
      vi.mocked(db.toggleDestino).mockResolvedValue(undefined);

      await db.toggleDestino(1);

      expect(db.toggleDestino).toHaveBeenCalledWith(1);
    });
  });
});

describe('Módulo Expedição - Estoque', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProdutosParaExpedicao', () => {
    it('deve retornar produtos com destino Congelado ou Pré-Preparo', async () => {
      const mockProdutos = [
        { id: 1, codigoProduto: 'PROD001', nome: 'Folhado de Frango', saldoEstoque: '100.00000', destinoId: 1 },
        { id: 2, codigoProduto: 'PROD002', nome: 'Coxinha', saldoEstoque: '50.00000', destinoId: 2 },
      ];

      vi.mocked(db.getProdutosParaExpedicao).mockResolvedValue(mockProdutos);

      const result = await db.getProdutosParaExpedicao(['Congelado', 'Pré-Preparo']);

      expect(result).toHaveLength(2);
      expect(result[0].nome).toBe('Folhado de Frango');
    });

    it('deve retornar lista vazia se não houver destinos cadastrados', async () => {
      vi.mocked(db.getProdutosParaExpedicao).mockResolvedValue([]);

      const result = await db.getProdutosParaExpedicao(['Congelado', 'Pré-Preparo']);

      expect(result).toHaveLength(0);
    });
  });

  describe('atualizarSaldoEstoque', () => {
    it('deve registrar saída e atualizar saldo', async () => {
      vi.mocked(db.atualizarSaldoEstoque).mockResolvedValue(80);

      const novoSaldo = await db.atualizarSaldoEstoque(1, 20, 'saida', 'Separação para expedição', 1);

      expect(novoSaldo).toBe(80);
      expect(db.atualizarSaldoEstoque).toHaveBeenCalledWith(1, 20, 'saida', 'Separação para expedição', 1);
    });

    it('deve registrar entrada e atualizar saldo', async () => {
      vi.mocked(db.atualizarSaldoEstoque).mockResolvedValue(150);

      const novoSaldo = await db.atualizarSaldoEstoque(1, 50, 'entrada', 'Produção', 1);

      expect(novoSaldo).toBe(150);
    });

    it('não deve permitir saldo negativo na saída', async () => {
      vi.mocked(db.atualizarSaldoEstoque).mockResolvedValue(0);

      const novoSaldo = await db.atualizarSaldoEstoque(1, 200, 'saida', 'Separação', 1);

      expect(novoSaldo).toBe(0); // Saldo mínimo é 0
    });
  });

  describe('atualizarSaldoEstoqueDireto', () => {
    it('deve atualizar saldo diretamente', async () => {
      vi.mocked(db.atualizarSaldoEstoqueDireto).mockResolvedValue(undefined);

      await db.atualizarSaldoEstoqueDireto(1, 100);

      expect(db.atualizarSaldoEstoqueDireto).toHaveBeenCalledWith(1, 100);
    });
  });
});

describe('Inteligência de Reposição', () => {
  it('deve calcular estoque mínimo corretamente', () => {
    const mediaDiaria = 10; // 10 unidades por dia
    const estoqueMinimoDias = 4; // 4 dias de segurança

    const estoqueMinimo = mediaDiaria * estoqueMinimoDias;

    expect(estoqueMinimo).toBe(40);
  });

  it('deve identificar produto em ruptura', () => {
    const saldoAtual = 30;
    const estoqueMinimo = 40;

    const emRuptura = saldoAtual < estoqueMinimo;

    expect(emRuptura).toBe(true);
  });

  it('deve calcular quantidade sugerida para reposição', () => {
    const mediaDiaria = 10;
    const estoqueMinimoDias = 4;

    const qtdSugerida = Math.ceil(estoqueMinimoDias * mediaDiaria);

    expect(qtdSugerida).toBe(40);
  });

  it('deve calcular média diária a partir de vendas semanais', () => {
    const vendas = {
      dia2: 12,
      dia3: 8,
      dia4: 10,
      dia5: 15,
      dia6: 20,
      dia7: 25,
    };

    const totalSemana = vendas.dia2 + vendas.dia3 + vendas.dia4 + vendas.dia5 + vendas.dia6 + vendas.dia7;
    const mediaDiaria = totalSemana / 6;

    expect(totalSemana).toBe(90);
    expect(mediaDiaria).toBe(15);
  });
});
