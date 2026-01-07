import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import { 
  ArrowLeft, 
  Calculator, 
  ClipboardList, 
  Factory, 
  AlertCircle,
  CheckCircle2,
  Scale,
  Boxes
} from "lucide-react";

// Tipos
interface InsumoConsolidado {
  componenteId: number;
  nomeComponente: string;
  quantidadeTotal: number;
  quantidadeArredondada: number;
  unidade: 'kg' | 'un';
  editavel: boolean;
  origens: string[]; // lista de produtos de onde veio o insumo
}

interface ResultadoDivisora {
  quantidadeUnidades: number;
  blocosInteiros: number;
  pesoBloco: number;
  unidadesRestantes: number;
  pesoPedaco: number;
  massaTotal: number;
}

interface ItemProcessado {
  codigoProduto: string;
  nomeProduto: string;
  unidade: string;
  qtdPlanejada: number;
  diaProduzir: number;
  pesoUnitario: number;
  divisora: ResultadoDivisora | null;
  insumos: InsumoConsolidado[];
  erro?: string;
}

// Função de arredondamento para pesagem (múltiplos de 0.005)
function arredondarPesagem(valor: number): number {
  return Math.floor(valor * 200) / 200;
}

// Formatar número para exibição
function formatarNumero(valor: number, unidade: string): string {
  if (unidade === 'un') {
    return Math.floor(valor).toString();
  }
  return valor.toFixed(3);
}

// Dias da semana
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
  const [diaSelecionado, setDiaSelecionado] = useState<number>(2);
  const [fermentoEditado, setFermentoEditado] = useState<Record<string, number>>({});
  const [checksPesagem, setChecksPesagem] = useState<Record<string, boolean>>({});

  // Buscar mapa de produção
  const { data: mapaData, isLoading: loadingMapa } = trpc.mapaProducao.gerarMapa.useQuery();

  // Filtrar itens do dia selecionado
  const itensDoDia = useMemo(() => {
    if (!mapaData?.mapa) return [];
    return mapaData.mapa.filter(item => item.diaProduzir === diaSelecionado);
  }, [mapaData?.mapa, diaSelecionado]);

  // Preparar input para processamento
  const inputProcessamento = useMemo(() => {
    return itensDoDia.map(item => ({
      codigoProduto: item.codigo,
      nomeProduto: item.nome,
      unidade: item.unidade as 'kg' | 'un',
      qtdPlanejada: item.qtdPlanejada,
      diaProduzir: item.diaProduzir,
    }));
  }, [itensDoDia]);

  // Processar itens
  const { data: processamentoData, isLoading: loadingProcessamento } = trpc.pcp.processarMapa.useQuery(
    inputProcessamento,
    { enabled: inputProcessamento.length > 0 }
  );

  // Dias disponíveis
  const diasDisponiveis = useMemo(() => {
    if (!mapaData?.mapa) return [];
    const dias = new Set(mapaData.mapa.map(item => item.diaProduzir));
    return Array.from(dias).sort();
  }, [mapaData?.mapa]);

  // Agregar insumos de todos os produtos do dia (com suporte a cascata)
  const insumosAgregados = useMemo(() => {
    if (!processamentoData?.resultados) return [];

    const agregado = new Map<number, {
      componenteId: number;
      nomeComponente: string;
      quantidadeTotal: number;
      unidade: string;
      editavel: boolean;
      origens: string[]; // origens da cascata (massas base, produtos)
    }>();

    for (const item of processamentoData.resultados) {
      if (item.erro) continue;

      for (const insumo of item.insumos) {
        const existing = agregado.get(insumo.componenteId);
        if (existing) {
          existing.quantidadeTotal += insumo.quantidadeArredondada;
          // Merge origens sem duplicatas
          for (const origem of insumo.origens || [item.nomeProduto]) {
            if (!existing.origens.includes(origem)) {
              existing.origens.push(origem);
            }
          }
        } else {
          agregado.set(insumo.componenteId, {
            componenteId: insumo.componenteId,
            nomeComponente: insumo.nomeComponente,
            quantidadeTotal: insumo.quantidadeArredondada,
            unidade: insumo.unidade,
            editavel: insumo.editavel,
            origens: insumo.origens || [item.nomeProduto],
          });
        }
      }
    }

    // Arredondar totais e ordenar
    return Array.from(agregado.values())
      .map(item => ({
        ...item,
        quantidadeTotal: item.unidade === 'kg' 
          ? arredondarPesagem(item.quantidadeTotal) 
          : Math.floor(item.quantidadeTotal),
      }))
      .sort((a, b) => a.nomeComponente.localeCompare(b.nomeComponente));
  }, [processamentoData?.resultados]);

  // Toggle check de pesagem
  const toggleCheck = (key: string) => {
    setChecksPesagem(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Atualizar fermento editado
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

  if (!mapaData?.success || !mapaData.importacao) {
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
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Nenhuma Importação Encontrada</h2>
              <p className="text-gray-600 mb-4">
                É necessário importar dados de vendas antes de processar o PCP.
              </p>
              <Button onClick={() => navigate("/importa-v5")} className="bg-orange-600 hover:bg-orange-700">
                Ir para Importação
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      {/* Header */}
      <div className="bg-white border-b border-orange-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate("/")} size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-orange-600" />
                  Processamento PCP
                </h1>
                <p className="text-sm text-gray-500">
                  Importação #{mapaData.importacao.id} - {mapaData.importacao.dataReferencia}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Seletor de Dia */}
        <Card className="mb-6 border-orange-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Selecione o Dia de Produção</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {diasDisponiveis.map(dia => (
                <Button
                  key={dia}
                  variant={diaSelecionado === dia ? "default" : "outline"}
                  onClick={() => setDiaSelecionado(dia)}
                  className={diaSelecionado === dia ? "bg-orange-600 hover:bg-orange-700" : ""}
                >
                  Dia {dia} - {DIAS_SEMANA[dia]}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {loadingProcessamento ? (
          <div className="animate-pulse space-y-4">
            <div className="h-64 bg-amber-100 rounded"></div>
          </div>
        ) : (
          <Tabs defaultValue="pre-pesagem" className="space-y-4">
            <TabsList className="bg-amber-100">
              <TabsTrigger value="pre-pesagem" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white">
                <Scale className="w-4 h-4 mr-2" />
                Ficha de Pré-Pesagem
              </TabsTrigger>
              <TabsTrigger value="producao" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white">
                <Factory className="w-4 h-4 mr-2" />
                Ficha de Produção
              </TabsTrigger>
              <TabsTrigger value="detalhes" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white">
                <ClipboardList className="w-4 h-4 mr-2" />
                Detalhes por Produto
              </TabsTrigger>
            </TabsList>

            {/* Ficha de Pré-Pesagem */}
            <TabsContent value="pre-pesagem">
              <Card className="border-orange-200">
                <CardHeader className="bg-orange-50 border-b border-orange-200">
                  <CardTitle className="flex items-center gap-2">
                    <Scale className="w-5 h-5 text-orange-600" />
                    Ficha de Pré-Pesagem - {DIAS_SEMANA[diaSelecionado]}
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    Checklist de ingredientes abertos por produto. Apenas Fermento é editável.
                  </p>
                </CardHeader>
                <CardContent className="p-4 space-y-6">
                  {!processamentoData?.resultados || processamentoData.resultados.filter(r => !r.erro && r.insumos.length > 0).length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      Nenhum insumo para processar neste dia
                    </div>
                  ) : (
                    processamentoData.resultados
                      .filter(r => !r.erro && r.insumos.length > 0)
                      .map((item, prodIdx) => (
                        <div key={prodIdx} className="border border-orange-200 rounded-lg overflow-hidden">
                          {/* Cabeçalho do Produto */}
                          <div className="bg-amber-100 px-4 py-3 border-b border-orange-200">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                              <Boxes className="w-4 h-4 text-orange-600" />
                              {item.codigoProduto} – {item.nomeProduto}
                            </h3>
                            <p className="text-sm text-gray-600">
                              Qtd Planejada: {formatarNumero(item.qtdPlanejada, item.unidade)} {item.unidade}
                            </p>
                          </div>
                          {/* Tabela de Ingredientes */}
                          <table className="w-full">
                            <thead className="bg-amber-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 w-12">✓</th>
                                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Ingrediente</th>
                                <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700">Qtd Calculada</th>
                                <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">Unid.</th>
                              </tr>
                            </thead>
                            <tbody>
                              {item.insumos.map((insumo, idx) => {
                                const checkKey = `${diaSelecionado}-${item.codigoProduto}-${insumo.componenteId}`;
                                const fermentoKey = `${diaSelecionado}-${item.codigoProduto}-${insumo.componenteId}`;
                                const isChecked = checksPesagem[checkKey] || false;
                                const valorFermento = fermentoEditado[fermentoKey] ?? insumo.quantidadeArredondada;

                                return (
                                  <tr 
                                    key={insumo.componenteId} 
                                    className={`border-b border-gray-100 ${isChecked ? 'bg-green-50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                                  >
                                    <td className="px-4 py-2">
                                      <Checkbox 
                                        checked={isChecked}
                                        onCheckedChange={() => toggleCheck(checkKey)}
                                      />
                                    </td>
                                    <td className="px-4 py-2">
                                      <span className={`font-medium ${isChecked ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                        {insumo.nomeComponente}
                                      </span>
                                      {insumo.editavel && (
                                        <Badge variant="outline" className="ml-2 text-xs bg-yellow-50 text-yellow-700 border-yellow-300">
                                          Editável
                                        </Badge>
                                      )}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                      {insumo.editavel ? (
                                        <Input
                                          type="number"
                                          step="0.005"
                                          value={valorFermento}
                                          onChange={(e) => atualizarFermento(fermentoKey, parseFloat(e.target.value) || 0)}
                                          className="w-24 text-right ml-auto h-8"
                                        />
                                      ) : (
                                        <span className={`font-mono ${isChecked ? 'text-gray-400' : 'text-gray-800'}`}>
                                          {formatarNumero(insumo.quantidadeArredondada, insumo.unidade)}
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      <Badge variant="secondary" className="bg-gray-100">
                                        {insumo.unidade}
                                      </Badge>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Ficha de Produção */}
            <TabsContent value="producao">
              <div className="space-y-4">
                {processamentoData?.resultados?.filter(r => !r.erro).map((item, idx) => (
                  <Card key={idx} className="border-orange-200">
                    <CardHeader className="bg-orange-50 border-b border-orange-200 py-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Boxes className="w-4 h-4 text-orange-600" />
                          {item.codigoProduto} - {item.nomeProduto}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{item.unidade}</Badge>
                          <Badge className="bg-orange-600">
                            {formatarNumero(item.qtdPlanejada, item.unidade)} {item.unidade}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      {/* Divisora - apenas para produtos em kg */}
                      {item.divisora && (
                        <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                            <Factory className="w-4 h-4" />
                            Processamento da Divisora
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white p-3 rounded border border-blue-100">
                              <p className="text-xs text-gray-500 uppercase">Unidades Totais</p>
                              <p className="text-xl font-bold text-blue-700">{item.divisora.quantidadeUnidades}</p>
                            </div>
                            <div className="bg-white p-3 rounded border border-blue-100">
                              <p className="text-xs text-gray-500 uppercase">Blocos (30 un)</p>
                              <p className="text-xl font-bold text-green-700">{item.divisora.blocosInteiros}</p>
                              <p className="text-xs text-gray-500">{item.divisora.pesoBloco.toFixed(3)} kg cada</p>
                            </div>
                            <div className="bg-white p-3 rounded border border-blue-100">
                              <p className="text-xs text-gray-500 uppercase">Pedaço (Manual)</p>
                              <p className="text-xl font-bold text-amber-700">{item.divisora.unidadesRestantes} un</p>
                              <p className="text-xs text-gray-500">{item.divisora.pesoPedaco.toFixed(3)} kg</p>
                            </div>
                            <div className="bg-white p-3 rounded border border-blue-100">
                              <p className="text-xs text-gray-500 uppercase">Massa Total</p>
                              <p className="text-xl font-bold text-gray-800">{item.divisora.massaTotal.toFixed(3)} kg</p>
                            </div>
                          </div>

                          {/* Instruções visuais */}
                          <div className="mt-4 grid grid-cols-2 gap-4">
                            <div className="bg-green-100 p-3 rounded border border-green-300">
                              <h5 className="font-semibold text-green-800 text-sm mb-1">
                                🔄 DIVISORA ({item.divisora.blocosInteiros} blocos)
                              </h5>
                              <p className="text-sm text-green-700">
                                Passar {item.divisora.blocosInteiros}x na divisora com {item.divisora.pesoBloco.toFixed(3)} kg cada
                              </p>
                            </div>
                            {item.divisora.unidadesRestantes > 0 && (
                              <div className="bg-amber-100 p-3 rounded border border-amber-300">
                                <h5 className="font-semibold text-amber-800 text-sm mb-1">
                                  ✋ MANUAL ({item.divisora.unidadesRestantes} un)
                                </h5>
                                <p className="text-sm text-amber-700">
                                  Modelar {item.divisora.unidadesRestantes} unidades manualmente ({item.divisora.pesoPedaco.toFixed(3)} kg)
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Lista de Insumos do Produto */}
                      <div>
                        <h4 className="font-semibold text-gray-700 mb-2">Insumos</h4>
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left">Ingrediente</th>
                              <th className="px-3 py-2 text-right">Quantidade</th>
                              <th className="px-3 py-2 text-center">Unid.</th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.insumos.map((insumo, iIdx) => (
                              <tr key={iIdx} className={iIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="px-3 py-2">
                                  {insumo.nomeComponente}
                                  {insumo.editavel && (
                                    <Badge variant="outline" className="ml-2 text-xs bg-yellow-50 text-yellow-700">
                                      Editável
                                    </Badge>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right font-mono">
                                  {formatarNumero(insumo.quantidadeArredondada, insumo.unidade)}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <Badge variant="secondary" className="text-xs">{insumo.unidade}</Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                ))}

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
              </div>
            </TabsContent>

            {/* Detalhes por Produto */}
            <TabsContent value="detalhes">
              <Card className="border-orange-200">
                <CardHeader className="bg-orange-50 border-b border-orange-200">
                  <CardTitle>Detalhes por Produto - {DIAS_SEMANA[diaSelecionado]}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full">
                    <thead className="bg-amber-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Código</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Produto</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Unid.</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Qtd Plan.</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Blocos</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Pedaço</th>
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
                          <td className="px-4 py-3 text-center">
                            {item.divisora ? (
                              <span className="font-semibold text-green-700">{item.divisora.blocosInteiros}</span>
                            ) : '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {item.divisora ? (
                              <span className="text-amber-700">{item.divisora.unidadesRestantes} un</span>
                            ) : '-'}
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
          </Tabs>
        )}
      </div>
    </div>
  );
}
