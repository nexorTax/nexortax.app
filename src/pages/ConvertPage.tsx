import React, { useState, useMemo } from "react";

/**
 * Página de conversão de arquivos. Permite converter arquivos TXT/CSV
 * em planilhas Excel ou converter planilhas Excel em arquivos TXT. O
 * usuário pode trabalhar em modo individual ou em lote de forma
 * transparente: ao selecionar mais de um TXT/CSV ou ao importar um
 * Excel com várias planilhas, a API de lote é utilizada
 * automaticamente. As operações de varredura e exportação usam os
 * endpoints da API `/api/efd/discover`/`discover-batch` e
 * `/api/efd/export`/`export-batch` para TXT→Excel, e `/api/excel/discover`
 * e `/api/excel/export` para Excel→TXT.
 */

type RecordFound = { code: string; count: number };

function getBlockFromRecord(code: string): string {
  const first = code.trim().charAt(0);
  if (!first) return "?";
  if (/[A-Za-z]/.test(first)) return first.toUpperCase();
  return "0";
}

type BlockGroup = {
  block: string;
  records: RecordFound[];
  totalLines: number;
};

/** Agrupa registros por bloco (primeira letra ou zero). */
function groupRecords(list: RecordFound[]): BlockGroup[] {
  const map = new Map<string, RecordFound[]>();
  for (const r of list) {
    const b = getBlockFromRecord(r.code);
    if (!map.has(b)) map.set(b, []);
    map.get(b)!.push(r);
  }
  const orderKey = (b: string) => (b === "0" ? "00" : b);
  const blocks = Array.from(map.keys()).sort((a, b) => orderKey(a).localeCompare(orderKey(b)));
  return blocks.map((block) => {
    const records = (map.get(block) ?? []).slice().sort((a, b) => a.code.localeCompare(b.code));
    const totalLines = records.reduce((acc, r) => acc + (r.count ?? 0), 0);
    return { block, records, totalLines };
  });
}

export const ConvertPage: React.FC = () => {
  // modo selecionado: "txt2excel" ou "excel2txt"
  type Mode = "txt2excel" | "excel2txt";
  const [mode, setMode] = useState<Mode>("txt2excel");

  // toast para mensagens temporárias
  const [toast, setToast] = useState<string>("");
  function showToast(msg: string) {
    setToast(msg);
    clearTimeout((showToast as any)._t);
    (showToast as any)._t = setTimeout(() => setToast(""), 3500);
  }

  // -------------------------------------------------------------------------
  // TXT → Excel state
  const [txtFiles, setTxtFiles] = useState<File[]>([]);
  const [txtDiscover, setTxtDiscover] = useState<{
    token: string;
    records: RecordFound[];
    isBatch: boolean;
  } | null>(null);
  const [txtSelected, setTxtSelected] = useState<Record<string, boolean>>({});
  const [txtQuery, setTxtQuery] = useState("");
  const [loadingTxtDiscover, setLoadingTxtDiscover] = useState(false);
  const [loadingTxtExport, setLoadingTxtExport] = useState(false);

  // -------------------------------------------------------------------------
  // Excel → TXT state
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelDiscover, setExcelDiscover] = useState<{
    token: string;
    records: RecordFound[];
    isBatch: boolean;
    fileIds: string[];
  } | null>(null);
  const [excelSelected, setExcelSelected] = useState<Record<string, boolean>>({});
  const [excelFileIdSelected, setExcelFileIdSelected] = useState<Record<string, boolean>>({});
  const [excelQuery, setExcelQuery] = useState("");
  const [loadingExcelDiscover, setLoadingExcelDiscover] = useState(false);
  const [loadingExcelExport, setLoadingExcelExport] = useState(false);

  // API base URL
  const API_BASE = import.meta.env.VITE_API_BASE ?? "https://localhost:5001";

  // Helpers para filtros e agrupamentos
  const txtFiltered = useMemo(() => {
    const list = txtDiscover?.records ?? [];
    const q = txtQuery.trim().toUpperCase();
    if (!q) return list;
    return list.filter((r) => r.code.toUpperCase().includes(q));
  }, [txtDiscover, txtQuery]);
  const txtGroups = useMemo(() => groupRecords(txtFiltered), [txtFiltered]);
  const txtSelectedCodes = useMemo(() => Object.entries(txtSelected).filter(([_, v]) => v).map(([k]) => k), [txtSelected]);
  const txtSelectedLines = useMemo(() => {
    if (!txtDiscover) return 0;
    const map = new Map(txtDiscover.records.map((r) => [r.code, r.count]));
    return txtSelectedCodes.reduce((acc, code) => acc + (map.get(code) ?? 0), 0);
  }, [txtDiscover, txtSelectedCodes]);

  const excelFiltered = useMemo(() => {
    const list = excelDiscover?.records ?? [];
    const q = excelQuery.trim().toUpperCase();
    if (!q) return list;
    return list.filter((r) => r.code.toUpperCase().includes(q));
  }, [excelDiscover, excelQuery]);
  const excelGroups = useMemo(() => groupRecords(excelFiltered), [excelFiltered]);
  const excelSelectedCodes = useMemo(() => Object.entries(excelSelected).filter(([_, v]) => v).map(([k]) => k), [excelSelected]);
  const excelSelectedLines = useMemo(() => {
    if (!excelDiscover) return 0;
    const map = new Map(excelDiscover.records.map((r) => [r.code, r.count]));
    return excelSelectedCodes.reduce((acc, code) => acc + (map.get(code) ?? 0), 0);
  }, [excelDiscover, excelSelectedCodes]);
  const excelSelectedFileIds = useMemo(() => Object.entries(excelFileIdSelected).filter(([_, v]) => v).map(([k]) => k), [excelFileIdSelected]);

  // Reseta estados quando o modo mudar
  function resetStates() {
    setTxtFiles([]);
    setTxtDiscover(null);
    setTxtSelected({});
    setTxtQuery("");
    setExcelFile(null);
    setExcelDiscover(null);
    setExcelSelected({});
    setExcelFileIdSelected({});
    setExcelQuery("");
  }

  function handleModeChange(newMode: Mode) {
    if (newMode !== mode) {
      resetStates();
      setMode(newMode);
    }
  }

  // -------------------------------------------------------------------------
  // TXT → Excel actions
  async function discoverTxt() {
    if (txtFiles.length === 0) {
      showToast("Selecione um ou mais arquivos .txt ou .csv.");
      return;
    }
    setLoadingTxtDiscover(true);
    try {
      const form = new FormData();
      if (txtFiles.length === 1) {
        form.append("file", txtFiles[0]);
      } else {
        txtFiles.forEach((f) => form.append("files", f));
      }
      const url = txtFiles.length === 1 ? `${API_BASE}/api/efd/discover` : `${API_BASE}/api/efd/discover-batch`;
      const res = await fetch(url, { method: "POST", body: form });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (txtFiles.length === 1) {
        const records: RecordFound[] = (data.recordsFound ?? []).map((r: any) => ({ code: r.code, count: r.count }));
        setTxtDiscover({ token: data.fileToken, records, isBatch: false });
        const init: Record<string, boolean> = {};
        records.forEach((r) => (init[r.code] = true));
        setTxtSelected(init);
      } else {
        const records: RecordFound[] = (data.mergedRecordsFound ?? []).map((r: any) => ({ code: r.code, count: r.count }));
        setTxtDiscover({ token: data.batchToken, records, isBatch: true });
        const init: Record<string, boolean> = {};
        records.forEach((r) => (init[r.code] = true));
        setTxtSelected(init);
      }
      showToast("Arquivo(s) analisado(s). Ajuste os registros e exporte.");
    } catch (e: any) {
      showToast(`Erro ao analisar: ${e?.message ?? String(e)}`);
    } finally {
      setLoadingTxtDiscover(false);
    }
  }

  async function exportTxt() {
    if (!txtDiscover) {
      showToast("Faça a varredura do arquivo antes de exportar.");
      return;
    }
    const codes = txtSelectedCodes;
    if (codes.length === 0) {
      showToast("Selecione pelo menos 1 registro para exportar.");
      return;
    }
    setLoadingTxtExport(true);
    try {
      const url = txtDiscover.isBatch ? `${API_BASE}/api/efd/export-batch` : `${API_BASE}/api/efd/export`;
      const body = txtDiscover.isBatch
        ? { batchToken: txtDiscover.token, include: codes }
        : { fileToken: txtDiscover.token, include: codes };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const urlBlob = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = urlBlob;
      a.download = `EFD_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(urlBlob);
      showToast("Excel exportado com sucesso.");
    } catch (e: any) {
      showToast(`Erro ao exportar: ${e?.message ?? String(e)}`);
    } finally {
      setLoadingTxtExport(false);
    }
  }

  // -------------------------------------------------------------------------
  // Excel → TXT actions
  async function discoverExcel() {
    if (!excelFile) {
      showToast("Selecione um arquivo .xlsx.");
      return;
    }
    setLoadingExcelDiscover(true);
    try {
      const form = new FormData();
      form.append("file", excelFile);
      const res = await fetch(`${API_BASE}/api/excel/discover`, { method: "POST", body: form });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const records: RecordFound[] = (data.recordsFound ?? []).map((r: any) => ({ code: r.code, count: r.count }));
      const token: string = data.fileToken;
      const isBatch: boolean = !!data.isBatch;
      const fileIds: string[] = (data.batchFiles ?? []).map((f: any) => f.fileId);
      setExcelDiscover({ token, records, isBatch, fileIds });
      // select all records by default
      const init: Record<string, boolean> = {};
      records.forEach((r) => (init[r.code] = true));
      setExcelSelected(init);
      // select all fileIds by default
      const fidInit: Record<string, boolean> = {};
      fileIds.forEach((id) => (fidInit[id] = true));
      setExcelFileIdSelected(fidInit);
      showToast("Excel analisado. Ajuste os registros e exporte.");
    } catch (e: any) {
      showToast(`Erro ao analisar: ${e?.message ?? String(e)}`);
    } finally {
      setLoadingExcelDiscover(false);
    }
  }

  async function exportExcel() {
    if (!excelDiscover) {
      showToast("Faça a varredura do arquivo antes de exportar.");
      return;
    }
    const codes = excelSelectedCodes;
    if (codes.length === 0) {
      showToast("Selecione pelo menos 1 registro para exportar.");
      return;
    }
    setLoadingExcelExport(true);
    try {
      const body = {
        fileToken: excelDiscover.token,
        include: codes,
        fileIds: excelDiscover.isBatch ? excelSelectedFileIds : undefined,
      } as any;
      const res = await fetch(`${API_BASE}/api/excel/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const disp = res.headers.get("Content-Disposition") || "";
      const match = /filename="?([^";]+)"?/i.exec(disp);
      const fileName = match
        ? match[1]
        : excelDiscover.isBatch
        ? `EFD_${new Date().toISOString().slice(0, 10)}.zip`
        : `EFD_${new Date().toISOString().slice(0, 10)}.txt`;
      const urlBlob = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = urlBlob;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(urlBlob);
      showToast("TXT exportado com sucesso.");
    } catch (e: any) {
      showToast(`Erro ao exportar: ${e?.message ?? String(e)}`);
    } finally {
      setLoadingExcelExport(false);
    }
  }

  // -------------------------------------------------------------------------
  // UI helpers
  function toggleTxtRecord(code: string) {
    setTxtSelected((s) => ({ ...s, [code]: !s[code] }));
  }
  function setTxtAll(value: boolean) {
    if (!txtDiscover) return;
    const next: Record<string, boolean> = {};
    txtDiscover.records.forEach((r) => (next[r.code] = value));
    setTxtSelected(next);
  }
  function setTxtBlockAll(block: string, value: boolean) {
    setTxtSelected((prev) => {
      const next = { ...prev };
      const group = txtGroups.find((g) => g.block === block);
      (group?.records ?? []).forEach((r) => (next[r.code] = value));
      return next;
    });
  }
  function toggleExcelRecord(code: string) {
    setExcelSelected((s) => ({ ...s, [code]: !s[code] }));
  }
  function setExcelAll(value: boolean) {
    if (!excelDiscover) return;
    const next: Record<string, boolean> = {};
    excelDiscover.records.forEach((r) => (next[r.code] = value));
    setExcelSelected(next);
  }
  function setExcelBlockAll(block: string, value: boolean) {
    setExcelSelected((prev) => {
      const next = { ...prev };
      const group = excelGroups.find((g) => g.block === block);
      (group?.records ?? []).forEach((r) => (next[r.code] = value));
      return next;
    });
  }
  function toggleExcelFileId(id: string) {
    setExcelFileIdSelected((s) => ({ ...s, [id]: !s[id] }));
  }

  // Component para renderizar seleção de registros
  function renderRecordSelection(
    groups: BlockGroup[],
    selectedMap: Record<string, boolean>,
    toggle: (code: string) => void,
    setBlock: (block: string, value: boolean) => void
  ) {
    return (
      <div className="blocks">
        {groups.map((g) => (
          <div key={g.block} className="blockCard">
            <div className="blockHead">
              <div>
                <div className="blockTitle">Bloco {g.block}</div>
                <div className="blockSub muted">
                  {g.records.length} registro(s) • {g.totalLines} linha(s)
                </div>
              </div>
              <div className="blockActions">
                <button className="btn tiny" onClick={() => setBlock(g.block, true)}>
                  Marcar
                </button>
                <button className="btn tiny ghost" onClick={() => setBlock(g.block, false)}>
                  Limpar
                </button>
              </div>
            </div>
            <div className="blockList">
              {g.records.map((r) => (
                <label key={r.code} className="recordRow">
                  <input
                    type="checkbox"
                    checked={!!selectedMap[r.code]}
                    onChange={() => toggle(r.code)}
                  />
                    <span className="recordCode">{r.code}</span>
                    <span className="recordLines muted">{r.count} linhas</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const txtStep1Done = txtFiles.length > 0;
  const txtStep2Done = !!txtDiscover;

  const excelStep1Done = !!excelFile;
  const excelStep2Done = !!excelDiscover;

  return (
    <div className="page">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Conversão de Arquivos</h1>
          <p className="page-subtitle">Converta arquivos entre formatos TXT, CSV e Excel</p>
        </div>
      </div>

      <div className="surface" style={{ padding: 18 }}>
        <div className="segmented" style={{ marginBottom: 14 }}>
          <button
            className={`segmented-btn ${mode === "txt2excel" ? "active" : ""}`}
            onClick={() => handleModeChange("txt2excel")}
          >
            TXT → Excel
          </button>
          <button
            className={`segmented-btn ${mode === "excel2txt" ? "active" : ""}`}
            onClick={() => handleModeChange("excel2txt")}
          >
            Excel → TXT
          </button>
        </div>

        {mode === "txt2excel" && (
          <div>
            <div className="stepper">
              <div className="step">
                <div className={`step-icon ${txtStep1Done ? "active" : "active"}`}>
                  <span style={{ fontWeight: 900 }}>1</span>
                </div>
                <div>
                  <p className="step-title">1. Upload TXT/CSV</p>
                  <p className="step-sub">{txtStep1Done ? "Selecionado" : "Aguardando"}</p>
                </div>
              </div>
              <div className="step" style={{ justifyContent: "center" }}>
                <div className={`step-icon ${txtStep2Done ? "active" : txtStep1Done ? "active" : ""}`}>
                  <span style={{ fontWeight: 900 }}>2</span>
                </div>
                <div>
                  <p className="step-title">2. Converter</p>
                  <p className="step-sub">{txtStep2Done ? "Pronto" : txtStep1Done ? "Liberado" : "Bloqueado"}</p>
                </div>
              </div>
              <div className="step" style={{ justifyContent: "flex-end" }}>
                <div className={`step-icon ${txtStep2Done ? "active" : ""}`}>
                  <span style={{ fontWeight: 900 }}>3</span>
                </div>
                <div>
                  <p className="step-title">3. Download Excel</p>
                  <p className="step-sub">{txtStep2Done ? "Disponível" : "Aguardando"}</p>
                </div>
              </div>
            </div>

            <div className="three-col" style={{ marginTop: 16 }}>
              <div className="surface">
                <div className="section-header">
                  <div className="section-icon blue">📄</div>
                  <div>
                    <div className="section-title">1. Upload TXT/CSV</div>
                    <div className="section-sub">Selecione um ou mais arquivos</div>
                  </div>
                </div>
                <input
                  className="input"
                  type="file"
                  accept=".txt,.csv"
                  multiple
                  onChange={(e) => setTxtFiles(Array.from(e.target.files ?? []))}
                />
                <div className="muted-small" style={{ marginTop: 8 }}>
                  TXT ou CSV até 50MB
                </div>
              </div>

              <div className="surface">
                <div className="section-header">
                  <div className="section-icon purple">⇄</div>
                  <div>
                    <div className="section-title">2. Converter</div>
                    <div className="section-sub">Análise estrutural automática</div>
                  </div>
                </div>
                <button
                  className="primary-action"
                  onClick={async () => {
                    await discoverTxt();
                  }}
                  disabled={!txtStep1Done || loadingTxtDiscover}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  {loadingTxtDiscover ? "Analisando..." : "Converter"}
                </button>
                <div className="muted-small" style={{ marginTop: 8 }}>
                  {txtDiscover ? "Registros carregados. Ajuste abaixo (opcional) e exporte." : ""}
                </div>
              </div>

              <div className="surface">
                <div className="section-header">
                  <div className="section-icon gray">⬇️</div>
                  <div>
                    <div className="section-title">3. Download Excel</div>
                    <div className="section-sub">Arquivo XLSX</div>
                  </div>
                </div>
                <button
                  className="btn primary"
                  onClick={exportTxt}
                  disabled={!txtDiscover || loadingTxtExport || txtSelectedCodes.length === 0}
                  style={{ width: "100%" }}
                >
                  {loadingTxtExport ? "Exportando..." : "Download"}
                </button>
              </div>
            </div>

            {txtDiscover && (
              <div className="surface" style={{ marginTop: 16 }}>
                <div className="section-title" style={{ marginBottom: 10 }}>Configurações avançadas</div>
                <div className="row" style={{ marginBottom: 8, gap: 8 }}>
                  <div className="filter-actions">
                  <input
                    type="text"
                    value={txtQuery}
                    onChange={(e) => setTxtQuery(e.target.value)}
                    placeholder="Filtrar código..."
                    className="filter-input"
                  />
                  <button className="btn tiny" onClick={() => setTxtAll(true)}>
                    Marcar tudo
                  </button>
                  <button className="btn tiny ghost" onClick={() => setTxtAll(false)}>
                    Limpar tudo
                  </button>
                  </div>
                </div>
                {renderRecordSelection(txtGroups, txtSelected, toggleTxtRecord, setTxtBlockAll)}
                <div className="summaryRow">
                  {txtSelectedCodes.length} registro(s) selecionado(s) • {txtSelectedLines} linha(s)
                </div>
              </div>
            )}

            <div className="feature-grid" style={{ marginTop: 16 }}>
              <div className="feature-card">
                <div className="feature-icon blue">📘</div>
                <div className="feature-title">Análise Automática</div>
                <div className="feature-sub">Identificação inteligente de estrutura e delimitadores</div>
              </div>
              <div className="feature-card">
                <div className="feature-icon purple">⇄</div>
                <div className="feature-title">Conversão Bidirecional</div>
                <div className="feature-sub">Suporte completo para TXT ⇄ Excel em ambas direções</div>
              </div>
              <div className="feature-card">
                <div className="feature-icon green">✅</div>
                <div className="feature-title">Validação Integrada</div>
                <div className="feature-sub">Verificação de integridade durante o processo</div>
              </div>
            </div>
          </div>
        )}

        {mode === "excel2txt" && (
          <div>
            <div className="stepper">
              <div className="step">
                <div className={`step-icon ${excelStep1Done ? "active" : "active"}`}>
                  <span style={{ fontWeight: 900 }}>1</span>
                </div>
                <div>
                  <p className="step-title">1. Upload Excel</p>
                  <p className="step-sub">{excelStep1Done ? "Selecionado" : "Aguardando"}</p>
                </div>
              </div>
              <div className="step" style={{ justifyContent: "center" }}>
                <div className={`step-icon ${excelStep2Done ? "active" : excelStep1Done ? "active" : ""}`}>
                  <span style={{ fontWeight: 900 }}>2</span>
                </div>
                <div>
                  <p className="step-title">2. Converter</p>
                  <p className="step-sub">{excelStep2Done ? "Pronto" : excelStep1Done ? "Liberado" : "Bloqueado"}</p>
                </div>
              </div>
              <div className="step" style={{ justifyContent: "flex-end" }}>
                <div className={`step-icon ${excelStep2Done ? "active" : ""}`}>
                  <span style={{ fontWeight: 900 }}>3</span>
                </div>
                <div>
                  <p className="step-title">3. Download TXT</p>
                  <p className="step-sub">{excelStep2Done ? "Disponível" : "Aguardando"}</p>
                </div>
              </div>
            </div>

            <div className="three-col" style={{ marginTop: 16 }}>
              <div className="surface">
                <div className="section-header">
                  <div className="section-icon blue">📄</div>
                  <div>
                    <div className="section-title">1. Upload Excel</div>
                    <div className="section-sub">Selecione o arquivo XLSX</div>
                  </div>
                </div>
                <input
                  className="input"
                  type="file"
                  accept=".xls,.xlsx"
                  onChange={(e) => setExcelFile((e.target.files ?? [])[0] ?? null)}
                />
              </div>

              <div className="surface">
                <div className="section-header">
                  <div className="section-icon purple">⇄</div>
                  <div>
                    <div className="section-title">2. Converter</div>
                    <div className="section-sub">Leitura de planilhas</div>
                  </div>
                </div>
                <button
                  className="primary-action"
                  onClick={async () => {
                    await discoverExcel();
                  }}
                  disabled={!excelStep1Done || loadingExcelDiscover}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  {loadingExcelDiscover ? "Analisando..." : "Converter"}
                </button>
              </div>

              <div className="surface">
                <div className="section-header">
                  <div className="section-icon gray">⬇️</div>
                  <div>
                    <div className="section-title">3. Download TXT</div>
                    <div className="section-sub">Arquivo TXT</div>
                  </div>
                </div>
                <button
                  className="btn primary"
                  onClick={exportExcel}
                  disabled={!excelDiscover || loadingExcelExport || excelSelectedCodes.length === 0}
                  style={{ width: "100%" }}
                >
                  {loadingExcelExport ? "Exportando..." : "Download"}
                </button>
              </div>
            </div>

            {excelDiscover && (
              <div className="surface" style={{ marginTop: 16 }}>
                <div className="section-title" style={{ marginBottom: 10 }}>Configurações avançadas</div>
                <div className="row" style={{ marginBottom: 8, gap: 8 }}>
                  <input
                    type="text"
                    value={excelQuery}
                    onChange={(e) => setExcelQuery(e.target.value)}
                    placeholder="Filtrar código..."
                    className="input"
                  />
                  <button className="btn tiny" onClick={() => setExcelAll(true)}>
                    Marcar tudo
                  </button>
                  <button className="btn tiny ghost" onClick={() => setExcelAll(false)}>
                    Limpar tudo
                  </button>
                </div>
                {renderRecordSelection(excelGroups, excelSelected, toggleExcelRecord, setExcelBlockAll)}
                {excelDiscover.isBatch && (
                  <div className="surface" style={{ marginTop: 14 }}>
                    <div className="section-title" style={{ marginBottom: 10 }}>Selecionar arquivos do lote</div>
                    <div className="blockList">
                      {excelDiscover.fileIds.map((id) => (
                        <label key={id} className="recordRow">
                          <input type="checkbox" checked={!!excelFileIdSelected[id]} onChange={() => toggleExcelFileId(id)} />
                          <span className="recordCode">{id}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <div className="summaryRow">
                  {excelSelectedCodes.length} registro(s) selecionado(s) • {excelSelectedLines} linha(s)
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};