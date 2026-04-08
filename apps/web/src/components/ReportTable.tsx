import type { GeotabCustomReport } from "@geotab-report-admin/shared";

interface ReportTableProps {
  reports: GeotabCustomReport[];
  selected: string[];
  onToggle: (reportId: string) => void;
  onToggleAllEligible: () => void;
}

export function ReportTable({ reports, selected, onToggle, onToggleAllEligible }: ReportTableProps) {
  const eligibleReports = reports.filter((report) => report.canReplaceTemplate);
  const allEligibleSelected =
    eligibleReports.length > 0 && eligibleReports.every((report) => selected.includes(report.id));

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={allEligibleSelected}
                onChange={onToggleAllEligible}
                aria-label="Select all eligible reports"
              />
            </th>
            <th>Report</th>
            <th>Type</th>
            <th>Category</th>
            <th>Last Modified</th>
            <th>Schedule / Distribution</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr key={report.id}>
              <td>
                <input
                  type="checkbox"
                  checked={selected.includes(report.id)}
                  disabled={!report.canReplaceTemplate}
                  onChange={() => onToggle(report.id)}
                  aria-label={`Select ${report.name}`}
                />
              </td>
              <td>
                <strong>{report.name}</strong>
                <div className="muted">Current template: {report.templateName ?? "Unknown"}</div>
                {!report.canReplaceTemplate ? (
                  <div className="badge warn">{report.replacementEligibilityReason ?? "Not eligible for replacement"}</div>
                ) : null}
              </td>
              <td>
                <span className={`badge ${report.kind === "custom" ? "success" : "warn"}`}>
                  {report.kind === "custom" ? "Custom" : "Default"}
                </span>
              </td>
              <td>{report.category ?? "Uncategorized"}</td>
              <td>{report.lastModifiedAt ? new Date(report.lastModifiedAt).toLocaleString() : "Unknown"}</td>
              <td>
                {report.distribution?.hasSchedule ? (
                  <span className="badge success">Scheduled</span>
                ) : (
                  <span className="badge info">No Schedule</span>
                )}
                <div className="muted">{report.distribution?.scheduleSummary ?? "No schedule metadata"}</div>
                <div className="muted">
                  {report.distribution?.hasRecipients
                    ? `${report.distribution.recipientCount ?? 0} recipients`
                    : "No recipients configured"}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
