import { describe, it, expect } from 'vitest';
import {
  arredondarPesagem,
  arredondarUnidades,
  calcularBlocos,
  calcularUnidadesRestantes,
  calcularPesoPedaco,
  kgParaUnidades,
  processarDivisora,
  explodirInsumos,
  explodirInsumosRecursivo,
  aplicarArredondamentoFinal,
  processarExplosaoConsolidada,
  type ItemFichaTecnica,
  type FichaTecnicaCompleta,
} from '@shared/pcp-utils';

describe('PCP Utils - Regra de Ouro da Pesagem', () => {
  it('deve arredondar para baixo em múltiplos de 0.005', () => {
    expect(arredondarPesagem(1.247)).toBe(1.245);
    expect(arredondarPesagem(1.243)).toBe(1.240);
    expect(arredondarPesagem(1.248)).toBe(1.245);
    expect(arredondarPesagem(1.250)).toBe(1.250);
    expect(arredondarPesagem(1.251)).toBe(1.250);
    expect(arredondarPesagem(1.254)).toBe(1.250);
    // 1.255 em ponto flutuante é representado como 1.254999... então arredonda para 1.250
    expect(arredondarPesagem(1.255)).toBe(1.250);
  });

  it('deve lidar com valores pequenos', () => {
    expect(arredondarPesagem(0.001)).toBe(0.000);
    expect(arredondarPesagem(0.004)).toBe(0.000);
    expect(arredondarPesagem(0.005)).toBe(0.005);
    expect(arredondarPesagem(0.006)).toBe(0.005);
  });

  it('deve lidar com valores maiores', () => {
    expect(arredondarPesagem(10.123)).toBe(10.120);
    expect(arredondarPesagem(10.127)).toBe(10.125);
    expect(arredondarPesagem(100.999)).toBe(100.995);
  });
});

describe('PCP Utils - Arredondamento de Unidades', () => {
  it('deve arredondar sempre para baixo sem decimais', () => {
    expect(arredondarUnidades(10.9)).toBe(10);
    expect(arredondarUnidades(10.1)).toBe(10);
    expect(arredondarUnidades(10.0)).toBe(10);
    expect(arredondarUnidades(0.9)).toBe(0);
  });
});

describe('PCP Utils - Cálculo de Blocos', () => {
  it('deve calcular blocos inteiros de 30 unidades', () => {
    expect(calcularBlocos(30)).toBe(1);
    expect(calcularBlocos(60)).toBe(2);
    expect(calcularBlocos(90)).toBe(3);
    expect(calcularBlocos(85)).toBe(2);
    expect(calcularBlocos(29)).toBe(0);
  });

  it('deve calcular unidades restantes', () => {
    expect(calcularUnidadesRestantes(30)).toBe(0);
    expect(calcularUnidadesRestantes(31)).toBe(1);
    expect(calcularUnidadesRestantes(85)).toBe(25);
    expect(calcularUnidadesRestantes(29)).toBe(29);
  });
});

describe('PCP Utils - Conversão kg para Unidades', () => {
  it('deve converter kg para unidades corretamente', () => {
    // 1kg de pães de 0.05kg = 20 unidades
    expect(kgParaUnidades(1.0, 0.05)).toBe(20);
    // 2.5kg de pães de 0.05kg = 50 unidades
    expect(kgParaUnidades(2.5, 0.05)).toBe(50);
    // 8.55kg de pães de 0.05kg = 171 unidades
    expect(kgParaUnidades(8.55, 0.05)).toBe(171);
  });

  it('deve arredondar para baixo', () => {
    // 1.07kg de pães de 0.05kg = 21.4 → 21 unidades
    expect(kgParaUnidades(1.07, 0.05)).toBe(21);
  });

  it('deve retornar 0 para peso unitário inválido', () => {
    expect(kgParaUnidades(1.0, 0)).toBe(0);
    expect(kgParaUnidades(1.0, -0.05)).toBe(0);
  });
});

describe('PCP Utils - Processamento da Divisora', () => {
  it('deve processar divisora corretamente', () => {
    // 8.55kg de pães de 0.05kg cada
    const resultado = processarDivisora(8.55, 0.05);
    
    // 8.55 / 0.05 = 171 unidades
    expect(resultado.quantidadeUnidades).toBe(171);
    
    // 171 / 30 = 5 blocos (150 unidades)
    expect(resultado.blocosInteiros).toBe(5);
    
    // Peso do bloco: 30 × 0.05 = 1.5kg
    expect(resultado.pesoBloco).toBe(1.5);
    
    // Unidades restantes: 171 - 150 = 21
    expect(resultado.unidadesRestantes).toBe(21);
    
    // Peso do pedaço: 21 × 0.05 = 1.05kg
    expect(resultado.pesoPedaco).toBe(1.05);
    
    // Massa total: (5 × 1.5) + 1.05 = 8.55kg
    expect(resultado.massaTotal).toBe(8.55);
  });

  it('deve lidar com quantidade exata de blocos', () => {
    // 3kg de pães de 0.05kg = 60 unidades = 2 blocos exatos
    const resultado = processarDivisora(3.0, 0.05);
    
    expect(resultado.quantidadeUnidades).toBe(60);
    expect(resultado.blocosInteiros).toBe(2);
    expect(resultado.unidadesRestantes).toBe(0);
    expect(resultado.pesoPedaco).toBe(0);
  });

  it('deve lidar com quantidade menor que um bloco', () => {
    // 1kg de pães de 0.05kg = 20 unidades < 30
    const resultado = processarDivisora(1.0, 0.05);
    
    expect(resultado.quantidadeUnidades).toBe(20);
    expect(resultado.blocosInteiros).toBe(0);
    expect(resultado.unidadesRestantes).toBe(20);
    expect(resultado.pesoPedaco).toBe(1.0);
  });
});

describe('PCP Utils - Explosão de Insumos', () => {
  const fichaTecnicaExemplo: ItemFichaTecnica[] = [
    {
      componenteId: 1,
      nomeComponente: 'FARINHA DE TRIGO',
      tipoComponente: 'ingrediente',
      quantidadeBase: 0.6, // 60%
      unidade: 'kg',
      nivel: 1,
    },
    {
      componenteId: 2,
      nomeComponente: 'AÇÚCAR',
      tipoComponente: 'ingrediente',
      quantidadeBase: 0.15, // 15%
      unidade: 'kg',
      nivel: 1,
    },
    {
      componenteId: 3,
      nomeComponente: 'FERMENTO BIOLÓGICO',
      tipoComponente: 'ingrediente',
      quantidadeBase: 0.02, // 2%
      unidade: 'kg',
      nivel: 1,
    },
    {
      componenteId: 4,
      nomeComponente: 'OVOS',
      tipoComponente: 'ingrediente',
      quantidadeBase: 2, // 2 unidades por kg de massa
      unidade: 'un',
      nivel: 1,
    },
  ];

  it('deve explodir insumos corretamente', () => {
    const resultado = explodirInsumos(10.0, fichaTecnicaExemplo);
    
    expect(resultado).toHaveLength(4);
    
    // Farinha: 10 × 0.6 = 6kg
    const farinha = resultado.find(i => i.componenteId === 1);
    expect(farinha?.quantidadeCalculada).toBe(6);
    expect(farinha?.quantidadeArredondada).toBe(6);
    expect(farinha?.editavel).toBe(false);
    
    // Açúcar: 10 × 0.15 = 1.5kg
    const acucar = resultado.find(i => i.componenteId === 2);
    expect(acucar?.quantidadeCalculada).toBe(1.5);
    expect(acucar?.quantidadeArredondada).toBe(1.5);
    
    // Fermento: 10 × 0.02 = 0.2kg (editável)
    const fermento = resultado.find(i => i.componenteId === 3);
    expect(fermento?.quantidadeCalculada).toBe(0.2);
    expect(fermento?.quantidadeArredondada).toBe(0.2);
    expect(fermento?.editavel).toBe(true);
    
    // Ovos: 10 × 2 = 20 unidades
    const ovos = resultado.find(i => i.componenteId === 4);
    expect(ovos?.quantidadeCalculada).toBe(20);
    expect(ovos?.quantidadeArredondada).toBe(20);
  });

  it('deve aplicar regra de ouro no arredondamento', () => {
    // 10.26kg de massa
    const resultado = explodirInsumos(10.26, fichaTecnicaExemplo);
    
    // Farinha: 10.26 × 0.6 = 6.156 → 6.155kg
    const farinha = resultado.find(i => i.componenteId === 1);
    expect(farinha?.quantidadeArredondada).toBe(6.155);
    
    // Açúcar: 10.26 × 0.15 = 1.539 → 1.535kg
    const acucar = resultado.find(i => i.componenteId === 2);
    expect(acucar?.quantidadeArredondada).toBe(1.535);
  });

  it('deve arredondar unidades para baixo', () => {
    // 10.5kg de massa → 10.5 × 2 = 21 ovos (não 21.0)
    const resultado = explodirInsumos(10.5, fichaTecnicaExemplo);
    
    const ovos = resultado.find(i => i.componenteId === 4);
    expect(ovos?.quantidadeArredondada).toBe(21);
  });

  it('deve identificar fermento como editável', () => {
    const resultado = explodirInsumos(10.0, fichaTecnicaExemplo);
    
    // Apenas fermento deve ser editável
    const editaveis = resultado.filter(i => i.editavel);
    expect(editaveis).toHaveLength(1);
    expect(editaveis[0].nomeComponente).toContain('FERMENTO');
  });
});

describe('PCP Utils - Cálculo do Peso do Pedaço', () => {
  it('deve calcular peso do pedaço com arredondamento', () => {
    // 21 unidades × 0.05kg = 1.05kg
    expect(calcularPesoPedaco(21, 0.05)).toBe(1.05);
    
    // 25 unidades × 0.05kg = 1.25kg
    expect(calcularPesoPedaco(25, 0.05)).toBe(1.25);
    
    // 17 unidades × 0.033kg = 0.561 → 0.560kg
    expect(calcularPesoPedaco(17, 0.033)).toBe(0.560);
  });
});

describe('PCP Utils - Explosão Recursiva e Consolidação', () => {
  // Simula estrutura de cascata:
  // Produto Final (MINUTO) → Massa Amarelinha → Massa Base Doce → Insumos brutos
  
  // Nível 1: Massa Base Doce (insumos brutos)
  const fichaMassaBaseDoce: FichaTecnicaCompleta[] = [
    {
      componenteId: 1,
      nomeComponente: 'FARINHA DE TRIGO',
      tipoComponente: 'ingrediente',
      quantidadeBase: 0.5, // 50%
      unidade: 'kg',
      nivel: 1,
    },
    {
      componenteId: 2,
      nomeComponente: 'AÇÚCAR',
      tipoComponente: 'ingrediente',
      quantidadeBase: 0.2, // 20%
      unidade: 'kg',
      nivel: 1,
    },
    {
      componenteId: 3,
      nomeComponente: 'ÁGUA',
      tipoComponente: 'ingrediente',
      quantidadeBase: 0.3, // 30%
      unidade: 'kg',
      nivel: 1,
    },
  ];

  // Nível 2: Massa Amarelinha (chama Massa Base Doce + adiciona ingredientes)
  const fichaMassaAmarelinha: FichaTecnicaCompleta[] = [
    {
      componenteId: 100, // ID do produto Massa Base Doce
      nomeComponente: 'MASSA BASE DOCE',
      tipoComponente: 'massa_base',
      quantidadeBase: 0.8, // 80% da massa é Massa Base Doce
      unidade: 'kg',
      nivel: 1,
      fichaTecnicaComponente: fichaMassaBaseDoce,
    },
    {
      componenteId: 4,
      nomeComponente: 'MANTEIGA',
      tipoComponente: 'ingrediente',
      quantidadeBase: 0.15, // 15%
      unidade: 'kg',
      nivel: 1,
    },
    {
      componenteId: 5,
      nomeComponente: 'CORANTE AMARELO',
      tipoComponente: 'ingrediente',
      quantidadeBase: 0.05, // 5%
      unidade: 'kg',
      nivel: 1,
    },
  ];

  // Nível 3: Produto Final MINUTO (chama Massa Amarelinha)
  const fichaProdutoFinal: FichaTecnicaCompleta[] = [
    {
      componenteId: 200, // ID do produto Massa Amarelinha
      nomeComponente: 'MASSA AMARELINHA',
      tipoComponente: 'massa_base',
      quantidadeBase: 1.0, // 100% da massa é Massa Amarelinha
      unidade: 'kg',
      nivel: 1,
      fichaTecnicaComponente: fichaMassaAmarelinha,
    },
  ];

  it('deve explodir insumos recursivamente até nível base', () => {
    const insumosMap = explodirInsumosRecursivo(10.0, fichaProdutoFinal);
    
    // Deve ter 5 insumos brutos (farinha, açúcar, água, manteiga, corante)
    expect(insumosMap.size).toBe(5);
    
    // Verificar que todos são ingredientes (não massa_base)
    for (const insumo of Array.from(insumosMap.values())) {
      expect(['FARINHA DE TRIGO', 'AÇÚCAR', 'ÁGUA', 'MANTEIGA', 'CORANTE AMARELO']).toContain(insumo.nomeComponente);
    }
  });

  it('deve calcular quantidades corretas na cascata', () => {
    // 10kg de Produto Final
    // → 10kg × 1.0 = 10kg de Massa Amarelinha
    //   → 10kg × 0.8 = 8kg de Massa Base Doce
    //     → 8kg × 0.5 = 4kg de Farinha
    //     → 8kg × 0.2 = 1.6kg de Açúcar
    //     → 8kg × 0.3 = 2.4kg de Água
    //   → 10kg × 0.15 = 1.5kg de Manteiga
    //   → 10kg × 0.05 = 0.5kg de Corante
    
    const insumosMap = explodirInsumosRecursivo(10.0, fichaProdutoFinal);
    
    const farinha = insumosMap.get(1);
    expect(farinha?.quantidadeTotal).toBe(4.0);
    
    const acucar = insumosMap.get(2);
    expect(acucar?.quantidadeTotal).toBe(1.6);
    
    const agua = insumosMap.get(3);
    expect(agua?.quantidadeTotal).toBe(2.4);
    
    const manteiga = insumosMap.get(4);
    expect(manteiga?.quantidadeTotal).toBe(1.5);
    
    const corante = insumosMap.get(5);
    expect(corante?.quantidadeTotal).toBe(0.5);
  });

  it('deve consolidar insumos repetidos somando quantidades', () => {
    // Ficha onde farinha aparece em dois níveis
    const fichaComRepeticao: FichaTecnicaCompleta[] = [
      {
        componenteId: 100,
        nomeComponente: 'MASSA BASE',
        tipoComponente: 'massa_base',
        quantidadeBase: 0.8,
        unidade: 'kg',
        nivel: 1,
        fichaTecnicaComponente: [
          {
            componenteId: 1,
            nomeComponente: 'FARINHA DE TRIGO',
            tipoComponente: 'ingrediente',
            quantidadeBase: 0.5,
            unidade: 'kg',
            nivel: 1,
          },
        ],
      },
      {
        componenteId: 1, // Mesmo insumo adicionado diretamente
        nomeComponente: 'FARINHA DE TRIGO',
        tipoComponente: 'ingrediente',
        quantidadeBase: 0.1, // 10% adicional
        unidade: 'kg',
        nivel: 1,
      },
    ];
    
    // 10kg de produto
    // → 8kg de Massa Base × 0.5 = 4kg de farinha (via massa base)
    // → 10kg × 0.1 = 1kg de farinha (direto)
    // Total: 5kg de farinha
    
    const insumosMap = explodirInsumosRecursivo(10.0, fichaComRepeticao);
    const farinha = insumosMap.get(1);
    
    expect(farinha?.quantidadeTotal).toBe(5.0);
    expect(farinha?.origens).toContain('MASSA BASE');
    expect(farinha?.origens).toContain('Direto');
  });

  it('deve aplicar arredondamento apenas no total final', () => {
    const resultado = processarExplosaoConsolidada(10.26, fichaProdutoFinal);
    
    // Farinha: 10.26 × 1.0 × 0.8 × 0.5 = 4.104 → 4.100kg
    const farinha = resultado.find(i => i.componenteId === 1);
    expect(farinha?.quantidadeArredondada).toBe(4.100);
    
    // Açúcar: 10.26 × 1.0 × 0.8 × 0.2 = 1.6416 → 1.640kg
    const acucar = resultado.find(i => i.componenteId === 2);
    expect(acucar?.quantidadeArredondada).toBe(1.640);
  });

  it('deve rastrear origens dos insumos', () => {
    const resultado = processarExplosaoConsolidada(10.0, fichaProdutoFinal);
    
    // Farinha vem da Massa Base Doce (via Massa Amarelinha)
    const farinha = resultado.find(i => i.componenteId === 1);
    expect(farinha?.origens).toContain('MASSA BASE DOCE');
    
    // Manteiga vem diretamente da Massa Amarelinha
    const manteiga = resultado.find(i => i.componenteId === 4);
    expect(manteiga?.origens).toContain('MASSA AMARELINHA');
  });

  it('deve identificar fermento como editável na explosão recursiva', () => {
    const fichaComFermento: FichaTecnicaCompleta[] = [
      {
        componenteId: 100,
        nomeComponente: 'MASSA BASE',
        tipoComponente: 'massa_base',
        quantidadeBase: 1.0,
        unidade: 'kg',
        nivel: 1,
        fichaTecnicaComponente: [
          {
            componenteId: 1,
            nomeComponente: 'FARINHA',
            tipoComponente: 'ingrediente',
            quantidadeBase: 0.5,
            unidade: 'kg',
            nivel: 1,
          },
          {
            componenteId: 2,
            nomeComponente: 'FERMENTO BIOLÓGICO',
            tipoComponente: 'ingrediente',
            quantidadeBase: 0.02,
            unidade: 'kg',
            nivel: 1,
          },
        ],
      },
    ];
    
    const resultado = processarExplosaoConsolidada(10.0, fichaComFermento);
    
    const fermento = resultado.find(i => i.nomeComponente.includes('FERMENTO'));
    expect(fermento?.editavel).toBe(true);
    
    const farinha = resultado.find(i => i.nomeComponente === 'FARINHA');
    expect(farinha?.editavel).toBe(false);
  });
});
