# Geotab Report Admin MVP

Internal admin web app for bulk Geotab custom report template replacement with safety-first execution: dry runs, backups, audit logs, rollback hooks, job history, a separate create-custom-report workflow, and an opt-in browser automation fallback for live mutations.

## Current MVP Status

This scaffold is wired end to end with a mocked Geotab provider so the application flow is testable before any risky live integration work begins.

Live Geotab integration points are intentionally isolated and marked with `TODO` where the documented API surface still needs validation.

Confirmed product rule carried into this MVP:

- Uploaded templates should only be applied to custom reports.
- Default reports must be treated as ineligible for template replacement.
- Creating a brand-new custom report from an uploaded template is a distinct workflow from replacing an existing report template.

## Assumptions

- The existing repository contained Geotab add-in HTML assets, but not a React/Node admin app. This MVP therefore creates a new app structure alongside the existing files instead of rewriting them.
- React + TypeScript frontend uses Vite for a lightweight internal dashboard workflow.
- Node.js + TypeScript backend uses Express for REST endpoints and Prisma + SQLite for the MVP persistence layer.
- The actual template replacement API path in Geotab is uncertain. The app treats report discovery/auth separately from replacement orchestration so browser automation can be introduced later without restructuring the app.

## Proposed Folder Structure

```text
.
|-- apps/
|   |-- api/
|   |   |-- src/
|   |   |   |-- config/
|   |   |   |-- routes/
|   |   |   |-- services/
|   |   |   |   |-- geotab/
|   |   |   |   |-- jobs/
|   |   |   |   `-- storage/
|   |   |   |-- types/
|   |   |   `-- utils/
|   |   `-- tests/
|   `-- web/
|       `-- src/
|           |-- components/
|           |-- lib/
|           `-- pages/
|-- packages/
|   `-- shared/
|       `-- src/
|-- prisma/
|   `-- schema.prisma
|-- .env.example
`-- README.md
```

## Architecture Summary

### Frontend

- `apps/web` hosts the internal admin UI.
- Dashboard page handles:
  - login/config input
  - report discovery table with custom/default eligibility state
  - report search and multi-select
  - replacement template upload
  - create-custom-report template upload
  - dry run preview
  - bulk update execution
- Job history page shows past jobs, per-report status, and rollback actions.

### Backend

- `apps/api` exposes REST endpoints for session validation, report discovery, custom report creation, preview, execution, history, and rollback.
- `JobOrchestrator` coordinates backup, replacement, audit logging, and status updates.
- `InMemoryJobQueue` is a simple MVP queue that serializes work without introducing Redis or a heavier worker system.
- Provider-specific logic is isolated in `services/geotab`.
- Live provider uses:
  - documented JSON-RPC authentication/session handling
  - opt-in Playwright automation fallback for custom report creation and template replacement when public API support is not confirmed

### Shared Contracts

- `packages/shared` contains typed interfaces for Geotab reports, jobs, audit state, backups, and API-facing records.

### Persistence

- SQLite stores jobs, per-report job items, template uploads, backups, and audit entries.
- Prisma schema lives in [prisma/schema.prisma](C:/Users/MarkSmith/Documents/Playground/Geotab-git/prisma/schema.prisma).

## Prisma Schema Overview

Core models:

- `Job`: top-level bulk run record
- `JobItem`: per-report execution result
- `ReportBackup`: saved pre-change snapshot metadata
- `AuditEntry`: append-only audit log
- `TemplateUpload`: uploaded replacement file metadata

## Backend API Routes

### Health

- `GET /api/health`

### Session / Geotab auth

- `GET /api/session`
- `POST /api/session/login`

### Report discovery

- `GET /api/reports`
- `POST /api/reports/refresh`
- `POST /api/reports/custom`

### Bulk update jobs

- `GET /api/jobs`
- `GET /api/jobs/:jobId`
- `POST /api/jobs/preview`
- `POST /api/jobs`
- `POST /api/jobs/:jobItemId/rollback`

## Frontend Page and Component Plan

### Pages

- [DashboardPage.tsx](C:/Users/MarkSmith/Documents/Playground/Geotab-git/apps/web/src/pages/DashboardPage.tsx)
  - login/config form
  - existing-report replacement controls
  - create-custom-report controls
  - report table with eligibility state
  - dry run preview
- [JobsPage.tsx](C:/Users/MarkSmith/Documents/Playground/Geotab-git/apps/web/src/pages/JobsPage.tsx)
  - job list
  - job details
  - rollback action

### Components

- [AppLayout.tsx](C:/Users/MarkSmith/Documents/Playground/Geotab-git/apps/web/src/components/AppLayout.tsx)
- [ReportTable.tsx](C:/Users/MarkSmith/Documents/Playground/Geotab-git/apps/web/src/components/ReportTable.tsx)
- [JobPanels.tsx](C:/Users/MarkSmith/Documents/Playground/Geotab-git/apps/web/src/components/JobPanels.tsx)

## Service Abstractions

Backend service boundaries live here:

- Geotab auth/session:
  - [providerFactory.ts](C:/Users/MarkSmith/Documents/Playground/Geotab-git/apps/api/src/services/geotab/providerFactory.ts)
  - [mockGeotabProvider.ts](C:/Users/MarkSmith/Documents/Playground/Geotab-git/apps/api/src/services/geotab/mockGeotabProvider.ts)
  - [liveGeotabProvider.ts](C:/Users/MarkSmith/Documents/Playground/Geotab-git/apps/api/src/services/geotab/liveGeotabProvider.ts)
- Report discovery:
  - [reportCatalogService.ts](C:/Users/MarkSmith/Documents/Playground/Geotab-git/apps/api/src/services/reportCatalogService.ts)
- Custom report creation:
  - provider method `createCustomReportFromTemplate`
- Report update orchestration:
  - [jobOrchestrator.ts](C:/Users/MarkSmith/Documents/Playground/Geotab-git/apps/api/src/services/jobOrchestrator.ts)
- Backup/rollback:
  - provider capture/restore methods in Geotab provider implementations
- Audit logging:
  - [auditLogService.ts](C:/Users/MarkSmith/Documents/Playground/Geotab-git/apps/api/src/services/auditLogService.ts)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Copy env file

```bash
copy .env.example .env
```

### 3. Generate Prisma client

```bash
npm run prisma:generate
```

### 4. Bootstrap the local SQLite database

This project includes a local fallback bootstrap for SQLite because Prisma schema application has been unreliable on this Windows environment.

```bash
npm run db:bootstrap
```

### 5. Start the app

```bash
npm run dev
```

- API: [http://localhost:4000](http://localhost:4000)
- Web: [http://localhost:5173](http://localhost:5173)

### 6. Optional: install Playwright Chromium for browser automation fallback

Only needed if you plan to use live browser automation for custom report creation or template replacement.

```bash
npm run automation:install
```

## Local Runtime Notes

- Root `.env` is the intended source of runtime configuration.
- SQLite defaults to [prisma/dev.db](C:/Users/MarkSmith/Documents/Playground/Geotab-git/prisma/dev.db) so Prisma and the local bootstrap script resolve the same file.
- Mock mode is the safest default for day-to-day UI and workflow development.
- Live mode should only be enabled after you populate the Geotab env vars and understand the browser automation selector requirements.

## Live Mutation Modes

### Safe default

- `GEOTAB_PROVIDER_MODE=mock`

### Live auth only

- `GEOTAB_PROVIDER_MODE=live`
- `GEOTAB_LIVE_MUTATION_MODE=disabled`

This enables documented authentication work but blocks unverified create/replace behavior.

### Live auth + browser automation fallback

- `GEOTAB_PROVIDER_MODE=live`
- `GEOTAB_LIVE_MUTATION_MODE=browser-automation`

This enables:

- create custom report from template through Playwright
- replace template on existing custom report through Playwright
- post-action verification before success is returned

You still need to provide stable selectors in `.env` for your MyGeotab environment.

## Hosted Team Deployment Controls

For a usable internal team pilot, configure these env vars before hosting:

- `ADMIN_ACCESS_TOKEN`
  - shared app-level access token required before the UI can call protected API routes
- `APP_WEB_ORIGIN`
  - allowed frontend origin for CORS, for example `https://geotab-admin.internal.example.com`
- `GEOTAB_ALLOWED_REPORT_NAMES`
  - optional comma-separated allowlist of custom report names that are approved for live replacement
- `GEOTAB_ALLOW_CUSTOM_REPORT_CREATION`
  - set to `false` if you want hosted users to replace approved reports but not create new ones

Recommended hosted pilot settings:

```bash
GEOTAB_PROVIDER_MODE=live
GEOTAB_LIVE_MUTATION_MODE=browser-automation
ADMIN_ACCESS_TOKEN=replace-with-a-shared-secret
APP_WEB_ORIGIN=https://your-internal-hostname
GEOTAB_ALLOWED_REPORT_NAMES=Average_Fuel_Economy_with_Region_Fixed_1
GEOTAB_ALLOW_CUSTOM_REPORT_CREATION=true
```

This gives the team:

- app-level access control
- quick live report loading after the first warm-cache run
- live replacements limited to approved custom reports
- optional ability to create new custom reports from uploaded templates

## Hosting Notes

- Dockerfiles now run production-style commands instead of dev watchers.
- `docker-compose.yml` is suitable for a single internal host or VM pilot.
- SQLite remains acceptable for a single hosted instance, but move to Postgres before broader multi-user rollout.
- The first live catalog warm-up can still take a few minutes. After that, the API serves cached report data on restart from `.runtime/live-report-cache.json`.

## Testing

Current baseline coverage includes:

- API integration smoke test for `GET /api/health`
- mock provider protection for default-report replacement
- mock provider support for custom report creation from uploaded template

Run:

```bash
npm test
```

## Uncertain Geotab Integration TODOs

These areas are intentionally not implemented as live behavior yet:

1. Confirm documented MyGeotab authentication/session flow for this admin use case.
2. Confirm documented API support for listing custom reports with category, last modified, and schedule/distribution metadata.
3. Confirm whether custom report creation from uploaded template is supported through documented APIs.
4. Confirm whether template replacement is supported through documented APIs for existing custom reports.
5. If template upload or replacement is not supported via documented APIs, add a browser automation strategy behind the provider abstraction.
6. Capture enough pre-change metadata and possibly exported assets to make rollback truly restorable.
7. Add post-update verification against live data after each report mutation.
8. Harden background processing for production use with a persistent queue instead of in-memory serialization.

## GitHub And Private Deployment Prep

This repo now includes:

- CI workflow in [.github/workflows/ci.yml](C:/Users/MarkSmith/Documents/Playground/Geotab-git/.github/workflows/ci.yml)
- Dockerfiles for API and web
- [docker-compose.yml](C:/Users/MarkSmith/Documents/Playground/Geotab-git/docker-compose.yml)
- documentation spike notes in [docs/geotab-integration-spike.md](C:/Users/MarkSmith/Documents/Playground/Geotab-git/docs/geotab-integration-spike.md)

## Hosting Recommendation

For a small internal operations team, the best near-term setup is:

1. Keep source in a private GitHub repository.
2. Deploy the API and web app to a private internal VM or private cloud service.
3. Put the app behind VPN, private network access, or SSO-enabled reverse proxy.
4. Move from SQLite to Postgres before multi-user production use.

Why this is the best fit:

- GitHub is good for source control and CI, not for hosting this backend-driven tool directly.
- The app handles credentials, uploaded templates, audit data, and potentially browser automation.
- Internal operational tooling benefits more from network restriction and simple controlled deployment than from public PaaS defaults.

## Suggested Next Build Steps

1. Install dependencies and run the scaffold locally.
2. Populate the Playwright selector env vars against your actual MyGeotab UI if you want to test live automation.
3. Replace the live provider TODOs with validated Geotab API calls only after documentation review.
4. Move persistence from SQLite to Postgres before team-wide deployment.
