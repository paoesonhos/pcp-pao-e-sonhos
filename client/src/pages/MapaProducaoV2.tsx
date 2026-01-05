import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

interface MapaItem {
  produtoId: number;
  codigoProduto: string;
  nomeProduto: string;
  unidade: string;
  dia2: string;
  dia3: string;
  dia4: string;
  dia5: string;
  dia6: string;
  dia7: string;
}

const DIAS = [
  { numero: 2, nome: "Segunda" },
  { numero: 3, nome: "Terça" },
  { numero: 4, nome: "Quarta" },
  { numero: 5, nome: "Quinta" },
  { numero: 6, nome: "Sexta" },
  { numero: 7, nome: "Sábado" },
];

export default function MapaProducaoV2() {
  const [, params] = useRoute("/mapa-producao-v2/:importacaoId");
  const importacaoId = params?.importacaoId ? parseInt(params.importacaoId) : null;

  const [mapa, setMapa] = useState<MapaItem[]>([]);
  const [editando, setEditando] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const mapaQuery = trpc.importacoesV2.obterMapa.useQuery(
    { importacaoId: importacaoId || 0 },
    { enabled: !!importacaoId }
  );

  const atualizarMutation = trpc.importacoesV2.atualizarQuantidade.useMutation();

  useEffect(() => {
    if (mapaQuery.data) {
      setMapa(mapaQuery.data);
    }
  }, [mapaQuery.data]);

  const handleCellChange = (produtoId: number, dia: number, valor: string) => {
    const key = `${produtoId}-${dia}`;
    setEditando({ ...editando, [key]: valor });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      for (const [key, valor] of Object.entries(editando)) {
        const [produtoId, dia] = key.split("-").map(Number);
        await atualizarMutation.mutateAsync({
          importacaoId: importacaoId || 0,
          produtoId,
          diaSemana: dia,
          quantidade: valor,
        });
      }
      setEditando({});
      toast.success("Alterações salvas com sucesso!");
      mapaQuery.refetch();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar alterações");
    } finally {
      setIsSaving(false);
    }
  };

  if (!importacaoId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="border-red-300 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-800">ID de importação inválido</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (mapaQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link href="/importa-v2" className="inline-flex items-center text-amber-600 hover:text-amber-700 mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
            <h1 className="text-4xl font-bold text-amber-900">Mapa de Produção</h1>
            <p className="text-amber-700">Importação #{importacaoId}</p>
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving || Object.keys(editando).length === 0}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>

        <Card className="border-amber-200 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-amber-100 to-orange-100 border-b border-amber-200">
            <CardTitle className="text-amber-900">Planejamento por Dia da Semana</CardTitle>
            <CardDescription className="text-amber-700">
              Edite as quantidades planejadas para cada produto e dia
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-amber-200 bg-amber-50">
                    <th className="text-left py-3 px-4 font-semibold text-amber-900 w-48">
                      Produto
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-amber-900 w-20">
                      Un.
                    </th>
                    {DIAS.map((dia) => (
                      <th
                        key={dia.numero}
                        className="text-center py-3 px-4 font-semibold text-amber-900 w-24"
                      >
                        <div className="text-xs">{dia.nome}</div>
                        <div className="text-lg">Dia {dia.numero}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mapa.map((item, index) => (
                    <tr
                      key={item.produtoId}
                      className={`border-b border-amber-100 ${
                        index % 2 === 0 ? "bg-white" : "bg-amber-50"
                      } hover:bg-amber-100 transition-colors`}
                    >
                      <td className="py-3 px-4 font-medium text-amber-900">
                        <div className="font-semibold">{item.codigoProduto}</div>
                        <div className="text-sm text-amber-700">{item.nomeProduto}</div>
                      </td>
                      <td className="py-3 px-4 text-amber-700 font-medium">
                        {item.unidade}
                      </td>
                      {DIAS.map((dia) => {
                        const key = `${item.produtoId}-${dia.numero}`;
                        const diaKey = `dia${dia.numero}` as keyof MapaItem;
                        const valor = editando[key] ?? item[diaKey];
                        return (
                          <td key={dia.numero} className="py-3 px-4">
                            <Input
                              type="number"
                              step="0.01"
                              value={valor}
                              onChange={(e) =>
                                handleCellChange(item.produtoId, dia.numero, e.target.value)
                              }
                              className="w-full text-center border-amber-300 focus:border-amber-400 focus:ring-amber-400"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {mapa.length === 0 && (
              <div className="text-center py-12">
                <p className="text-amber-700">Nenhum dado disponível para esta importação</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
