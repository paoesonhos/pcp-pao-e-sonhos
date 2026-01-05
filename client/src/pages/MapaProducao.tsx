import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";

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

export default function MapaProducao() {
  const [mapa, setMapa] = useState<ItemMapa[]>([]);
  const [feriados, setFeriados] = useState<number[]>([]);
  const [importacao, setImportacao] = useState<any>(null);
  const [erro, setErro] = useState("");

  const { data, isLoading, error } = trpc.mapaProducao.gerarMapa.useQuery();

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
  };

  // Atualizar equipe
  const handleEquipeChange = (id: number, novaEquipe: string) => {
    setMapa((prev) =>
      prev.map((item) => (item.id === id ? { ...item, equipe: novaEquipe } : item))
    );
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

  if (isLoading) {
    return (
      <div style={{ padding: 20, textAlign: "center" }}>
        <p>Carregando mapa de produção...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 1400, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 10 }}>Mapa de Produção</h1>

      {importacao && (
        <p style={{ color: "#666", marginBottom: 20 }}>
          Importação #{importacao.id} - Data Ref: {importacao.dataReferencia}
        </p>
      )}

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
                      </tr>
                    </thead>
                    <tbody>
                      {itensGrupo.map((item, idx) => (
                        <tr
                          key={item.id}
                          style={{
                            backgroundColor: isFeriado
                              ? "#fdd"
                              : idx % 2 === 0
                              ? "#fff"
                              : "#fafafa",
                          }}
                        >
                          <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                            {item.codigo}
                          </td>
                          <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                            {item.nome}
                          </td>
                          <td style={{ padding: 8, textAlign: "center", borderBottom: "1px solid #eee" }}>
                            {item.unidade}
                          </td>
                          <td style={{ padding: 8, textAlign: "right", borderBottom: "1px solid #eee" }}>
                            {item.qtdImportada.toFixed(2)}
                          </td>
                          <td style={{ padding: 8, textAlign: "center", borderBottom: "1px solid #eee" }}>
                            <input
                              type="number"
                              value={item.percentualAjuste}
                              onChange={(e) =>
                                handlePercentualChange(item.id, parseFloat(e.target.value) || 0)
                              }
                              style={{
                                width: 60,
                                padding: 4,
                                textAlign: "center",
                                border: "1px solid #ccc",
                                borderRadius: 4,
                              }}
                            />
                            %
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
                        </tr>
                      ))}
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
    </div>
  );
}
