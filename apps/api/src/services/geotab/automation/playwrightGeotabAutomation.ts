import { chromium, type Browser, type Page } from "playwright";
import { env } from "../../../config/env.js";
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

export class PlaywrightGeotabAutomationStrategy implements GeotabAutomationStrategy {
  async createCustomReport(input: AutomationCreateReportInput): Promise<AutomationVerificationResult> {
    return this.withBrowser(async (page) => {
      await this.signIn(page);
      await page.goto(env.GEOTAB_CUSTOM_REPORT_CREATE_URL, { waitUntil: "domcontentloaded" });

      await page.click(requireSelector(env.GEOTAB_CUSTOM_REPORT_BUTTON_SELECTOR, "GEOTAB_CUSTOM_REPORT_BUTTON_SELECTOR"));
      await page.setInputFiles(
        requireSelector(env.GEOTAB_TEMPLATE_UPLOAD_SELECTOR, "GEOTAB_TEMPLATE_UPLOAD_SELECTOR"),
        input.templatePath
      );
      await page.fill(
        requireSelector(env.GEOTAB_REPORT_NAME_INPUT_SELECTOR, "GEOTAB_REPORT_NAME_INPUT_SELECTOR"),
        input.name
      );

      if (input.category && env.GEOTAB_REPORT_CATEGORY_INPUT_SELECTOR) {
        await page.fill(env.GEOTAB_REPORT_CATEGORY_INPUT_SELECTOR, input.category);
      }

      await page.click(requireSelector(env.GEOTAB_SAVE_REPORT_SELECTOR, "GEOTAB_SAVE_REPORT_SELECTOR"));

      return this.verifyReportVisible(page, input.name, input.templateFileName, "custom-report.created");
    });
  }

  async replaceTemplate(input: AutomationReplaceTemplateInput): Promise<AutomationVerificationResult> {
    return this.withBrowser(async (page) => {
      await this.signIn(page);
      await page.goto(env.GEOTAB_REPORTS_PAGE_URL, { waitUntil: "domcontentloaded" });

      await page.fill(
        requireSelector(env.GEOTAB_REPORT_SEARCH_SELECTOR, "GEOTAB_REPORT_SEARCH_SELECTOR"),
        input.report.name
      );
      await page.click(
        requireSelector(env.GEOTAB_REPLACE_TEMPLATE_SELECTOR, "GEOTAB_REPLACE_TEMPLATE_SELECTOR")
      );
      await page.setInputFiles(
        requireSelector(env.GEOTAB_TEMPLATE_UPLOAD_SELECTOR, "GEOTAB_TEMPLATE_UPLOAD_SELECTOR"),
        input.templatePath
      );
      await page.click(requireSelector(env.GEOTAB_SAVE_REPORT_SELECTOR, "GEOTAB_SAVE_REPORT_SELECTOR"));

      return this.verifyReportVisible(page, input.report.name, input.templateFileName, "custom-report.replaced");
    });
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
    await page.getByLabel(/database/i).fill(env.GEOTAB_DATABASE);
    await page.getByLabel(/username/i).fill(env.GEOTAB_USERNAME);
    await page.getByLabel(/password/i).fill(env.GEOTAB_PASSWORD);
    await page.getByRole("button", { name: /log in|sign in/i }).click();
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
