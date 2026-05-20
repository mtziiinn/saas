import { Router, type Request } from "express";
import { put, del, head } from "@vercel/blob";
import { db } from "@workspace/db";
import { attachmentsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";
import { requireAuth } from "../middlewares/auth";
import crypto from "crypto";
import Busboy from "busboy";
import { Readable } from "node:stream";

const router = Router();

router.use(requireAuth);

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const MAX_SIZE = 10 * 1024 * 1024;

interface ParsedFile {
  buffer: Buffer;
  filename: string;
  mimetype: string;
  size: number;
}

interface ParsedResult {
  file: ParsedFile;
  fields: Record<string, string>;
}

function parseMultipart(req: Request): Promise<ParsedResult> {
  return new Promise((resolve, reject) => {
    const bb = Busboy({ headers: req.headers });
    const chunks: Buffer[] = [];
    let fileInfo: { filename: string; mimetype: string; size: number } | null = null;
    const fields: Record<string, string> = {};

    bb.on("file", (_fieldname, file: Readable, info) => {
      fileInfo = { filename: info.filename, mimetype: info.mimeType, size: 0 };
      file.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
        if (fileInfo) fileInfo.size += chunk.length;
        if (fileInfo && fileInfo.size > MAX_SIZE) {
          file.destroy(new Error("Arquivo muito grande"));
        }
      });
    });

    bb.on("field", (name: string, value: string) => {
      fields[name] = value;
    });

    bb.on("close", () => {
      if (!fileInfo || chunks.length === 0) {
        reject(new Error("Nenhum arquivo enviado"));
        return;
      }
      resolve({ file: { buffer: Buffer.concat(chunks), ...fileInfo }, fields });
    });

    bb.on("error", reject);
    req.pipe(bb);
  });
}

router.post("/upload", async (req, res) => {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    logger.error("BLOB_READ_WRITE_TOKEN is missing");
    return res.status(500).json({ error: "Storage configuration error" });
  }

  try {
    const { file, fields } = await parseMultipart(req);
    const { entityType, entityId } = fields;

    if (!entityType || !entityId) {
      return res.status(400).json({ error: "entityType e entityId são obrigatórios" });
    }

    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return res.status(400).json({ error: "Tipo de arquivo não permitido" });
    }

    const userId = (req.user as any).userId;
    const ext = file.filename.split(".").pop() || "";
    const safeName = `${entityType}-${entityId}-${crypto.randomUUID()}.${ext}`;

    const blob = await put(safeName, file.buffer, {
      access: "private",
      contentType: file.mimetype,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    const [attachment] = await db
      .insert(attachmentsTable)
      .values({
        filename: blob.url,
        originalName: file.filename,
        mimeType: file.mimetype,
        size: file.size,
        entityType,
        contactId: entityType === "contact" ? Number(entityId) : null,
        companyId: entityType === "company" ? Number(entityId) : null,
        uploadedBy: userId,
      })
      .returning();

    logger.info({ url: blob.url, entityId }, "Attachment uploaded");
    return res.json(attachment);
  } catch (error) {
    logger.error({ error }, "Error uploading attachment");
    return res.status(500).json({ error: error instanceof Error ? error.message : "Falha no upload" });
  }
});

router.get("/", async (req, res) => {
  const { entityType, entityId } = req.query;

  if (!entityType || !entityId) {
    return res.status(400).json({ error: "entityType and entityId are required" });
  }

  try {
    const filters = [eq(attachmentsTable.entityType, String(entityType))];

    if (entityType === "contact") {
      filters.push(eq(attachmentsTable.contactId, Number(entityId)));
    } else {
      filters.push(eq(attachmentsTable.companyId, Number(entityId)));
    }

    const docs = await db.select().from(attachmentsTable).where(and(...filters));
    return res.json(docs);
  } catch (error) {
    logger.error({ error }, "Error listing attachments");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);

  try {
    const [deleted] = await db.delete(attachmentsTable).where(eq(attachmentsTable.id, id)).returning();

    if (!deleted) {
      return res.status(404).json({ error: "Attachment not found" });
    }

    try {
      await del(deleted.filename, { token: process.env.BLOB_READ_WRITE_TOKEN });
    } catch (blobError) {
      logger.warn({ blobError }, "Failed to delete blob file");
    }

    return res.status(204).end();
  } catch (error) {
    logger.error({ error }, "Error deleting attachment");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id/download", async (req, res) => {
  const id = Number(req.params.id);

  try {
    const [attachment] = await db.select().from(attachmentsTable).where(eq(attachmentsTable.id, id));

    if (!attachment) {
      return res.status(404).json({ error: "Attachment not found" });
    }

    const blobInfo = await head(attachment.filename, {
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    if (!blobInfo) {
      return res.status(404).json({ error: "File not found in storage" });
    }

    const downloadUrl = new URL(blobInfo.url);
    downloadUrl.searchParams.set("download", "1");
    downloadUrl.searchParams.set("token", process.env.BLOB_READ_WRITE_TOKEN!);

    return res.json({ url: downloadUrl.toString() });
  } catch (error) {
    logger.error({ error }, "Error generating download URL");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
