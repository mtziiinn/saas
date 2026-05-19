import { Router } from "express";
import { db } from "@workspace/db";
import { contactsTable, companiesTable, tasksTable, financialTransactionsTable } from "@workspace/db";
import { activityLogTable } from "@workspace/db";
import { eq, ilike, and, sql } from "drizzle-orm";
import {
  ListContactsQueryParams,
  CreateContactBody,
  GetContactParams,
  UpdateContactParams,
  UpdateContactBody,
  DeleteContactParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

router.get("/contacts", async (req, res) => {
  const query = ListContactsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }
  const { search, status, companyId } = query.data;

  const conditions = [];
  if (search) conditions.push(ilike(contactsTable.name, `%${search}%`));
  if (status) conditions.push(eq(contactsTable.status, status));
  if (companyId) conditions.push(eq(contactsTable.companyId, companyId));

  const rows = await db
    .select({
      id: contactsTable.id,
      name: contactsTable.name,
      email: contactsTable.email,
      phone: contactsTable.phone,
      role: contactsTable.role,
      status: contactsTable.status,
      notes: contactsTable.notes,
      recallDate: contactsTable.recallDate,
      companyId: contactsTable.companyId,
      companyName: companiesTable.name,
      createdAt: contactsTable.createdAt,
    })
    .from(contactsTable)
    .leftJoin(companiesTable, eq(contactsTable.companyId, companiesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${contactsTable.createdAt} desc`);

  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/contacts", async (req, res) => {
  const body = CreateContactBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const [contact] = await db
    .insert(contactsTable)
    .values(body.data)
    .returning();

  await db.insert(activityLogTable).values({
    type: "contact_created",
    description: `New contact added: ${contact.name}`,
    entityId: contact.id,
    entityName: contact.name,
  });

  const [row] = await db
    .select({
      id: contactsTable.id,
      name: contactsTable.name,
      email: contactsTable.email,
      phone: contactsTable.phone,
      role: contactsTable.role,
      status: contactsTable.status,
      notes: contactsTable.notes,
      recallDate: contactsTable.recallDate,
      companyId: contactsTable.companyId,
      companyName: companiesTable.name,
      createdAt: contactsTable.createdAt,
    })
    .from(contactsTable)
    .leftJoin(companiesTable, eq(contactsTable.companyId, companiesTable.id))
    .where(eq(contactsTable.id, contact.id));

  res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.get("/contacts/:id", async (req, res) => {
  const params = GetContactParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [row] = await db
    .select({
      id: contactsTable.id,
      name: contactsTable.name,
      email: contactsTable.email,
      phone: contactsTable.phone,
      role: contactsTable.role,
      status: contactsTable.status,
      notes: contactsTable.notes,
      recallDate: contactsTable.recallDate,
      companyId: contactsTable.companyId,
      companyName: companiesTable.name,
      createdAt: contactsTable.createdAt,
    })
    .from(contactsTable)
    .leftJoin(companiesTable, eq(contactsTable.companyId, companiesTable.id))
    .where(eq(contactsTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.patch("/contacts/:id", async (req, res) => {
  const params = UpdateContactParams.safeParse({ id: Number(req.params.id) });
  const body = UpdateContactBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const updateData: Record<string, unknown> = { ...body.data, updatedAt: new Date() };
  if (req.body.recallDate !== undefined) updateData.recallDate = req.body.recallDate || null;

  const [updated] = await db
    .update(contactsTable)
    .set(updateData)
    .where(eq(contactsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  await db.insert(activityLogTable).values({
    type: "contact_updated",
    description: `Contact updated: ${updated.name}`,
    entityId: updated.id,
    entityName: updated.name,
  });

  const [row] = await db
    .select({
      id: contactsTable.id,
      name: contactsTable.name,
      email: contactsTable.email,
      phone: contactsTable.phone,
      role: contactsTable.role,
      status: contactsTable.status,
      notes: contactsTable.notes,
      recallDate: contactsTable.recallDate,
      companyId: contactsTable.companyId,
      companyName: companiesTable.name,
      createdAt: contactsTable.createdAt,
    })
    .from(contactsTable)
    .leftJoin(companiesTable, eq(contactsTable.companyId, companiesTable.id))
    .where(eq(contactsTable.id, params.data.id));

  res.json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.delete("/contacts/:id", async (req, res) => {
  const params = DeleteContactParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(contactsTable).where(eq(contactsTable.id, params.data.id));
  res.status(204).send();
});

router.get("/contacts/:id/finances", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }

  const all = await db
    .select()
    .from(financialTransactionsTable)
    .where(eq(financialTransactionsTable.contactId, id));

  const totalIncome = all.filter(t => t.type === "income" && t.status === "paid").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = all.filter(t => t.type === "expense" && t.status === "paid").reduce((s, t) => s + Number(t.amount), 0);
  const pendingIncome = all.filter(t => t.type === "income" && t.status === "pending").reduce((s, t) => s + Number(t.amount), 0);

  res.json({ balance: totalIncome - totalExpense, totalIncome, totalExpense, pendingIncome, totalTransactions: all.length });
});

router.get("/contacts/:id/timeline", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }

  const activities = await db
    .select()
    .from(activityLogTable)
    .where(eq(activityLogTable.entityId, id))
    .orderBy(sql`${activityLogTable.createdAt} desc`);

  const tasks_ = await db
    .select({
      id: tasksTable.id,
      title: tasksTable.title,
      status: tasksTable.status,
      priority: tasksTable.priority,
      dueDate: tasksTable.dueDate,
      createdAt: tasksTable.createdAt,
    })
    .from(tasksTable)
    .where(eq(tasksTable.contactId, id))
    .orderBy(sql`${tasksTable.createdAt} desc`);

  const transactions = await db
    .select({
      id: financialTransactionsTable.id,
      description: financialTransactionsTable.description,
      amount: financialTransactionsTable.amount,
      type: financialTransactionsTable.type,
      status: financialTransactionsTable.status,
      date: financialTransactionsTable.date,
      createdAt: financialTransactionsTable.createdAt,
    })
    .from(financialTransactionsTable)
    .where(eq(financialTransactionsTable.contactId, id))
    .orderBy(sql`${financialTransactionsTable.createdAt} desc`);

  res.json({
    activities: activities.map(a => ({ ...a, createdAt: a.createdAt.toISOString() })),
    tasks: tasks_.map(t => ({ ...t, createdAt: t.createdAt.toISOString() })),
    transactions: transactions.map(tx => ({ ...tx, date: tx.date.toISOString(), createdAt: tx.createdAt.toISOString() })),
  });
});

export default router;
