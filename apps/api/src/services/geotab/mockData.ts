import type { GeotabCustomReport } from "@geotab-report-admin/shared";

export const mockReports: GeotabCustomReport[] = [
  {
    id: "report-1",
    name: "Fleet Safety Summary",
    kind: "custom",
    category: "Safety",
    lastModifiedAt: "2026-04-01T10:00:00.000Z",
    templateName: "safety-template-v1",
    canReplaceTemplate: true,
    replacementEligibilityReason: null,
    distribution: {
      hasSchedule: true,
      hasRecipients: true,
      scheduleSummary: "Weekly on Monday at 08:00",
      recipientCount: 3
    }
  },
  {
    id: "report-2",
    name: "Battery Intelligence",
    kind: "custom",
    category: "EV",
    lastModifiedAt: "2026-03-25T15:30:00.000Z",
    templateName: "battery-template-v3",
    canReplaceTemplate: true,
    replacementEligibilityReason: null,
    distribution: {
      hasSchedule: false,
      hasRecipients: true,
      scheduleSummary: null,
      recipientCount: 2
    }
  },
  {
    id: "report-3",
    name: "Exception Events Daily",
    kind: "custom",
    category: "Operations",
    lastModifiedAt: "2026-04-03T13:15:00.000Z",
    templateName: "ops-template-v2",
    canReplaceTemplate: true,
    replacementEligibilityReason: null,
    distribution: {
      hasSchedule: true,
      hasRecipients: false,
      scheduleSummary: "Daily at 06:00",
      recipientCount: 0
    }
  },
  {
    id: "report-4",
    name: "Built-In Daily Trips",
    kind: "default",
    category: "Default",
    lastModifiedAt: "2026-03-21T08:05:00.000Z",
    templateName: "system-default-trip",
    canReplaceTemplate: false,
    replacementEligibilityReason: "Default reports cannot accept uploaded replacement templates in Geotab.",
    distribution: {
      hasSchedule: true,
      hasRecipients: true,
      scheduleSummary: "Daily at 05:00",
      recipientCount: 4
    }
  }
];
