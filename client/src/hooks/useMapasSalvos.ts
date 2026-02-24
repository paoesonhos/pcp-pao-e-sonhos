import { useCallback, useState, useEffect } from "react";

export interface ItemMapa {
  id: number;
  codigo: string;
  nome: string;
  unidade: string;
  qtdImportada: number;
  percentualAjuste: number;
  qtdPlanejada: number;
  equipe: string;
  diaProduzir: number;
  produtoId?: number | null;
  isReposicao?: boolean | null;
}

export interface MapaSalvo {
  id: string;
  nome: string;
  data: ItemMapa[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = "mapas_base_salvos";
const CURRENT_MAP_KEY = "mapa_atual_id";

export function useMapasSalvos() {
  const [mapas, setMapas] = useState<MapaSalvo[]>([]);
  const [mapaAtualId, setMapaAtualId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Carregar mapas do localStorage ao montar
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as MapaSalvo[];
        // Ordenar por mais recentes primeiro
        parsed.sort((a, b) => b.updatedAt - a.updatedAt);
        setMapas(parsed);
      }

      const currentId = localStorage.getItem(CURRENT_MAP_KEY);
      if (currentId) {
        setMapaAtualId(currentId);
      }
    } catch (error) {
      console.error("Erro ao carregar mapas salvos:", error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Salvar novo mapa
  const salvarMapa = useCallback(
    (nome: string, dados: ItemMapa[]): MapaSalvo => {
      const novoMapa: MapaSalvo = {
        id: Date.now().toString(),
        nome,
        data: dados,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const novosMapa = [novoMapa, ...mapas];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(novosMapa));
      setMapas(novosMapa);
      setMapaAtualId(novoMapa.id);
      localStorage.setItem(CURRENT_MAP_KEY, novoMapa.id);

      return novoMapa;
    },
    [mapas]
  );

  // Carregar mapa salvo
  const carregarMapa = useCallback((id: string): MapaSalvo | null => {
    const mapa = mapas.find((m) => m.id === id);
    if (mapa) {
      setMapaAtualId(id);
      localStorage.setItem(CURRENT_MAP_KEY, id);
    }
    return mapa || null;
  }, [mapas]);

  // Atualizar nome do mapa
  const atualizarNomeMapa = useCallback(
    (id: string, novoNome: string): void => {
      const novosMapa = mapas.map((m) =>
        m.id === id
          ? { ...m, nome: novoNome, updatedAt: Date.now() }
          : m
      );
      // Reordenar por mais recentes primeiro
      novosMapa.sort((a, b) => b.updatedAt - a.updatedAt);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(novosMapa));
      setMapas(novosMapa);
    },
    [mapas]
  );

  // Deletar mapa
  const deletarMapa = useCallback(
    (id: string): void => {
      const novosMapa = mapas.filter((m) => m.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(novosMapa));
      setMapas(novosMapa);

      // Se era o mapa atual, limpar
      if (mapaAtualId === id) {
        setMapaAtualId(null);
        localStorage.removeItem(CURRENT_MAP_KEY);
      }
    },
    [mapas, mapaAtualId]
  );

  // Obter mapa atual
  const obterMapaAtual = useCallback((): MapaSalvo | null => {
    if (!mapaAtualId) return null;
    return mapas.find((m) => m.id === mapaAtualId) || null;
  }, [mapas, mapaAtualId]);

  // Obter nome do mapa atual
  const obterNomeMapaAtual = useCallback((): string => {
    const mapa = obterMapaAtual();
    return mapa?.nome || "Sem mapa";
  }, [obterMapaAtual]);

  return {
    mapas,
    mapaAtualId,
    isLoaded,
    salvarMapa,
    carregarMapa,
    atualizarNomeMapa,
    deletarMapa,
    obterMapaAtual,
    obterNomeMapaAtual,
  };
}
