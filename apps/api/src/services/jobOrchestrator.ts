import type { BulkUpdateRequest, ReportUpdatePlan } from "@geotab-report-admin/shared";
import { prisma } from "./prisma.js";
import type { GeotabProvider } from "../types/api.js";
import { AuditLogService } from "./auditLogService.js";
import { InMemoryJobQueue } from "./jobs/jobQueue.js";

export class JobOrchestrator {
  constructor(
    private readonly provider: GeotabProvider,
    private readonly queue: InMemoryJobQueue,
    private readonly auditLog: AuditLogService
  ) {}

  async createJob(input: BulkUpdateRequest & { templateUploadId: string; templatePath: string }): Promise<{ jobId: string }> {
    const reports = await this.provider.listReports();
    const selectedReports = reports.filter((report) => input.reportIds.includes(report.id));

    const job = await prisma.job.create({
      data: {
        status: input.dryRun ? "dry-run" : "queued",
        dryRun: input.dryRun,
        requestedBy: input.requestedBy,
        templateFileName: input.templateFileName,
        selectedCount: selectedReports.length,
        templateUploadId: input.templateUploadId,
        items: {
          create: selectedReports.map((report) => ({
            reportId: report.id,
            reportName: report.name,
            status: input.dryRun
              ? report.canReplaceTemplate
                ? "dry-run"
                : "skipped"
              : report.canReplaceTemplate
                ? "pending"
                : "skipped",
            details: report.canReplaceTemplate ? null : report.replacementEligibilityReason
          }))
        }
      }
    });

    await this.auditLog.write({
      jobId: job.id,
      level: "info",
      action: "job.created",
      message: `Bulk update job created for ${selectedReports.length} reports.`,
      metadata: {
        dryRun: input.dryRun,
        templateFileName: input.templateFileName
      }
    });

    if (!input.dryRun) {
      this.queue.enqueue(async () => {
        await this.runJob(job.id, input.templatePath, input.templateFileName);
      });
    }

    return { jobId: job.id };
  }

  async preview(request: BulkUpdateRequest): Promise<ReportUpdatePlan[]> {
    const reports = await this.provider.listReports();
    return reports
      .filter((report) => request.reportIds.includes(report.id))
      .map((report) => ({
        reportId: report.id,
        reportName: report.name,
        reportKind: report.kind,
        eligible: report.canReplaceTemplate,
        targetTemplateFileName: request.templateFileName,
        willUseAutomationFallback: false,
        warnings: report.canReplaceTemplate
          ? [
              "Live Geotab replacement path is not yet validated in this MVP.",
              "Post-update verification should confirm name, schedule, and distribution settings."
            ]
          : [
              report.replacementEligibilityReason ??
                "Only custom reports can receive uploaded replacement templates."
            ]
      }));
  }

  async rollback(jobItemId: string): Promise<void> {
    const jobItem = await prisma.jobItem.findUnique({
      where: { id: jobItemId }
    });

    if (!jobItem?.backupId) {
      throw new Error("No backup available for this report item.");
    }

    const result = await this.provider.restore(jobItem.backupId);
    await prisma.jobItem.update({
      where: { id: jobItem.id },
      data: {
        status: result.restored ? "rolled-back" : jobItem.status,
        details: result.details
      }
    });
  }

  private async runJob(jobId: string, templatePath: string, templateFileName: string): Promise<void> {
    await prisma.job.update({
      where: { id: jobId },
      data: { status: "in-progress" }
    });

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { items: true }
    });

    if (!job) {
      return;
    }

    const reports = await this.provider.listReports();
    let successCount = 0;
    let failureCount = 0;

    for (const item of job.items) {
      const report = reports.find((candidate) => candidate.id === item.reportId);

      if (!report) {
        failureCount += 1;
        await prisma.jobItem.update({
          where: { id: item.id },
          data: {
            status: "failed",
            errorMessage: "Report no longer available in provider catalog."
          }
        });
        continue;
      }

      if (!report.canReplaceTemplate) {
        await prisma.jobItem.update({
          where: { id: item.id },
          data: {
            status: "skipped",
            details:
              report.replacementEligibilityReason ??
              "Only custom reports can receive uploaded replacement templates."
          }
        });
        await this.auditLog.write({
          jobId,
          reportId: report.id,
          reportName: report.name,
          level: "warn",
          action: "report.skipped",
          message:
            report.replacementEligibilityReason ??
            "Only custom reports can receive uploaded replacement templates."
        });
        continue;
      }

      try {
        const backup = await this.provider.capture(report);
        const replacement = await this.provider.replaceTemplate({
          report,
          templatePath,
          templateFileName,
          preserveName: true
        });

        const backupRecord = await prisma.reportBackup.create({
          data: {
            id: backup.backupId,
            reportId: report.id,
            reportName: report.name,
            templateFileName: report.templateName ?? null,
            backupPayload: backup.payload as unknown as object,
            storagePath: null,
            restorable: true
          }
        });

        await prisma.jobItem.update({
          where: { id: item.id },
          data: {
            status: "updated",
            details: replacement.details,
            backupId: backupRecord.id,
            beforeSnapshot: backup.payload as unknown as object,
            afterSnapshot: replacement.afterSnapshot as object
          }
        });

        await this.auditLog.write({
          jobId,
          reportId: report.id,
          reportName: report.name,
          level: "info",
          action: "report.updated",
          message: replacement.details,
          metadata: {
            usedFallback: replacement.usedFallback
          }
        });

        successCount += 1;
      } catch (error) {
        failureCount += 1;
        const message = error instanceof Error ? error.message : "Unknown update error";
        await prisma.jobItem.update({
          where: { id: item.id },
          data: {
            status: "failed",
            errorMessage: message
          }
        });
        await this.auditLog.write({
          jobId,
          reportId: report.id,
          reportName: report.name,
          level: "error",
          action: "report.update_failed",
          message
        });
      }
    }

    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: failureCount > 0 ? "completed-with-errors" : "completed",
        successCount,
        failureCount,
        completedAt: new Date()
      }
    });
  }
}
