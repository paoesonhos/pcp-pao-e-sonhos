import { useState, useRef } from "react";
import { useMapasSalvos, ItemMapa } from "@/hooks/useMapasSalvos";

export default function ImportaV6() {
  const [resultado, setResultado] = useState<ItemMapa[] | null>(null);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [nomeModelo, setNomeModelo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { salvarMapa } = useMapasSalvos();

  // Parsear CSV com encoding ISO-8859-1 e separador ponto-e-vírgula
  async function parseCSV(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const linhas = text.split("\n").filter((l) => l.trim());

          if (linhas.length < 2) {
            reject(new Error("Arquivo CSV vazio ou inválido"));
            return;
          }

          // Pular cabeçalho e processar dados
          const dados = linhas.slice(1).map((linha) => {
            const colunas = linha.split(";");
            return {
              codigo: colunas[0]?.trim() || "",
              nome: colunas[1]?.trim() || "",
              dia2: parseFloat(colunas[2]?.replace(",", ".") || "0") || 0,
              dia3: parseFloat(colunas[3]?.replace(",", ".") || "0") || 0,
              dia4: parseFloat(colunas[4]?.replace(",", ".") || "0") || 0,
              dia5: parseFloat(colunas[5]?.replace(",", ".") || "0") || 0,
              dia6: parseFloat(colunas[6]?.replace(",", ".") || "0") || 0,
              dia7: parseFloat(colunas[7]?.replace(",", ".") || "0") || 0,
            };
          });

          resolve(dados);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
      reader.readAsText(file, "ISO-8859-1");
    });
  }

  // Transformar dados CSV para ItemMapa (Opção A: expandir por dia)
  function transformarParaMapaItems(dados: any[]): ItemMapa[] {
    const items: ItemMapa[] = [];
    const diasSemana = [
      { numero: 2, dia: "Segunda" },
      { numero: 3, dia: "Terça" },
      { numero: 4, dia: "Quarta" },
      { numero: 5, dia: "Quinta" },
      { numero: 6, dia: "Sexta" },
      { numero: 7, dia: "Sábado" },
    ];

    dados.forEach((linha) => {
      if (!linha.codigo || !linha.nome) return; // Pular linhas inválidas

      diasSemana.forEach(({ numero }) => {
        const qtd = linha[`dia${numero}`] as number;

        // Apenas criar linhas para dias com quantidade > 0
        if (qtd > 0) {
          const item: ItemMapa = {
            id: Date.now() + Math.floor(Math.random() * 10000),
            codigo: linha.codigo,
            nome: linha.nome,
            unidade: "kg",
            qtdImportada: qtd,
            percentualAjuste: 0,
            qtdPlanejada: qtd,
            equipe: "Equipe 1",
            diaProduzir: numero,
            produtoId: null,
            isReposicao: false,
          };
          items.push(item);
        }
      });
    });

    return items;
  }

  async function handleImportar() {
    setErro("");
    setResultado(null);
    setMensagemSucesso("");

    const file = inputRef.current?.files?.[0];
    if (!file) {
      setErro("Selecione um arquivo CSV");
      return;
    }

    setLoading(true);
    try {
      const dadosCSV = await parseCSV(file);
      const items = transformarParaMapaItems(dadosCSV);

      if (items.length === 0) {
        setErro("Nenhum produto com quantidade > 0 encontrado no arquivo");
        setLoading(false);
        return;
      }

      setResultado(items);
      setNomeModelo(`Modelo ${new Date().toLocaleDateString("pt-BR")}`);
    } catch (e: any) {
      setErro(e.message || "Erro ao importar arquivo");
    }
    setLoading(false);
  }

  async function handleSalvarNoLocalStorage() {
    if (!resultado || resultado.length === 0) {
      setErro("Nenhum dado para salvar");
      return;
    }

    if (!nomeModelo.trim()) {
      setErro("Informe um nome para o modelo");
      return;
    }

    setSalvando(true);
    try {
      salvarMapa(nomeModelo, resultado);
      setMensagemSucesso(
        `✓ Modelo "${nomeModelo}" salvo com sucesso! ${resultado.length} itens adicionados.`
      );
      setErro("");

      // Limpar após sucesso
      setTimeout(() => {
        setResultado(null);
        setNomeModelo("");
        setMensagemSucesso("");
        if (inputRef.current) {
          inputRef.current.value = "";
        }
      }, 2000);
    } catch (e: any) {
      setErro(e.message || "Erro ao salvar no localStorage");
    }
    setSalvando(false);
  }

  // Calcular totais por dia
  const calcularTotais = () => {
    if (!resultado) return { dia2: 0, dia3: 0, dia4: 0, dia5: 0, dia6: 0, dia7: 0 };
    return resultado.reduce(
      (acc, item) => {
        if (item.diaProduzir === 2) acc.dia2 += item.qtdImportada;
        if (item.diaProduzir === 3) acc.dia3 += item.qtdImportada;
        if (item.diaProduzir === 4) acc.dia4 += item.qtdImportada;
        if (item.diaProduzir === 5) acc.dia5 += item.qtdImportada;
        if (item.diaProduzir === 6) acc.dia6 += item.qtdImportada;
        if (item.diaProduzir === 7) acc.dia7 += item.qtdImportada;
        return acc;
      },
      { dia2: 0, dia3: 0, dia4: 0, dia5: 0, dia6: 0, dia7: 0 }
    );
  };

  const totais = calcularTotais();

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 20 }}>Importação V6 - Modelo Movimento</h1>

      <div style={{ marginBottom: 15 }}>
        <label>Arquivo CSV (modelo-movimento): </label>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          style={{ marginLeft: 10 }}
        />
      </div>

      <button
        onClick={handleImportar}
        disabled={loading}
        style={{
          padding: "10px 30px",
          fontSize: 16,
          cursor: loading ? "wait" : "pointer",
          backgroundColor: "#c4a35a",
          border: "none",
          borderRadius: 4,
          color: "#fff",
        }}
      >
        {loading ? "Importando..." : "Importar CSV"}
      </button>

      {erro && (
        <div style={{ color: "red", marginTop: 15, padding: 10, background: "#fee" }}>
          {erro}
        </div>
      )}

      {mensagemSucesso && (
        <div style={{ color: "green", marginTop: 15, padding: 10, background: "#efe" }}>
          {mensagemSucesso}
        </div>
      )}

      {resultado && resultado.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h2>Resultado: {resultado.length} itens</h2>

          {/* Grid de Visualização */}
          <div style={{ overflowX: "auto", marginBottom: 20 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ backgroundColor: "#c4a35a", color: "#fff" }}>
                  <th style={{ padding: 8, textAlign: "left", border: "1px solid #b89548" }}>Código</th>
                  <th style={{ padding: 8, textAlign: "left", border: "1px solid #b89548" }}>Produto</th>
                  <th style={{ padding: 8, textAlign: "center", border: "1px solid #b89548" }}>Dia</th>
                  <th style={{ padding: 8, textAlign: "right", border: "1px solid #b89548" }}>Qtd (kg)</th>
                </tr>
              </thead>
              <tbody>
                {resultado.map((item, idx) => (
                  <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? "#fff" : "#f9f9f9" }}>
                    <td style={{ padding: 6, border: "1px solid #ddd", fontSize: 11 }}>{item.codigo}</td>
                    <td style={{ padding: 6, border: "1px solid #ddd", fontSize: 11 }}>{item.nome}</td>
                    <td style={{ padding: 6, textAlign: "center", border: "1px solid #ddd", fontSize: 11 }}>
                      {item.diaProduzir}
                    </td>
                    <td style={{ padding: 6, textAlign: "right", border: "1px solid #ddd", fontSize: 11 }}>
                      {item.qtdImportada.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: "#e8e0d0", fontWeight: "bold" }}>
                  <td style={{ padding: 6, border: "1px solid #ddd" }} colSpan={3}>
                    TOTAIS
                  </td>
                  <td style={{ padding: 6, textAlign: "right", border: "1px solid #ddd" }}>
                    {(
                      totais.dia2 +
                      totais.dia3 +
                      totais.dia4 +
                      totais.dia5 +
                      totais.dia6 +
                      totais.dia7
                    ).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Seção de Salvamento */}
          <div style={{ padding: 15, backgroundColor: "#f5e6d3", borderRadius: 4 }}>
            <h3 style={{ marginTop: 0 }}>Salvar Modelo no localStorage</h3>
            <div style={{ marginBottom: 10 }}>
              <label>Nome do Modelo: </label>
              <input
                type="text"
                value={nomeModelo}
                onChange={(e) => setNomeModelo(e.target.value)}
                placeholder="Ex: Modelo Semana 1"
                style={{ padding: 8, marginLeft: 10, width: 300 }}
              />
            </div>
            <button
              onClick={handleSalvarNoLocalStorage}
              disabled={salvando}
              style={{
                padding: "10px 30px",
                fontSize: 14,
                cursor: salvando ? "wait" : "pointer",
                backgroundColor: "#27ae60",
                border: "none",
                borderRadius: 4,
                color: "#fff",
              }}
            >
              {salvando ? "Salvando..." : "Salvar Modelo"}
            </button>
            <p style={{ fontSize: 12, color: "#666", marginTop: 10 }}>
              O modelo será salvo no localStorage e poderá ser carregado na página "Mapa de Produção".
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
