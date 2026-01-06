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
import { Plus, Trash2, ArrowLeft, Package, Layers } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function FichaTecnica() {
  const [, params] = useRoute("/fichas-tecnicas/:id");
  const produtoId = params?.id ? parseInt(params.id) : null;

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedComponente, setSelectedComponente] = useState<string>("");
  const [quantidadeBase, setQuantidadeBase] = useState("");
  const [unidade, setUnidade] = useState<"kg" | "un">("kg");

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
                      <Select 
                        value={selectedComponente} 
                        onValueChange={setSelectedComponente}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um insumo ou produto" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Insumos</SelectLabel>
                            {insumos?.map((insumo) => (
                              <SelectItem 
                                key={`insumo-${insumo.id}`} 
                                value={`insumo-${insumo.id}`}
                              >
                                {insumo.codigoInsumo} – {insumo.nome}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                          <SelectGroup>
                            <SelectLabel>Produtos (Massa Base)</SelectLabel>
                            {produtos
                              ?.filter((p) => p.id !== produtoId)
                              .map((prod) => (
                                <SelectItem 
                                  key={`produto-${prod.id}`} 
                                  value={`produto-${prod.id}`}
                                >
                                  {prod.codigoProduto} – {prod.nome}
                                </SelectItem>
                              ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
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
        </CardContent>
      </Card>

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
            <BlocoConfig produtoId={produtoId} produto={produto} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Componente para configuração de blocos (preservado)
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
