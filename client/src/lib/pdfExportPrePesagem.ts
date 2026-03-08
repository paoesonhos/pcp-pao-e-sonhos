import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DIAS_SEMANA, adicionarCabecalho, adicionarRodape } from './pdfHelpers';

interface InsumoItem {
  nomeComponente: string;
  quantidadeArredondada: number;
  unidade: string;
  tipoComponente: string;
  tipo: string;
  incluirPrePesagem?: boolean;
}

interface ProdutoPrePesagem {
  codigoProduto: string;
  nomeProduto: string;
  qtdPlanejada: number;
  unidade: string;
  diaProduzir: number;
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
    tipo: string;
    incluirPrePesagem?: boolean;
  }[];
}

interface ProcessamentoData {
  resultados: ProdutoPrePesagem[];
  intermediarios: IntermediarioItem[];
}

// Função para exportar Ficha de Pré-Pesagem (apenas insumos SECOS)
export async function exportarPrePesagemPDF(
  diaSelecionado: number,
  processamentoData: ProcessamentoData
) {
  const doc = new jsPDF();
  
  // Cabeçalho com logo
  let yPosition = await adicionarCabecalho(doc, 'Ficha de Pré-Pesagem (Insumos Secos)', diaSelecionado);

  // Agrupar dados por dia - FILTRANDO APENAS produtos com ingredientes ADICIONAIS secos
  const produtosComIngredientesSecos = processamentoData.resultados.filter((r: any) => {
    const insumosAdicionaisSecos = r.insumos?.filter((ing: any) => 
      ing.tipoComponente === 'ingrediente' && ing.tipo === 'seco' && ing.incluirPrePesagem !== false
    ) || [];
    return insumosAdicionaisSecos.length > 0;
  });

  const porDia = produtosComIngredientesSecos.reduce((acc: any, r: any) => {
    if (!acc[r.diaProduzir]) acc[r.diaProduzir] = [];
    acc[r.diaProduzir].push(r);
    return acc;
  }, {});

  // Renderizar cada dia
  Object.entries(porDia).forEach(([dia, produtos]: [string, any]) => {
    if (yPosition > 240) {
      doc.addPage();
      yPosition = 20;
    }

    // Título do dia
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9); // Cor âmbar
    doc.text(`${DIAS_SEMANA[parseInt(dia)]}`, 14, yPosition);
    doc.setTextColor(0);
    yPosition += 8;

    // Agrupar produtos por massa base
    const porMassaBase: { [key: string]: any[] } = {};
    
    (produtos as any[]).forEach((produto: any) => {
      // Encontrar a massa base deste produto
      const intermediario = processamentoData.intermediarios.find((inter: any) =>
        inter.produtosFilhos.some((filho: string) =>
          filho.toLowerCase().trim() === produto.nomeProduto.toLowerCase().trim()
        )
      );
      
      const massaBaseNome = intermediario?.nomeProduto || 'Sem Massa Base';
      if (!porMassaBase[massaBaseNome]) porMassaBase[massaBaseNome] = [];
      porMassaBase[massaBaseNome].push(produto);
    });

    // Renderizar cada massa base
    Object.entries(porMassaBase).forEach(([massaBaseName, produtosDaMassa]: [string, any]) => {
      if (yPosition > 240) {
        doc.addPage();
        yPosition = 20;
      }

      // Cabeçalho da massa base
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(234, 88, 12); // Laranja
      doc.text(`${massaBaseName}`, 14, yPosition);
      doc.setTextColor(0);
      yPosition += 6;

      // Ingredientes da massa base (se existir)
      if (massaBaseName !== 'Sem Massa Base') {
        const massaBase = processamentoData.intermediarios.find((inter: any) => inter.nomeProduto === massaBaseName);
        if (massaBase && massaBase.ingredientes) {
          // Filtrar apenas ingredientes secos com incluirPrePesagem = true
          const ingredientesSecos = massaBase.ingredientes.filter((ing: any) => 
            ing.tipo === 'seco' && ing.incluirPrePesagem !== false
          );

          if (ingredientesSecos.length > 0) {
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text('Ingredientes Base:', 14, yPosition);
            yPosition += 4;

            autoTable(doc, {
              startY: yPosition,
              head: [['☐', 'Ingrediente', 'Quantidade', 'Unid.']],
              body: ingredientesSecos.map((ing: any) => [
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
            yPosition = (doc as any).lastAutoTable.finalY + 6;
          }
        }
      }

      // Renderizar produtos da massa base - APENAS produtos com ingredientes adicionais secos
      const produtosComIngredientesSecos = (produtosDaMassa as any[]).filter((produto: any) => {
        const insumosSecos = produto.insumos?.filter((ing: any) => 
          ing.tipoComponente === 'ingrediente' && ing.tipo === 'seco' && ing.incluirPrePesagem !== false
        ) || [];
        return insumosSecos.length > 0;
      });

      produtosComIngredientesSecos.forEach((produto: any) => {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        // Cabeçalho do produto
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${produto.codigoProduto} - ${produto.nomeProduto} (${produto.qtdPlanejada} ${produto.unidade})`, 14, yPosition);
        yPosition += 5;

        // Filtrar insumos: apenas ingredientes adicionais secos (excluir massa base)
        const insumosSecos = produto.insumos?.filter((ing: any) => 
          ing.tipoComponente === 'ingrediente' && ing.tipo === 'seco' && ing.incluirPrePesagem !== false
        ) || [];

        if (insumosSecos.length > 0) {
          autoTable(doc, {
            startY: yPosition,
            head: [['☐', 'Ingrediente', 'Quantidade', 'Unid.']],
            body: insumosSecos.map((insumo: any) => [
              '☐',
              insumo.nomeComponente,
              insumo.quantidadeAjustada.toFixed(3),
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
            margin: { left: 14, right: 14 },
            didParseCell: () => {}
          });
          yPosition = (doc as any).lastAutoTable.finalY + 6;
        }
      });

      yPosition += 4;
    });

    yPosition += 6;
  });

  // Rodapé
  adicionarRodape(doc);

  // Salvar
  doc.save(`ficha-pre-pesagem-${DIAS_SEMANA[diaSelecionado].toLowerCase().replace('-feira', '')}.pdf`);
}
