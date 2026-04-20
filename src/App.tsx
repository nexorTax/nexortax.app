import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { SidebarLayout } from "./components/SidebarLayout";
import { LoginPage } from "./pages/LoginPage";
import { RegisterFirmPage } from "./pages/RegisterFirmPage";
import { ConvertPage } from "./pages/ConvertPage";
import { RequestsPage } from "./pages/RequestsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ManageUsersPage } from "./pages/ManageUsersPage";
import { SpedReportsPage } from "./pages/SpedReportsPage";
import { AuditLandingPage } from "./pages/AuditLandingPage";
import { AuditBoardPage } from "./pages/AuditBoardPage";

/**
 * Componente raiz da aplicação. Aqui definimos o roteamento das
 * páginas utilizando react-router-dom. O AuthProvider cuida do
 * armazenamento e compartilhamento do estado de autenticação, e o
 * ThemeProvider habilita a mudança entre tema claro e escuro.
 */
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

/**
 * Componente que define as rotas e renderiza o NavBar conforme o
 * estado de autenticação. Utilizamos um nested componente para
 * permitir o uso do hook useAuth dentro do escopo do AuthProvider.
 */
function AppRoutes() {
  const { auth, isInitializing } = useAuth();
  if (isInitializing) {
    return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f6f8fc", color: "#334155", fontWeight: 600 }}>Carregando sessão...</div>;
  }

  return (
    <SidebarLayout>
      <Routes>
        <Route path="/" element={<Navigate to={auth ? "/dashboard" : "/login"} replace />} />
        <Route path="/login" element={auth ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
        <Route path="/register" element={auth ? <Navigate to="/dashboard" replace /> : <RegisterFirmPage />} />
        {/* Rotas protegidas: exigem autenticação */}
        <Route path="/convert" element={auth ? <ConvertPage /> : <Navigate to="/login" replace />} />
        <Route path="/requests" element={auth ? <RequestsPage /> : <Navigate to="/login" replace />} />
        <Route path="/dashboard" element={auth ? <DashboardPage /> : <Navigate to="/login" replace />} />
        <Route path="/users" element={auth ? <ManageUsersPage /> : <Navigate to="/login" replace />} />
        <Route path="/sped" element={auth ? <SpedReportsPage /> : <Navigate to="/login" replace />} />
        {/* Audit module routes */}
        <Route path="/audits" element={auth ? <AuditLandingPage /> : <Navigate to="/login" replace />} />
        <Route path="/audit/:auditRunId" element={auth ? <AuditBoardPage /> : <Navigate to="/login" replace />} />
        {/* Catch-all: redireciona para root */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SidebarLayout>
  );
}