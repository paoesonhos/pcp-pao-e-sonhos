import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useMapasSalvos, ItemMapa } from "@/hooks/useMapasSalvos";

interface DadoVenda {
  codigo_produto: string;
  nome_produto: string;
  unidade_medida: string;
  dia2: number;
  dia3: number;
  dia4: number;
  dia5: number;
  dia6: number;
  dia7: number;
}

interface Resultado {
  success: boolean;
  importacaoId?: number;
  dataReferencia?: string;
  totalProdutos?: number;
  dados?: DadoVenda[];
  erro?: string;
}



export default function ImportaV5() {
  const [data, setData] = useState("");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [mostrarJson, setMostrarJson] = useState(false);
  const [nomeImportacao, setNomeImportacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const mutation = trpc.importaV5.importar.useMutation();
  const { salvarMapa } = useMapasSalvos();

  async function importar() {
    setErro("");
    setResultado(null);
    setMensagemSucesso("");

    if (!data) {
      setErro("Informe a data de referência");
      return;
    }

    const file = inputRef.current?.files?.[0];
    if (!file) {
      setErro("Selecione um arquivo CSV");
      return;
    }

    setLoading(true);
    try {
      const texto = await file.text();
      const res = await mutation.mutateAsync({
        dataReferencia: data,
        csvContent: texto,
      });
      setResultado(res as Resultado);
      setNomeImportacao(`Importação ${data}`);
    } catch (e: any) {
      setErro(e.message || "Erro ao importar");
    }
    setLoading(false);
  }

  // Transformar dados do CSV para formato ItemMapa (Opção A)
  function transformarParaMapaItems(dados: DadoVenda[]): ItemMapa[] {
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
      diasSemana.forEach(({ numero, dia }) => {
        const qtd = linha[`dia${numero}` as keyof DadoVenda] as number;

        // Apenas criar linhas para dias com quantidade > 0
        if (qtd > 0) {
          const item: ItemMapa = {
            id: Date.now() + Math.floor(Math.random() * 10000),
            codigo: linha.codigo_produto,
            nome: linha.nome_produto,
            unidade: "kg", // Padrão conforme especificação
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

  async function handleSalvarNoLocalStorage() {
    if (!resultado?.dados || resultado.dados.length === 0) {
      setErro("Nenhum dado para salvar");
      return;
    }

    if (!nomeImportacao.trim()) {
      setErro("Informe um nome para a importação");
      return;
    }

    setSalvando(true);
    try {
      const items = transformarParaMapaItems(resultado.dados);
      salvarMapa(nomeImportacao, items);
      setMensagemSucesso(`✓ Importação "${nomeImportacao}" salva com sucesso! ${items.length} itens adicionados.`);
      setErro("");
      
      // Limpar formulário após sucesso
      setTimeout(() => {
        setData("");
        setResultado(null);
        setNomeImportacao("");
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
    if (!resultado?.dados) return { dia2: 0, dia3: 0, dia4: 0, dia5: 0, dia6: 0, dia7: 0 };
    return resultado.dados.reduce(
      (acc, item) => ({
        dia2: acc.dia2 + item.dia2,
        dia3: acc.dia3 + item.dia3,
        dia4: acc.dia4 + item.dia4,
        dia5: acc.dia5 + item.dia5,
        dia6: acc.dia6 + item.dia6,
        dia7: acc.dia7 + item.dia7,
      }),
      { dia2: 0, dia3: 0, dia4: 0, dia5: 0, dia6: 0, dia7: 0 }
    );
  };

  const totais = calcularTotais();

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 20 }}>Importação V5</h1>

      <div style={{ marginBottom: 15 }}>
        <label>Data de Referência: </label>
        <input
          type="text"
          value={data}
          onChange={(e) => setData(e.target.value)}
          placeholder="Ex: 2025-01-06"
          style={{ padding: 8, marginLeft: 10, width: 150 }}
        />
      </div>

      <div style={{ marginBottom: 15 }}>
        <label>Arquivo CSV: </label>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          style={{ marginLeft: 10 }}
        />
      </div>

      <button
        onClick={importar}
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
        {loading ? "Importando..." : "Importar"}
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

      {resultado && resultado.success && resultado.dados && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h2>
              Resultado: {resultado.totalProdutos} produtos 
              {resultado.importacaoId && <span style={{ fontSize: 14, color: "#666" }}> (ID: {resultado.importacaoId})</span>}
            </h2>
            <button
              onClick={() => setMostrarJson(!mostrarJson)}
              style={{
                padding: "5px 15px",
                fontSize: 12,
                cursor: "pointer",
                backgroundColor: "#f0f0f0",
                border: "1px solid #ccc",
                borderRadius: 4,
              }}
            >
              {mostrarJson ? "Ocultar JSON" : "Ver JSON"}
            </button>
          </div>

          {/* Grid de Visualização */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ backgroundColor: "#c4a35a", color: "#fff" }}>
                  <th style={{ padding: 10, textAlign: "left", border: "1px solid #b89548" }}>Código</th>
                  <th style={{ padding: 10, textAlign: "left", border: "1px solid #b89548" }}>Produto</th>
                  <th style={{ padding: 10, textAlign: "center", border: "1px solid #b89548" }}>Unid.</th>
                  <th style={{ padding: 10, textAlign: "right", border: "1px solid #b89548" }}>Dia 2</th>
                  <th style={{ padding: 10, textAlign: "right", border: "1px solid #b89548" }}>Dia 3</th>
                  <th style={{ padding: 10, textAlign: "right", border: "1px solid #b89548" }}>Dia 4</th>
                  <th style={{ padding: 10, textAlign: "right", border: "1px solid #b89548" }}>Dia 5</th>
                  <th style={{ padding: 10, textAlign: "right", border: "1px solid #b89548" }}>Dia 6</th>
                  <th style={{ padding: 10, textAlign: "right", border: "1px solid #b89548" }}>Dia 7</th>
                </tr>
              </thead>
              <tbody>
                {resultado.dados.map((item, idx) => (
                  <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? "#fff" : "#f9f9f9" }}>
                    <td style={{ padding: 8, border: "1px solid #ddd" }}>{item.codigo_produto}</td>
                    <td style={{ padding: 8, border: "1px solid #ddd" }}>{item.nome_produto}</td>
                    <td style={{ padding: 8, textAlign: "center", border: "1px solid #ddd" }}>{item.unidade_medida}</td>
                    <td style={{ padding: 8, textAlign: "right", border: "1px solid #ddd" }}>{item.dia2.toFixed(2)}</td>
                    <td style={{ padding: 8, textAlign: "right", border: "1px solid #ddd" }}>{item.dia3.toFixed(2)}</td>
                    <td style={{ padding: 8, textAlign: "right", border: "1px solid #ddd" }}>{item.dia4.toFixed(2)}</td>
                    <td style={{ padding: 8, textAlign: "right", border: "1px solid #ddd" }}>{item.dia5.toFixed(2)}</td>
                    <td style={{ padding: 8, textAlign: "right", border: "1px solid #ddd" }}>{item.dia6.toFixed(2)}</td>
                    <td style={{ padding: 8, textAlign: "right", border: "1px solid #ddd" }}>{item.dia7.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: "#e8e0d0", fontWeight: "bold" }}>
                  <td style={{ padding: 8, border: "1px solid #ddd" }} colSpan={3}>TOTAIS</td>
                  <td style={{ padding: 8, textAlign: "right", border: "1px solid #ddd" }}>{totais.dia2.toFixed(2)}</td>
                  <td style={{ padding: 8, textAlign: "right", border: "1px solid #ddd" }}>{totais.dia3.toFixed(2)}</td>
                  <td style={{ padding: 8, textAlign: "right", border: "1px solid #ddd" }}>{totais.dia4.toFixed(2)}</td>
                  <td style={{ padding: 8, textAlign: "right", border: "1px solid #ddd" }}>{totais.dia5.toFixed(2)}</td>
                  <td style={{ padding: 8, textAlign: "right", border: "1px solid #ddd" }}>{totais.dia6.toFixed(2)}</td>
                  <td style={{ padding: 8, textAlign: "right", border: "1px solid #ddd" }}>{totais.dia7.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Seção de Salvamento no localStorage */}
          <div style={{ marginTop: 20, padding: 15, backgroundColor: "#f5e6d3", borderRadius: 4 }}>
            <h3 style={{ marginTop: 0 }}>Salvar Importação no localStorage</h3>
            <div style={{ marginBottom: 10 }}>
              <label>Nome da Importação: </label>
              <input
                type="text"
                value={nomeImportacao}
                onChange={(e) => setNomeImportacao(e.target.value)}
                placeholder="Ex: Importação Semana 1"
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
              {salvando ? "Salvando..." : "Salvar no localStorage"}
            </button>
            <p style={{ fontSize: 12, color: "#666", marginTop: 10 }}>
              Os dados serão transformados e salvos no formato de Mapa de Produção.
              Você poderá carregar esta importação na página "Mapa de Produção".
            </p>
          </div>

          {/* JSON (oculto por padrão) */}
          {mostrarJson && (
            <div style={{ marginTop: 20 }}>
              <h3>JSON</h3>
              <pre
                style={{
                  background: "#f5f5f5",
                  padding: 15,
                  overflow: "auto",
                  maxHeight: 400,
                  fontSize: 12,
                  border: "1px solid #ddd",
                }}
              >
                {JSON.stringify(resultado, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
