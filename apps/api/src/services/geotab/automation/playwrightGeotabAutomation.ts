import { chromium, type Browser, type Page } from "playwright";
import { env } from "../../../config/env.js";
import type { GeotabCustomReport } from "@geotab-report-admin/shared";
import type {
  AutomationCreateReportInput,
  AutomationReplaceTemplateInput,
  AutomationVerificationResult,
  GeotabAutomationStrategy
} from "./types.js";

function requireSelector(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing automation selector config: ${name}`);
  }

  return value;
}

function optionalSelector(value: string | undefined, fallback: string): string {
  return value?.trim() ? value : fallback;
}

export class PlaywrightGeotabAutomationStrategy implements GeotabAutomationStrategy {
  async discoverCustomReports(): Promise<GeotabCustomReport[]> {
    return this.withBrowser(async (page) => {
      await this.signIn(page);
      await this.openAllAvailableReports(page);
      await this.ensureCustomFilterActive(page);

      const reports = new Map<string, GeotabCustomReport>();
      const searchQueries = ["", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("")];

      for (const query of searchQueries) {
        await this.searchReportCatalog(page, query);
        await this.scrollCatalog(page);

        for (const report of await this.readVisibleCustomReports(page)) {
          reports.set(report.name, report);
        }
      }

      const enrichedReports: GeotabCustomReport[] = [];
      for (const report of Array.from(reports.values()).sort((left, right) => left.name.localeCompare(right.name))) {
        enrichedReports.push(await this.enrichCustomReport(page, report));
      }

      return enrichedReports;
    });
  }

  async createCustomReport(input: AutomationCreateReportInput): Promise<AutomationVerificationResult> {
    return this.withBrowser(async (page) => {
      await this.signIn(page);
      await this.openAllAvailableReports(page);

      const uploadButton = optionalSelector(
        env.GEOTAB_CUSTOM_REPORT_BUTTON_SELECTOR,
        "#reportSetupUploadTemplateButton"
      );
      const templateInput = optionalSelector(env.GEOTAB_TEMPLATE_UPLOAD_SELECTOR, "input[type='file']");
      const reportNameInput = optionalSelector(
        env.GEOTAB_REPORT_NAME_INPUT_SELECTOR,
        "#customReports_reportNameField"
      );
      const saveButton = optionalSelector(env.GEOTAB_SAVE_REPORT_SELECTOR, "#customReport_save");

      await page.locator(uploadButton).first().click();
      await page.setInputFiles(templateInput, input.templatePath);
      await page.waitForURL(/#customReport/i, { timeout: 90000 });
      await this.setReportName(page, reportNameInput, input.name);

      if (input.category && env.GEOTAB_REPORT_CATEGORY_INPUT_SELECTOR?.trim()) {
        await page.locator(env.GEOTAB_REPORT_CATEGORY_INPUT_SELECTOR).fill(input.category);
      }

      await page.click(saveButton);
      await page.waitForLoadState("networkidle", { timeout: 90000 }).catch(() => undefined);

      return this.verifyReportVisible(page, input.name, input.templateFileName, "custom-report.created");
    });
  }

  private async setReportName(page: Page, fallbackSelector: string, reportName: string): Promise<void> {
    const visibleTextEditor = page.locator("#customReports_reportName");
    await page
      .waitForSelector("#customReports_reportName, #customReports_reportNameField", {
        timeout: 30000
      })
      .catch(() => undefined);

    if (await visibleTextEditor.count()) {
      await visibleTextEditor.click();
      await page.keyboard.press("Control+A");
      await page.keyboard.type(reportName);
      return;
    }

    await page.locator(fallbackSelector).first().fill("");
    await page.locator(fallbackSelector).first().fill(reportName);
  }

  async replaceTemplate(input: AutomationReplaceTemplateInput): Promise<AutomationVerificationResult> {
    return this.withBrowser(async (page) => {
      await this.signIn(page);
      await page.goto(this.buildAppUrl(input.report.id), { waitUntil: "domcontentloaded" });
      await page.waitForURL(/#customReport/i, { timeout: 90000 });
      await page.waitForTimeout(2000);

      const updateTemplateButton = optionalSelector(
        env.GEOTAB_REPLACE_TEMPLATE_SELECTOR,
        "#customReport_updateTemplate"
      );
      const templateInput = optionalSelector(env.GEOTAB_TEMPLATE_UPLOAD_SELECTOR, "input[type='file']");
      const saveButton = optionalSelector(env.GEOTAB_SAVE_REPORT_SELECTOR, "#customReport_save");

      const visibleUpdateButton = page.locator(updateTemplateButton);
      if (await visibleUpdateButton.isVisible().catch(() => false)) {
        await visibleUpdateButton.click();
      }

      await page.setInputFiles(templateInput, input.templatePath);
      await page.click(saveButton);
      await page.waitForLoadState("networkidle", { timeout: 90000 }).catch(() => undefined);

      return this.verifyReportVisible(page, input.report.name, input.templateFileName, "custom-report.replaced");
    });
  }

  private async searchReportCatalog(page: Page, reportName: string): Promise<void> {
    const searchInput = page.locator('input[aria-label="Search"]').first();
    await searchInput.fill("");
    if (reportName) {
      await searchInput.fill(reportName);
    }
    await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => undefined);
    await page.waitForTimeout(2000);
  }

  private async ensureCustomFilterActive(page: Page): Promise<void> {
    const customPill = page.locator('[data-testid="pill-tag-CustomReportTagId"]').first();
    await customPill.waitFor({ state: "visible", timeout: 30000 });

    const isActive = await customPill.evaluate((element) => element.classList.contains("active"));
    if (isActive) {
      return;
    }

    await customPill.click();
    await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => undefined);
    await page.waitForTimeout(1500);
  }

  private async scrollCatalog(page: Page): Promise<void> {
    let previousCount = -1;

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const currentCount = await page.locator("a.zen-card-title__link").count();
      if (currentCount === previousCount) {
        break;
      }

      previousCount = currentCount;
      await page.mouse.wheel(0, 2500);
      await page.waitForTimeout(1000);
    }
  }

  private async readVisibleCustomReports(page: Page): Promise<GeotabCustomReport[]> {
    const reports = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll(".report-card"));

      const parseCategory = (lines: string[]): string | null => {
        const ignored = new Set([
          "Add description",
          "No report description found.",
          "No report description found.Add description"
        ]);

        const timePattern =
          /^(today|yesterday|last \d+|previous \d+|next \d+|daily|weekly|monthly|\+\d+|inactive reports)/i;

        for (const line of lines) {
          if (!line || ignored.has(line) || timePattern.test(line) || line.length > 40) {
            continue;
          }

          return line;
        }

        return null;
      };

      return cards
        .map((card) => {
          const link = card.querySelector("a.zen-card-title__link");
          const name = link?.textContent?.trim();

          if (!name) {
            return null;
          }

          const href = link?.getAttribute("href") ?? "";
          if (!href.startsWith("#customReport")) {
            return null;
          }

          const textLines = (card instanceof HTMLElement ? card.innerText : card.textContent ?? "")
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .filter((line) => line !== name);

          const category = parseCategory(textLines);

          return {
            id: href || `custom:${name}`,
            name,
            kind: "custom",
            category,
            lastModifiedAt: null,
            templateName: null,
            templateId: null,
            distribution: null,
            canReplaceTemplate: true,
            replacementEligibilityReason: null
          };
        })
        .filter(Boolean);
    });

    return reports as GeotabCustomReport[];
  }

  private async enrichCustomReport(page: Page, report: GeotabCustomReport): Promise<GeotabCustomReport> {
    await this.openCustomReport(page, report.id);

    const metadata = await this.readCustomReportMetadata(page);

    await this.openAllAvailableReports(page);

    return {
      ...report,
      category: metadata.category ?? report.category ?? null,
      distribution: metadata.distribution
    };
  }

  private async openCustomReport(page: Page, reportHash: string): Promise<void> {
    await page.goto(this.buildAppUrl(reportHash), { waitUntil: "domcontentloaded" });
    await page.waitForURL(/#customReport/i, { timeout: 90000 });
    await page.waitForTimeout(2000);
  }

  private async readCustomReportMetadata(
    page: Page
  ): Promise<{ category: string | null; distribution: GeotabCustomReport["distribution"] }> {
    await page.click("#customReport_general").catch(() => undefined);
    await page.waitForTimeout(1000);

    const generalText = (await page.textContent("body")) ?? "";
    const categoryMatch = generalText.match(/Selected:\s*([^\n\r]+)/i);
    const category = categoryMatch?.[1]?.trim() ?? null;

    await page.click("#customReport_email").catch(() => undefined);
    await page.waitForTimeout(1000);

    const emailText = (await page.textContent("body")) ?? "";
    const emailDisabled = /not configured as an email report/i.test(emailText);
    const emailEnabled = !emailDisabled && /Email options/i.test(emailText);

    return {
      category,
      distribution: {
        hasSchedule: emailEnabled,
        hasRecipients: false,
        scheduleSummary: emailDisabled
          ? "Email delivery disabled"
          : emailEnabled
            ? "Email delivery enabled"
            : "Email metadata not detected",
        recipientCount: 0
      }
    };
  }

  private async verifyReportVisible(
    page: Page,
    reportName: string,
    templateFileName: string,
    action: string
  ): Promise<AutomationVerificationResult> {
    if (env.GEOTAB_VERIFICATION_TEXT_SELECTOR) {
      const text = await page.textContent(env.GEOTAB_VERIFICATION_TEXT_SELECTOR);
      const verified = text?.includes(reportName) ?? false;
      return {
        verified,
        details: verified
          ? `${action} verified in browser automation.`
          : `${action} could not confirm final report state in browser automation.`,
        snapshot: {
          reportName,
          templateFileName,
          verificationText: text ?? null
        }
      };
    }

    const pageText = await page.textContent("body");
    const verified = pageText?.includes(reportName) ?? false;

    return {
      verified,
      details: verified
        ? `${action} verified from page text.`
        : `${action} completed but post-action verification did not confirm the expected report name.`,
      snapshot: {
        reportName,
        templateFileName
      }
    };
  }

  private async signIn(page: Page): Promise<void> {
    await page.goto(env.GEOTAB_BASE_URL, { waitUntil: "domcontentloaded" });
    const cookieClose = page.getByRole("button", { name: /close cookie preferences/i });
    if (await cookieClose.count()) {
      await cookieClose.click().catch(() => undefined);
    }

    await page.fill("#username", env.GEOTAB_USERNAME);
    await page.getByRole("button", { name: /specify database/i }).click();
    await page.fill("#database", env.GEOTAB_DATABASE);
    await page.click("#login-button");
    await page.waitForURL(/login\.geotab\.com/, { timeout: 60000 });
    await page.fill("#password", env.GEOTAB_PASSWORD);
    await page.click("#sign-in");
    await page.waitForLoadState("networkidle", { timeout: 90000 }).catch(() => undefined);
    await page.waitForTimeout(4000);
  }

  private async openAllAvailableReports(page: Page): Promise<void> {
    await page.goto(this.buildAppUrl("#reportSetup,tags:!(CustomReportTagId)"), {
      waitUntil: "domcontentloaded"
    });
    await page.waitForLoadState("networkidle", { timeout: 90000 }).catch(() => undefined);
    await page.waitForTimeout(2000);
  }

  private buildAppUrl(hashPath: string): string {
    const normalizedHash = hashPath.startsWith("#") ? hashPath : `#${hashPath}`;
    return `${env.GEOTAB_BASE_URL}/${env.GEOTAB_DATABASE}/${normalizedHash}`;
  }

  private async withBrowser<T>(task: (page: Page) => Promise<T>): Promise<T> {
    let browser: Browser | undefined;

    try {
      browser = await chromium.launch({ headless: env.GEOTAB_PLAYWRIGHT_HEADLESS });
      const page = await browser.newPage();
      return await task(page);
    } finally {
      await browser?.close();
    }
  }
}
