import { Router } from "express";
import { db } from "@workspace/db";
import { treatmentPlansTable, treatmentProceduresTable, contactsTable, financialTransactionsTable } from "@workspace/db";
import { activityLogTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

const planWithRelations = {
  id: treatmentPlansTable.id,
  title: treatmentPlansTable.title,
  description: treatmentPlansTable.description,
  status: treatmentPlansTable.status,
  totalValue: treatmentPlansTable.totalValue,
  contactId: treatmentPlansTable.contactId,
  contactName: contactsTable.name,
  createdAt: treatmentPlansTable.createdAt,
};

router.get("/treatment-plans", async (_req, res) => {
  const rows = await db
    .select(planWithRelations)
    .from(treatmentPlansTable)
    .leftJoin(contactsTable, eq(treatmentPlansTable.contactId, contactsTable.id))
    .orderBy(sql`${treatmentPlansTable.createdAt} desc`);

  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.get("/treatment-plans/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }

  const [plan] = await db
    .select(planWithRelations)
    .from(treatmentPlansTable)
    .leftJoin(contactsTable, eq(treatmentPlansTable.contactId, contactsTable.id))
    .where(eq(treatmentPlansTable.id, id));

  if (!plan) { res.status(404).json({ error: "Not found" }); return; }

  const procedures = await db
    .select()
    .from(treatmentProceduresTable)
    .where(eq(treatmentProceduresTable.planId, id))
    .orderBy(treatmentProceduresTable.createdAt);

  res.json({ ...plan, createdAt: plan.createdAt.toISOString(), procedures });
});

router.post("/treatment-plans", async (req, res) => {
  const { title, description, contactId, procedures } = req.body;
  if (!title || !contactId) {
    res.status(422).json({ error: { code: "VALIDATION_ERROR", message: "Title and contactId are required" } });
    return;
  }

  const totalValue = procedures?.reduce((sum: number, p: { value?: string | number }) => sum + Number(p.value || 0), 0) || 0;

  const [plan] = await db
    .insert(treatmentPlansTable)
    .values({ title, description: description || null, contactId, totalValue: String(totalValue) })
    .returning();

  if (procedures?.length) {
    await db.insert(treatmentProceduresTable).values(
      procedures.map((p: { procedureName: string; toothNumber?: number; region?: string; value?: string | number; notes?: string }) => ({
        planId: plan.id,
        procedureName: p.procedureName,
        toothNumber: p.toothNumber || null,
        region: p.region || null,
        value: String(p.value || 0),
        notes: p.notes || null,
      }))
    );
  }

  await db.insert(activityLogTable).values({
    type: "treatment_plan_created",
    description: `Treatment plan created: ${plan.title}`,
    entityId: plan.id,
    entityName: plan.title,
  });

  if (Number(totalValue) > 0) {
    await db.insert(financialTransactionsTable).values({
      description: `Plano: ${plan.title}`,
      type: "income",
      category: "procedimento",
      amount: String(totalValue),
      date: new Date(),
      status: "pending",
      contactId,
      treatmentPlanId: plan.id,
    });
  }

  const proceduresList = await db
    .select()
    .from(treatmentProceduresTable)
    .where(eq(treatmentProceduresTable.planId, plan.id));

  res.status(201).json({ ...plan, createdAt: plan.createdAt.toISOString(), procedures: proceduresList });
});

router.patch("/treatment-plans/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }

  const { title, description, status, procedures } = req.body;

  const updateData: Record<string, unknown> = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (status !== undefined) updateData.status = status;

  if (procedures) {
    const totalValue = procedures.reduce((sum: number, p: { value?: string | number }) => sum + Number(p.value || 0), 0);
    updateData.totalValue = String(totalValue);
  }

  if (Object.keys(updateData).length > 0) {
    updateData.updatedAt = new Date();
    await db.update(treatmentPlansTable).set(updateData).where(eq(treatmentPlansTable.id, id));
  }

  if (procedures) {
    await db.delete(treatmentProceduresTable).where(eq(treatmentProceduresTable.planId, id));
    if (procedures.length > 0) {
      await db.insert(treatmentProceduresTable).values(
        procedures.map((p: { procedureName: string; toothNumber?: number; region?: string; value?: string | number; notes?: string; status?: string }) => ({
          planId: id,
          procedureName: p.procedureName,
          toothNumber: p.toothNumber || null,
          region: p.region || null,
          value: String(p.value || 0),
          status: p.status || "pending",
          notes: p.notes || null,
        }))
      );
    }
  }

  const [plan] = await db
    .select(planWithRelations)
    .from(treatmentPlansTable)
    .leftJoin(contactsTable, eq(treatmentPlansTable.contactId, contactsTable.id))
    .where(eq(treatmentPlansTable.id, id));

  if (!plan) { res.status(404).json({ error: "Not found" }); return; }

  const proceduresList = await db
    .select()
    .from(treatmentProceduresTable)
    .where(eq(treatmentProceduresTable.planId, id));

  res.json({ ...plan, createdAt: plan.createdAt.toISOString(), procedures: proceduresList });
});

router.delete("/treatment-plans/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(treatmentPlansTable).where(eq(treatmentPlansTable.id, id));
  res.status(204).send();
});

export default router;
