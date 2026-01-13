import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Categorias from "./pages/Categorias";
import ImportaV5 from "./pages/ImportaV5";
import Insumos from "./pages/Insumos";
import Produtos from "./pages/Produtos";
import FichaTecnica from "./pages/FichaTecnica";
import FichasTecnicas from "./pages/FichasTecnicas";
import MapaProducao from "./pages/MapaProducao";
import ProcessamentoPCP from "./pages/ProcessamentoPCP";
import Destinos from "./pages/Destinos";
import NavMenu from "./components/NavMenu";




function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/categorias"} component={Categorias} />
      <Route path={"/insumos"} component={Insumos} />
      <Route path={"/produtos"} component={Produtos} />
      <Route path={"/fichas-tecnicas"} component={FichasTecnicas} />
      <Route path={"/fichas-tecnicas/:id"} component={FichaTecnica} />
      <Route path={"/importa-v5"} component={ImportaV5} />
      <Route path={"/mapa-producao"} component={MapaProducao} />
      <Route path={"/processamento-pcp"} component={ProcessamentoPCP} />
      <Route path={"/destinos"} component={Destinos} />

      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <NavMenu />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
