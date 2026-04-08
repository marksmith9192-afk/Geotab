import type { GeotabCustomReport } from "@geotab-report-admin/shared";
import { env } from "../config/env.js";

export class MutationGuardService {
  private readonly allowedReportNames = new Set(
    env.GEOTAB_ALLOWED_REPORT_NAMES.map((name) => name.trim()).filter(Boolean)
  );

  isReportAllowed(report: GeotabCustomReport): boolean {
    if (env.GEOTAB_PROVIDER_MODE !== "live" || this.allowedReportNames.size === 0) {
      return true;
    }

    return this.allowedReportNames.has(report.name);
  }

  getReportRestrictionReason(report: GeotabCustomReport): string | null {
    if (this.isReportAllowed(report)) {
      return null;
    }

    return `Live mutations are restricted to the configured allowlist. '${report.name}' is not approved yet.`;
  }

  canCreateCustomReport(): boolean {
    if (env.GEOTAB_PROVIDER_MODE !== "live") {
      return true;
    }

    return env.GEOTAB_ALLOW_CUSTOM_REPORT_CREATION;
  }

  getCustomReportCreationRestrictionReason(): string | null {
    if (this.canCreateCustomReport()) {
      return null;
    }

    return "Live custom report creation is disabled by configuration for this deployment.";
  }

  listAllowedReportNames(): string[] {
    return Array.from(this.allowedReportNames);
  }
}
