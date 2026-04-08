import type { GeotabCustomReport } from "@geotab-report-admin/shared";

export interface AutomationCreateReportInput {
  name: string;
  category?: string;
  templatePath: string;
  templateFileName: string;
}

export interface AutomationReplaceTemplateInput {
  report: GeotabCustomReport;
  templatePath: string;
  templateFileName: string;
}

export interface AutomationVerificationResult {
  verified: boolean;
  details: string;
  snapshot?: Record<string, unknown>;
}

export interface GeotabAutomationStrategy {
  createCustomReport(input: AutomationCreateReportInput): Promise<AutomationVerificationResult>;
  replaceTemplate(input: AutomationReplaceTemplateInput): Promise<AutomationVerificationResult>;
}
