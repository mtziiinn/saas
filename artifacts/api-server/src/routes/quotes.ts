import { Router } from "express";
import { db } from "@workspace/db";
import { quotesTable, quoteItemsTable, contactsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { requireAuth } from "../middlewares/auth";
import PDFDocument from "pdfkit";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const { contactId } = req.query;
  if (!contactId) return res.status(400).json({ error: "contactId is required" });

  try {
    const quotes = await db
      .select()
      .from(quotesTable)
      .where(eq(quotesTable.contactId, Number(contactId)))
      .orderBy(sql`${quotesTable.createdAt} desc`);
    return res.json(quotes);
  } catch (error) {
    logger.error({ error }, "Error listing quotes");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  const { contactId, title, status, validUntil, notes, items } = req.body;
  const userId = (req.user as any).userId;

  if (!contactId || !title || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "contactId, title e items são obrigatórios" });
  }

  for (const item of items) {
    if (!item.description || !item.unitPrice || item.quantity < 1) {
      return res.status(400).json({ error: "Cada item deve ter description, unitPrice e quantity >= 1" });
    }
  }

  try {
    const [quote] = await db
      .insert(quotesTable)
      .values({ contactId: Number(contactId), title, status: status || "draft", validUntil, notes, authorId: userId })
      .returning();

    const quoteItems = items.map((item: any) => ({
      quoteId: quote.id,
      description: item.description,
      quantity: item.quantity,
      unitPrice: String(item.unitPrice),
      total: String(Number(item.unitPrice) * Number(item.quantity)),
    }));

    await db.insert(quoteItemsTable).values(quoteItems);

    logger.info({ quoteId: quote.id, contactId }, "Quote created");
    return res.json({ ...quote, items: quoteItems });
  } catch (error) {
    logger.error({ error }, "Error creating quote");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id/status", async (req, res) => {
  const { status } = req.body;
  const validStatuses = ["draft", "sent", "accepted", "rejected", "expired"];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Status inválido" });
  }

  try {
    const [updated] = await db
      .update(quotesTable)
      .set({ status })
      .where(eq(quotesTable.id, Number(req.params.id)))
      .returning();

    if (!updated) return res.status(404).json({ error: "Orçamento não encontrado" });

    logger.info({ quoteId: updated.id, status }, "Quote status updated");
    return res.json(updated);
  } catch (error) {
    logger.error({ error }, "Error updating quote status");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const [deleted] = await db
      .delete(quotesTable)
      .where(eq(quotesTable.id, Number(req.params.id)))
      .returning();
    if (!deleted) return res.status(404).json({ error: "Orçamento não encontrado" });
    logger.info({ quoteId: deleted.id }, "Quote deleted");
    return res.status(204).end();
  } catch (error) {
    logger.error({ error }, "Error deleting quote");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id/pdf", async (req, res) => {
  const id = Number(req.params.id);

  try {
    const [quote] = await db.select().from(quotesTable).where(eq(quotesTable.id, id));
    if (!quote) return res.status(404).json({ error: "Orçamento não encontrado" });

    const [contact] = await db.select().from(contactsTable).where(eq(contactsTable.id, quote.contactId));
    const items = await db.select().from(quoteItemsTable).where(eq(quoteItemsTable.quoteId, id));

    const total = items.reduce((sum, item) => sum + Number(item.total), 0);

    const doc = new PDFDocument({ margin: 50, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="orcamento-${quote.id}.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(20).font("Helvetica-Bold").text("ORÇAMENTO", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).font("Helvetica").text(`Nº ${quote.id}`, { align: "center" });
    doc.moveDown(1);

    // Patient info
    doc.fontSize(12).font("Helvetica-Bold").text("Paciente:");
    doc.fontSize(10).font("Helvetica").text(contact?.name || "N/A");
    doc.moveDown(0.5);

    if (quote.validUntil) {
      doc.fontSize(10).text(`Validade: ${new Date(quote.validUntil).toLocaleDateString("pt-BR")}`);
    }
    doc.moveDown(1);

    // Items table header
    const tableTop = doc.y;
    const colWidths = [250, 60, 80, 80];
    const headers = ["Descrição", "Qtd", "Unitário", "Total"];
    let xPos = 50;

    doc.fontSize(9).font("Helvetica-Bold");
    headers.forEach((h, i) => {
      doc.text(h, xPos, tableTop, { width: colWidths[i], align: i === 0 ? "left" : "right" });
      xPos += colWidths[i];
    });

    doc.moveTo(50, tableTop + 15).lineTo(500, tableTop + 15).stroke();

    // Items rows
    doc.fontSize(9).font("Helvetica");
    let rowY = tableTop + 22;
    items.forEach((item) => {
      xPos = 50;
      doc.text(item.description, xPos, rowY, { width: colWidths[0] });
      xPos += colWidths[0];
      doc.text(String(item.quantity), xPos, rowY, { width: colWidths[1], align: "right" });
      xPos += colWidths[1];
      doc.text(`R$ ${Number(item.unitPrice).toFixed(2)}`, xPos, rowY, { width: colWidths[2], align: "right" });
      xPos += colWidths[2];
      doc.text(`R$ ${Number(item.total).toFixed(2)}`, xPos, rowY, { width: colWidths[3], align: "right" });
      rowY += 18;
    });

    // Total
    doc.moveTo(50, rowY + 5).lineTo(500, rowY + 5).stroke();
    doc.moveDown(0.5);
    doc.fontSize(12).font("Helvetica-Bold").text(`TOTAL: R$ ${total.toFixed(2)}`, { align: "right" });

    // Notes
    if (quote.notes) {
      doc.moveDown(2);
      doc.fontSize(10).font("Helvetica-Bold").text("Observações:");
      doc.fontSize(9).font("Helvetica").text(quote.notes);
    }

    // Footer
    doc.fontSize(8).font("Helvetica").text("OdontoFlow — Documento gerado automaticamente", 50, 780, { align: "center" });

    doc.end();
    return;
  } catch (error) {
    logger.error({ error }, "Error generating PDF");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
