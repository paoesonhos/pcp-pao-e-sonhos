import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Calendar, FileText, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

export default function ImportacaoVendas() {
  const [, setLocation] = useLocation();
  const [arquivoSegQua, setArquivoSegQua] = useState<File | null>(null);
  const [arquivoQuiSab, setArquivoQuiSab] = useState<File | null>(null);
  const [dataHistorico, setDataHistorico] = useState("");
  const [dataPlanejamento, setDataPlanejamento] = useState("");
  const [erros, setErros] = useState<string[]>([]);

  const utils = trpc.useUtils();

  const importarMutation = trpc.importacoes.importar.useMutation({
    onSuccess: (data) => {
      toast.success(`Importação concluída! ${data.totalVendas} vendas e ${data.totalMapaProducao} itens no mapa.`);
      utils.importacoes.list.invalidate();
      
      // Redirecionar para o mapa de produção
      setLocation(`/mapa-producao/${data.importacaoId}`);
    },
    onError: (error) => {
      const mensagem = error.message || "Erro ao importar arquivos";
      const linhas = mensagem.split("\n");
      setErros(linhas);
      toast.error("Erro na importação. Verifique os detalhes abaixo.");
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, tipo: "segqua" | "quisab") => {
    const file = e.target.files?.[0];
    if (file) {
      if (tipo === "segqua") {
        setArquivoSegQua(file);
      } else {
        setArquivoQuiSab(file);
      }
    }
  };

  const validarData = (data: string): boolean => {
    if (!data) return false;
    const d = new Date(data);
    return d.getDay() === 1; // Segunda-feira
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErros([]);

    // Validações
    if (!arquivoSegQua || !arquivoQuiSab) {
      toast.error("Por favor, selecione os dois arquivos CSV");
      return;
    }

    if (!dataHistorico || !dataPlanejamento) {
      toast.error("Por favor, informe as duas datas de referência");
      return;
    }

    if (!validarData(dataHistorico)) {
      toast.error("Data de referência do histórico deve ser uma segunda-feira");
      return;
    }

    if (!validarData(dataPlanejamento)) {
      toast.error("Data de referência do planejamento deve ser uma segunda-feira");
      return;
    }

    // Ler arquivos
    try {
      const conteudoSegQua = await arquivoSegQua.text();
      const conteudoQuiSab = await arquivoQuiSab.text();

      importarMutation.mutate({
        dataReferenciaHistorico: dataHistorico,
        dataReferenciaPlanejamento: dataPlanejamento,
        arquivoSegQua: conteudoSegQua,
        arquivoQuiSab: conteudoQuiSab,
      });
    } catch (error) {
      toast.error("Erro ao ler arquivos CSV");
    }
  };

  const getDiaSemana = (data: string) => {
    if (!data) return "";
    const d = new Date(data);
    const dias = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
    return dias[d.getDay()];
  };

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-2">Importação de Vendas</h1>
        <p className="text-muted-foreground">
          Importe dados históricos de vendas e gere o mapa de produção planejado
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Formulário de Importação */}
        <Card>
          <CardHeader>
            <CardTitle>Upload de Arquivos CSV</CardTitle>
            <CardDescription>
              Importação bipartida: envie os dois arquivos (Seg-Qua e Qui-Sab)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Arquivo Seg-Qua */}
              <div className="space-y-2">
                <Label htmlFor="arquivoSegQua" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Arquivo Seg-Qua *
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="arquivoSegQua"
                    type="file"
                    accept=".csv"
                    onChange={(e) => handleFileChange(e, "segqua")}
                    required
                  />
                  {arquivoSegQua && (
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Colunas: id, Produto, unidade de medida, segunda-feira, terça-feira, quarta-feira
                </p>
              </div>

              {/* Arquivo Qui-Sab */}
              <div className="space-y-2">
                <Label htmlFor="arquivoQuiSab" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Arquivo Qui-Sab *
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="arquivoQuiSab"
                    type="file"
                    accept=".csv"
                    onChange={(e) => handleFileChange(e, "quisab")}
                    required
                  />
                  {arquivoQuiSab && (
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Colunas: id, Produto, unidade de medida, quinta-feira, sexta-feira, sábado
                </p>
              </div>

              <div className="border-t pt-6 space-y-4">
                {/* Data Histórico */}
                <div className="space-y-2">
                  <Label htmlFor="dataHistorico" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Data de Referência do Histórico *
                  </Label>
                  <Input
                    id="dataHistorico"
                    type="date"
                    value={dataHistorico}
                    onChange={(e) => setDataHistorico(e.target.value)}
                    required
                  />
                  {dataHistorico && (
                    <p className="text-xs text-muted-foreground">
                      {getDiaSemana(dataHistorico)}
                      {getDiaSemana(dataHistorico) !== "Segunda-feira" && (
                        <span className="text-destructive ml-2">⚠ Deve ser uma segunda-feira</span>
                      )}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Segunda-feira da semana à qual os dados históricos se referem
                  </p>
                </div>

                {/* Data Planejamento */}
                <div className="space-y-2">
                  <Label htmlFor="dataPlanejamento" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Data de Referência do Planejamento *
                  </Label>
                  <Input
                    id="dataPlanejamento"
                    type="date"
                    value={dataPlanejamento}
                    onChange={(e) => setDataPlanejamento(e.target.value)}
                    required
                  />
                  {dataPlanejamento && (
                    <p className="text-xs text-muted-foreground">
                      {getDiaSemana(dataPlanejamento)}
                      {getDiaSemana(dataPlanejamento) !== "Segunda-feira" && (
                        <span className="text-destructive ml-2">⚠ Deve ser uma segunda-feira</span>
                      )}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Segunda-feira da semana que será planejada/produzida
                  </p>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={importarMutation.isPending}
              >
                {importarMutation.isPending ? (
                  <>
                    <Upload className="mr-2 h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Importar e Gerar Mapa de Produção
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Instruções e Erros */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Instruções</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold">
                    1
                  </span>
                  Prepare os Arquivos CSV
                </h4>
                <p className="text-sm text-muted-foreground ml-8">
                  Separe os dados em dois arquivos: um com segunda, terça e quarta-feira, e outro com quinta, sexta e sábado.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold">
                    2
                  </span>
                  Defina as Datas de Referência
                </h4>
                <p className="text-sm text-muted-foreground ml-8">
                  Informe a segunda-feira da semana histórica (dados do CSV) e a segunda-feira da semana planejada (produção futura).
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold">
                    3
                  </span>
                  Revise o Mapa de Produção
                </h4>
                <p className="text-sm text-muted-foreground ml-8">
                  Após a importação, você será redirecionado para o grid de planejamento onde poderá ajustar as quantidades.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Erros de Validação */}
          {erros.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-2">Erros encontrados:</div>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {erros.slice(0, 10).map((erro, index) => (
                    <li key={index}>{erro}</li>
                  ))}
                  {erros.length > 10 && (
                    <li className="text-muted-foreground">
                      ... e mais {erros.length - 10} erros
                    </li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {/* Link para Importações Anteriores */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Importações Anteriores</span>
              <Link href="/importacoes">
                <Button variant="outline" size="sm">
                  Ver Todas
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
