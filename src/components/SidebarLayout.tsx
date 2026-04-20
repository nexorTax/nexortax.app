import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  Download,
  ArrowLeftRight,
  LogOut,
  Building2,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

type SidebarLayoutProps = {
  children: React.ReactNode;
};

function getInitial(nameOrEmail?: string) {
  const s = (nameOrEmail ?? "").trim();
  if (!s) return "U";
  return s.charAt(0).toUpperCase();
}

export const SidebarLayout: React.FC<SidebarLayoutProps> = ({ children }) => {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();

  if (!auth) return <>{children}</>;

  const userLabel = auth.role === "Admin" ? "Administrador" : "Usuário";
  // O projeto não persiste nome/e-mail do usuário no AuthContext (apenas tokens + firmId + role).
  // Mantemos UI elegante exibindo um rótulo curto + FirmId parcial.
  const firmShort = auth.firmId ? `${auth.firmId.slice(0, 6)}…${auth.firmId.slice(-4)}` : "";

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand__icon">
            <Building2 size={18} />
          </div>
          <div className="sidebar-brand__text">
            <div className="sidebar-brand__title">Portal Corporativo</div>
            <div className="sidebar-brand__subtitle">Gestão Empresarial</div>
          </div>
        </div>

        <div className="sidebar-user">
          <div className="sidebar-user__avatar">{getInitial(firmShort || userLabel)}</div>
          <div className="sidebar-user__meta">
            <div className="sidebar-user__name">{userLabel}</div>
            <div className="sidebar-user__sub">{firmShort}</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
            aria-label="Dashboard">
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>

          {auth.role === "Admin" && (
            <NavLink to="/users" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
              aria-label="Usuários">
              <Users size={18} />
              <span>Usuários</span>
            </NavLink>
          )}

          {/* {auth.role === "Admin" && (
            <NavLink to="/sped" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
              aria-label="SPED/MA">
              <FileText size={18} />
              <span>SPED/MA</span>
            </NavLink>
          )} */}

          <NavLink to="/requests" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
            aria-label="Solicitações">
            <Download size={18} />
            <span>Solicitações</span>
          </NavLink>

          <NavLink to="/convert" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
            aria-label="Conversão">
            <ArrowLeftRight size={18} />
            <span>Conversão</span>
          </NavLink>

          {/* Link to audit module available to both admin and user */}
          {/* <NavLink to="/audits" className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
            aria-label="Auditoria Tributária">
            <FileText size={18} />
            <span>Auditoria</span>
          </NavLink> */}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-logout" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <main className="shell-content">{children}</main>
    </div>
  );
};
