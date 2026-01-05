import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Upload, CheckCircle, AlertCircle, Copy, Download } from "lucide-react";
import { toast } from "sonner";

export default function ImportaV2() {
  const [dataReferencia, setDataReferencia] = useState("");
  const [arquivoSegQua, setArquivoSegQua] = useState<File | null>(null);
  const [arquivoQuiSab, setArquivoQuiSab] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [importacaoId, setImportacaoId] = useState<number | null>(null);

  const importarMutation = trpc.importacoesV2.importar.useMutation();
  const { data: dadosJSON, isLoading: loadingJSON } = trpc.importacoesV2.exportarJSON.useQuery(
    { importacaoId: importacaoId! },
    { enabled: !!importacaoId }
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, tipo: "segQua" | "quiSab") => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith(".csv")) {
        toast.error("Por favor, selecione um arquivo CSV");
        return;
      }
      if (tipo === "segQua") {
        setArquivoSegQua(file);
      } else {
        setArquivoQuiSab(file);
      }
    }
  };

  const handleImport = async () => {
    if (!dataReferencia) {
      toast.error("Por favor, informe a data de referência");
      return;
    }

    if (!arquivoSegQua) {
      toast.error("Por favor, selecione o arquivo Seg-Qua");
      return;
    }

    if (!arquivoQuiSab) {
      toast.error("Por favor, selecione o arquivo Qui-Sab");
      return;
    }

    setIsLoading(true);

    try {
      const conteudoSegQua = await arquivoSegQua.text();
      const conteudoQuiSab = await arquivoQuiSab.text();

      const result = await importarMutation.mutateAsync({
        dataReferencia,
        arquivoSegQua: conteudoSegQua,
        arquivoQuiSab: conteudoQuiSab,
      });

      setImportacaoId(result.importacaoId);
      toast.success("Importação realizada com sucesso!");
      setDataReferencia("");
      setArquivoSegQua(null);
      setArquivoQuiSab(null);
    } catch (error: any) {
      toast.error(error.message || "Erro ao importar arquivos");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-amber-900 mb-2">Importação V2</h1>
          <p className="text-amber-700">Importe dados de vendas com dias numéricos (2-7)</p>
        </div>

        <Card className="border-amber-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-amber-100 to-orange-100 border-b border-amber-200">
            <CardTitle className="text-amber-900">Upload de Arquivos CSV</CardTitle>
            <CardDescription className="text-amber-700">
              Selecione dois arquivos CSV: um para Seg-Qua (dias 2,3,4) e outro para Qui-Sab (dias 5,6,7)
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
              />
              <p className="text-sm text-amber-600">
                Informação sobre o período dos dados importados
              </p>
            </div>

            {/* Arquivo Seg-Qua */}
            <div className="space-y-2">
              <Label className="text-amber-900 font-semibold">
                Arquivo Seg-Qua (Dias 2, 3, 4)
              </Label>
              <div className="border-2 border-dashed border-amber-300 rounded-lg p-6 text-center hover:border-amber-400 transition-colors">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => handleFileChange(e, "segQua")}
                  className="hidden"
                  id="fileSegQua"
                />
                <label htmlFor="fileSegQua" className="cursor-pointer">
                  <Upload className="mx-auto h-8 w-8 text-amber-600 mb-2" />
                  <p className="text-amber-900 font-medium">
                    {arquivoSegQua ? arquivoSegQua.name : "Clique para selecionar"}
                  </p>
                  <p className="text-sm text-amber-600">ou arraste o arquivo aqui</p>
                </label>
              </div>
            </div>

            {/* Arquivo Qui-Sab */}
            <div className="space-y-2">
              <Label className="text-amber-900 font-semibold">
                Arquivo Qui-Sab (Dias 5, 6, 7)
              </Label>
              <div className="border-2 border-dashed border-amber-300 rounded-lg p-6 text-center hover:border-amber-400 transition-colors">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => handleFileChange(e, "quiSab")}
                  className="hidden"
                  id="fileQuiSab"
                />
                <label htmlFor="fileQuiSab" className="cursor-pointer">
                  <Upload className="mx-auto h-8 w-8 text-amber-600 mb-2" />
                  <p className="text-amber-900 font-medium">
                    {arquivoQuiSab ? arquivoQuiSab.name : "Clique para selecionar"}
                  </p>
                  <p className="text-sm text-amber-600">ou arraste o arquivo aqui</p>
                </label>
              </div>
            </div>

            {/* Botão de Importação */}
            <Button
              onClick={handleImport}
              disabled={isLoading || !dataReferencia || !arquivoSegQua || !arquivoQuiSab}
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
                  Importar e Gerar Mapa
                </>
              )}
            </Button>

            {/* Sucesso */}
            {importacaoId && (
              <Alert className="border-green-300 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Importação concluída! ID da importação: {importacaoId}
                </AlertDescription>
              </Alert>
            )}

            {/* Erros */}
            {importarMutation.error && (
              <Alert className="border-red-300 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {importarMutation.error.message}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Instruções */}
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
              <p className="font-semibold">Exemplo:</p>
              <pre className="bg-amber-50 p-3 rounded text-xs overflow-x-auto">
{`id,Produto,unidade de medida,segunda-feira,terça-feira,quarta-feira
301,PÃO DOCE,un,10.20,8.16,4.08
302,FATIA HUNGARA,un,30.00,24.00,12.00`}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Visualização JSON */}
        {importacaoId && (
          <Card className="mt-8 border-amber-200">
            <CardHeader className="bg-gradient-to-r from-amber-100 to-orange-100 border-b border-amber-200">
              <CardTitle className="text-amber-900">Dados Importados (JSON)</CardTitle>
              <CardDescription className="text-amber-700">
                Visualize os dados importados em formato JSON
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {loadingJSON ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
                  <span className="ml-2 text-amber-700">Carregando dados...</span>
                </div>
              ) : dadosJSON ? (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(dadosJSON, null, 2));
                        toast.success("JSON copiado para a área de transferência!");
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
                        const blob = new Blob([JSON.stringify(dadosJSON, null, 2)], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `importacao-${importacaoId}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                        toast.success("JSON baixado com sucesso!");
                      }}
                      className="border-amber-300 text-amber-700 hover:bg-amber-50"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Baixar JSON
                    </Button>
                  </div>
                  <pre className="bg-amber-50 p-4 rounded-lg text-xs overflow-x-auto border border-amber-200 max-h-96 overflow-y-auto">
                    {JSON.stringify(dadosJSON, null, 2)}
                  </pre>
                </div>
              ) : (
                <p className="text-amber-600">Nenhum dado disponível</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
