import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable, contactsTable, tasksTable } from "@workspace/db";
import { activityLogTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

router.get("/notifications", async (req, res) => {
  const { contactId, taskId } = req.query;
  const conditions = [];
  if (contactId) conditions.push(eq(notificationsTable.contactId, Number(contactId)));
  if (taskId) conditions.push(eq(notificationsTable.taskId, Number(taskId)));

  const rows = await db
    .select()
    .from(notificationsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${notificationsTable.createdAt} desc`);

  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/notifications/send", async (req, res) => {
  const { contactId, taskId, type, message } = req.body;

  if (!contactId || !message) {
    res.status(422).json({ error: { code: "VALIDATION_ERROR", message: "contactId and message are required" } });
    return;
  }

  const [contact] = await db
    .select({ name: contactsTable.name, email: contactsTable.email, phone: contactsTable.phone })
    .from(contactsTable)
    .where(eq(contactsTable.id, contactId));

  if (!contact) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }

  const channel = type === "email" && contact.email ? "email" : type === "sms" && contact.phone ? "sms" : "simulado";
  const recipient = channel === "email" ? contact.email! : channel === "sms" ? contact.phone! : `${contact.name} (simulado)`;

  const [notification] = await db
    .insert(notificationsTable)
    .values({
      contactId,
      taskId: taskId || null,
      type: type || "email",
      channel,
      recipient,
      message,
      status: "sent",
    })
    .returning();

  await db.insert(activityLogTable).values({
    type: "notification_sent",
    description: `Lembrete enviado para ${contact.name} via ${channel === "simulado" ? "simulação" : channel}`,
    entityId: contactId,
    entityName: contact.name,
  });

  res.status(201).json({ ...notification, createdAt: notification.createdAt.toISOString() });
});

export default router;
