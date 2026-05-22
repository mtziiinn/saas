import { Router } from "express";
import { db } from "@workspace/db";
import { clinicalNotesTable, prescriptionsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

// ── Clinical Notes ──────────────────────────────────────────────

router.get("/notes", async (req, res) => {
  const { contactId } = req.query;
  if (!contactId) return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "contactId é obrigatório" } });

  try {
    const notes = await db
      .select()
      .from(clinicalNotesTable)
      .where(eq(clinicalNotesTable.contactId, Number(contactId)))
      .orderBy(clinicalNotesTable.createdAt);
    return res.json(notes);
  } catch (error) {
    logger.error({ error }, "Error listing clinical notes");
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } });
  }
});

router.post("/notes", async (req, res) => {
  const { contactId, type, content } = req.body;
  const userId = (req.user as any).userId;

  if (!contactId || !type || !content) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "contactId, type e content são obrigatórios" } });
  }

  if (!["evolution", "prescription", "observation"].includes(type)) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Tipo de nota inválido" } });
  }

  if (content.trim().length < 10) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Conteúdo deve ter pelo menos 10 caracteres" } });
  }

  try {
    const [note] = await db
      .insert(clinicalNotesTable)
      .values({ contactId: Number(contactId), type, content, authorId: userId })
      .returning();
    logger.info({ noteId: note.id, contactId, type }, "Clinical note created");
    return res.status(201).json(note);
  } catch (error) {
    logger.error({ error }, "Error creating clinical note");
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } });
  }
});

router.delete("/notes/:id", async (req, res) => {
  try {
    const [deleted] = await db
      .delete(clinicalNotesTable)
      .where(eq(clinicalNotesTable.id, Number(req.params.id)))
      .returning();
    if (!deleted) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Nota não encontrada" } });
    logger.info({ noteId: deleted.id }, "Clinical note deleted");
    return res.status(204).end();
  } catch (error) {
    logger.error({ error }, "Error deleting clinical note");
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } });
  }
});

// ── Prescriptions ───────────────────────────────────────────────

router.get("/prescriptions", async (req, res) => {
  const { contactId } = req.query;
  if (!contactId) return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "contactId é obrigatório" } });

  try {
    const prescriptions = await db
      .select()
      .from(prescriptionsTable)
      .where(eq(prescriptionsTable.contactId, Number(contactId)))
      .orderBy(prescriptionsTable.createdAt);
    return res.json(prescriptions);
  } catch (error) {
    logger.error({ error }, "Error listing prescriptions");
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } });
  }
});

router.post("/prescriptions", async (req, res) => {
  const { contactId, medication, dosage, duration, notes } = req.body;
  const userId = (req.user as any).userId;

  if (!contactId || !medication || !dosage || !duration) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "contactId, medication, dosage e duration são obrigatórios" } });
  }

  try {
    const [prescription] = await db
      .insert(prescriptionsTable)
      .values({ contactId: Number(contactId), medication, dosage, duration, notes, authorId: userId })
      .returning();
    logger.info({ prescriptionId: prescription.id, contactId }, "Prescription created");
    return res.status(201).json(prescription);
  } catch (error) {
    logger.error({ error }, "Error creating prescription");
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } });
  }
});

router.delete("/prescriptions/:id", async (req, res) => {
  try {
    const [deleted] = await db
      .delete(prescriptionsTable)
      .where(eq(prescriptionsTable.id, Number(req.params.id)))
      .returning();
    if (!deleted) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Prescrição não encontrada" } });
    logger.info({ prescriptionId: deleted.id }, "Prescription deleted");
    return res.status(204).end();
  } catch (error) {
    logger.error({ error }, "Error deleting prescription");
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } });
  }
});

export default router;
