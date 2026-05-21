import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { contactsTable } from "./contacts";
import { companiesTable } from "./companies";
import { usersTable } from "./users";

export const attachmentsTable = pgTable("attachments", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(), // UUID on disk
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  entityType: text("entity_type").notNull(), // 'contact' or 'company'
  contactId: integer("contact_id").references(() => contactsTable.id, { onDelete: "cascade" }),
  companyId: integer("company_id").references(() => companiesTable.id, { onDelete: "cascade" }),
  uploadedBy: integer("uploaded_by").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAttachmentSchema = createInsertSchema(attachmentsTable).omit({
  id: true,
  createdAt: true
});

export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;
export type Attachment = typeof attachmentsTable.$inferSelect;
