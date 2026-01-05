import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Upload, CheckCircle, AlertCircle, Copy, Download, ChevronRight } from "lucide-react";
import { toast } from "sonner";

type Etapa = "inicial" | "arquivo1" | "arquivo2" | "completo";

export default function ImportaV2() {
  const [etapa, setEtapa] = useState<Etapa>("inicial");
  const [dataReferencia, setDataReferencia] = useState("");
  const [arquivo1, setArquivo1] = useState<File | null>(null);
  const [arquivo2, setArquivo2] = useState<File | null>(null);
  const [importacaoId, setImportacaoId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dadosArquivo1, setDadosArquivo1] = useState<any>(null);
  const [dadosArquivo2, setDadosArquivo2] = useState<any>(null);

  const importarArquivo1Mutation = trpc.importacoesV2.importarArquivo1.useMutation();
  const importarArquivo2Mutation = trpc.importacoesV2.importarArquivo2.useMutation();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, numero: 1 | 2) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith(".csv")) {
        toast.error("Por favor, selecione um arquivo CSV");
        return;
      }
      if (numero === 1) {
        setArquivo1(file);
      } else {
        setArquivo2(file);
      }
    }
  };

  const handleImportarArquivo1 = async () => {
    if (!dataReferencia) {
      toast.error("Por favor, informe a data de referência");
      return;
    }

    if (!arquivo1) {
      toast.error("Por favor, selecione o arquivo 1 (dias 2,3,4)");
      return;
    }

    setIsLoading(true);

    try {
      const conteudo = await arquivo1.text();

      const result = await importarArquivo1Mutation.mutateAsync({
        dataReferencia,
        csvContent: conteudo,
      });

      setImportacaoId(result.importacaoId);
      setDadosArquivo1(result.dados);
      setEtapa("arquivo1");
      toast.success("Arquivo 1 importado com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao importar arquivo 1");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportarArquivo2 = async () => {
    if (!arquivo2) {
      toast.error("Por favor, selecione o arquivo 2 (dias 5,6,7)");
      return;
    }

    if (!importacaoId) {
      toast.error("ID de importação não encontrado");
      return;
    }

    setIsLoading(true);

    try {
      const conteudo = await arquivo2.text();

      const result = await importarArquivo2Mutation.mutateAsync({
        importacaoId,
        csvContent: conteudo,
      });

      setDadosArquivo2(result.dados);
      setEtapa("completo");
      toast.success("Arquivo 2 importado com sucesso! Importação concluída!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao importar arquivo 2");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNovaImportacao = () => {
    setEtapa("inicial");
    setDataReferencia("");
    setArquivo1(null);
    setArquivo2(null);
    setImportacaoId(null);
    setDadosArquivo1(null);
    setDadosArquivo2(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-amber-900 mb-2">Importação V2</h1>
          <p className="text-amber-700">Importe dados de vendas em duas etapas</p>
        </div>

        {/* Indicador de Progresso */}
        <div className="mb-8 flex items-center gap-4">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${etapa === "inicial" || etapa === "arquivo1" || etapa === "arquivo2" || etapa === "completo" ? "bg-amber-100 text-amber-900" : "bg-gray-100 text-gray-600"}`}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-amber-600 text-white font-bold">1</div>
            <span className="font-semibold">Arquivo 1 (2,3,4)</span>
          </div>
          <ChevronRight className="text-amber-400" />
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${etapa === "arquivo2" || etapa === "completo" ? "bg-amber-100 text-amber-900" : "bg-gray-100 text-gray-600"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${etapa === "arquivo2" || etapa === "completo" ? "bg-amber-600 text-white" : "bg-gray-300 text-gray-600"}`}>2</div>
            <span className="font-semibold">Arquivo 2 (5,6,7)</span>
          </div>
        </div>

        {/* ETAPA 1: Data e Arquivo 1 */}
        {(etapa === "inicial" || etapa === "arquivo1") && (
          <Card className="border-amber-200 shadow-lg mb-8">
            <CardHeader className="bg-gradient-to-r from-amber-100 to-orange-100 border-b border-amber-200">
              <CardTitle className="text-amber-900">Etapa 1: Arquivo 1 (Dias 2, 3, 4)</CardTitle>
              <CardDescription className="text-amber-700">
                Selecione a data de referência e o primeiro arquivo CSV
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              {/* Data de Referência */}
              <div className="space-y-2">
                <Label htmlFor="dataRef" className="text-amber-900 font-semibold">
                  Data de Referência
                </Label>
                <Input
                  id="dataRef"
                  type="text"
                  placeholder="Ex: 2025-01-06"
                  value={dataReferencia}
                  onChange={(e) => setDataReferencia(e.target.value)}
                  className="border-amber-200 focus:border-amber-400 focus:ring-amber-400"
                  disabled={etapa === "arquivo1"}
                />
                <p className="text-sm text-amber-600">
                  Informação sobre o período dos dados importados
                </p>
              </div>

              {/* Arquivo 1 */}
              <div className="space-y-2">
                <Label className="text-amber-900 font-semibold">
                  Arquivo 1: Dias 2, 3, 4
                </Label>
                <div className="border-2 border-dashed border-amber-300 rounded-lg p-6 text-center hover:border-amber-400 transition-colors">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => handleFileChange(e, 1)}
                    className="hidden"
                    id="file1"
                    disabled={etapa === "arquivo1"}
                  />
                  <label htmlFor="file1" className="cursor-pointer">
                    <Upload className="mx-auto h-8 w-8 text-amber-600 mb-2" />
                    <p className="text-amber-900 font-medium">
                      {arquivo1 ? arquivo1.name : "Clique para selecionar"}
                    </p>
                    <p className="text-sm text-amber-600">ou arraste o arquivo aqui</p>
                  </label>
                </div>
              </div>

              {/* Botão Importar Arquivo 1 */}
              <Button
                onClick={handleImportarArquivo1}
                disabled={isLoading || !dataReferencia || !arquivo1 || etapa === "arquivo1"}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Importar Arquivo 1
                  </>
                )}
              </Button>

              {/* Erros */}
              {importarArquivo1Mutation.error && (
                <Alert className="border-red-300 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    {importarArquivo1Mutation.error.message}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* DADOS ARQUIVO 1 */}
        {(etapa === "arquivo1" || etapa === "completo") && dadosArquivo1 && (
          <Card className="mt-8 border-amber-200 shadow-lg mb-8">
            <CardHeader className="bg-gradient-to-r from-green-100 to-emerald-100 border-b border-green-200">
              <CardTitle className="text-green-900 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Dados Importados - Arquivo 1
              </CardTitle>
              <CardDescription className="text-green-700">
                {dadosArquivo1.totalProdutos} produtos importados
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(dadosArquivo1, null, 2));
                      toast.success("JSON copiado!");
                    }}
                    className="border-amber-300 text-amber-700 hover:bg-amber-50"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar JSON
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const blob = new Blob([JSON.stringify(dadosArquivo1, null, 2)], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `importacao-arquivo1.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="border-amber-300 text-amber-700 hover:bg-amber-50"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Baixar JSON
                  </Button>
                </div>
                <pre className="bg-amber-50 p-4 rounded-lg text-xs overflow-x-auto border border-amber-200 max-h-96 overflow-y-auto">
                  {JSON.stringify(dadosArquivo1, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ETAPA 2: Arquivo 2 */}
        {etapa === "arquivo1" && (
          <Card className="border-amber-200 shadow-lg mb-8">
            <CardHeader className="bg-gradient-to-r from-amber-100 to-orange-100 border-b border-amber-200">
              <CardTitle className="text-amber-900">Etapa 2: Arquivo 2 (Dias 5, 6, 7)</CardTitle>
              <CardDescription className="text-amber-700">
                Selecione o segundo arquivo CSV para completar a importação
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              {/* Arquivo 2 */}
              <div className="space-y-2">
                <Label className="text-amber-900 font-semibold">
                  Arquivo 2: Dias 5, 6, 7
                </Label>
                <div className="border-2 border-dashed border-amber-300 rounded-lg p-6 text-center hover:border-amber-400 transition-colors">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => handleFileChange(e, 2)}
                    className="hidden"
                    id="file2"
                  />
                  <label htmlFor="file2" className="cursor-pointer">
                    <Upload className="mx-auto h-8 w-8 text-amber-600 mb-2" />
                    <p className="text-amber-900 font-medium">
                      {arquivo2 ? arquivo2.name : "Clique para selecionar"}
                    </p>
                    <p className="text-sm text-amber-600">ou arraste o arquivo aqui</p>
                  </label>
                </div>
              </div>

              {/* Botão Importar Arquivo 2 */}
              <Button
                onClick={handleImportarArquivo2}
                disabled={isLoading || !arquivo2}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Importar Arquivo 2 e Concluir
                  </>
                )}
              </Button>

              {/* Erros */}
              {importarArquivo2Mutation.error && (
                <Alert className="border-red-300 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    {importarArquivo2Mutation.error.message}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* DADOS ARQUIVO 2 - CONSOLIDADO */}
        {etapa === "completo" && dadosArquivo2 && (
          <Card className="mt-8 border-green-200 shadow-lg mb-8">
            <CardHeader className="bg-gradient-to-r from-green-100 to-emerald-100 border-b border-green-200">
              <CardTitle className="text-green-900 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Importação Concluída!
              </CardTitle>
              <CardDescription className="text-green-700">
                Todos os dados foram importados com sucesso
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <Alert className="border-green-300 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Importação ID: {importacaoId} | Total de produtos: {dadosArquivo2.totalProdutos}
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(dadosArquivo2, null, 2));
                      toast.success("JSON copiado!");
                    }}
                    className="border-green-300 text-green-700 hover:bg-green-50"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar JSON
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const blob = new Blob([JSON.stringify(dadosArquivo2, null, 2)], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `importacao-${importacaoId}-consolidado.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="border-green-300 text-green-700 hover:bg-green-50"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Baixar JSON
                  </Button>
                </div>

                <pre className="bg-green-50 p-4 rounded-lg text-xs overflow-x-auto border border-green-200 max-h-96 overflow-y-auto">
                  {JSON.stringify(dadosArquivo2, null, 2)}
                </pre>

                <Button
                  onClick={handleNovaImportacao}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3"
                >
                  Realizar Nova Importação
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instruções */}
        {etapa === "inicial" && (
          <Card className="mt-8 border-amber-200">
            <CardHeader>
              <CardTitle className="text-amber-900">Instruções</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-amber-800">
              <div>
                <p className="font-semibold">Formato do CSV:</p>
                <p className="text-sm">id, Produto, unidade de medida, dia2, dia3, dia4 (ou dia5, dia6, dia7)</p>
              </div>
              <div>
                <p className="font-semibold">Exemplo Arquivo 1:</p>
                <pre className="bg-amber-50 p-3 rounded text-xs overflow-x-auto">
{`id,Produto,unidade de medida,segunda-feira,terça-feira,quarta-feira
301,PÃO DOCE,un,10.20,8.16,4.08
302,FATIA HUNGARA,un,30.00,24.00,12.00`}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
