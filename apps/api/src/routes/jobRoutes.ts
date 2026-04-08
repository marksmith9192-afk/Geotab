import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { JobHistoryService } from "../services/jobHistoryService.js";
import { JobOrchestrator } from "../services/jobOrchestrator.js";
import { UploadService } from "../services/uploadService.js";

const upload = multer({ storage: multer.memoryStorage() });

const bulkUpdateSchema = z.object({
  reportIds: z.preprocess((value) => {
    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === "string") {
      return [value];
    }

    return value;
  }, z.array(z.string()).min(1)),
  dryRun: z.coerce.boolean(),
  requestedBy: z.string().min(1)
});

export function createJobRoutes(
  orchestrator: JobOrchestrator,
  uploads: UploadService,
  history: JobHistoryService
): Router {
  const router = Router();

  router.get("/", async (_req, res, next) => {
    try {
      const jobs = await history.list();
      res.json({ jobs });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:jobId", async (req, res, next) => {
    try {
      const job = await history.get(req.params.jobId);

      if (!job) {
        res.status(404).json({ message: "Job not found" });
        return;
      }

      res.json({ job });
    } catch (error) {
      next(error);
    }
  });

  router.post("/preview", upload.single("template"), async (req, res, next) => {
    try {
      const body = bulkUpdateSchema.parse(req.body);
      const file = req.file;

      if (!file) {
        res.status(400).json({ message: "Template file is required." });
        return;
      }

      const plans = await orchestrator.preview({
        reportIds: body.reportIds,
        dryRun: true,
        requestedBy: body.requestedBy,
        templateFileName: file.originalname
      });

      res.json({ plans });
    } catch (error) {
      next(error);
    }
  });

  router.post("/", upload.single("template"), async (req, res, next) => {
    try {
      const body = bulkUpdateSchema.parse(req.body);
      const file = req.file;

      if (!file) {
        res.status(400).json({ message: "Template file is required." });
        return;
      }

      const persisted = await uploads.persistUpload(file);
      const result = await orchestrator.createJob({
        reportIds: body.reportIds,
        dryRun: body.dryRun,
        requestedBy: body.requestedBy,
        templateFileName: persisted.fileName,
        templateUploadId: persisted.uploadId,
        templatePath: persisted.templatePath
      });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post("/:jobItemId/rollback", async (req, res, next) => {
    try {
      await orchestrator.rollback(req.params.jobItemId);
      res.status(202).json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
