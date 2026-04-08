import fs from "node:fs/promises";
import type {
  CreateCustomReportResult,
  GeotabCredentials,
  GeotabCustomReport,
  GeotabSession,
  ReportBackupPayload
} from "@geotab-report-admin/shared";
import { env } from "../../config/env.js";
import type { GeotabProvider } from "../../types/api.js";
import type { GeotabAutomationStrategy } from "./automation/types.js";

interface JsonRpcResponse<T> {
  result?: T;
  error?: {
    message?: string;
    data?: unknown;
  };
}

interface LoginResult {
  credentials: {
    database: string;
    userName: string;
    sessionId?: string;
  };
}

export class LiveGeotabProvider implements GeotabProvider {
  constructor(private readonly automation: GeotabAutomationStrategy | null) {}

  async login(credentials: GeotabCredentials): Promise<GeotabSession> {
    const response = await this.callJsonRpc<LoginResult>("Authenticate", {
      database: credentials.database,
      userName: credentials.username,
      password: credentials.password
    });

    const session: GeotabSession = {
      server: credentials.server,
      database: response.credentials.database,
      userName: response.credentials.userName,
      sessionId: response.credentials.sessionId,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
    };

    await fs.writeFile(env.GEOTAB_SESSION_PATH, JSON.stringify(session, null, 2), "utf-8");

    return session;
  }

  async getSession(): Promise<GeotabSession | null> {
    try {
      const raw = await fs.readFile(env.GEOTAB_SESSION_PATH, "utf-8");
      return JSON.parse(raw) as GeotabSession;
    } catch {
      return null;
    }
  }

  async listReports(): Promise<GeotabCustomReport[]> {
    throw new Error(
      "Documentation spike result: no clearly documented public MyGeotab API object for report discovery was confirmed. Keep discovery isolated until validated."
    );
  }

  async createCustomReportFromTemplate(input: {
    name: string;
    category?: string;
    templatePath: string;
    templateFileName: string;
    requestedBy: string;
  }): Promise<CreateCustomReportResult> {
    const automation = this.requireAutomation(
      "Custom report creation via documented API is unverified. Enable browser automation fallback to proceed."
    );

    const result = await automation.createCustomReport({
      name: input.name,
      category: input.category,
      templatePath: input.templatePath,
      templateFileName: input.templateFileName
    });

    if (!result.verified) {
      throw new Error(result.details);
    }

    return {
      report: {
        id: `verified-${Date.now()}`,
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
      },
      details: result.details,
      warnings: [
        "Created through browser automation fallback after documentation spike did not confirm a public upload API."
      ]
    };
  }

  async capture(report: GeotabCustomReport): Promise<{ backupId: string; payload: ReportBackupPayload }> {
    return {
      backupId: `live-backup-${report.id}-${Date.now()}`,
      payload: {
        report,
        rawMetadata: {
          note: "Live backup capture remains incomplete until report metadata/export shape is validated."
        },
        capturedAt: new Date().toISOString(),
        templateContentRef: null
      }
    };
  }

  async restore(_backupId: string): Promise<{ restored: boolean; details: string }> {
    throw new Error("TODO: Implement rollback after confirming what report/template state is restorable via documented APIs.");
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

    const automation = this.requireAutomation(
      "Template replacement via documented API is unverified. Enable browser automation fallback to proceed."
    );

    const result = await automation.replaceTemplate({
      report: input.report,
      templatePath: input.templatePath,
      templateFileName: input.templateFileName
    });

    if (!result.verified) {
      throw new Error(result.details);
    }

    return {
      usedFallback: true,
      afterSnapshot: result.snapshot ?? {
        reportName: input.report.name,
        templateFileName: input.templateFileName
      },
      details: result.details
    };
  }

  private requireAutomation(message: string): GeotabAutomationStrategy {
    if (!this.automation) {
      throw new Error(message);
    }

    return this.automation;
  }

  private async callJsonRpc<T>(method: string, params: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${env.GEOTAB_BASE_URL}/apiv1`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        method,
        params,
        id: Date.now(),
        jsonrpc: "2.0"
      })
    });

    if (!response.ok) {
      throw new Error(`Geotab API request failed with status ${response.status}.`);
    }

    const payload = (await response.json()) as JsonRpcResponse<T>;

    if (payload.error) {
      throw new Error(payload.error.message ?? "Unknown Geotab API error.");
    }

    if (!payload.result) {
      throw new Error("Missing Geotab API result.");
    }

    return payload.result;
  }
}
