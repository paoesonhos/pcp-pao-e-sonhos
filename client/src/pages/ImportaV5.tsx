import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";

export default function ImportaV5() {
  const [data, setData] = useState("");
  const [resultado, setResultado] = useState<any>(null);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const mutation = trpc.importaV5.parsear.useMutation();

  async function importar() {
    setErro("");
    setResultado(null);

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
      setResultado(res);
    } catch (e: any) {
      setErro(e.message || "Erro ao importar");
    }
    setLoading(false);
  }

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
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

      {resultado && (
        <div style={{ marginTop: 20 }}>
          <h2>Resultado ({resultado.totalProdutos} produtos)</h2>
          <pre
            style={{
              background: "#f5f5f5",
              padding: 15,
              overflow: "auto",
              maxHeight: 500,
              fontSize: 12,
              border: "1px solid #ddd",
            }}
          >
            {JSON.stringify(resultado, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
