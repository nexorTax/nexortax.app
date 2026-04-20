import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "../contexts/AuthContext";

/**
 * Barra de navegação superior. Exibe links conforme a role do usuário
 * (Admin ou User), o botão para alternar tema claro/escuro e um
 * botão de logout. A navegação usa NavLink do react-router-dom para
 * adicionar classes "active" quando a rota está selecionada.
 */
export const NavBar: React.FC = () => {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  if (!auth) return null;

  return (
    <nav className="navbar">
      <div className="nav-links">
        <NavLink to="/convert" className={({ isActive }) => (isActive ? "active" : "")}>Conversão</NavLink>
        <NavLink to="/requests" className={({ isActive }) => (isActive ? "active" : "")}>Solicitações</NavLink>
        {auth.role === "Admin" && (
          <>
           <NavLink to="/sped" className={({ isActive }) => (isActive ? "active" : "")}>SPED/MA</NavLink>
            <NavLink to="/dashboard" className={({ isActive }) => (isActive ? "active" : "")}>Dashboard</NavLink>
            <NavLink to="/users" className={({ isActive }) => (isActive ? "active" : "")}>Usuários</NavLink>
          </>
        )}
      </div>
      <div className="nav-actions">
        <ThemeToggle />
        <button className="btn small ghost" onClick={handleLogout}>Sair</button>
      </div>
    </nav>
  );
};