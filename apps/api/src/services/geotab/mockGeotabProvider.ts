import fs from "node:fs/promises";
import type {
  CreateCustomReportResult,
  GeotabCredentials,
  GeotabCustomReport,
  GeotabSession,
  ReportBackupPayload
} from "@geotab-report-admin/shared";
import { env } from "../../config/env.js";
import { FileStorageService } from "../storage/fileStorage.js";
import type { GeotabProvider } from "../../types/api.js";
import { mockReports } from "./mockData.js";

export class MockGeotabProvider implements GeotabProvider {
  constructor(private readonly storage: FileStorageService) {}

  async login(credentials: GeotabCredentials): Promise<GeotabSession> {
    return {
      server: credentials.server,
      database: credentials.database,
      userName: credentials.username,
      sessionId: "mock-session",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
    };
  }

  async getSession(): Promise<GeotabSession | null> {
    if (!env.GEOTAB_DATABASE || !env.GEOTAB_USERNAME) {
      return null;
    }

    return {
      server: env.GEOTAB_SERVER,
      database: env.GEOTAB_DATABASE,
      userName: env.GEOTAB_USERNAME,
      sessionId: "mock-env-session",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
    };
  }

  async listReports(): Promise<GeotabCustomReport[]> {
    return mockReports;
  }

  async refreshReports(): Promise<GeotabCustomReport[]> {
    return mockReports;
  }

  async createCustomReportFromTemplate(input: {
    name: string;
    category?: string;
    templatePath: string;
    templateFileName: string;
    requestedBy: string;
  }): Promise<CreateCustomReportResult> {
    const fileContents = await fs.readFile(input.templatePath, "utf-8");
    const report: GeotabCustomReport = {
      id: `custom-report-${Date.now()}`,
      name: input.name,
      kind: "custom",
      category: input.category ?? "Uncategorized",
      lastModifiedAt: new Date().toISOString(),
      templateName: input.templateFileName,
      canReplaceTemplate: true,
      replacementEligibilityReason: null,
      distribution: {
        hasSchedule: false,
        hasRecipients: false,
        scheduleSummary: null,
        recipientCount: 0
      }
    };

    mockReports.unshift(report);

    return {
      report,
      details: "Mock custom report created from uploaded template. No live Geotab mutation was performed.",
      warnings: [
        "Live custom report creation from template is not yet validated against documented Geotab APIs.",
        `Template preview captured for audit only: ${fileContents.slice(0, 60)}`
      ]
    };
  }

  async capture(report: GeotabCustomReport): Promise<{ backupId: string; payload: ReportBackupPayload }> {
    await this.storage.ensureRuntimeDirs();
    const payload: ReportBackupPayload = {
      report,
      rawMetadata: {
        templateName: report.templateName ?? null,
        distribution: report.distribution ?? null
      },
      templateContentRef: null,
      capturedAt: new Date().toISOString()
    };
    const backupId = `mock-backup-${report.id}-${Date.now()}`;
    const backupPath = this.storage.resolveBackupPath(`${backupId}.json`);
    await fs.writeFile(backupPath, JSON.stringify(payload, null, 2), "utf-8");

    return { backupId, payload };
  }

  async restore(backupId: string): Promise<{ restored: boolean; details: string }> {
    const backupPath = this.storage.resolveBackupPath(`${backupId}.json`);
    await fs.access(backupPath);
    return {
      restored: true,
      details: "Mock restore completed from saved backup payload."
    };
  }

  async replaceTemplate(input: {
    report: GeotabCustomReport;
    templatePath: string;
    templateFileName: string;
    preserveName: boolean;
  }): Promise<{ usedFallback: boolean; afterSnapshot: Record<string, unknown>; details: string }> {
    if (!input.report.canReplaceTemplate || input.report.kind !== "custom") {
      throw new Error(
        input.report.replacementEligibilityReason ??
          "Only custom reports can receive uploaded replacement templates."
      );
    }

    const fileContents = await fs.readFile(input.templatePath, "utf-8");
    return {
      usedFallback: false,
      afterSnapshot: {
        reportId: input.report.id,
        reportName: input.preserveName ? input.report.name : `${input.report.name} (updated)`,
        templateFileName: input.templateFileName,
        templatePreview: fileContents.slice(0, 120)
      },
      details: "Mock replacement completed. No live Geotab mutation was performed."
    };
  }
}
