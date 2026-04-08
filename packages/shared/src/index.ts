export type ProviderMode = "mock" | "live";

export type ReportKind = "custom" | "default";

export type JobStatus =
  | "queued"
  | "dry-run"
  | "in-progress"
  | "completed"
  | "completed-with-errors"
  | "failed"
  | "rolled-back";

export type ReportUpdateStatus =
  | "pending"
  | "dry-run"
  | "updated"
  | "skipped"
  | "failed"
  | "rolled-back";

export interface GeotabCredentials {
  server: string;
  database: string;
  username: string;
  password?: string;
}

export interface GeotabSession {
  database: string;
  server: string;
  userName: string;
  sessionId?: string;
  expiresAt?: string;
}

export interface ReportDistributionInfo {
  hasSchedule: boolean;
  hasRecipients: boolean;
  scheduleSummary?: string | null;
  recipientCount?: number | null;
}

export interface GeotabCustomReport {
  id: string;
  name: string;
  kind: ReportKind;
  category?: string | null;
  lastModifiedAt?: string | null;
  templateName?: string | null;
  templateId?: string | null;
  distribution?: ReportDistributionInfo | null;
  canReplaceTemplate: boolean;
  replacementEligibilityReason?: string | null;
}

export interface ReportBackupPayload {
  report: GeotabCustomReport;
  rawMetadata: Record<string, unknown>;
  templateContentRef?: string | null;
  capturedAt: string;
}

export interface ReportUpdatePlan {
  reportId: string;
  reportName: string;
  reportKind: ReportKind;
  eligible: boolean;
  targetTemplateFileName: string;
  willUseAutomationFallback: boolean;
  warnings: string[];
}

export interface BulkUpdateRequest {
  reportIds: string[];
  templateFileName: string;
  dryRun: boolean;
  requestedBy: string;
}

export interface CreateCustomReportRequest {
  name: string;
  category?: string;
  requestedBy: string;
  templateFileName: string;
}

export interface CreateCustomReportResult {
  report: GeotabCustomReport;
  details: string;
  warnings: string[];
}

export interface BatchCreateCustomReportItem {
  sourceFileName: string;
  targetReportName: string;
  success: boolean;
  report?: GeotabCustomReport;
  details?: string;
  warnings?: string[];
  errorMessage?: string;
}

export interface BatchCreateCustomReportsResult {
  createdCount: number;
  failedCount: number;
  items: BatchCreateCustomReportItem[];
}

export interface JobSummary {
  id: string;
  status: JobStatus;
  dryRun: boolean;
  requestedBy: string;
  createdAt: string;
  completedAt?: string | null;
  selectedCount: number;
  successCount: number;
  failureCount: number;
  templateFileName: string;
}

export interface JobReportResult {
  id: string;
  reportId: string;
  reportName: string;
  status: ReportUpdateStatus;
  details?: string | null;
  errorMessage?: string | null;
  backupId?: string | null;
  beforeSnapshot?: Record<string, unknown> | null;
  afterSnapshot?: Record<string, unknown> | null;
}

export interface JobDetails extends JobSummary {
  reports: JobReportResult[];
}

export interface LoginConfig {
  server: string;
  database: string;
  username: string;
  password: string;
  providerMode: ProviderMode;
}

export interface ApiHealth {
  ok: boolean;
  providerMode: ProviderMode;
  liveMutationMode?: "disabled" | "browser-automation";
  requiresAdminAccess?: boolean;
  customReportCreationEnabled?: boolean;
  allowedMutationReportNames?: string[];
}
