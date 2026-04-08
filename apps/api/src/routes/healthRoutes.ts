import { Router } from "express";
import { env } from "../config/env.js";

export const healthRoutes = Router();

healthRoutes.get("/", (_req, res) => {
  res.json({
    ok: true,
    providerMode: env.GEOTAB_PROVIDER_MODE,
    liveMutationMode: env.GEOTAB_LIVE_MUTATION_MODE,
    requiresAdminAccess: Boolean(env.ADMIN_ACCESS_TOKEN),
    customReportCreationEnabled:
      env.GEOTAB_PROVIDER_MODE !== "live" || env.GEOTAB_ALLOW_CUSTOM_REPORT_CREATION,
    allowedMutationReportNames: env.GEOTAB_ALLOWED_REPORT_NAMES
  });
});
