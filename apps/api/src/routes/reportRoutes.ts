import { Router } from "express";
import multer from "multer";
import path from "node:path";
import { z } from "zod";
import { ReportCatalogService } from "../services/reportCatalogService.js";
import { MutationGuardService } from "../services/mutationGuardService.js";
import { UploadService } from "../services/uploadService.js";
import type { GeotabProvider } from "../types/api.js";

const upload = multer({ storage: multer.memoryStorage() });

const createCustomReportSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  requestedBy: z.string().min(1)
});

const createCustomReportsBatchSchema = z.object({
  category: z.string().optional(),
  requestedBy: z.string().min(1)
});

export function createReportRoutes(
  catalog: ReportCatalogService,
  provider: GeotabProvider,
  uploads: UploadService,
  guard: MutationGuardService
): Router {
  const router = Router();

  router.get("/", async (_req, res, next) => {
    try {
      const reports = await catalog.listReports();
      res.json({ reports });
    } catch (error) {
      next(error);
    }
  });

  router.post("/refresh", async (_req, res, next) => {
    try {
      void catalog.refreshReports();
      res.status(202).json({
        started: true,
        message: "Live report discovery started. Poll /api/reports for refreshed results."
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/custom", upload.single("template"), async (req, res, next) => {
    try {
      const restrictionReason = guard.getCustomReportCreationRestrictionReason();

      if (restrictionReason) {
        res.status(403).json({ message: restrictionReason });
        return;
      }

      const body = createCustomReportSchema.parse(req.body);
      const file = req.file;

      if (!file) {
        res.status(400).json({ message: "Template file is required." });
        return;
      }

      const persisted = await uploads.persistUpload(file);
      const result = await provider.createCustomReportFromTemplate({
        name: body.name,
        category: body.category,
        requestedBy: body.requestedBy,
        templateFileName: persisted.fileName,
        templatePath: persisted.templatePath
      });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post("/custom/batch", upload.array("templates"), async (req, res, next) => {
    try {
      const restrictionReason = guard.getCustomReportCreationRestrictionReason();

      if (restrictionReason) {
        res.status(403).json({ message: restrictionReason });
        return;
      }

      const body = createCustomReportsBatchSchema.parse(req.body);
      const files = req.files;

      if (!Array.isArray(files) || files.length === 0) {
        res.status(400).json({ message: "At least one template file is required." });
        return;
      }

      const items = await Promise.all(
        files.map(async (file) => {
          const targetReportName = path.parse(file.originalname).name;

          try {
            const persisted = await uploads.persistUpload(file);
            const result = await provider.createCustomReportFromTemplate({
              name: targetReportName,
              category: body.category,
              requestedBy: body.requestedBy,
              templateFileName: persisted.fileName,
              templatePath: persisted.templatePath
            });

            return {
              sourceFileName: file.originalname,
              targetReportName,
              success: true,
              report: result.report,
              details: result.details,
              warnings: result.warnings
            };
          } catch (error) {
            return {
              sourceFileName: file.originalname,
              targetReportName,
              success: false,
              errorMessage: error instanceof Error ? error.message : "Custom report creation failed."
            };
          }
        })
      );

      res.status(201).json({
        createdCount: items.filter((item) => item.success).length,
        failedCount: items.filter((item) => !item.success).length,
        items
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
