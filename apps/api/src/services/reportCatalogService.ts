import type { GeotabCustomReport } from "@geotab-report-admin/shared";
import type { GeotabProvider } from "../types/api.js";

export class ReportCatalogService {
  constructor(private readonly provider: GeotabProvider) {}

  async listReports(): Promise<GeotabCustomReport[]> {
    return this.provider.listReports();
  }

  async refreshReports(): Promise<GeotabCustomReport[]> {
    return this.provider.refreshReports();
  }
}
