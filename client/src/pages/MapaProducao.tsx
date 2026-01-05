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
  { num: 2, nome: "Seg" },
  { num: 3, nome: "Ter" },
  { num: 4, nome: "Qua" },
  { num: 5, nome: "Qui" },
  { num: 6, nome: "Sex" },
  { num: 7, nome: "Sáb" },
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

  // Calcular totais por dia
  const calcularTotaisPorDia = () => {
    const totais: Record<number, number> = { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
    mapa.forEach((item) => {
      totais[item.diaProduzir] += item.qtdPlanejada;
    });
    return totais;
  };

  const totaisPorDia = calcularTotaisPorDia();

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
        <div style={{ display: "flex", gap: 20, marginTop: 10 }}>
          {DIAS_SEMANA.map((dia) => (
            <label key={dia.num} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <input
                type="checkbox"
                checked={feriados.includes(dia.num)}
                onChange={() => handleFeriadoToggle(dia.num)}
              />
              Dia {dia.num} ({dia.nome})
            </label>
          ))}
        </div>
      </div>

      {/* Totais por Dia */}
      <div
        style={{
          marginBottom: 20,
          padding: 15,
          background: "#e8f4e8",
          borderRadius: 8,
          border: "1px solid #cde",
        }}
      >
        <strong>Totais Planejados por Dia:</strong>
        <div style={{ display: "flex", gap: 30, marginTop: 10 }}>
          {DIAS_SEMANA.map((dia) => (
            <span
              key={dia.num}
              style={{
                padding: "5px 15px",
                background: feriados.includes(dia.num) ? "#fcc" : "#fff",
                borderRadius: 4,
                border: "1px solid #ccc",
              }}
            >
              <strong>Dia {dia.num}:</strong> {totaisPorDia[dia.num].toFixed(2)}
            </span>
          ))}
        </div>
      </div>

      {/* Grid de Produção */}
      {mapa.length > 0 ? (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ backgroundColor: "#c4a35a", color: "#fff" }}>
                <th style={{ padding: 10, textAlign: "left", border: "1px solid #b89548" }}>
                  Código
                </th>
                <th style={{ padding: 10, textAlign: "left", border: "1px solid #b89548" }}>
                  Nome
                </th>
                <th style={{ padding: 10, textAlign: "center", border: "1px solid #b89548" }}>
                  Unid.
                </th>
                <th style={{ padding: 10, textAlign: "right", border: "1px solid #b89548" }}>
                  Qtd Importada
                </th>
                <th style={{ padding: 10, textAlign: "center", border: "1px solid #b89548" }}>
                  % Ajuste
                </th>
                <th style={{ padding: 10, textAlign: "right", border: "1px solid #b89548" }}>
                  Qtd Planejada
                </th>
                <th style={{ padding: 10, textAlign: "center", border: "1px solid #b89548" }}>
                  Equipe
                </th>
                <th style={{ padding: 10, textAlign: "center", border: "1px solid #b89548" }}>
                  Dia Produzir
                </th>
              </tr>
            </thead>
            <tbody>
              {mapa.map((item, idx) => (
                <tr
                  key={item.id}
                  style={{
                    backgroundColor: feriados.includes(item.diaProduzir)
                      ? "#fdd"
                      : idx % 2 === 0
                      ? "#fff"
                      : "#f9f9f9",
                  }}
                >
                  <td style={{ padding: 8, border: "1px solid #ddd" }}>{item.codigo}</td>
                  <td style={{ padding: 8, border: "1px solid #ddd" }}>{item.nome}</td>
                  <td style={{ padding: 8, textAlign: "center", border: "1px solid #ddd" }}>
                    {item.unidade}
                  </td>
                  <td style={{ padding: 8, textAlign: "right", border: "1px solid #ddd" }}>
                    {item.qtdImportada.toFixed(2)}
                  </td>
                  <td style={{ padding: 8, textAlign: "center", border: "1px solid #ddd" }}>
                    <input
                      type="number"
                      value={item.percentualAjuste}
                      onChange={(e) =>
                        handlePercentualChange(item.id, parseFloat(e.target.value) || 0)
                      }
                      style={{
                        width: 70,
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
                      border: "1px solid #ddd",
                      fontWeight: "bold",
                      color: item.qtdPlanejada === 0 ? "#999" : "#333",
                    }}
                  >
                    {item.qtdPlanejada.toFixed(2)}
                  </td>
                  <td style={{ padding: 8, textAlign: "center", border: "1px solid #ddd" }}>
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
                  <td style={{ padding: 8, textAlign: "center", border: "1px solid #ddd" }}>
                    <select
                      value={item.diaProduzir}
                      onChange={(e) => handleDiaChange(item.id, parseInt(e.target.value))}
                      style={{
                        padding: 4,
                        borderRadius: 4,
                        backgroundColor: feriados.includes(item.diaProduzir) ? "#fcc" : "#fff",
                      }}
                    >
                      {DIAS_SEMANA.map((dia) => (
                        <option key={dia.num} value={dia.num}>
                          {dia.num} ({dia.nome})
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !erro && <p style={{ color: "#666" }}>Nenhum dado disponível. Faça uma importação primeiro.</p>
      )}
    </div>
  );
}
