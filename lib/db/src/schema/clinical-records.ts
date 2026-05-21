import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { contactsTable } from "./contacts";
import { usersTable } from "./users";

export const clinicalNotesTable = pgTable("clinical_notes", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull().references(() => contactsTable.id, { onDelete: "cascade" }),
  authorId: integer("author_id").references(() => usersTable.id, { onDelete: "set null" }),
  type: text("type").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertClinicalNoteSchema = createInsertSchema(clinicalNotesTable).omit({
  id: true,
  createdAt: true,
});

export type InsertClinicalNote = typeof clinicalNotesTable.$inferInsert;
export type ClinicalNote = typeof clinicalNotesTable.$inferSelect;

export const prescriptionsTable = pgTable("prescriptions", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id").notNull().references(() => contactsTable.id, { onDelete: "cascade" }),
  authorId: integer("author_id").references(() => usersTable.id, { onDelete: "set null" }),
  medication: text("medication").notNull(),
  dosage: text("dosage").notNull(),
  duration: text("duration").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPrescriptionSchema = createInsertSchema(prescriptionsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertPrescription = typeof prescriptionsTable.$inferInsert;
export type Prescription = typeof prescriptionsTable.$inferSelect;
