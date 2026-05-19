import { Router } from "express";
import { db } from "@workspace/db";
import { tasksTable, contactsTable, companiesTable } from "@workspace/db";
import { activityLogTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import {
  ListTasksQueryParams,
  CreateTaskBody,
  GetTaskParams,
  UpdateTaskParams,
  UpdateTaskBody,
  DeleteTaskParams,
  CompleteTaskParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

const taskWithRelations = {
  id: tasksTable.id,
  title: tasksTable.title,
  description: tasksTable.description,
  status: tasksTable.status,
  priority: tasksTable.priority,
  dueDate: tasksTable.dueDate,
  clinicalNotes: tasksTable.clinicalNotes,
  contactId: tasksTable.contactId,
  contactName: contactsTable.name,
  companyId: tasksTable.companyId,
  companyName: companiesTable.name,
  createdAt: tasksTable.createdAt,
};

router.get("/tasks", async (req, res) => {
  const query = ListTasksQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }
  const { status, contactId, companyId, priority } = query.data;

  const conditions = [];
  if (status) conditions.push(eq(tasksTable.status, status));
  if (contactId) conditions.push(eq(tasksTable.contactId, contactId));
  if (companyId) conditions.push(eq(tasksTable.companyId, companyId));
  if (priority) conditions.push(eq(tasksTable.priority, priority));

  const rows = await db
    .select(taskWithRelations)
    .from(tasksTable)
    .leftJoin(contactsTable, eq(tasksTable.contactId, contactsTable.id))
    .leftJoin(companiesTable, eq(tasksTable.companyId, companiesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${tasksTable.createdAt} desc`);

  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/tasks", async (req, res) => {
  const body = CreateTaskBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const [task] = await db.insert(tasksTable).values(body.data).returning();

  await db.insert(activityLogTable).values({
    type: "task_created",
    description: `New task created: ${task.title}`,
    entityId: task.id,
    entityName: task.title,
  });

  const [row] = await db
    .select(taskWithRelations)
    .from(tasksTable)
    .leftJoin(contactsTable, eq(tasksTable.contactId, contactsTable.id))
    .leftJoin(companiesTable, eq(tasksTable.companyId, companiesTable.id))
    .where(eq(tasksTable.id, task.id));

  res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.get("/tasks/:id", async (req, res) => {
  const params = GetTaskParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [row] = await db
    .select(taskWithRelations)
    .from(tasksTable)
    .leftJoin(contactsTable, eq(tasksTable.contactId, contactsTable.id))
    .leftJoin(companiesTable, eq(tasksTable.companyId, companiesTable.id))
    .where(eq(tasksTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.patch("/tasks/:id", async (req, res) => {
  const params = UpdateTaskParams.safeParse({ id: Number(req.params.id) });
  const body = UpdateTaskBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const taskUpdateData: Record<string, unknown> = { ...body.data, updatedAt: new Date() };
  if (req.body.clinicalNotes !== undefined) taskUpdateData.clinicalNotes = req.body.clinicalNotes || null;

  await db
    .update(tasksTable)
    .set(taskUpdateData)
    .where(eq(tasksTable.id, params.data.id));

  const [row] = await db
    .select(taskWithRelations)
    .from(tasksTable)
    .leftJoin(contactsTable, eq(tasksTable.contactId, contactsTable.id))
    .leftJoin(companiesTable, eq(tasksTable.companyId, companiesTable.id))
    .where(eq(tasksTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.delete("/tasks/:id", async (req, res) => {
  const params = DeleteTaskParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(tasksTable).where(eq(tasksTable.id, params.data.id));
  res.status(204).send();
});

router.patch("/tasks/:id/complete", async (req, res) => {
  const params = CompleteTaskParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [updated] = await db
    .update(tasksTable)
    .set({ status: "done", updatedAt: new Date() })
    .where(eq(tasksTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  await db.insert(activityLogTable).values({
    type: "task_completed",
    description: `Task completed: ${updated.title}`,
    entityId: updated.id,
    entityName: updated.title,
  });

  const [row] = await db
    .select(taskWithRelations)
    .from(tasksTable)
    .leftJoin(contactsTable, eq(tasksTable.contactId, contactsTable.id))
    .leftJoin(companiesTable, eq(tasksTable.companyId, companiesTable.id))
    .where(eq(tasksTable.id, params.data.id));

  res.json({ ...row, createdAt: row.createdAt.toISOString() });
});

export default router;
