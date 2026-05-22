import { Router } from "express";
import { db } from "@workspace/db";
import {
  productCategoriesTable,
  productsTable,
  inventoryMovementsTable,
} from "@workspace/db/schema";
import { eq, sql, and, lte, or, like } from "drizzle-orm";
import { logger } from "../lib/logger";
import { requireAuth } from "../middlewares/auth";

const router = Router();
router.use(requireAuth);

// ── Categories ────────────────────────────────────────────

router.get("/inventory/categories", async (_req, res) => {
  try {
    const categories = await db.select().from(productCategoriesTable).orderBy(productCategoriesTable.name);
    return res.json(categories);
  } catch (error) {
    logger.error({ error }, "Error listing categories");
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } });
  }
});

router.post("/inventory/categories", async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Nome da categoria é obrigatório" } });
  }
  try {
    const [category] = await db.insert(productCategoriesTable).values({ name: name.trim() }).returning();
    logger.info({ categoryId: category.id }, "Category created");
    return res.status(201).json(category);
  } catch (error: any) {
    if (error?.code === "23505") {
      return res.status(409).json({ error: { code: "CONFLICT", message: "Categoria já existe" } });
    }
    logger.error({ error }, "Error creating category");
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } });
  }
});

router.put("/inventory/categories/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Nome da categoria é obrigatório" } });
  }
  try {
    const [updated] = await db
      .update(productCategoriesTable)
      .set({ name: name.trim() })
      .where(eq(productCategoriesTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Categoria não encontrada" } });
    return res.json(updated);
  } catch (error) {
    logger.error({ error }, "Error updating category");
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } });
  }
});

router.delete("/inventory/categories/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const [deleted] = await db.delete(productCategoriesTable).where(eq(productCategoriesTable.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Categoria não encontrada" } });
    logger.info({ categoryId: id }, "Category deleted");
    return res.status(204).end();
  } catch (error) {
    logger.error({ error }, "Error deleting category");
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } });
  }
});

// ── Products ──────────────────────────────────────────────

router.get("/inventory/products", async (req, res) => {
  const { categoryId, search, lowStock } = req.query;
  try {
    const conditions = [];
    if (categoryId) {
      conditions.push(eq(productsTable.categoryId, Number(categoryId)));
    }
    if (search && typeof search === "string") {
      conditions.push(like(sql`lower(${productsTable.name})`, `%${search.toLowerCase()}%`));
    }
    const query = db.select().from(productsTable).where(and(...conditions)).orderBy(productsTable.name);

    let products = await query;

    if (lowStock === "true") {
      products = products.filter((p) => p.quantity <= p.minStock);
    }

    return res.json(products);
  } catch (error) {
    logger.error({ error }, "Error listing products");
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } });
  }
});

router.post("/inventory/products", async (req, res) => {
  const { name, categoryId, quantity, minStock, costPrice, salePrice } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Nome do produto é obrigatório" } });
  }
  try {
    const [product] = await db
      .insert(productsTable)
      .values({
        name: name.trim(),
        categoryId: categoryId ? Number(categoryId) : null,
        quantity: Number(quantity) || 0,
        minStock: Number(minStock) || 0,
        costPrice: String(costPrice || "0"),
        salePrice: String(salePrice || "0"),
      })
      .returning();
    logger.info({ productId: product.id }, "Product created");
    return res.status(201).json(product);
  } catch (error) {
    logger.error({ error }, "Error creating product");
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } });
  }
});

router.put("/inventory/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, categoryId, quantity, minStock, costPrice, salePrice } = req.body;
  try {
    const [updated] = await db
      .update(productsTable)
      .set({
        ...(name ? { name: name.trim() } : {}),
        ...(categoryId !== undefined ? { categoryId: categoryId ? Number(categoryId) : null } : {}),
        ...(quantity !== undefined ? { quantity: Number(quantity) } : {}),
        ...(minStock !== undefined ? { minStock: Number(minStock) } : {}),
        ...(costPrice !== undefined ? { costPrice: String(costPrice) } : {}),
        ...(salePrice !== undefined ? { salePrice: String(salePrice) } : {}),
        updatedAt: new Date(),
      })
      .where(eq(productsTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Produto não encontrado" } });
    return res.json(updated);
  } catch (error) {
    logger.error({ error }, "Error updating product");
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } });
  }
});

router.delete("/inventory/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const [deleted] = await db.delete(productsTable).where(eq(productsTable.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Produto não encontrado" } });
    logger.info({ productId: id }, "Product deleted");
    return res.status(204).end();
  } catch (error) {
    logger.error({ error }, "Error deleting product");
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } });
  }
});

// ── Movements ─────────────────────────────────────────────

router.get("/inventory/movements", async (req, res) => {
  const { productId } = req.query;
  try {
    const conditions = [];
    if (productId) {
      conditions.push(eq(inventoryMovementsTable.productId, Number(productId)));
    }
    const movements = await db
      .select()
      .from(inventoryMovementsTable)
      .where(and(...conditions))
      .orderBy(sql`${inventoryMovementsTable.createdAt} desc`);
    return res.json(movements);
  } catch (error) {
    logger.error({ error }, "Error listing movements");
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } });
  }
});

router.post("/inventory/movements", async (req, res) => {
  const { productId, type, quantity, reason } = req.body;
  if (!productId || !type || !quantity) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "productId, type e quantity são obrigatórios" } });
  }
  if (!["in", "out", "adjustment"].includes(type)) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Tipo inválido. Use: in, out ou adjustment" } });
  }
  const qty = type === "in" ? Math.abs(Number(quantity)) : -Math.abs(Number(quantity));
  try {
    const product = await db.select().from(productsTable).where(eq(productsTable.id, Number(productId))).limit(1);
    if (!product[0]) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Produto não encontrado" } });

    const newQty = product[0].quantity + qty;
    if (newQty < 0) {
      return res.status(400).json({ error: { code: "INSUFFICIENT_STOCK", message: "Estoque insuficiente para esta saída" } });
    }

    const [movement] = await db
      .insert(inventoryMovementsTable)
      .values({ productId: Number(productId), type, quantity: qty, reason })
      .returning();

    await db.update(productsTable).set({ quantity: newQty, updatedAt: new Date() }).where(eq(productsTable.id, Number(productId)));

    logger.info({ productId, type, qty }, "Inventory movement recorded");
    return res.status(201).json(movement);
  } catch (error) {
    logger.error({ error }, "Error recording movement");
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } });
  }
});

// ── Low Stock ─────────────────────────────────────────────

router.get("/inventory/low-stock", async (_req, res) => {
  try {
    const products = await db
      .select()
      .from(productsTable)
      .where(lte(productsTable.quantity, productsTable.minStock))
      .orderBy(sql`${productsTable.quantity} - ${productsTable.minStock} ASC`);
    return res.json(products);
  } catch (error) {
    logger.error({ error }, "Error listing low stock products");
    return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" } });
  }
});

export default router;
