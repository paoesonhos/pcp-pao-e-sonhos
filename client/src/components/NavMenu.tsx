import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  Tags, 
  Package, 
  ShoppingCart, 
  FileText, 
  Upload, 
  Calendar, 
  Calculator, 
  MapPin,
  Home
} from "lucide-react";

const menuItems = [
  { href: "/", label: "Início", icon: Home },
  { href: "/categorias", label: "Categorias", icon: Tags },
  { href: "/insumos", label: "Insumos", icon: ShoppingCart },
  { href: "/produtos", label: "Produtos", icon: Package },
  { href: "/fichas-tecnicas", label: "Fichas Técnicas", icon: FileText },
  { href: "/importa-v5", label: "Importação", icon: Upload },
  { href: "/mapa-producao", label: "Mapa Produção", icon: Calendar },
  { href: "/processamento-pcp", label: "PCP", icon: Calculator },
  { href: "/destinos", label: "Destinos", icon: MapPin },
];

export default function NavMenu() {
  const [location] = useLocation();

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container">
        <div className="flex items-center h-14 gap-1 overflow-x-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || 
              (item.href !== "/" && location.startsWith(item.href));
            
            return (
              <Link key={item.href} href={item.href}>
                <a
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap",
                    isActive
                      ? "bg-amber-100 text-amber-900"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </a>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
