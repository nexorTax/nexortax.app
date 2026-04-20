/**
 * Arquivo utilitário para encapsular chamadas HTTP à API do backend.
 * Usamos `fetch` em vez de axios para reduzir dependências. Cada
 * função retorna dados JSON ou lança um erro com a mensagem apropriada.
 */

import type {
  FirmRegisterDto,
  UserRegisterDto,
  DashboardMetricsDto,
  UserDto,
  AvailablePeriodsResponseDto,
  AuditUsage,
  AuditCreateRequestDto,
  AuditRun,
  AuditSummaryDto,
  AuditFindingListDto,
  AuditFindingDetailDto,
  AuditCreditOpportunity,
} from "../types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "https://localhost:5001";

async function handleJsonResponse(res: Response) {
  if (!res.ok) {
    let msg;
    try {
      const data = await res.json();
      msg = data?.message ?? res.statusText;
    } catch {
      msg = res.statusText;
    }
    throw new Error(msg);
  }
  return res.json();
}

export async function registerFirm(dto: FirmRegisterDto): Promise<void> {
  const res = await fetch(`${API_BASE}/api/firms/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    let msg;
    try {
      const data = await res.json();
      msg = data?.message ?? res.statusText;
    } catch {
      msg = res.statusText;
    }
    throw new Error(msg);
  }
}

export async function fetchUsers(firmId: string, token: string): Promise<UserDto[]> {
  const res = await fetch(`${API_BASE}/api/firms/${firmId}/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleJsonResponse(res);
}

export async function addUser(firmId: string, dto: UserRegisterDto, token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/firms/${firmId}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    let msg;
    try {
      const data = await res.json();
      msg = data?.message ?? res.statusText;
    } catch {
      msg = res.statusText;
    }
    throw new Error(msg);
  }
}

export async function fetchMetrics(
  firmId: string,
  startDate: string,
  endDate: string,
  token: string
): Promise<DashboardMetricsDto> {
  const params = new URLSearchParams({ startDate, endDate }).toString();
  const res = await fetch(`${API_BASE}/api/dashboard/${firmId}/metrics?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleJsonResponse(res);
}

/**
 * Realiza a autenticação do usuário e retorna um objeto contendo os tokens
 * e informações necessárias para persistir no contexto de autenticação.
 *
 * Esta função é responsável apenas por fazer a chamada ao backend. Ela lança
 * um erro com uma mensagem apropriada caso a credencial seja inválida ou ocorra
 * algum problema na comunicação.
 *
 * @param username Login do usuário
 * @param password Senha do usuário
 * @returns Objeto contendo accessToken, refreshToken, firmId e role
 */
export async function loginRequest(username: string, password: string): Promise<{
  accessToken: string;
  refreshToken: string;
  firmId: string;
  role: "Admin" | "User";
}> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });
  // se a resposta não for OK, tenta extrair a mensagem e lança um erro
  if (!res.ok) {
    let msg: string;
    try {
      const data = await res.json();
      msg = data?.message ?? res.statusText;
    } catch {
      msg = res.statusText;
    }
    throw new Error(msg);
  }
  // a API deve retornar um objeto com accessToken e refreshToken,
  // bem como firmId e role; se não retornar, lançar erro significativo
  const data = await res.json();
  const { accessToken, refreshToken, firmId, role } = data ?? {};
  if (!accessToken || !refreshToken || !firmId || !role) {
    throw new Error("Resposta inválida do servidor de autenticação.");
  }
  return { accessToken, refreshToken, firmId, role };
}

export async function refreshAuthToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  firmId: string;
  role: "Admin" | "User";
}> {
  const res = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    let msg: string;
    try {
      const data = await res.json();
      msg = data?.message ?? res.statusText;
    } catch {
      msg = res.statusText;
    }
    throw new Error(msg || "Sessão expirada.");
  }

  const data = await res.json();
  const { accessToken, refreshToken: newRefreshToken, firmId, role } = data ?? {};
  if (!accessToken || !newRefreshToken || !firmId || !role) {
    throw new Error("Resposta inválida ao renovar sessão.");
  }

  return { accessToken, refreshToken: newRefreshToken, firmId, role };
}
// ===================== SPED (import + reports) =====================

export async function importSpedTxt(
  file: File,
  spedType: "EFD_CONTRIB" | "EFD_ICMS_IPI",
  clientId: string | null,
  firmId: string,
  token: string
): Promise<{ importId: string }> {
  const form = new FormData();
  form.append("file", file);
  form.append("spedType", spedType);
  // clientId é Guid? (opcional)
  if (clientId) form.append("clientId", clientId);
  // firmId é Guid obrigatório
  form.append("firmId", firmId);

  const res = await fetch(`${API_BASE}/api/sped/import`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });

  return handleJsonResponse(res);
}

export async function fetchSpedReportDefinitions(token: string) {
  const res = await fetch(`${API_BASE}/api/sped/report-definitions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleJsonResponse(res);
}

export async function generateSpedReport(
  importId: string,
  reportCode: number,
  clientId: string | null,
  token: string
): Promise<{ requestId: string }> {
  const res = await fetch(`${API_BASE}/api/sped/reports/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      ImportId: importId,
      ReportCode: reportCode,
      ClientId: clientId,
    }),
  });
  return handleJsonResponse(res);
}

// ===========================================================================
// Audit module API
// These functions wrap calls to the backend audit endpoints defined in
// EfdConverter.Api. They return typed data or throw an error if the
// response indicates a failure.
// ===========================================================================

export async function fetchAvailableAuditPeriods(
  clientId: string,
  token: string
): Promise<AvailablePeriodsResponseDto> {
  const res = await fetch(`${API_BASE}/api/audits/clients/${clientId}/available-periods`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleJsonResponse(res);
}

export async function fetchCurrentAuditUsage(
  firmId: string,
  token: string
): Promise<AuditUsage> {
  const params = new URLSearchParams({ firmId }).toString();
  const res = await fetch(`${API_BASE}/api/audits/usage/current?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleJsonResponse(res);
}

export async function createAudit(
  payload: AuditCreateRequestDto,
  token: string,
  firmId?: string
): Promise<AuditRun> {
  const url = firmId
    ? `${API_BASE}/api/audits?firmId=${encodeURIComponent(firmId)}`
    : `${API_BASE}/api/audits`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return handleJsonResponse(res);
}

export async function fetchAuditSummary(
  auditRunId: string,
  token: string
): Promise<AuditSummaryDto> {
  const res = await fetch(`${API_BASE}/api/audits/${auditRunId}/summary`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleJsonResponse(res);
}

export async function fetchAuditFindings(
  auditRunId: string,
  filters: Record<string, string>,
  token: string
): Promise<AuditFindingListDto[]> {
  const params = new URLSearchParams(filters).toString();
  const res = await fetch(`${API_BASE}/api/audits/${auditRunId}/findings?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleJsonResponse(res);
}

export async function fetchAuditFindingDetail(
  findingId: string,
  token: string
): Promise<AuditFindingDetailDto> {
  const res = await fetch(`${API_BASE}/api/audits/findings/${findingId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleJsonResponse(res);
}

export async function fetchAuditCredits(
  auditRunId: string,
  token: string
): Promise<AuditCreditOpportunity[]> {
  const res = await fetch(`${API_BASE}/api/audits/${auditRunId}/credits`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleJsonResponse(res);
}

export async function fetchAuditRankings(
  auditRunId: string,
  token: string
): Promise<any> {
  const res = await fetch(`${API_BASE}/api/audits/${auditRunId}/rankings`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleJsonResponse(res);
}

export async function fetchAuditComparative(
  auditRunId: string,
  token: string
): Promise<any> {
  const res = await fetch(`${API_BASE}/api/audits/${auditRunId}/comparative`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleJsonResponse(res);
}


// ===================== CLIENTES (import via Excel) =====================

export async function importClientsExcel(firmId: string, file: File, token: string) {
  const form = new FormData();
  form.append("file", file);
  form.append("firmId", firmId); // ✅ redundância útil (não atrapalha)

  const res = await fetch(
    `${API_BASE}/api/clients/import-excel?firmId=${encodeURIComponent(firmId)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    }
  );

  return handleJsonResponse(res);
}

