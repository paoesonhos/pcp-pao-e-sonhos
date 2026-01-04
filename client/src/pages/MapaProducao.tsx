import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Calendar } from "lucide-react";
import { toast } from "sonner";

interface MapaItem {
  id: number;
  importacaoId: number;
  produtoId: number;
  diaSemana: number;
  dataPlanejada: Date;
  quantidadePlanejada: string;
  unidade: "kg" | "un";
  codigoProduto: string;
  nomeProduto: string;
  categoriaId: number | null;
}

interface ProdutoRow {
  produtoId: number;
  codigoProduto: string;
  nomeProduto: string;
  unidade: "kg" | "un";
  dias: {
    [diaSemana: number]: {
      id: number;
      quantidade: string;
    };
  };
}

export default function MapaProducao() {
  const params = useParams();
  const importacaoId = parseInt(params.id || "0");

  const [editedValues, setEditedValues] = useState<Record<number, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const { data: mapa, isLoading, refetch } = trpc.mapaProducao.getByImportacao.useQuery(importacaoId, {
    enabled: importacaoId > 0,
  });

  const { data: importacao } = trpc.importacoes.getById.useQuery(importacaoId, {
    enabled: importacaoId > 0,
  });

  const utils = trpc.useUtils();

  const updateMutation = trpc.mapaProducao.updateQuantidade.useMutation({
    onSuccess: () => {
      toast.success("Quantidade atualizada com sucesso");
      utils.mapaProducao.getByImportacao.invalidate(importacaoId);
      setHasChanges(false);
      setEditedValues({});
    },
    onError: () => {
      toast.error("Erro ao atualizar quantidade");
    },
  });

  // Agrupar dados por produto
  const produtosAgrupados: ProdutoRow[] = [];
  if (mapa) {
    const produtosMap = new Map<number, ProdutoRow>();

    for (const item of mapa) {
      if (!produtosMap.has(item.produtoId)) {
        produtosMap.set(item.produtoId, {
          produtoId: item.produtoId,
          codigoProduto: item.codigoProduto,
          nomeProduto: item.nomeProduto,
          unidade: item.unidade,
          dias: {},
        });
      }

      const produto = produtosMap.get(item.produtoId)!;
      produto.dias[item.diaSemana] = {
        id: item.id,
        quantidade: item.quantidadePlanejada,
      };
    }

    produtosAgrupados.push(...Array.from(produtosMap.values()));
  }

  const handleQuantidadeChange = (id: number, value: string) => {
    setEditedValues((prev) => ({ ...prev, [id]: value }));
    setHasChanges(true);
  };

  const handleSave = (id: number) => {
    const novaQuantidade = editedValues[id];
    if (novaQuantidade !== undefined) {
      updateMutation.mutate({
        id,
        quantidadePlanejada: novaQuantidade,
      });
    }
  };

  const handleSaveAll = () => {
    Object.entries(editedValues).forEach(([id, quantidade]) => {
      updateMutation.mutate({
        id: parseInt(id),
        quantidadePlanejada: quantidade,
      });
    });
  };

  const getDiaNome = (dia: number): string => {
    const nomes = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    return nomes[dia] || "";
  };

  const formatData = (data: Date | undefined): string => {
    if (!data) return "";
    const d = new Date(data);
    return d.toLocaleDateString("pt-BR");
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="text-center text-muted-foreground">Carregando mapa de produção...</div>
      </div>
    );
  }

  if (!mapa || mapa.length === 0) {
    return (
      <div className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle>Mapa de Produção não encontrado</CardTitle>
            <CardDescription>
              Não há dados de planejamento para esta importação.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/importacao-vendas">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para Importação
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <Link href="/importacao-vendas">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            </Link>
            <h1 className="text-3xl font-semibold">Mapa de Produção</h1>
          </div>
          {importacao && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Histórico: {formatData(importacao.dataReferenciaHistorico)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Planejamento: {formatData(importacao.dataReferenciaPlanejamento)}</span>
              </div>
            </div>
          )}
        </div>
        {hasChanges && (
          <Button onClick={handleSaveAll} disabled={updateMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            Salvar Todas as Alterações
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Grid de Planejamento</CardTitle>
          <CardDescription>
            Visualize e edite as quantidades planejadas por produto e dia da semana
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px] sticky left-0 bg-card z-10">
                    Produto
                  </TableHead>
                  <TableHead className="w-[80px] text-center">Unidade</TableHead>
                  {[1, 2, 3, 4, 5, 6, 0].map((dia) => (
                    <TableHead key={dia} className="w-[120px] text-center">
                      {getDiaNome(dia)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtosAgrupados.map((produto) => (
                  <TableRow key={produto.produtoId}>
                    <TableCell className="font-medium sticky left-0 bg-card z-10">
                      <div>
                        <div className="font-semibold">{produto.codigoProduto}</div>
                        <div className="text-sm text-muted-foreground">
                          {produto.nomeProduto}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{produto.unidade}</Badge>
                    </TableCell>
                    {[1, 2, 3, 4, 5, 6, 0].map((dia) => {
                      const diaData = produto.dias[dia];
                      if (!diaData) {
                        return (
                          <TableCell key={dia} className="text-center text-muted-foreground">
                            -
                          </TableCell>
                        );
                      }

                      const currentValue =
                        editedValues[diaData.id] !== undefined
                          ? editedValues[diaData.id]
                          : diaData.quantidade;

                      return (
                        <TableCell key={dia} className="p-2">
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              step="0.001"
                              value={currentValue}
                              onChange={(e) =>
                                handleQuantidadeChange(diaData.id, e.target.value)
                              }
                              onBlur={() => {
                                if (editedValues[diaData.id] !== undefined) {
                                  handleSave(diaData.id);
                                }
                              }}
                              className="h-8 text-center"
                            />
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {produtosAgrupados.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum produto encontrado no mapa de produção
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
