import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, Download, Filter, Hourglass, Plus, RefreshCcw } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { importClientsExcel } from "../services/api";

interface Client {
  id: string;
  cnpjToken: string;
  companyName?: string;
}

interface RequestItem {
  id: string;
  clientId: string;
  status: string;
  requestedAt: string;
  completedAt?: string;
  resultBlobUrl?: string;
  client?: Client;
}

const API_BASE = import.meta.env.VITE_API_BASE ?? "https://localhost:5001";

function getInitial(label?: string) {
  const s = (label ?? "").trim();
  if (!s) return "C";
  return s.charAt(0).toUpperCase();
}

function normalizeStatus(raw?: string): "Pending" | "Processing" | "Completed" | "Error" {
  const s = (raw ?? "").trim().toLowerCase();

  if (s.includes("concluído") || s.includes("concluido") || s.includes("complete") || s === "done") {
    return "Completed";
  }

  if (s.includes("error") || s.includes("erro") || s.includes("fail") || s.includes("expired") || s.includes("expirado")) {
    return "Error";
  }

  if (s.includes("process") || s.includes("running") || s.includes("uploading")) {
    return "Processing";
  }

  return "Pending";
}

function formatDate(value?: string) {
  if (!value) return "Data indisponível";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Data inválida";
  return d.toLocaleString("pt-BR");
}

export const RequestsPage: React.FC = () => {
  const { auth, logout } = useAuth();

  const [clients, setClients] = useState<Client[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [toast, setToast] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "Pending" | "Processing" | "Completed" | "Error">("all");
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [clientsExcelFile, setClientsExcelFile] = useState<File | null>(null);
  const [importingClients, setImportingClients] = useState(false);
  const firmId = useMemo(() => (auth?.firmId ?? "").trim(), [auth?.firmId]);

  function showToast(msg: string) {
    setToast(msg);
    clearTimeout((showToast as any)._t);
    (showToast as any)._t = setTimeout(() => setToast(""), 3500);
  }

  function handleUnauthorized() {
    showToast("Sessão expirada. Faça login novamente.");
    setTimeout(() => logout(), 500);
  }

  useEffect(() => {
    if (!auth) return;
    fetchClients();
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth]);

  async function fetchClients() {
    if (!auth) return;
    setLoadingClients(true);
    try {
      const res = await fetch(`${API_BASE}/api/clients`, {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!res.ok) {
        showToast("Erro ao carregar clientes.");
        return;
      }

      const data = await res.json();
      setClients(Array.isArray(data) ? data : []);
    } catch (e: any) {
      showToast(`Erro ao carregar clientes: ${e?.message ?? String(e)}`);
    } finally {
      setLoadingClients(false);
    }
  }

  async function fetchRequests() {
    if (!auth) return;
    setLoadingRequests(true);
    try {
      const res = await fetch(`${API_BASE}/api/requests`, {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!res.ok) {
        showToast("Erro ao carregar solicitações.");
        return;
      }

      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (e: any) {
      showToast(`Erro ao carregar solicitações: ${e?.message ?? String(e)}`);
    } finally {
      setLoadingRequests(false);
    }
  }

  async function handleImportClients() {
    if (!auth?.accessToken) return;

    if (!firmId) {
      showToast("FirmId não encontrado no token. Faça login novamente.");
      return;
    }

    if (!clientsExcelFile) {
      showToast("Selecione uma planilha (.xlsx) para importar.");
      return;
    }

    try {
      setImportingClients(true);
      await importClientsExcel(firmId, clientsExcelFile, auth.accessToken);
      setClientsExcelFile(null);
      setShowNewRequest(false);
      await Promise.all([fetchClients(), fetchRequests()]);
      showToast("Arquivo enviado com sucesso. A integração foi iniciada e a solicitação já foi criada.");
    } catch (e: any) {
      showToast(`Erro ao importar clientes: ${e?.message ?? String(e)}`);
    } finally {
      setImportingClients(false);
    }
  }

  async function handleDownload(requestId: string) {
    if (!auth?.accessToken) {
      showToast("Sessão expirada. Faça login novamente.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/requests/${requestId}/download`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        if (response.status === 404) {
          showToast("Resultado não encontrado.");
          return;
        }

        const errorText = await response.text();
        showToast(`Erro ao baixar arquivo: ${errorText || response.status}`);
        return;
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition");
      let fileName = `REQ-${requestId}.zip`;

      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/i);
        if (match?.[1]) fileName = match[1];
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      showToast(`Erro ao baixar arquivo: ${e?.message ?? String(e)}`);
    }
  }

  const requestStats = useMemo(() => {
    const norm = requests.map((r) => normalizeStatus(r.status));
    return {
      total: requests.length,
      pending: norm.filter((s) => s === "Pending").length,
      processing: norm.filter((s) => s === "Processing").length,
      completed: norm.filter((s) => s === "Completed").length,
      error: norm.filter((s) => s === "Error").length,
    };
  }, [requests]);

  const filteredRequests = useMemo(() => {
    if (statusFilter === "all") return requests;
    return requests.filter((r) => normalizeStatus(r.status) === statusFilter);
  }, [requests, statusFilter]);

  return (
    <div className="page">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Solicitações e Downloads</h1>
          <p className="page-subtitle">Envie arquivos para integração e acompanhe o histórico das solicitações</p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="btn tiny ghost" onClick={() => fetchRequests()} disabled={loadingRequests}>
            <RefreshCcw size={16} />
            Atualizar
          </button>
          <button className="primary-action" onClick={() => setShowNewRequest(true)}>
            <Plus size={18} />
            Nova Integração
          </button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-meta">
            <div className="kpi-label">Total</div>
            <div className="kpi-value">{requestStats.total}</div>
          </div>
          <div className="kpi-icon blue"><Download size={18} /></div>
        </div>

        <div className="kpi-card">
          <div className="kpi-meta">
            <div className="kpi-label">Pendentes</div>
            <div className="kpi-value">{requestStats.pending}</div>
          </div>
          <div className="kpi-icon amber"><Hourglass size={18} /></div>
        </div>

        <div className="kpi-card">
          <div className="kpi-meta">
            <div className="kpi-label">Em Processo</div>
            <div className="kpi-value">{requestStats.processing}</div>
          </div>
          <div className="kpi-icon blue2"><Clock size={18} /></div>
        </div>

        <div className="kpi-card">
          <div className="kpi-meta">
            <div className="kpi-label">Concluídos</div>
            <div className="kpi-value">{requestStats.completed}</div>
          </div>
          <div className="kpi-icon green"><CheckCircle2 size={18} /></div>
        </div>
      </div>

      <div className="surface" style={{ marginBottom: 16 }}>
        <div className="section-header">
          <div className="section-icon purple"><Download size={18} /></div>
          <div>
            <div className="section-title">Clientes Cadastrados</div>
            <div className="section-sub">Empresas importadas para alimentar o dashboard e o histórico</div>
          </div>
        </div>

        {loadingClients ? (
          <div className="muted-small" style={{ marginTop: 12 }}>Carregando...</div>
        ) : clients.length === 0 ? (
          <div className="muted-small" style={{ marginTop: 12 }}>Nenhum cliente cadastrado.</div>
        ) : (
          <div className="client-grid" style={{ marginTop: 14 }}>
            {clients.slice(0, 9).map((c) => (
              <div key={c.id} className="client-card" title="Cliente importado">
                <div className="client-avatar">{getInitial(c.companyName ?? c.cnpjToken)}</div>
                <div className="client-name">{c.companyName ?? `Cliente ${c.id}`}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="surface">
        <div className="section-row" style={{ justifyContent: "space-between" }}>
          <div className="section-header" style={{ marginBottom: 0 }}>
            <div className="section-icon green"><Download size={18} /></div>
            <div>
              <div className="section-title">Histórico de Solicitações</div>
              <div className="section-sub">Acompanhe todas as solicitações realizadas</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="filter">
              <Filter size={16} />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="filter-select">
                <option value="all">Todos os status</option>
                <option value="Pending">Pendentes</option>
                <option value="Processing">Processando</option>
                <option value="Completed">Concluídos</option>
                <option value="Error">Erro</option>
              </select>
            </div>
          </div>
        </div>

        {loadingRequests ? (
          <div className="muted-small" style={{ marginTop: 12 }}>Carregando...</div>
        ) : filteredRequests.length === 0 ? (
          <div className="muted-small" style={{ marginTop: 12 }}>Nenhuma solicitação.</div>
        ) : (
          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            {filteredRequests.map((r) => {
              const st = normalizeStatus(r.status);
              const canDownload = !!r.resultBlobUrl && st === "Completed";

              return (
                <div key={r.id} className="history-item">
                  <div className="history-left">
                    <div className="history-icon"><Download size={18} /></div>

                  <div className="history-main">
                    <div className="history-title">
                      Solicitação realizada
                    </div>

                    <div className="history-sub">
                      {(r.client?.companyName ?? r.client?.cnpjToken ?? `Cliente ${r.clientId}`)} • {formatDate(r.requestedAt)}
                    </div>
                  </div>
                  </div>

                  <div className="history-right">
                    <span className={`status-pill ${st === "Completed" ? "success" : st === "Processing" ? "progress" : st === "Error" ? "error" : "pending"}`}>
                      {st === "Completed" ? "Concluído" : st === "Processing" ? "Processando" : st === "Error" ? "Erro" : "Pendente"}
                    </span>

                    {canDownload ? (
                      <button type="button" className="download-btn" onClick={() => handleDownload(r.id)} title="Baixar resultado">
                        <Download size={16} />
                      </button>
                    ) : (
                      <span className="download-btn disabled" title="Ainda não disponível">
                        <Download size={16} />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showNewRequest && (
        <div className="modal-backdrop" onClick={() => setShowNewRequest(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title">Nova Integração</div>
                <div className="muted-small">Envie a planilha para integrar os clientes e abrir a requisição do SPED</div>
              </div>
              <button className="btn tiny ghost" onClick={() => setShowNewRequest(false)}>Fechar</button>
            </div>

            <div className="modal-body">
              <div style={{ display: "grid", gap: 14 }}>
                <div className="muted-small">
                  Esta tela é exclusiva para upload do arquivo que alimenta a integração e gera a solicitação automaticamente.
                </div>

                <div className="surface" style={{ padding: 14, background: "#f8fafc" }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Enviar arquivo de integração</div>
                  <div className="muted-small" style={{ marginBottom: 12 }}>
                    Selecione a planilha em Excel para importar os clientes e disparar a nova solicitação.
                  </div>

                  <input type="file" accept=".xlsx,.xls" onChange={(e) => setClientsExcelFile(e.target.files?.[0] ?? null)} />

                  {clientsExcelFile && <div className="muted-small" style={{ marginTop: 10 }}>{clientsExcelFile.name}</div>}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="primary-action" onClick={handleImportClients} disabled={!clientsExcelFile || importingClients}>
                <Plus size={18} />
                {importingClients ? "Enviando..." : "Enviar arquivo e criar solicitação"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};
