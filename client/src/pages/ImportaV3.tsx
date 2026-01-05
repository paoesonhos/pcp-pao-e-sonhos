import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export default function ImportaV3() {
  const [dataReferencia, setDataReferencia] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importarMutation = trpc.importacoesV3.importar.useMutation();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArquivo(file);
    }
  };

  const handleImportar = async () => {
    if (!dataReferencia.trim()) {
      toast.error("Informe a data de referência");
      return;
    }

    if (!arquivo) {
      toast.error("Selecione um arquivo CSV");
      return;
    }

    setLoading(true);
    try {
      const csvContent = await arquivo.text();
      const res = await importarMutation.mutateAsync({
        dataReferencia,
        csvContent,
      });

      if (res.success) {
        setResultado(res);
        toast.success(`Importação realizada: ${res.totalInserido} produtos`);
        setArquivo(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao importar arquivo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-orange-900 mb-2">Importação V3</h1>
          <p className="text-orange-700">Upload de dados de vendas em CSV</p>
        </div>

        {/* Card Principal */}
        <Card className="p-8 mb-8 border-2 border-orange-200">
          <div className="space-y-6">
            {/* Data de Referência */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Data de Referência
              </label>
              <input
                type="text"
                placeholder="Ex: 2025-01-06"
                value={dataReferencia}
                onChange={(e) => setDataReferencia(e.target.value)}
                className="w-full px-4 py-2 border-2 border-orange-300 rounded-lg focus:outline-none focus:border-orange-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Formato: YYYY-MM-DD (não será validada)
              </p>
            </div>

            {/* Upload de Arquivo */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Arquivo CSV
              </label>
              <div className="border-2 border-dashed border-orange-300 rounded-lg p-6 text-center cursor-pointer hover:bg-orange-50 transition">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <div className="text-orange-600 font-semibold">
                    {arquivo ? arquivo.name : "Clique para selecionar arquivo"}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Formato: id, Produto, unidade, Unidade, 2, 3, 4, 5, 6, 7
                  </p>
                </button>
              </div>
            </div>

            {/* Botão Importar */}
            <Button
              onClick={handleImportar}
              disabled={loading || !dataReferencia || !arquivo}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 font-semibold"
            >
              {loading ? "Importando..." : "Importar Arquivo"}
            </Button>
          </div>
        </Card>

        {/* Resultado */}
        {resultado && (
          <div className="space-y-6">
            {/* Resumo */}
            <Card className="p-6 bg-green-50 border-2 border-green-300">
              <h2 className="text-xl font-bold text-green-900 mb-4">
                ✓ Importação Realizada
              </h2>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-green-700">Produtos</p>
                  <p className="text-2xl font-bold text-green-900">
                    {resultado.totalInserido}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-green-700">ID Importação</p>
                  <p className="text-2xl font-bold text-green-900">
                    {resultado.importacaoId}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-green-700">Data Ref.</p>
                  <p className="text-lg font-bold text-green-900">
                    {dataReferencia}
                  </p>
                </div>
              </div>
            </Card>

            {/* Grid de Dados */}
            <Card className="p-6 border-2 border-orange-200">
              <h2 className="text-xl font-bold text-orange-900 mb-4">
                Mapa de Produção
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-orange-300">
                      <th className="text-left py-2 px-2 font-semibold text-orange-900">
                        Produto
                      </th>
                      <th className="text-center py-2 px-2 font-semibold text-orange-900">
                        Un.
                      </th>
                      <th className="text-right py-2 px-2 font-semibold text-orange-900">
                        Dia 2
                      </th>
                      <th className="text-right py-2 px-2 font-semibold text-orange-900">
                        Dia 3
                      </th>
                      <th className="text-right py-2 px-2 font-semibold text-orange-900">
                        Dia 4
                      </th>
                      <th className="text-right py-2 px-2 font-semibold text-orange-900">
                        Dia 5
                      </th>
                      <th className="text-right py-2 px-2 font-semibold text-orange-900">
                        Dia 6
                      </th>
                      <th className="text-right py-2 px-2 font-semibold text-orange-900">
                        Dia 7
                      </th>
                      <th className="text-right py-2 px-2 font-semibold text-orange-900">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.mapa.map((item: any, idx: number) => (
                      <tr
                        key={idx}
                        className={
                          idx % 2 === 0 ? "bg-white" : "bg-orange-50"
                        }
                      >
                        <td className="py-2 px-2 text-gray-800">
                          {item.nomeProduto}
                        </td>
                        <td className="py-2 px-2 text-center text-gray-600">
                          {item.unidade}
                        </td>
                        <td className="py-2 px-2 text-right text-gray-700">
                          {item.dia2.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-right text-gray-700">
                          {item.dia3.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-right text-gray-700">
                          {item.dia4.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-right text-gray-700">
                          {item.dia5.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-right text-gray-700">
                          {item.dia6.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-right text-gray-700">
                          {item.dia7.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-right font-semibold text-orange-900">
                          {item.total.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* JSON */}
            <Card className="p-6 border-2 border-orange-200">
              <h2 className="text-xl font-bold text-orange-900 mb-4">
                Visualização JSON
              </h2>
              <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-xs overflow-x-auto max-h-96 overflow-y-auto">
                <pre>{JSON.stringify(resultado, null, 2)}</pre>
              </div>
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(resultado, null, 2));
                  toast.success("JSON copiado!");
                }}
                className="mt-4 w-full bg-gray-700 hover:bg-gray-800"
              >
                Copiar JSON
              </Button>
            </Card>

            {/* Botão Nova Importação */}
            <Button
              onClick={() => {
                setResultado(null);
                setDataReferencia("");
                setArquivo(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 font-semibold"
            >
              Nova Importação
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
