import { Router } from "express";
import { db } from "@workspace/db";
import { contactsTable, tasksTable, companiesTable, financialTransactionsTable, commissionsTable, usersTable } from "@workspace/db";
import { eq, and, sql, gte, lte } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const escape = (v: string | number | null | undefined) => {
    if (v == null) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  return [headers.join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
}

router.get("/contacts/export", async (req, res) => {
  const contacts = await db
    .select({
      id: contactsTable.id,
      name: contactsTable.name,
      email: contactsTable.email,
      phone: contactsTable.phone,
      role: contactsTable.role,
      status: contactsTable.status,
      companyName: companiesTable.name,
      notes: contactsTable.notes,
      createdAt: contactsTable.createdAt,
    })
    .from(contactsTable)
    .leftJoin(companiesTable, sql`${contactsTable.companyId} = ${companiesTable.id}`)
    .orderBy(sql`${contactsTable.createdAt} desc`);

  const csv = toCsv(
    ["ID", "Name", "Email", "Phone", "Role", "Status", "Company", "Notes", "Created At"],
    contacts.map((c) => [
      c.id,
      c.name,
      c.email,
      c.phone,
      c.role,
      c.status,
      c.companyName,
      c.notes,
      c.createdAt.toISOString(),
    ])
  );

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="contacts.csv"');
  res.send(csv);
});

router.get("/tasks/export", async (req, res) => {
  const tasks = await db
    .select({
      id: tasksTable.id,
      title: tasksTable.title,
      description: tasksTable.description,
      status: tasksTable.status,
      priority: tasksTable.priority,
      dueDate: tasksTable.dueDate,
      contactName: contactsTable.name,
      companyName: companiesTable.name,
      createdAt: tasksTable.createdAt,
    })
    .from(tasksTable)
    .leftJoin(contactsTable, sql`${tasksTable.contactId} = ${contactsTable.id}`)
    .leftJoin(companiesTable, sql`${tasksTable.companyId} = ${companiesTable.id}`)
    .orderBy(sql`${tasksTable.createdAt} desc`);

  const csv = toCsv(
    ["ID", "Title", "Description", "Status", "Priority", "Due Date", "Contact", "Company", "Created At"],
    tasks.map((t) => [
      t.id,
      t.title,
      t.description,
      t.status,
      t.priority,
      t.dueDate,
      t.contactName,
      t.companyName,
      t.createdAt.toISOString(),
    ])
  );

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="tasks.csv"');
  res.send(csv);
});

router.get("/financial/export", async (req, res) => {
  const { type, category, status, startDate, endDate } = req.query;
  const conditions = [];
  if (type) conditions.push(eq(financialTransactionsTable.type, type as string));
  if (category) conditions.push(eq(financialTransactionsTable.category, category as string));
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
      notes: financialTransactionsTable.notes,
      createdAt: financialTransactionsTable.createdAt,
    })
    .from(financialTransactionsTable)
    .leftJoin(contactsTable, eq(financialTransactionsTable.contactId, contactsTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${financialTransactionsTable.date} desc`);

  const csv = toCsv(
    ["ID", "Description", "Type", "Category", "Amount", "Date", "Status", "Payment Method", "Patient", "Notes", "Created At"],
    rows.map((r) => [
      r.id,
      r.description,
      r.type,
      r.category,
      r.amount,
      r.date.toISOString(),
      r.status,
      r.paymentMethod,
      r.contactName,
      r.notes,
      r.createdAt.toISOString(),
    ])
  );

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="financial-${new Date().toISOString().split("T")[0]}.csv"`);
  res.send(csv);
});

router.get("/commissions/export", async (req, res) => {
  const { status, professionalId, startDate, endDate } = req.query;
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
      notes: commissionsTable.notes,
      createdAt: commissionsTable.createdAt,
    })
    .from(commissionsTable)
    .leftJoin(usersTable, eq(commissionsTable.professionalId, usersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${commissionsTable.createdAt} desc`);

  const csv = toCsv(
    ["ID", "Professional", "Procedure Value", "Commission %", "Commission Amount", "Status", "Paid At", "Notes", "Created At"],
    rows.map((r) => [
      r.id,
      r.professionalName,
      r.procedureValue,
      r.commissionPercentage,
      r.commissionAmount,
      r.status,
      r.paidAt?.toISOString() || "",
      r.notes,
      r.createdAt.toISOString(),
    ])
  );

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="commissions-${new Date().toISOString().split("T")[0]}.csv"`);
  res.send(csv);
});

export default router;
