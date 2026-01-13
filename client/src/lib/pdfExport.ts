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
}

interface ProdutoExpedicao {
  codigoProduto: string;
  nome: string;
  saldoEstoque: string;
  unidade: string;
}

interface ResultadoDivisora {
  quantidadeUnidades: number;
  blocosInteiros: number;
  pesoBloco: number;
  unidadesRestantes: number;
  pesoPedaco: number;
  massaTotal: number;
}

interface ProdutoProducao {
  codigoProduto: string;
  nomeProduto: string;
  qtdPlanejada: number;
  unidade: string;
  pesoUnitario: number;
  divisora: ResultadoDivisora | null;
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
  doc.setTextColor(234, 88, 12); // Cor laranja
  doc.text('Ficha de Pré-Pesagem por Produto', 14, yPosition);
  doc.setTextColor(0);
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

export async function exportarFichaProducaoPDF(
  diaSelecionado: number,
  produtos: ProdutoProducao[]
) {
  const doc = new jsPDF();
  
  // Cabeçalho com logo
  let yPosition = await adicionarCabecalho(doc, 'Ficha de Produção', diaSelecionado);

  // Título da seção
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 163, 74); // Cor verde
  doc.text('Instruções de Produção - Divisora', 14, yPosition);
  doc.setTextColor(0);
  yPosition += 10;

  // Tabela principal de produção
  const dadosTabela = produtos
    .filter(p => p.divisora)
    .map(produto => {
      const d = produto.divisora!;
      return [
        produto.codigoProduto,
        produto.nomeProduto,
        `${produto.qtdPlanejada.toFixed(2)} ${produto.unidade}`,
        d.blocosInteiros.toString(),
        d.pesoBloco.toFixed(3),
        d.unidadesRestantes.toString(),
        d.pesoPedaco.toFixed(3),
        d.massaTotal.toFixed(3)
      ];
    });

  if (dadosTabela.length > 0) {
    autoTable(doc, {
      startY: yPosition,
      head: [['Código', 'Produto', 'Qtd Plan.', 'Blocos', 'Peso Bloco', 'Resto', 'Peso Pedaço', 'Massa Total']],
      body: dadosTabela,
      theme: 'grid',
      headStyles: { fillColor: [22, 163, 74], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 45 },
        2: { cellWidth: 22, halign: 'right' },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 22, halign: 'right' },
        5: { cellWidth: 15, halign: 'center' },
        6: { cellWidth: 22, halign: 'right' },
        7: { cellWidth: 22, halign: 'right' }
      },
      margin: { left: 14, right: 14 }
    });
    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }

  // Detalhes por produto
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Detalhes por Produto', 14, yPosition);
  yPosition += 8;

  produtos.filter(p => p.divisora).forEach((produto) => {
    // Verificar se precisa de nova página
    if (yPosition > 240) {
      doc.addPage();
      yPosition = 20;
    }

    const d = produto.divisora!;
    
    // Cabeçalho do produto
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 253, 244); // Verde claro
    doc.rect(14, yPosition - 4, 182, 8, 'F');
    doc.text(`${produto.codigoProduto} - ${produto.nomeProduto}`, 16, yPosition);
    yPosition += 8;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    // Informações da divisora
    const info = [
      `Quantidade Planejada: ${produto.qtdPlanejada.toFixed(2)} ${produto.unidade}`,
      `Unidades a Produzir: ${d.quantidadeUnidades}`,
      `Blocos de 30 unidades: ${d.blocosInteiros} blocos × ${d.pesoBloco.toFixed(3)} kg = ${(d.blocosInteiros * d.pesoBloco).toFixed(3)} kg`,
      d.unidadesRestantes > 0 ? `Pedaço restante: ${d.unidadesRestantes} unidades × ${d.pesoPedaco.toFixed(3)} kg` : null,
      `Massa Total: ${d.massaTotal.toFixed(3)} kg`
    ].filter(Boolean);

    info.forEach(linha => {
      doc.text(linha as string, 16, yPosition);
      yPosition += 5;
    });
    
    yPosition += 5;
  });

  // Área de assinatura
  if (yPosition > 240) {
    doc.addPage();
    yPosition = 20;
  }
  
  yPosition += 10;
  doc.setFontSize(10);
  doc.text('Responsável pela Produção: _______________________________', 14, yPosition);
  doc.text('Data/Hora Início: _______________', 14, yPosition + 10);
  doc.text('Data/Hora Fim: _______________', 100, yPosition + 10);
  doc.text('Assinatura: _______________________________', 14, yPosition + 20);

  // Rodapé
  adicionarRodape(doc);

  // Salvar
  doc.save(`ficha-producao-${DIAS_SEMANA[diaSelecionado].toLowerCase().replace('-feira', '')}.pdf`);
}
