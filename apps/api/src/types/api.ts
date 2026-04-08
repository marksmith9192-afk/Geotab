import type {
  CreateCustomReportResult,
  GeotabCredentials,
  GeotabCustomReport,
  GeotabSession,
  ReportBackupPayload
} from "@geotab-report-admin/shared";

export interface ReportDiscoveryService {
  listReports(): Promise<GeotabCustomReport[]>;
  refreshReports(): Promise<GeotabCustomReport[]>;
}

export interface GeotabAuthService {
  login(credentials: GeotabCredentials): Promise<GeotabSession>;
  getSession(): Promise<GeotabSession | null>;
}

export interface ReportReplacementService {
  replaceTemplate(input: {
    report: GeotabCustomReport;
    templatePath: string;
    templateFileName: string;
    preserveName: boolean;
  }): Promise<{
    usedFallback: boolean;
    afterSnapshot: Record<string, unknown>;
    details: string;
  }>;
}

export interface CustomReportCreationService {
  createCustomReportFromTemplate(input: {
    name: string;
    category?: string;
    templatePath: string;
    templateFileName: string;
    requestedBy: string;
  }): Promise<CreateCustomReportResult>;
}

export interface BackupService {
  capture(report: GeotabCustomReport): Promise<{
    backupId: string;
    payload: ReportBackupPayload;
  }>;
  restore(backupId: string): Promise<{
    restored: boolean;
    details: string;
  }>;
}

export interface GeotabProvider
  extends GeotabAuthService,
    ReportDiscoveryService,
    ReportReplacementService,
    CustomReportCreationService,
    BackupService {}
