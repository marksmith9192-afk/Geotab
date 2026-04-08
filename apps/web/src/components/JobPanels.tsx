import type { JobDetails, JobSummary, ReportUpdatePlan } from "@geotab-report-admin/shared";

export function PreviewPanel({ plans }: { plans: ReportUpdatePlan[] }) {
  if (plans.length === 0) {
    return <div className="muted">Run a dry run to preview the reports that would be updated.</div>;
  }

  return (
    <div className="list">
      {plans.map((plan) => (
        <div className="list-item" key={plan.reportId}>
          <strong>{plan.reportName}</strong>
          <div className="muted">
            Type: {plan.reportKind} | {plan.eligible ? "Eligible for replacement" : "Will be skipped"}
          </div>
          <div className="muted">Template: {plan.targetTemplateFileName}</div>
          {plan.warnings.map((warning) => (
            <div className="warning-box" key={warning}>
              {warning}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function JobHistoryList({ jobs, onSelect }: { jobs: JobSummary[]; onSelect: (jobId: string) => void }) {
  return (
    <div className="list">
      {jobs.map((job) => (
        <button className="list-item" key={job.id} onClick={() => onSelect(job.id)}>
          <strong>{job.templateFileName}</strong>
          <div className="muted">
            {job.selectedCount} reports, {job.status}, requested by {job.requestedBy}
          </div>
          <div className="muted">Created {new Date(job.createdAt).toLocaleString()}</div>
        </button>
      ))}
    </div>
  );
}

export function JobDetailsPanel({ job, onRollback }: { job: JobDetails | null; onRollback: (jobItemId: string) => void }) {
  if (!job) {
    return <div className="muted">Select a job to view per-report results and rollback availability.</div>;
  }

  return (
    <div className="stack">
      <div className="panel">
        <h3>Job Summary</h3>
        <div className="muted">
          Status: {job.status} | Successes: {job.successCount} | Failures: {job.failureCount}
        </div>
      </div>
      <div className="panel">
        <h3>Per-report audit</h3>
        <div className="list">
          {job.reports.map((report) => (
            <div className="list-item" key={report.id}>
              <strong>{report.reportName}</strong>
              <div className="muted">Status: {report.status}</div>
              {report.details ? <div className="muted">{report.details}</div> : null}
              {report.errorMessage ? <div className="badge error">{report.errorMessage}</div> : null}
              {report.backupId ? (
                <div className="actions">
                  <button className="button ghost" onClick={() => onRollback(report.id)}>
                    Roll Back From Backup
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
