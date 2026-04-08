import { config } from "dotenv";
import path from "node:path";
import { z } from "zod";

config({ path: path.resolve(process.cwd(), "../../.env") });
config({ path: path.resolve(process.cwd(), ".env") });

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().default("file:./dev.db"),
  APP_WEB_ORIGIN: z.string().default("http://localhost:5173"),
  ADMIN_ACCESS_TOKEN: z.string().optional(),
  GEOTAB_PROVIDER_MODE: z.enum(["mock", "live"]).default("mock"),
  GEOTAB_LIVE_MUTATION_MODE: z.enum(["disabled", "browser-automation"]).default("disabled"),
  GEOTAB_ALLOW_CUSTOM_REPORT_CREATION: z
    .string()
    .optional()
    .transform((value) => value !== "false"),
  GEOTAB_ALLOWED_REPORT_NAMES: z
    .string()
    .default("")
    .transform((value) =>
      value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
    ),
  GEOTAB_SERVER: z.string().default("my.geotab.com"),
  GEOTAB_DATABASE: z.string().default(""),
  GEOTAB_USERNAME: z.string().default(""),
  GEOTAB_PASSWORD: z.string().default(""),
  GEOTAB_SESSION_PATH: z.string().default(".runtime/geotab-session.json"),
  GEOTAB_BASE_URL: z.string().default("https://my.geotab.com"),
  GEOTAB_PLAYWRIGHT_HEADLESS: z
    .string()
    .optional()
    .transform((value) => value !== "false"),
  GEOTAB_REPORTS_PAGE_URL: z.string().default("https://my.geotab.com/reports"),
  GEOTAB_CUSTOM_REPORT_CREATE_URL: z.string().default("https://my.geotab.com/reports"),
  GEOTAB_REPORT_SEARCH_SELECTOR: z.string().optional(),
  GEOTAB_CUSTOM_REPORT_BUTTON_SELECTOR: z.string().optional(),
  GEOTAB_TEMPLATE_UPLOAD_SELECTOR: z.string().optional(),
  GEOTAB_REPORT_NAME_INPUT_SELECTOR: z.string().optional(),
  GEOTAB_REPORT_CATEGORY_INPUT_SELECTOR: z.string().optional(),
  GEOTAB_SAVE_REPORT_SELECTOR: z.string().optional(),
  GEOTAB_REPLACE_TEMPLATE_SELECTOR: z.string().optional(),
  GEOTAB_VERIFICATION_TEXT_SELECTOR: z.string().optional()
});

export const env = envSchema.parse(process.env);
