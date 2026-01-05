import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { ArrowLeft, Search, FileText, ChevronRight, AlertCircle, CheckCircle2 } from "lucide-react";

export default function FichasTecnicas() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");

  // Buscar todos os produtos ativos
  const { data: produtos, isLoading } = trpc.produtos.list.useQuery({ ativo: true });

  // Filtrar produtos pela busca
  const produtosFiltrados = produtos?.filter(p => 
    p.codigoProduto.toLowerCase().includes(search.toLowerCase()) ||
    p.nome.toLowerCase().includes(search.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-amber-200 rounded w-1/3"></div>
            <div className="h-64 bg-amber-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      {/* Header */}
      <div className="bg-white border-b border-orange-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/")} size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-600" />
                Fichas Técnicas
              </h1>
              <p className="text-sm text-gray-500">
                Selecione um produto para gerenciar sua ficha técnica
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {/* Busca */}
        <Card className="mb-6 border-orange-200">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por código ou nome do produto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Lista de Produtos */}
        <Card className="border-orange-200">
          <CardHeader className="bg-orange-50 border-b border-orange-200">
            <CardTitle className="text-lg">Produtos Cadastrados</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {produtosFiltrados.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhum produto encontrado</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {produtosFiltrados.map((produto) => (
                  <div
                    key={produto.id}
                    className="p-4 hover:bg-amber-50 cursor-pointer transition-colors flex items-center justify-between"
                    onClick={() => navigate(`/fichas-tecnicas/${produto.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">
                          {produto.codigoProduto} - {produto.nome}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {produto.unidade}
                          </Badge>
                          {parseFloat(produto.pesoUnitario) > 0 && (
                            <span className="text-xs text-gray-500">
                              {parseFloat(produto.pesoUnitario).toFixed(3)} kg/un
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
