import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import { useMapasSalvos } from "@/hooks/useMapasSalvos";
import { 
  ArrowLeft, 
  Calculator, 
  ClipboardList, 
  Factory, 
  AlertCircle,
  CheckCircle2,
  Scale,
  Boxes,
  Truck,
  Package,
  Download,
  Clock
} from "lucide-react";
import { exportarFichaProducaoPDF, exportarDetalhesProdutoPDF } from "@/lib/pdfExport";

// Tipos - Motor de Cálculo v3.0
interface InsumoConsolidado {
  componenteId: number;
  nomeComponente: string;
  quantidadeTotal: number;
  quantidadeArredondada: number;
  unidade: 'kg' | 'un';
  editavel: boolean;
  origens: string[];
}

interface Passo1 {
  valorMapa: number;
  massaCruaTeorica: number;
  qtdInteira: number;
  massaTotalFinal: number;
}

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

interface ComponenteProcessado {
  componenteId: number;
  nomeComponente: string;
  tipoComponente: string;
  quantidadeCalculada: number;
  quantidadeAjustada: number;
  unidade: string;
  editavel: boolean;
}

interface PassoModoPreparo {
  ordem: number;
  descricao: string;
  tempoMinutos: number;
}

interface ItemProcessado {
  codigoProduto: string;
  nomeProduto: string;
  unidade: string;
  qtdPlanejada: number;
  diaProduzir: number;
  pesoUnitario: number;
  tipoEmbalagem: string;
  quantidadePorEmbalagem: number;
  passo1: Passo1 | null;
  passo3: Passo3 | null;
  insumos: ComponenteProcessado[];
  modoPreparo?: PassoModoPreparo[];
  erro?: string;
}

interface IngredienteIntermediario {
  componenteId: number;
  nomeComponente: string;
  quantidadeBase: number;
  quantidadeCalculada: number;
  quantidadeArredondada: number;
  unidade: 'kg' | 'un';
  editavel: boolean;
}

interface IntermediarioConsolidado {
  produtoId: number;
  nomeProduto: string;
  quantidadeTotal: number;
  quantidadeArredondada: number;
  unidade: 'kg' | 'un';
  nivel: number;
  produtosFilhos: string[];
  ingredientes: IngredienteIntermediario[];
  modoPreparo?: Array<{
    ordem: number;
    descricao: string;
    tempoMinutos: number;
  }>;
}

function arredondarPesagem(valor: number): number {
  return Math.floor(valor * 200) / 200;
}

function formatarNumero(valor: number, unidade: string): string {
  if (unidade === 'un') {
    return Math.floor(valor).toString();
  }
  return valor.toFixed(3);
}

const DIAS_SEMANA: Record<number, string> = {
  2: "Segunda-feira",
  3: "Terça-feira",
  4: "Quarta-feira",
  5: "Quinta-feira",
  6: "Sexta-feira",
  7: "Sábado",
};

export default function ProcessamentoPCP() {
  const [, navigate] = useLocation();
  const { obterNomeMapaAtual } = useMapasSalvos();
  const [diaSelecionado, setDiaSelecionado] = useState<number>(2);
  const [fermentoEditado, setFermentoEditado] = useState<Record<string, number>>({});
  const [checksPesagem, setChecksPesagem] = useState<Record<string, boolean>>({});

  const { data: mapaData, isLoading: loadingMapa } = trpc.mapaProducao.carregarMapaBase.useQuery();

  const itensDoDia = useMemo(() => {
    if (!mapaData?.mapa) return [];
    return mapaData.mapa.filter(item => item.diaProduzir === diaSelecionado);
  }, [mapaData?.mapa, diaSelecionado]);

  const inputProcessamento = useMemo(() => {
    return itensDoDia.map(item => ({
      codigoProduto: item.codigo,
      nomeProduto: item.nome,
      unidade: item.unidade as 'kg' | 'un',
      qtdPlanejada: item.qtdPlanejada,
      diaProduzir: item.diaProduzir,
    }));
  }, [itensDoDia]);

  const { data: processamentoData, isLoading: loadingProcessamento } = trpc.pcp.processarMapa.useQuery(
    inputProcessamento,
    { enabled: inputProcessamento.length > 0 }
  );

  const diasDisponiveis = useMemo(() => {
    if (!mapaData?.mapa) return [];
    const dias = new Set(mapaData.mapa.map(item => item.diaProduzir));
    return Array.from(dias).sort();
  }, [mapaData?.mapa]);

  const insumosAgregados = useMemo(() => {
    if (!processamentoData?.resultados) return [];

    const agregado = new Map<number, {
      componenteId: number;
      nomeComponente: string;
      quantidadeTotal: number;
      unidade: string;
      editavel: boolean;
      origens: string[];
    }>();

    for (const item of processamentoData.resultados) {
      if (item.erro) continue;

      for (const insumo of item.insumos) {
        const existing = agregado.get(insumo.componenteId);
        if (existing) {
          existing.quantidadeTotal += insumo.quantidadeAjustada;
          if (!existing.origens.includes(item.nomeProduto)) {
            existing.origens.push(item.nomeProduto);
          }
        } else {
          agregado.set(insumo.componenteId, {
            componenteId: insumo.componenteId,
            nomeComponente: insumo.nomeComponente,
            quantidadeTotal: insumo.quantidadeAjustada,
            unidade: insumo.unidade as 'kg' | 'un',
            editavel: insumo.editavel,
            origens: [item.nomeProduto],
          });
        }
      }
    }

    return Array.from(agregado.values())
      .map(item => ({
        ...item,
        quantidadeTotal: item.unidade === 'kg' 
          ? arredondarPesagem(item.quantidadeTotal) 
          : Math.floor(item.quantidadeTotal),
      }))
      .sort((a, b) => a.nomeComponente.localeCompare(b.nomeComponente));
  }, [processamentoData?.resultados]);

  const toggleCheck = (key: string) => {
    setChecksPesagem(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const atualizarFermento = (key: string, valor: number) => {
    setFermentoEditado(prev => ({ ...prev, [key]: valor }));
  };

  if (loadingMapa) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-amber-200 rounded w-1/3"></div>
            <div className="h-64 bg-amber-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!mapaData?.success || mapaData.mapa.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 p-6">
        <div className="max-w-7xl mx-auto">
          <Button variant="ghost" onClick={() => navigate("/")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <Card className="border-orange-200">
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Nenhum Mapa Salvo</h2>
              <p className="text-gray-600 mb-4">
                É necessário salvar o Mapa de Produção antes de processar o PCP.
              </p>
              <Button onClick={() => navigate("/mapa-producao")} className="bg-orange-600 hover:bg-orange-700">
                Ir para Mapa de Produção
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <div className="bg-white border-b border-orange-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate("/")} size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-orange-600" />
                    Processamento PCP
                  </h1>
                  {obterNomeMapaAtual() !== "Sem mapa" && (
                    <Badge className="bg-blue-500 text-white text-sm py-1 px-3">
                      📌 {obterNomeMapaAtual()}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  Mapa salvo com {mapaData.mapa.length} produto(s)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <Card className="mb-6 border-orange-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Selecione o Dia de Produção</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {diasDisponiveis.map(dia => (
                <Button
                  key={dia}
                  variant={diaSelecionado === dia ? "default" : "outline"}
                  onClick={() => setDiaSelecionado(dia)}
                  className={diaSelecionado === dia ? "bg-orange-600 hover:bg-orange-700" : ""}
                >
                  {DIAS_SEMANA[dia]}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {loadingProcessamento ? (
          <Card className="border-orange-200">
            <CardContent className="p-8 text-center">
              <div className="animate-pulse">Processando dados...</div>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="producao" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="producao">Ficha de Produção</TabsTrigger>
              <TabsTrigger value="pesagem">Pré-Pesagem</TabsTrigger>
              <TabsTrigger value="detalhes">Embalagem</TabsTrigger>
              <TabsTrigger value="expedicao">Expedição</TabsTrigger>
            </TabsList>

            {/* Ficha de Produção - ESTRUTURA SIMPLES */}
            <TabsContent value="producao">
              <div className="space-y-4">
                {/* Botão Exportar PDF */}
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const produtos = processamentoData?.resultados
                        ?.filter(r => !r.erro && r.passo3)
                        .map(r => ({
                          codigoProduto: r.codigoProduto,
                          nomeProduto: r.nomeProduto,
                          qtdPlanejada: r.qtdPlanejada,
                          unidade: r.unidade,
                          pesoUnitario: r.pesoUnitario,
                          passo3: r.passo3,
                          modoPreparo: r.modoPreparo
                        })) || [];
                      const intermediarios = processamentoData?.intermediarios?.map(i => ({
                        nomeProduto: i.nomeProduto,
                        quantidadeArredondada: i.quantidadeArredondada,
                        unidade: i.unidade,
                        produtosFilhos: i.produtosFilhos,
                        ingredientes: i.ingredientes || [],
                        modoPreparo: i.modoPreparo || []
                      })) || [];
                      exportarFichaProducaoPDF(diaSelecionado, produtos, intermediarios);
                    }}
                    className="border-green-300 text-green-700 hover:bg-green-100"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Exportar Ficha de Produção PDF
                  </Button>
                </div>

                {/* Produtos agrupados por massa base - ESTRUTURA SIMPLES */}
                {(() => {
                  const resultadosSemErro = processamentoData?.resultados?.filter(r => !r.erro) || [];
                  const intermediarios = processamentoData?.intermediarios || [];
                  
                  const produtosPorIntermediario: { inter: typeof intermediarios[0]; produtos: typeof resultadosSemErro }[] = [];
                  const produtosUsados = new Set<string>();
                  
                  for (const inter of intermediarios) {
                    const produtosDoInter = resultadosSemErro.filter(r => 
                      inter.produtosFilhos.some(filho => {
                        const nomeNormalizado = r.nomeProduto.toLowerCase().trim();
                        const filhoNormalizado = filho.toLowerCase().trim();
                        return nomeNormalizado === filhoNormalizado;
                      })
                    );
                    if (produtosDoInter.length > 0) {
                      produtosPorIntermediario.push({ inter, produtos: produtosDoInter });
                      produtosDoInter.forEach(p => produtosUsados.add(p.codigoProduto));
                    }
                  }
                  
                  const produtosSemIntermediario = resultadosSemErro.filter(r => !produtosUsados.has(r.codigoProduto));
                  
                  return (
                    <>
                      {/* Produtos por massa base */}
                      {produtosPorIntermediario.map(({ inter, produtos }, groupIdx) => (
                        <div key={`group-${groupIdx}`} className="mb-6">
                          {/* Cabeçalho da Massa Base */}
                          <div className="bg-purple-100 border border-purple-300 rounded-lg px-4 py-3 mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Badge className="bg-purple-600">{inter.nomeProduto}</Badge>
                              <span className="font-mono font-bold text-purple-700">
                                {formatarNumero(inter.quantidadeArredondada, inter.unidade)} {inter.unidade}
                              </span>
                            </div>
                          </div>

                          {/* Tabela de Produtos */}
                          <Card className="border-orange-200">
                            <CardContent className="p-0">
                              <table className="w-full">
                                <thead className="bg-orange-50">
                                  <tr>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Código</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Produto</th>
                                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Unid.</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Qtd Planejada</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Blocos</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Peso Bloco</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Pedaços</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Peso Pedaço</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {produtos.map((item, idx) => (
                                    <tr key={idx} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                      <td className="px-4 py-3 font-mono text-sm">{item.codigoProduto}</td>
                                      <td className="px-4 py-3">{item.nomeProduto}</td>
                                      <td className="px-4 py-3 text-center">
                                        <Badge variant="secondary">{item.unidade}</Badge>
                                      </td>
                                      <td className="px-4 py-3 text-right font-mono">
                                        {formatarNumero(item.qtdPlanejada, item.unidade)}
                                      </td>
                                      <td className="px-4 py-3 text-right font-mono">
                                        {item.passo3?.blocos || '-'}
                                      </td>
                                      <td className="px-4 py-3 text-right font-mono">
                                        {item.passo3?.pesoBloco.toFixed(3) || '-'} kg
                                      </td>
                                      <td className="px-4 py-3 text-right font-mono">
                                        {item.passo3?.pedacos || '-'}
                                      </td>
                                      <td className="px-4 py-3 text-right font-mono">
                                        {item.passo3?.pesoPedaco.toFixed(3) || '-'} kg
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </CardContent>
                          </Card>
                        </div>
                      ))}

                      {/* Produtos sem intermediário */}
                      {produtosSemIntermediario.length > 0 && (
                        <div className="mb-6">
                          <div className="bg-gray-100 border border-gray-300 rounded-lg px-4 py-3 mb-3 flex items-center justify-between">
                            <Badge className="bg-gray-600">Produtos sem Massa Base</Badge>
                            <span className="text-sm font-semibold text-gray-700">{produtosSemIntermediario.length} produto(s)</span>
                          </div>

                          <Card className="border-orange-200">
                            <CardContent className="p-0">
                              <table className="w-full">
                                <thead className="bg-orange-50">
                                  <tr>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Código</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Produto</th>
                                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Unid.</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Qtd Planejada</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Blocos</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Peso Bloco</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Pedaços</th>
                                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Peso Pedaço</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {produtosSemIntermediario.map((item, idx) => (
                                    <tr key={idx} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                      <td className="px-4 py-3 font-mono text-sm">{item.codigoProduto}</td>
                                      <td className="px-4 py-3">{item.nomeProduto}</td>
                                      <td className="px-4 py-3 text-center">
                                        <Badge variant="secondary">{item.unidade}</Badge>
                                      </td>
                                      <td className="px-4 py-3 text-right font-mono">
                                        {formatarNumero(item.qtdPlanejada, item.unidade)}
                                      </td>
                                      <td className="px-4 py-3 text-right font-mono">
                                        {item.passo3?.blocos || '-'}
                                      </td>
                                      <td className="px-4 py-3 text-right font-mono">
                                        {item.passo3?.pesoBloco.toFixed(3) || '-'} kg
                                      </td>
                                      <td className="px-4 py-3 text-right font-mono">
                                        {item.passo3?.pedacos || '-'}
                                      </td>
                                      <td className="px-4 py-3 text-right font-mono">
                                        {item.passo3?.pesoPedaco.toFixed(3) || '-'} kg
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </CardContent>
                          </Card>
                        </div>
                      )}

                      {/* Produtos com erro */}
                      {processamentoData?.resultados?.filter(r => r.erro).map((item, idx) => (
                        <Card key={`erro-${idx}`} className="border-red-200 bg-red-50">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 text-red-700">
                              <AlertCircle className="w-5 h-5" />
                              <span className="font-medium">{item.codigoProduto} - {item.nomeProduto}</span>
                              <span className="text-sm">({item.erro})</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </>
                  );
                })()}
              </div>
            </TabsContent>

            {/* Pré-Pesagem */}
            <TabsContent value="pesagem">
              <div className="space-y-4">
                <Card className="border-orange-200">
                  <CardHeader className="bg-amber-50 border-b border-orange-200">
                    <CardTitle>Insumos Agregados - Pré-Pesagem</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full">
                      <thead className="bg-amber-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Ingrediente</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Qtd Total</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Unid.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {insumosAgregados.map((item, idx) => (
                          <tr key={idx} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                            <td className="px-4 py-3">{item.nomeComponente}</td>
                            <td className="px-4 py-3 text-right font-mono">
                              {item.unidade === 'kg' ? item.quantidadeTotal.toFixed(3) : Math.floor(item.quantidadeTotal)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Badge variant="secondary">{item.unidade}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Embalagem */}
            <TabsContent value="detalhes">
              <div className="flex justify-end mb-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    const produtos = processamentoData?.resultados?.map(r => ({
                      codigoProduto: r.codigoProduto,
                      nomeProduto: r.nomeProduto,
                      unidade: r.unidade,
                      qtdPlanejada: r.qtdPlanejada,
                      tipoEmbalagem: r.tipoEmbalagem || '',
                      quantidadePorEmbalagem: r.quantidadePorEmbalagem || 0,
                      status: r.erro ? 'erro' as const : 'ok' as const,
                      erro: r.erro
                    })) || [];
                    exportarDetalhesProdutoPDF(diaSelecionado, produtos);
                  }}
                  className="border-orange-300 text-orange-700 hover:bg-orange-100"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar Embalagem PDF
                </Button>
              </div>
              <Card className="border-orange-200">
                <CardHeader className="bg-orange-50 border-b border-orange-200">
                  <CardTitle>Embalagem - {DIAS_SEMANA[diaSelecionado]}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead className="bg-amber-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Código</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Produto</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Unid.</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Qtd Plan.</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tipo Embalagem</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Qtde/Emb.</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processamentoData?.resultados?.map((item, idx) => (
                        <tr key={idx} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="px-4 py-3 font-mono text-sm">{item.codigoProduto}</td>
                          <td className="px-4 py-3">{item.nomeProduto}</td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="secondary">{item.unidade}</Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-mono">
                            {formatarNumero(item.qtdPlanejada, item.unidade)}
                          </td>
                          <td className="px-4 py-3">
                            {item.tipoEmbalagem || '-'}
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-blue-700">
                            {item.quantidadePorEmbalagem > 0 ? item.quantidadePorEmbalagem : '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {item.erro ? (
                              <Badge variant="destructive" className="text-xs">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                {item.erro}
                              </Badge>
                            ) : (
                              <Badge className="bg-green-600 text-xs">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                OK
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Expedição */}
            <TabsContent value="expedicao">
              <Card className="border-orange-200">
                <CardContent className="p-8 text-center">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Expedição</h3>
                  <p className="text-gray-500">Funcionalidade em desenvolvimento</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
