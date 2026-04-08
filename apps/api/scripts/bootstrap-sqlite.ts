import { config } from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import initSqlJs from "sql.js";

config({ path: path.resolve(process.cwd(), "../../.env") });
config({ path: path.resolve(process.cwd(), ".env") });

function resolveDatabaseFile(databaseUrl: string): string {
  const normalized = databaseUrl.replace(/^file:/, "");
  return path.isAbsolute(normalized) ? normalized : path.resolve(process.cwd(), normalized);
}

const databaseUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const dbPath = resolveDatabaseFile(databaseUrl);
const SQL = await initSqlJs();

let dbFile: Uint8Array | undefined;

try {
  dbFile = await fs.readFile(dbPath);
} catch {
  dbFile = undefined;
}

const db = dbFile ? new SQL.Database(dbFile) : new SQL.Database();

db.run(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS "TemplateUpload" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS "Job" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "status" TEXT NOT NULL,
    "dryRun" INTEGER NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "templateFileName" TEXT NOT NULL,
    "selectedCount" INTEGER NOT NULL,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TEXT NOT NULL,
    "completedAt" TEXT,
    "templateUploadId" TEXT,
    FOREIGN KEY ("templateUploadId") REFERENCES "TemplateUpload"("id") ON DELETE SET NULL ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS "ReportBackup" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "reportId" TEXT NOT NULL,
    "reportName" TEXT NOT NULL,
    "templateFileName" TEXT,
    "backupPayload" TEXT NOT NULL,
    "storagePath" TEXT,
    "restorable" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "restoredAt" TEXT
  );

  CREATE TABLE IF NOT EXISTS "JobItem" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "jobId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "reportName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "details" TEXT,
    "errorMessage" TEXT,
    "beforeSnapshot" TEXT,
    "afterSnapshot" TEXT,
    "backupId" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TEXT NOT NULL,
    FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("backupId") REFERENCES "ReportBackup"("id") ON DELETE SET NULL ON UPDATE CASCADE
  );

  CREATE TABLE IF NOT EXISTS "AuditEntry" (
    "id" TEXT PRIMARY KEY NOT NULL,
    "jobId" TEXT,
    "reportId" TEXT,
    "reportName" TEXT,
    "level" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE
  );
`);

await fs.mkdir(path.dirname(dbPath), { recursive: true });
await fs.writeFile(dbPath, Buffer.from(db.export()));
db.close();

console.log(`SQLite bootstrap complete at ${dbPath}`);
