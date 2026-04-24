import React, { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Building2, PlusCircle, LogOut, Search, MapPin, Mail, Phone, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchMasterFirms, masterLoginRequest, registerFirm } from "../services/api";
import type { FirmRegisterDto, MasterFirmListItemDto } from "../types";

const MASTER_TOKEN_KEY = "master_access_token";

const initialForm: FirmRegisterDto = {
  firmName: "",
  corporateName: "",
  cnpj: "",
  stateRegistration: "",
  municipalRegistration: "",
  primaryEmail: "",
  primaryPhone: "",
  website: "",
  contactName: "",
  contactRole: "",
  notes: "",
  postalCode: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  adminName: "",
  adminEmail: "",
  adminPassword: "",
  isActive:true
};

function maskCnpj(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function maskCep(value: string) {
  return value.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString("pt-BR");
  } catch {
    return value;
  }
}

export const RegisterFirmPage: React.FC = () => {
  const [masterUsername, setMasterUsername] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [masterToken, setMasterToken] = useState<string>(() => sessionStorage.getItem(MASTER_TOKEN_KEY) ?? "");
  const [masterLoading, setMasterLoading] = useState(false);
  const [masterError, setMasterError] = useState("");

  const [form, setForm] = useState<FirmRegisterDto>(initialForm);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  const [firms, setFirms] = useState<MasterFirmListItemDto[]>([]);
  const [firmsLoading, setFirmsLoading] = useState(false);
  const [search, setSearch] = useState("");

  const filteredFirms = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return firms;
    return firms.filter((firm) =>
      [firm.name, firm.tradeName, firm.cnpj, firm.primaryEmail, firm.city, firm.state, firm.contactName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [firms, search]);

  async function loadFirms(token: string) {
    setFirmsLoading(true);
    try {
      const data = await fetchMasterFirms(token);
      setFirms(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setMasterError(err?.message ?? "Não foi possível carregar as empresas.");
    } finally {
      setFirmsLoading(false);
    }
  }

  useEffect(() => {
    if (masterToken) {
      sessionStorage.setItem(MASTER_TOKEN_KEY, masterToken);
      loadFirms(masterToken);
    }
  }, [masterToken]);

  const updateField = (field: keyof FirmRegisterDto, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleMasterLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMasterError("");
    setMasterLoading(true);
    try {
      const response = await masterLoginRequest(masterUsername, masterPassword);
      setMasterToken(response.accessToken);
      setMasterPassword("");
    } catch (err: any) {
      setMasterError(err?.message ?? "Credenciais master inválidas.");
    } finally {
      setMasterLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(MASTER_TOKEN_KEY);
    setMasterToken("");
    setFirms([]);
    setMasterUsername("");
    setMasterPassword("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError("");
    setSaveMessage("");
    setSaving(true);
    try {
      await registerFirm(form, masterToken);
      setSaveMessage("Empresa cadastrada com sucesso.");
      setForm(initialForm);
      await loadFirms(masterToken);
    } catch (err: any) {
      setSaveError(err?.message ?? "Erro ao registrar empresa.");
    } finally {
      setSaving(false);
    }
  };

  if (!masterToken) {
    return (
      <div className="master-login-page">
        <div className="master-login-shell">
          <div className="master-login-side">
            <span className="master-badge"><ShieldCheck size={16} /> Portal Master</span>
            <h1>Cadastro centralizado de empresas</h1>
            <p>
              Este acesso é exclusivo para administração master. Aqui você poderá cadastrar novas empresas,
              consultar a base ativa e preparar a estrutura para cobrança SaaS.
            </p>
            <ul>
              <li>Controle único de onboarding</li>
              <li>Acesso fora do portal operacional</li>
              <li>Base pronta para planos, cobrança e status</li>
            </ul>
          </div>

          <div className="master-login-card">
            <h2>Autenticação master</h2>
            <p className="muted-text">Informe a senha master para liberar o cadastro de empresas.</p>
            <form onSubmit={handleMasterLogin} className="stack-form">
              <div className="form-group">
                <label>Usuário master</label>
                <input
                  className="input"
                  value={masterUsername}
                  onChange={(e) => setMasterUsername(e.target.value)}
                  placeholder="master"
                  required
                />
              </div>
              <div className="form-group">
                <label>Senha master</label>
                <input
                  type="password"
                  className="input"
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              {masterError ? <div className="form-alert error">{masterError}</div> : null}
              <button className="btn primary master-submit" disabled={masterLoading} type="submit">
                {masterLoading ? "Validando..." : "Entrar no portal master"}
              </button>
            </form>
            <div className="master-login-footer">
              <span>Área isolada do sistema principal</span>
              <Link to="/login">Voltar para login do portal</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="master-page">
      <div className="master-topbar">
        <div>
          <span className="master-badge"><ShieldCheck size={16} /> Acesso master ativo</span>
          <h1>Empresas cadastradas</h1>
          <p>Cadastre novas empresas com dados completos e acompanhe a base operacional.</p>
        </div>
        <button className="btn ghost" onClick={handleLogout} type="button">
          <LogOut size={16} /> Sair
        </button>
      </div>

      <div className="master-grid">
        <section className="master-form-card">
          <div className="section-heading">
            <PlusCircle size={20} />
            <div>
              <h2>Novo cadastro de empresa</h2>
              <p>Preencha dados cadastrais, contato principal, endereço e usuário administrador.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="firm-register-form">
            <div className="form-section-title">Dados da empresa</div>
            <div className="register-grid two-columns">
              <div className="form-group">
                <label>Razão social</label>
                <input className="input" value={form.firmName} onChange={(e) => updateField("firmName", e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Nome fantasia</label>
                <input className="input" value={form.corporateName ?? ""} onChange={(e) => updateField("corporateName", e.target.value)} />
              </div>
              <div className="form-group">
                <label>CNPJ</label>
                <input className="input" value={form.cnpj} onChange={(e) => updateField("cnpj", maskCnpj(e.target.value))} required />
              </div>
              <div className="form-group">
                <label>Inscrição estadual</label>
                <input className="input" value={form.stateRegistration ?? ""} onChange={(e) => updateField("stateRegistration", e.target.value)} />
              </div>
              <div className="form-group">
                <label>Inscrição municipal</label>
                <input className="input" value={form.municipalRegistration ?? ""} onChange={(e) => updateField("municipalRegistration", e.target.value)} />
              </div>
              <div className="form-group">
                <label>Website</label>
                <input className="input" value={form.website ?? ""} onChange={(e) => updateField("website", e.target.value)} placeholder="https://" />
              </div>
            </div>

            <div className="form-section-title">Contato principal</div>
            <div className="register-grid two-columns">
              <div className="form-group">
                <label>E-mail principal</label>
                <input type="email" className="input" value={form.primaryEmail} onChange={(e) => updateField("primaryEmail", e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Telefone principal</label>
                <input className="input" value={form.primaryPhone ?? ""} onChange={(e) => updateField("primaryPhone", maskPhone(e.target.value))} />
              </div>
              <div className="form-group">
                <label>Responsável</label>
                <input className="input" value={form.contactName} onChange={(e) => updateField("contactName", e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Cargo do responsável</label>
                <input className="input" value={form.contactRole ?? ""} onChange={(e) => updateField("contactRole", e.target.value)} />
              </div>
            </div>

            <div className="form-section-title">Endereço</div>
            <div className="register-grid address-grid">
              <div className="form-group">
                <label>CEP</label>
                <input className="input" value={form.postalCode} onChange={(e) => updateField("postalCode", maskCep(e.target.value))} required />
              </div>
              <div className="form-group span-2">
                <label>Logradouro</label>
                <input className="input" value={form.street} onChange={(e) => updateField("street", e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Número</label>
                <input className="input" value={form.number} onChange={(e) => updateField("number", e.target.value)} required />
              </div>
              <div className="form-group span-2">
                <label>Complemento</label>
                <input className="input" value={form.complement ?? ""} onChange={(e) => updateField("complement", e.target.value)} />
              </div>
              <div className="form-group">
                <label>Bairro</label>
                <input className="input" value={form.neighborhood} onChange={(e) => updateField("neighborhood", e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Cidade</label>
                <input className="input" value={form.city} onChange={(e) => updateField("city", e.target.value)} required />
              </div>
              <div className="form-group">
                <label>UF</label>
                <input className="input" value={form.state} onChange={(e) => updateField("state", e.target.value.toUpperCase().slice(0, 2))} required />
              </div>
            </div>

            <div className="form-section-title">Administrador da empresa</div>
            <div className="register-grid two-columns">
              <div className="form-group">
                <label>Nome do administrador</label>
                <input className="input" value={form.adminName} onChange={(e) => updateField("adminName", e.target.value)} required />
              </div>
              <div className="form-group">
                <label>E-mail do administrador</label>
                <input type="email" className="input" value={form.adminEmail} onChange={(e) => updateField("adminEmail", e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Senha inicial</label>
                <input type="password" className="input" value={form.adminPassword} onChange={(e) => updateField("adminPassword", e.target.value)} required />
              </div>
            </div>

            <div className="form-section-title">Observações</div>
            <div className="form-group">
              <label>Notas internas</label>
              <textarea
                className="input textarea"
                value={form.notes ?? ""}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="Informações complementares, onboarding, dados de cobrança futura..."
              />
            </div>

            {saveError ? <div className="form-alert error">{saveError}</div> : null}
            {saveMessage ? <div className="form-alert success">{saveMessage}</div> : null}

            <div className="form-actions">
              <button type="button" className="btn ghost" onClick={() => setForm(initialForm)}>
                Limpar
              </button>
              <button className="btn primary" type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Cadastrar empresa"}
              </button>
            </div>
          </form>
        </section>

        <section className="master-list-card">
          <div className="section-heading">
            <Building2 size={20} />
            <div>
              <h2>Base de empresas</h2>
              <p>{firms.length} empresa(s) cadastrada(s) no portal master.</p>
            </div>
          </div>

          <div className="search-box">
            <Search size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, CNPJ, e-mail ou cidade"
            />
          </div>

          <div className="firm-list">
            {firmsLoading ? <div className="empty-state">Carregando empresas...</div> : null}
            {!firmsLoading && filteredFirms.length === 0 ? (
              <div className="empty-state">Nenhuma empresa encontrada.</div>
            ) : null}
            {!firmsLoading && filteredFirms.map((firm) => (
              <article className="firm-item" key={firm.id}>
                <div className="firm-item-top">
                  <div>
                    <h3>{firm.tradeName || firm.name}</h3>
                    <strong>{firm.name}</strong>
                  </div>
                  <span className={`status-pill ${firm.isActive ? "active" : "inactive"}`}>
                    {firm.isActive ? "Ativa" : "Inativa"}
                  </span>
                </div>
                <div className="firm-item-meta">
                  {firm.cnpj ? <span><Building2 size={14} /> {firm.cnpj}</span> : null}
                  {firm.primaryEmail ? <span><Mail size={14} /> {firm.primaryEmail}</span> : null}
                  {firm.primaryPhone ? <span><Phone size={14} /> {firm.primaryPhone}</span> : null}
                  {(firm.city || firm.state) ? <span><MapPin size={14} /> {[firm.city, firm.state].filter(Boolean).join("/")}</span> : null}
                  {firm.contactName ? <span><UserRound size={14} /> {firm.contactName}</span> : null}
                </div>
                <div className="firm-item-footer">Criada em {formatDate(firm.createdAt)}</div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
