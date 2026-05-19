import { Router } from "express";
import { db } from "@workspace/db";
import { companiesTable, contactsTable } from "@workspace/db";
import { activityLogTable } from "@workspace/db";
import { eq, ilike, sql, count } from "drizzle-orm";
import {
  ListCompaniesQueryParams,
  CreateCompanyBody,
  GetCompanyParams,
  UpdateCompanyParams,
  UpdateCompanyBody,
  DeleteCompanyParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/companies", async (req, res) => {
  const query = ListCompaniesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }
  const { search } = query.data;

  const rows = await db
    .select({
      id: companiesTable.id,
      name: companiesTable.name,
      website: companiesTable.website,
      industry: companiesTable.industry,
      size: companiesTable.size,
      notes: companiesTable.notes,
      createdAt: companiesTable.createdAt,
      contactCount: sql<number>`cast(count(${contactsTable.id}) as int)`,
    })
    .from(companiesTable)
    .leftJoin(contactsTable, eq(contactsTable.companyId, companiesTable.id))
    .groupBy(companiesTable.id)
    .where(search ? ilike(companiesTable.name, `%${search}%`) : undefined)
    .orderBy(sql`${companiesTable.createdAt} desc`);

  res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/companies", async (req, res) => {
  const body = CreateCompanyBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const [company] = await db
    .insert(companiesTable)
    .values(body.data)
    .returning();

  await db.insert(activityLogTable).values({
    type: "company_created",
    description: `New company added: ${company.name}`,
    entityId: company.id,
    entityName: company.name,
  });

  res.status(201).json({ ...company, contactCount: 0, createdAt: company.createdAt.toISOString() });
});

router.get("/companies/:id", async (req, res) => {
  const params = GetCompanyParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [row] = await db
    .select({
      id: companiesTable.id,
      name: companiesTable.name,
      website: companiesTable.website,
      industry: companiesTable.industry,
      size: companiesTable.size,
      notes: companiesTable.notes,
      createdAt: companiesTable.createdAt,
      contactCount: sql<number>`cast(count(${contactsTable.id}) as int)`,
    })
    .from(companiesTable)
    .leftJoin(contactsTable, eq(contactsTable.companyId, companiesTable.id))
    .groupBy(companiesTable.id)
    .where(eq(companiesTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.patch("/companies/:id", async (req, res) => {
  const params = UpdateCompanyParams.safeParse({ id: Number(req.params.id) });
  const body = UpdateCompanyBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const [updated] = await db
    .update(companiesTable)
    .set({ ...body.data, updatedAt: new Date() })
    .where(eq(companiesTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const [row] = await db
    .select({
      id: companiesTable.id,
      name: companiesTable.name,
      website: companiesTable.website,
      industry: companiesTable.industry,
      size: companiesTable.size,
      notes: companiesTable.notes,
      createdAt: companiesTable.createdAt,
      contactCount: sql<number>`cast(count(${contactsTable.id}) as int)`,
    })
    .from(companiesTable)
    .leftJoin(contactsTable, eq(contactsTable.companyId, companiesTable.id))
    .groupBy(companiesTable.id)
    .where(eq(companiesTable.id, params.data.id));

  res.json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.delete("/companies/:id", async (req, res) => {
  const params = DeleteCompanyParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(companiesTable).where(eq(companiesTable.id, params.data.id));
  res.status(204).send();
});

export default router;
