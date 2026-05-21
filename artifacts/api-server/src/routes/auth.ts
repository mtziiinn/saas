import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable, registerSchema, loginSchema, activityLogTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { signAccessToken, signRefreshToken, verifyToken } from "../lib/jwt";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.post("/auth/register", async (req, res) => {
  const body = registerSchema.safeParse(req.body);
  if (!body.success) {
    res.status(422).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid input",
        details: body.error.flatten().fieldErrors,
      },
    });
    return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, body.data.email)).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: { code: "EMAIL_TAKEN", message: "Email already in use" } });
    return;
  }

  const hashed = await bcrypt.hash(body.data.password, 12);
  const [user] = await db
    .insert(usersTable)
    .values({ name: body.data.name, email: body.data.email, password: hashed })
    .returning();

  const payload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax",
    path: "/api/auth",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(201).json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    accessToken,
  });
});

router.post("/auth/login", async (req, res) => {
  const body = loginSchema.safeParse(req.body);
  if (!body.success) {
    res.status(422).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid input",
        details: body.error.flatten().fieldErrors,
      },
    });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, body.data.email)).limit(1);
  if (!user) {
    res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } });
    return;
  }

  const valid = await bcrypt.compare(body.data.password, user.password);
  if (!valid) {
    res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } });
    return;
  }

  const payload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax",
    path: "/api/auth",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    accessToken,
  });
});

router.post("/auth/refresh", async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    res.status(401).json({ error: { code: "NO_REFRESH_TOKEN", message: "Refresh token missing" } });
    return;
  }

  try {
    const payload = verifyToken(token);
    const newPayload = { userId: payload.userId, email: payload.email, role: payload.role };
    const accessToken = signAccessToken(newPayload);
    const refreshToken = signRefreshToken(newPayload);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "lax",
      path: "/api/auth",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken });
  } catch {
    res.status(401).json({ error: { code: "INVALID_REFRESH_TOKEN", message: "Refresh token invalid or expired" } });
  }
});

router.post("/auth/logout", (_req, res) => {
  res.clearCookie("refreshToken", { path: "/api/auth" });
  res.json({ message: "Logged out" });
});

router.get("/auth/me", requireAuth, async (req, res) => {
  const [user] = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, req.user!.userId))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: { code: "USER_NOT_FOUND", message: "User not found" } });
    return;
  }

  res.json({ user });
});

router.put("/auth/profile", requireAuth, async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(422).json({ error: { code: "VALIDATION_ERROR", message: "Name is required" } });
    return;
  }

  const [user] = await db
    .update(usersTable)
    .set({ name: name.trim(), updatedAt: new Date() })
    .where(eq(usersTable.id, req.user!.userId))
    .returning({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role });

  if (!user) {
    res.status(404).json({ error: { code: "USER_NOT_FOUND", message: "User not found" } });
    return;
  }

  res.json({ user });
});

router.get("/users", requireAuth, async (_req, res) => {
  const users = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role, commissionPercentage: usersTable.commissionPercentage })
    .from(usersTable)
    .orderBy(usersTable.name);
  res.json(users);
});

router.post("/users", requireAuth, async (req, res) => {
  const { name, email, password, role, commissionPercentage } = req.body;

  if (!name || !email || !password) {
    res.status(422).json({ error: { code: "VALIDATION_ERROR", message: "name, email, and password are required" } });
    return;
  }

  if (password.length < 8) {
    res.status(422).json({ error: { code: "VALIDATION_ERROR", message: "Password must be at least 8 characters" } });
    return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: { code: "EMAIL_TAKEN", message: "Email already in use" } });
    return;
  }

  const hashed = await bcrypt.hash(password, 12);
  const [user] = await db
    .insert(usersTable)
    .values({
      name,
      email,
      password: hashed,
      role: role || "user",
      commissionPercentage: commissionPercentage !== undefined ? String(commissionPercentage) : "0",
    })
    .returning({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role, commissionPercentage: usersTable.commissionPercentage });

  await db.insert(activityLogTable).values({
    type: "user_created",
    description: `User created: ${user.name} (${user.email})`,
    entityId: user.id,
    entityName: user.name,
  });

  res.status(201).json({ user });
});

router.patch("/users/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: { code: "INVALID_ID", message: "Invalid id" } }); return; }

  const { name, email, role, commissionPercentage, password } = req.body;
  const updateData: Record<string, unknown> = {};
  let logMessage = "";

  if (name !== undefined) { updateData.name = name; logMessage += `name: ${name}, `; }
  if (email !== undefined) {
    const existing = await db.select().from(usersTable).where(and(eq(usersTable.email, email), sql`id != ${id}`)).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: { code: "EMAIL_TAKEN", message: "Email already in use" } });
      return;
    }
    updateData.email = email;
    logMessage += `email: ${email}, `;
  }
  if (role !== undefined) { updateData.role = role; logMessage += `role: ${role}, `; }
  if (commissionPercentage !== undefined) {
    const pct = Number(commissionPercentage);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      res.status(422).json({ error: { code: "VALIDATION_ERROR", message: "commissionPercentage must be between 0 and 100" } });
      return;
    }
    updateData.commissionPercentage = String(pct);
    logMessage += `commission: ${pct}%, `;
  }
  if (password !== undefined) {
    if (password.length < 8) {
      res.status(422).json({ error: { code: "VALIDATION_ERROR", message: "Password must be at least 8 characters" } });
      return;
    }
    updateData.password = await bcrypt.hash(password, 12);
    logMessage += "password changed, ";
  }

  if (Object.keys(updateData).length === 0) {
    res.status(422).json({ error: { code: "VALIDATION_ERROR", message: "No fields to update" } });
    return;
  }

  updateData.updatedAt = new Date();

  const [user] = await db
    .update(usersTable)
    .set(updateData)
    .where(eq(usersTable.id, id))
    .returning({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role, commissionPercentage: usersTable.commissionPercentage });

  if (!user) { res.status(404).json({ error: { code: "NOT_FOUND", message: "User not found" } }); return; }

  await db.insert(activityLogTable).values({
    type: "user_updated",
    description: `User updated: ${user.name} — ${logMessage}`,
    entityId: user.id,
    entityName: user.name,
  });

  res.json({ user });
});

router.put("/auth/password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(422).json({ error: { code: "VALIDATION_ERROR", message: "Current password and new password are required" } });
    return;
  }

  if (newPassword.length < 8) {
    res.status(422).json({ error: { code: "VALIDATION_ERROR", message: "New password must be at least 8 characters" } });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: { code: "USER_NOT_FOUND", message: "User not found" } });
    return;
  }

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    res.status(401).json({ error: { code: "INVALID_PASSWORD", message: "Current password is incorrect" } });
    return;
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await db.update(usersTable).set({ password: hashed, updatedAt: new Date() }).where(eq(usersTable.id, user.id));

  res.json({ message: "Password updated" });
});

export default router;
