import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { MockGeotabProvider } from "../src/services/geotab/mockGeotabProvider.js";
import { FileStorageService } from "../src/services/storage/fileStorage.js";

const tempRoot = path.join(os.tmpdir(), `geotab-report-admin-${Date.now()}`);
const templatePath = path.join(tempRoot, "report-template.xml");

describe("mock geotab provider", () => {
  const provider = new MockGeotabProvider(new FileStorageService());

  afterAll(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it("rejects replacement for default reports", async () => {
    const reports = await provider.listReports();
    const defaultReport = reports.find((report) => report.kind === "default");

    expect(defaultReport).toBeDefined();
    await fs.mkdir(tempRoot, { recursive: true });
    await fs.writeFile(templatePath, "<template />", "utf-8");

    await expect(
      provider.replaceTemplate({
        report: defaultReport!,
        templatePath,
        templateFileName: "report-template.xml",
        preserveName: true
      })
    ).rejects.toThrow("Default reports cannot accept uploaded replacement templates in Geotab.");
  });

  it("creates a custom report from an uploaded template", async () => {
    await fs.mkdir(tempRoot, { recursive: true });
    await fs.writeFile(templatePath, "<template />", "utf-8");

    const result = await provider.createCustomReportFromTemplate({
      name: "Created Via Upload",
      category: "Safety",
      templatePath,
      templateFileName: "report-template.xml",
      requestedBy: "test-admin"
    });

    expect(result.report.kind).toBe("custom");
    expect(result.report.canReplaceTemplate).toBe(true);
    expect(result.report.name).toBe("Created Via Upload");
  });
});
