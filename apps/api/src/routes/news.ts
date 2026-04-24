import { Router } from "express";
import { NewsItemModel } from "../models/news-item.js";

export const newsRouter = Router();

newsRouter.get("/today", async (_req, res) => {
  const dayKey = new Date().toISOString().slice(0, 10);
  const items = await NewsItemModel.find({ dayKey }).sort({ publishedAt: -1 }).lean();
  res.json({ dayKey, items });
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
