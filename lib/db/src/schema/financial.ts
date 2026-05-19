import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { contactsTable } from "./contacts";
import { treatmentPlansTable } from "./treatment-plans";

export const financialTransactionsTable = pgTable("financial_transactions", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  type: text("type").notNull().default("income"),
  category: text("category").notNull().default("other"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull().default("0"),
  date: timestamp("date").notNull().defaultNow(),
  status: text("status").notNull().default("pending"),
  paymentMethod: text("payment_method"),
  contactId: integer("contact_id").references(() => contactsTable.id, { onDelete: "set null" }),
  treatmentPlanId: integer("treatment_plan_id").references(() => treatmentPlansTable.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertFinancialTransactionSchema = createInsertSchema(financialTransactionsTable).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertFinancialTransaction = z.infer<typeof insertFinancialTransactionSchema>;
export type FinancialTransaction = typeof financialTransactionsTable.$inferSelect;
