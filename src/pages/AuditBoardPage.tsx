import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  fetchAuditSummary,
  fetchAuditFindings,
} from "../services/api";
import type { AuditSummaryDto, AuditFindingListDto } from "../types";

/**
 * AuditBoardPage renders the main dashboard for a single audit run. It shows
 * executive metrics at the top and a simplified list of findings below.
 * In a complete implementation this page would include filters, tabs, charts
 * and a detailed drawer for findings; here we focus on illustrating the
 * structure using existing styles from the Dashboard.
 */
export const AuditBoardPage: React.FC = () => {
  const { auditRunId } = useParams();
  const { auth } = useAuth();
  const [summary, setSummary] = useState<AuditSummaryDto | null>(null);
  const [findings, setFindings] = useState<AuditFindingListDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!auth || !auditRunId) return;
      setLoading(true);
      try {
        const s = await fetchAuditSummary(auditRunId, auth.accessToken);
        setSummary(s);
        const f = await fetchAuditFindings(auditRunId, {}, auth.accessToken);
        setFindings(f);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [auth, auditRunId]);

  if (!auth) {
    return <p>É necessário estar autenticado.</p>;
  }

  if (!auditRunId) {
    return <p>ID da auditoria ausente.</p>;
  }

  if (loading) {
    return <p>Carregando auditoria...</p>;
  }

  if (!summary) {
    return <p>Auditoria não encontrada.</p>;
  }

  // Local card component based on the stat-card style
  const Card: React.FC<{ title: string; value: any; color: string }> = ({ title, value, color }) => (
    <div className="stat-card">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <p className="stat-title">{title}</p>
          <h3 className="stat-value">{value ?? "-"}</h3>
        </div>
        <div className="stat-icon-container" style={{ background: color }} />
      </div>
    </div>
  );

  return (
    <div className="page">
      <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: 600, color: "var(--foreground)", marginBottom: "0.25rem" }}>
            Auditoria #{summary.auditRunId.slice(0, 8)}
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
            Status: {summary.status} | Iniciado em: {new Date(summary.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Cards grid */}
      <div className="stat-grid">
        <Card title="Score Fiscal" value={summary.scoreFiscal?.toFixed(1)} color="linear-gradient(to bottom right, #3b82f6, #60a5fa)" />
        <Card title="Total de Achados" value={summary.totalFindings} color="linear-gradient(to bottom right, #f59e0b, #fbbf24)" />
        <Card title="Total de Créditos" value={summary.totalCredits} color="linear-gradient(to bottom right, #10b981, #34d399)" />
        <Card title="Valor Recuperável" value={summary.estimatedCreditAmount?.toLocaleString(undefined, { style: "currency", currency: "BRL" })} color="linear-gradient(to bottom right, #8b5cf6, #a78bfa)" />
        <Card title="Exposição Fiscal" value={summary.estimatedRiskAmount?.toLocaleString(undefined, { style: "currency", currency: "BRL" })} color="linear-gradient(to bottom right, #ef4444, #f87171)" />
        <Card title="Documentos" value={summary.totalDocumentsAnalyzed} color="linear-gradient(to bottom right, #14b8a6, #2dd4bf)" />
        <Card title="Itens" value={summary.totalItemsAnalyzed} color="linear-gradient(to bottom right, #ec4899, #f472b6)" />
      </div>

      <h2 style={{ marginTop: "2rem", marginBottom: "1rem" }}>Achados</h2>
      {findings.length === 0 && <p>Nenhum achado encontrado.</p>}
      {findings.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "0.5rem", borderBottom: "1px solid var(--border)" }}>Severidade</th>
              <th style={{ textAlign: "left", padding: "0.5rem", borderBottom: "1px solid var(--border)" }}>Categoria</th>
              <th style={{ textAlign: "left", padding: "0.5rem", borderBottom: "1px solid var(--border)" }}>Título</th>
              <th style={{ textAlign: "right", padding: "0.5rem", borderBottom: "1px solid var(--border)" }}>Impacto</th>
            </tr>
          </thead>
          <tbody>
            {findings.map(f => (
              <tr key={f.id} style={{ cursor: "pointer" }} onClick={() => alert("Detalhe ainda não implementado") }>
                <td style={{ padding: "0.5rem", borderBottom: "1px solid var(--border)" }}>
                  <span className="severity-badge" data-level={f.severity.toLowerCase()}>{f.severity}</span>
                </td>
                <td style={{ padding: "0.5rem", borderBottom: "1px solid var(--border)" }}>{f.category}</td>
                <td style={{ padding: "0.5rem", borderBottom: "1px solid var(--border)" }}>{f.title}</td>
                <td style={{ textAlign: "right", padding: "0.5rem", borderBottom: "1px solid var(--border)" }}>
                  {f.impactAmount?.toLocaleString(undefined, { style: "currency", currency: "BRL" }) ?? "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};