import { useEffect, useState } from "react";
import type { JobDetails, JobSummary } from "@geotab-report-admin/shared";
import { JobDetailsPanel, JobHistoryList } from "../components/JobPanels";
import { apiFetch } from "../lib/api";

export function JobsPage() {
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobDetails | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void loadJobs();
  }, []);

  async function loadJobs() {
    const payload = await apiFetch<{ jobs: JobSummary[] }>("/api/jobs");
    setJobs(payload.jobs);
  }

  async function selectJob(jobId: string) {
    const payload = await apiFetch<{ job: JobDetails }>(`/api/jobs/${jobId}`);
    setSelectedJob(payload.job);
  }

  async function rollback(jobItemId: string) {
    try {
      await apiFetch<{ ok: boolean }>(`/api/jobs/${jobItemId}/rollback`, { method: "POST" });
      setMessage("Rollback requested successfully.");
      if (selectedJob) {
        await selectJob(selectedJob.id);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Rollback failed.");
    }
  }

  return (
    <div className="grid-two">
      <section className="panel stack">
        <div>
          <h3>Job History</h3>
          <p className="inline-note">Review prior runs, see per-report outcomes, and trigger rollback where backups exist.</p>
        </div>
        {message ? <div className="badge info">{message}</div> : null}
        <JobHistoryList jobs={jobs} onSelect={selectJob} />
      </section>
      <JobDetailsPanel job={selectedJob} onRollback={rollback} />
    </div>
  );
}
