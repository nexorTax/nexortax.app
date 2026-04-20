export interface FirmRegisterDto {
  firmName: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

export interface UserRegisterDto {
  name: string;
  email: string;
  password: string;
}

export interface UserDto {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface DashboardMetricsDto {
  totalClients: number;
  clientsThisWeek: number;
  clientsThisMonth: number;
  totalDownloads: number;
  downloadsThisWeek: number;
  downloadsThisMonth: number;
  totalCredit: number;
  creditThisWeek: number;
  creditThisMonth: number;
}

/**
 * Retorno esperado do endpoint de login. Deve conter ao menos
 * accessToken e refreshToken; firmId e role são usados para
 * personalizar a UI no front-end.
 */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  firmId: string;
  role: string;
}

// ================================================================
// Auditoria Tributária types
// These interfaces mirror the DTOs and entities returned by the
// backend audit module. Keeping them separate allows for strong
// typing in service calls and React components.
// ================================================================

export interface AvailablePeriodDto {
  periodStart: string; // ISO string
  periodEnd: string;
  sourceType: string;
  hasXml: boolean;
}

export interface AvailablePeriodsResponseDto {
  periods: AvailablePeriodDto[];
}

export interface AuditCreateRequestDto {
  clientId: string;
  periodStart: string;
  periodEnd: string;
  auditType: string;
  sourceMode: string;
  includeXml: boolean;
}

export interface AuditRun {
  id: string;
  firmId: string;
  clientId: string;
  periodStart: string;
  periodEnd: string;
  auditType: string;
  sourceMode: string;
  status: string;
  requestedByUserId: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  scoreFiscal?: number;
  totalDocumentsAnalyzed?: number;
  totalItemsAnalyzed?: number;
  totalFindings?: number;
  totalCredits?: number;
  estimatedCreditAmount?: number;
  estimatedRiskAmount?: number;
  summaryJson?: string;
  snapshotBlobPath?: string;
  reportPdfBlobPath?: string;
  reportExcelBlobPath?: string;
  errorMessage?: string;
}

export interface AuditSummaryDto {
  auditRunId: string;
  scoreFiscal?: number;
  totalFindings?: number;
  totalCredits?: number;
  estimatedCreditAmount?: number;
  estimatedRiskAmount?: number;
  totalDocumentsAnalyzed?: number;
  totalItemsAnalyzed?: number;
  createdAt: string;
  status: string;
}

export interface AuditUsage {
  id: string;
  firmId: string;
  referenceMonth: string;
  freeQuota: number;
  usedCount: number;
  extraPaidCount: number;
  planType: string;
  lastUpdatedAt: string;
}

export interface AuditFindingListDto {
  id: string;
  category: string;
  severity: string;
  title: string;
  taxType?: string;
  impactAmount?: number;
  recurrenceCount?: number;
  status: string;
}

export interface AuditFindingDetailDto {
  id: string;
  category: string;
  subcategory?: string;
  severity: string;
  materialityLevel?: string;
  taxType?: string;
  ruleCode: string;
  title: string;
  description?: string;
  technicalExplanation?: string;
  businessExplanation?: string;
  suggestedAction?: string;
  impactAmount?: number;
  riskScore?: number;
  recurrenceCount?: number;
  firstDetectedPeriod?: string;
  lastDetectedPeriod?: string;
  sourceFileType?: string;
  sourceSpedBlock?: string;
  sourceSpedRegister?: string;
  sourceDocumentNumber?: string;
  sourceDocumentKey?: string;
  sourceItemNumber?: string;
  sourceProductCode?: string;
  sourceProductDescription?: string;
  sourceCfop?: string;
  sourceCst?: string;
  sourceNcm?: string;
  sourceAliquot?: number;
  sourceTaxBase?: number;
  expectedValue?: number;
  foundValue?: number;
  differenceValue?: number;
  evidenceJson?: string;
  status: string;
  reviewedByUserId?: string;
  reviewedAt?: string;
  justification?: string;
}

export interface AuditCreditOpportunity {
  id: string;
  auditRunId: string;
  taxType: string;
  creditType: string;
  confidenceLevel: string;
  severity: string;
  estimatedAmount?: number;
  title: string;
  description?: string;
  technicalExplanation?: string;
  suggestedAction?: string;
  legalBasisSummary?: string;
  sourceDocumentNumber?: string;
  sourceDocumentKey?: string;
  sourceProductCode?: string;
  sourceSupplierCode?: string;
  sourceSupplierName?: string;
  sourcePeriod?: string;
  evidenceJson?: string;
}
