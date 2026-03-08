import jsPDF from 'jspdf';

// Dias da semana
export const DIAS_SEMANA: Record<number, string> = {
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
export function adicionarCheckboxNaUltimaColuna(doc: jsPDF) {
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
export async function adicionarCabecalho(doc: jsPDF, titulo: string, diaSelecionado: number): Promise<number> {
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
export function adicionarRodape(doc: jsPDF) {
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
