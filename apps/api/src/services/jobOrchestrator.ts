import type { BulkUpdateRequest, ReportUpdatePlan } from "@geotab-report-admin/shared";
import { env } from "../config/env.js";
import { prisma } from "./prisma.js";
import type { GeotabProvider } from "../types/api.js";
import { AuditLogService } from "./auditLogService.js";
import { InMemoryJobQueue } from "./jobs/jobQueue.js";
import { MutationGuardService } from "./mutationGuardService.js";

export class JobOrchestrator {
  constructor(
    private readonly provider: GeotabProvider,
    private readonly queue: InMemoryJobQueue,
    private readonly auditLog: AuditLogService,
    private readonly guard: MutationGuardService
  ) {}

  async createJob(input: BulkUpdateRequest & { templateUploadId: string; templatePath: string }): Promise<{ jobId: string }> {
    const now = new Date().toISOString();
    const reports = await this.provider.listReports();
    const selectedReports = reports
      .filter((report) => input.reportIds.includes(report.id))
      .map((report) => {
        const restrictionReason = this.guard.getReportRestrictionReason(report);

        if (!restrictionReason) {
          return report;
        }

        return {
          ...report,
          canReplaceTemplate: false,
          replacementEligibilityReason: restrictionReason
        };
      });

    const job = await prisma.job.create({
      data: {
        status: input.dryRun ? "dry-run" : "queued",
        dryRun: input.dryRun,
        requestedBy: input.requestedBy,
        templateFileName: input.templateFileName,
        selectedCount: selectedReports.length,
        templateUploadId: input.templateUploadId,
        createdAt: now,
        updatedAt: now,
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
            details: report.canReplaceTemplate ? null : report.replacementEligibilityReason,
            createdAt: now,
            updatedAt: now
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
      .map((report) => {
        const restrictionReason = this.guard.getReportRestrictionReason(report);
        const eligible = report.canReplaceTemplate && !restrictionReason;

        return {
          reportId: report.id,
          reportName: report.name,
          reportKind: report.kind,
          eligible,
          targetTemplateFileName: request.templateFileName,
          willUseAutomationFallback:
            env.GEOTAB_PROVIDER_MODE === "live" && env.GEOTAB_LIVE_MUTATION_MODE === "browser-automation",
          warnings: eligible
            ? [
                env.GEOTAB_PROVIDER_MODE === "live"
                  ? "Replacement will use the browser automation fallback because a documented public template replacement API was not confirmed."
                  : "Mock mode will simulate the replacement without mutating Geotab.",
                "Post-update verification will confirm the final report name, and schedule/distribution metadata remains a follow-up hardening item."
              ]
            : [
                restrictionReason ??
                  report.replacementEligibilityReason ??
                  "Only custom reports can receive uploaded replacement templates."
              ]
        };
      });
  }

  async rollback(jobItemId: string): Promise<void> {
    const jobItem = await prisma.jobItem.findUnique({
      where: { id: jobItemId }
    });

    if (!jobItem?.backupId) {
      throw new Error("No backup available for this report item.");
    }

    const result = await this.provider.restore(jobItem.backupId);
    const restoredAt = new Date().toISOString();
    await prisma.jobItem.update({
      where: { id: jobItem.id },
      data: {
        status: result.restored ? "rolled-back" : jobItem.status,
        details: result.details,
        updatedAt: restoredAt
      }
    });
  }

  private async runJob(jobId: string, templatePath: string, templateFileName: string): Promise<void> {
    const startedAt = new Date().toISOString();
    await prisma.job.update({
      where: { id: jobId },
      data: { status: "in-progress", updatedAt: startedAt }
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
        const failedAt = new Date().toISOString();
        failureCount += 1;
        await prisma.jobItem.update({
          where: { id: item.id },
          data: {
            status: "failed",
            errorMessage: "Report no longer available in provider catalog.",
            updatedAt: failedAt
          }
        });
        continue;
      }

      const restrictionReason = this.guard.getReportRestrictionReason(report);

      if (!report.canReplaceTemplate || restrictionReason) {
        const skippedAt = new Date().toISOString();
        await prisma.jobItem.update({
          where: { id: item.id },
          data: {
            status: "skipped",
            details:
              restrictionReason ??
              report.replacementEligibilityReason ??
              "Only custom reports can receive uploaded replacement templates.",
            updatedAt: skippedAt
          }
        });
        await this.auditLog.write({
          jobId,
          reportId: report.id,
          reportName: report.name,
          level: "warn",
          action: "report.skipped",
          message:
            restrictionReason ??
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
            restorable: true,
            createdAt: new Date().toISOString()
          }
        });

        const updatedAt = new Date().toISOString();
        await prisma.jobItem.update({
          where: { id: item.id },
          data: {
            status: "updated",
            details: replacement.details,
            backupId: backupRecord.id,
            beforeSnapshot: backup.payload as unknown as object,
            afterSnapshot: replacement.afterSnapshot as object,
            updatedAt
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
        const failedAt = new Date().toISOString();
        failureCount += 1;
        const message = error instanceof Error ? error.message : "Unknown update error";
        await prisma.jobItem.update({
          where: { id: item.id },
          data: {
            status: "failed",
            errorMessage: message,
            updatedAt: failedAt
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

    const finishedAt = new Date().toISOString();
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: failureCount > 0 ? "completed-with-errors" : "completed",
        successCount,
        failureCount,
        completedAt: finishedAt,
        updatedAt: finishedAt
      }
    });
  }
}
