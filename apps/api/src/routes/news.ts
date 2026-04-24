import { Router } from "express";
import { NEWS_CATEGORIES, type NewsCategory, NewsItemModel } from "../models/news-item.js";
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

  await runNewsSync({ force, categories: category === "all" ? undefined : [category] });

  const dayKey = new Date().toISOString().slice(0, 10);
  const query = category === "all" ? { dayKey } : { dayKey, category };
  const items = await NewsItemModel.find(query).sort({ relevanceScore: -1, publishedAt: -1 }).limit(limit).lean();
  res.json({ dayKey, items, categories: NEWS_CATEGORIES });
});

newsRouter.get("/today", async (_req, res) => {
  const dayKey = getDayKey();
  const items = await NewsItemModel.find({ dayKey }).sort({ relevanceScore: -1, publishedAt: -1 }).limit(15).lean();
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
