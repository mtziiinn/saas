import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { contactsTable } from "./contacts";
import { usersTable } from "./users";

export const treatmentPlansTable = pgTable("treatment_plans", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("draft"),
  totalValue: numeric("total_value", { precision: 10, scale: 2 }).notNull().default("0"),
  contactId: integer("contact_id").notNull().references(() => contactsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const treatmentProceduresTable = pgTable("treatment_procedures", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull().references(() => treatmentPlansTable.id, { onDelete: "cascade" }),
  procedureName: text("procedure_name").notNull(),
  toothNumber: integer("tooth_number"),
  region: text("region"),
  value: numeric("value", { precision: 10, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("pending"),
  professionalId: integer("professional_id").references(() => usersTable.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTreatmentPlanSchema = createInsertSchema(treatmentPlansTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTreatmentProcedureSchema = createInsertSchema(treatmentProceduresTable).omit({ id: true, createdAt: true });

export type InsertTreatmentPlan = z.infer<typeof insertTreatmentPlanSchema>;
export type TreatmentPlan = typeof treatmentPlansTable.$inferSelect;
export type InsertTreatmentProcedure = z.infer<typeof insertTreatmentProcedureSchema>;
export type TreatmentProcedure = typeof treatmentProceduresTable.$inferSelect;
