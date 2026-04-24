import { Router } from "express";
import { NEWS_CATEGORIES, NewsItemModel } from "../models/news-item.js";
import { TrendPredictionModel } from "../models/trend-prediction.js";
import { decideTrendPredictions } from "../services/gemini.js";

export const insightsRouter = Router();

function getDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

insightsRouter.get("/bias", async (req, res) => {
  const limit = Math.min(100, Math.max(10, Number(req.query.limit ?? 40)));
  const items = await NewsItemModel.find({ bias: { $exists: true } })
    .sort({ publishedAt: -1 })
    .limit(limit)
    .lean();

  const distribution = { Left: 0, Right: 0, Neutral: 0 };
  for (const item of items) {
    const label = item.bias?.label ?? "Neutral";
    if (label in distribution) distribution[label as keyof typeof distribution] += 1;
  }

  return res.json({
    distribution,
    items: items.map((item) => ({
      _id: String(item._id),
      title: item.title,
      source: item.source,
      category: item.category,
      bias: item.bias ?? { label: "Neutral", confidence: 0 },
      publishedAt: item.publishedAt
    }))
  });
});

insightsRouter.get("/sentiment", async (req, res) => {
  const limit = Math.min(120, Math.max(10, Number(req.query.limit ?? 60)));
  const items = await NewsItemModel.find({ sentiment: { $exists: true } })
    .sort({ publishedAt: -1 })
    .limit(limit)
    .lean();

  const distribution = { Positive: 0, Negative: 0, Neutral: 0 };
  const byCategory = Object.fromEntries(NEWS_CATEGORIES.map((category) => [category, { Positive: 0, Negative: 0, Neutral: 0 }]));

  for (const item of items) {
    const label = item.sentiment?.label ?? "Neutral";
    if (label in distribution) distribution[label as keyof typeof distribution] += 1;
    const row = byCategory[item.category as keyof typeof byCategory];
    if (row && label in row) row[label as keyof typeof row] += 1;
  }

  return res.json({
    distribution,
    byCategory,
    items: items.map((item) => ({
      _id: String(item._id),
      title: item.title,
      source: item.source,
      category: item.category,
      sentiment: item.sentiment ?? { label: "Neutral", confidence: 0 },
      publishedAt: item.publishedAt
    }))
  });
});

function tokenizeTopic(text: string): string[] {
  const stopWords = new Set(["about", "after", "against", "between", "their", "there", "which", "would", "could", "should", "while", "where", "when", "with", "from", "into", "over", "under", "this", "that", "these", "those", "news", "says", "said", "report", "reports"]);
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word));
}

insightsRouter.get("/trends", async (_req, res) => {
  const today = new Date();
  const dayKeys = [0, 1, 2, 3, 4, 5, 6].map((offset) => {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    return getDayKey(date);
  });
  const todayKey = dayKeys[0];

  const existing = await TrendPredictionModel.findOne({ dayKey: todayKey }).lean();
  if (existing?.predictions?.length) return res.json({ dayKey: todayKey, predictions: existing.predictions, cached: true });

  const rows = await NewsItemModel.find({ dayKey: { $in: dayKeys } })
    .select({ title: 1, dayKey: 1 })
    .lean();

  const todayCounts = new Map<string, number>();
  const yesterdayCounts = new Map<string, number>();

  for (const row of rows) {
    const tokens = tokenizeTopic(row.title);
    const target = row.dayKey === dayKeys[0] ? todayCounts : row.dayKey === dayKeys[1] ? yesterdayCounts : null;
    if (!target) continue;
    for (const token of tokens) target.set(token, (target.get(token) ?? 0) + 1);
  }

  const candidates = Array.from(todayCounts.entries())
    .map(([topic, freqToday]) => {
      const freqYesterday = yesterdayCounts.get(topic) ?? 0;
      const growthScore = Number((freqToday - freqYesterday + freqToday * 0.6).toFixed(2));
      return { topic, freqToday, freqYesterday, growthScore };
    })
    .sort((a, b) => b.growthScore - a.growthScore)
    .slice(0, 10);

  const aiDecisions = await decideTrendPredictions({ candidates });
  const predictions =
    aiDecisions.length > 0
      ? aiDecisions.map((decision) => {
          const metric = candidates.find((candidate) => candidate.topic === decision.topic);
          return {
            topic: decision.topic,
            growthScore: metric?.growthScore ?? 0,
            confidence: decision.confidence,
            rationale: decision.rationale
          };
        })
      : candidates.slice(0, 5).map((candidate) => ({
          topic: candidate.topic,
          growthScore: candidate.growthScore,
          confidence: Math.max(50, Math.min(90, Math.round(candidate.growthScore * 8))),
          rationale: "Topic frequency is rising compared to the prior day."
        }));

  const stored = await TrendPredictionModel.findOneAndUpdate(
    { dayKey: todayKey },
    { dayKey: todayKey, generatedAt: new Date(), predictions },
    { upsert: true, new: true }
  ).lean();

  return res.json({ dayKey: todayKey, predictions: stored?.predictions ?? predictions, cached: false });
});
