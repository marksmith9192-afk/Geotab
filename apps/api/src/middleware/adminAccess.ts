import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

const ADMIN_ACCESS_HEADER = "x-admin-access-token";

export function requireAdminAccess(req: Request, res: Response, next: NextFunction): void {
  if (!env.ADMIN_ACCESS_TOKEN) {
    next();
    return;
  }

  const providedToken = req.header(ADMIN_ACCESS_HEADER);

  if (providedToken !== env.ADMIN_ACCESS_TOKEN) {
    res.status(401).json({
      message: "Admin access token required."
    });
    return;
  }

  next();
}

export const adminAccessHeaderName = ADMIN_ACCESS_HEADER;
