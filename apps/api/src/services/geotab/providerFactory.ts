import { env } from "../../config/env.js";
import type { GeotabProvider } from "../../types/api.js";
import { FileStorageService } from "../storage/fileStorage.js";
import { PlaywrightGeotabAutomationStrategy } from "./automation/playwrightGeotabAutomation.js";
import { LiveGeotabProvider } from "./liveGeotabProvider.js";
import { MockGeotabProvider } from "./mockGeotabProvider.js";

export function createGeotabProvider(storage: FileStorageService): GeotabProvider {
  if (env.GEOTAB_PROVIDER_MODE === "live") {
    const automation =
      env.GEOTAB_LIVE_MUTATION_MODE === "browser-automation"
        ? new PlaywrightGeotabAutomationStrategy()
        : null;

    return new LiveGeotabProvider(automation);
  }

  return new MockGeotabProvider(storage);
}
