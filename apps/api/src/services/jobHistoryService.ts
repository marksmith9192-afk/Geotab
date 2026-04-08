import type { JobDetails, JobSummary } from "@geotab-report-admin/shared";
import { prisma } from "./prisma.js";
import { toJobDetails, toJobSummary } from "./jobs/jobMapper.js";

export class JobHistoryService {
  async list(): Promise<JobSummary[]> {
    const jobs = await prisma.job.findMany({
      orderBy: { createdAt: "desc" }
    });

    return jobs.map(toJobSummary);
  }

  async get(jobId: string): Promise<JobDetails | null> {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: { items: { orderBy: { createdAt: "asc" } } }
    });

    return job ? toJobDetails(job) : null;
  }
}
