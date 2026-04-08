# Deployment Guide

This app is ready for a private internal pilot deployment on a single host or VM.

## Recommended deployment target

Use a private VM, private cloud instance, or internal Docker host.

Best fit examples:

- Windows or Linux VM inside your company network
- private Azure VM
- private AWS EC2 instance
- internal Docker host behind VPN or SSO proxy

## Why this is the current best fit

- The app needs a Node backend, not just static file hosting.
- It stores uploaded templates, audit logs, and a SQLite file.
- It can use Playwright browser automation for live Geotab create/replace flows.
- It benefits from a long-lived filesystem and predictable background process behavior.

## Current deployment model

- `web`: Vite preview server for the internal React UI
- `api`: Express server with SQLite bootstrap on startup
- persistence:
  - `./prisma` for the SQLite database
  - `./.runtime` for uploads, backups, session cache, and report cache

## First deployment checklist

1. Copy the repo to the host
2. Create `.env` from `.env.example`
3. Set:
   - `APP_WEB_ORIGIN`
   - `ADMIN_ACCESS_TOKEN`
   - `GEOTAB_PROVIDER_MODE`
   - `GEOTAB_LIVE_MUTATION_MODE`
   - `GEOTAB_ALLOWED_REPORT_NAMES`
   - `GEOTAB_ALLOW_CUSTOM_REPORT_CREATION`
   - Geotab credentials
4. Install Playwright Chromium:
   - `npm run automation:install`
5. Start with Docker Compose:
   - `docker compose up --build -d`
6. Open:
   - web: `http://<host>:5173`
   - api health: `http://<host>:4000/api/health`

## Recommended pilot env profile

```env
APP_WEB_ORIGIN=https://your-internal-hostname
ADMIN_ACCESS_TOKEN=replace-with-a-shared-secret
GEOTAB_PROVIDER_MODE=live
GEOTAB_LIVE_MUTATION_MODE=browser-automation
GEOTAB_ALLOWED_REPORT_NAMES=Average_Fuel_Economy_with_Region_Fixed_1
GEOTAB_ALLOW_CUSTOM_REPORT_CREATION=true
```

## Operational notes

- The first live report warm-up may still take a few minutes.
- After the first warm-up, cached report discovery is reused from `.runtime/live-report-cache.json`.
- SQLite is acceptable for a single hosted pilot.
- Move to Postgres before broader team rollout or if multiple app instances are required.

## Current non-production limitations

- rollback is not fully production-hard yet
- schedule/distribution preservation is still partial
- live Geotab mutation depends on the browser automation path, not a confirmed public report-template API
