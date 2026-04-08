import fs from "node:fs/promises";
import path from "node:path";
import { runtimePaths } from "../../config/paths.js";

export class FileStorageService {
  async ensureRuntimeDirs(): Promise<void> {
    await Promise.all([
      fs.mkdir(runtimePaths.storageRoot, { recursive: true }),
      fs.mkdir(runtimePaths.uploadsDir, { recursive: true }),
      fs.mkdir(runtimePaths.backupsDir, { recursive: true })
    ]);
  }

  resolveUploadPath(storedName: string): string {
    return path.join(runtimePaths.uploadsDir, storedName);
  }

  resolveBackupPath(fileName: string): string {
    return path.join(runtimePaths.backupsDir, fileName);
  }
}
