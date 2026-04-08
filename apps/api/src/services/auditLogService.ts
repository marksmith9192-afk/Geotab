import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

export class AuditLogService {
  async write(input: {
    jobId?: string;
    reportId?: string;
    reportName?: string;
    level: "info" | "warn" | "error";
    action: string;
    message: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await prisma.auditEntry.create({
      data: {
        jobId: input.jobId,
        reportId: input.reportId,
        reportName: input.reportName,
        level: input.level,
        action: input.action,
        message: input.message,
        metadata: input.metadata as Prisma.InputJsonValue | undefined
      }
    });
  }
}
