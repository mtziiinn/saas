import { Router } from "express";
import { db } from "@workspace/db";
import { contactsTable, tasksTable, treatmentPlansTable, treatmentProceduresTable, financialTransactionsTable, prescriptionsTable } from "@workspace/db";
import { eq, sql, inArray } from "drizzle-orm";
import rateLimit from "express-rate-limit";

const router = Router();

const portalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: { code: "RATE_LIMITED", message: "Muitas requisições. Tente novamente em 15 minutos." } },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get("/patient-portal/:token", portalLimiter, async (req, res) => {
  const token = req.params.token as string;
  if (!token || token.length < 10) {
    res.status(400).json({ error: { code: "INVALID_TOKEN", message: "Invalid token" } });
    return;
  }

  const [contact] = await db
    .select({
      id: contactsTable.id,
      name: contactsTable.name,
      email: contactsTable.email,
      phone: contactsTable.phone,
      status: contactsTable.status,
    })
    .from(contactsTable)
    .where(eq(contactsTable.patientToken, token));

  if (!contact) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Paciente não encontrado" } });
    return;
  }

  const tasks = await db
    .select({
      id: tasksTable.id,
      title: tasksTable.title,
      status: tasksTable.status,
      priority: tasksTable.priority,
      dueDate: tasksTable.dueDate,
      createdAt: tasksTable.createdAt,
    })
    .from(tasksTable)
    .where(eq(tasksTable.contactId, contact.id))
    .orderBy(sql`${tasksTable.dueDate} asc`);

  const plans = await db
    .select({
      id: treatmentPlansTable.id,
      title: treatmentPlansTable.title,
      status: treatmentPlansTable.status,
      totalValue: treatmentPlansTable.totalValue,
      createdAt: treatmentPlansTable.createdAt,
    })
    .from(treatmentPlansTable)
    .where(eq(treatmentPlansTable.contactId, contact.id))
    .orderBy(sql`${treatmentPlansTable.createdAt} desc`);

  const planIds = plans.map(p => p.id);
  const procedures = planIds.length > 0
    ? await db
        .select()
        .from(treatmentProceduresTable)
        .where(inArray(treatmentProceduresTable.planId, planIds))
        .orderBy(treatmentProceduresTable.createdAt)
    : [];

  const transactions = await db
    .select()
    .from(financialTransactionsTable)
    .where(eq(financialTransactionsTable.contactId, contact.id))
    .orderBy(sql`${financialTransactionsTable.date} desc`);

  const prescriptions = await db
    .select()
    .from(prescriptionsTable)
    .where(eq(prescriptionsTable.contactId, contact.id))
    .orderBy(sql`${prescriptionsTable.createdAt} desc`);

  const totalIncome = transactions.filter(t => t.type === "income" && t.status === "paid").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type === "expense" && t.status === "paid").reduce((s, t) => s + Number(t.amount), 0);
  const pendingIncome = transactions.filter(t => t.type === "income" && t.status === "pending").reduce((s, t) => s + Number(t.amount), 0);

  res.json({
    patient: contact,
    appointments: tasks.map(t => ({ ...t, dueDate: t.dueDate ? new Date(t.dueDate).toISOString() : null, createdAt: t.createdAt.toISOString() })),
    treatmentPlans: plans.map(p => ({ ...p, createdAt: p.createdAt.toISOString(), procedures: procedures.filter(pr => pr.planId === p.id) })),
    finances: {
      totalIncome,
      totalExpense,
      pendingIncome,
      balance: totalIncome - totalExpense,
    },
    prescriptions: prescriptions.map(p => ({ ...p, createdAt: p.createdAt.toISOString() })),
  });
});

export default router;
