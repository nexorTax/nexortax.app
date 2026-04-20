import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  fetchAvailableAuditPeriods,
  fetchCurrentAuditUsage,
  createAudit,
} from "../services/api";
import type { AvailablePeriodDto } from "../types";
import { useNavigate } from "react-router-dom";

/**
 * Landing page for the audit module. Allows the user to select a client and
 * period, see their current quota and launch a new audit. This page is a
 * simplified starting point; in a real application you would present a
 * dropdown of clients and more polished UI.
 */
export const AuditLandingPage: React.FC = () => {
  const { auth } = useAuth();
  const navigate = useNavigate();
  const [clientId, setClientId] = useState("");
  const [periods, setPeriods] = useState<AvailablePeriodDto[]>([]);
  const [usageMessage, setUsageMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadPeriods() {
    if (!auth || !clientId) return;
    setLoading(true);
    try {
      // Show current quota
      const usage = await fetchCurrentAuditUsage(auth.firmId, auth.accessToken);
      if (usage.usedCount < usage.freeQuota) {
        setUsageMessage(
          `Você possui ${usage.freeQuota - usage.usedCount} auditorias gratuitas restantes este mês.`
        );
      } else {
        setUsageMessage("Sua cota gratuita foi atingida. Será cobrada uma auditoria extra.");
      }
      const res = await fetchAvailableAuditPeriods(clientId, auth.accessToken);
      setPeriods(res.periods);
    } catch (err: any) {
      setUsageMessage(err.message ?? "Erro ao carregar períodos.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStartAudit(period: AvailablePeriodDto) {
    if (!auth) return;
    try {
      const dto = {
        clientId,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        auditType: "Standard",
        sourceMode: period.hasXml ? "SpedPlusXml" : "SpedOnly",
        includeXml: period.hasXml,
      };
      const run = await createAudit(dto, auth.accessToken, auth.firmId);
      navigate(`/audit/${run.id}`);
    } catch (err: any) {
      alert(err.message ?? "Erro ao iniciar auditoria.");
    }
  }

  if (!auth) {
    return <p>É necessário estar autenticado.</p>;
  }

  return (
    <div className="page">
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 600, color: "var(--foreground)", marginBottom: "0.25rem" }}>
          Auditoria Tributária
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
          Selecione um cliente e um período para iniciar uma auditoria fiscal.
        </p>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem" }}>ID do Cliente (GUID)</label>
        <input
          type="text"
          value={clientId}
          onChange={e => setClientId(e.target.value)}
          placeholder="Digite o GUID do cliente"
          style={{ width: "100%", padding: "0.5rem", borderRadius: 4, border: "1px solid var(--border)" }}
        />
        <button onClick={loadPeriods} style={{ marginTop: "0.75rem" }} disabled={!clientId || loading}>
          {loading ? "Carregando..." : "Buscar Períodos"}
        </button>
      </div>

      {usageMessage && <p style={{ marginTop: "0.5rem", marginBottom: "0.75rem" }}>{usageMessage}</p>}

      {periods.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "0.5rem", borderBottom: "1px solid var(--border)" }}>Período</th>
              <th style={{ textAlign: "left", padding: "0.5rem", borderBottom: "1px solid var(--border)" }}>Fonte</th>
              <th style={{ textAlign: "left", padding: "0.5rem", borderBottom: "1px solid var(--border)" }}>XML</th>
              <th style={{ padding: "0.5rem", borderBottom: "1px solid var(--border)" }}></th>
            </tr>
          </thead>
          <tbody>
            {periods.map(p => (
              <tr key={p.periodStart + p.periodEnd}>
                <td style={{ padding: "0.5rem", borderBottom: "1px solid var(--border)" }}>
                  {new Date(p.periodStart).toLocaleDateString()} - {new Date(p.periodEnd).toLocaleDateString()}
                </td>
                <td style={{ padding: "0.5rem", borderBottom: "1px solid var(--border)" }}>{p.sourceType}</td>
                <td style={{ padding: "0.5rem", borderBottom: "1px solid var(--border)" }}>{p.hasXml ? "Sim" : "Não"}</td>
                <td style={{ padding: "0.5rem", borderBottom: "1px solid var(--border)" }}>
                  <button onClick={() => handleStartAudit(p)}>Iniciar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};