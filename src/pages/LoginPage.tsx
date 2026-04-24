import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LogIn, AlertCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { loginRequest } from "../services/api";
import logoPortal from "../assets/logo-portal.png";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const authPayload = await loginRequest(username, password);
      login(authPayload);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err?.message ?? "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-brand">
          <div className="login-brand-icon">
            <img src={logoPortal} alt="Logo do portal" className="login-brand-image" />
          </div>
                    <p className="login-brand-subtitle">Acesso exclusivo para empresas vinculadas</p>
        </div>

        <div className="login-card">
          <form onSubmit={handleSubmit}>
            <div className="login-form-group">
              <label htmlFor="username" className="text-base" style={{ color: "var(--muted)" }}>
                Usuário
              </label>
            <div className="login-input-wrapper">
              <input
                id="username"
                type="text"
                placeholder="seu.email@empresa.com"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="login-input"
                required
              />
            </div>
            </div>

            <div className="login-form-group">
              <label htmlFor="password" className="text-base" style={{ color: "var(--muted)" }}>
                Senha
              </label>
              <div className="login-input-wrapper">
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="login-input"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="login-error">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      borderWidth: 2,
                      borderStyle: "solid",
                      borderColor: "#fff",
                      borderTopColor: "transparent",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                    }}
                  ></span>
                  Autenticando...
                </span>
              ) : (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <LogIn className="w-5 h-5" />
                  Entrar
                </span>
              )}
            </button>
          </form>

          <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
            <p style={{ fontSize: "0.875rem", color: "var(--muted)", marginBottom: "0.5rem" }}>
              Ainda não possui acesso?
            </p>
            <Link
              to="/register"
              style={{
                fontSize: "0.875rem",
                color: "#4f46e5",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Solicitar cadastro da empresa
            </Link>
          </div>
        </div>

        <div className="login-footer">
          Sistema seguro e exclusivo para empresas parceiras
        </div>
      </div>
    </div>
  );
};