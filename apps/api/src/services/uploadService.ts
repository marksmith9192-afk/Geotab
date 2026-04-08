import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "./prisma.js";
import { FileStorageService } from "./storage/fileStorage.js";

export class UploadService {
  constructor(private readonly storage: FileStorageService) {}

  async persistUpload(file: Express.Multer.File): Promise<{
    uploadId: string;
    templatePath: string;
    fileName: string;
  }> {
    const now = new Date().toISOString();
    await this.storage.ensureRuntimeDirs();
    const storedName = `${Date.now()}-${file.originalname}`;
    const targetPath = this.storage.resolveUploadPath(storedName);
    await fs.writeFile(targetPath, file.buffer);

    const upload = await prisma.templateUpload.create({
      data: {
        originalName: file.originalname,
        storedName,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storagePath: path.relative(process.cwd(), targetPath),
        createdAt: now
      }
    });

    return {
      uploadId: upload.id,
      templatePath: targetPath,
      fileName: file.originalname
    };
  }
}
