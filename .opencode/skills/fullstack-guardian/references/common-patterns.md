# Common Patterns

## CRUD Implementation

### Create
```typescript
// Frontend
const create = async (data: CreateDto) => {
  const res = await fetch('/api/resource', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw await res.json();
  return res.json();
};

// Backend
router.post("/resource", requireAuth, async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten().fieldErrors } });
    return;
  }
  const [item] = await db.insert(table).values(parsed.data).returning();
  res.status(201).json(item);
});
```

### Read (List)
```typescript
// Backend with filters
router.get("/resource", requireAuth, async (req, res) => {
  const conditions = [];
  if (req.query.search) conditions.push(ilike(table.name, `%${req.query.search}%`));
  const rows = await db.select().from(table).where(conditions.length > 0 ? and(...conditions) : undefined);
  res.json(rows);
});
```

### Update
```typescript
router.patch("/resource/:id", requireAuth, async (req, res) => {
  const [item] = await db.update(table).set(req.body).where(eq(table.id, Number(req.params.id))).returning();
  if (!item) { res.status(404).json({ error: { code: "NOT_FOUND", message: "Not found" } }); return; }
  res.json(item);
});
```

### Delete
```typescript
router.delete("/resource/:id", requireAuth, async (req, res) => {
  const [item] = await db.delete(table).where(eq(table.id, Number(req.params.id))).returning();
  if (!item) { res.status(404).json({ error: { code: "NOT_FOUND", message: "Not found" } }); return; }
  res.status(204).end();
});
```
