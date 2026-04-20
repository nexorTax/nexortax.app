import React, { useEffect, useMemo, useState } from "react";
import {
  UserPlus,
  Users as UsersIcon,
  Shield,
  Mail,
  User,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { fetchUsers, addUser } from "../services/api";
import { UserDto } from "../types";
import { useAuth } from "../contexts/AuthContext";

function initials(name: string) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  const first = parts[0]?.[0] ?? "U";
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + second).toUpperCase();
}

export const ManageUsersPage: React.FC = () => {
  const { auth } = useAuth();

  const [users, setUsers] = useState<UserDto[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState<string>("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const firmId = useMemo(() => (auth?.firmId ?? "").trim(), [auth?.firmId]);

  async function reload() {
    if (!auth?.accessToken || !firmId) return;
    setLoadingUsers(true);
    setError("");
    try {
      const data = await fetchUsers(firmId, auth.accessToken);
      setUsers(data);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoadingUsers(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.accessToken, firmId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth?.accessToken || !firmId) return;
    setIsAdding(true);
    setError("");
    try {
      await addUser(firmId, { name, email, password }, auth.accessToken);
      setName("");
      setEmail("");
      setPassword("");
      await reload();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="page">
      {/* Header (igual Figma) */}
      <div className="users-header">
        <div>
          <h1 className="page-title">Gerenciar Usuários</h1>
          <p className="page-subtitle">Administre os usuários da sua empresa</p>
        </div>

        <div className="users-count">
          <UsersIcon size={18} />
          <span>{users.length} usuários</span>
        </div>
      </div>

      {error ? (
        <div className="alert error" style={{ marginBottom: 16 }}>
          {error}
        </div>
      ) : null}

      {/* Add user form (igual Figma) */}
      <div className="surface" style={{ marginBottom: 16 }}>
        <div className="users-surface-head">
          <div className="users-surface-icon users-surface-icon--blue">
            <UserPlus size={18} />
          </div>
          <div>
            <div className="users-surface-title">Adicionar Novo Usuário</div>
            <div className="users-surface-sub">Usuário será vinculado automaticamente à sua empresa</div>
          </div>
        </div>

        <form onSubmit={handleAdd} className="users-form">
          <div className="users-form-grid">
            <div>
              <label className="label">Nome Completo</label>
              <div className="input-icon">
                <User size={16} />
                <input
                  className="input"
                  placeholder="João Silva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">E-mail Corporativo</label>
              <div className="input-icon">
                <Mail size={16} />
                <input
                  type="email"
                  className="input"
                  placeholder="joao@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">Senha Inicial</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button className="btn primary users-add-btn" type="submit" disabled={isAdding}>
            {isAdding ? (
              <span className="users-btn-loading">
                <span className="spinner" />
                Adicionando...
              </span>
            ) : (
              <span className="users-btn-loading">
                <UserPlus size={16} />
                Adicionar Usuário
              </span>
            )}
          </button>
        </form>
      </div>

      {/* Users list (igual Figma) */}
      <div className="surface">
        <div className="users-surface-head">
          <div className="users-surface-icon users-surface-icon--purple">
            <UsersIcon size={18} />
          </div>
          <div>
            <div className="users-surface-title">Usuários da Empresa</div>
            <div className="users-surface-sub">Todos os usuários cadastrados no sistema</div>
          </div>
        </div>

        {loadingUsers ? (
          <div className="empty-state">Carregando usuários...</div>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <UsersIcon size={28} />
            </div>
            <div className="empty-title">Nenhum usuário cadastrado ainda</div>
            <div className="empty-sub">Adicione o primeiro usuário usando o formulário acima</div>
          </div>
        ) : (
          <div className="users-list">
            {users.map((u) => {
              const isAdmin = (u.role ?? "").toLowerCase() === "admin";
              const isActive = (u as any)?.active ?? true; // backend pode não fornecer

              return (
                <div key={u.id} className="user-row">
                  <div className="user-avatar">{initials(u.name)}</div>

                  <div className="user-main">
                    <div className="user-topline">
                      <div className="user-name">{u.name}</div>

                      {isAdmin ? (
                        <span className="pill pill-purple">
                          <Shield size={12} />
                          Admin
                        </span>
                      ) : null}

                      {isActive ? (
                        <span className="pill pill-green">
                          <CheckCircle size={12} />
                          Ativo
                        </span>
                      ) : (
                        <span className="pill pill-gray">
                          <XCircle size={12} />
                          Inativo
                        </span>
                      )}
                    </div>
                    <div className="user-email">{u.email}</div>
                  </div>

                  <div className="user-actions">
                    <button className="btn ghost" type="button" disabled>
                      Editar
                    </button>
                    <button className="btn ghost danger" type="button" disabled>
                      Desativar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
