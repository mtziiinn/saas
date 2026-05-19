import { Router } from "express";
import { db } from "@workspace/db";
import { contactsTable, companiesTable, tasksTable, activityLogTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

router.get("/dashboard/stats", async (req, res) => {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

  const [[totalContacts], [totalCompanies], [totalTasks], [tasksDueToday], [tasksOverdue], [tasksDone], [newContactsThisMonth]] =
    await Promise.all([
      db.select({ count: sql<number>`cast(count(*) as int)` }).from(contactsTable),
      db.select({ count: sql<number>`cast(count(*) as int)` }).from(companiesTable),
      db.select({ count: sql<number>`cast(count(*) as int)` }).from(tasksTable),
      db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(tasksTable)
        .where(sql`tasks.due_date = ${todayStr} AND tasks.status != 'done'`),
      db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(tasksTable)
        .where(sql`tasks.due_date < ${todayStr} AND tasks.status != 'done'`),
      db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(tasksTable)
        .where(eq(tasksTable.status, "done")),
      db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(contactsTable)
        .where(sql`created_at >= ${startOfMonth}`),
    ]);

  res.json({
    totalContacts: totalContacts.count,
    totalCompanies: totalCompanies.count,
    totalTasks: totalTasks.count,
    tasksDueToday: tasksDueToday.count,
    tasksOverdue: tasksOverdue.count,
    tasksDone: tasksDone.count,
    newContactsThisMonth: newContactsThisMonth.count,
  });
});

router.get("/dashboard/recent-activity", async (req, res) => {
  const rows = await db
    .select()
    .from(activityLogTable)
    .orderBy(sql`created_at desc`)
    .limit(20);

  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.get("/dashboard/tasks-upcoming", async (req, res) => {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const in7DaysStr = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const rows = await db
    .select({
      id: tasksTable.id,
      title: tasksTable.title,
      description: tasksTable.description,
      status: tasksTable.status,
      priority: tasksTable.priority,
      dueDate: tasksTable.dueDate,
      contactId: tasksTable.contactId,
      contactName: contactsTable.name,
      companyId: tasksTable.companyId,
      companyName: companiesTable.name,
      createdAt: tasksTable.createdAt,
    })
    .from(tasksTable)
    .leftJoin(contactsTable, eq(tasksTable.contactId, contactsTable.id))
    .leftJoin(companiesTable, eq(tasksTable.companyId, companiesTable.id))
    .where(sql`tasks.due_date >= ${todayStr} AND tasks.due_date <= ${in7DaysStr} AND tasks.status != 'done'`)
    .orderBy(tasksTable.dueDate);

  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.get("/dashboard/contacts-by-status", async (req, res) => {
  const rows = await db
    .select({
      status: contactsTable.status,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(contactsTable)
    .groupBy(contactsTable.status);

  res.json(rows);
});

export default router;
