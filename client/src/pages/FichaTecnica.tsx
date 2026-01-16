import { useState } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, ArrowLeft, Package, Layers, Pencil, Search } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function FichaTecnica() {
  const [, params] = useRoute("/fichas-tecnicas/:id");
  const produtoId = params?.id ? parseInt(params.id) : null;

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedComponente, setSelectedComponente] = useState<string>("");
  const [quantidadeBase, setQuantidadeBase] = useState("");
  const [unidade, setUnidade] = useState<"kg" | "un">("kg");
  const [searchFilter, setSearchFilter] = useState("");

  const utils = trpc.useUtils();

  // Queries
  const { data: produto } = trpc.produtos.getById.useQuery(produtoId!, { enabled: !!produtoId });
  const { data: fichaTecnica, isLoading } = trpc.fichaTecnica.getByProduto.useQuery(produtoId!, { enabled: !!produtoId });
  const { data: insumos } = trpc.insumos.list.useQuery({ ativo: true });
  const { data: produtos } = trpc.produtos.list.useQuery({ ativo: true });

  // Mutations
  const createMutation = trpc.fichaTecnica.create.useMutation({
    onSuccess: () => {
      toast.success("Componente adicionado com sucesso");
      utils.fichaTecnica.getByProduto.invalidate();
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao adicionar componente");
    },
  });

  const deleteMutation = trpc.fichaTecnica.delete.useMutation({
    onSuccess: () => {
      toast.success("Componente removido com sucesso");
      utils.fichaTecnica.getByProduto.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao remover componente");
    },
  });

  const resetForm = () => {
    setSelectedComponente("");
    setQuantidadeBase("");
    setUnidade("kg");
    setSearchFilter("");
  };

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!produtoId || !selectedComponente) return;

    // Parse o componente selecionado (formato: "insumo-ID" ou "produto-ID")
    const [tipo, idStr] = selectedComponente.split("-");
    const componenteId = parseInt(idStr);
    
    // Determinar tipo do componente
    const tipoComponente = tipo === "insumo" ? "ingrediente" : "massa_base";

    createMutation.mutate({
      produtoId,
      componenteId,
      tipoComponente,
      quantidadeBase,
      unidade,
      ordem: 0,
      nivel: 1,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja remover este componente?")) {
      deleteMutation.mutate(id);
    }
  };

  const getComponenteNome = (item: any) => {
    if (item.tipoComponente === "ingrediente") {
      const insumo = insumos?.find((i) => i.id === item.componenteId);
      return insumo ? `${insumo.codigoInsumo} – ${insumo.nome}` : "Insumo não encontrado";
    } else {
      const prod = produtos?.find((p) => p.id === item.componenteId);
      return prod ? `${prod.codigoProduto} – ${prod.nome}` : "Produto não encontrado";
    }
  };

  const isInsumo = (item: any) => item.tipoComponente === "ingrediente";

  if (!produtoId) {
    return (
      <div className="container py-8">
        <div className="text-center text-muted-foreground">
          Produto não encontrado
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/fichas-tecnicas">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-semibold mb-2">Ficha Técnica</h1>
          {produto && (
            <div className="flex items-center gap-4">
              <p className="text-muted-foreground">
                <span className="font-mono">{produto.codigoProduto}</span> – {produto.nome}
              </p>
              <Badge variant="secondary" className="font-mono">
                Peso Unitário: {parseFloat(produto.pesoUnitario).toFixed(5)} kg
              </Badge>
            </div>
          )}
        </div>
        {produto && (
          <Link href={`/produtos?edit=${produto.id}`}>
            <Button variant="outline" size="sm">
              <Pencil className="mr-2 h-4 w-4" />
              Editar Produto
            </Button>
          </Link>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Composição do Produto</CardTitle>
              <CardDescription>
                Adicione insumos ou produtos (massa base) como componentes
              </CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
              setIsAddDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Componente
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleAdd}>
                  <DialogHeader>
                    <DialogTitle>Adicionar Componente</DialogTitle>
                    <DialogDescription>
                      Selecione um insumo ou produto para adicionar à ficha técnica
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="componente">Componente *</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Pesquisar componente..."
                          value={searchFilter}
                          onChange={(e) => setSearchFilter(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      {selectedComponente && (
                        <div className="text-sm text-green-600 font-medium bg-green-50 px-3 py-2 rounded border border-green-200">
                          Selecionado: {(() => {
                            const [tipo, id] = selectedComponente.split('-');
                            if (tipo === 'insumo') {
                              const insumo = insumos?.find(i => i.id === parseInt(id));
                              return insumo ? `${insumo.codigoInsumo} – ${insumo.nome}` : '';
                            } else {
                              const prod = produtos?.find(p => p.id === parseInt(id));
                              return prod ? `${prod.codigoProduto} – ${prod.nome}` : '';
                            }
                          })()}
                        </div>
                      )}
                      <div className="border rounded-md max-h-48 overflow-y-auto">
                        {/* Insumos */}
                        {insumos
                          ?.filter((insumo) => 
                            searchFilter === "" || 
                            insumo.nome.toLowerCase().includes(searchFilter.toLowerCase()) ||
                            insumo.codigoInsumo.toLowerCase().includes(searchFilter.toLowerCase())
                          )
                          .map((insumo) => (
                            <div
                              key={`insumo-${insumo.id}`}
                              onClick={() => setSelectedComponente(`insumo-${insumo.id}`)}
                              className={`px-3 py-2 cursor-pointer hover:bg-amber-50 border-b last:border-b-0 text-sm ${
                                selectedComponente === `insumo-${insumo.id}` ? 'bg-amber-100 font-medium' : ''
                              }`}
                            >
                              <span className="text-muted-foreground">[INS]</span> {insumo.codigoInsumo} – {insumo.nome}
                            </div>
                          ))}
                        {/* Produtos (Massa Base) */}
                        {produtos
                          ?.filter((p) => p.id !== produtoId)
                          .filter((prod) => 
                            searchFilter === "" || 
                            prod.nome.toLowerCase().includes(searchFilter.toLowerCase()) ||
                            prod.codigoProduto.toLowerCase().includes(searchFilter.toLowerCase())
                          )
                          .map((prod) => (
                            <div
                              key={`produto-${prod.id}`}
                              onClick={() => setSelectedComponente(`produto-${prod.id}`)}
                              className={`px-3 py-2 cursor-pointer hover:bg-orange-50 border-b last:border-b-0 text-sm ${
                                selectedComponente === `produto-${prod.id}` ? 'bg-orange-100 font-medium' : ''
                              }`}
                            >
                              <span className="text-orange-600">[MASSA]</span> {prod.codigoProduto} – {prod.nome}
                            </div>
                          ))}
                        {/* Mensagem quando não há resultados */}
                        {searchFilter && 
                          insumos?.filter((insumo) => 
                            insumo.nome.toLowerCase().includes(searchFilter.toLowerCase()) ||
                            insumo.codigoInsumo.toLowerCase().includes(searchFilter.toLowerCase())
                          ).length === 0 &&
                          produtos?.filter((p) => p.id !== produtoId).filter((prod) => 
                            prod.nome.toLowerCase().includes(searchFilter.toLowerCase()) ||
                            prod.codigoProduto.toLowerCase().includes(searchFilter.toLowerCase())
                          ).length === 0 && (
                            <div className="px-3 py-4 text-center text-muted-foreground text-sm">
                              Nenhum componente encontrado para "{searchFilter}"
                            </div>
                          )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="quantidadeBase">Quantidade Base *</Label>
                        <Input
                          id="quantidadeBase"
                          type="number"
                          step="0.00001"
                          placeholder="0.00000"
                          value={quantidadeBase}
                          onChange={(e) => setQuantidadeBase(e.target.value)}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="unidade">Unidade *</Label>
                        <Select 
                          value={unidade} 
                          onValueChange={(v) => setUnidade(v as "kg" | "un")}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="un">un</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsAddDialogOpen(false);
                        resetForm();
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createMutation.isPending || !selectedComponente || !quantidadeBase}
                    >
                      {createMutation.isPending ? "Adicionando..." : "Adicionar"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando ficha técnica...
            </div>
          ) : !fichaTecnica || fichaTecnica.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum componente cadastrado. Clique em "Adicionar Componente" para começar.
            </div>
          ) : (
            <div className="space-y-3">
              {fichaTecnica.map((item) => (
                <div 
                  key={item.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-muted">
                      {isInsumo(item) ? (
                        <Package className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Layers className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{getComponenteNome(item)}</span>
                        <Badge variant={isInsumo(item) ? "outline" : "default"} className="text-xs">
                          {isInsumo(item) ? "Insumo" : "Produto"}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground font-mono">
                        {parseFloat(item.quantidadeBase).toFixed(5)} {item.unidade}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(item.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          
          {/* Peso Total dos Componentes */}
          {fichaTecnica && fichaTecnica.length > 0 && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-center justify-between">
                <span className="font-medium">Peso Total dos Componentes:</span>
                <span className="text-xl font-mono font-bold text-primary">
                  {fichaTecnica
                    .filter((item) => item.unidade === "kg")
                    .reduce((sum, item) => sum + parseFloat(item.quantidadeBase), 0)
                    .toFixed(5)} kg
                </span>
              </div>
              {fichaTecnica.some((item) => item.unidade === "un") && (
                <div className="text-sm text-muted-foreground mt-1">
                  + {fichaTecnica
                    .filter((item) => item.unidade === "un")
                    .reduce((sum, item) => sum + parseFloat(item.quantidadeBase), 0)
                    .toFixed(0)} un (não somado ao peso)
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modo de Preparo */}
      {produto && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Modo de Preparo</CardTitle>
            <CardDescription>
              Adicione os passos de preparo com tempo estimado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ModoPreparoConfig produtoId={produtoId} />
          </CardContent>
        </Card>
      )}

      {/* Configuração de Blocos (Divisora) */}
      {produto && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Configuração de Blocos (Divisora)</CardTitle>
            <CardDescription>
              Configure blocos de 30 unidades para uso na divisora
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BlocoConfig 
              produtoId={produtoId} 
              produto={produto} 
              pesoTotalComponentes={
                fichaTecnica
                  ?.filter((item) => item.unidade === "kg")
                  .reduce((sum, item) => sum + parseFloat(item.quantidadeBase), 0) || 0
              }
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Componente para configuração de blocos (preservado)
function BlocoConfig({ produtoId, produto, pesoTotalComponentes }: { produtoId: number; produto: any; pesoTotalComponentes: number }) {
  const [isEditing, setIsEditing] = useState(false);
  const [unidadesInput, setUnidadesInput] = useState<number>(30);
  const utils = trpc.useUtils();

  const { data: bloco } = trpc.blocos.getByProduto.useQuery(produtoId);

  // Atualizar unidadesInput quando bloco carregar
  useState(() => {
    if (bloco) setUnidadesInput(bloco.unidadesPorBloco);
  });

  const createMutation = trpc.blocos.create.useMutation({
    onSuccess: () => {
      toast.success("Configuração de bloco criada com sucesso");
      utils.blocos.getByProduto.invalidate();
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar configuração de bloco");
    },
  });

  const updateMutation = trpc.blocos.update.useMutation({
    onSuccess: () => {
      toast.success("Configuração de bloco atualizada com sucesso");
      utils.blocos.getByProduto.invalidate();
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar configuração de bloco");
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const unidadesPorBloco = parseInt(formData.get("unidadesPorBloco") as string);
    // Usar peso total dos componentes como peso do bloco
    const pesoBloco = pesoTotalComponentes > 0 ? pesoTotalComponentes.toFixed(5) : formData.get("pesoBloco") as string;

    if (bloco) {
      // Atualizar bloco existente
      updateMutation.mutate({
        id: bloco.id,
        data: {
          unidadesPorBloco,
          pesoBloco,
        },
      });
    } else {
      // Criar novo bloco
      createMutation.mutate({
        produtoId,
        unidadesPorBloco,
        pesoBloco,
        ativo: true,
      });
    }
  };

  // Usar peso total dos componentes se disponível, senão calcular pelo peso unitário
  const pesoUnitario = parseFloat(produto.pesoUnitario);
  const unidadesAtual = bloco?.unidadesPorBloco || 30;
  
  // Peso do bloco vem da soma dos componentes (automático)
  const pesoBloco = pesoTotalComponentes > 0 ? pesoTotalComponentes : (unidadesAtual * pesoUnitario);
  const pesoEsperado = pesoBloco.toFixed(5);
  
  // Calcular peso dinâmico (para exibição durante edição)
  const pesoEsperadoDinamico = pesoTotalComponentes > 0 ? pesoTotalComponentes.toFixed(5) : (unidadesInput * pesoUnitario).toFixed(5);

  // Verificar se é bloco (30 unidades) ou pedaço (diferente de 30)
  const isPedaco = unidadesInput !== 30;

  if (bloco && !isEditing) {
    const blocoIsPedaco = bloco.unidadesPorBloco !== 30;
    // Usar peso dos componentes se disponível
    const pesoExibido = pesoTotalComponentes > 0 ? pesoTotalComponentes : parseFloat(bloco.pesoBloco);
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-muted-foreground">Unidades por {blocoIsPedaco ? "Pedaço" : "Bloco"}</Label>
            <div className="text-lg font-medium">{bloco.unidadesPorBloco}</div>
          </div>
          <div>
            <Label className="text-muted-foreground">Peso do {blocoIsPedaco ? "Pedaço" : "Bloco"}</Label>
            <div className="text-lg font-medium font-mono">{pesoExibido.toFixed(5)} kg</div>
            {pesoTotalComponentes > 0 && (
              <div className="text-xs text-muted-foreground">(soma dos componentes)</div>
            )}
          </div>
        </div>
        {blocoIsPedaco && (
          <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
            ⚠️ Quantidade diferente de 30: será processado como <strong>pedaço</strong> (produção manual)
          </div>
        )}
        {pesoTotalComponentes > 0 && (
          <div className="text-sm text-green-600 bg-green-50 p-2 rounded border border-green-200">
            ✅ Peso do bloco calculado automaticamente a partir da soma dos componentes
          </div>
        )}
        <Button variant="outline" onClick={() => {
          setUnidadesInput(bloco.unidadesPorBloco);
          setIsEditing(true);
        }}>
          Editar Configuração
        </Button>
      </div>
    );
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="unidadesPorBloco">Unidades por {isPedaco ? "Pedaço" : "Bloco"} *</Label>
          <Input
            id="unidadesPorBloco"
            name="unidadesPorBloco"
            type="number"
            min="1"
            value={unidadesInput}
            onChange={(e) => setUnidadesInput(parseInt(e.target.value) || 30)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="pesoBloco">Peso do {isPedaco ? "Pedaço" : "Bloco"} (kg)</Label>
          {pesoTotalComponentes > 0 ? (
            <div className="flex items-center gap-2">
              <Input
                id="pesoBloco"
                name="pesoBloco"
                type="number"
                step="0.00001"
                value={pesoTotalComponentes.toFixed(5)}
                readOnly
                className="bg-muted"
              />
              <span className="text-xs text-muted-foreground whitespace-nowrap">(automático)</span>
            </div>
          ) : (
            <Input
              id="pesoBloco"
              name="pesoBloco"
              type="number"
              step="0.00001"
              defaultValue={bloco?.pesoBloco || pesoEsperadoDinamico}
              required
            />
          )}
        </div>
      </div>
      {isPedaco && (
        <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
          ⚠️ Quantidade diferente de 30: será processado como <strong>pedaço</strong> (produção manual, sem divisora)
        </div>
      )}
      {pesoTotalComponentes > 0 && (
        <div className="text-sm text-green-600 bg-green-50 p-2 rounded border border-green-200">
          ✅ Peso calculado automaticamente: soma dos componentes da ficha técnica
        </div>
      )}
      {pesoTotalComponentes === 0 && (
        <div className="text-sm text-muted-foreground">
          Peso esperado: {pesoEsperadoDinamico} kg ({unidadesInput} × {pesoUnitario.toFixed(5)} kg)
        </div>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar Configuração"}
        </Button>
        {isEditing && (
          <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}

// Componente para configuração de Modo de Preparo
function ModoPreparoConfig({ produtoId }: { produtoId: number }) {
  const [novaDescricao, setNovaDescricao] = useState("");
  const [novoTempo, setNovoTempo] = useState<number>(0);
  const utils = trpc.useUtils();

  const { data: passos, isLoading } = trpc.modoPreparo.getByProduto.useQuery(produtoId);

  const createMutation = trpc.modoPreparo.create.useMutation({
    onSuccess: () => {
      toast.success("Passo adicionado com sucesso");
      utils.modoPreparo.getByProduto.invalidate();
      setNovaDescricao("");
      setNovoTempo(0);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao adicionar passo");
    },
  });

  const updateMutation = trpc.modoPreparo.update.useMutation({
    onSuccess: () => {
      toast.success("Passo atualizado com sucesso");
      utils.modoPreparo.getByProduto.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar passo");
    },
  });

  const deleteMutation = trpc.modoPreparo.delete.useMutation({
    onSuccess: () => {
      toast.success("Passo removido com sucesso");
      utils.modoPreparo.getByProduto.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao remover passo");
    },
  });

  const handleAdd = () => {
    if (!novaDescricao.trim()) {
      toast.error("Informe a descrição do passo");
      return;
    }
    const proximaOrdem = (passos?.length || 0) + 1;
    createMutation.mutate({
      produtoId,
      ordem: proximaOrdem,
      descricao: novaDescricao.trim(),
      tempoMinutos: novoTempo,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja remover este passo?")) {
      deleteMutation.mutate(id);
    }
  };

  const tempoTotal = passos?.reduce((sum, p) => sum + p.tempoMinutos, 0) || 0;

  if (isLoading) {
    return <div className="text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Lista de passos */}
      {passos && passos.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium w-12">#</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Descrição</th>
                <th className="px-4 py-2 text-right text-sm font-medium w-32">Tempo (min)</th>
                <th className="px-4 py-2 text-center text-sm font-medium w-16">Ações</th>
              </tr>
            </thead>
            <tbody>
              {passos.map((passo, idx) => (
                <tr key={passo.id} className="border-t">
                  <td className="px-4 py-2 text-muted-foreground">{idx + 1}</td>
                  <td className="px-4 py-2">{passo.descricao}</td>
                  <td className="px-4 py-2 text-right font-mono">{passo.tempoMinutos}</td>
                  <td className="px-4 py-2 text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(passo.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {/* Linha de total */}
              <tr className="border-t bg-muted/30 font-medium">
                <td className="px-4 py-2"></td>
                <td className="px-4 py-2 text-right">Tempo Total:</td>
                <td className="px-4 py-2 text-right font-mono text-primary">{tempoTotal} min</td>
                <td className="px-4 py-2"></td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-4 border rounded-lg">
          Nenhum passo cadastrado
        </div>
      )}

      {/* Formulário para adicionar novo passo */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Label htmlFor="novaDescricao">Descrição do Passo</Label>
          <Input
            id="novaDescricao"
            value={novaDescricao}
            onChange={(e) => setNovaDescricao(e.target.value)}
            placeholder="Ex: Misturar ingredientes secos"
          />
        </div>
        <div className="w-32">
          <Label htmlFor="novoTempo">Tempo (min)</Label>
          <Input
            id="novoTempo"
            type="number"
            min="0"
            value={novoTempo}
            onChange={(e) => setNovoTempo(parseInt(e.target.value) || 0)}
          />
        </div>
        <Button onClick={handleAdd} disabled={createMutation.isPending}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar
        </Button>
      </div>
    </div>
  );
}
