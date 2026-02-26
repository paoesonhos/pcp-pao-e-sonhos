import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useMapasSalvos } from "@/hooks/useMapasSalvos";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit2 } from "lucide-react";
import { ModalNomeacaoMapa } from "@/components/ModalNomeacaoMapa";

interface ItemMapa {
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

const DIAS_SEMANA = [
  { num: 2, nome: "Segunda-feira" },
  { num: 3, nome: "Terça-feira" },
  { num: 4, nome: "Quarta-feira" },
  { num: 5, nome: "Quinta-feira" },
  { num: 6, nome: "Sexta-feira" },
  { num: 7, nome: "Sábado" },
];

const EQUIPES = ["Equipe 1", "Equipe 2", "Equipe 3"];

// Opções de percentual com incremento de 10%
const PERCENTUAIS = [
  { valor: -50, label: "-50%" },
  { valor: -40, label: "-40%" },
  { valor: -30, label: "-30%" },
  { valor: -20, label: "-20%" },
  { valor: -10, label: "-10%" },
  { valor: 0, label: "0%" },
  { valor: 10, label: "+10%" },
  { valor: 20, label: "+20%" },
  { valor: 30, label: "+30%" },
  { valor: 40, label: "+40%" },
  { valor: 50, label: "+50%" },
];

export default function MapaProducao() {
  const [mapa, setMapa] = useState<ItemMapa[]>([]);
  const [feriados, setFeriados] = useState<number[]>([]);
  const [importacao, setImportacao] = useState<any>(null);
  const [erro, setErro] = useState("");
  const [processando, setProcessando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [alterado, setAlterado] = useState(false);
  const [, setLocation] = useLocation();

  // Mutations para salvar
  const salvarRascunhoMutation = trpc.mapaProducao.salvarRascunho.useMutation();
  const salvarMapaBaseMutation = trpc.mapaProducao.salvarMapaBase.useMutation();
  const validarCadastroMutation = trpc.mapaProducao.validarCadastroProdutos.useMutation();
  const { data: hasMapaBase } = trpc.mapaProducao.hasMapaBase.useQuery();
  const { data: mapaBaseData, refetch: refetchMapaBase } = trpc.mapaProducao.carregarMapaBase.useQuery(undefined, { enabled: false });
  const { refetch: validarRuptura } = trpc.mapaProducao.validarRupturaEstoque.useQuery(undefined, { enabled: false });
  
  // Estado para produtos em ruptura
  const [produtosEmRuptura, setProdutosEmRuptura] = useState<string[]>([]);
  
  // Estado para modal de produtos não cadastrados
  const [showModalCadastro, setShowModalCadastro] = useState(false);
  const [produtosNaoCadastrados, setProdutosNaoCadastrados] = useState<string[]>([]);
  const [proximoCodigo, setProximoCodigo] = useState<number>(1);
  
  // Estado para cadastro em lote
  interface ProdutoParaCadastrar {
    nome: string;
    codigo: string;
    unidade: 'kg' | 'un';
    pesoUnitario: string;
    tipoEmbalagem: string;
    quantidadePorEmbalagem: number;
    categoriaId?: number;
    destinoId?: number;
    expandido: boolean;
  }
  const [produtosParaCadastrar, setProdutosParaCadastrar] = useState<ProdutoParaCadastrar[]>([]);
  const [cadastrandoLote, setCadastrandoLote] = useState(false);
  
  // Utils para refetch
  const utils = trpc.useUtils();

  const { data, isLoading, error } = trpc.mapaProducao.gerarMapa.useQuery();
  
  // Queries para categorias e destinos (para cadastro em lote)
  const { data: categorias } = trpc.categorias.list.useQuery({ ativo: true });
  const { data: destinos } = trpc.destinos.list.useQuery({ ativo: true });
  
  // Query para lista de produtos cadastrados (para adicionar ao mapa)
  const { data: produtosCadastrados } = trpc.produtos.list.useQuery({ ativo: true });
  
  // Hook para gerenciar mapas salvos
  const { mapas, mapaAtualId, isLoaded, salvarMapa, carregarMapa, atualizarNomeMapa, deletarMapa, obterNomeMapaAtual } = useMapasSalvos();
  
  // Estado para modal de nomeação de mapa
  const [showModalNomear, setShowModalNomear] = useState(false);
  const [nomeNovoMapa, setNomeNovoMapa] = useState("");
  const [editandoMapaId, setEditandoMapaId] = useState<string | null>(null);
  
  // Estado para adicionar produto
  const [showAdicionarProduto, setShowAdicionarProduto] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<string>("");
  const [diaAdicionarProduto, setDiaAdicionarProduto] = useState<number>(2);
  
  // Estado para modal de confirmacao de ruptura
  const [showModalRuptura, setShowModalRuptura] = useState(false);
  const [itensRupturaParaConfirmar, setItensRupturaParaConfirmar] = useState<any[]>([]);
  const [itensRupturaConfirmados, setItensRupturaConfirmados] = useState<Set<string>>(new Set());
  const [rupturaEmProcessamento, setRupturaEmProcessamento] = useState(false);
  
  // Mutation para cadastro em lote
  const cadastrarProdutoMutation = trpc.produtos.create.useMutation();

  useEffect(() => {
    if (data?.success && data.mapa) {
      setMapa(data.mapa);
      setImportacao(data.importacao);
    } else if (data?.erro) {
      setErro(data.erro);
    }
  }, [data]);

  useEffect(() => {
    if (error) {
      setErro(error.message);
    }
  }, [error]);

  // Recalcular Qtd_Planejada quando percentual ou feriado mudar
  const recalcularQtdPlanejada = (item: ItemMapa, feriados: number[]): number => {
    if (feriados.includes(item.diaProduzir)) {
      return 0;
    }
    const ajuste = item.qtdImportada * (item.percentualAjuste / 100);
    return Math.round((item.qtdImportada + ajuste) * 100) / 100;
  };

  // Atualizar percentual de ajuste
  const handlePercentualChange = (id: number, novoPercentual: number) => {
    setMapa((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, percentualAjuste: novoPercentual };
          updated.qtdPlanejada = recalcularQtdPlanejada(updated, feriados);
          return updated;
        }
        return item;
      })
    );
    setAlterado(true);
  };

  // Atualizar dia de produção
  const handleDiaChange = (id: number, novoDia: number) => {
    setMapa((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, diaProduzir: novoDia };
          updated.qtdPlanejada = recalcularQtdPlanejada(updated, feriados);
          return updated;
        }
        return item;
      })
    );
    setAlterado(true);
  };

  // Atualizar equipe
  const handleEquipeChange = (id: number, novaEquipe: string) => {
    setMapa((prev) =>
      prev.map((item) => (item.id === id ? { ...item, equipe: novaEquipe } : item))
    );
    setAlterado(true);
  };

  // Atualizar Qtd Planejada manualmente
  const handleQtdPlanejadaChange = (id: number, novaQtd: number) => {
    setMapa((prev) =>
      prev.map((item) => (item.id === id ? { ...item, qtdPlanejada: novaQtd } : item))
    );
    setAlterado(true);
  };

  // Toggle feriado
  const handleFeriadoToggle = (dia: number) => {
    setFeriados((prev) => {
      const novosFeriados = prev.includes(dia)
        ? prev.filter((d) => d !== dia)
        : [...prev, dia];

      // Recalcular todas as qtdPlanejada
      setMapa((prevMapa) =>
        prevMapa.map((item) => ({
          ...item,
          qtdPlanejada: recalcularQtdPlanejada(item, novosFeriados),
        }))
      );

      return novosFeriados;
    });
  };

  // Agrupar itens por dia
  const agruparPorDia = () => {
    const grupos: Record<number, ItemMapa[]> = {};
    DIAS_SEMANA.forEach((dia) => {
      grupos[dia.num] = [];
    });
    mapa.forEach((item) => {
      if (grupos[item.diaProduzir]) {
        grupos[item.diaProduzir].push(item);
      }
    });
    return grupos;
  };

  // Calcular total de um grupo
  const calcularTotalGrupo = (itens: ItemMapa[]): number => {
    return itens.reduce((acc, item) => acc + item.qtdPlanejada, 0);
  };

  const gruposPorDia = agruparPorDia();

  // Função para continuar salvamento após validação de cadastro
  const continuarSalvamento = async () => {
    try {
      // Preparar itens para salvar
      const itensParaSalvar = mapa.map(item => ({
        produtoId: item.produtoId || 0,
        codigoProduto: item.codigo,
        nomeProduto: item.nome,
        unidade: item.unidade,
        qtdImportada: item.qtdImportada.toString(),
        percentualAjuste: item.percentualAjuste,
        qtdPlanejada: item.qtdPlanejada.toString(),
        diaProduzir: item.diaProduzir,
        equipe: item.equipe,
        isReposicao: item.isReposicao || false,
      }));

      await salvarRascunhoMutation.mutateAsync({
        importacaoId: importacao?.id || null,
        itens: itensParaSalvar,
      });

      // Recarregar o mapa para obter os dados otimizados por shelf life
      const novoRascunhoOtimizado = await utils.mapaProducao.carregarRascunho.fetch();
      if (novoRascunhoOtimizado?.mapa) {
        setMapa(novoRascunhoOtimizado.mapa);
      }

      setAlterado(false);
      
      // Executar validação de ruptura após salvar
      const { data: rupturaData } = await validarRuptura();
      
      if (rupturaData?.produtosEmRuptura && rupturaData.produtosEmRuptura.length > 0) {
        setProdutosEmRuptura(rupturaData.produtosEmRuptura.map((p: any) => p.codigoProduto));
        
        if (rupturaData.itensAdicionados && rupturaData.itensAdicionados.length > 0) {
          setItensRupturaParaConfirmar(rupturaData.itensAdicionados);
          setItensRupturaConfirmados(new Set());
          setShowModalRuptura(true);
          setSalvando(false);
        } else {
          alert(
            `Alteracoes salvas com sucesso!\n\n` +
            `⚠️ ALERTA DE RUPTURA:\n` +
            `${rupturaData.produtosEmRuptura.length} produto(s) com estoque abaixo do minimo.\n` +
            `(Ja existem itens de reposicao no mapa)`
          );
        }
      } else {
        setProdutosEmRuptura([]);
        alert("Alteracoes salvas com sucesso!");
      }
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setSalvando(false);
    }
  };

  // Excluir produto do mapa
  const handleExcluirDoMapa = (nomeProduto: string) => {
    setMapa(prev => prev.filter(item => item.nome !== nomeProduto));
    setProdutosNaoCadastrados(prev => prev.filter(nome => nome !== nomeProduto));
    setAlterado(true);
  };

  // Expandir formulário inline para cadastro rápido
  const handleExpandirCadastro = (nomeProduto: string) => {
    // Verificar se já existe na lista de cadastro
    const jaExiste = produtosParaCadastrar.find(p => p.nome === nomeProduto);
    if (jaExiste) {
      // Toggle expandido
      setProdutosParaCadastrar(prev => prev.map(p => 
        p.nome === nomeProduto ? { ...p, expandido: !p.expandido } : p
      ));
    } else {
      // Adicionar novo produto para cadastrar
      const codigoSugerido = proximoCodigo + produtosParaCadastrar.length;
      setProdutosParaCadastrar(prev => [...prev, {
        nome: nomeProduto,
        codigo: codigoSugerido.toString(),
        unidade: 'kg',
        pesoUnitario: '0.05',
        tipoEmbalagem: 'Saco plástico',
        quantidadePorEmbalagem: 10,
        expandido: true,
      }]);
    }
  };
  
  // Atualizar campo de produto para cadastrar
  const handleUpdateProdutoCadastro = (nome: string, campo: string, valor: any) => {
    setProdutosParaCadastrar(prev => prev.map(p => 
      p.nome === nome ? { ...p, [campo]: valor } : p
    ));
  };
  
  // Cadastrar um produto individual
  const handleCadastrarProdutoIndividual = async (produto: ProdutoParaCadastrar) => {
    try {
      await cadastrarProdutoMutation.mutateAsync({
        codigoProduto: produto.codigo,
        nome: produto.nome,
        unidade: produto.unidade,
        pesoUnitario: produto.pesoUnitario,
        tipoEmbalagem: produto.tipoEmbalagem,
        quantidadePorEmbalagem: produto.quantidadePorEmbalagem,
        categoriaId: produto.categoriaId,
        destinoId: produto.destinoId,
        saldoEstoque: '0',
        estoqueMinimoDias: 4,
        ativo: true,
      });
      
      // Remover da lista de não cadastrados e da lista de cadastro
      setProdutosNaoCadastrados(prev => prev.filter(n => n !== produto.nome));
      setProdutosParaCadastrar(prev => prev.filter(p => p.nome !== produto.nome));
      utils.produtos.list.invalidate();
      
      // Se não há mais produtos para cadastrar, fechar modal e continuar
      if (produtosNaoCadastrados.length === 1) {
        setShowModalCadastro(false);
        await continuarSalvamento();
      }
    } catch (err: any) {
      alert('Erro ao cadastrar: ' + err.message);
    }
  };
  
  // Cadastrar todos os produtos em lote
  const handleCadastrarTodosEmLote = async () => {
    setCadastrandoLote(true);
    try {
      for (const produto of produtosParaCadastrar) {
        await cadastrarProdutoMutation.mutateAsync({
          codigoProduto: produto.codigo,
          nome: produto.nome,
          unidade: produto.unidade,
          pesoUnitario: produto.pesoUnitario,
          tipoEmbalagem: produto.tipoEmbalagem,
          quantidadePorEmbalagem: produto.quantidadePorEmbalagem,
          categoriaId: produto.categoriaId,
          destinoId: produto.destinoId,
          saldoEstoque: '0',
          estoqueMinimoDias: 4,
          ativo: true,
        });
      }
      
      // Limpar listas e fechar modal
      setProdutosNaoCadastrados([]);
      setProdutosParaCadastrar([]);
      setShowModalCadastro(false);
      utils.produtos.list.invalidate();
      
      // Continuar salvamento
      await continuarSalvamento();
    } catch (err: any) {
      alert('Erro ao cadastrar em lote: ' + err.message);
    } finally {
      setCadastrandoLote(false);
    }
  };

  // Salvar alterações (rascunho) - com validação de cadastro
  const handleSalvarAlteracoes = async () => {
    if (mapa.length === 0) {
      alert("Não há itens para salvar.");
      return;
    }

    setSalvando(true);
    try {
      // 1. Validar cadastro dos produtos
      const nomesProdutos = Array.from(new Set(mapa.map(item => item.nome)));
      const validacao = await validarCadastroMutation.mutateAsync({ nomesProdutos });
      
      if (validacao.totalNaoCadastrados > 0) {
        // Mostrar modal com produtos não cadastrados
        setProdutosNaoCadastrados(validacao.produtosNaoCadastrados);
        setProximoCodigo(validacao.proximoCodigo);
        setShowModalCadastro(true);
        setSalvando(false);
        return;
      }
      
      // 2. Se todos cadastrados, continuar salvamento
      await continuarSalvamento();
    } catch (err: any) {
      alert("Erro ao validar: " + err.message);
      setSalvando(false);
    }
  };

  // Salvar mapa com nome em localStorage
  const handleSalvarMapaComNome = () => {
    if (mapa.length === 0) {
      alert("Não há itens para salvar como Mapa Base.");
      return;
    }
    setNomeNovoMapa("");
    setEditandoMapaId(null);
    setShowModalNomear(true);
  };

  // Confirmar salvamento de mapa com nome
  const handleConfirmarSalvarMapa = () => {
    if (!nomeNovoMapa.trim()) {
      alert("Por favor, digite um nome para o mapa.");
      return;
    }

    if (editandoMapaId) {
      // Renomear mapa existente
      atualizarNomeMapa(editandoMapaId, nomeNovoMapa);
      alert(`Mapa renomeado para "${nomeNovoMapa}"!`);
    } else {
      // Salvar novo mapa
      salvarMapa(nomeNovoMapa, mapa);
      alert(`Mapa "${nomeNovoMapa}" salvo com sucesso!`);
    }
    
    setShowModalNomear(false);
    setNomeNovoMapa("");
    setEditandoMapaId(null);
  };

  // Carregar mapa salvo
  const handleCarregarMapaSalvo = (id: string) => {
    const mapaCarregado = carregarMapa(id);
    if (mapaCarregado) {
      setMapa(mapaCarregado.data);
      setImportacao(null);
      setAlterado(false);
    }
  };

  // Deletar mapa salvo
  const handleDeletarMapa = (id: string) => {
    const mapaParaDeletar = mapas.find(m => m.id === id);
    if (mapaParaDeletar && window.confirm(`Deseja deletar o mapa "${mapaParaDeletar.nome}"?`)) {
      deletarMapa(id);
      alert(`Mapa "${mapaParaDeletar.nome}" deletado!`);
    }
  };

  // Renomear mapa
  const handleRenomearMapa = (id: string) => {
    const mapaParaRenomear = mapas.find(m => m.id === id);
    if (mapaParaRenomear) {
      setEditandoMapaId(id);
      setNomeNovoMapa(mapaParaRenomear.nome);
      setShowModalNomear(true);
    }
  };

  // Salvar como Mapa Base (banco de dados)
  const handleSalvarMapaBase = async () => {
    if (mapa.length === 0) {
      alert("Não há itens para salvar como Mapa Base.");
      return;
    }

    const confirmar = window.confirm(
      "Deseja salvar o mapa atual como Mapa Base?\n\n" +
      "O Mapa Base anterior será substituído."
    );

    if (!confirmar) return;

    setSalvando(true);
    try {
      const itensParaSalvar = mapa.map(item => ({
        produtoId: item.produtoId || 0,
        codigoProduto: item.codigo,
        nomeProduto: item.nome,
        unidade: item.unidade,
        quantidade: item.qtdPlanejada.toString(),
        percentualAjuste: item.percentualAjuste,
        diaProduzir: item.diaProduzir,
        equipe: item.equipe,
      }));

      await salvarMapaBaseMutation.mutateAsync({ itens: itensParaSalvar });
      alert("Mapa Base salvo com sucesso!");
      
      // Carregar automaticamente o Mapa Base após salvar
      setTimeout(async () => {
        try {
          const result = await refetchMapaBase();
          if (result.data?.success && result.data.mapa.length > 0) {
            setMapa(result.data.mapa);
            setImportacao(null);
            setAlterado(false);
          }
        } catch (err: any) {
          console.error("Erro ao carregar Mapa Base automaticamente:", err);
        }
      }, 500);
    } catch (err: any) {
      alert("Erro ao salvar Mapa Base: " + err.message);
    } finally {
      setSalvando(false);
    }
  };

  // Alternar checkbox de item de ruptura
  const handleToggleItemRuptura = (itemId: string) => {
    setItensRupturaConfirmados(prev => {
      const novo = new Set(prev);
      if (novo.has(itemId)) {
        novo.delete(itemId);
      } else {
        novo.add(itemId);
      }
      return novo;
    });
  };

  // Confirmar e adicionar itens de ruptura selecionados
  const handleConfirmarItensRuptura = async () => {
    setRupturaEmProcessamento(true);
    try {
      // Filtrar apenas os itens confirmados
      const itensSelecionados = itensRupturaParaConfirmar.filter(
        (item: any) => itensRupturaConfirmados.has(item.id || item.codigoProduto)
      );

      // Se houver itens selecionados, adicionar ao mapa
      if (itensSelecionados.length > 0) {
        // Preparar itens para adicionar ao mapa
        const novosItens = itensSelecionados.map((item: any) => ({
          id: Math.random(),
          codigo: item.codigoProduto,
          nome: item.nomeProduto,
          unidade: item.unidade || 'kg',
          qtdImportada: 0,
          percentualAjuste: 0,
          qtdPlanejada: item.quantidade || 0,
          equipe: 'Reposição',
          diaProduzir: 2, // Segunda-feira
          produtoId: item.produtoId,
          isReposicao: true,
        }));

        // Adicionar ao mapa
        setMapa(prev => [...prev, ...novosItens]);
        setAlterado(true);
      }

      // Fechar modal
      setShowModalRuptura(false);
      setItensRupturaParaConfirmar([]);
      setItensRupturaConfirmados(new Set());

      const nomesAdicionados = itensSelecionados.map((i: any) => i.nomeProduto).join('\n- ');
      alert(
        `Alterações salvas com sucesso!\n\n` +
        `${itensSelecionados.length} item(ns) de reposição adicionado(s):\n- ${nomesAdicionados}`
      );
    } catch (err: any) {
      alert('Erro ao adicionar itens de ruptura: ' + err.message);
    } finally {
      setRupturaEmProcessamento(false);
    }
  };

  // Cancelar confirmação de ruptura
  const handleCancelarRuptura = () => {
    setShowModalRuptura(false);
    setItensRupturaParaConfirmar([]);
    setItensRupturaConfirmados(new Set());
    alert('Nenhum item de reposição foi adicionado.');
  };

  // Carregar Mapa Base
  const handleCarregarMapaBase = async () => {
    if (alterado) {
      const confirmar = window.confirm(
        "Existem alterações não salvas. Deseja descartá-las e carregar o Mapa Base?"
      );
      if (!confirmar) return;
    }

    try {
      const result = await refetchMapaBase();
      if (result.data?.success && result.data.mapa.length > 0) {
        setMapa(result.data.mapa);
        setImportacao(null);
        setAlterado(false);
        alert("Mapa Base carregado com sucesso!");
      } else {
        alert("Nenhum Mapa Base encontrado.");
      }
    } catch (err: any) {
      alert("Erro ao carregar Mapa Base: " + err.message);
    }
  };

  // Processar PCP manualmente
  const handleProcessarPCP = async () => {
    if (mapa.length === 0) {
      alert("Não há itens no mapa para processar.");
      return;
    }
    
    const confirmar = window.confirm(
      "Deseja processar o PCP com os dados atuais do mapa?\n\n" +
      "Isso irá gerar as fichas de pré-pesagem e produção."
    );
    
    if (!confirmar) return;
    
    setProcessando(true);
    try {
      // Redirecionar para a página de processamento
      setLocation("/processamento-pcp");
    } catch (err: any) {
      alert("Erro ao processar: " + err.message);
    } finally {
      setProcessando(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: 20, textAlign: "center" }}>
        <p>Carregando mapa de produção...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <a href="/" style={{ color: '#666', textDecoration: 'none', fontSize: 14, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
            ← Voltar ao Início
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <h1 style={{ margin: 0 }}>Mapa de Produção</h1>
            {mapaAtualId && (
              <Badge className="bg-blue-500 text-white text-sm py-1 px-3">
                📌 {obterNomeMapaAtual()}
              </Badge>
            )}
          </div>
          {/* Mensagens removidas */}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {/* Dropdown de Mapas Salvos */}
          {isLoaded && mapas.length > 0 && (
            <div style={{ position: "relative" }}>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleCarregarMapaSalvo(e.target.value);
                    e.target.value = "";
                  }
                }}
                style={{
                  padding: "10px 12px",
                  fontSize: 14,
                  background: "#f0f0f0",
                  border: "1px solid #ddd",
                  borderRadius: 6,
                  cursor: "pointer",
                  minWidth: 200,
                }}
              >
                <option value="">📂 Carregar Mapa Salvo...</option>
                {mapas.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome} ({new Date(m.updatedAt).toLocaleDateString('pt-BR')})
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* Botão Deletar Mapa Salvo */}
          {isLoaded && mapaAtualId && (
            <button
              onClick={() => handleDeletarMapa(mapaAtualId)}
              style={{
                padding: "10px 12px",
                fontSize: 14,
                background: "#F5E6D3",
                color: "#333",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
              }}
              title="Deletar mapa selecionado"
            >
              🗑 Deletar
            </button>
          )}
          
          {/* Botão Salvar Modelo */}
          {mapa.length > 0 && (
            <button
              onClick={handleSalvarMapaComNome}
              style={{
                padding: "10px 16px",
                fontSize: 14,
                background: "#F5E6D3",
                color: "#333",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              💾 Salvar Modelo
            </button>
          )}
          
          {/* Botão Carregar Mapa Base - OCULTO */}
          {false && hasMapaBase && (
            <button
              onClick={handleCarregarMapaBase}
              disabled={salvando}
              style={{
                padding: "10px 16px",
                fontSize: 14,
                background: "#3498db",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: salvando ? "not-allowed" : "pointer",
              }}
            >
              📂 Carregar Mapa Base
            </button>
          )}
          {/* Botão Adicionar Produto */}
          <button
            onClick={() => setShowAdicionarProduto(true)}
            style={{
              padding: "10px 16px",
              fontSize: 14,
              background: "#F5E6D3",
              color: "#333",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            ➡ Adicionar Produto
          </button>
          {/* Botão Salvar Alterações */}
          {mapa.length > 0 && (
            <button
              onClick={handleSalvarAlteracoes}
              disabled={salvando}
              style={{
                padding: "10px 16px",
                fontSize: 14,
                background: "#F5E6D3",
                color: "#333",
                border: "none",
                borderRadius: 6,
                cursor: salvando ? "not-allowed" : "pointer",
              }}
            >
              {salvando ? "Salvando..." : "💾 Salvar Alterações"}
            </button>
          )}
          {/* Botão Salvar como Mapa Base */}
          {mapa.length > 0 && (
            <button
              onClick={handleSalvarMapaBase}
              disabled={salvando}
              style={{
                padding: "10px 16px",
                fontSize: 14,
                background: "#F5E6D3",
                color: "#333",
                border: "none",
                borderRadius: 6,
                cursor: salvando ? "not-allowed" : "pointer",
              }}
            >
              📁 Salvar como Mapa Base
            </button>
          )}
          {/* Botão Processar PCP */}
          {mapa.length > 0 && (
            <button
              onClick={handleProcessarPCP}
              disabled={processando}
              style={{
                padding: "12px 24px",
                fontSize: 16,
                fontWeight: "bold",
                background: processando ? "#999" : "#F5E6D3",
                color: "#333",
                border: "none",
                borderRadius: 8,
                cursor: processando ? "not-allowed" : "pointer",
              }}
            >
              {processando ? "Processando..." : "▶ Processar PCP"}
            </button>
          )}
        </div>
      </div>

      {erro && (
        <div style={{ color: "red", padding: 15, background: "#fee", marginBottom: 20 }}>
          {erro}
        </div>
      )}

      {/* Gestão de Feriados */}
      <div
        style={{
          marginBottom: 20,
          padding: 15,
          background: "#f9f9f9",
          borderRadius: 8,
          border: "1px solid #ddd",
        }}
      >
        <strong>Feriados:</strong>
        <div style={{ display: "flex", gap: 20, marginTop: 10, flexWrap: "wrap" }}>
          {DIAS_SEMANA.map((dia) => (
            <label key={dia.num} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <input
                type="checkbox"
                checked={feriados.includes(dia.num)}
                onChange={() => handleFeriadoToggle(dia.num)}
              />
              Dia {dia.num} ({dia.nome.substring(0, 3)})
            </label>
          ))}
        </div>
      </div>

      {/* Grid de Produção Agrupado por Dia */}
      {mapa.length > 0 ? (
        <div>
          {DIAS_SEMANA.map((dia) => {
            const itensGrupo = gruposPorDia[dia.num];
            const totalGrupo = calcularTotalGrupo(itensGrupo);
            const isFeriado = feriados.includes(dia.num);

            return (
              <div
                key={dia.num}
                style={{
                  marginBottom: 30,
                  border: isFeriado ? "2px solid #e74c3c" : "1px solid #ddd",
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                {/* Cabeçalho do Grupo */}
                <div
                  style={{
                    padding: "12px 15px",
                    background: isFeriado ? "#e74c3c" : "#c4a35a",
                    color: "#fff",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontWeight: "bold", fontSize: 16 }}>
                    Dia {dia.num} - {dia.nome}
                    {isFeriado && " (FERIADO)"}
                  </span>
                  <span style={{ fontSize: 14 }}>
                    {itensGrupo.length} itens | Total: <strong>{totalGrupo.toFixed(2)}</strong>
                  </span>
                </div>

                {/* Tabela do Grupo */}
                {itensGrupo.length > 0 ? (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                    <thead>
                      <tr style={{ backgroundColor: isFeriado ? "#fadbd8" : "#f5f0e1" }}>
                        <th style={{ padding: 8, textAlign: "left", borderBottom: "1px solid #ddd" }}>
                          Código
                        </th>
                        <th style={{ padding: 8, textAlign: "left", borderBottom: "1px solid #ddd" }}>
                          Nome
                        </th>
                        <th style={{ padding: 8, textAlign: "center", borderBottom: "1px solid #ddd" }}>
                          Unid.
                        </th>
                        <th style={{ padding: 8, textAlign: "right", borderBottom: "1px solid #ddd" }}>
                          Qtd Importada
                        </th>
                        <th style={{ padding: 8, textAlign: "center", borderBottom: "1px solid #ddd" }}>
                          % Ajuste
                        </th>
                        <th style={{ padding: 8, textAlign: "right", borderBottom: "1px solid #ddd" }}>
                          Qtd Planejada
                        </th>
                        <th style={{ padding: 8, textAlign: "center", borderBottom: "1px solid #ddd" }}>
                          Equipe
                        </th>
                        <th style={{ padding: 8, textAlign: "center", borderBottom: "1px solid #ddd" }}>
                          Mover para
                        </th>
                        <th style={{ padding: 8, textAlign: "center", borderBottom: "1px solid #ddd", width: 60 }}>
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {itensGrupo.map((item, idx) => {
                        const emRuptura = produtosEmRuptura.includes(item.codigo);
                        const isReposicao = item.isReposicao || item.nome.includes('[REPOSIÇÃO]');
                        
                        return (
                        <tr
                          key={item.id}
                          style={{
                            backgroundColor: emRuptura || isReposicao
                              ? "#ffebee"
                              : isFeriado
                              ? "#fdd"
                              : idx % 2 === 0
                              ? "#fff"
                              : "#fafafa",
                            borderLeft: emRuptura || isReposicao ? "4px solid #e74c3c" : "none",
                          }}
                        >
                          <td style={{ padding: 8, borderBottom: "1px solid #eee", color: emRuptura ? "#c0392b" : "inherit", fontWeight: emRuptura ? "bold" : "normal" }}>
                            {item.codigo}
                          </td>
                          <td style={{ padding: 8, borderBottom: "1px solid #eee", color: emRuptura || isReposicao ? "#c0392b" : "inherit", fontWeight: emRuptura || isReposicao ? "bold" : "normal" }}>
                            {item.nome}
                            {emRuptura && !isReposicao && <span style={{ marginLeft: 8, fontSize: 11, background: "#e74c3c", color: "#fff", padding: "2px 6px", borderRadius: 4 }}>RUPTURA</span>}
                          </td>
                          <td style={{ padding: 8, textAlign: "center", borderBottom: "1px solid #eee" }}>
                            {item.unidade}
                          </td>
                          <td style={{ padding: 8, textAlign: "right", borderBottom: "1px solid #eee" }}>
                            {item.qtdImportada.toFixed(2)}
                          </td>
                          <td style={{ padding: 8, textAlign: "center", borderBottom: "1px solid #eee" }}>
                            <select
                              value={item.percentualAjuste}
                              onChange={(e) =>
                                handlePercentualChange(item.id, parseInt(e.target.value))
                              }
                              style={{
                                padding: "4px 8px",
                                borderRadius: 4,
                                border: "1px solid #ccc",
                                backgroundColor: "#fff",
                                cursor: "pointer",
                                minWidth: 70,
                              }}
                            >
                              {PERCENTUAIS.map((p) => (
                                <option key={p.valor} value={p.valor}>
                                  {p.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td
                            style={{
                              padding: 8,
                              textAlign: "right",
                              borderBottom: "1px solid #eee",
                            }}
                          >
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.qtdPlanejada}
                              onChange={(e) => handleQtdPlanejadaChange(item.id, parseFloat(e.target.value) || 0)}
                              style={{
                                width: 80,
                                padding: 4,
                                borderRadius: 4,
                                border: "1px solid #ccc",
                                textAlign: "right",
                                fontWeight: "bold",
                                color: item.qtdPlanejada === 0 ? "#999" : "#333",
                              }}
                            />
                          </td>
                          <td style={{ padding: 8, textAlign: "center", borderBottom: "1px solid #eee" }}>
                            <select
                              value={item.equipe}
                              onChange={(e) => handleEquipeChange(item.id, e.target.value)}
                              style={{ padding: 4, borderRadius: 4 }}
                            >
                              {EQUIPES.map((eq) => (
                                <option key={eq} value={eq}>
                                  {eq}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: 8, textAlign: "center", borderBottom: "1px solid #eee" }}>
                            <select
                              value={item.diaProduzir}
                              onChange={(e) => handleDiaChange(item.id, parseInt(e.target.value))}
                              style={{
                                padding: 4,
                                borderRadius: 4,
                              }}
                            >
                              {DIAS_SEMANA.map((d) => (
                                <option key={d.num} value={d.num}>
                                  Dia {d.num}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: 8, textAlign: "center", borderBottom: "1px solid #eee" }}>
                            <button
                              onClick={() => {
                                if (confirm(`Excluir "${item.nome}" do mapa?`)) {
                                  setMapa(prev => prev.filter(m => m.id !== item.id));
                                  setAlterado(true);
                                }
                              }}
                              style={{
                                padding: "4px 8px",
                                background: "#e74c3c",
                                color: "white",
                                border: "none",
                                borderRadius: 4,
                                cursor: "pointer",
                                fontSize: 12,
                              }}
                              title="Excluir produto do mapa"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: 20, textAlign: "center", color: "#999", background: "#fafafa" }}>
                    Nenhum item programado para este dia
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        !erro && <p style={{ color: "#666" }}>Nenhum dado disponível. Faça uma importação primeiro.</p>
      )}

      {/* Modal de Produtos Não Cadastrados - Com Formulário Inline */}
      {showModalCadastro && produtosNaoCadastrados.length > 0 && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 24,
            maxWidth: 900,
            width: '95%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}>
            <h2 style={{ margin: '0 0 8px 0', color: '#c0392b', display: 'flex', alignItems: 'center', gap: 8 }}>
              ⚠️ Produtos Não Cadastrados ({produtosNaoCadastrados.length})
            </h2>
            <p style={{ color: '#666', marginBottom: 16 }}>
              Clique em "Cadastrar" para expandir o formulário e preencher os dados.
              Após preencher todos, clique em "Cadastrar Todos" para salvar em lote.
            </p>
            
            <div style={{ marginBottom: 16 }}>
              {produtosNaoCadastrados.map((nome, idx) => {
                const produtoCadastro = produtosParaCadastrar.find(p => p.nome === nome);
                return (
                  <div key={idx} style={{
                    backgroundColor: idx % 2 === 0 ? '#fff3cd' : '#ffeeba',
                    borderRadius: 8,
                    marginBottom: 8,
                    overflow: 'hidden',
                  }}>
                    {/* Linha principal */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                    }}>
                      <span style={{ fontWeight: 500, color: '#856404' }}>{nome}</span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => handleExpandirCadastro(nome)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: produtoCadastro?.expandido ? '#2980b9' : '#27ae60',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: 13,
                          }}
                        >
                          {produtoCadastro?.expandido ? '▲ Recolher' : '▼ Cadastrar'}
                        </button>
                        <button
                          onClick={() => handleExcluirDoMapa(nome)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#e74c3c',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: 13,
                          }}
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                    
                    {/* Formulário expandido */}
                    {produtoCadastro?.expandido && (
                      <div style={{
                        padding: '16px',
                        backgroundColor: '#fff',
                        borderTop: '1px solid #ddd',
                      }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                          <div>
                            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Código *</label>
                            <input
                              type="text"
                              value={produtoCadastro.codigo}
                              onChange={(e) => handleUpdateProdutoCadastro(nome, 'codigo', e.target.value)}
                              style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Unidade *</label>
                            <select
                              value={produtoCadastro.unidade}
                              onChange={(e) => handleUpdateProdutoCadastro(nome, 'unidade', e.target.value)}
                              style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
                            >
                              <option value="kg">kg</option>
                              <option value="un">un</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Peso Unitário (kg) *</label>
                            <input
                              type="number"
                              step="0.00001"
                              value={produtoCadastro.pesoUnitario}
                              onChange={(e) => handleUpdateProdutoCadastro(nome, 'pesoUnitario', e.target.value)}
                              style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Tipo Embalagem *</label>
                            <input
                              type="text"
                              value={produtoCadastro.tipoEmbalagem}
                              onChange={(e) => handleUpdateProdutoCadastro(nome, 'tipoEmbalagem', e.target.value)}
                              style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Qtd/Embalagem *</label>
                            <input
                              type="number"
                              min="1"
                              value={produtoCadastro.quantidadePorEmbalagem}
                              onChange={(e) => handleUpdateProdutoCadastro(nome, 'quantidadePorEmbalagem', parseInt(e.target.value) || 1)}
                              style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Categoria</label>
                            <select
                              value={produtoCadastro.categoriaId || ''}
                              onChange={(e) => handleUpdateProdutoCadastro(nome, 'categoriaId', e.target.value ? parseInt(e.target.value) : undefined)}
                              style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
                            >
                              <option value="">Selecione</option>
                              {categorias?.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.nome}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Destino</label>
                            <select
                              value={produtoCadastro.destinoId || ''}
                              onChange={(e) => handleUpdateProdutoCadastro(nome, 'destinoId', e.target.value ? parseInt(e.target.value) : undefined)}
                              style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
                            >
                              <option value="">Selecione</option>
                              {destinos?.map(dest => (
                                <option key={dest.id} value={dest.id}>{dest.nome}</option>
                              ))}
                            </select>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <button
                              onClick={() => handleCadastrarProdutoIndividual(produtoCadastro)}
                              disabled={cadastrarProdutoMutation.isPending}
                              style={{
                                width: '100%',
                                padding: '8px 16px',
                                backgroundColor: '#27ae60',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 4,
                                cursor: 'pointer',
                                fontWeight: 500,
                              }}
                            >
                              {cadastrarProdutoMutation.isPending ? 'Salvando...' : '✓ Salvar'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, borderTop: '1px solid #eee', paddingTop: 16 }}>
              <button
                onClick={() => {
                  setShowModalCadastro(false);
                  setProdutosParaCadastrar([]);
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#95a5a6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                Fechar
              </button>
              
              {produtosParaCadastrar.length > 0 && (
                <button
                  onClick={handleCadastrarTodosEmLote}
                  disabled={cadastrandoLote}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#2980b9',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  {cadastrandoLote ? 'Cadastrando...' : `📦 Cadastrar Todos (${produtosParaCadastrar.length})`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Modal Adicionar Produto */}
      {showAdicionarProduto && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: '#fff',
            padding: 24,
            borderRadius: 8,
            maxWidth: 500,
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
          }}>
            <h3 style={{ marginTop: 0, color: '#27ae60' }}>➕ Adicionar Produto ao Mapa</h3>
            <p style={{ color: '#666', fontSize: 14 }}>
              Selecione um produto cadastrado para adicionar ao mapa de produção.
            </p>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Produto *</label>
              <select
                value={produtoSelecionado}
                onChange={(e) => setProdutoSelecionado(e.target.value)}
                style={{ width: '100%', padding: 10, borderRadius: 4, border: '1px solid #ccc' }}
              >
                <option value="">Selecione um produto...</option>
                {produtosCadastrados?.filter(p => !mapa.some(m => m.codigo === p.codigoProduto && m.diaProduzir === diaAdicionarProduto)).map(p => (
                  <option key={p.id} value={p.id}>
                    {p.codigoProduto} - {p.nome} ({p.unidade})
                  </option>
                ))}
              </select>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Dia de Produção *</label>
              <select
                value={diaAdicionarProduto}
                onChange={(e) => setDiaAdicionarProduto(parseInt(e.target.value))}
                style={{ width: '100%', padding: 10, borderRadius: 4, border: '1px solid #ccc' }}
              >
                {DIAS_SEMANA.map(d => (
                  <option key={d.num} value={d.num}>Dia {d.num} - {d.nome}</option>
                ))}
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowAdicionarProduto(false);
                  setProdutoSelecionado('');
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#95a5a6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!produtoSelecionado) {
                    alert('Selecione um produto');
                    return;
                  }
                  const produto = produtosCadastrados?.find(p => p.id === parseInt(produtoSelecionado));
                  if (!produto) return;
                  
                  const novoItem: ItemMapa = {
                    id: Date.now(),
                    codigo: produto.codigoProduto,
                    nome: produto.nome,
                    unidade: produto.unidade,
                    qtdImportada: 0,
                    percentualAjuste: 0,
                    qtdPlanejada: 0,
                    diaProduzir: diaAdicionarProduto,
                    equipe: 'Equipe 1',
                    produtoId: produto.id,
                  };
                  
                  setMapa(prev => [...prev, novoItem]);
                  setAlterado(true);
                  setShowAdicionarProduto(false);
                  setProdutoSelecionado('');
                }}
                disabled={!produtoSelecionado}
                style={{
                  padding: '10px 20px',
                  backgroundColor: produtoSelecionado ? '#27ae60' : '#bdc3c7',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: produtoSelecionado ? 'pointer' : 'not-allowed',
                }}
              >
                ➕ Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
      
      <ModalNomeacaoMapa
        open={showModalNomear}
        onOpenChange={setShowModalNomear}
        editandoMapaId={editandoMapaId}
        nomeNovoMapa={nomeNovoMapa}
        setNomeNovoMapa={setNomeNovoMapa}
        onConfirmar={handleConfirmarSalvarMapa}
      />
      
      {/* Modal de Confirmacao de Ruptura */}
      {showModalRuptura && itensRupturaParaConfirmar.length > 0 && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: '#fff',
            padding: 24,
            borderRadius: 8,
            maxWidth: 600,
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
          }}>
            <h3 style={{ marginTop: 0, color: '#e74c3c' }}>Itens de Reposicao Sugeridos</h3>
            <p style={{ color: '#666', marginBottom: 20 }}>
              Selecione os itens que deseja adicionar ao mapa:
            </p>
            
            <div style={{ marginBottom: 20, maxHeight: '300px', overflowY: 'auto' }}>
              {itensRupturaParaConfirmar.map((item: any, index: number) => {
                const itemId = item.id || item.codigoProduto || index.toString();
                const isChecked = itensRupturaConfirmados.has(itemId);
                
                return (
                  <div key={itemId} style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: 12,
                    marginBottom: 8,
                    backgroundColor: '#f9f9f9',
                    borderRadius: 6,
                    border: '1px solid #eee',
                  }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleItemRuptura(itemId)}
                      style={{ marginRight: 12, cursor: 'pointer', width: 18, height: 18 }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', color: '#333' }}>
                        {item.nomeProduto} ({item.codigoProduto})
                      </div>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        Quantidade: {item.quantidade} {item.unidade || 'kg'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div style={{
              display: 'flex',
              gap: 10,
              justifyContent: 'flex-end',
              paddingTop: 15,
              borderTop: '1px solid #eee',
            }}>
              <button
                onClick={handleCancelarRuptura}
                disabled={rupturaEmProcessamento}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#bdc3c7',
                  color: '#333',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarItensRuptura}
                disabled={rupturaEmProcessamento || itensRupturaConfirmados.size === 0}
                style={{
                  padding: '10px 20px',
                  backgroundColor: itensRupturaConfirmados.size > 0 ? '#27ae60' : '#bdc3c7',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: itensRupturaConfirmados.size > 0 ? 'pointer' : 'not-allowed',
                  fontWeight: 500,
                }}
              >
                {rupturaEmProcessamento ? 'Processando...' : `Confirmar (${itensRupturaConfirmados.size})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
