import { Router } from "express";
import { db } from "@workspace/db";
import { contactsTable, tasksTable, treatmentPlansTable, treatmentProceduresTable, financialTransactionsTable } from "@workspace/db";
import { eq, sql, inArray } from "drizzle-orm";

const router = Router();

router.get("/patient-portal/:token", async (req, res) => {
  const { token } = req.params;
  if (!token || token.length < 10) {
    res.status(400).json({ error: "Invalid token" });
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
    res.status(404).json({ error: "Paciente não encontrado" });
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
  });
});

export default router;
