import { Router } from "express";
import { db } from "@workspace/db";
import { financialTransactionsTable, commissionsTable, usersTable, contactsTable, companiesTable } from "@workspace/db";
import { eq, and, sql, gte, lte } from "drizzle-orm";
import { logger } from "../lib/logger";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

router.get("/reports/financial-chart", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const conditions = [];
    if (startDate) conditions.push(gte(financialTransactionsTable.date, new Date(startDate as string)));
    if (endDate) conditions.push(lte(financialTransactionsTable.date, new Date(endDate as string)));

    const rows = await db
      .select({
        date: financialTransactionsTable.date,
        type: financialTransactionsTable.type,
        amount: financialTransactionsTable.amount,
        status: financialTransactionsTable.status,
      })
      .from(financialTransactionsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sql`${financialTransactionsTable.date} asc`);

    const monthly: Record<string, { income: number; expense: number }> = {};

    for (const r of rows) {
      const key = `${r.date.getFullYear()}-${String(r.date.getMonth() + 1).padStart(2, "0")}`;
      if (!monthly[key]) monthly[key] = { income: 0, expense: 0 };
      if (r.status === "cancelled") continue;
      if (r.type === "income") monthly[key].income += Number(r.amount);
      else monthly[key].expense += Number(r.amount);
    }

    const chartData = Object.entries(monthly)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }));

    res.json(chartData);
  } catch (error) {
    logger.error({ error }, "Error generating financial chart");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erro ao gerar gráfico financeiro" } });
  }
});

router.get("/reports/financial-pdf", async (req, res) => {
  try {
    const { startDate, endDate, type, status } = req.query;
    const conditions = [];
    if (type) conditions.push(eq(financialTransactionsTable.type, type as string));
    if (status) conditions.push(eq(financialTransactionsTable.status, status as string));
    if (startDate) conditions.push(gte(financialTransactionsTable.date, new Date(startDate as string)));
    if (endDate) conditions.push(lte(financialTransactionsTable.date, new Date(endDate as string)));

    const rows = await db
      .select({
        id: financialTransactionsTable.id,
        description: financialTransactionsTable.description,
        type: financialTransactionsTable.type,
        category: financialTransactionsTable.category,
        amount: financialTransactionsTable.amount,
        date: financialTransactionsTable.date,
        status: financialTransactionsTable.status,
        paymentMethod: financialTransactionsTable.paymentMethod,
        contactName: contactsTable.name,
      })
      .from(financialTransactionsTable)
      .leftJoin(contactsTable, eq(financialTransactionsTable.contactId, contactsTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sql`${financialTransactionsTable.date} desc`);

    const PDFDocument = (await import("pdfkit")).default;
    const doc = new PDFDocument({ margin: 40, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="relatorio-financeiro-${startDate || "inicio"}-${endDate || "fim"}.pdf"`);
    doc.pipe(res);

    doc.fontSize(18).font("Helvetica-Bold").text("Relatório Financeiro", { align: "center" });
    doc.fontSize(10).font("Helvetica").text(`Período: ${startDate || "..."} a ${endDate || "..."}`, { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(9).text(`Gerado em ${new Date().toLocaleDateString("pt-BR")}`, { align: "center" });
    doc.moveDown(1);

    const totalIncome = rows.filter(r => r.type === "income" && r.status !== "cancelled").reduce((s, r) => s + Number(r.amount), 0);
    const totalExpense = rows.filter(r => r.type === "expense" && r.status !== "cancelled").reduce((s, r) => s + Number(r.amount), 0);

    doc.fontSize(12).font("Helvetica-Bold").text(`Receitas: R$ ${totalIncome.toFixed(2)}`, { continued: true });
    doc.font("Helvetica").text(`    Despesas: R$ ${totalExpense.toFixed(2)}`, { continued: true });
    doc.font("Helvetica-Bold").text(`    Saldo: R$ ${(totalIncome - totalExpense).toFixed(2)}`);
    doc.moveDown(1);

    if (rows.length === 0) {
      doc.fontSize(11).font("Helvetica").text("Nenhuma transação encontrada no período.", { align: "center" });
    } else {
      const tableTop = doc.y;
      const colX = [40, 200, 280, 330, 400, 470];
      const colWidths = [160, 80, 50, 70, 70, 70];
      const headers = ["Descrição", "Tipo", "Categoria", "Valor", "Status", "Data"];

      doc.fontSize(8).font("Helvetica-Bold");
      doc.rect(40, tableTop - 4, 520, 16).fill("#1FA99A");
      doc.fill("#ffffff");
      headers.forEach((h, i) => doc.text(h, colX[i], tableTop, { width: colWidths[i], align: i >= 3 ? "right" : "left" }));
      doc.fill("#000000");

      let y = tableTop + 16;
      rows.forEach((r, idx) => {
        if (y > 760) {
          doc.addPage();
          y = 40;
        }
        if (idx % 2 === 0) doc.rect(40, y - 4, 520, 16).fill("#f4f9f8");
        doc.fill("#000000").fontSize(8).font("Helvetica");
        doc.text(r.description, colX[0], y, { width: colWidths[0] });
        doc.text(r.type === "income" ? "Receita" : "Despesa", colX[1], y, { width: colWidths[1] });
        doc.text(r.category || "-", colX[2], y, { width: colWidths[2] });
        doc.text(`R$ ${Number(r.amount).toFixed(2)}`, colX[3], y, { width: colWidths[3], align: "right" });
        doc.text(r.status === "paid" ? "Pago" : r.status === "pending" ? "Pend." : "Canc.", colX[4], y, { width: colWidths[4] });
        doc.text(r.date.toLocaleDateString("pt-BR"), colX[5], y, { width: colWidths[5], align: "right" });
        y += 16;
      });
    }

    doc.end();
  } catch (error) {
    logger.error({ error }, "Error generating financial PDF");
    if (!res.headersSent) {
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erro ao gerar PDF financeiro" } });
    }
  }
});

router.get("/reports/commissions-pdf", async (req, res) => {
  try {
    const { startDate, endDate, status, professionalId } = req.query;
    const conditions = [];
    if (status) conditions.push(eq(commissionsTable.status, status as string));
    if (professionalId) conditions.push(eq(commissionsTable.professionalId, Number(professionalId)));
    if (startDate) conditions.push(gte(commissionsTable.createdAt, new Date(startDate as string)));
    if (endDate) conditions.push(lte(commissionsTable.createdAt, new Date(endDate as string)));

    const rows = await db
      .select({
        id: commissionsTable.id,
        professionalName: usersTable.name,
        procedureValue: commissionsTable.procedureValue,
        commissionPercentage: commissionsTable.commissionPercentage,
        commissionAmount: commissionsTable.commissionAmount,
        status: commissionsTable.status,
        paidAt: commissionsTable.paidAt,
        createdAt: commissionsTable.createdAt,
      })
      .from(commissionsTable)
      .leftJoin(usersTable, eq(commissionsTable.professionalId, usersTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sql`${commissionsTable.createdAt} desc`);

    const PDFDocument = (await import("pdfkit")).default;
    const doc = new PDFDocument({ margin: 40, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="relatorio-comissoes-${startDate || "inicio"}-${endDate || "fim"}.pdf"`);
    doc.pipe(res);

    doc.fontSize(18).font("Helvetica-Bold").text("Relatório de Comissões", { align: "center" });
    doc.fontSize(10).font("Helvetica").text(`Período: ${startDate || "..."} a ${endDate || "..."}`, { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(9).text(`Gerado em ${new Date().toLocaleDateString("pt-BR")}`, { align: "center" });
    doc.moveDown(1);

    const totalPending = rows.filter(r => r.status === "pending").reduce((s, r) => s + Number(r.commissionAmount), 0);
    const totalPaid = rows.filter(r => r.status === "paid").reduce((s, r) => s + Number(r.commissionAmount), 0);

    doc.fontSize(12).font("Helvetica-Bold").text(`Pendente: R$ ${totalPending.toFixed(2)}`, { continued: true });
    doc.font("Helvetica").text(`    Pago: R$ ${totalPaid.toFixed(2)}`, { continued: true });
    doc.font("Helvetica-Bold").text(`    Total: R$ ${(totalPending + totalPaid).toFixed(2)}`);
    doc.moveDown(1);

    if (rows.length === 0) {
      doc.fontSize(11).font("Helvetica").text("Nenhuma comissão encontrada no período.", { align: "center" });
    } else {
      const tableTop = doc.y;
      const colX = [40, 180, 260, 320, 380, 450, 500];
      const colWidths = [140, 80, 60, 60, 70, 50, 50];
      const headers = ["Profissional", "Valor Proc.", "%", "Comissão", "Status", "Data"];

      doc.fontSize(8).font("Helvetica-Bold");
      doc.rect(40, tableTop - 4, 520, 16).fill("#F59E0B");
      doc.fill("#ffffff");
      headers.forEach((h, i) => doc.text(h, colX[i], tableTop, { width: colWidths[i], align: i >= 2 ? "right" : "left" }));
      doc.fill("#000000");

      let y = tableTop + 16;
      rows.forEach((r, idx) => {
        if (y > 760) {
          doc.addPage();
          y = 40;
        }
        if (idx % 2 === 0) doc.rect(40, y - 4, 520, 16).fill("#fefce8");
        doc.fill("#000000").fontSize(8).font("Helvetica");
        doc.text(r.professionalName || "-", colX[0], y, { width: colWidths[0] });
        doc.text(`R$ ${Number(r.procedureValue).toFixed(2)}`, colX[1], y, { width: colWidths[1], align: "right" });
        doc.text(`${r.commissionPercentage}%`, colX[2], y, { width: colWidths[2], align: "right" });
        doc.text(`R$ ${Number(r.commissionAmount).toFixed(2)}`, colX[3], y, { width: colWidths[3], align: "right" });
        doc.text(r.status === "paid" ? "Pago" : "Pend.", colX[4], y, { width: colWidths[4] });
        doc.text((r.paidAt || r.createdAt).toLocaleDateString("pt-BR"), colX[5], y, { width: colWidths[5], align: "right" });
        y += 16;
      });
    }

    doc.end();
  } catch (error) {
    logger.error({ error }, "Error generating commissions PDF");
    if (!res.headersSent) {
      res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erro ao gerar PDF de comissões" } });
    }
  }
});

export default router;
