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

// ============================================
// EXPLOSÃO RECURSIVA E CONSOLIDAÇÃO DE INSUMOS
// ============================================

/**
 * Interface para componente da ficha técnica (simplificada para cascata)
 */
export interface ComponenteFichaTecnica {
  componenteId: number;
  nomeComponente: string;
  tipoComponente: 'ingrediente' | 'massa_base';
  quantidadeBase: number; // proporção em relação ao produto
  unidade: 'kg' | 'un';
}

/**
 * Interface para insumo consolidado (resultado final da explosão)
 */
export interface InsumoConsolidado {
  componenteId: number;
  nomeComponente: string;
  quantidadeTotal: number; // soma de todas as origens
  quantidadeArredondada: number; // após regra de 0,005 kg
  unidade: 'kg' | 'un';
  editavel: boolean; // true apenas para Fermento
  origens: string[]; // lista de produtos de onde veio o insumo
}

/**
 * Função para buscar ficha técnica de um produto
 * Deve ser fornecida pelo chamador (backend)
 */
export type BuscaFichaTecnicaFn = (produtoId: number) => ComponenteFichaTecnica[] | null;

/**
 * Explode recursivamente um produto até encontrar insumos brutos
 * Retorna mapa de componenteId -> { quantidade, origens }
 */
export function explodirRecursivo(
  produtoId: number,
  nomeProduto: string,
  quantidade: number,
  buscaFichaTecnica: BuscaFichaTecnicaFn,
  visitados: Set<number> = new Set(),
  profundidade: number = 0
): Map<number, { quantidade: number; nome: string; unidade: 'kg' | 'un'; origens: string[] }> {
  const resultado = new Map<number, { quantidade: number; nome: string; unidade: 'kg' | 'un'; origens: string[] }>();
  
  // Proteção contra referência circular
  if (visitados.has(produtoId) || profundidade > 10) {
    return resultado;
  }
  visitados.add(produtoId);
  
  // Busca ficha técnica do produto
  const fichaTecnica = buscaFichaTecnica(produtoId);
  
  if (!fichaTecnica || fichaTecnica.length === 0) {
    return resultado;
  }
  
  for (const componente of fichaTecnica) {
    // Calcula quantidade proporcional
    const qtdComponente = quantidade * componente.quantidadeBase;
    
    if (componente.tipoComponente === 'ingrediente') {
      // É insumo bruto - adiciona ao resultado
      const existente = resultado.get(componente.componenteId);
      if (existente) {
        existente.quantidade += qtdComponente;
        if (!existente.origens.includes(nomeProduto)) {
          existente.origens.push(nomeProduto);
        }
      } else {
        resultado.set(componente.componenteId, {
          quantidade: qtdComponente,
          nome: componente.nomeComponente,
          unidade: componente.unidade,
          origens: [nomeProduto],
        });
      }
    } else {
      // É produto (massa_base) - explode recursivamente
      const subResultado = explodirRecursivo(
        componente.componenteId,
        componente.nomeComponente,
        qtdComponente,
        buscaFichaTecnica,
        new Set(visitados),
        profundidade + 1
      );
      
      // Merge dos resultados
      for (const [id, dados] of Array.from(subResultado.entries())) {
        const existente = resultado.get(id);
        if (existente) {
          existente.quantidade += dados.quantidade;
          for (const origem of dados.origens) {
            if (!existente.origens.includes(origem)) {
              existente.origens.push(origem);
            }
          }
        } else {
          resultado.set(id, { ...dados });
        }
      }
    }
  }
  
  return resultado;
}

/**
 * Consolida insumos e aplica arredondamento final
 * Regra: arredondamento 0,005 kg apenas no total final consolidado
 */
export function consolidarInsumos(
  mapaInsumos: Map<number, { quantidade: number; nome: string; unidade: 'kg' | 'un'; origens: string[] }>,
  nomeFermento: string = 'FERMENTO'
): InsumoConsolidado[] {
  const resultado: InsumoConsolidado[] = [];
  
  for (const [componenteId, dados] of Array.from(mapaInsumos.entries())) {
    // Aplica arredondamento no total final
    let quantidadeArredondada: number;
    if (dados.unidade === 'kg') {
      quantidadeArredondada = arredondarPesagem(dados.quantidade);
    } else {
      quantidadeArredondada = arredondarUnidades(dados.quantidade);
    }
    
    // Verifica se é fermento (editável)
    const isFermento = dados.nome.toUpperCase().includes(nomeFermento);
    
    resultado.push({
      componenteId,
      nomeComponente: dados.nome,
      quantidadeTotal: dados.quantidade,
      quantidadeArredondada,
      unidade: dados.unidade,
      editavel: isFermento,
      origens: dados.origens,
    });
  }
  
  // Ordena por nome
  resultado.sort((a, b) => a.nomeComponente.localeCompare(b.nomeComponente));
  
  return resultado;
}

/**
 * Função principal: explode e consolida insumos de um produto
 */
export function processarExplosaoCompleta(
  produtoId: number,
  nomeProduto: string,
  quantidade: number,
  buscaFichaTecnica: BuscaFichaTecnicaFn
): InsumoConsolidado[] {
  const mapaInsumos = explodirRecursivo(
    produtoId,
    nomeProduto,
    quantidade,
    buscaFichaTecnica
  );
  
  return consolidarInsumos(mapaInsumos);
}
