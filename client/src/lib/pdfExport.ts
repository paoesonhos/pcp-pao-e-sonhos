import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Tipos de dados
interface ProdutoProducao {
  codigoProduto: string;
  nomeProduto: string;
  passo3?: {
    qtdInteira?: number;
    divisora?: number;
    blocos: number;
    pedacos: number;
    pesoBloco: number;
    pesoUnitarioReal?: number;
    pesoPedaco: number;
    instrucaoBlocos?: string;
    instrucaoPedaco?: string;
  } | null;
}

interface IntermediarioProducao {
  nomeProduto: string;
  quantidadeArredondada: number;
  unidade: string;
  produtosFilhos: string[];
  ingredientes?: {
    nomeComponente: string;
    quantidadeArredondada: number;
    unidade: string;
  }[];
  modoPreparo?: {
    ordem: number;
    descricao: string;
    tempoMinutos: number;
  }[];
}

const DIAS_SEMANA = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
];

// Função para adicionar cabeçalho com logo
async function adicionarCabecalho(doc: jsPDF, titulo: string, diaSelecionado: number): Promise<number> {
  // Cabeçalho simples
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(titulo, 14, 20);
  
  // Dia da semana
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${DIAS_SEMANA[diaSelecionado]}`, 14, 28);
  
  return 35;
}

// Função para adicionar rodapé
function adicionarRodape(doc: jsPDF) {
  const pageCount = (doc as any).internal.getNumberOfPages();
  const pageSize = doc.internal.pageSize;
  const pageHeight = pageSize.getHeight();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageSize.getWidth() / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }
}

// Exportar Ficha de Produção em PDF
export async function exportarFichaProducaoPDF(
  diaSelecionado: number,
  produtos: ProdutoProducao[],
  intermediarios?: IntermediarioProducao[]
) {
  const doc = new jsPDF();
  
  // Cabeçalho com logo
  let yPosition = await adicionarCabecalho(doc, 'Mapa de Produção', diaSelecionado);

  // Agrupar produtos por intermediário para renderização segmentada
  const produtosComPasso3 = produtos.filter(p => p.passo3);
  const produtosAgrupadosTabelaProducao: { inter: IntermediarioProducao | null; produtos: ProdutoProducao[] }[] = [];
  const produtosJaAgrupadosTabelaProducao = new Set<string>();

  // Para cada intermediário, encontrar os produtos que o usam
  if (intermediarios && intermediarios.length > 0) {
    intermediarios.forEach((inter) => {
      const produtosDoInter = produtosComPasso3.filter(p => 
        inter.produtosFilhos.some(filho => 
          p.nomeProduto.toLowerCase().trim() === filho.toLowerCase().trim()
        ) && !produtosJaAgrupadosTabelaProducao.has(p.codigoProduto)
      );
      
      produtosDoInter.forEach(p => produtosJaAgrupadosTabelaProducao.add(p.codigoProduto));
      
      if (produtosDoInter.length > 0) {
        produtosAgrupadosTabelaProducao.push({ inter, produtos: produtosDoInter });
      }
    });
  }

  // Produtos sem intermediário
  const produtosSemInterTabelaProducao = produtosComPasso3.filter(p => !produtosJaAgrupadosTabelaProducao.has(p.codigoProduto));
  if (produtosSemInterTabelaProducao.length > 0) {
    produtosAgrupadosTabelaProducao.push({ inter: null, produtos: produtosSemInterTabelaProducao });
  }

  // Renderizar tabelas segmentadas por massa base
  produtosAgrupadosTabelaProducao.forEach((grupo) => {
    // Verificar se precisa de nova página
    if (yPosition > 200) {
      doc.addPage();
      yPosition = 20;
    }

    // Cabeçalho da massa base
    if (grupo.inter) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(255, 247, 237); // Laranja claro
      doc.rect(14, yPosition - 4, 182, 8, 'F');
      doc.text(`${grupo.inter.nomeProduto} - ${grupo.inter.quantidadeArredondada.toFixed(3)} ${grupo.inter.unidade}`, 16, yPosition);
      yPosition += 8;
    }

    // Tabela de produtos da massa base
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
        head: [['Código', 'Produto', 'Blocos', 'Peso Bloco', 'Pedaços', 'Peso Pedaço']],
        body: dadosTabela,
        theme: 'grid',
        headStyles: { fillColor: [22, 163, 74], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
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

    // Tabela de Ingredientes da massa base
    if (grupo.inter && grupo.inter.ingredientes && grupo.inter.ingredientes.length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Ingredientes:', 16, yPosition);
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
          ['Total de Ingredientes:', totalIngredientes.toFixed(3), 'kg']
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
          if (grupo.inter?.ingredientes && data.row.index === grupo.inter.ingredientes.length) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [255, 247, 237];
          }
        }
      });
      yPosition = (doc as any).lastAutoTable.finalY + 8;
    }

    // Modo de Preparo da massa base
    if (grupo.inter && grupo.inter.modoPreparo && grupo.inter.modoPreparo.length > 0) {
      const tempoTotal = grupo.inter.modoPreparo.reduce((acc, p) => acc + p.tempoMinutos, 0);
      
      autoTable(doc, {
        startY: yPosition,
        head: [['#', 'Descrição', 'Tempo (min)']],
        body: [
          ...grupo.inter.modoPreparo.map(p => [
            p.ordem.toString(),
            p.descricao,
            p.tempoMinutos.toString()
          ]),
          ['', 'TEMPO TOTAL', tempoTotal.toString()]
        ],
        theme: 'grid',
        headStyles: { fillColor: [180, 83, 9], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 130 },
          2: { cellWidth: 25, halign: 'center' }
        },
        margin: { left: 14, right: 14 },
        didParseCell: function(data) {
          if (data.row.index === grupo.inter!.modoPreparo!.length) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [255, 247, 237];
          }
        }
      });
      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }
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
  let yPosition = await adicionarCabecalho(doc, 'Detalhes de Embalagem', diaSelecionado);

  // Tabela de detalhes
  const dadosTabela = produtos.map(p => [
    p.codigoProduto,
    p.nomeProduto,
    p.qtdPlanejada.toFixed(2),
    p.unidade,
    p.tipoEmbalagem,
    p.quantidadePorEmbalagem.toString(),
    p.status === 'ok' ? '✓' : '✗'
  ]);

  if (dadosTabela.length > 0) {
    autoTable(doc, {
      startY: yPosition,
      head: [['Código', 'Produto', 'Qtd', 'Unid.', 'Embalagem', 'Qtd/Emb', 'Status']],
      body: dadosTabela,
      theme: 'grid',
      headStyles: { fillColor: [22, 163, 74], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2 },
      margin: { left: 14, right: 14 }
    });
  }

  // Rodapé
  adicionarRodape(doc);

  // Salvar
  doc.save(`detalhes-embalagem-${DIAS_SEMANA[diaSelecionado].toLowerCase().replace('-feira', '')}.pdf`);
}
