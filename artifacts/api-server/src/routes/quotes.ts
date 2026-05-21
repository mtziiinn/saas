import { Router } from "express";
import { db } from "@workspace/db";
import { quotesTable, quoteItemsTable, contactsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { requireAuth } from "../middlewares/auth";

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
    const PDFDocument = (await import("pdfkit")).default;

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
    const rowHeight = 20;
    
    // Column definitions: [x, width, align, header]
    const cols: { x: number; w: number; align: "left" | "center" | "right"; h: string }[] = [
      { x: 50, w: 220, align: "left", h: "Descrição" },
      { x: 280, w: 50, align: "center", h: "Qtd" },
      { x: 340, w: 80, align: "right", h: "Unitário" },
      { x: 430, w: 80, align: "right", h: "Total" },
    ];

    // Header background
    doc.fillColor("#f3f4f6");
    doc.rect(40, tableTop - 5, 480, rowHeight + 5).fill();
    doc.fillColor("#000000");

    // Header text
    doc.fontSize(9).font("Helvetica-Bold");
    cols.forEach((col) => {
      doc.text(col.h, col.x, tableTop, { width: col.w, align: col.align });
    });

    // Header underline
    doc.moveTo(50, tableTop + rowHeight).lineTo(510, tableTop + rowHeight).stroke();

    // Items rows
    doc.fontSize(9).font("Helvetica");
    let rowY = tableTop + rowHeight + 5;
    
    items.forEach((item, index) => {
      // Alternating row background
      if (index % 2 === 0) {
        doc.fillColor("#f9fafb");
        doc.rect(40, rowY - 4, 480, rowHeight).fill();
        doc.fillColor("#000000");
      }

      doc.text(item.description, cols[0].x, rowY, { width: cols[0].w, align: "left" });
      doc.text(String(item.quantity), cols[1].x, rowY, { width: cols[1].w, align: "center" });
      doc.text(`R$ ${Number(item.unitPrice).toFixed(2)}`, cols[2].x, rowY, { width: cols[2].w, align: "right" });
      doc.text(`R$ ${Number(item.total).toFixed(2)}`, cols[3].x, rowY, { width: cols[3].w, align: "right" });
      
      rowY += rowHeight;
    });

    // Total line
    doc.moveTo(50, rowY + 5).lineTo(510, rowY + 5).stroke();
    const totalY = rowY + 12;
    doc.fontSize(10).font("Helvetica-Bold");
    doc.text("TOTAL:", 50, totalY, { width: 380, align: "right" });
    doc.text(`R$ ${total.toFixed(2)}`, cols[3].x, totalY, { width: cols[3].w, align: "right" });

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
