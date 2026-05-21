import { Router } from "express";
import { db } from "@workspace/db";
import { contactsTable, companiesTable, tasksTable, quotesTable, prescriptionsTable, clinicalNotesTable } from "@workspace/db";
import { ilike, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

router.get("/search", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!q) {
    res.json({ contacts: [], companies: [], tasks: [], quotes: [], prescriptions: [], notes: [] });
    return;
  }
  const pattern = `%${q}%`;

  const [contacts, companies, tasks, quotes, prescriptions, notes] = await Promise.all([
    db
      .select({
        id: contactsTable.id,
        name: contactsTable.name,
        email: contactsTable.email,
        status: contactsTable.status,
        companyName: companiesTable.name,
      })
      .from(contactsTable)
      .leftJoin(companiesTable, sql`${contactsTable.companyId} = ${companiesTable.id}`)
      .where(ilike(contactsTable.name, pattern))
      .limit(5),

    db
      .select({
        id: companiesTable.id,
        name: companiesTable.name,
        industry: companiesTable.industry,
        contactCount: sql<number>`cast(count(${contactsTable.id}) as int)`,
      })
      .from(companiesTable)
      .leftJoin(contactsTable, sql`${contactsTable.companyId} = ${companiesTable.id}`)
      .where(ilike(companiesTable.name, pattern))
      .groupBy(companiesTable.id)
      .limit(5),

    db
      .select({
        id: tasksTable.id,
        title: tasksTable.title,
        status: tasksTable.status,
        priority: tasksTable.priority,
        dueDate: tasksTable.dueDate,
        contactName: contactsTable.name,
        companyName: companiesTable.name,
      })
      .from(tasksTable)
      .leftJoin(contactsTable, sql`${tasksTable.contactId} = ${contactsTable.id}`)
      .leftJoin(companiesTable, sql`${tasksTable.companyId} = ${companiesTable.id}`)
      .where(ilike(tasksTable.title, pattern))
      .limit(5),

    db
      .select({
        id: quotesTable.id,
        title: quotesTable.title,
        status: quotesTable.status,
        contactName: contactsTable.name,
      })
      .from(quotesTable)
      .leftJoin(contactsTable, sql`${quotesTable.contactId} = ${contactsTable.id}`)
      .where(ilike(quotesTable.title, pattern))
      .limit(5),

    db
      .select({
        id: prescriptionsTable.id,
        medication: prescriptionsTable.medication,
        contactName: contactsTable.name,
      })
      .from(prescriptionsTable)
      .leftJoin(contactsTable, sql`${prescriptionsTable.contactId} = ${contactsTable.id}`)
      .where(ilike(prescriptionsTable.medication, pattern))
      .limit(5),

    db
      .select({
        id: clinicalNotesTable.id,
        content: clinicalNotesTable.content,
        type: clinicalNotesTable.type,
        contactName: contactsTable.name,
      })
      .from(clinicalNotesTable)
      .leftJoin(contactsTable, sql`${clinicalNotesTable.contactId} = ${contactsTable.id}`)
      .where(ilike(clinicalNotesTable.content, pattern))
      .limit(5),
  ]);

  res.json({
    contacts: contacts.map((c) => ({ ...c, type: "contact" as const })),
    companies: companies.map((c) => ({ ...c, type: "company" as const })),
    tasks: tasks.map((t) => ({ ...t, type: "task" as const })),
    quotes: quotes.map((q) => ({ ...q, type: "quote" as const })),
    prescriptions: prescriptions.map((p) => ({ ...p, type: "prescription" as const })),
    notes: notes.map((n) => ({ ...n, type: "note" as const })),
  });
});

export default router;
