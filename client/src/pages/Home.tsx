import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Tags, FileText, ShoppingCart, Upload, Calendar } from "lucide-react";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-muted-foreground">Carregando...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl mb-2">Sistema PCP</CardTitle>
            <CardDescription className="text-lg">Pão e Sonhos</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-6">
              Sistema de Planejamento e Controle de Produção para padaria
            </p>
            <Button asChild size="lg" className="w-full">
              <a href={getLoginUrl()}>Entrar no Sistema</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const modules = [
    {
      title: "Categorias",
      description: "Gerencie categorias de produtos",
      icon: Tags,
      href: "/categorias",
      color: "text-amber-600",
    },
    {
      title: "Insumos",
      description: "Cadastro de ingredientes",
      icon: Package,
      href: "/insumos",
      color: "text-orange-600",
    },
    {
      title: "Produtos",
      description: "Gestão de produtos finais",
      icon: ShoppingCart,
      href: "/produtos",
      color: "text-amber-700",
    },
    {
      title: "Fichas Técnicas",
      description: "Receitas e composições",
      icon: FileText,
      href: "/fichas-tecnicas",
      color: "text-orange-700",
    },
    {
      title: "Importação V5",
      description: "Upload de CSV - Simples",
      icon: Upload,
      href: "/importa-v5",
      color: "text-amber-800",
    },
    {
      title: "Mapa de Produção",
      description: "Planejamento semanal",
      icon: Calendar,
      href: "/mapa-producao",
      color: "text-green-700",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <header className="border-b bg-card">
        <div className="container py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Sistema PCP Pão e Sonhos</h1>
            <p className="text-sm text-muted-foreground">Bem-vindo, {user?.name}</p>
          </div>
          <Button variant="outline" onClick={() => logout()}>Sair</Button>
        </div>
      </header>

      <main className="container py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-semibold mb-2">Módulos do Sistema</h2>
          <p className="text-muted-foreground">
            Selecione um módulo para começar
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {modules.map((module) => (
            <Link key={module.href} href={module.href}>
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 ${module.color}`}>
                    <module.icon className="h-6 w-6" />
                  </div>
                  <CardTitle>{module.title}</CardTitle>
                  <CardDescription>{module.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
