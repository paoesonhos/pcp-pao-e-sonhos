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

// Função para desenhar checkbox vazio na última coluna
function adicionarCheckboxNaUltimaColuna(doc: jsPDF) {
  const tableData = (doc as any).lastAutoTable;
  if (tableData && tableData.rows) {
    tableData.rows.forEach((row: any) => {
      const lastCell = row.cells[row.cells.length - 1];
      if (lastCell && lastCell.width && lastCell.height) {
        // Desenhar checkbox no centro da célula
        const cellCenterX = lastCell.x + lastCell.width / 2;
        const cellCenterY = lastCell.y + lastCell.height / 2;
        const size = 3.5;
        const x = cellCenterX - size / 2;
        const y = cellCenterY - size / 2;
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.4);
        doc.rect(x, y, size, size);
      }
    });
  }
}

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


// Nova função para exportar Ficha de Pré-Pesagem (apenas insumos SECOS)
export async function exportarPrePesagemPDF(
  diaSelecionado: number,
  processamentoData: any
) {
  const doc = new jsPDF();
  
  // Cabeçalho com logo
  let yPosition = await adicionarCabecalho(doc, 'Ficha de Pré-Pesagem (Insumos Secos)', diaSelecionado);

  // Agrupar dados por dia
  const porDia = processamentoData.resultados.reduce((acc: any, r: any) => {
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

      // Renderizar produtos da massa base
      (produtosDaMassa as any[]).forEach((produto: any) => {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        // Cabeçalho do produto
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${produto.codigoProduto} - ${produto.nomeProduto} (${produto.qtdPlanejada} ${produto.unidade})`, 14, yPosition);
        yPosition += 5;

        // Filtrar insumos: apenas secos e com incluirPrePesagem = true
        const insumosSecos = produto.insumos?.filter((ing: any) => 
          ing.tipo === 'seco' && ing.incluirPrePesagem !== false
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

export async function exportarFichaProducaoPDF(
  diaSelecionado: number,
  processamentoData: any
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

export async function exportarDetalhesProdutoPDF(
  codigoProduto: string,
  nomeProduto: string,
  diaSelecionado: number,
  passo1: any,
  passo3: any,
  insumos: any[]
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
