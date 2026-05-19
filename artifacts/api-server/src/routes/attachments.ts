import { Router } from "express";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { db } from "@workspace/db";
import { attachmentsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

/**
 * Endpoint para o Vercel Blob gerenciar o upload client-side.
 * O frontend chamará este endpoint para obter permissão/token de upload.
 */
router.post("/upload", async (req, res) => {
  const body = req.body as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // 🛡️ Segurança: Verificar se o usuário está autenticado
        if (!req.user) {
          throw new Error("Unauthorized");
        }

        // Recuperar metadados enviados pelo frontend
        const payload = JSON.parse(clientPayload || "{}");
        const { entityType, entityId } = payload;

        if (!entityType || !entityId) {
          throw new Error("entityType and entityId are required in clientPayload");
        }

        return {
          allowedContentTypes: ["image/jpeg", "image/png", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
          tokenPayload: JSON.stringify({
            userId: req.user.id,
            entityType,
            entityId,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // 🛡️ Este código roda no backend após o upload ser concluído com sucesso no Vercel
        try {
          const { userId, entityType, entityId } = JSON.parse(tokenPayload || "{}");

          await db.insert(attachmentsTable).values({
            filename: blob.url, // URL final do blob
            originalName: blob.pathname.split("/").pop() || "unnamed",
            mimeType: blob.contentType || "application/octet-stream",
            size: 0, // Vercel Blob não retorna size no onUploadCompleted diretamente em algumas versões, mas podemos ajustar
            entityType,
            contactId: entityType === "contact" ? Number(entityId) : null,
            companyId: entityType === "company" ? Number(entityId) : null,
            uploadedBy: userId,
          });

          logger.info({ url: blob.url, entityId }, "Attachment metadata saved");
        } catch (error) {
          logger.error({ error }, "Error saving attachment metadata");
          throw error;
        }
      },
    });

    return res.status(200).json(jsonResponse);
  } catch (error) {
    logger.error({ error }, "Vercel Blob upload handling error");
    return res.status(400).json({ error: (error as Error).message });
  }
});

/**
 * Listar anexos de uma entidade (contato ou empresa)
 */
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

/**
 * Deletar um anexo
 */
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);

  try {
    // 🛡️ No futuro: Adicionar verificação se o usuário tem permissão para deletar este arquivo específico
    const [deleted] = await db.delete(attachmentsTable).where(eq(attachmentsTable.id, id)).returning();

    if (!deleted) {
      return res.status(404).json({ error: "Attachment not found" });
    }

    // Nota: O arquivo no Vercel Blob continua lá.
    // Para deletar do Blob também, precisaríamos usar del(deleted.filename).

    return res.status(204).end();
  } catch (error) {
    logger.error({ error }, "Error deleting attachment");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
