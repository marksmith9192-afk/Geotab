import type { JobDetails, JobReportResult, JobSummary } from "@geotab-report-admin/shared";
import type { Job, JobItem } from "@prisma/client";

export function toJobSummary(job: Job): JobSummary {
  return {
    id: job.id,
    status: job.status as JobSummary["status"],
    dryRun: job.dryRun,
    requestedBy: job.requestedBy,
    createdAt: job.createdAt,
    completedAt: job.completedAt ?? null,
    selectedCount: job.selectedCount,
    successCount: job.successCount,
    failureCount: job.failureCount,
    templateFileName: job.templateFileName
  };
}

export function toJobReportResult(item: JobItem): JobReportResult {
  return {
    id: item.id,
    reportId: item.reportId,
    reportName: item.reportName,
    status: item.status as JobReportResult["status"],
    details: item.details,
    errorMessage: item.errorMessage,
    backupId: item.backupId,
    beforeSnapshot: item.beforeSnapshot as Record<string, unknown> | null,
    afterSnapshot: item.afterSnapshot as Record<string, unknown> | null
  };
}

export function toJobDetails(job: Job & { items: JobItem[] }): JobDetails {
  return {
    ...toJobSummary(job),
    reports: job.items.map(toJobReportResult)
  };
}
