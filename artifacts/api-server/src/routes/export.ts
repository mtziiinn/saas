import { Router } from "express";
import { db } from "@workspace/db";
import { contactsTable, tasksTable, companiesTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

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

export default router;
