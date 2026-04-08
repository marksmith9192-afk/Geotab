# Hosting Recommendation

## Recommended Setup

For this internal admin tool, the best near-term deployment model is:

1. Private GitHub repository for source control and CI.
2. Private runtime environment for the app itself.
3. Network restriction in front of the app.
4. Postgres instead of SQLite before broader internal rollout.

## Why Not GitHub Pages

GitHub Pages is not a fit because this app requires:

- a Node.js backend
- file upload handling
- persistent job history and audit state
- secret management
- optional browser automation for Geotab fallback workflows

## Best Practical Option For A Small Internal Team

### Option A: Internal VM or private cloud VM

Recommended default.

- Run API and web as containers or Node services on one locked-down host.
- Restrict access with VPN, private IP allowlist, or company SSO reverse proxy.
- Store environment variables only on the runtime host.
- Replace SQLite with Postgres when usage grows.

## Good Alternative

### Option B: Private platform deployment

Examples:

- Azure App Service
- AWS ECS/Fargate
- Render private service
- Railway private project

This is workable if:

- ingress is private or SSO-protected
- secrets are centrally managed
- browser automation is supported in the runtime you choose

## SQLite Guidance

SQLite is acceptable for:

- local development
- single-operator testing
- short-lived MVP evaluation

SQLite is not the recommended final choice for:

- concurrent internal users
- production-grade audit retention
- durable queueing and recovery

## Final Recommendation

Use:

- private GitHub for source
- GitHub Actions for CI
- private VM or private cloud service for runtime
- Postgres for shared production persistence
- Playwright fallback enabled only in environments where browser automation is operationally acceptable
