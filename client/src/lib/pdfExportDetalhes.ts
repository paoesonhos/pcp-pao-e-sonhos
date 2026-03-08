import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { adicionarCabecalho, adicionarRodape } from './pdfHelpers';

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

interface Insumo {
  componenteId: number;
  nomeComponente: string;
  tipoComponente: string;
  quantidadeCalculada: number;
  quantidadeAjustada: number;
  unidade: string;
  editavel: boolean;
}

export async function exportarDetalhesProdutoPDF(
  codigoProduto: string,
  nomeProduto: string,
  diaSelecionado: number,
  passo1: any,
  passo3: Passo3 | null,
  insumos: Insumo[]
) {
  const doc = new jsPDF();
  
  // Cabeçalho com logo
  let yPosition = await adicionarCabecalho(doc, `Detalhes: ${nomeProduto}`, diaSelecionado);

  // Informações gerais
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Informações do Produto', 14, yPosition);
  yPosition += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Código: ${codigoProduto}`, 14, yPosition);
  yPosition += 5;
  doc.text(`Produto: ${nomeProduto}`, 14, yPosition);
  yPosition += 8;

  // Passo 1 - Conversão Assado → Cru
  if (passo1) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9);
    doc.text('Passo 1: Conversão Assado → Cru', 14, yPosition);
    doc.setTextColor(0);
    yPosition += 6;

    autoTable(doc, {
      startY: yPosition,
      head: [['Descrição', 'Valor']],
      body: [
        ['Valor do Mapa', `${passo1.valorMapa.toFixed(3)} kg`],
        ['Massa Crua Teórica', `${passo1.massaCruaTeorica.toFixed(3)} kg`],
        ['Qtd Inteira', `${passo1.qtdInteira}`],
        ['Massa Total Final', `${passo1.massaTotalFinal.toFixed(3)} kg`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [245, 158, 11], textColor: [0, 0, 0], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 50, halign: 'right' }
      },
      margin: { left: 14, right: 14 },
      didParseCell: () => {}
    });
    yPosition = (doc as any).lastAutoTable.finalY + 8;
  }

  // Passo 3 - Blocos e Pedaços
  if (passo3) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9);
    doc.text('Passo 3: Blocos e Pedaços', 14, yPosition);
    doc.setTextColor(0);
    yPosition += 6;

    autoTable(doc, {
      startY: yPosition,
      head: [['Descrição', 'Valor']],
      body: [
        ['Blocos', `${passo3.blocos}`],
        ['Peso Bloco', `${passo3.pesoBloco.toFixed(3)} kg`],
        ['Pedaços', `${passo3.pedacos}`],
        ['Peso Pedaço', `${passo3.pesoPedaco.toFixed(3)} kg`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [245, 158, 11], textColor: [0, 0, 0], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 50, halign: 'right' }
      },
      margin: { left: 14, right: 14 },
      didParseCell: () => {}
    });
    yPosition = (doc as any).lastAutoTable.finalY + 8;
  }

  // Insumos
  if (insumos && insumos.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9);
    doc.text('Insumos', 14, yPosition);
    doc.setTextColor(0);
    yPosition += 6;

    autoTable(doc, {
      startY: yPosition,
      head: [['Ingrediente', 'Qtd Calculada', 'Qtd Ajustada', 'Unid.']],
      body: insumos.map(ing => [
        ing.nomeComponente,
        ing.quantidadeCalculada.toFixed(3),
        ing.quantidadeAjustada.toFixed(3),
        ing.unidade
      ]),
      theme: 'grid',
      headStyles: { fillColor: [245, 158, 11], textColor: [0, 0, 0], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 30, halign: 'right' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 20, halign: 'center' }
      },
      margin: { left: 14, right: 14 },
      didParseCell: () => {}
    });
  }

  // Rodapé
  adicionarRodape(doc);

  // Salvar
  doc.save(`detalhes-${codigoProduto}.pdf`);
}
