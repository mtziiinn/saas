import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { treatmentProceduresTable } from "./treatment-plans";

export const productCategoriesTable = pgTable("product_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  categoryId: integer("category_id").references(() => productCategoriesTable.id, { onDelete: "set null" }),
  quantity: integer("quantity").notNull().default(0),
  minStock: integer("min_stock").notNull().default(0),
  costPrice: numeric("cost_price", { precision: 10, scale: 2 }).notNull().default("0"),
  salePrice: numeric("sale_price", { precision: 10, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const inventoryMovementsTable = pgTable("inventory_movements", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("in"),
  quantity: integer("quantity").notNull(),
  reason: text("reason"),
  procedureId: integer("procedure_id").references(() => treatmentProceduresTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const procedureProductsTable = pgTable("procedure_products", {
  id: serial("id").primaryKey(),
  procedureId: integer("procedure_id").notNull().references(() => treatmentProceduresTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull().default(1),
});

export const insertProductCategorySchema = createInsertSchema(productCategoriesTable).omit({ id: true, createdAt: true });

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true, updatedAt: true });

export const insertInventoryMovementSchema = createInsertSchema(inventoryMovementsTable).omit({ id: true, createdAt: true });

export const insertProcedureProductSchema = createInsertSchema(procedureProductsTable).omit({ id: true });

export type InsertProductCategory = typeof productCategoriesTable.$inferInsert;
export type ProductCategory = typeof productCategoriesTable.$inferSelect;
export type InsertProduct = typeof productsTable.$inferInsert;
export type Product = typeof productsTable.$inferSelect;
export type InsertInventoryMovement = typeof inventoryMovementsTable.$inferInsert;
export type InventoryMovement = typeof inventoryMovementsTable.$inferSelect;
export type InsertProcedureProduct = typeof procedureProductsTable.$inferInsert;
export type ProcedureProduct = typeof procedureProductsTable.$inferSelect;
