import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config.js";
import { UserModel } from "../models/user.js";

type TokenPayload = { sub: string; email: string };

const authRouter = Router();

const signupSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "7d" });
}

function setAuthCookie(res: Response, token: string): void {
  res.cookie("newslytic_token", token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

function readToken(req: Request): string | null {
  return req.cookies?.newslytic_token ?? null;
}

authRouter.post("/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid signup payload" });

  const { email, password, firstName, lastName } = parsed.data;
  const existing = await UserModel.findOne({ email }).lean();
  if (existing) return res.status(409).json({ error: "Email already registered" });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await UserModel.create({ email, passwordHash, firstName, lastName });
  const token = signToken({ sub: String(user._id), email: user.email });
  setAuthCookie(res, token);

  return res.status(201).json({
    user: { id: String(user._id), email: user.email, firstName: user.firstName, lastName: user.lastName }
  });
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid login payload" });

  const { email, password } = parsed.data;
  const user = await UserModel.findOne({ email });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = signToken({ sub: String(user._id), email: user.email });
  setAuthCookie(res, token);

  return res.json({
    user: { id: String(user._id), email: user.email, firstName: user.firstName, lastName: user.lastName }
  });
});

authRouter.get("/me", async (req, res) => {
  const token = readToken(req);
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    const user = await UserModel.findById(payload.sub).lean();
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    return res.json({
      user: { id: String(user._id), email: user.email, firstName: user.firstName, lastName: user.lastName }
    });
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie("newslytic_token");
  return res.json({ ok: true });
});

export { authRouter };
