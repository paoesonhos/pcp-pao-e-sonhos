/**
 * PCP Utils - Funções de cálculo para o módulo de Processamento
 * Sistema PCP Pão e Sonhos
 */

/**
 * Regra de Ouro da Pesagem:
 * Arredonda para baixo em múltiplos de 0,005 kg
 * Ex: 1.247 → 1.245, 1.243 → 1.240, 1.248 → 1.245
 */
export function arredondarPesagem(valor: number): number {
  // Multiplica por 200 (1/0.005), trunca, divide por 200
  return Math.floor(valor * 200) / 200;
}

/**
 * Arredonda unidades sempre para baixo (sem decimais)
 */
export function arredondarUnidades(valor: number): number {
  return Math.floor(valor);
}

/**
 * Calcula quantidade de blocos inteiros (30 unidades cada)
 */
export function calcularBlocos(quantidadeUnidades: number): number {
  return Math.floor(quantidadeUnidades / 30);
}

/**
 * Calcula unidades restantes que não completam um bloco
 */
export function calcularUnidadesRestantes(quantidadeUnidades: number): number {
  return quantidadeUnidades % 30;
}

/**
 * Calcula peso do pedaço de ajuste
 * Pedaço = Unidades Restantes × Peso Unitário
 */
export function calcularPesoPedaco(unidadesRestantes: number, pesoUnitario: number): number {
  return arredondarPesagem(unidadesRestantes * pesoUnitario);
}

/**
 * Converte quantidade em kg para unidades
 */
export function kgParaUnidades(quantidadeKg: number, pesoUnitario: number): number {
  if (pesoUnitario <= 0) return 0;
  return arredondarUnidades(quantidadeKg / pesoUnitario);
}

/**
 * Interface para item do mapa de produção
 */
export interface ItemMapaProducao {
  codigoProduto: string;
  nomeProduto: string;
  unidade: 'kg' | 'un';
  qtdPlanejada: number;
  pesoUnitario?: number;
}

/**
 * Interface para item da ficha técnica
 */
export interface ItemFichaTecnica {
  componenteId: number;
  nomeComponente: string;
  tipoComponente: 'ingrediente' | 'massa_base' | 'sub_bloco';
  quantidadeBase: number; // proporção em relação ao produto
  unidade: 'kg' | 'un';
  nivel: number;
  paiId?: number;
  isFermento?: boolean;
}

/**
 * Interface para resultado da explosão de insumos
 */
export interface InsumoExplodido {
  componenteId: number;
  nomeComponente: string;
  tipoComponente: 'ingrediente' | 'massa_base' | 'sub_bloco';
  quantidadeCalculada: number;
  quantidadeArredondada: number;
  unidade: 'kg' | 'un';
  nivel: number;
  paiId?: number;
  editavel: boolean; // true apenas para Fermento
}

/**
 * Explode insumos de um produto baseado na ficha técnica
 * Aplica a Regra de Ouro de arredondamento
 */
export function explodirInsumos(
  qtdPlanejada: number,
  fichaTecnica: ItemFichaTecnica[],
  nomeFermento: string = 'FERMENTO'
): InsumoExplodido[] {
  return fichaTecnica.map(item => {
    // Calcula quantidade: Qtd_Planejada × Proporção
    const quantidadeCalculada = qtdPlanejada * item.quantidadeBase;
    
    // Aplica arredondamento conforme unidade
    let quantidadeArredondada: number;
    if (item.unidade === 'kg') {
      quantidadeArredondada = arredondarPesagem(quantidadeCalculada);
    } else {
      quantidadeArredondada = arredondarUnidades(quantidadeCalculada);
    }
    
    // Verifica se é fermento (editável)
    const isFermento = item.nomeComponente.toUpperCase().includes(nomeFermento);
    
    return {
      componenteId: item.componenteId,
      nomeComponente: item.nomeComponente,
      tipoComponente: item.tipoComponente,
      quantidadeCalculada,
      quantidadeArredondada,
      unidade: item.unidade,
      nivel: item.nivel,
      paiId: item.paiId,
      editavel: isFermento,
    };
  });
}

/**
 * Interface para resultado do processamento da divisora
 */
export interface ResultadoDivisora {
  quantidadeUnidades: number;
  blocosInteiros: number;
  pesoBloco: number;
  unidadesRestantes: number;
  pesoPedaco: number;
  massaTotal: number; // Blocos + Pedaço
}

/**
 * Processa a divisora para produtos em kg
 * Decompõe a demanda em blocos de 30 unidades + pedaço de ajuste
 */
export function processarDivisora(
  qtdPlanejadaKg: number,
  pesoUnitario: number,
  unidadesPorBloco: number = 30
): ResultadoDivisora {
  // Converte kg para unidades
  const quantidadeUnidades = kgParaUnidades(qtdPlanejadaKg, pesoUnitario);
  
  // Calcula blocos inteiros
  const blocosInteiros = Math.floor(quantidadeUnidades / unidadesPorBloco);
  
  // Peso de cada bloco
  const pesoBloco = arredondarPesagem(unidadesPorBloco * pesoUnitario);
  
  // Unidades restantes (pedaço)
  const unidadesRestantes = quantidadeUnidades % unidadesPorBloco;
  
  // Peso do pedaço
  const pesoPedaco = calcularPesoPedaco(unidadesRestantes, pesoUnitario);
  
  // Massa total
  const massaTotal = arredondarPesagem((blocosInteiros * pesoBloco) + pesoPedaco);
  
  return {
    quantidadeUnidades,
    blocosInteiros,
    pesoBloco,
    unidadesRestantes,
    pesoPedaco,
    massaTotal,
  };
}

/**
 * Interface para item processado completo
 */
export interface ItemProcessado {
  codigoProduto: string;
  nomeProduto: string;
  unidade: 'kg' | 'un';
  qtdPlanejada: number;
  divisora?: ResultadoDivisora;
  insumos: InsumoExplodido[];
}

/**
 * Processa um item completo do mapa de produção
 */
export function processarItemProducao(
  item: ItemMapaProducao,
  fichaTecnica: ItemFichaTecnica[]
): ItemProcessado {
  const resultado: ItemProcessado = {
    codigoProduto: item.codigoProduto,
    nomeProduto: item.nomeProduto,
    unidade: item.unidade,
    qtdPlanejada: item.qtdPlanejada,
    insumos: [],
  };
  
  // Se produto é em kg e tem peso unitário, processa divisora
  if (item.unidade === 'kg' && item.pesoUnitario && item.pesoUnitario > 0) {
    resultado.divisora = processarDivisora(item.qtdPlanejada, item.pesoUnitario);
    
    // Explode insumos usando a massa total (blocos + pedaço)
    resultado.insumos = explodirInsumos(resultado.divisora.massaTotal, fichaTecnica);
  } else if (item.unidade === 'un') {
    // Produto em unidades - arredonda para baixo
    const qtdArredondada = arredondarUnidades(item.qtdPlanejada);
    resultado.qtdPlanejada = qtdArredondada;
    
    // Explode insumos diretamente
    resultado.insumos = explodirInsumos(qtdArredondada, fichaTecnica);
  } else {
    // Produto em kg sem divisora - explode diretamente
    resultado.insumos = explodirInsumos(item.qtdPlanejada, fichaTecnica);
  }
  
  return resultado;
}

/**
 * Interface para ficha técnica com dados completos para explosão recursiva
 */
export interface FichaTecnicaCompleta {
  componenteId: number;
  nomeComponente: string;
  tipoComponente: 'ingrediente' | 'massa_base' | 'sub_bloco';
  quantidadeBase: number;
  unidade: 'kg' | 'un';
  nivel: number;
  paiId?: number;
  // Ficha técnica do componente (se for massa_base/produto)
  fichaTecnicaComponente?: FichaTecnicaCompleta[];
}

/**
 * Interface para insumo consolidado (após explosão recursiva)
 */
export interface InsumoConsolidado {
  componenteId: number;
  nomeComponente: string;
  quantidadeTotal: number;
  quantidadeArredondada: number;
  unidade: 'kg' | 'un';
  editavel: boolean;
  origens: string[]; // Lista de produtos de onde veio o insumo
}

/**
 * Explode insumos recursivamente, mergulhando nas camadas de massa base
 * Até encontrar os insumos brutos
 */
export function explodirInsumosRecursivo(
  qtdPlanejada: number,
  fichaTecnica: FichaTecnicaCompleta[],
  origem: string = '',
  nomeFermento: string = 'FERMENTO'
): Map<number, InsumoConsolidado> {
  const insumosMap = new Map<number, InsumoConsolidado>();
  
  for (const item of fichaTecnica) {
    // Calcula quantidade: Qtd_Planejada × Proporção
    const quantidadeCalculada = qtdPlanejada * item.quantidadeBase;
    
    if (item.tipoComponente === 'ingrediente') {
      // É um insumo bruto - adiciona ao mapa
      const existing = insumosMap.get(item.componenteId);
      const origemAtual = origem || 'Direto';
      
      if (existing) {
        // Consolida: soma as quantidades
        existing.quantidadeTotal += quantidadeCalculada;
        if (!existing.origens.includes(origemAtual)) {
          existing.origens.push(origemAtual);
        }
      } else {
        // Novo insumo
        const isFermento = item.nomeComponente.toUpperCase().includes(nomeFermento);
        insumosMap.set(item.componenteId, {
          componenteId: item.componenteId,
          nomeComponente: item.nomeComponente,
          quantidadeTotal: quantidadeCalculada,
          quantidadeArredondada: 0, // Será calculado depois
          unidade: item.unidade,
          editavel: isFermento,
          origens: [origemAtual],
        });
      }
    } else if (item.tipoComponente === 'massa_base' && item.fichaTecnicaComponente) {
      // É uma massa base - mergulha recursivamente
      const subInsumos = explodirInsumosRecursivo(
        quantidadeCalculada,
        item.fichaTecnicaComponente,
        item.nomeComponente,
        nomeFermento
      );
      
      // Consolida os sub-insumos no mapa principal
      for (const [id, subInsumo] of Array.from(subInsumos.entries())) {
        const existing = insumosMap.get(id);
        if (existing) {
          existing.quantidadeTotal += subInsumo.quantidadeTotal;
          for (const o of subInsumo.origens) {
            if (!existing.origens.includes(o)) {
              existing.origens.push(o);
            }
          }
        } else {
          insumosMap.set(id, { ...subInsumo });
        }
      }
    }
  }
  
  return insumosMap;
}

/**
 * Aplica arredondamento final aos insumos consolidados
 * Regra: arredondamento 0,005 kg apenas no total final
 */
export function aplicarArredondamentoFinal(
  insumosMap: Map<number, InsumoConsolidado>
): InsumoConsolidado[] {
  const resultado: InsumoConsolidado[] = [];
  
  for (const insumo of Array.from(insumosMap.values())) {
    // Aplica arredondamento conforme unidade
    if (insumo.unidade === 'kg') {
      insumo.quantidadeArredondada = arredondarPesagem(insumo.quantidadeTotal);
    } else {
      insumo.quantidadeArredondada = arredondarUnidades(insumo.quantidadeTotal);
    }
    resultado.push(insumo);
  }
  
  // Ordena por nome
  return resultado.sort((a, b) => a.nomeComponente.localeCompare(b.nomeComponente));
}

/**
 * Função principal: Explode e consolida insumos de um produto
 * Faz explosão recursiva e aplica arredondamento apenas no total final
 */
export function processarExplosaoConsolidada(
  qtdPlanejada: number,
  fichaTecnica: FichaTecnicaCompleta[],
  nomeFermento: string = 'FERMENTO'
): InsumoConsolidado[] {
  // Passo 1: Explosão recursiva (sem arredondamento)
  const insumosMap = explodirInsumosRecursivo(qtdPlanejada, fichaTecnica, '', nomeFermento);
  
  // Passo 2: Aplica arredondamento no total final consolidado
  return aplicarArredondamentoFinal(insumosMap);
}

/**
 * Formata número para exibição com precisão de pesagem
 */
export function formatarPesagem(valor: number): string {
  return valor.toFixed(3);
}

/**
 * Formata número para exibição de unidades (sem decimais)
 */
export function formatarUnidades(valor: number): string {
  return Math.floor(valor).toString();
}
