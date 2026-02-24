import { describe, it, expect } from 'vitest';
import { processarDivisora, explodirInsumos } from '@shared/pcp-utils';

/**
 * Teste de Validação: Produto 251 - PAO DE LEITE
 * 
 * Objetivo: Validar que a nova fórmula de explosão proporcional
 * calcula corretamente a quantidade de MASSA BASE DOCE
 * 
 * Dados de Entrada:
 * - Produto: 251 - PAO DE LEITE
 * - Qtd Planejada: 1.650 kg
 * - Peso Unitário: 0.55000 kg
 * - Ficha Técnica: MASSA BASE DOCE = 0.55000 kg
 * 
 * Resultado Esperado:
 * - Qtd Calculada de MASSA BASE DOCE: 1.650 kg
 */

describe('Produto 251 - PAO DE LEITE - Cálculo de Explosão Proporcional', () => {
  
  // Dados do produto 251
  const qtdPlanejada = 1.650; // kg
  const pesoUnitario = 0.55000; // kg
  
  // Ficha técnica do produto 251
  const fichaTecnica = [
    {
      componenteId: 1,
      nomeComponente: '01 – MASSA BASE DOCE',
      tipoComponente: 'massa_base' as const,
      quantidadeBase: 0.55000, // kg
      unidade: 'kg' as const,
      nivel: 1,
      paiId: undefined,
    },
  ];

  it('Passo 1: processarDivisora deve retornar massaTotal = 1.650 kg', () => {
    const resultado = processarDivisora(qtdPlanejada, pesoUnitario);
    
    console.log('=== PASSO 1: processarDivisora ===');
    console.log('Entrada:', { qtdPlanejada, pesoUnitario });
    console.log('Resultado:', resultado);
    
    // Validações
    expect(resultado.quantidadeUnidades).toBe(3); // 1.650 / 0.55000 = 3
    expect(resultado.blocosInteiros).toBe(0); // 3 / 30 = 0 blocos
    expect(resultado.unidadesRestantes).toBe(3); // 3 % 30 = 3
    expect(resultado.pesoPedaco).toBe(1.650); // 3 × 0.55000 = 1.650
    expect(resultado.massaTotal).toBe(1.650); // (0 × pesoBloco) + 1.650 = 1.650
  });

  it('Passo 2: explodirInsumos deve retornar quantidadeCalculada = 1.650 kg para MASSA BASE DOCE', () => {
    // Primeiro executa processarDivisora para obter massaTotal
    const divisora = processarDivisora(qtdPlanejada, pesoUnitario);
    const massaParaExplosao = divisora.massaTotal;
    
    // Depois executa explodirInsumos com a massaTotal
    const insumos = explodirInsumos(massaParaExplosao, fichaTecnica);
    
    console.log('\n=== PASSO 2: explodirInsumos ===');
    console.log('Entrada:', { massaParaExplosao, fichaTecnica });
    console.log('Resultado:', insumos);
    
    // Validações
    expect(insumos).toHaveLength(1);
    expect(insumos[0].nomeComponente).toBe('01 – MASSA BASE DOCE');
    expect(insumos[0].tipoComponente).toBe('massa_base');
    expect(insumos[0].unidade).toBe('kg');
    
    // VALIDAÇÃO CRÍTICA: quantidadeCalculada deve ser 1.650 kg
    expect(insumos[0].quantidadeCalculada).toBe(1.650);
    
    // quantidadeArredondada também deve ser 1.650 kg (já que é múltiplo de 0.002)
    expect(insumos[0].quantidadeArredondada).toBe(1.650);
  });

  it('Fluxo Completo: processarDivisora + explodirInsumos deve resultar em 1.650 kg', () => {
    // Passo 1: processarDivisora
    const divisora = processarDivisora(qtdPlanejada, pesoUnitario);
    
    // Passo 2: explodirInsumos
    const insumos = explodirInsumos(divisora.massaTotal, fichaTecnica);
    
    console.log('\n=== FLUXO COMPLETO ===');
    console.log('Qtd Planejada:', qtdPlanejada, 'kg');
    console.log('Massa Total (Passo 1):', divisora.massaTotal, 'kg');
    console.log('Qtd Calculada (Passo 2):', insumos[0].quantidadeCalculada, 'kg');
    
    // Validação final
    expect(divisora.massaTotal).toBe(1.650);
    expect(insumos[0].quantidadeCalculada).toBe(1.650);
    
    // Mensagem de sucesso
    console.log('\n✅ TESTE PASSOU: Produto 251 agora calcula corretamente 1.650 kg');
  });

  it('Validação da Fórmula: (qtdPlanejada / rendimentoFicha) × quantidadeBase', () => {
    const divisora = processarDivisora(qtdPlanejada, pesoUnitario);
    const massaParaExplosao = divisora.massaTotal; // 1.650 kg
    
    // Cálculo manual da fórmula
    const rendimentoFicha = 0.55000; // soma dos componentes
    const fatorExplosao = massaParaExplosao / rendimentoFicha; // 1.650 / 0.55000 = 3.0
    const quantidadeEsperada = fatorExplosao * 0.55000; // 3.0 × 0.55000 = 1.650
    
    // Executa a função
    const insumos = explodirInsumos(massaParaExplosao, fichaTecnica);
    
    console.log('\n=== VALIDAÇÃO DA FÓRMULA ===');
    console.log('Rendimento Ficha:', rendimentoFicha);
    console.log('Fator Explosão:', fatorExplosao);
    console.log('Quantidade Esperada:', quantidadeEsperada);
    console.log('Quantidade Calculada:', insumos[0].quantidadeCalculada);
    
    // Validação
    expect(insumos[0].quantidadeCalculada).toBe(quantidadeEsperada);
    expect(insumos[0].quantidadeCalculada).toBe(1.650);
  });
});
