import { Router } from "express";
import { db } from "@workspace/db";
import { treatmentPlansTable, treatmentProceduresTable, contactsTable, financialTransactionsTable, procedureProductsTable, productsTable, inventoryMovementsTable } from "@workspace/db";
import { activityLogTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";

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
  if (!id) { res.status(400).json({ error: { code: "INVALID_ID", message: "Invalid id" } }); return; }

  const [plan] = await db
    .select(planWithRelations)
    .from(treatmentPlansTable)
    .leftJoin(contactsTable, eq(treatmentPlansTable.contactId, contactsTable.id))
    .where(eq(treatmentPlansTable.id, id));

  if (!plan) { res.status(404).json({ error: { code: "NOT_FOUND", message: "Not found" } }); return; }

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
  if (!id) { res.status(400).json({ error: { code: "INVALID_ID", message: "Invalid id" } }); return; }

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

  let completedProcedureIds: number[] = [];

  if (procedures) {
    await db.delete(treatmentProceduresTable).where(eq(treatmentProceduresTable.planId, id));
    if (procedures.length > 0) {
      const insertedProcedures = await db.insert(treatmentProceduresTable).values(
        procedures.map((p: { procedureName: string; toothNumber?: number; region?: string; value?: string | number; notes?: string; status?: string }) => ({
          planId: id,
          procedureName: p.procedureName,
          toothNumber: p.toothNumber || null,
          region: p.region || null,
          value: String(p.value || 0),
          status: p.status || "pending",
          notes: p.notes || null,
        }))
      ).returning();

      completedProcedureIds = insertedProcedures
        .filter((p) => p.status === "completed")
        .map((p) => p.id);
    }
  }

  // Auto-deduct stock for completed procedures
  for (const procedureId of completedProcedureIds) {
    await handleProcedureCompletion(procedureId);
  }

  const [plan] = await db
    .select(planWithRelations)
    .from(treatmentPlansTable)
    .leftJoin(contactsTable, eq(treatmentPlansTable.contactId, contactsTable.id))
    .where(eq(treatmentPlansTable.id, id));

  if (!plan) { res.status(404).json({ error: { code: "NOT_FOUND", message: "Not found" } }); return; }

  const proceduresList = await db
    .select()
    .from(treatmentProceduresTable)
    .where(eq(treatmentProceduresTable.planId, id));

  res.json({ ...plan, createdAt: plan.createdAt.toISOString(), procedures: proceduresList });
});

router.delete("/treatment-plans/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: { code: "INVALID_ID", message: "Invalid id" } }); return; }
  await db.delete(treatmentPlansTable).where(eq(treatmentPlansTable.id, id));
  res.status(204).send();
});

// ── Procedure Products ───────────────────────────────────

router.get("/procedure-products/:procedureId", async (req, res) => {
  const procedureId = Number(req.params.procedureId);
  try {
    const items = await db
      .select({
        id: procedureProductsTable.id,
        procedureId: procedureProductsTable.procedureId,
        productId: procedureProductsTable.productId,
        quantity: procedureProductsTable.quantity,
        productName: productsTable.name,
      })
      .from(procedureProductsTable)
      .leftJoin(productsTable, eq(procedureProductsTable.productId, productsTable.id))
      .where(eq(procedureProductsTable.procedureId, procedureId));
    return res.json(items);
  } catch (error) {
    logger.error({ error }, "Error listing procedure products");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/procedure-products", async (req, res) => {
  const { procedureId, productId, quantity } = req.body;
  if (!procedureId || !productId) {
    return res.status(400).json({ error: "procedureId e productId são obrigatórios" });
  }
  try {
    const [item] = await db
      .insert(procedureProductsTable)
      .values({ procedureId: Number(procedureId), productId: Number(productId), quantity: Number(quantity) || 1 })
      .returning();
    logger.info({ procedureId, productId }, "Product linked to procedure");
    return res.json(item);
  } catch (error) {
    logger.error({ error }, "Error linking product to procedure");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/procedure-products/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const [deleted] = await db.delete(procedureProductsTable).where(eq(procedureProductsTable.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: "Vínculo não encontrado" });
    return res.status(204).end();
  } catch (error) {
    logger.error({ error }, "Error deleting procedure product link");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Auto-deduct stock when procedure is completed
async function handleProcedureCompletion(procedureId: number) {
  const products = await db
    .select({
      productId: procedureProductsTable.productId,
      quantity: procedureProductsTable.quantity,
    })
    .from(procedureProductsTable)
    .where(eq(procedureProductsTable.procedureId, procedureId));

  for (const item of products) {
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, item.productId));
    if (!product) continue;

    const newQty = product.quantity - item.quantity;
    if (newQty < 0) {
      logger.warn({ productId: item.productId, productName: product.name }, "Estoque insuficiente para procedimento");
      continue;
    }

    await db.update(productsTable).set({ quantity: newQty, updatedAt: new Date() }).where(eq(productsTable.id, item.productId));
    await db.insert(inventoryMovementsTable).values({
      productId: item.productId,
      type: "out",
      quantity: -item.quantity,
      reason: "procedimento",
      procedureId,
    });
    logger.info({ productId: item.productId, quantity: item.quantity }, "Stock deducted for procedure");
  }
}

export default router;
