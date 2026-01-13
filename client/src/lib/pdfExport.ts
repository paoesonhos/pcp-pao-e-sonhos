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
}

interface ProdutoExpedicao {
  codigoProduto: string;
  nome: string;
  saldoEstoque: string;
  unidade: string;
}

export function exportarFichaPrePesagemPDF(
  diaSelecionado: number,
  produtos: ProdutoPrePesagem[],
  intermediarios: IntermediarioItem[]
) {
  const doc = new jsPDF();
  const dataAtual = new Date().toLocaleDateString('pt-BR');
  
  // Título
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Ficha de Pré-Pesagem', 14, 20);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${DIAS_SEMANA[diaSelecionado]} - Gerado em: ${dataAtual}`, 14, 28);
  
  let yPosition = 38;

  // Seção de Massas Base (Intermediários)
  if (intermediarios && intermediarios.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Massas Base a Produzir', 14, yPosition);
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

  // Seção de Produtos
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Ficha de Pré-Pesagem por Produto', 14, yPosition);
  yPosition += 10;

  produtos.forEach((produto) => {
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

  // Rodapé
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Pão & Sonhos - Sistema PCP | Página ${i} de ${pageCount}`, 14, 290);
  }

  // Salvar
  doc.save(`ficha-pre-pesagem-${DIAS_SEMANA[diaSelecionado].toLowerCase().replace('-feira', '')}.pdf`);
}

export function exportarListaExpedicaoPDF(
  diaSelecionado: number,
  produtos: ProdutoExpedicao[]
) {
  const doc = new jsPDF();
  const dataAtual = new Date().toLocaleDateString('pt-BR');
  
  // Título
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Lista de Expedição', 14, 20);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${DIAS_SEMANA[diaSelecionado]} - Gerado em: ${dataAtual}`, 14, 28);
  
  // Tabela de produtos
  autoTable(doc, {
    startY: 38,
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
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Pão & Sonhos - Sistema PCP | Página ${i} de ${pageCount}`, 14, 290);
  }

  // Salvar
  doc.save(`lista-expedicao-${DIAS_SEMANA[diaSelecionado].toLowerCase().replace('-feira', '')}.pdf`);
}
