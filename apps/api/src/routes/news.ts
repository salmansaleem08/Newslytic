import { Router } from "express";
import type { Request } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config.js";
import { NEWS_CATEGORIES, type NewsCategory, NewsItemModel } from "../models/news-item.js";
import { NewsThoughtModel } from "../models/news-thought.js";
import { UserModel } from "../models/user.js";
import { runNewsSync } from "../services/news-sync.js";

export const newsRouter = Router();

function getDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

newsRouter.get("/feed", async (req, res) => {
  const requestedCategory = String(req.query.category ?? "all");
  const category =
    requestedCategory === "all" ? "all" : (NEWS_CATEGORIES.find((value) => value === requestedCategory) as NewsCategory | undefined);
  if (!category) return res.status(400).json({ error: "Invalid category" });

  const limit = Math.min(15, Math.max(1, Number(req.query.limit ?? 15)));
  const force = String(req.query.refresh ?? "0") === "1";

  try {
    await runNewsSync({ force, categories: category === "all" ? undefined : [category] });
  } catch (error) {
    console.error("Feed sync failed:", error);
  }

  const dayKey = new Date().toISOString().slice(0, 10);
  const query = category === "all" ? { dayKey } : { dayKey, category };
  const items = await NewsItemModel.find(query).sort({ publishedAt: -1, relevanceScore: -1 }).limit(limit).lean();
  res.json({ dayKey, items, categories: NEWS_CATEGORIES });
});

newsRouter.get("/today", async (_req, res) => {
  const dayKey = getDayKey();
  const items = await NewsItemModel.find({ dayKey }).sort({ publishedAt: -1, relevanceScore: -1 }).limit(15).lean();
  res.json({ dayKey, items, categories: NEWS_CATEGORIES });
});

newsRouter.get("/missed", async (req, res) => {
  const since = req.query.since ? new Date(String(req.query.since)) : null;
  if (!since || Number.isNaN(since.getTime())) {
    return res.status(400).json({ error: "Invalid 'since' timestamp" });
  }

  const items = await NewsItemModel.find({ publishedAt: { $gt: since } })
    .sort({ publishedAt: -1 })
    .limit(20)
    .lean();

  return res.json({ items });
});

newsRouter.get("/:newsId", async (req, res) => {
  const item = await NewsItemModel.findById(req.params.newsId).lean();
  if (!item) return res.status(404).json({ error: "News item not found" });
  return res.json({ item });
});

newsRouter.get("/:newsId/thoughts", async (req, res) => {
  const thoughts = await NewsThoughtModel.find({ newsItemId: req.params.newsId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  return res.json({ thoughts });
});

const createThoughtSchema = z.object({
  content: z.string().min(1).max(400)
});

function readToken(req: Request): string | null {
  return req.cookies?.newslytic_token ?? null;
}

newsRouter.post("/:newsId/thoughts", async (req, res) => {
  const parsed = createThoughtSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid thought payload" });

  const token = readToken(req);
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  let userId = "";
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string };
    userId = payload.sub;
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const user = await UserModel.findById(userId).lean();
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const newsExists = await NewsItemModel.exists({ _id: req.params.newsId });
  if (!newsExists) return res.status(404).json({ error: "News item not found" });

  const thought = await NewsThoughtModel.create({
    newsItemId: req.params.newsId,
    authorName: `${user.firstName} ${user.lastName}`.trim(),
    authorAvatar: user.avatarUrl ?? "",
    content: parsed.data.content
  });

  return res.status(201).json({ thought });
});
