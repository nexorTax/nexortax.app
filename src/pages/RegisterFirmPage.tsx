import React, { useState } from "react";
import { registerFirm } from "../services/api";
import { Link, useNavigate } from "react-router-dom";

export const RegisterFirmPage: React.FC = () => {
  const [firmName, setFirmName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await registerFirm({
        firmName,
        adminName,
        adminEmail,
        adminPassword,
      });
      alert("Empresa registrada com sucesso. Realize o login para continuar.");
      navigate("/login");
    } catch (err: any) {
      alert(err?.message ?? "Erro ao registrar empresa");
    }
  };

  return (
    <div className="page centered">
      <div className="card" style={{ maxWidth: 480, width: "100%" }}>
        <h2 style={{ marginBottom: 16 }}>Registrar empresa</h2>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="form-group">
            <label>Nome da empresa</label>
            <input
              value={firmName}
              onChange={(e) => setFirmName(e.target.value)}
              className="input"
              required
            />
          </div>
          <div className="form-group">
            <label>Nome do administrador</label>
            <input
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              className="input"
              required
            />
          </div>
          <div className="form-group">
            <label>E-mail do administrador</label>
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              className="input"
              required
            />
          </div>
          <div className="form-group">
            <label>Senha do administrador</label>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="input"
              required
            />
          </div>
          <button className="btn primary" type="submit">
            Registrar
          </button>
        </form>
        <p style={{ marginTop: 12 }}>
          Já possui empresa? <Link to="/login">Faça login</Link>
        </p>
      </div>
    </div>
  );
};
