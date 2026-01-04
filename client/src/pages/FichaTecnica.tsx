import { useState, useMemo } from "react";
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, ArrowLeft, Package, Layers } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function FichaTecnica() {
  const [, params] = useRoute("/fichas-tecnicas/:id");
  const produtoId = params?.id ? parseInt(params.id) : null;

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedPai, setSelectedPai] = useState<number | null>(null);

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
      setSelectedPai(null);
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

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!produtoId) return;

    const formData = new FormData(e.currentTarget);
    const tipoComponente = formData.get("tipoComponente") as "ingrediente" | "massa_base" | "sub_bloco";
    const componenteId = parseInt(formData.get("componenteId") as string);
    const quantidadeBase = formData.get("quantidadeBase") as string;
    const unidade = formData.get("unidade") as "kg" | "un";
    const receitaMinima = formData.get("receitaMinima") as string || undefined;

    // Determinar nível e paiId
    let nivel = 1;
    let paiId = null;

    if (selectedPai) {
      nivel = 2;
      paiId = selectedPai;
    }

    createMutation.mutate({
      produtoId,
      componenteId,
      tipoComponente,
      quantidadeBase,
      unidade,
      receitaMinima,
      ordem: 0,
      nivel,
      paiId: paiId || undefined,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja remover este componente?")) {
      deleteMutation.mutate(id);
    }
  };

  // Organizar ficha técnica em hierarquia
  const fichaTecnicaHierarquica = useMemo(() => {
    if (!fichaTecnica) return [];

    const nivel1 = fichaTecnica.filter((item) => item.nivel === 1);
    const nivel2 = fichaTecnica.filter((item) => item.nivel === 2);

    return nivel1.map((item) => ({
      ...item,
      filhos: nivel2.filter((filho) => filho.paiId === item.id),
    }));
  }, [fichaTecnica]);

  const getComponenteNome = (item: any) => {
    if (item.tipoComponente === "ingrediente") {
      const insumo = insumos?.find((i) => i.id === item.componenteId);
      return insumo ? `${insumo.codigoInsumo} – ${insumo.nome}` : "Insumo não encontrado";
    } else {
      const prod = produtos?.find((p) => p.id === item.componenteId);
      return prod ? `${prod.codigoProduto} – ${prod.nome}` : "Produto não encontrado";
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case "ingrediente":
        return "Ingrediente";
      case "massa_base":
        return "Massa Base";
      case "sub_bloco":
        return "Sub-bloco";
      default:
        return tipo;
    }
  };

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
        <Link href="/produtos">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-semibold mb-2">Ficha Técnica</h1>
          {produto && (
            <p className="text-muted-foreground">
              <span className="font-mono">{produto.codigoProduto}</span> – {produto.nome}
            </p>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Composição do Produto</CardTitle>
              <CardDescription>
                Estrutura hierárquica com até 2 níveis (ingredientes, massas base e sub-blocos)
              </CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setSelectedPai(null)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Componente
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleAdd}>
                  <DialogHeader>
                    <DialogTitle>
                      {selectedPai ? "Adicionar Sub-bloco (Nível 2)" : "Adicionar Componente (Nível 1)"}
                    </DialogTitle>
                    <DialogDescription>
                      {selectedPai
                        ? "Adicione um sub-bloco ao componente selecionado"
                        : "Adicione um ingrediente ou massa base ao produto"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="tipoComponente">Tipo *</Label>
                      <Select name="tipoComponente" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ingrediente">Ingrediente</SelectItem>
                          {!selectedPai && <SelectItem value="massa_base">Massa Base</SelectItem>}
                          {selectedPai && <SelectItem value="sub_bloco">Sub-bloco</SelectItem>}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="componenteId">Componente *</Label>
                      <Select name="componenteId" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <optgroup label="Insumos">
                            {insumos?.map((insumo) => (
                              <SelectItem key={`i-${insumo.id}`} value={insumo.id.toString()}>
                                {insumo.codigoInsumo} – {insumo.nome}
                              </SelectItem>
                            ))}
                          </optgroup>
                          {!selectedPai && (
                            <optgroup label="Produtos (Massa Base)">
                              {produtos
                                ?.filter((p) => p.id !== produtoId)
                                .map((prod) => (
                                  <SelectItem key={`p-${prod.id}`} value={prod.id.toString()}>
                                    {prod.codigoProduto} – {prod.nome}
                                  </SelectItem>
                                ))}
                            </optgroup>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="quantidadeBase">Quantidade Base *</Label>
                        <Input
                          id="quantidadeBase"
                          name="quantidadeBase"
                          type="number"
                          step="0.00001"
                          placeholder="0.00000"
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="unidade">Unidade *</Label>
                        <Select name="unidade" defaultValue="kg" required>
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
                    <div className="grid gap-2">
                      <Label htmlFor="receitaMinima">Receita Mínima</Label>
                      <Input
                        id="receitaMinima"
                        name="receitaMinima"
                        type="number"
                        step="0.00001"
                        placeholder="Opcional"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsAddDialogOpen(false);
                        setSelectedPai(null);
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending}>
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
          ) : !fichaTecnicaHierarquica || fichaTecnicaHierarquica.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum componente cadastrado. Clique em "Adicionar Componente" para começar.
            </div>
          ) : (
            <div className="space-y-6">
              {fichaTecnicaHierarquica.map((item) => (
                <div key={item.id} className="border rounded-lg p-4">
                  {/* Nível 1 */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">
                        {item.tipoComponente === "ingrediente" ? (
                          <Package className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <Layers className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{getComponenteNome(item)}</span>
                          <Badge variant="outline">{getTipoLabel(item.tipoComponente)}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <span className="font-mono">
                            {parseFloat(item.quantidadeBase).toFixed(5)} {item.unidade}
                          </span>
                          {item.receitaMinima && (
                            <span className="ml-4">
                              Receita mín: {parseFloat(item.receitaMinima).toFixed(5)} {item.unidade}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {(item.tipoComponente === "massa_base" || item.tipoComponente === "sub_bloco") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPai(item.id);
                            setIsAddDialogOpen(true);
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Sub-bloco
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Nível 2 - Sub-blocos */}
                  {item.filhos && item.filhos.length > 0 && (
                    <div className="ml-8 mt-4 space-y-2 border-l-2 border-muted pl-4">
                      {item.filhos.map((filho: any) => (
                        <div key={filho.id} className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="mt-1">
                              <Package className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium">{getComponenteNome(filho)}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {getTipoLabel(filho.tipoComponente)}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                <span className="font-mono">
                                  {parseFloat(filho.quantidadeBase).toFixed(5)} {filho.unidade}
                                </span>
                                {filho.receitaMinima && (
                                  <span className="ml-4">
                                    Receita mín: {parseFloat(filho.receitaMinima).toFixed(5)} {filho.unidade}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDelete(filho.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuração de Blocos (se produto for em unidades) */}
      {produto && produto.unidade === "un" && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Configuração de Blocos (Divisora)</CardTitle>
            <CardDescription>
              Configure blocos de 30 unidades para uso na divisora
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BlocoConfig produtoId={produtoId} produto={produto} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Componente para configuração de blocos
function BlocoConfig({ produtoId, produto }: { produtoId: number; produto: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const utils = trpc.useUtils();

  const { data: bloco } = trpc.blocos.getByProduto.useQuery(produtoId);

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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const unidadesPorBloco = parseInt(formData.get("unidadesPorBloco") as string);
    const pesoBloco = formData.get("pesoBloco") as string;

    createMutation.mutate({
      produtoId,
      unidadesPorBloco,
      pesoBloco,
      ativo: true,
    });
  };

  // Calcular peso esperado do bloco
  const pesoEsperado = bloco
    ? (bloco.unidadesPorBloco * parseFloat(produto.pesoUnitario)).toFixed(5)
    : (30 * parseFloat(produto.pesoUnitario)).toFixed(5);

  if (bloco && !isEditing) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-muted-foreground">Unidades por Bloco</Label>
            <div className="text-lg font-medium">{bloco.unidadesPorBloco}</div>
          </div>
          <div>
            <Label className="text-muted-foreground">Peso do Bloco</Label>
            <div className="text-lg font-medium font-mono">{parseFloat(bloco.pesoBloco).toFixed(5)} kg</div>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          Peso esperado: {pesoEsperado} kg ({bloco.unidadesPorBloco} × {parseFloat(produto.pesoUnitario).toFixed(5)} kg)
        </div>
        <Button variant="outline" onClick={() => setIsEditing(true)}>
          Editar Configuração
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="unidadesPorBloco">Unidades por Bloco *</Label>
          <Input
            id="unidadesPorBloco"
            name="unidadesPorBloco"
            type="number"
            defaultValue={bloco?.unidadesPorBloco || 30}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="pesoBloco">Peso do Bloco (kg) *</Label>
          <Input
            id="pesoBloco"
            name="pesoBloco"
            type="number"
            step="0.00001"
            defaultValue={bloco?.pesoBloco || pesoEsperado}
            required
          />
        </div>
      </div>
      <div className="text-sm text-muted-foreground">
        Peso esperado: {pesoEsperado} kg (30 × {parseFloat(produto.pesoUnitario).toFixed(5)} kg)
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Salvando..." : "Salvar Configuração"}
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
