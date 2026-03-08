import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DIAS_SEMANA, adicionarCabecalho, adicionarRodape } from './pdfHelpers';

interface IngredienteIntermediario {
  componenteId: number;
  nomeComponente: string;
  quantidadeArredondada: number;
  unidade: string;
}

interface IntermediarioItem {
  nomeProduto: string;
  quantidadeArredondada: number;
  unidade: string;
  produtosFilhos: string[];
  ingredientes: IngredienteIntermediario[];
}

interface Passo3 {
  blocos: number;
  pesoBloco: number;
  pedacos: number;
  pesoPedaco: number;
}

interface ComponenteProcessado {
  componenteId: number;
  nomeComponente: string;
  tipoComponente: string;
  quantidadeAjustada: number;
  unidade: string;
}

interface ProdutoProcessado {
  codigoProduto: string;
  nomeProduto: string;
  qtdPlanejada: number;
  unidade: string;
  passo3: Passo3 | null;
  insumos: ComponenteProcessado[];
}

export async function exportarFichaProducaoPDF(
  diaSelecionado: number,
  produtos: ProdutoProcessado[],
  intermediarios: IntermediarioItem[]
) {
  const doc = new jsPDF();
  
  // Cabeçalho com logo
  let yPosition = await adicionarCabecalho(doc, 'Ficha de Produção', diaSelecionado);

  // Agrupar produtos por massa base
  const produtosPorMassaBase: { [key: string]: ProdutoProcessado[] } = {};
  
  produtos.forEach((produto: any) => {
    // Encontrar a massa base deste produto
    const intermediario = intermediarios.find((inter: any) =>
      inter.produtosFilhos.some((filho: string) =>
        filho.toLowerCase().trim() === produto.nomeProduto.toLowerCase().trim()
      )
    );
    
    const massaBaseNome = intermediario?.nomeProduto || 'Sem Massa Base';
    if (!produtosPorMassaBase[massaBaseNome]) {
      produtosPorMassaBase[massaBaseNome] = [];
    }
    produtosPorMassaBase[massaBaseNome].push(produto);
  });

  // Renderizar cada massa base
  Object.entries(produtosPorMassaBase).forEach(([massaBaseName, produtosDaMassa]: [string, any]) => {
    if (yPosition > 240) {
      doc.addPage();
      yPosition = 20;
    }

    // 1. TÍTULO DA MASSA BASE
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(234, 88, 12); // Laranja
    doc.text(`${massaBaseName}`, 14, yPosition);
    doc.setTextColor(0);
    yPosition += 8;

    // 2. TABELA DE BLOCOS/PEDAÇOS DOS PRODUTOS
    const produtosComBlocos = produtosDaMassa.filter((p: any) => p.passo3);
    
    if (produtosComBlocos.length > 0) {
      autoTable(doc, {
        startY: yPosition,
        head: [['Produto', 'Blocos', 'Peso Bloco', 'Pedaços', 'Peso Pedaço', 'Feito']],
        body: produtosComBlocos.map((produto: any) => [
          `${produto.codigoProduto} - ${produto.nomeProduto}`,
          produto.passo3.blocos.toString(),
          `${produto.passo3.pesoBloco.toFixed(3)} kg`,
          produto.passo3.pedacos.toString(),
          `${produto.passo3.pesoPedaco.toFixed(3)} kg`,
          '☐' // Checkbox vazio para marcar com caneta
        ]),
        theme: 'grid',
        headStyles: { fillColor: [245, 158, 11], textColor: [0, 0, 0], fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 15, halign: 'center' },
          2: { cellWidth: 25, halign: 'right' },
          3: { cellWidth: 15, halign: 'center' },
          4: { cellWidth: 25, halign: 'right' },
          5: { cellWidth: 15, halign: 'center' }
        },
        margin: { left: 14, right: 14 },
        didParseCell: () => {}
      });
      yPosition = (doc as any).lastAutoTable.finalY + 6;
    }

    // 3. TABELA DE INGREDIENTES DA MASSA BASE
    if (massaBaseName !== 'Sem Massa Base') {
      const massaBase = intermediarios.find((inter: any) => inter.nomeProduto === massaBaseName);
      
      if (massaBase && massaBase.ingredientes && massaBase.ingredientes.length > 0) {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        autoTable(doc, {
          startY: yPosition,
          head: [['Ingrediente', 'Quantidade (kg)', 'Feito']],
          body: massaBase.ingredientes.map((ing: any) => [
            ing.nomeComponente,
            ing.quantidadeArredondada.toFixed(3),
            '☐' // Checkbox vazio para marcar com caneta
          ]),
          theme: 'grid',
          headStyles: { fillColor: [245, 158, 11], textColor: [0, 0, 0], fontStyle: 'bold' },
          styles: { fontSize: 9, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 100 },
            1: { cellWidth: 30, halign: 'right' },
            2: { cellWidth: 20, halign: 'center' }
          },
          margin: { left: 14, right: 14 },
          didParseCell: () => {}
        });
        yPosition = (doc as any).lastAutoTable.finalY + 8;
      }
    }

    // 4. PRODUTOS COM INGREDIENTES ADICIONAIS
    const produtosComIngredientes = produtosDaMassa.filter((p: any) => {
      const ingredientesAdicionais = p.insumos?.filter((ing: any) => 
        ing.tipoComponente === 'ingrediente'
      ) || [];
      return ingredientesAdicionais.length > 0;
    });

    produtosComIngredientes.forEach((produto: any) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      // 4a. TÍTULO DO PRODUTO
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${produto.codigoProduto} - ${produto.nomeProduto}`, 14, yPosition);
      yPosition += 5;

      // 4b. TABELA DE INGREDIENTES ADICIONAIS
      const ingredientesAdicionais = produto.insumos?.filter((ing: any) => 
        ing.tipoComponente === 'ingrediente'
      ) || [];

      if (ingredientesAdicionais.length > 0) {
        autoTable(doc, {
          startY: yPosition,
          head: [['Ingrediente', 'Quantidade (kg)']],
          body: ingredientesAdicionais.map((ing: any) => [
            ing.nomeComponente,
            ing.quantidadeAjustada.toFixed(3)
          ]),
          theme: 'grid',
          headStyles: { fillColor: [234, 88, 12], textColor: [255, 255, 255], fontStyle: 'bold' },
          styles: { fontSize: 9, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 100 },
            1: { cellWidth: 30, halign: 'right' }
          },
          margin: { left: 14, right: 14 },
          didParseCell: () => {}
        });
        yPosition = (doc as any).lastAutoTable.finalY + 6;
      }
    });

    yPosition += 8;
  });

  // Rodapé
  adicionarRodape(doc);

  // Salvar
  doc.save(`ficha-producao-${DIAS_SEMANA[diaSelecionado].toLowerCase().replace('-feira', '')}.pdf`);
}
