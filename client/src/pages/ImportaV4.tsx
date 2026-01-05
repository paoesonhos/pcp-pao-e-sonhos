import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Upload, Download, Copy } from "lucide-react";

export default function ImportaV4() {
  const [dataReferencia, setDataReferencia] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [dados, setDados] = useState<any>(null);
  const [carregando, setCarregando] = useState(false);

  const importarMutation = trpc.importacoesV4.importar.useMutation();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setArquivo(e.target.files[0]);
    }
  };

  const handleImportar = async () => {
    if (!dataReferencia) {
      toast.error("Por favor, selecione uma data de referência");
      return;
    }

    if (!arquivo) {
      toast.error("Por favor, selecione um arquivo CSV");
      return;
    }

    setCarregando(true);
    try {
      const conteudo = await arquivo.text();
      const resultado = await importarMutation.mutateAsync({
        dataReferencia,
        csvContent: conteudo,
      });

      setDados(resultado);
      toast.success(`${resultado.totalProdutos} produtos importados com sucesso`);

      if (resultado.erros.length > 0) {
        toast.warning(`${resultado.erros.length} linhas com problemas`);
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao importar arquivo");
    } finally {
      setCarregando(false);
    }
  };

  const copiarJSON = () => {
    if (dados) {
      navigator.clipboard.writeText(JSON.stringify(dados, null, 2));
      toast.success("JSON copiado para a área de transferência");
    }
  };

  const baixarJSON = () => {
    if (dados) {
      const elemento = document.createElement("a");
      const arquivo = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" });
      elemento.href = URL.createObjectURL(arquivo);
      elemento.download = `importacao-${dataReferencia}.json`;
      document.body.appendChild(elemento);
      elemento.click();
      document.body.removeChild(elemento);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="container max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold mb-2">Importação V4</h1>
          <p className="text-muted-foreground">Upload de dados de vendas em CSV</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Configuração</CardTitle>
            <CardDescription>Selecione a data e o arquivo para importar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Data de Referência */}
            <div className="space-y-2">
              <Label htmlFor="data">Data de Referência</Label>
              <Input
                id="data"
                type="date"
                value={dataReferencia}
                onChange={(e) => setDataReferencia(e.target.value)}
                placeholder="Selecione uma data"
              />
              <p className="text-sm text-muted-foreground">Formato: YYYY-MM-DD</p>
            </div>

            {/* Upload de Arquivo */}
            <div className="space-y-2">
              <Label htmlFor="arquivo">Arquivo CSV</Label>
              <div className="flex gap-2">
                <Input
                  id="arquivo"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  disabled={carregando}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {arquivo ? `Selecionado: ${arquivo.name}` : "Nenhum arquivo selecionado"}
              </p>
            </div>

            {/* Botão de Importação */}
            <Button
              onClick={handleImportar}
              disabled={carregando || !dataReferencia || !arquivo}
              className="w-full"
              size="lg"
            >
              <Upload className="w-4 h-4 mr-2" />
              {carregando ? "Importando..." : "Importar Arquivo"}
            </Button>
          </CardContent>
        </Card>

        {/* Resultado */}
        {dados && (
          <>
            {/* Tabela de Dados */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Dados Importados</CardTitle>
                <CardDescription>{dados.totalProdutos} produtos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr>
                        <th className="text-left py-2 px-2">Código</th>
                        <th className="text-left py-2 px-2">Produto</th>
                        <th className="text-left py-2 px-2">Unidade</th>
                        <th className="text-right py-2 px-2">Dia 2</th>
                        <th className="text-right py-2 px-2">Dia 3</th>
                        <th className="text-right py-2 px-2">Dia 4</th>
                        <th className="text-right py-2 px-2">Dia 5</th>
                        <th className="text-right py-2 px-2">Dia 6</th>
                        <th className="text-right py-2 px-2">Dia 7</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dados.mapa.map((item: any, idx: number) => (
                        <tr key={idx} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-2 font-mono text-xs">{item.codigoProduto}</td>
                          <td className="py-2 px-2">{item.nomeProduto}</td>
                          <td className="py-2 px-2">{item.unidadeMedida}</td>
                          <td className="text-right py-2 px-2">{item.dia2}</td>
                          <td className="text-right py-2 px-2">{item.dia3}</td>
                          <td className="text-right py-2 px-2">{item.dia4}</td>
                          <td className="text-right py-2 px-2">{item.dia5}</td>
                          <td className="text-right py-2 px-2">{item.dia6}</td>
                          <td className="text-right py-2 px-2">{item.dia7}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* JSON */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Visualização JSON</CardTitle>
                    <CardDescription>Dados em formato JSON</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copiarJSON}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={baixarJSON}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Baixar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs max-h-96">
                  {JSON.stringify(dados, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
