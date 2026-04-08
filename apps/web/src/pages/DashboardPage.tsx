import { useEffect, useMemo, useState, type FormEvent } from "react";
import type {
  ApiHealth,
  CreateCustomReportResult,
  GeotabCustomReport,
  JobSummary,
  LoginConfig,
  ReportUpdatePlan
} from "@geotab-report-admin/shared";
import { apiFetch } from "../lib/api";
import { ReportTable } from "../components/ReportTable";
import { PreviewPanel } from "../components/JobPanels";

const initialLogin: LoginConfig = {
  server: "my.geotab.com",
  database: "",
  username: "",
  password: "",
  providerMode: "live"
};

export function DashboardPage() {
  const [login, setLogin] = useState(initialLogin);
  const [health, setHealth] = useState<ApiHealth | null>(null);
  const [reports, setReports] = useState<GeotabCustomReport[]>([]);
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [requestedBy, setRequestedBy] = useState("internal-admin");
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [createTemplateFile, setCreateTemplateFile] = useState<File | null>(null);
  const [newReportName, setNewReportName] = useState("");
  const [newReportCategory, setNewReportCategory] = useState("");
  const [plans, setPlans] = useState<ReportUpdatePlan[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [createMessage, setCreateMessage] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [reportsLoading, setReportsLoading] = useState(false);

  useEffect(() => {
    void loadHealth();
    void loadReports();
    void loadJobs();
  }, []);

  useEffect(() => {
    if (health?.providerMode !== "live" || reports.length > 0) {
      return;
    }

    const retryId = window.setInterval(() => {
      void loadReports();
    }, 15000);

    return () => window.clearInterval(retryId);
  }, [health?.providerMode, reports.length]);

  const filteredReports = useMemo(() => {
    return reports.filter((report) => report.name.toLowerCase().includes(query.toLowerCase()));
  }, [reports, query]);

  async function loadReports() {
    setReportsLoading(true);

    try {
      const payload = await apiFetch<{ reports: GeotabCustomReport[] }>("/api/reports");
      setReports(payload.reports);

      if (health?.providerMode === "live" && payload.reports.length === 0) {
        setStatusMessage("Warming live report catalog. The table will populate automatically when discovery finishes.");
      }
    } finally {
      setReportsLoading(false);
    }
  }

  async function startReportRefresh() {
    setReportsLoading(true);

    try {
      await apiFetch<{ started: boolean; message: string }>("/api/reports/refresh", {
        method: "POST"
      });
      setStatusMessage("Refreshing live report catalog. This can take a few minutes on a cold start.");
      await loadReports();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Report refresh failed.");
    } finally {
      setReportsLoading(false);
    }
  }

  async function loadHealth() {
    const payload = await apiFetch<ApiHealth>("/api/health");
    setHealth(payload);
    setLogin((current) => ({ ...current, providerMode: payload.providerMode }));
  }

  async function loadJobs() {
    const payload = await apiFetch<{ jobs: JobSummary[] }>("/api/jobs");
    setJobs(payload.jobs);
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setStatusMessage("");

    try {
      const payload = await apiFetch<{ session: { userName: string; database: string } }>("/api/session/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(login)
      });
      setStatusMessage(`Authenticated as ${payload.session.userName} against ${payload.session.database}.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  function toggleSelection(reportId: string) {
    const report = reports.find((item) => item.id === reportId);

    if (!report?.canReplaceTemplate) {
      return;
    }

    setSelected((current) =>
      current.includes(reportId) ? current.filter((value) => value !== reportId) : [...current, reportId]
    );
  }

  function toggleSelectAllEligible() {
    const eligibleIds = filteredReports.filter((report) => report.canReplaceTemplate).map((report) => report.id);

    if (eligibleIds.length > 0 && eligibleIds.every((reportId) => selected.includes(reportId))) {
      setSelected((current) => current.filter((id) => !eligibleIds.includes(id)));
      return;
    }

    setSelected((current) => Array.from(new Set([...current, ...eligibleIds])));
  }

  async function submitJob(dryRun: boolean) {
    if (!templateFile || selected.length === 0) {
      setStatusMessage("Select at least one eligible custom report and one template file.");
      return;
    }

    const formData = new FormData();
    formData.append("template", templateFile);
    selected.forEach((reportId) => formData.append("reportIds", reportId));
    formData.append("requestedBy", requestedBy);
    formData.append("dryRun", String(dryRun));

    setLoading(true);
    setStatusMessage("");

    try {
      if (dryRun) {
        const payload = await apiFetch<{ plans: ReportUpdatePlan[] }>("/api/jobs/preview", {
          method: "POST",
          body: formData
        });
        setPlans(payload.plans);
        setStatusMessage(`Dry run prepared for ${payload.plans.length} selected reports.`);
      } else {
        const payload = await apiFetch<{ jobId: string }>("/api/jobs", {
          method: "POST",
          body: formData
        });
        setPlans([]);
        setStatusMessage(`Bulk update job queued: ${payload.jobId}`);
        await loadJobs();
      }
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Job submission failed.");
    } finally {
      setLoading(false);
    }
  }

  async function createCustomReport() {
    if (!createTemplateFile || !newReportName.trim()) {
      setCreateMessage("Provide a custom report name and template file.");
      return;
    }

    const formData = new FormData();
    formData.append("template", createTemplateFile);
    formData.append("name", newReportName.trim());
    formData.append("category", newReportCategory.trim());
    formData.append("requestedBy", requestedBy);

    setCreating(true);
    setCreateMessage("");

    try {
      const payload = await apiFetch<CreateCustomReportResult>("/api/reports/custom", {
        method: "POST",
        body: formData
      });
      setCreateMessage(
        `Custom report created: ${payload.report.name}. ${payload.warnings.length > 0 ? payload.warnings[0] : payload.details}`
      );
      setNewReportName("");
      setNewReportCategory("");
      setCreateTemplateFile(null);
      await loadReports();
    } catch (error) {
      setCreateMessage(error instanceof Error ? error.message : "Custom report creation failed.");
    } finally {
      setCreating(false);
    }
  }

  const eligibleCount = reports.filter((report) => report.canReplaceTemplate).length;
  const ineligibleCount = reports.length - eligibleCount;
  const allowedMutationNames = health?.allowedMutationReportNames ?? [];
  const customReportCreationEnabled = health?.customReportCreationEnabled ?? true;

  return (
    <div className="stack">
      <section className="grid-two">
        <form className="panel stack" onSubmit={handleLogin}>
          <div>
            <h3>1. Login / Config</h3>
            <p className="inline-note">
              The backend is currently running in <strong>{health?.providerMode ?? "unknown"}</strong> mode. Use this
              form to validate credentials against the active backend provider.
            </p>
          </div>
          <label>
            Server
            <input value={login.server} onChange={(event) => setLogin({ ...login, server: event.target.value })} />
          </label>
          <label>
            Database
            <input value={login.database} onChange={(event) => setLogin({ ...login, database: event.target.value })} />
          </label>
          <label>
            Username
            <input value={login.username} onChange={(event) => setLogin({ ...login, username: event.target.value })} />
          </label>
          <label>
            Password
            <input type="password" value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} />
          </label>
          <label>
            Runtime Provider
            <input value={health?.providerMode ?? login.providerMode} readOnly />
          </label>
          <div className="actions">
            <button className="button primary" type="submit" disabled={loading}>
              Validate Session
            </button>
          </div>
        </form>

        <section className="panel stack">
          <div>
            <h3>2. Select Reports To Update</h3>
            <p className="inline-note">
              Search reports by name and select only the custom reports you want to update. Nothing is updated unless a
              report is explicitly selected here.
            </p>
          </div>
          <label>
            Search by report name
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reports" />
          </label>
          <div className="actions">
            <button className="button" type="button" onClick={() => void startReportRefresh()} disabled={reportsLoading}>
              Warm Live Catalog
            </button>
            <button className="button" type="button" onClick={() => void loadReports()} disabled={reportsLoading}>
              Refresh Reports
            </button>
          </div>
          <ReportTable
            reports={filteredReports}
            selected={selected}
            onToggle={toggleSelection}
            onToggleAllEligible={toggleSelectAllEligible}
          />
          <div className="muted">Selected eligible reports: {selected.length}</div>
          <div className="muted">
            Eligible custom reports: {eligibleCount} | Ineligible default reports: {ineligibleCount}
          </div>
          {reportsLoading ? <div className="muted">Refreshing report catalog...</div> : null}
          <div className="muted">Existing jobs recorded: {jobs.length}</div>
        </section>
      </section>

      <section className="panel stack">
        <div>
          <h3>3. Choose Replacement Template And Run</h3>
          <p className="inline-note">
            The uploaded template is only applied to the reports selected above. In live mode, replacement uses the
            validated browser automation fallback and verifies the final report name after save.
          </p>
        </div>
          {allowedMutationNames.length > 0 ? (
            <div className="warning-box">
              Hosted live mode is currently restricted to these approved reports: {allowedMutationNames.join(", ")}
            </div>
          ) : null}
          <label>
            Replacement Template File
            <input type="file" onChange={(event) => setTemplateFile(event.target.files?.[0] ?? null)} />
          </label>
          <label>
            Requested By
            <input value={requestedBy} onChange={(event) => setRequestedBy(event.target.value)} />
          </label>
          <div className="warning-box">
            Geotab default reports cannot accept uploaded replacement templates. This tool only executes replacements against custom reports.
          </div>
          <div className="muted">
            This action will only affect the {selected.length} selected report{selected.length === 1 ? "" : "s"}.
          </div>
          <div className="actions">
            <button className="button" type="button" onClick={() => submitJob(true)} disabled={loading}>
              Dry Run Selected
            </button>
            <button className="button primary" type="button" onClick={() => submitJob(false)} disabled={loading}>
              Execute Bulk Update
            </button>
          </div>
          {statusMessage ? <div className="badge info">{statusMessage}</div> : null}
      </section>

      <section className="panel stack">
        <div>
          <h3>4. Create A New Custom Report</h3>
          <p className="inline-note">
            This is a separate workflow from replacement. In live mode it uploads the template through the MyGeotab UI
            automation path and verifies the created report before returning success.
          </p>
        </div>
        {!customReportCreationEnabled ? (
          <div className="warning-box">
            Custom report creation is disabled for this hosted deployment. Replacement flows are still available for approved reports.
          </div>
        ) : null}
        <div className="grid-two">
          <label>
            New Custom Report Name
            <input value={newReportName} onChange={(event) => setNewReportName(event.target.value)} />
          </label>
          <label>
            Category
            <input value={newReportCategory} onChange={(event) => setNewReportCategory(event.target.value)} />
          </label>
        </div>
        <label>
          Template File For New Custom Report
          <input type="file" onChange={(event) => setCreateTemplateFile(event.target.files?.[0] ?? null)} />
        </label>
        <div className="actions">
          <button
            className="button primary"
            type="button"
            onClick={createCustomReport}
            disabled={creating || !customReportCreationEnabled}
          >
            Create Custom Report
          </button>
        </div>
        {createMessage ? <div className="badge info">{createMessage}</div> : null}
      </section>

      <section className="panel stack">
        <div>
          <h3>5. Dry Run Preview</h3>
          <p className="inline-note">Selected default reports are surfaced as skipped with an explicit reason.</p>
        </div>
        <PreviewPanel plans={plans} />
      </section>
    </div>
  );
}

