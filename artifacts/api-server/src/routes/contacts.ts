import { Router } from "express";
import { db } from "@workspace/db";
import { contactsTable, companiesTable } from "@workspace/db";
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

const router = Router();

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

  const [updated] = await db
    .update(contactsTable)
    .set({ ...body.data, updatedAt: new Date() })
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

export default router;
