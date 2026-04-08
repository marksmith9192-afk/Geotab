import cors from "cors";
import express from "express";
import { createGeotabProvider } from "./services/geotab/providerFactory.js";
import { FileStorageService } from "./services/storage/fileStorage.js";
import { ReportCatalogService } from "./services/reportCatalogService.js";
import { AuditLogService } from "./services/auditLogService.js";
import { InMemoryJobQueue } from "./services/jobs/jobQueue.js";
import { JobOrchestrator } from "./services/jobOrchestrator.js";
import { JobHistoryService } from "./services/jobHistoryService.js";
import { UploadService } from "./services/uploadService.js";
import { createSessionRoutes } from "./routes/sessionRoutes.js";
import { createReportRoutes } from "./routes/reportRoutes.js";
import { createJobRoutes } from "./routes/jobRoutes.js";
import { healthRoutes } from "./routes/healthRoutes.js";
import { requireAdminAccess } from "./middleware/adminAccess.js";
import { MutationGuardService } from "./services/mutationGuardService.js";
import { errorHandler } from "./utils/errorHandler.js";
import { env } from "./config/env.js";

export async function createApp() {
  const app = express();
  const storage = new FileStorageService();
  await storage.ensureRuntimeDirs();

  const provider = createGeotabProvider(storage);
  const catalog = new ReportCatalogService(provider);
  const auditLog = new AuditLogService();
  const queue = new InMemoryJobQueue();
  const guard = new MutationGuardService();
  const orchestrator = new JobOrchestrator(provider, queue, auditLog, guard);
  const history = new JobHistoryService();
  const uploads = new UploadService(storage);

  app.use(
    cors({
      origin: env.APP_WEB_ORIGIN.split(",").map((origin) => origin.trim()),
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type", "x-admin-access-token"]
    })
  );
  app.use(express.json());

  app.use("/api/health", healthRoutes);
  app.use("/api", requireAdminAccess);
  app.use("/api/session", createSessionRoutes(provider));
  app.use("/api/reports", createReportRoutes(catalog, provider, uploads, guard));
  app.use("/api/jobs", createJobRoutes(orchestrator, uploads, history));
  app.use(errorHandler);

  return app;
}
