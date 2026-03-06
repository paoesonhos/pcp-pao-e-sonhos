import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Dias da semana
const DIAS_SEMANA: Record<number, string> = {
  2: "Segunda-feira",
  3: "Terça-feira",
  4: "Quarta-feira",
  5: "Quinta-feira",
  6: "Sexta-feira",
  7: "Sábado",
};

// Logo em base64 será carregado dinamicamente
let logoBase64: string | null = null;

// Função para carregar o logo
async function carregarLogo(): Promise<string | null> {
  if (logoBase64) return logoBase64;
  
  try {
    const response = await fetch('/logo.png');
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        logoBase64 = reader.result as string;
        resolve(logoBase64);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// Função para adicionar cabeçalho com logo
async function adicionarCabecalho(doc: jsPDF, titulo: string, diaSelecionado: number): Promise<number> {
  const dataAtual = new Date().toLocaleDateString('pt-BR');
  const logo = await carregarLogo();
  
  let yPosition = 15;
  
  // Adicionar logo se disponível
  if (logo) {
    try {
      doc.addImage(logo, 'PNG', 14, 10, 25, 25);
      yPosition = 18;
      
      // Título ao lado do logo
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(titulo, 45, yPosition);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Pão & Sonhos - Produto Artesanal Feito com Carinho', 45, yPosition + 6);
      
      doc.setFontSize(11);
      doc.text(`${DIAS_SEMANA[diaSelecionado]} - Gerado em: ${dataAtual}`, 45, yPosition + 14);
      
      return 42; // Posição Y após o cabeçalho com logo
    } catch {
      // Se falhar ao adicionar imagem, usar cabeçalho sem logo
    }
  }
  
  // Cabeçalho sem logo (fallback)
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(titulo, 14, 20);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${DIAS_SEMANA[diaSelecionado]} - Gerado em: ${dataAtual}`, 14, 28);
  
  return 38;
}

// Função para adicionar rodapé com logo
function adicionarRodape(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Pão & Sonhos - Sistema PCP | Página ${i} de ${pageCount}`, 14, 290);
    doc.setTextColor(0);
  }
}

interface InsumoItem {
  nomeComponente: string;
  quantidadeArredondada: number;
  unidade: string;
}

interface ProdutoPrePesagem {
  codigoProduto: string;
  nomeProduto: string;
  qtdPlanejada: number;
  unidade: string;
  insumos: InsumoItem[];
}

interface IntermediarioItem {
  nomeProduto: string;
  quantidadeArredondada: number;
  unidade: string;
  produtosFilhos: string[];
  ingredientes: {
    nomeComponente: string;
    quantidadeArredondada: number;
    unidade: string;
  }[];
  modoPreparo?: Array<{
    ordem: number;
    descricao: string;
    tempoMinutos: number;
  }>;
}

interface ProdutoExpedicao {
  codigoProduto: string;
  nome: string;
  saldoEstoque: string;
  unidade: string;
}

// Motor v3.0 - Passo 3: Blocos e Pedaços
interface Passo3 {
  qtdInteira: number;
  divisora: number;
  blocos: number;
  pedacos: number;
  pesoBloco: number;
  pesoUnitarioReal: number;
  pesoPedaco: number;
  instrucaoBlocos: string;
  instrucaoPedaco: string;
}

interface ProdutoProducao {
  codigoProduto: string;
  nomeProduto: string;
  qtdPlanejada: number;
  unidade: string;
  pesoUnitario: number;
  passo3: Passo3 | null;
  modoPreparo?: Array<{
    ordem: number;
    descricao: string;
    tempoMinutos: number;
  }>;
  insumos?: Array<{
    componenteId: number;
    nomeComponente: string;
    tipoComponente: string;
    quantidadeCalculada: number;
    quantidadeAjustada: number;
    unidade: string;
    editavel: boolean;
  }>;
}

export async function exportarFichaPrePesagemPDF(
  diaSelecionado: number,
  produtos: ProdutoPrePesagem[],
  intermediarios: IntermediarioItem[]
) {
  const doc = new jsPDF();
  
  // Cabeçalho com logo
  let yPosition = await adicionarCabecalho(doc, 'Ficha de Pré-Pesagem', diaSelecionado);

  // Seção de Massas Base (Intermediários)
  if (intermediarios && intermediarios.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9); // Cor âmbar
    doc.text('Massas Base a Produzir', 14, yPosition);
    doc.setTextColor(0);
    yPosition += 8;

    intermediarios.forEach((inter) => {
      // Nome do intermediário
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`${inter.nomeProduto} - ${inter.quantidadeArredondada.toFixed(3)} ${inter.unidade}`, 14, yPosition);
      yPosition += 5;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Usado em: ${inter.produtosFilhos.join(', ')}`, 14, yPosition);
      yPosition += 6;

      // Tabela de ingredientes do intermediário
      if (inter.ingredientes && inter.ingredientes.length > 0) {
        autoTable(doc, {
          startY: yPosition,
          head: [['☐', 'Ingrediente', 'Quantidade', 'Unid.']],
          body: inter.ingredientes.map(ing => [
            '☐',
            ing.nomeComponente,
            ing.quantidadeArredondada.toFixed(3),
            ing.unidade
          ]),
          theme: 'grid',
          headStyles: { fillColor: [245, 158, 11], textColor: [0, 0, 0], fontStyle: 'bold' },
          styles: { fontSize: 9, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 80 },
            2: { cellWidth: 30, halign: 'right' },
            3: { cellWidth: 20, halign: 'center' }
          },
          margin: { left: 14, right: 14 }
        });
        yPosition = (doc as any).lastAutoTable.finalY + 8;
      }

      // Modo de Preparo do intermediário
      if (inter.modoPreparo && inter.modoPreparo.length > 0) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(139, 69, 19); // Marrom
        doc.text('Modo de Preparo:', 14, yPosition);
        doc.setTextColor(0);
        yPosition += 5;

        const tempoTotal = inter.modoPreparo.reduce((acc, p) => acc + p.tempoMinutos, 0);
        
        autoTable(doc, {
          startY: yPosition,
          head: [['#', 'Descrição', 'Tempo (min)']],
          body: [
            ...inter.modoPreparo.map(p => [
              p.ordem.toString(),
              p.descricao,
              p.tempoMinutos.toString()
            ]),
            ['', 'TEMPO TOTAL', tempoTotal.toString()]
          ],
          theme: 'grid',
          headStyles: { fillColor: [139, 69, 19], textColor: [255, 255, 255], fontStyle: 'bold' },
          styles: { fontSize: 9, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 120 },
            2: { cellWidth: 25, halign: 'center' }
          },
          margin: { left: 14, right: 14 },
          didParseCell: function(data) {
            // Destacar linha de total
            if (data.row.index === inter.modoPreparo!.length) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = [245, 245, 220];
            }
          }
        });
        yPosition = (doc as any).lastAutoTable.finalY + 8;
      }

      // Verificar se precisa de nova página
      if (yPosition > 260) {
        doc.addPage();
        yPosition = 20;
      }
    });
  }

  // Linha separadora
  if (intermediarios && intermediarios.length > 0) {
    doc.setDrawColor(200);
    doc.line(14, yPosition, 196, yPosition);
    yPosition += 10;
  }

  // Seção de Produtos - Agrupados por Intermediário
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(234, 88, 12); // Cor laranja
  doc.text('Ficha de Pré-Pesagem por Produto', 14, yPosition);
  doc.setTextColor(0);
  yPosition += 10;

  // Agrupar produtos por intermediário
  const produtosAgrupados: { inter: IntermediarioItem | null; produtos: ProdutoPrePesagem[] }[] = [];
  const produtosJaAgrupados = new Set<string>();

  // Para cada intermediário, encontrar os produtos que o usam
  if (intermediarios && intermediarios.length > 0) {
    intermediarios.forEach((inter) => {
      const produtosDoInter = produtos.filter(p => 
        inter.produtosFilhos.some(filho => 
          p.nomeProduto.toLowerCase().trim() === filho.toLowerCase().trim()
        ) && !produtosJaAgrupados.has(p.codigoProduto)
      );
      
      produtosDoInter.forEach(p => produtosJaAgrupados.add(p.codigoProduto));
      
      if (produtosDoInter.length > 0) {
        produtosAgrupados.push({ inter, produtos: produtosDoInter });
      }
    });
  }

  // Produtos sem intermediário
  const produtosSemInter = produtos.filter(p => !produtosJaAgrupados.has(p.codigoProduto));
  if (produtosSemInter.length > 0) {
    produtosAgrupados.push({ inter: null, produtos: produtosSemInter });
  }

  // Renderizar grupos
  produtosAgrupados.forEach((grupo) => {
    // Verificar se precisa de nova página
    if (yPosition > 220) {
      doc.addPage();
      yPosition = 20;
    }

    // Cabeçalho do grupo (intermediário ou "Produtos Individuais")
    if (grupo.inter) {
      doc.setFillColor(147, 51, 234); // Roxo
      doc.rect(14, yPosition - 4, 182, 8, 'F');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(`Produtos que usam ${grupo.inter.nomeProduto} (${grupo.produtos.length} produto(s))`, 16, yPosition + 1);
      doc.setTextColor(0);
      yPosition += 10;
    } else {
      doc.setFillColor(100, 100, 100); // Cinza
      doc.rect(14, yPosition - 4, 182, 8, 'F');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(`Produtos Individuais (sem massa base) - ${grupo.produtos.length} produto(s)`, 16, yPosition + 1);
      doc.setTextColor(0);
      yPosition += 10;
    }

    // Renderizar produtos do grupo
    grupo.produtos.forEach((produto) => {
      // Verificar se precisa de nova página
      if (yPosition > 240) {
        doc.addPage();
        yPosition = 20;
      }

      // Cabeçalho do produto
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`${produto.codigoProduto} - ${produto.nomeProduto}`, 14, yPosition);
      yPosition += 5;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Qtd Planejada: ${produto.qtdPlanejada.toFixed(2)} ${produto.unidade}`, 14, yPosition);
      yPosition += 6;

      // Tabela de insumos
      if (produto.insumos && produto.insumos.length > 0) {
        autoTable(doc, {
          startY: yPosition,
          head: [['☐', 'Ingrediente', 'Quantidade', 'Unid.']],
          body: produto.insumos.map(insumo => [
            '☐',
            insumo.nomeComponente,
            insumo.quantidadeArredondada.toFixed(3),
            insumo.unidade
          ]),
          theme: 'grid',
          headStyles: { fillColor: [234, 88, 12], textColor: [255, 255, 255], fontStyle: 'bold' },
          styles: { fontSize: 9, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 80 },
            2: { cellWidth: 30, halign: 'right' },
            3: { cellWidth: 20, halign: 'center' }
          },
          margin: { left: 14, right: 14 }
        });
        yPosition = (doc as any).lastAutoTable.finalY + 10;
      }
    });
  });

  // Rodapé
  adicionarRodape(doc);

  // Salvar
  doc.save(`ficha-pre-pesagem-${DIAS_SEMANA[diaSelecionado].toLowerCase().replace('-feira', '')}.pdf`);
}

export async function exportarListaExpedicaoPDF(
  diaSelecionado: number,
  produtos: ProdutoExpedicao[]
) {
  const doc = new jsPDF();
  
  // Cabeçalho com logo
  const yPosition = await adicionarCabecalho(doc, 'Lista de Expedição', diaSelecionado);
  
  // Tabela de produtos
  autoTable(doc, {
    startY: yPosition,
    head: [['☐', 'Código', 'Produto', 'Saldo Estoque', 'Qtd. Separar', 'Unid.']],
    body: produtos.map(produto => [
      '☐',
      produto.codigoProduto,
      produto.nome,
      parseFloat(produto.saldoEstoque || '0').toFixed(0),
      '', // Campo vazio para preenchimento manual
      'un'
    ]),
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 25 },
      2: { cellWidth: 70 },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 15, halign: 'center' }
    },
    margin: { left: 14, right: 14 }
  });

  // Área de assinatura
  const finalY = (doc as any).lastAutoTable.finalY + 20;
  
  doc.setFontSize(10);
  doc.text('Responsável pela Separação: _______________________________', 14, finalY);
  doc.text('Data/Hora: _______________', 14, finalY + 10);
  doc.text('Assinatura: _______________________________', 14, finalY + 20);

  // Rodapé
  adicionarRodape(doc);

  // Salvar
  doc.save(`lista-expedicao-${DIAS_SEMANA[diaSelecionado].toLowerCase().replace('-feira', '')}.pdf`);
}

interface IntermediarioProducao {
  nomeProduto: string;
  quantidadeArredondada: number;
  unidade: string;
  produtosFilhos: string[];
  ingredientes: Array<{
    nomeComponente: string;
    quantidadeArredondada: number;
    unidade: string;
  }>;
  modoPreparo?: Array<{
    ordem: number;
    descricao: string;
    tempoMinutos: number;
  }>;
}

export async function exportarFichaProducaoPDF(
  diaSelecionado: number,
  produtos: ProdutoProducao[],
  intermediarios?: IntermediarioProducao[]
) {
  const doc = new jsPDF();
  
  // Cabeçalho com logo
  let yPosition = await adicionarCabecalho(doc, 'Mapa de Produção', diaSelecionado);

  // Agrupar produtos por intermediário
  const produtosAgrupadosPorInter: { inter: IntermediarioProducao | null; produtos: ProdutoProducao[] }[] = [];
  const produtosJaAgrupados = new Set<string>();

  // Para cada intermediário, encontrar os produtos que o usam
  if (intermediarios && intermediarios.length > 0) {
    intermediarios.forEach((inter) => {
      // Filtrar apenas produtos que têm ingredientes adicionais (não apenas massa base)
      const produtosDoInter = produtos.filter(p => 
        inter.produtosFilhos.some(filho => 
          p.nomeProduto.toLowerCase().trim() === filho.toLowerCase().trim()
        ) && !produtosJaAgrupados.has(p.codigoProduto) &&
        p.passo3 // Apenas produtos com passo3 (instruções de produção)
      );
      
      produtosDoInter.forEach(p => produtosJaAgrupados.add(p.codigoProduto));
      
      if (produtosDoInter.length > 0) {
        produtosAgrupadosPorInter.push({ inter, produtos: produtosDoInter });
      }
    });
  }

  // Produtos sem intermediário
  const produtosSemInter = produtos.filter(p => !produtosJaAgrupados.has(p.codigoProduto) && p.passo3);
  if (produtosSemInter.length > 0) {
    produtosAgrupadosPorInter.push({ inter: null, produtos: produtosSemInter });
  }

  // Renderizar cada seção por massa base
  produtosAgrupadosPorInter.forEach((grupo) => {
    // Verificar se precisa de nova página
    if (yPosition > 220) {
      doc.addPage();
      yPosition = 20;
    }

    // Adicionar espaço antes de cada grupo (se não for o primeiro)
    if (yPosition > 30) {
      yPosition += 50; // Espaço entre massas base
    }
    
    // ===== 1. CABEÇALHO DA MASSA BASE =====
    if (grupo.inter) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(230, 126, 34); // Laranja forte
      doc.rect(14, yPosition - 4, 182, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text(`${grupo.inter.nomeProduto}`, 16, yPosition + 1);
      doc.setTextColor(0);
      yPosition += 10;
    }

    // ===== 2. TABELA DE INSTRUÇÕES DE PRODUÇÃO =====
    const dadosTabela = grupo.produtos.map(produto => {
      const p3 = produto.passo3!;
      return [
        produto.codigoProduto,
        produto.nomeProduto,
        p3.blocos.toString(),
        p3.pesoBloco.toFixed(3),
        p3.pedacos.toString(),
        p3.pesoPedaco.toFixed(3)
      ];
    });

    if (dadosTabela.length > 0) {
      autoTable(doc, {
        startY: yPosition,
        head: [['Código', 'Produto', 'Blocos', 'Peso Bloco', 'Ped aços', 'Peso Ped aço']],
        body: dadosTabela,
        theme: 'grid',
        headStyles: { fillColor: [180, 83, 9], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 18 },
          1: { cellWidth: 60 },
          2: { cellWidth: 18, halign: 'center' },
          3: { cellWidth: 22, halign: 'right' },
          4: { cellWidth: 15, halign: 'center' },
          5: { cellWidth: 22, halign: 'right' }
        },
        margin: { left: 14, right: 14 }
      });
      yPosition = (doc as any).lastAutoTable.finalY + 8;
    }

    // ===== 3. INGREDIENTES DA MASSA BASE =====
    if (grupo.inter && grupo.inter.ingredientes && grupo.inter.ingredientes.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Ingredientes da Massa Base:', 16, yPosition);
      yPosition += 5;

      const totalIngredientes = grupo.inter.ingredientes.reduce((acc, ing) => acc + ing.quantidadeArredondada, 0);
      
      autoTable(doc, {
        startY: yPosition,
        head: [['Ingrediente', 'Quantidade', 'Unid.']],
        body: [
          ...grupo.inter.ingredientes.map(ing => [
            ing.nomeComponente,
            ing.quantidadeArredondada.toFixed(3),
            ing.unidade
          ]),
          ['Total:', totalIngredientes.toFixed(3), 'kg']
        ],
        theme: 'grid',
        headStyles: { fillColor: [180, 83, 9], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { cellWidth: 35, halign: 'right' },
          2: { cellWidth: 25, halign: 'center' }
        },
        margin: { left: 14, right: 14 },
        didParseCell: function(data) {
          if (data.row.index === grupo.inter!.ingredientes.length) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [255, 243, 224];
          }
        }
      });
      yPosition = (doc as any).lastAutoTable.finalY + 8;
    }

    // ===== 4. PARA CADA PRODUTO: INGREDIENTES ADICIONAIS + MODO DE PREPARO =====
    grupo.produtos.forEach((produto) => {
      // Ingredientes adicionais do produto (se houver)
      const ingredientesAdicionais = produto.insumos?.filter(i => i.tipoComponente === 'ingrediente') || [];
      
      // Ocultar produtos que têm apenas massa base (sem ingredientes adicionais)
      if (ingredientesAdicionais.length === 0) {
        return; // Pular para o próximo produto
      }

      // Verificar se precisa de nova página
      if (yPosition > 240) {
        doc.addPage();
        yPosition = 20;
      }

      // Título do produto
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(255, 243, 224); // Laranja claro
      doc.rect(14, yPosition - 3, 182, 7, 'F');
      doc.text(`${produto.nomeProduto} (${produto.passo3?.qtdInteira.toFixed(3)} ${produto.unidade})`, 16, yPosition + 1);
      yPosition += 8;

      // Ingredientes adicionais do produto
      if (ingredientesAdicionais.length > 0) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Ingredientes Adicionais:', 16, yPosition);
        yPosition += 4;

        // Tabela de ingredientes adicionais com dados reais
        autoTable(doc, {
          startY: yPosition,
          head: [['Ingrediente', 'Quantidade', 'Unid.']],
          body: ingredientesAdicionais.map(ing => [
            ing.nomeComponente,
            ing.quantidadeAjustada.toFixed(3),
            ing.unidade
          ]),
          theme: 'grid',
          headStyles: { fillColor: [180, 83, 9], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
          styles: { fontSize: 8, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 100 },
            1: { cellWidth: 35, halign: 'right' },
            2: { cellWidth: 25, halign: 'center' }
          },
          margin: { left: 14, right: 14 }
        });
        yPosition = (doc as any).lastAutoTable.finalY + 5;
      }

      // Modo de Preparo do produto
      if (produto.modoPreparo && produto.modoPreparo.length > 0) {
        const tempoTotal = produto.modoPreparo.reduce((acc, p) => acc + p.tempoMinutos, 0);
        
        autoTable(doc, {
          startY: yPosition,
          head: [['#', 'Descrição', 'Tempo (min)']],
          body: [
            ...produto.modoPreparo.map(p => [
              p.ordem.toString(),
              p.descricao,
              p.tempoMinutos.toString()
            ]),
            ['', 'TEMPO TOTAL', tempoTotal.toString()]
          ],
          theme: 'grid',
          headStyles: { fillColor: [180, 83, 9], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
          styles: { fontSize: 8, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 130 },
            2: { cellWidth: 25, halign: 'center' }
          },
          margin: { left: 14, right: 14 },
          didParseCell: function(data) {
            if (data.row.index === produto.modoPreparo!.length) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = [245, 245, 220];
            }
          }
        });
        yPosition = (doc as any).lastAutoTable.finalY + 10;
      }
    });
  });

  // Rodapé
  adicionarRodape(doc);

  // Salvar
  doc.save(`ficha-producao-${DIAS_SEMANA[diaSelecionado].toLowerCase().replace('-feira', '')}.pdf`);
}


// Interface para Detalhes por Produto
interface ProdutoDetalhes {
  codigoProduto: string;
  nomeProduto: string;
  unidade: string;
  qtdPlanejada: number;
  tipoEmbalagem: string;
  quantidadePorEmbalagem: number;
  status: 'ok' | 'erro';
  erro?: string;
}

// Exportar Detalhes por Produto em PDF
export async function exportarDetalhesProdutoPDF(
  diaSelecionado: number,
  produtos: ProdutoDetalhes[]
) {
  const doc = new jsPDF();
  
  // Cabeçalho com logo
  let yPosition = await adicionarCabecalho(doc, 'Embalagem', diaSelecionado);

  // Tabela de embalagem
  const dadosTabela = produtos.map(produto => [
    produto.codigoProduto,
    produto.nomeProduto,
    produto.unidade,
    produto.qtdPlanejada.toFixed(3),
    produto.tipoEmbalagem || '-',
    produto.quantidadePorEmbalagem > 0 ? produto.quantidadePorEmbalagem.toString() : '-',
    produto.status === 'ok' ? 'OK' : produto.erro || 'Erro'
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [['Código', 'Produto', 'Unid.', 'Qtd Plan.', 'Tipo Embalagem', 'Qtde/Emb.', 'Status']],
    body: dadosTabela,
    theme: 'grid',
    headStyles: { fillColor: [234, 88, 12], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 45 },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 22, halign: 'right' },
      4: { cellWidth: 40 },
      5: { cellWidth: 18, halign: 'center' },
      6: { cellWidth: 22, halign: 'center' }
    },
    margin: { left: 14, right: 14 },
    didParseCell: function(data) {
      // Colorir status
      if (data.column.index === 6 && data.section === 'body') {
        if (data.cell.raw === 'OK') {
          data.cell.styles.textColor = [22, 163, 74]; // Verde
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [220, 38, 38]; // Vermelho
        }
      }
    }
  });

  // Resumo
  yPosition = (doc as any).lastAutoTable.finalY + 15;
  const totalProdutos = produtos.length;
  const produtosOk = produtos.filter(p => p.status === 'ok').length;
  const produtosErro = produtos.filter(p => p.status === 'erro').length;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumo:', 14, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total de Produtos: ${totalProdutos}`, 14, yPosition + 6);
  doc.text(`Produtos OK: ${produtosOk}`, 14, yPosition + 12);
  doc.text(`Produtos com Erro: ${produtosErro}`, 14, yPosition + 18);

  // Rodapé
  adicionarRodape(doc);

  // Salvar
  doc.save(`detalhes-produto-${DIAS_SEMANA[diaSelecionado].toLowerCase().replace('-feira', '')}.pdf`);
}

// Interface para Molhados Consolidados
interface InsumoMolhado {
  nomeComponente: string;
  quantidadeTotal: number;
  unidade: string;
}

// Exportar Molhados Consolidados em PDF
export async function exportarMolhadosConsolidadosPDF(
  molhados: InsumoMolhado[]
) {
  const doc = new jsPDF();
  
  // Cabeçalho manual (sem dia específico)
  const dataAtual = new Date().toLocaleDateString('pt-BR');
  const logo = await carregarLogo();
  
  let yPosition = 15;
  
  if (logo) {
    try {
      doc.addImage(logo, 'PNG', 14, 10, 25, 25);
      yPosition = 18;
    } catch (e) {
      console.warn('Erro ao adicionar logo:', e);
    }
  }

  // Título
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235); // Azul
  doc.text('Insumos Molhados - Consolidado da Semana', logo ? 45 : 14, yPosition);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Gerado em: ${dataAtual}`, logo ? 45 : 14, yPosition + 7);
  doc.setTextColor(0);
  
  yPosition = logo ? 45 : 35;

  // Tabela de molhados
  const dadosTabela = molhados.map(insumo => [
    insumo.nomeComponente,
    insumo.quantidadeTotal.toFixed(3),
    insumo.unidade
  ]);

  // Calcular total
  const totalGeral = molhados.reduce((acc, item) => acc + item.quantidadeTotal, 0);

  autoTable(doc, {
    startY: yPosition,
    head: [['Insumo', 'Quantidade Total', 'Unidade']],
    body: dadosTabela,
    foot: [[`Total (${molhados.length} insumos)`, totalGeral.toFixed(3), 'kg']],
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10 },
    footStyles: { fillColor: [219, 234, 254], textColor: [30, 64, 175], fontStyle: 'bold', fontSize: 10 },
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 45, halign: 'right', fontStyle: 'bold' },
      2: { cellWidth: 30, halign: 'center' }
    },
    margin: { left: 14, right: 14 },
    alternateRowStyles: { fillColor: [248, 250, 252] }
  });

  // Área de assinatura
  yPosition = (doc as any).lastAutoTable.finalY + 20;
  
  doc.setFontSize(10);
  doc.text('Responsável pelo Pedido: _______________________________', 14, yPosition);
  doc.text('Data: _______________', 14, yPosition + 10);
  doc.text('Assinatura: _______________________________', 14, yPosition + 20);

  // Rodapé
  adicionarRodape(doc);

  // Salvar
  doc.save(`molhados-consolidados-semana.pdf`);
}
