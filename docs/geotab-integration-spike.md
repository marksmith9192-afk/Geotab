# Geotab Integration Spike

## Date

April 8, 2026

## Goal

Clarify what is documented versus uncertain for:

- MyGeotab authentication
- report discovery
- creating a custom report from uploaded template
- replacing a template on an existing custom report

## Findings

### 1. Authentication is documented

Geotab’s API reference documents `Credentials` with `Database`, `UserName`, `Password`, and `SessionId`, which is enough to justify a documented JSON-RPC authentication/session path.

Source:

- [Credentials](https://developers.geotab.com/myGeotab/apiReference/objects/Credentials/)

### 2. Custom report upload exists in the product UI

Geotab support documentation describes uploading a custom report template through the MyGeotab product workflow. This supports the product rule that template upload is a custom-report workflow.

Source:

- [Uploading a custom report](https://support.geotab.com/geotab-academy/resources/tutorial-upload-custom-report)

### 3. Public API support for report discovery/upload/replacement is still inconclusive

I reviewed the published MyGeotab API object index and did not find a clearly documented public `Report` object or an obvious report-template upload/replacement object in the exposed reference.

This is an inference from the published object index, not proof that no internal/private endpoint exists.

Source:

- [MyGeotab API object index](https://developers.geotab.com/myGeotab/apiReference/objects/index.html)

## Implementation Decision

### Documented path

- Use documented API authentication/session handling in the live provider.

### Uncertain path

- Keep report discovery isolated until it is validated against official Geotab documentation.
- Treat custom report creation from uploaded template as unverified for public API use.
- Treat template replacement on existing custom reports as unverified for public API use.

### Fallback path

- Add an opt-in Playwright automation strategy for:
  - create custom report from template
  - replace template on existing custom report
- Require post-action verification before marking create/update as successful.

## Current Code Mapping

- Live provider: [apps/api/src/services/geotab/liveGeotabProvider.ts](C:/Users/MarkSmith/Documents/Playground/Geotab-git/apps/api/src/services/geotab/liveGeotabProvider.ts)
- Playwright fallback: [apps/api/src/services/geotab/automation/playwrightGeotabAutomation.ts](C:/Users/MarkSmith/Documents/Playground/Geotab-git/apps/api/src/services/geotab/automation/playwrightGeotabAutomation.ts)

## Remaining Unknowns

1. Whether Geotab exposes a documented API for listing custom reports with metadata needed by this admin app.
2. Whether Geotab exposes a documented API for creating a custom report from uploaded template.
3. Whether Geotab exposes a documented API for replacing a template on an existing custom report.
4. Which exact DOM selectors and UX flow are stable enough for browser automation in the target MyGeotab environment.
