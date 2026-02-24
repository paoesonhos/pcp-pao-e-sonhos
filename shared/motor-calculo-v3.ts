/**
 * Motor de Cálculo PCP v3.0
 * Sistema PCP Pão e Sonhos
 * 
 * Objetivo: Garantir precisão entre o planejado no mapa e o executado na balança,
 * eliminando sobras de massa e erros de arredondamento físico.
 */

// ============================================
// INTERFACES
// ============================================

/**
 * Dados do produto vindos do cadastro
 */
export interface DadosProduto {
  produtoId: number;
  nomeProduto: string;
  pesoUnitarioCru: number; // kg - peso de cada unidade crua
  percentualPerdaLiquida: number; // ex: 0.10 para 10%
}

/**
 * Dados de blocos/divisora vindos do cadastro
 */
export interface DadosBlocos {
  divisora: number; // unidades por bloco (ex: 30, 36)
  pesoBloco: number; // kg - peso total do bloco
}

/**
 * Componente da ficha técnica
 */
export interface ComponenteFicha {
  componenteId: number;
  nomeComponente: string;
  tipoComponente: 'ingrediente' | 'massa_base';
  quantidadeBase: number; // kg na receita
  unidade: 'kg' | 'un';
}

/**
 * Resultado do Passo 1: Conversão Assado → Cru
 */
export interface ResultadoPasso1 {
  valorMapa: number; // kg - valor original do mapa
  massaCruaTeorica: number; // kg - após aplicar %perda
  qtdInteira: number; // unidades inteiras (FLOOR)
  massaTotalFinal: number; // kg - massa real a processar
}

/**
 * Ingrediente explodido com paridade aplicada
 */
export interface IngredienteExplodido {
  componenteId: number;
  nomeComponente: string;
  tipoComponente: 'ingrediente' | 'massa_base';
  quantidadeCalculada: number; // kg - antes da paridade
  quantidadeAjustada: number; // kg - após paridade (múltiplo de 0.002)
  unidade: 'kg' | 'un';
  editavel: boolean;
}

/**
 * Resultado do Passo 2: Explosão com Paridade
 */
export interface ResultadoPasso2 {
  rendimentoFicha: number; // kg - soma dos componentes
  ingredientes: IngredienteExplodido[];
}

/**
 * Resultado do Passo 3: Blocos e Pedaços
 */
export interface ResultadoPasso3 {
  qtdInteira: number; // unidades totais
  divisora: number; // unidades por bloco
  blocos: number; // quantidade de blocos inteiros
  pedacos: number; // unidades restantes (MOD)
  pesoBloco: number; // kg - peso de cada bloco
  pesoUnitarioReal: number; // kg - peso de cada unidade
  pesoPedaco: number; // kg - peso do pedaço
  instrucaoBlocos: string; // "Pesar X blocos de Y kg"
  instrucaoPedaco: string; // "Pesar 1 pedaço de Z kg"
}

/**
 * Resultado completo do processamento de um produto
 */
export interface ResultadoProcessamento {
  produtoId: number;
  nomeProduto: string;
  passo1: ResultadoPasso1;
  passo2: ResultadoPasso2;
  passo3: ResultadoPasso3 | null; // null se não tiver blocos cadastrados
}

/**
 * Função para buscar ficha técnica de um produto
 */
export type BuscaFichaTecnicaFn = (produtoId: number) => ComponenteFicha[] | null;

/**
 * Função para buscar dados de blocos de um produto
 */
export type BuscaBlocosFn = (produtoId: number) => DadosBlocos | null;

// ============================================
// PASSO 1: CONVERSÃO ASSADO → CRU
// ============================================

/**
 * Passo 1: Converte demanda de produtos prontos (assados) em massa bruta (crua)
 * 
 * Fórmulas:
 * - Massa_Crua_Teorica = Valor_Mapa × (1 + %Perda_Cadastro)
 * - Qtd_Inteira = FLOOR(Massa_Crua_Teorica / Peso_Unitario_Cru_Cadastro)
 * - Massa_Total_Final = Qtd_Inteira × Peso_Unitario_Cru_Cadastro
 */
export function passo1ConversaoAssadoCru(
  valorMapa: number, // kg - valor do mapa de produção
  pesoUnitarioCru: number, // kg - peso unitário cru do cadastro
  percentualPerdaLiquida: number = 0 // ex: 0.10 para 10%
): ResultadoPasso1 {
  // 1.1 Massa Crua Teórica (aplica perda de cocção)
  const massaCruaTeorica = valorMapa * (1 + percentualPerdaLiquida);
  
  // 1.2 Ajuste para Unidades Inteiras (Regra Anti-Sobra)
  // Aplica epsilon para corrigir erros de ponto flutuante
  const epsilon = 1e-9;
  const qtdInteira = Math.floor((massaCruaTeorica / pesoUnitarioCru) + epsilon);
  
  // 1.3 Massa Total Final (a ser processada)
  const massaTotalFinal = qtdInteira * pesoUnitarioCru;
  
  return {
    valorMapa,
    massaCruaTeorica,
    qtdInteira,
    massaTotalFinal,
  };
}

// ============================================
// PASSO 2: EXPLOSÃO E REGRA DE PARIDADE
// ============================================

/**
 * Calcula o Rendimento da Ficha Técnica
 * Rendimento = Soma do peso de todos os componentes
 */
export function calcularRendimentoFicha(fichaTecnica: ComponenteFicha[]): number {
  return fichaTecnica.reduce((soma, comp) => soma + comp.quantidadeBase, 0);
}

/**
 * Regra de Paridade: Arredonda para múltiplos de 0.002 kg (2 gramas)
 * Facilita a divisão manual na mesa
 */
export function aplicarParidade(valor: number): number {
  return Math.floor(valor / 0.002) * 0.002;
}

/**
 * Passo 2: Explosão proporcional com regra de paridade
 * 
 * Fórmulas:
 * - Qtd_Ingrediente = (Massa_Total_Final / Rendimento_Ficha) × Qtd_Ingrediente_na_Ficha
 * - Qtd_Ajustada = FLOOR(Qtd_Ingrediente / 0.002) × 0.002
 */
export function passo2ExplosaoParidade(
  massaTotalFinal: number, // kg - resultado do Passo 1
  fichaTecnica: ComponenteFicha[],
  nomeFermento: string = 'FERMENTO'
): ResultadoPasso2 {
  // Calcula rendimento da ficha (soma dos componentes)
  const rendimentoFicha = calcularRendimentoFicha(fichaTecnica);
  
  if (rendimentoFicha === 0) {
    return { rendimentoFicha: 0, ingredientes: [] };
  }
  
  // Fator de proporcionalidade
  const fator = massaTotalFinal / rendimentoFicha;
  
  const ingredientes: IngredienteExplodido[] = fichaTecnica.map(comp => {
    // Explosão proporcional
    const quantidadeCalculada = fator * comp.quantidadeBase;
    
    // Aplica regra de paridade (múltiplos de 0.002 kg)
    let quantidadeAjustada: number;
    if (comp.unidade === 'kg') {
      quantidadeAjustada = aplicarParidade(quantidadeCalculada);
    } else {
      // Para unidades, arredonda para baixo (inteiro)
      quantidadeAjustada = Math.floor(quantidadeCalculada);
    }
    
    // Verifica se é fermento (editável)
    const isFermento = comp.nomeComponente.toUpperCase().includes(nomeFermento);
    
    return {
      componenteId: comp.componenteId,
      nomeComponente: comp.nomeComponente,
      tipoComponente: comp.tipoComponente,
      quantidadeCalculada,
      quantidadeAjustada,
      unidade: comp.unidade,
      editavel: isFermento,
    };
  });
  
  return { rendimentoFicha, ingredientes };
}

// ============================================
// PASSO 3: REGRA DA DIVISORA (BLOCOS E PEDAÇOS)
// ============================================

/**
 * Passo 3: Organização da pesagem baseada no padrão técnico do cadastro
 * 
 * Fórmulas:
 * - Blocos = FLOOR(Qtd_Inteira / Divisora)
 * - Pedaços = Qtd_Inteira MOD Divisora
 * - Peso_Unitario_Real = Peso_Bloco / Divisora
 * - Peso_Pedaco = Peso_Unitario_Real × Pedaços
 */
export function passo3BlocosPedacos(
  qtdInteira: number, // unidades - resultado do Passo 1
  dadosBlocos: DadosBlocos
): ResultadoPasso3 {
  const { divisora, pesoBloco } = dadosBlocos;
  
  // Quantidade de blocos inteiros
  // Aplica epsilon para corrigir erros de ponto flutuante
  const epsilon = 1e-9;
  const blocos = Math.floor((qtdInteira / divisora) + epsilon);
  
  // Quantidade de pedaços (resto)
  const pedacos = qtdInteira % divisora;
  
  // Peso unitário real (calculado a partir do bloco)
  const pesoUnitarioReal = pesoBloco / divisora;
  
  // Peso do pedaço
  const pesoPedaco = pesoUnitarioReal * pedacos;
  
  // Instruções para exibição
  const instrucaoBlocos = blocos > 0 
    ? `Pesar ${blocos} bloco${blocos > 1 ? 's' : ''} de ${pesoBloco.toFixed(3)} kg`
    : '';
  
  const instrucaoPedaco = pedacos > 0
    ? `Pesar 1 pedaço de ${pesoPedaco.toFixed(3)} kg (${pedacos} un)`
    : '';
  
  return {
    qtdInteira,
    divisora,
    blocos,
    pedacos,
    pesoBloco,
    pesoUnitarioReal,
    pesoPedaco,
    instrucaoBlocos,
    instrucaoPedaco,
  };
}

// ============================================
// FUNÇÃO PRINCIPAL: PROCESSAMENTO COMPLETO
// ============================================

/**
 * Processa um produto completo: Passo 1 + Passo 2 + Passo 3
 */
export function processarProdutoV3(
  valorMapa: number, // kg - valor do mapa de produção
  dadosProduto: DadosProduto,
  fichaTecnica: ComponenteFicha[],
  dadosBlocos: DadosBlocos | null
): ResultadoProcessamento {
  // Passo 1: Conversão Assado → Cru
  const passo1 = passo1ConversaoAssadoCru(
    valorMapa,
    dadosProduto.pesoUnitarioCru,
    dadosProduto.percentualPerdaLiquida
  );
  
  // Passo 2: Explosão com Paridade
  const passo2 = passo2ExplosaoParidade(
    passo1.massaTotalFinal,
    fichaTecnica
  );
  
  // Passo 3: Blocos e Pedaços (se tiver dados de blocos)
  let passo3: ResultadoPasso3 | null = null;
  if (dadosBlocos) {
    passo3 = passo3BlocosPedacos(passo1.qtdInteira, dadosBlocos);
  }
  
  return {
    produtoId: dadosProduto.produtoId,
    nomeProduto: dadosProduto.nomeProduto,
    passo1,
    passo2,
    passo3,
  };
}

// ============================================
// EXPLOSÃO RECURSIVA (PARA MASSAS BASE)
// ============================================

/**
 * Interface para acumular necessidades de massas base
 */
export interface NecessidadeMassaBase {
  produtoId: number;
  nomeProduto: string;
  quantidadeTotal: number; // kg - soma de todas as necessidades
  produtosFilhos: string[]; // produtos que usam esta massa base
}

/**
 * Explode recursivamente, acumulando necessidades de massas base
 * e retornando insumos brutos consolidados
 */
export function explodirRecursivoV3(
  produtoId: number,
  nomeProduto: string,
  massaTotalFinal: number, // kg - massa a processar
  buscaFichaTecnica: BuscaFichaTecnicaFn,
  massasBaseMap: Map<number, NecessidadeMassaBase> = new Map(),
  insumosMap: Map<number, { quantidade: number; nome: string; unidade: 'kg' | 'un'; origens: string[] }> = new Map(),
  visitados: Set<number> = new Set(),
  profundidade: number = 0
): void {
  // Proteção contra referência circular
  if (visitados.has(produtoId) || profundidade > 10) {
    return;
  }
  visitados.add(produtoId);
  
  // Busca ficha técnica
  const fichaTecnica = buscaFichaTecnica(produtoId);
  if (!fichaTecnica || fichaTecnica.length === 0) {
    return;
  }
  
  // Calcula rendimento da ficha
  const rendimentoFicha = calcularRendimentoFicha(fichaTecnica);
  if (rendimentoFicha === 0) {
    return;
  }
  
  // Fator de proporcionalidade
  const fator = massaTotalFinal / rendimentoFicha;
  
  for (const comp of fichaTecnica) {
    // Explosão proporcional
    const qtdCalculada = fator * comp.quantidadeBase;
    
    // Aplica paridade
    const qtdAjustada = comp.unidade === 'kg' 
      ? aplicarParidade(qtdCalculada)
      : Math.floor(qtdCalculada);
    
    if (comp.tipoComponente === 'ingrediente') {
      // É insumo bruto - acumula
      const existente = insumosMap.get(comp.componenteId);
      if (existente) {
        existente.quantidade += qtdAjustada;
        if (!existente.origens.includes(nomeProduto)) {
          existente.origens.push(nomeProduto);
        }
      } else {
        insumosMap.set(comp.componenteId, {
          quantidade: qtdAjustada,
          nome: comp.nomeComponente,
          unidade: comp.unidade,
          origens: [nomeProduto],
        });
      }
    } else {
      // É massa base - acumula necessidade e explode recursivamente
      const existente = massasBaseMap.get(comp.componenteId);
      if (existente) {
        existente.quantidadeTotal += qtdAjustada;
        if (!existente.produtosFilhos.includes(nomeProduto)) {
          existente.produtosFilhos.push(nomeProduto);
        }
      } else {
        massasBaseMap.set(comp.componenteId, {
          produtoId: comp.componenteId,
          nomeProduto: comp.nomeComponente,
          quantidadeTotal: qtdAjustada,
          produtosFilhos: [nomeProduto],
        });
      }
      
      // Explode recursivamente a massa base
      explodirRecursivoV3(
        comp.componenteId,
        comp.nomeComponente,
        qtdAjustada,
        buscaFichaTecnica,
        massasBaseMap,
        insumosMap,
        new Set(visitados),
        profundidade + 1
      );
    }
  }
}

// ============================================
// CONSOLIDAÇÃO FINAL
// ============================================

/**
 * Insumo consolidado final
 */
export interface InsumoConsolidadoV3 {
  componenteId: number;
  nomeComponente: string;
  quantidadeTotal: number; // soma de todas as origens
  quantidadeArredondada: number; // após paridade
  unidade: 'kg' | 'un';
  editavel: boolean;
  origens: string[];
}

/**
 * Consolida insumos aplicando paridade final
 */
export function consolidarInsumosV3(
  insumosMap: Map<number, { quantidade: number; nome: string; unidade: 'kg' | 'un'; origens: string[] }>,
  nomeFermento: string = 'FERMENTO'
): InsumoConsolidadoV3[] {
  const resultado: InsumoConsolidadoV3[] = [];
  
  for (const [componenteId, dados] of Array.from(insumosMap.entries())) {
    // Aplica paridade no total final
    let quantidadeArredondada: number;
    if (dados.unidade === 'kg') {
      quantidadeArredondada = aplicarParidade(dados.quantidade);
    } else {
      quantidadeArredondada = Math.floor(dados.quantidade);
    }
    
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
 * Massa base consolidada com ingredientes
 */
export interface MassaBaseConsolidadaV3 {
  produtoId: number;
  nomeProduto: string;
  quantidadeTotal: number;
  quantidadeArredondada: number;
  produtosFilhos: string[];
  ingredientes: IngredienteExplodido[];
}

/**
 * Consolida massas base com seus ingredientes
 */
export function consolidarMassasBaseV3(
  massasBaseMap: Map<number, NecessidadeMassaBase>,
  buscaFichaTecnica: BuscaFichaTecnicaFn
): MassaBaseConsolidadaV3[] {
  const resultado: MassaBaseConsolidadaV3[] = [];
  
  for (const [produtoId, dados] of Array.from(massasBaseMap.entries())) {
    const quantidadeArredondada = aplicarParidade(dados.quantidadeTotal);
    
    // Busca ficha técnica da massa base para calcular ingredientes
    const fichaTecnica = buscaFichaTecnica(produtoId);
    let ingredientes: IngredienteExplodido[] = [];
    
    if (fichaTecnica && fichaTecnica.length > 0) {
      const passo2 = passo2ExplosaoParidade(quantidadeArredondada, fichaTecnica);
      ingredientes = passo2.ingredientes;
    }
    
    resultado.push({
      produtoId,
      nomeProduto: dados.nomeProduto,
      quantidadeTotal: dados.quantidadeTotal,
      quantidadeArredondada,
      produtosFilhos: dados.produtosFilhos,
      ingredientes,
    });
  }
  
  // Ordena por nome
  resultado.sort((a, b) => a.nomeProduto.localeCompare(b.nomeProduto));
  
  return resultado;
}

// ============================================
// PROCESSAMENTO DO MAPA COMPLETO
// ============================================

/**
 * Item do mapa de produção
 */
export interface ItemMapaV3 {
  produtoId: number;
  nomeProduto: string;
  valorMapa: number; // kg
  pesoUnitarioCru: number; // kg
  percentualPerdaLiquida: number;
}

/**
 * Resultado completo do processamento do mapa
 */
export interface ResultadoMapaV3 {
  produtos: ResultadoProcessamento[];
  massasBase: MassaBaseConsolidadaV3[];
  insumos: InsumoConsolidadoV3[];
}

/**
 * Processa o mapa de produção completo
 */
export function processarMapaV3(
  itens: ItemMapaV3[],
  buscaFichaTecnica: BuscaFichaTecnicaFn,
  buscaBlocos: BuscaBlocosFn
): ResultadoMapaV3 {
  const produtos: ResultadoProcessamento[] = [];
  const massasBaseMap = new Map<number, NecessidadeMassaBase>();
  const insumosMap = new Map<number, { quantidade: number; nome: string; unidade: 'kg' | 'un'; origens: string[] }>();
  
  for (const item of itens) {
    // Busca ficha técnica e blocos
    const fichaTecnica = buscaFichaTecnica(item.produtoId);
    const dadosBlocos = buscaBlocos(item.produtoId);
    
    if (!fichaTecnica || fichaTecnica.length === 0) {
      continue;
    }
    
    // Processa o produto (Passo 1, 2, 3)
    const dadosProduto: DadosProduto = {
      produtoId: item.produtoId,
      nomeProduto: item.nomeProduto,
      pesoUnitarioCru: item.pesoUnitarioCru,
      percentualPerdaLiquida: item.percentualPerdaLiquida,
    };
    
    const resultado = processarProdutoV3(
      item.valorMapa,
      dadosProduto,
      fichaTecnica,
      dadosBlocos
    );
    
    produtos.push(resultado);
    
    // Explode recursivamente para consolidar massas base e insumos
    explodirRecursivoV3(
      item.produtoId,
      item.nomeProduto,
      resultado.passo1.massaTotalFinal,
      buscaFichaTecnica,
      massasBaseMap,
      insumosMap
    );
  }
  
  return {
    produtos,
    massasBase: consolidarMassasBaseV3(massasBaseMap, buscaFichaTecnica),
    insumos: consolidarInsumosV3(insumosMap),
  };
}

// ============================================
// FUNÇÕES AUXILIARES DE FORMATAÇÃO
// ============================================

/**
 * Formata número para exibição com 3 casas decimais
 */
export function formatarKg(valor: number): string {
  return valor.toFixed(3);
}

/**
 * Formata número para exibição de unidades (sem decimais)
 */
export function formatarUnidades(valor: number): string {
  return Math.floor(valor).toString();
}
