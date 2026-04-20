import React, { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Upload, FileText, ArrowRight } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { fetchSpedReportDefinitions, generateSpedReport, importSpedTxt } from "../services/api";

type ReportDefinitionDto = {
  id: string;
  code: number;
  name: string;
  spedType: string;
  direction: string;
  isActive: boolean;
};

// Status no estilo do Figma: Step 2 pode ficar "Bloqueado" até importar.
// Step 3 fica "Aguardando" (mesmo antes), para não ficar com ar de erro.
function statusFromStep(kind: "step1" | "step2" | "step3", isDone: boolean, isBlocked: boolean) {
  if (isDone) return "Concluído";
  if (kind === "step2" && isBlocked) return "Bloqueado";
  return "Aguardando";
}

function subtitleFromReportName(name: string) {
  const n = (name ?? "").toLowerCase();
  if (n.includes("crédit") || n.includes("credito")) return "Análise de créditos fiscais";
  if (n.includes("receit")) return "Detalhamento de receitas";
  if (n.includes("resumo") || n.includes("consolid")) return "Visão consolidada";
  return "";
}

export const SpedReportsPage: React.FC = () => {
  const { auth } = useAuth();

  const [toast, setToast] = useState("");
  function showToast(msg: string) {
    setToast(msg);
    clearTimeout((showToast as any)._t);
    (showToast as any)._t = setTimeout(() => setToast(""), 3500);
  }

  const [spedType, setSpedType] = useState<"EFD_CONTRIB" | "EFD_ICMS_IPI">("EFD_CONTRIB");
  const [clientId, setClientId] = useState<string>(""); // Guid (opcional)
  const [txtFile, setTxtFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [importId, setImportId] = useState<string>("");
  const [defs, setDefs] = useState<ReportDefinitionDto[]>([]);
  const [reportCode, setReportCode] = useState<number | null>(null);

  const [loadingDefs, setLoadingDefs] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [lastRequestId, setLastRequestId] = useState<string>("");

  const firmId = useMemo(() => (auth?.firmId ?? "").trim(), [auth?.firmId]);

  useEffect(() => {
    if (!auth?.accessToken) return;
    (async () => {
      try {
        setLoadingDefs(true);
        const raw = await fetchSpedReportDefinitions(auth.accessToken);
        // Normaliza propriedades vindas do backend (PascalCase) para o formato usado no front.
        const list: ReportDefinitionDto[] = (Array.isArray(raw) ? raw : []).map((x: any) => ({
          id: String(x?.id ?? x?.Id ?? ""),
          code: Number(x?.code ?? x?.Code ?? 0),
          name: String(x?.name ?? x?.Name ?? ""),
          spedType: String(x?.spedType ?? x?.SpedType ?? ""),
          direction: String(x?.direction ?? x?.Direction ?? ""),
          isActive: Boolean(x?.isActive ?? x?.IsActive ?? false),
        }));
        setDefs(list);
      } catch (e: any) {
        showToast(`Erro ao carregar definições: ${e?.message ?? String(e)}`);
      } finally {
        setLoadingDefs(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.accessToken]);

  const defsFiltered = useMemo(() => {
    return defs.filter((d) => d.isActive && d.spedType === spedType);
  }, [defs, spedType]);

  useEffect(() => {
    if (defsFiltered.length > 0) {
      setReportCode((prev) => (prev == null ? defsFiltered[0].code : prev));
    } else {
      setReportCode(null);
    }
  }, [defsFiltered]);

  async function handleImport() {
    if (!auth?.accessToken) return;
    if (!firmId) {
      showToast("FirmId não encontrado no token. Faça login novamente.");
      return;
    }
    if (!txtFile) {
      showToast("Selecione um TXT do SPED.");
      return;
    }

    setLoadingImport(true);
    try {
      const cid = clientId.trim() ? clientId.trim() : null;
      const res = await importSpedTxt(txtFile, spedType, cid, firmId, auth.accessToken);
      setImportId(res.importId);
      // ✅ Assim que importar, libera a seleção de relatórios (o problema do print)
      if (!lastRequestId) {
        // força re-render imediato e desbloqueio
        setReportCode((prev) => prev);
      }
      showToast("Importação enviada. Agora selecione o relatório.");
    } catch (e: any) {
      showToast(`Erro ao importar: ${e?.message ?? String(e)}`);
    } finally {
      setLoadingImport(false);
    }
  }

  async function handleGenerate() {
    if (!auth?.accessToken) return;
    if (!importId) {
      showToast("Faça a importação primeiro (ImportId).");
      return;
    }
    if (reportCode == null) {
      showToast("Selecione um relatório.");
      return;
    }

    setLoadingGenerate(true);
    try {
      const cid = clientId.trim() ? clientId.trim() : null;
      const res = await generateSpedReport(importId, reportCode, cid, auth.accessToken);
      setLastRequestId(res.requestId);
      showToast("Relatório enfileirado. Acompanhe no Hangfire.");
    } catch (e: any) {
      showToast(`Erro ao gerar: ${e?.message ?? String(e)}`);
    } finally {
      setLoadingGenerate(false);
    }
  }

  const step1Done = !!importId;
  const step2Done = !!lastRequestId;
  const step2Blocked = !step1Done;
  const step3Blocked = !step1Done;

  return (
    <div className="page">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Importação e processamento de arquivos SPED</h1>
          <p className="page-subtitle">Suba o TXT, escolha o relatório e processe via Hangfire</p>
        </div>
      </div>

      <div className="stepper" style={{ marginBottom: 16 }}>
        <div className="step">
          <div className={`step-icon ${step1Done ? "active" : "active"}`}>
            <Upload size={18} />
          </div>
          <div>
            <p className="step-title">1. Importar TXT</p>
            <p className="step-sub">{statusFromStep("step1", step1Done, false)}</p>
          </div>
        </div>

        <div className="step" style={{ justifyContent: "center" }}>
          <div className={`step-icon ${!step2Blocked ? "active" : ""}`}>
            <FileText size={18} />
          </div>
          <div>
            <p className="step-title">2. Selecionar Relatório</p>
            <p className="step-sub">{statusFromStep("step2", step2Done, step2Blocked)}</p>
          </div>
        </div>

        <div className="step" style={{ justifyContent: "flex-end" }}>
          <div className={`step-icon ${!step3Blocked ? "active" : ""}`}>
            <Sparkles size={18} />
          </div>
          <div>
            <p className="step-title">3. Processar</p>
            <p className="step-sub">{statusFromStep("step3", step2Done, step3Blocked)}</p>
          </div>
        </div>
      </div>

      <div className="two-col">
        <div className="surface">
          <div className="section-header">
            <div className="section-icon blue">
              <Upload size={18} />
            </div>
            <div>
              <div className="section-title">Importar Arquivo SPED</div>
              <div className="section-sub">Faça upload do arquivo TXT para processamento</div>
            </div>
          </div>

          <div className="grid-2" style={{ marginTop: 14 }}>
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={spedType} onChange={(e) => setSpedType(e.target.value as any)}>
                <option value="EFD_CONTRIB">EFD Contribuições</option>
                <option value="EFD_ICMS_IPI">EFD ICMS/IPI</option>
              </select>
            </div>
            <div>
              <label className="label">ClientId (opcional)</label>
              <input className="input" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="Ex: 123" />
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.sped"
            style={{ display: "none" }}
            onChange={(e) => setTxtFile(e.target.files?.[0] ?? null)}
          />

          <div
            className="dropzone"
            style={{ marginTop: 14 }}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 10, color: "#94a3b8" }}>
                <Upload size={34} />
              </div>
              <strong>{txtFile ? txtFile.name : "Clique para selecionar arquivo"}</strong>
              <div className="muted-small">Arquivos .txt até 100MB</div>
            </div>
          </div>

          <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12 }}>
            <button className="primary-action" onClick={handleImport} disabled={loadingImport || !txtFile}>
              {loadingImport ? "Importando..." : "Importar TXT"}
              <ArrowRight size={18} />
            </button>
            {importId && (
              <div className="muted-small">
                <span style={{ color: "#64748b" }}>ImportId:</span> <b>{importId}</b>
              </div>
            )}
          </div>
        </div>

        <div className="surface">
          <div className="section-header">
            <div className="section-icon purple">
              <FileText size={18} />
            </div>
            <div>
              <div className="section-title">Selecionar Relatório</div>
              <div className="section-sub">Escolha o tipo de relatório para gerar</div>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            {/* Lista clicável (igual ao Figma) */}
            <div
              style={{
                display: "grid",
                gap: 12,
                opacity: step2Blocked ? 0.55 : 1,
                pointerEvents: step2Blocked ? "none" : "auto",
              }}
            >
              {loadingDefs ? (
                <div className="muted-small">Carregando definições...</div>
              ) : defsFiltered.length === 0 ? (
                <div className="muted-small">Nenhum relatório ativo para este tipo.</div>
              ) : (
                defsFiltered.map((d) => {
                  const active = reportCode === d.code;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      className="report-card"
                      onClick={() => setReportCode(d.code)}
                      data-active={active ? "true" : "false"}
                    >
                      <div className="report-title">{d.name}</div>
                      <div className="report-sub">{subtitleFromReportName(d.name)}</div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
            <button
              className="primary-action"
              onClick={handleGenerate}
              disabled={loadingGenerate || !importId || reportCode == null}
              style={{ justifyContent: "center", background: "linear-gradient(90deg, #b794f6 0%, #9f7aea 100%)" }}
            >
              <Sparkles size={18} />
              {loadingGenerate ? "Processando..." : "Gerar Relatório"}
            </button>

            {lastRequestId && (
              <div className="muted-small">
                <span style={{ color: "#64748b" }}>RequestId:</span> <b>{lastRequestId}</b>
              </div>
            )}
          </div>
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};
