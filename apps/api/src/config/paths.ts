import path from "node:path";

const repoRoot = path.resolve(process.cwd());

export const runtimePaths = {
  repoRoot,
  storageRoot: path.join(repoRoot, ".runtime"),
  uploadsDir: path.join(repoRoot, ".runtime", "uploads"),
  backupsDir: path.join(repoRoot, ".runtime", "backups")
};
