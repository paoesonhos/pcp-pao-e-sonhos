// Re-exportar todas as funções dos arquivos separados para manter compatibilidade
export { exportarFichaProducaoPDF } from './pdfExportProducao';
export { exportarPrePesagemPDF } from './pdfExportPrePesagem';
export { exportarListaExpedicaoPDF } from './pdfExportExpedicao';
export { exportarDetalhesProdutoPDF } from './pdfExportDetalhes';

// Re-exportar funções auxiliares
export { adicionarCabecalho, adicionarRodape, adicionarCheckboxNaUltimaColuna, DIAS_SEMANA } from './pdfHelpers';
