import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

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

      setAlterado(false);
      
      // Executar validação de ruptura após salvar
      const { data: rupturaData } = await validarRuptura();
      
      if (rupturaData?.produtosEmRuptura && rupturaData.produtosEmRuptura.length > 0) {
        // Atualizar lista de produtos em ruptura
        setProdutosEmRuptura(rupturaData.produtosEmRuptura.map((p: any) => p.codigoProduto));
        
        // Se houve itens adicionados, atualizar o mapa
        if (rupturaData.itensAdicionados && rupturaData.itensAdicionados.length > 0) {
          // Recarregar o mapa para incluir os novos itens de reposição
          const novoRascunho = await utils.mapaProducao.carregarRascunho.fetch();
          if (novoRascunho?.mapa) {
            setMapa(novoRascunho.mapa);
          }
          
          const nomesAdicionados = rupturaData.itensAdicionados.map((i: any) => i.nomeProduto).join('\n- ');
          alert(
            `Alterações salvas com sucesso!\n\n` +
            `⚠️ ALERTA DE RUPTURA:\n` +
            `${rupturaData.produtosEmRuptura.length} produto(s) com estoque abaixo do mínimo.\n\n` +
            `Itens adicionados automaticamente para segunda-feira:\n- ${nomesAdicionados}`
          );
        } else {
          alert(
            `Alterações salvas com sucesso!\n\n` +
            `⚠️ ALERTA DE RUPTURA:\n` +
            `${rupturaData.produtosEmRuptura.length} produto(s) com estoque abaixo do mínimo.\n` +
            `(Já existem itens de reposição no mapa)`
          );
        }
      } else {
        setProdutosEmRuptura([]);
        alert("Alterações salvas com sucesso!");
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

  // Salvar como Mapa Base
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
    } catch (err: any) {
      alert("Erro ao salvar Mapa Base: " + err.message);
    } finally {
      setSalvando(false);
    }
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
          <h1 style={{ marginBottom: 10 }}>Mapa de Produção</h1>
          {importacao ? (
            <p style={{ color: "#666", margin: 0 }}>
              Importação #{importacao.id} - Data Ref: {importacao.dataReferencia}
              {importacao.createdAt && (
                <span style={{ marginLeft: 10, color: "#27ae60" }}>
                  📅 Importado em: {new Date(importacao.createdAt).toLocaleString('pt-BR', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              )}
              {alterado && <span style={{ color: "#e67e22", marginLeft: 10 }}>● Alterações não salvas</span>}
            </p>
          ) : mapa.length > 0 && (
            <p style={{ color: "#3498db", margin: 0 }}>
              📂 Mapa Base carregado
              {alterado && <span style={{ color: "#e67e22", marginLeft: 10 }}>● Alterações não salvas</span>}
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {/* Botão Carregar Mapa Base */}
          {hasMapaBase && (
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
          {/* Botão Salvar Alterações */}
          {mapa.length > 0 && (
            <button
              onClick={handleSalvarAlteracoes}
              disabled={salvando}
              style={{
                padding: "10px 16px",
                fontSize: 14,
                background: alterado ? "#e67e22" : "#bdc3c7",
                color: "white",
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
                background: "#9b59b6",
                color: "white",
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
                background: processando ? "#999" : "#27ae60",
                color: "white",
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
                              fontWeight: "bold",
                              color: item.qtdPlanejada === 0 ? "#999" : "#333",
                            }}
                          >
                            {item.qtdPlanejada.toFixed(2)}
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
    </div>
  );
}
