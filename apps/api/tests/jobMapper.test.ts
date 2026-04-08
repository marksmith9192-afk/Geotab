import { describe, expect, it } from "vitest";
import { toJobSummary } from "../src/services/jobs/jobMapper.js";

describe("job mapper", () => {
  it("maps Prisma-like job records into API summaries", () => {
    const now = new Date("2026-04-07T12:00:00.000Z");
    const summary = toJobSummary({
      id: "job-1",
      status: "completed",
      dryRun: false,
      requestedBy: "admin",
      templateFileName: "replacement.xml",
      selectedCount: 3,
      successCount: 3,
      failureCount: 0,
      createdAt: now,
      updatedAt: now,
      completedAt: now,
      templateUploadId: null
    });

    expect(summary.id).toBe("job-1");
    expect(summary.status).toBe("completed");
    expect(summary.selectedCount).toBe(3);
  });
});
