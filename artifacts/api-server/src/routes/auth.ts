import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable, registerSchema, loginSchema } from "@workspace/db";
import { eq } from "drizzle-orm";
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

export default router;
