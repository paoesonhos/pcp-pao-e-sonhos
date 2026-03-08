import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DIAS_SEMANA, adicionarCabecalho, adicionarRodape } from './pdfHelpers';

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

interface ProcessamentoData {
  intermediarios: IntermediarioItem[];
}

export async function exportarFichaProducaoPDF(
  diaSelecionado: number,
  processamentoData: ProcessamentoData
) {
  const doc = new jsPDF();
  
  // Cabeçalho com logo
  let yPosition = await adicionarCabecalho(doc, 'Ficha de Produção', diaSelecionado);

  // Seção de Massas Base (Intermediários)
  if (processamentoData?.intermediarios && processamentoData.intermediarios.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9); // Cor âmbar
    doc.text('Massas Base a Produzir', 14, yPosition);
    doc.setTextColor(0);
    yPosition += 8;

    processamentoData.intermediarios.forEach((inter: any) => {
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
          body: inter.ingredientes.map((ing: any) => [
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
          margin: { left: 14, right: 14 },
          didParseCell: () => {}
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

  // Rodapé
  adicionarRodape(doc);

  // Salvar
  doc.save(`ficha-producao-${DIAS_SEMANA[diaSelecionado].toLowerCase().replace('-feira', '')}.pdf`);
}
