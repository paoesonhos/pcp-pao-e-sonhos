import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Power, Search } from "lucide-react";
import { toast } from "sonner";

export default function Categorias() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"ativas" | "inativas">("ativas");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<any>(null);

  const utils = trpc.useUtils();

  // Queries
  const { data: categorias, isLoading } = trpc.categorias.list.useQuery({
    ativo: activeTab === "ativas",
    search: searchTerm || undefined,
  });

  // Mutations
  const createMutation = trpc.categorias.create.useMutation({
    onSuccess: () => {
      toast.success("Categoria criada com sucesso");
      utils.categorias.list.invalidate();
      setIsCreateDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar categoria");
    },
  });

  const updateMutation = trpc.categorias.update.useMutation({
    onSuccess: () => {
      toast.success("Categoria atualizada com sucesso");
      utils.categorias.list.invalidate();
      setIsEditDialogOpen(false);
      setEditingCategoria(null);
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao atualizar categoria");
    },
  });

  const toggleMutation = trpc.categorias.toggle.useMutation({
    onSuccess: () => {
      toast.success("Status da categoria alterado com sucesso");
      utils.categorias.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao alterar status");
    },
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      nome: formData.get("nome") as string,
      descricao: formData.get("descricao") as string || undefined,
      ativo: true,
    });
  };

  const handleEdit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateMutation.mutate({
      id: editingCategoria.id,
      data: {
        nome: formData.get("nome") as string,
        descricao: formData.get("descricao") as string || undefined,
      },
    });
  };

  const handleToggle = (id: number) => {
    toggleMutation.mutate(id);
  };

  const openEditDialog = (categoria: any) => {
    setEditingCategoria(categoria);
    setIsEditDialogOpen(true);
  };

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-2">Categorias de Produtos</h1>
        <p className="text-muted-foreground">
          Gerencie as categorias de produtos da padaria
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Categorias</CardTitle>
              <CardDescription>
                Organize seus produtos em categorias como Pães, Bolos, Salgados, etc.
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Categoria
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleCreate}>
                  <DialogHeader>
                    <DialogTitle>Criar Nova Categoria</DialogTitle>
                    <DialogDescription>
                      Adicione uma nova categoria para organizar seus produtos
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="nome">Nome *</Label>
                      <Input
                        id="nome"
                        name="nome"
                        placeholder="Ex: Pães, Bolos, Salgados"
                        required
                        maxLength={100}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="descricao">Descrição</Label>
                      <Textarea
                        id="descricao"
                        name="descricao"
                        placeholder="Descrição opcional da categoria"
                        rows={3}
                      />
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
                      {createMutation.isPending ? "Criando..." : "Criar Categoria"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList>
                <TabsTrigger value="ativas">Ativas</TabsTrigger>
                <TabsTrigger value="inativas">Inativas</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando categorias...
            </div>
          ) : !categorias || categorias.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma categoria encontrada
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categorias.map((categoria) => (
                  <TableRow key={categoria.id}>
                    <TableCell className="font-medium">{categoria.nome}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {categoria.descricao || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={categoria.ativo ? "default" : "secondary"}>
                        {categoria.ativo ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(categoria)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggle(categoria.id)}
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
              <DialogTitle>Editar Categoria</DialogTitle>
              <DialogDescription>
                Atualize as informações da categoria
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-nome">Nome *</Label>
                <Input
                  id="edit-nome"
                  name="nome"
                  defaultValue={editingCategoria?.nome}
                  required
                  maxLength={100}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-descricao">Descrição</Label>
                <Textarea
                  id="edit-descricao"
                  name="descricao"
                  defaultValue={editingCategoria?.descricao || ""}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingCategoria(null);
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
