import { pgTable, serial, integer, numeric, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { treatmentProceduresTable } from "./treatment-plans";
import { treatmentPlansTable } from "./treatment-plans";

export const commissionsTable = pgTable("commissions", {
  id: serial("id").primaryKey(),
  procedureId: integer("procedure_id").notNull().references(() => treatmentProceduresTable.id, { onDelete: "cascade" }),
  professionalId: integer("professional_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  treatmentPlanId: integer("treatment_plan_id").notNull().references(() => treatmentPlansTable.id, { onDelete: "cascade" }),
  procedureValue: numeric("procedure_value", { precision: 10, scale: 2 }).notNull(),
  commissionPercentage: numeric("commission_percentage", { precision: 5, scale: 2 }).notNull(),
  commissionAmount: numeric("commission_amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCommissionSchema = createInsertSchema(commissionsTable).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertCommission = z.infer<typeof insertCommissionSchema>;
export type Commission = typeof commissionsTable.$inferSelect;
