import { Router } from "express";
import { z } from "zod";
import type { GeotabProvider } from "../types/api.js";

const loginSchema = z.object({
  server: z.string().min(1),
  database: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1)
});

export function createSessionRoutes(provider: GeotabProvider): Router {
  const router = Router();

  router.get("/", async (_req, res, next) => {
    try {
      const session = await provider.getSession();
      res.json({ session });
    } catch (error) {
      next(error);
    }
  });

  router.post("/login", async (req, res, next) => {
    try {
      const credentials = loginSchema.parse(req.body);
      const session = await provider.login(credentials);
      res.json({ session });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
