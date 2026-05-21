import { Router } from "express";
import { db } from "@workspace/db";
import { commissionsTable, treatmentProceduresTable, treatmentPlansTable, contactsTable, usersTable } from "@workspace/db";
import { activityLogTable } from "@workspace/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();
router.use(requireAuth);

const commissionWithRelations = {
  id: commissionsTable.id,
  procedureId: commissionsTable.procedureId,
  professionalId: commissionsTable.professionalId,
  professionalName: usersTable.name,
  treatmentPlanId: commissionsTable.treatmentPlanId,
  procedureValue: commissionsTable.procedureValue,
  commissionPercentage: commissionsTable.commissionPercentage,
  commissionAmount: commissionsTable.commissionAmount,
  status: commissionsTable.status,
  paidAt: commissionsTable.paidAt,
  notes: commissionsTable.notes,
  createdAt: commissionsTable.createdAt,
};

router.get("/commissions", async (req, res) => {
  const { status, professionalId, startDate, endDate } = req.query;
  const conditions = [];

  if (status) conditions.push(eq(commissionsTable.status, status as string));
  if (professionalId) conditions.push(eq(commissionsTable.professionalId, Number(professionalId)));
  if (startDate) conditions.push(gte(commissionsTable.createdAt, new Date(startDate as string)));
  if (endDate) conditions.push(lte(commissionsTable.createdAt, new Date(endDate as string)));

  const rows = await db
    .select(commissionWithRelations)
    .from(commissionsTable)
    .leftJoin(usersTable, eq(commissionsTable.professionalId, usersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${commissionsTable.createdAt} desc`);

  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString(), paidAt: r.paidAt?.toISOString() || null })));
});

router.get("/commissions/summary", async (_req, res) => {
  const all = await db.select().from(commissionsTable);

  const totalPending = all.filter(c => c.status === "pending").reduce((s, c) => s + Number(c.commissionAmount), 0);
  const totalPaid = all.filter(c => c.status === "paid").reduce((s, c) => s + Number(c.commissionAmount), 0);
  const pendingCount = all.filter(c => c.status === "pending").length;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthCommissions = all.filter(c => new Date(c.createdAt) >= startOfMonth && c.status === "pending");
  const monthPending = monthCommissions.reduce((s, c) => s + Number(c.commissionAmount), 0);

  res.json({ totalPending, totalPaid, pendingCount, monthPending });
});

router.patch("/commissions/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: { code: "INVALID_ID", message: "Invalid id" } }); return; }

  const { status, notes } = req.body;
  if (status !== "paid") {
    res.status(422).json({ error: { code: "VALIDATION_ERROR", message: "Status must be 'paid'" } });
    return;
  }

  const updateData: Record<string, unknown> = { status: "paid", paidAt: new Date(), updatedAt: new Date() };
  if (notes !== undefined) updateData.notes = notes;

  const [commission] = await db
    .update(commissionsTable)
    .set(updateData)
    .where(eq(commissionsTable.id, id))
    .returning();

  if (!commission) { res.status(404).json({ error: { code: "NOT_FOUND", message: "Commission not found" } }); return; }

  await db.insert(activityLogTable).values({
    type: "commission_paid",
    description: `Commission R$ ${commission.commissionAmount} paid to professional #${commission.professionalId}`,
    entityId: commission.id,
    entityName: `Commission #${commission.id}`,
  });

  logger.info({ commissionId: id, amount: commission.commissionAmount }, "Commission marked as paid");

  res.json({ ...commission, createdAt: commission.createdAt.toISOString(), paidAt: commission.paidAt?.toISOString() || null });
});

export default router;
