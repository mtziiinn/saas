import { Router } from "express";
import { db } from "@workspace/db";
import { contactsTable, companiesTable, tasksTable } from "@workspace/db";
import { ilike, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

router.get("/search", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!q) {
    res.json({ contacts: [], companies: [], tasks: [] });
    return;
  }
  const pattern = `%${q}%`;

  const [contacts, companies, tasks] = await Promise.all([
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
  ]);

  res.json({
    contacts: contacts.map((c) => ({ ...c, type: "contact" as const })),
    companies: companies.map((c) => ({ ...c, type: "company" as const })),
    tasks: tasks.map((t) => ({ ...t, type: "task" as const })),
  });
});

export default router;
