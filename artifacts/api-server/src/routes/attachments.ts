import { Router } from "express";
import { put, del } from "@vercel/blob";
import { db } from "@workspace/db";
import { attachmentsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";
import { requireAuth } from "../middlewares/auth";
import multer from "multer";
import crypto from "crypto";

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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Tipo de arquivo não permitido"));
    }
  },
});

/**
 * Upload de arquivo via multipart/form-data
 */
router.post("/upload", upload.single("file"), async (req, res) => {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    logger.error("BLOB_READ_WRITE_TOKEN is missing");
    return res.status(500).json({ error: "Storage configuration error" });
  }

  const file = req.file;
  const { entityType, entityId } = req.body;

  if (!file) {
    return res.status(400).json({ error: "Nenhum arquivo enviado" });
  }

  if (!entityType || !entityId) {
    return res.status(400).json({ error: "entityType e entityId são obrigatórios" });
  }

  try {
    const userId = (req.user as any).userId;
    const ext = file.originalname.split(".").pop() || "";
    const safeName = `${entityType}-${entityId}-${crypto.randomUUID()}.${ext}`;

    const blob = await put(safeName, file.buffer, {
      access: "public",
      contentType: file.mimetype,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    const [attachment] = await db
      .insert(attachmentsTable)
      .values({
        filename: blob.url,
        originalName: file.originalname,
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
    return res.status(500).json({ error: "Falha no upload do arquivo" });
  }
});

/**
 * Listar anexos de uma entidade (contato ou empresa)
 */
router.get("/", async (req, res) => {
  const { entityType, entityId } = req.query;

  if (!entityType || !entityId) {
    return res
      .status(400)
      .json({ error: "entityType and entityId are required" });
  }

  try {
    const filters = [eq(attachmentsTable.entityType, String(entityType))];

    if (entityType === "contact") {
      filters.push(eq(attachmentsTable.contactId, Number(entityId)));
    } else {
      filters.push(eq(attachmentsTable.companyId, Number(entityId)));
    }

    const docs = await db
      .select()
      .from(attachmentsTable)
      .where(and(...filters));
    return res.json(docs);
  } catch (error) {
    logger.error({ error }, "Error listing attachments");
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Deletar um anexo
 */
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);

  try {
    const [deleted] = await db
      .delete(attachmentsTable)
      .where(eq(attachmentsTable.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: "Attachment not found" });
    }

    try {
      await del(deleted.filename, {
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
    } catch (blobError) {
      logger.warn({ blobError }, "Failed to delete blob file");
    }

    return res.status(204).end();
  } catch (error) {
    logger.error({ error }, "Error deleting attachment");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
