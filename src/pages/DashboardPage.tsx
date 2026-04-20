import React, { useEffect, useState } from "react";
import { fetchMetrics } from "../services/api";
import { DashboardMetricsDto } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { Users, UserPlus, Download, DownloadCloud } from "lucide-react";

export const DashboardPage: React.FC = () => {
  const { auth } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetricsDto | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!auth) return;

      const startDate = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      ).toISOString();

      const endDate = new Date().toISOString();

      const data = await fetchMetrics(
        auth.firmId,
        startDate,
        endDate,
        auth.accessToken
      );

      setMetrics(data);
    };

    load();
  }, [auth]);

  if (!metrics) {
    return (
      <div className="page">
        <p style={{ color: "#64748b" }}>Carregando métricas...</p>
      </div>
    );
  }

  const StatCard: React.FC<{
    title: string;
    value: number;
    icon: any;
    color: string;
  }> = ({ title, value, icon: Icon, color }) => (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "18px",
        padding: "28px 30px",
        minHeight: "136px",
        boxShadow: "0 6px 18px rgba(15, 23, 42, 0.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "16px",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              fontSize: "16px",
              fontWeight: 500,
              color: "#475569",
            }}
          >
            {title}
          </p>

          <h3
            style={{
              margin: "12px 0 0 0",
              fontSize: "44px",
              lineHeight: 1,
              fontWeight: 700,
              color: "#0f172a",
            }}
          >
            {value}
          </h3>
        </div>

        <div
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: color,
            flexShrink: 0,
          }}
        >
          <Icon size={26} color="#ffffff" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="page">
      <div style={{ marginBottom: "1.75rem" }}>
        <h1
          style={{
            margin: 0,
            fontSize: "3rem",
            fontWeight: 700,
            color: "#0f172a",
            letterSpacing: "-0.02em",
          }}
        >
          Dashboard
        </h1>

        <p
          style={{
            marginTop: "10px",
            marginBottom: 0,
            color: "#94a3b8",
            fontSize: "1rem",
          }}
        >
          Visão geral das operações e métricas
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "24px",
        }}
      >
        <StatCard
          title="Total de Clientes"
          value={metrics.totalClients}
          icon={Users}
          color="linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)"
        />

        <StatCard
          title="Clientes este mês"
          value={metrics.clientsThisMonth}
          icon={UserPlus}
          color="linear-gradient(135deg, #10b981 0%, #34d399 100%)"
        />

        <StatCard
          title="Downloads totais"
          value={metrics.totalDownloads}
          icon={Download}
          color="linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)"
        />

        <StatCard
          title="Downloads este mês"
          value={metrics.downloadsThisMonth}
          icon={DownloadCloud}
          color="linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)"
        />
      </div>
    </div>
  );
};