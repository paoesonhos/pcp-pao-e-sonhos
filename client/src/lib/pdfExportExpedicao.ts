import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DIAS_SEMANA, adicionarCabecalho, adicionarRodape } from './pdfHelpers';

interface ProdutoExpedicao {
  codigoProduto: string;
  nome: string;
  saldoEstoque: string;
  unidade: string;
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
    margin: { left: 14, right: 14 },
    didParseCell: () => {}
  });

  // Rodapé
  adicionarRodape(doc);

  // Salvar
  doc.save(`lista-expedicao-${DIAS_SEMANA[diaSelecionado].toLowerCase().replace('-feira', '')}.pdf`);
}
