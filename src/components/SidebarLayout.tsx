import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import logoBar from "../assets/logo-bar.png";
import {
  LayoutDashboard,
  Users,
  FileText,
  Download,
  ArrowLeftRight,
  LogOut,
  User,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

type SidebarLayoutProps = {
  children: React.ReactNode;
};

export const SidebarLayout: React.FC<SidebarLayoutProps> = ({ children }) => {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();

  if (!auth) return <>{children}</>;

  const userLabel = auth.role === "Admin" ? "Administrador" : "Usuário";
  const firmShort = auth.firmId ? `${auth.firmId.slice(0, 6)}…${auth.firmId.slice(-4)}` : "";

  // ajuste aqui caso depois você passe a salvar a foto no auth
  const userImage = (auth as any)?.userImage || "";

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand__icon">
            <img src={logoBar} alt="Nexor Tax" className="sidebar-brand__logo" />
          </div>

          <div className="sidebar-brand__text">
            <div className="sidebar-brand__title">Nexor tax</div>
            <div className="sidebar-brand__subtitle">Gestão Empresarial</div>
          </div>
        </div>

        <div className="sidebar-user">
          <div className="sidebar-user__avatar">
            {userImage ? (
              <img
                src={userImage}
                alt="Foto do usuário"
                className="sidebar-user__avatar-image"
              />
            ) : (
              <User size={20} />
            )}
          </div>

          <div className="sidebar-user__meta">
            <div className="sidebar-user__name">{userLabel}</div>
            <div className="sidebar-user__sub">{firmShort}</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
            aria-label="Dashboard"
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>

          {auth.role === "Admin" && (
            <NavLink
              to="/users"
              className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
              aria-label="Usuários"
            >
              <Users size={18} />
              <span>Usuários</span>
            </NavLink>
          )}

          <NavLink
            to="/requests"
            className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
            aria-label="Solicitações"
          >
            <Download size={18} />
            <span>Solicitações</span>
          </NavLink>

          <NavLink
            to="/convert"
            className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
            aria-label="Conversão"
          >
            <ArrowLeftRight size={18} />
            <span>Conversão</span>
          </NavLink>
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