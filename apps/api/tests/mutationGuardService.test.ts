import { beforeEach, describe, expect, it, vi } from "vitest";

describe("MutationGuardService", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("blocks unapproved live reports when an allowlist is configured", async () => {
    vi.stubEnv("GEOTAB_PROVIDER_MODE", "live");
    vi.stubEnv("GEOTAB_ALLOWED_REPORT_NAMES", "Approved Report");

    const { MutationGuardService } = await import("../src/services/mutationGuardService.js");
    const guard = new MutationGuardService();

    expect(
      guard.getReportRestrictionReason({
        id: "1",
        name: "Other Report",
        kind: "custom",
        canReplaceTemplate: true
      })
    ).toContain("not approved");
    expect(
      guard.getReportRestrictionReason({
        id: "2",
        name: "Approved Report",
        kind: "custom",
        canReplaceTemplate: true
      })
    ).toBeNull();
  });

  it("can disable live custom report creation", async () => {
    vi.stubEnv("GEOTAB_PROVIDER_MODE", "live");
    vi.stubEnv("GEOTAB_ALLOW_CUSTOM_REPORT_CREATION", "false");

    const { MutationGuardService } = await import("../src/services/mutationGuardService.js");
    const guard = new MutationGuardService();

    expect(guard.canCreateCustomReport()).toBe(false);
    expect(guard.getCustomReportCreationRestrictionReason()).toContain("disabled");
  });
});
