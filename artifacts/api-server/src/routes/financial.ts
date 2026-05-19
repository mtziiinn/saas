import { Router } from "express";
import { db } from "@workspace/db";
import { financialTransactionsTable, contactsTable, treatmentPlansTable } from "@workspace/db";
import { activityLogTable } from "@workspace/db";
import { eq, and, sql, gte, lte } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

const txWithRelations = {
  id: financialTransactionsTable.id,
  description: financialTransactionsTable.description,
  type: financialTransactionsTable.type,
  category: financialTransactionsTable.category,
  amount: financialTransactionsTable.amount,
  date: financialTransactionsTable.date,
  status: financialTransactionsTable.status,
  paymentMethod: financialTransactionsTable.paymentMethod,
  contactId: financialTransactionsTable.contactId,
  contactName: contactsTable.name,
  treatmentPlanId: financialTransactionsTable.treatmentPlanId,
  notes: financialTransactionsTable.notes,
  createdAt: financialTransactionsTable.createdAt,
};

router.get("/financial-transactions", async (req, res) => {
  const { type, category, status, startDate, endDate, contactId } = req.query;
  const conditions = [];

  if (type) conditions.push(eq(financialTransactionsTable.type, type as string));
  if (category) conditions.push(eq(financialTransactionsTable.category, category as string));
  if (status) conditions.push(eq(financialTransactionsTable.status, status as string));
  if (contactId) conditions.push(eq(financialTransactionsTable.contactId, Number(contactId)));
  if (startDate) conditions.push(gte(financialTransactionsTable.date, new Date(startDate as string)));
  if (endDate) conditions.push(lte(financialTransactionsTable.date, new Date(endDate as string)));

  const rows = await db
    .select(txWithRelations)
    .from(financialTransactionsTable)
    .leftJoin(contactsTable, eq(financialTransactionsTable.contactId, contactsTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${financialTransactionsTable.date} desc`);

  res.json(rows.map(r => ({ ...r, date: r.date.toISOString(), createdAt: r.createdAt.toISOString() })));
});

router.get("/financial-transactions/summary", async (_req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const all = await db.select().from(financialTransactionsTable);

  const totalIncome = all.filter(t => t.type === "income" && t.status === "paid").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = all.filter(t => t.type === "expense" && t.status === "paid").reduce((s, t) => s + Number(t.amount), 0);
  const pendingIncome = all.filter(t => t.type === "income" && t.status === "pending").reduce((s, t) => s + Number(t.amount), 0);

  const monthTx = all.filter(t => new Date(t.date) >= startOfMonth);
  const monthIncome = monthTx.filter(t => t.type === "income" && t.status === "paid").reduce((s, t) => s + Number(t.amount), 0);
  const monthExpense = monthTx.filter(t => t.type === "expense" && t.status === "paid").reduce((s, t) => s + Number(t.amount), 0);

  res.json({
    balance: totalIncome - totalExpense,
    totalIncome,
    totalExpense,
    pendingIncome,
    monthIncome,
    monthExpense,
    monthBalance: monthIncome - monthExpense,
  });
});

router.get("/financial-transactions/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }

  const [tx] = await db
    .select(txWithRelations)
    .from(financialTransactionsTable)
    .leftJoin(contactsTable, eq(financialTransactionsTable.contactId, contactsTable.id))
    .where(eq(financialTransactionsTable.id, id));

  if (!tx) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...tx, date: tx.date.toISOString(), createdAt: tx.createdAt.toISOString() });
});

router.post("/financial-transactions", async (req, res) => {
  const { description, type, category, amount, date, status, paymentMethod, contactId, treatmentPlanId, notes } = req.body;

  if (!description || !type || !amount) {
    res.status(422).json({ error: { code: "VALIDATION_ERROR", message: "description, type, and amount are required" } });
    return;
  }

  const [tx] = await db
    .insert(financialTransactionsTable)
    .values({
      description,
      type,
      category: category || "other",
      amount: String(amount),
      date: date ? new Date(date) : new Date(),
      status: status || "pending",
      paymentMethod: paymentMethod || null,
      contactId: contactId || null,
      treatmentPlanId: treatmentPlanId || null,
      notes: notes || null,
    })
    .returning();

  await db.insert(activityLogTable).values({
    type: "transaction_created",
    description: `Transaction created: ${tx.description} (R$ ${tx.amount})`,
    entityId: tx.id,
    entityName: tx.description,
  });

  res.status(201).json({ ...tx, date: tx.date.toISOString(), createdAt: tx.createdAt.toISOString() });
});

router.patch("/financial-transactions/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }

  const { description, type, category, amount, date, status, paymentMethod, contactId, treatmentPlanId, notes } = req.body;

  const updateData: Record<string, unknown> = {};
  if (description !== undefined) updateData.description = description;
  if (type !== undefined) updateData.type = type;
  if (category !== undefined) updateData.category = category;
  if (amount !== undefined) updateData.amount = String(amount);
  if (date !== undefined) updateData.date = new Date(date);
  if (status !== undefined) updateData.status = status;
  if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
  if (contactId !== undefined) updateData.contactId = contactId;
  if (treatmentPlanId !== undefined) updateData.treatmentPlanId = treatmentPlanId;
  if (notes !== undefined) updateData.notes = notes;

  if (Object.keys(updateData).length > 0) {
    updateData.updatedAt = new Date();
    await db.update(financialTransactionsTable).set(updateData).where(eq(financialTransactionsTable.id, id));
  }

  const [tx] = await db
    .select(txWithRelations)
    .from(financialTransactionsTable)
    .leftJoin(contactsTable, eq(financialTransactionsTable.contactId, contactsTable.id))
    .where(eq(financialTransactionsTable.id, id));

  if (!tx) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...tx, date: tx.date.toISOString(), createdAt: tx.createdAt.toISOString() });
});

router.delete("/financial-transactions/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(financialTransactionsTable).where(eq(financialTransactionsTable.id, id));
  res.status(204).send();
});

export default router;
