import { useState } from "react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Power, Search, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function Insumos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"ativas" | "inativas">("ativas");
  const [tipoFilter, setTipoFilter] = useState<"seco" | "molhado" | "todos">("todos");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingInsumo, setEditingInsumo] = useState<any>(null);

  const utils = trpc.useUtils();

  // Queries
  const { data: insumos, isLoading } = trpc.insumos.list.useQuery({
    ativo: activeTab === "ativas",
    search: searchTerm || undefined,
    tipo: tipoFilter === "todos" ? undefined : tipoFilter,
  });

  // Mutations
  const createMutation = trpc.insumos.create.useMutation({
    onSuccess: () => {
      toast.success("Insumo criado com sucesso");
      utils.insumos.list.invalidate();
      setIsCreateDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar insumo");
    },
  });

  const updateMutation = trpc.insumos.update.useMutation({
    onSuccess: () => {
      toast.success("Insumo atualizado com sucesso");
      utils.insumos.list.invalidate();
      setIsEditDialogOpen(false);
      setEditingInsumo(null);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar insumo");
    },
  });

  const toggleMutation = trpc.insumos.toggle.useMutation({
    onSuccess: () => {
      toast.success("Status do insumo alterado com sucesso");
      utils.insumos.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao alterar status");
    },
  });

  const togglePrePesagemMutation = trpc.insumos.togglePrePesagem.useMutation({
    onSuccess: () => {
      toast.success("Configuracao de pre-pesagem alterada com sucesso");
      utils.insumos.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao alterar configuracao de pre-pesagem");
    },
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      codigoInsumo: formData.get("codigoInsumo") as string,
      nome: formData.get("nome") as string,
      tipo: formData.get("tipo") as "seco" | "molhado",
      unidadeMedida: (formData.get("unidadeMedida") as "kg" | "un") || "kg",
      ativo: true,
    });
  };

  const handleEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateMutation.mutate({
      id: editingInsumo.id,
      data: {
        codigoInsumo: formData.get("codigoInsumo") as string,
        nome: formData.get("nome") as string,
        tipo: formData.get("tipo") as "seco" | "molhado",
        unidadeMedida: formData.get("unidadeMedida") as "kg" | "un",
      },
    });
  };

  const handleToggle = (id: number) => {
    toggleMutation.mutate(id);
  };

  const handleTogglePrePesagem = (id: number) => {
    togglePrePesagemMutation.mutate(id);
  };

  const openEditDialog = (insumo: any) => {
    setEditingInsumo(insumo);
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
          <h1 className="text-3xl font-semibold mb-2">Insumos</h1>
          <p className="text-muted-foreground">
            Gerencie os ingredientes utilizados nas receitas
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Insumos</CardTitle>
              <CardDescription>
                Cadastre ingredientes secos e molhados com código único
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Insumo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleCreate}>
                  <DialogHeader>
                    <DialogTitle>Criar Novo Insumo</DialogTitle>
                    <DialogDescription>
                      Adicione um novo ingrediente ao sistema
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="codigoInsumo">Código *</Label>
                      <Input
                        id="codigoInsumo"
                        name="codigoInsumo"
                        placeholder="Ex: INS001"
                        required
                        maxLength={50}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="nome">Nome *</Label>
                      <Input
                        id="nome"
                        name="nome"
                        placeholder="Ex: Farinha de Trigo"
                        required
                        maxLength={200}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="tipo">Tipo *</Label>
                      <Select name="tipo" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="seco">Seco</SelectItem>
                          <SelectItem value="molhado">Molhado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="unidadeMedida">Unidade de Medida *</Label>
                      <Select name="unidadeMedida" defaultValue="kg" required>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kg">Quilograma (kg)</SelectItem>
                          <SelectItem value="un">Unidade (un)</SelectItem>
                        </SelectContent>
                      </Select>
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
                      {createMutation.isPending ? "Criando..." : "Criar Insumo"}
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
            <Select value={tipoFilter} onValueChange={(v) => setTipoFilter(v as any)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="seco">Secos</SelectItem>
                <SelectItem value="molhado">Molhados</SelectItem>
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
              Carregando insumos...
            </div>
          ) : !insumos || insumos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum insumo encontrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Pré-Pesagem</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {insumos.map((insumo) => (
                  <TableRow key={insumo.id}>
                    <TableCell className="font-mono font-medium">{insumo.codigoInsumo}</TableCell>
                    <TableCell>{insumo.nome}</TableCell>
                    <TableCell>
                      <Badge variant={insumo.tipo === "seco" ? "secondary" : "outline"}>
                        {insumo.tipo === "seco" ? "Seco" : "Molhado"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{insumo.unidadeMedida}</TableCell>
                    <TableCell>
                      <Checkbox
                        checked={insumo.incluirPrePesagem || false}
                        onCheckedChange={() => handleTogglePrePesagem(insumo.id)}
                        disabled={togglePrePesagemMutation.isPending}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant={insumo.ativo ? "default" : "secondary"}>
                        {insumo.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(insumo)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggle(insumo.id)}
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
        <DialogContent>
          <form onSubmit={handleEdit}>
            <DialogHeader>
              <DialogTitle>Editar Insumo</DialogTitle>
              <DialogDescription>
                Atualize as informações do insumo
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-codigoInsumo">Código *</Label>
                <Input
                  id="edit-codigoInsumo"
                  name="codigoInsumo"
                  defaultValue={editingInsumo?.codigoInsumo}
                  required
                  maxLength={50}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-nome">Nome *</Label>
                <Input
                  id="edit-nome"
                  name="nome"
                  defaultValue={editingInsumo?.nome}
                  required
                  maxLength={200}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-tipo">Tipo *</Label>
                <Select name="tipo" defaultValue={editingInsumo?.tipo} required>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seco">Seco</SelectItem>
                    <SelectItem value="molhado">Molhado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-unidadeMedida">Unidade de Medida *</Label>
                <Select name="unidadeMedida" defaultValue={editingInsumo?.unidadeMedida} required>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">Quilograma (kg)</SelectItem>
                    <SelectItem value="un">Unidade (un)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingInsumo(null);
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
