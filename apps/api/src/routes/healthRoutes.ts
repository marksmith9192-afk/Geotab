import { Router } from "express";
import { env } from "../config/env.js";

export const healthRoutes = Router();

healthRoutes.get("/", (_req, res) => {
  res.json({
    ok: true,
    providerMode: env.GEOTAB_PROVIDER_MODE
  });
});
