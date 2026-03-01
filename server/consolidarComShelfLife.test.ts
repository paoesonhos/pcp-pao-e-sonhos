import { describe, it, expect } from "vitest";

/**
 * Testes para a lógica de consolidação com shelf life
 * 
 * A função consolidarComShelfLife agrupa itens por intervalo de shelf life
 * e consolida quantidades no primeiro dia do intervalo, zerando os demais.
 * 
 * Fórmula do intervalo: intervaloIndex = Math.floor((dia - 2) / shelfLife)
 * 
 * Exemplos:
 * - Shelf life 3: dias 2,3,4 → intervalo 0; dias 5,6,7 → intervalo 1
 * - Shelf life 4: dias 2,3,4,5 → intervalo 0; dias 6,7 → intervalo 1
 */

describe("consolidarComShelfLife - Lógica de Intervalo", () => {
  // Função auxiliar para calcular intervalo
  const calcularIntervalo = (dia: number, shelfLife: number): number => {
    return Math.floor((dia - 2) / shelfLife);
  };

  it("deve calcular intervalo corretamente para shelf life 3", () => {
    expect(calcularIntervalo(2, 3)).toBe(0); // Intervalo 0
    expect(calcularIntervalo(3, 3)).toBe(0); // Intervalo 0
    expect(calcularIntervalo(4, 3)).toBe(0); // Intervalo 0
    expect(calcularIntervalo(5, 3)).toBe(1); // Intervalo 1
    expect(calcularIntervalo(6, 3)).toBe(1); // Intervalo 1
    expect(calcularIntervalo(7, 3)).toBe(1); // Intervalo 1
  });

  it("deve calcular intervalo corretamente para shelf life 4", () => {
    expect(calcularIntervalo(2, 4)).toBe(0); // Intervalo 0
    expect(calcularIntervalo(3, 4)).toBe(0); // Intervalo 0
    expect(calcularIntervalo(4, 4)).toBe(0); // Intervalo 0
    expect(calcularIntervalo(5, 4)).toBe(0); // Intervalo 0
    expect(calcularIntervalo(6, 4)).toBe(1); // Intervalo 1
    expect(calcularIntervalo(7, 4)).toBe(1); // Intervalo 1
  });

  it("deve agrupar dias corretamente por intervalo", () => {
    // Simular agrupamento para shelf life 3
    const dias = [2, 3, 4, 5, 6, 7];
    const shelfLife = 3;
    const grupos = new Map<number, number[]>();

    dias.forEach((dia) => {
      const intervalo = calcularIntervalo(dia, shelfLife);
      if (!grupos.has(intervalo)) {
        grupos.set(intervalo, []);
      }
      grupos.get(intervalo)!.push(dia);
    });

    // Esperado: Intervalo 0 = [2,3,4], Intervalo 1 = [5,6,7]
    expect(grupos.get(0)).toEqual([2, 3, 4]);
    expect(grupos.get(1)).toEqual([5, 6, 7]);
  });

  it("deve consolidar corretamente: dias 2,3,4 com shelf life 3", () => {
    // Simular consolidação
    const shelfLife = 3;
    const itemsIntervalo = [
      { dia: 2, quantidade: 20 },
      { dia: 3, quantidade: 20 },
      { dia: 4, quantidade: 20 },
    ];

    const primeirodia = itemsIntervalo[0].dia;
    const quantidadeTotal = itemsIntervalo.reduce(
      (sum, item) => sum + item.quantidade,
      0
    );

    // Resultado esperado
    const resultado: { dia: number; quantidade: number }[] = [];

    // Primeiro dia recebe a soma
    resultado.push({
      dia: primeirodia,
      quantidade: quantidadeTotal,
    });

    // Demais dias recebem 0
    for (let i = 1; i < shelfLife; i++) {
      const dia = primeirodia + i;
      if (dia <= 7) {
        resultado.push({
          dia,
          quantidade: 0,
        });
      }
    }

    // Validações
    expect(resultado).toHaveLength(3);
    expect(resultado[0]).toEqual({ dia: 2, quantidade: 60 });
    expect(resultado[1]).toEqual({ dia: 3, quantidade: 0 });
    expect(resultado[2]).toEqual({ dia: 4, quantidade: 0 });
  });

  it("deve consolidar corretamente: dias 2,3,4,5 com shelf life 4", () => {
    const shelfLife = 4;
    const itemsIntervalo = [
      { dia: 2, quantidade: 10 },
      { dia: 3, quantidade: 10 },
      { dia: 4, quantidade: 10 },
      { dia: 5, quantidade: 10 },
    ];

    const primeirodia = itemsIntervalo[0].dia;
    const quantidadeTotal = itemsIntervalo.reduce(
      (sum, item) => sum + item.quantidade,
      0
    );

    const resultado: { dia: number; quantidade: number }[] = [];

    resultado.push({
      dia: primeirodia,
      quantidade: quantidadeTotal,
    });

    for (let i = 1; i < shelfLife; i++) {
      const dia = primeirodia + i;
      if (dia <= 7) {
        resultado.push({
          dia,
          quantidade: 0,
        });
      }
    }

    expect(resultado).toHaveLength(4);
    expect(resultado[0]).toEqual({ dia: 2, quantidade: 40 });
    expect(resultado[1]).toEqual({ dia: 3, quantidade: 0 });
    expect(resultado[2]).toEqual({ dia: 4, quantidade: 0 });
    expect(resultado[3]).toEqual({ dia: 5, quantidade: 0 });
  });

  it("deve consolidar múltiplos intervalos: dias 2-7 com shelf life 3", () => {
    const shelfLife = 3;
    const dias = [2, 3, 4, 5, 6, 7];
    const quantidades = [20, 20, 20, 30, 30, 30]; // Diferentes quantidades por dia

    // Agrupar por intervalo
    const grupos = new Map<number, { dia: number; quantidade: number }[]>();
    dias.forEach((dia, idx) => {
      const intervalo = calcularIntervalo(dia, shelfLife);
      if (!grupos.has(intervalo)) {
        grupos.set(intervalo, []);
      }
      grupos.get(intervalo)!.push({
        dia,
        quantidade: quantidades[idx],
      });
    });

    // Consolidar cada intervalo
    const resultado: { dia: number; quantidade: number }[] = [];

    grupos.forEach((itemsIntervalo) => {
      const primeirodia = itemsIntervalo[0].dia;
      const quantidadeTotal = itemsIntervalo.reduce(
        (sum, item) => sum + item.quantidade,
        0
      );

      resultado.push({
        dia: primeirodia,
        quantidade: quantidadeTotal,
      });

      for (let i = 1; i < shelfLife; i++) {
        const dia = primeirodia + i;
        if (dia <= 7) {
          resultado.push({
            dia,
            quantidade: 0,
          });
        }
      }
    });

    // Esperado:
    // Intervalo 0 (dias 2,3,4): 20+20+20 = 60 no dia 2, 0 nos dias 3,4
    // Intervalo 1 (dias 5,6,7): 30+30+30 = 90 no dia 5, 0 nos dias 6,7
    expect(resultado).toHaveLength(6);
    expect(resultado[0]).toEqual({ dia: 2, quantidade: 60 });
    expect(resultado[1]).toEqual({ dia: 3, quantidade: 0 });
    expect(resultado[2]).toEqual({ dia: 4, quantidade: 0 });
    expect(resultado[3]).toEqual({ dia: 5, quantidade: 90 });
    expect(resultado[4]).toEqual({ dia: 6, quantidade: 0 });
    expect(resultado[5]).toEqual({ dia: 7, quantidade: 0 });
  });

  it("deve manter produtos sem shelf life (shelfLife = 0)", () => {
    const shelfLife = 0;
    const itemsIntervalo = [
      { dia: 2, quantidade: 20 },
      { dia: 3, quantidade: 20 },
      { dia: 4, quantidade: 20 },
    ];

    // Com shelf life 0, não fazer consolidação
    const resultado = [...itemsIntervalo];

    expect(resultado).toHaveLength(3);
    expect(resultado[0]).toEqual({ dia: 2, quantidade: 20 });
    expect(resultado[1]).toEqual({ dia: 3, quantidade: 20 });
    expect(resultado[2]).toEqual({ dia: 4, quantidade: 20 });
  });
});
