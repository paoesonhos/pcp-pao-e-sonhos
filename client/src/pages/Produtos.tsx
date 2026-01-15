import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Power, Search, ArrowLeft, FileText } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function Produtos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"ativas" | "inativas">("ativas");
  const [categoriaFilter, setCategoriaFilter] = useState<number | "todos">("todos");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState<any>(null);
  
  // Estado para pré-preenchimento vindo do Mapa de Produção
  const [prefilledNome, setPrefilledNome] = useState("");
  const [prefilledCodigo, setPrefilledCodigo] = useState("");
  const [location, setLocation] = useLocation();

  const utils = trpc.useUtils();

  // Queries
  const { data: produtos, isLoading } = trpc.produtos.list.useQuery({
    ativo: activeTab === "ativas",
    search: searchTerm || undefined,
    categoriaId: categoriaFilter === "todos" ? undefined : categoriaFilter,
  });

  const { data: categorias } = trpc.categorias.list.useQuery({ ativo: true });
  const { data: destinos } = trpc.destinos.list.useQuery({ ativo: true });
  
  // Ler parâmetros da URL ao carregar
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const novo = params.get('novo');
    const nome = params.get('nome');
    const codigo = params.get('codigo');
    const editId = params.get('edit');
    
    if (novo === 'true') {
      setPrefilledNome(nome || '');
      setPrefilledCodigo(codigo || '');
      setIsCreateDialogOpen(true);
      // Limpar parâmetros da URL
      setLocation('/produtos', { replace: true });
    } else if (editId) {
      // Abrir modal de edição para o produto especificado
      const produtoParaEditar = produtos?.find(p => p.id === parseInt(editId));
      if (produtoParaEditar) {
        setEditingProduto(produtoParaEditar);
        setIsEditDialogOpen(true);
        setLocation('/produtos', { replace: true });
      }
    }
  }, [produtos]);

  // Mutations
  const createMutation = trpc.produtos.create.useMutation({
    onSuccess: () => {
      toast.success("Produto criado com sucesso");
      utils.produtos.list.invalidate();
      setIsCreateDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar produto");
    },
  });

  const updateMutation = trpc.produtos.update.useMutation({
    onSuccess: () => {
      toast.success("Produto atualizado com sucesso");
      utils.produtos.list.invalidate();
      setIsEditDialogOpen(false);
      setEditingProduto(null);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar produto");
    },
  });

  const toggleMutation = trpc.produtos.toggle.useMutation({
    onSuccess: () => {
      toast.success("Status do produto alterado com sucesso");
      utils.produtos.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao alterar status");
    },
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const unidade = formData.get("unidade") as "kg" | "un";
    const pesoUnitario = formData.get("pesoUnitario") as string;
    
    // Validar peso unitário para produtos em unidades
    if (unidade === "un" && (!pesoUnitario || parseFloat(pesoUnitario) <= 0)) {
      toast.error("Peso unitário deve ser maior que zero para produtos em unidades");
      return;
    }

    createMutation.mutate({
      codigoProduto: formData.get("codigoProduto") as string,
      nome: formData.get("nome") as string,
      unidade,
      pesoUnitario,
      percentualPerdaLiquida: formData.get("percentualPerdaLiquida") as string || undefined,
      shelfLife: formData.get("shelfLife") ? parseInt(formData.get("shelfLife") as string) : undefined,
      categoriaId: formData.get("categoriaId") ? parseInt(formData.get("categoriaId") as string) : undefined,
      tipoEmbalagem: formData.get("tipoEmbalagem") as string,
      quantidadePorEmbalagem: parseInt(formData.get("quantidadePorEmbalagem") as string),
      destinoId: formData.get("destinoId") ? parseInt(formData.get("destinoId") as string) : undefined,
      saldoEstoque: formData.get("saldoEstoque") as string || "0",
      estoqueMinimoDias: formData.get("estoqueMinimoDias") ? parseInt(formData.get("estoqueMinimoDias") as string) : 4,
      ativo: true,
    });
  };

  const handleEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    updateMutation.mutate({
      id: editingProduto.id,
      data: {
        codigoProduto: formData.get("codigoProduto") as string,
        nome: formData.get("nome") as string,
        pesoUnitario: formData.get("pesoUnitario") as string,
        percentualPerdaLiquida: formData.get("percentualPerdaLiquida") as string || undefined,
        shelfLife: formData.get("shelfLife") ? parseInt(formData.get("shelfLife") as string) : undefined,
        categoriaId: formData.get("categoriaId") ? parseInt(formData.get("categoriaId") as string) : undefined,
        tipoEmbalagem: formData.get("tipoEmbalagem") as string,
        quantidadePorEmbalagem: parseInt(formData.get("quantidadePorEmbalagem") as string),
        destinoId: formData.get("destinoId") ? parseInt(formData.get("destinoId") as string) : undefined,
        saldoEstoque: formData.get("saldoEstoque") as string || "0",
        estoqueMinimoDias: formData.get("estoqueMinimoDias") ? parseInt(formData.get("estoqueMinimoDias") as string) : 4,
      },
    });
  };

  const handleToggle = (id: number) => {
    toggleMutation.mutate(id);
  };

  const openEditDialog = (produto: any) => {
    setEditingProduto(produto);
    setIsEditDialogOpen(true);
  };

  return (
    <div className="container py-8">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-semibold mb-2">Produtos</h1>
          <p className="text-muted-foreground">
            Gerencie os produtos finais produzidos pela padaria
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Produtos</CardTitle>
              <CardDescription>
                Produtos exibidos no formato: Código – Nome
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
                setIsCreateDialogOpen(open);
                if (!open) {
                  setPrefilledNome('');
                  setPrefilledCodigo('');
                }
              }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Produto
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleCreate}>
                  <DialogHeader>
                    <DialogTitle>Criar Novo Produto</DialogTitle>
                    <DialogDescription>
                      Adicione um novo produto ao sistema
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="codigoProduto">Código ERP *</Label>
                        <Input
                          id="codigoProduto"
                          name="codigoProduto"
                          placeholder="Ex: PROD001"
                          required
                          maxLength={50}
                          defaultValue={prefilledCodigo}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="categoriaId">Categoria</Label>
                        <Select name="categoriaId">
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {categorias?.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id.toString()}>
                                {cat.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="nome">Nome do Produto *</Label>
                      <Input
                        id="nome"
                        name="nome"
                        placeholder="Ex: Pão Francês"
                        required
                        maxLength={200}
                        defaultValue={prefilledNome}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="unidade">Unidade *</Label>
                        <Select name="unidade" required>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="kg">Quilograma (kg)</SelectItem>
                            <SelectItem value="un">Unidade (un)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="pesoUnitario">
                          Peso Unitário Massa Crua (kg) *
                        </Label>
                        <Input
                          id="pesoUnitario"
                          name="pesoUnitario"
                          type="number"
                          step="0.00001"
                          placeholder="0.05000"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="percentualPerdaLiquida">% Perda Líquida</Label>
                        <Input
                          id="percentualPerdaLiquida"
                          name="percentualPerdaLiquida"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="shelfLife">Shelf Life (dias)</Label>
                        <Input
                          id="shelfLife"
                          name="shelfLife"
                          type="number"
                          placeholder="7"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="tipoEmbalagem">Tipo de Embalagem *</Label>
                        <Input
                          id="tipoEmbalagem"
                          name="tipoEmbalagem"
                          placeholder="Ex: Saco plástico"
                          required
                          maxLength={100}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="quantidadePorEmbalagem">Qtd. por Embalagem *</Label>
                        <Input
                          id="quantidadePorEmbalagem"
                          name="quantidadePorEmbalagem"
                          type="number"
                          min="1"
                          placeholder="10"
                          required
                        />
                      </div>
                    </div>
                    {/* Campos de Expedição/Estoque */}
                    <div className="border-t pt-4 mt-2">
                      <p className="text-sm font-medium text-muted-foreground mb-3">Configurações de Expedição</p>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="destinoId">Destino</Label>
                          <Select name="destinoId">
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {destinos?.map((dest) => (
                                <SelectItem key={dest.id} value={dest.id.toString()}>
                                  {dest.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="saldoEstoque">Saldo Estoque (un)</Label>
                          <Input
                            id="saldoEstoque"
                            name="saldoEstoque"
                            type="number"
                            min="0"
                            step="1"
                            placeholder="0"
                            defaultValue="0"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="estoqueMinimoDias">Estoque Mín. (dias)</Label>
                          <Input
                            id="estoqueMinimoDias"
                            name="estoqueMinimoDias"
                            type="number"
                            min="1"
                            placeholder="4"
                            defaultValue="4"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Criando..." : "Criar Produto"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por código ou nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoriaFilter.toString()} onValueChange={(v) => setCategoriaFilter(v === "todos" ? "todos" : parseInt(v))}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas categorias</SelectItem>
                {categorias?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList>
                <TabsTrigger value="ativas">Ativos</TabsTrigger>
                <TabsTrigger value="inativas">Inativos</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando produtos...
            </div>
          ) : !produtos || produtos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum produto encontrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código – Nome</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Peso Unit.</TableHead>
                  <TableHead>Embalagem</TableHead>
                  <TableHead>Saldo Estoque</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtos.map((produto) => (
                  <TableRow key={produto.id}>
                    <TableCell className="font-medium">
                      <span className="font-mono text-sm">{produto.codigoProduto}</span>
                      <span className="mx-2">–</span>
                      <span>{produto.nome}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{produto.unidade}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {parseFloat(produto.pesoUnitario).toFixed(5)} kg
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {produto.tipoEmbalagem} ({produto.quantidadePorEmbalagem})
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {parseFloat(produto.saldoEstoque || '0').toFixed(0)} un
                    </TableCell>
                    <TableCell>
                      <Badge variant={produto.ativo ? "default" : "secondary"}>
                        {produto.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/fichas-tecnicas/${produto.id}`}>
                          <Button variant="ghost" size="icon" title="Ficha Técnica">
                            <FileText className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(produto)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggle(produto.id)}
                          disabled={toggleMutation.isPending}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleEdit}>
            <DialogHeader>
              <DialogTitle>Editar Produto</DialogTitle>
              <DialogDescription>
                Atualize as informações do produto
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-codigoProduto">Código ERP *</Label>
                  <Input
                    id="edit-codigoProduto"
                    name="codigoProduto"
                    defaultValue={editingProduto?.codigoProduto}
                    required
                    maxLength={50}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-categoriaId">Categoria</Label>
                  <Select name="categoriaId" defaultValue={editingProduto?.categoriaId?.toString()}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-nome">Nome do Produto *</Label>
                <Input
                  id="edit-nome"
                  name="nome"
                  defaultValue={editingProduto?.nome}
                  required
                  maxLength={200}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Unidade</Label>
                  <Input
                    value={editingProduto?.unidade}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-pesoUnitario">
                    Peso Unitário (kg)
                  </Label>
                  <Input
                    id="edit-pesoUnitario"
                    name="pesoUnitario"
                    type="number"
                    step="0.00001"
                    defaultValue={editingProduto ? parseFloat(editingProduto.pesoUnitario).toFixed(5) : ""}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-percentualPerdaLiquida">% Perda Líquida</Label>
                  <Input
                    id="edit-percentualPerdaLiquida"
                    name="percentualPerdaLiquida"
                    type="number"
                    step="0.01"
                    defaultValue={editingProduto?.percentualPerdaLiquida || ""}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-shelfLife">Shelf Life (dias)</Label>
                  <Input
                    id="edit-shelfLife"
                    name="shelfLife"
                    type="number"
                    defaultValue={editingProduto?.shelfLife || ""}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-tipoEmbalagem">Tipo de Embalagem *</Label>
                  <Input
                    id="edit-tipoEmbalagem"
                    name="tipoEmbalagem"
                    defaultValue={editingProduto?.tipoEmbalagem}
                    required
                    maxLength={100}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-quantidadePorEmbalagem">Qtd. por Embalagem *</Label>
                  <Input
                    id="edit-quantidadePorEmbalagem"
                    name="quantidadePorEmbalagem"
                    type="number"
                    min="1"
                    defaultValue={editingProduto?.quantidadePorEmbalagem}
                    required
                  />
                </div>
              </div>
              {/* Campos de Expedição/Estoque */}
              <div className="border-t pt-4 mt-2">
                <p className="text-sm font-medium text-muted-foreground mb-3">Configurações de Expedição</p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-destinoId">Destino</Label>
                    <Select name="destinoId" defaultValue={editingProduto?.destinoId?.toString() || ""}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {destinos?.map((dest) => (
                          <SelectItem key={dest.id} value={dest.id.toString()}>
                            {dest.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-saldoEstoque">Saldo Estoque (un)</Label>
                    <Input
                      id="edit-saldoEstoque"
                      name="saldoEstoque"
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={editingProduto ? Math.floor(parseFloat(editingProduto.saldoEstoque || '0')) : 0}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-estoqueMinimoDias">Estoque Mín. (dias)</Label>
                    <Input
                      id="edit-estoqueMinimoDias"
                      name="estoqueMinimoDias"
                      type="number"
                      min="1"
                      defaultValue={editingProduto?.estoqueMinimoDias || 4}
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingProduto(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
