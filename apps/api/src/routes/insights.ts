import { Router } from "express";
import { NEWS_CATEGORIES, NewsItemModel } from "../models/news-item.js";
import { TrendPredictionModel } from "../models/trend-prediction.js";
import { analyzeNewsSignals } from "../services/gemini.js";

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
  const limit = Math.min(180, Math.max(20, Number(req.query.limit ?? 80)));
  const days = Math.min(14, Math.max(3, Number(req.query.days ?? 7)));
  const requestedCategory = String(req.query.category ?? "all");
  const categoryFilter = requestedCategory === "all" ? null : NEWS_CATEGORIES.find((category) => category === requestedCategory);
  if (requestedCategory !== "all" && !categoryFilter) {
    return res.status(400).json({ error: "Invalid category" });
  }

  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days + 1);
  const query: Record<string, unknown> = { publishedAt: { $gte: sinceDate } };
  if (categoryFilter) query.category = categoryFilter;

  // Backfill missing sentiment/bias signals for recent items so analytics stay useful
  // even when the dataset was created before signal computation was introduced.
  const recentForBackfill = await NewsItemModel.find(query)
    .sort({ publishedAt: -1 })
    .limit(Math.min(60, limit))
    .lean();

  const missingSignals = recentForBackfill.filter((item) => !item.sentiment?.label || !item.bias?.label).slice(0, 25);
  if (missingSignals.length > 0) {
    await Promise.all(
      missingSignals.map(async (item) => {
        const signals = await analyzeNewsSignals({
          title: item.title,
          summary: item.summary,
          source: item.source
        });
        await NewsItemModel.updateOne(
          { _id: item._id },
          {
            $set: {
              sentiment: signals.sentiment,
              bias: signals.bias
            }
          }
        );
      })
    );
  }

  const items = await NewsItemModel.find({ ...query, sentiment: { $exists: true } })
    .sort({ publishedAt: -1 })
    .limit(limit)
    .lean();

  const distribution = { Positive: 0, Negative: 0, Neutral: 0 };
  const byCategory = Object.fromEntries(NEWS_CATEGORIES.map((category) => [category, { Positive: 0, Negative: 0, Neutral: 0 }]));
  const byDayMap = new Map<string, { Positive: number; Negative: number; Neutral: number }>();
  const sourceStatsMap = new Map<string, { source: string; total: number; positive: number; negative: number; neutral: number }>();

  for (const item of items) {
    const label = item.sentiment?.label ?? "Neutral";
    if (label in distribution) distribution[label as keyof typeof distribution] += 1;
    const row = byCategory[item.category as keyof typeof byCategory];
    if (row && label in row) row[label as keyof typeof row] += 1;

    const dayKey = new Date(item.publishedAt).toISOString().slice(0, 10);
    const dayRow = byDayMap.get(dayKey) ?? { Positive: 0, Negative: 0, Neutral: 0 };
    if (label in dayRow) dayRow[label as keyof typeof dayRow] += 1;
    byDayMap.set(dayKey, dayRow);

    const source = item.source || "Unknown";
    const sourceRow = sourceStatsMap.get(source) ?? { source, total: 0, positive: 0, negative: 0, neutral: 0 };
    sourceRow.total += 1;
    if (label === "Positive") sourceRow.positive += 1;
    else if (label === "Negative") sourceRow.negative += 1;
    else sourceRow.neutral += 1;
    sourceStatsMap.set(source, sourceRow);
  }

  const positiveHighlights = items
    .filter((item) => item.sentiment?.label === "Positive")
    .sort((a, b) => (b.sentiment?.confidence ?? 0) - (a.sentiment?.confidence ?? 0))
    .slice(0, 5)
    .map((item) => ({
      _id: String(item._id),
      title: item.title,
      source: item.source,
      category: item.category,
      confidence: item.sentiment?.confidence ?? 0,
      publishedAt: item.publishedAt
    }));

  const riskHighlights = items
    .filter((item) => item.sentiment?.label === "Negative")
    .sort((a, b) => (b.sentiment?.confidence ?? 0) - (a.sentiment?.confidence ?? 0))
    .slice(0, 5)
    .map((item) => ({
      _id: String(item._id),
      title: item.title,
      source: item.source,
      category: item.category,
      confidence: item.sentiment?.confidence ?? 0,
      publishedAt: item.publishedAt
    }));

  const sentimentTimeline = Array.from(byDayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dayKey, values]) => ({ dayKey, ...values }));

  const sourceMood = Array.from(sourceStatsMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)
    .map((row) => ({
      source: row.source,
      total: row.total,
      positiveRatio: row.total > 0 ? Number((row.positive / row.total).toFixed(2)) : 0,
      negativeRatio: row.total > 0 ? Number((row.negative / row.total).toFixed(2)) : 0
    }));

  return res.json({
    category: categoryFilter ?? "all",
    days,
    distribution,
    byCategory,
    sentimentTimeline,
    highlights: {
      positive: positiveHighlights,
      risk: riskHighlights
    },
    sourceMood,
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

const TREND_SECTORS = [
  {
    sector: "Stocks",
    impactArea: "Equity prices and sector ETFs",
    topic: "Global stock markets",
    keywords: ["stock", "shares", "market", "nasdaq", "dow", "s&p", "earnings", "ipo", "equity", "fed", "rate cut", "inflation"]
  },
  {
    sector: "Crypto",
    impactArea: "Bitcoin, Ethereum, altcoins",
    topic: "Crypto market momentum",
    keywords: ["bitcoin", "btc", "ethereum", "eth", "crypto", "blockchain", "token", "defi", "etf", "solana", "binance"]
  },
  {
    sector: "Fashion",
    impactArea: "Consumer style trends and retail demand",
    topic: "Fashion and style cycles",
    keywords: ["fashion", "style", "runway", "designer", "luxury", "streetwear", "outfit", "brand", "collection", "viral look"]
  },
  {
    sector: "AI & Tech",
    impactArea: "AI adoption and technology product cycles",
    topic: "AI and technology adoption",
    keywords: ["ai", "artificial intelligence", "chip", "semiconductor", "startup", "app", "launch", "cloud", "robot", "openai", "nvidia"]
  },
  {
    sector: "Energy & Commodities",
    impactArea: "Oil, gas, metals and commodity-linked assets",
    topic: "Energy and commodity markets",
    keywords: ["oil", "gas", "opec", "commodity", "gold", "silver", "copper", "barrel", "supply shock", "refinery"]
  },
  {
    sector: "Geopolitics",
    impactArea: "Risk-on/risk-off behavior across markets",
    topic: "Global policy and conflict risk",
    keywords: ["war", "sanction", "election", "policy", "tariff", "military", "diplomatic", "conflict", "border", "security"]
  }
] as const;

function toSentimentScore(item: { sentiment?: { label?: string | null; confidence?: number | null } | null }): number {
  const label = item.sentiment?.label ?? "Neutral";
  const strength = Math.max(0.1, Math.min(1, ((item.sentiment?.confidence ?? 50) as number) / 100));
  if (label === "Positive") return strength;
  if (label === "Negative") return -strength;
  return 0;
}

insightsRouter.get("/trends", async (_req, res) => {
  const today = new Date();
  const dayKeys = [0, 1, 2, 3, 4, 5].map((offset) => {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    return getDayKey(date);
  });
  const analysisDayKeys = [0, 1, 2, 3, 4, 5, 6].map((offset) => {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    return getDayKey(date);
  });
  const todayKey = dayKeys[0];

  const existing = await TrendPredictionModel.findOne({ dayKey: todayKey }).lean();
  const existingGraph = (existing as { graph?: { sectorSeries?: unknown[]; window?: { days?: number } } } | null)?.graph;
  const hasExpectedWindow = Number(existingGraph?.window?.days ?? 0) === dayKeys.length;
  if (
    existing?.predictions?.length &&
    Array.isArray(existingGraph?.sectorSeries) &&
    existingGraph.sectorSeries.length > 0 &&
    hasExpectedWindow
  ) {
    return res.json({
      dayKey: todayKey,
      predictions: existing.predictions,
      graph: existingGraph,
      cached: true
    });
  }

  const rows = await NewsItemModel.find({ dayKey: { $in: analysisDayKeys } })
    .select({ title: 1, summary: 1, dayKey: 1, sentiment: 1 })
    .lean();

  const stats = new Map<
    string,
    {
      sector: string;
      topic: string;
      impactArea: string;
      freqToday: number;
      freqYesterday: number;
      sentimentAccumulator: number;
      matches: number;
    }
  >();
  const series = new Map<string, Map<string, { mentionCount: number; sentimentSum: number; sentimentSamples: number }>>();

  for (const definition of TREND_SECTORS) {
    stats.set(definition.sector, {
      sector: definition.sector,
      topic: definition.topic,
      impactArea: definition.impactArea,
      freqToday: 0,
      freqYesterday: 0,
      sentimentAccumulator: 0,
      matches: 0
    });
    series.set(definition.sector, new Map(dayKeys.map((dayKey) => [dayKey, { mentionCount: 0, sentimentSum: 0, sentimentSamples: 0 }])));
  }

  for (const row of rows) {
    const corpus = `${row.title} ${row.summary}`.toLowerCase();
    const sentimentScore = toSentimentScore(row);
    const isToday = row.dayKey === analysisDayKeys[0];
    const isYesterday = row.dayKey === analysisDayKeys[1];

    for (const definition of TREND_SECTORS) {
      const matched = definition.keywords.some((keyword) => corpus.includes(keyword));
      if (!matched) continue;
      const bucket = stats.get(definition.sector);
      if (!bucket) continue;
      if (isToday) bucket.freqToday += 1;
      if (isYesterday) bucket.freqYesterday += 1;
      bucket.sentimentAccumulator += sentimentScore;
      bucket.matches += 1;

      const sectorSeries = series.get(definition.sector);
      if (sectorSeries && sectorSeries.has(row.dayKey)) {
        const point = sectorSeries.get(row.dayKey)!;
        point.mentionCount += 1;
        point.sentimentSum += sentimentScore;
        point.sentimentSamples += 1;
        sectorSeries.set(row.dayKey, point);
      }
    }
  }

  const candidates = Array.from(stats.values())
    .map((sectorStats) => {
      const growthScore = Number((sectorStats.freqToday - sectorStats.freqYesterday + sectorStats.freqToday * 0.75).toFixed(2));
      const sentimentScore =
        sectorStats.matches > 0 ? Number((sectorStats.sentimentAccumulator / sectorStats.matches).toFixed(2)) : 0;
      return {
        sector: sectorStats.sector,
        topic: sectorStats.topic,
        impactArea: sectorStats.impactArea,
        freqToday: sectorStats.freqToday,
        freqYesterday: sectorStats.freqYesterday,
        growthScore,
        sentimentScore
      };
    })
    .sort((a, b) => b.growthScore - a.growthScore)
    .slice(0, TREND_SECTORS.length);

  const predictions = candidates.map((candidate) => {
    const outlook =
      candidate.growthScore >= 2 && candidate.sentimentScore >= 0.05
        ? "Upward"
        : candidate.growthScore >= 1.2 && candidate.sentimentScore > -0.15
          ? "Watch"
          : candidate.sentimentScore <= -0.2 || candidate.growthScore < 0.3
            ? "Downward"
            : "Watch";

    const confidence = Math.max(
      45,
      Math.min(
        95,
        Math.round(
          48 +
            Math.min(20, candidate.freqToday * 2.5) +
            Math.max(0, Math.min(18, candidate.growthScore * 6)) +
            Math.max(-8, Math.min(10, candidate.sentimentScore * 12))
        )
      )
    );

    const rationale =
      candidate.sector === "Stocks"
        ? outlook === "Upward"
          ? "Equity-related coverage is increasing and tone is constructive. Short-term stock momentum may strengthen."
          : outlook === "Downward"
            ? "Risk-off language is dominating stock narratives. Near-term downside pressure is more likely."
            : "Stock coverage is active but mixed. Expect selective moves rather than broad directional breakout."
        : candidate.sector === "Crypto"
          ? outlook === "Upward"
            ? "Crypto mentions are accelerating with improving sentiment. Coins may see higher speculative demand."
            : outlook === "Downward"
              ? "Negative policy/risk narratives are rising. Crypto volatility may skew downward."
              : "Crypto interest remains high, but conviction is mixed; likely choppy movement."
          : candidate.sector === "Fashion"
            ? outlook === "Upward"
              ? "Style trend mentions are rising consistently. This look/theme is likely to spread in upcoming cycles."
              : outlook === "Downward"
                ? "Fashion buzz is cooling and weak sentiment is increasing. Adoption pace may fade."
                : "Fashion signal is forming but not yet dominant; monitor social amplification."
            : candidate.sector === "AI & Tech"
              ? outlook === "Upward"
                ? "AI/tech coverage remains strong with positive framing; adoption and launch momentum may continue."
                : outlook === "Downward"
                  ? "Cautionary AI/tech narratives are increasing; near-term enthusiasm may cool."
                  : "AI/tech remains headline-heavy but with mixed direction; watch earnings/product catalysts."
              : candidate.sector === "Energy & Commodities"
                ? outlook === "Upward"
                  ? "Supply and demand narratives support firmer commodity expectations in the short horizon."
                  : outlook === "Downward"
                    ? "Soft demand or easing supply concerns are weighing on commodity momentum."
                    : "Energy/commodity signals are mixed; likely range-bound near-term behavior."
                : outlook === "Upward"
                  ? "Geopolitical headlines are intensifying with risk-up framing; global policy impact is rising."
                  : outlook === "Downward"
                    ? "Geopolitical risk focus is easing; market sensitivity may decline short term."
                    : "Geopolitical signal remains elevated but directional conviction is limited.";

    return {
      sector: candidate.sector,
      topic: candidate.topic,
      growthScore: candidate.growthScore,
      confidence,
      rationale,
      outlook,
      impactArea: candidate.impactArea,
      horizon: "next 24-72h"
    };
  });

  const graph = {
    window: {
      type: "rolling",
      days: dayKeys.length,
      bootstrappedHistoryDays: 5,
      description: "Initial chart includes previous 5 days plus today; afterward only new daily snapshot is appended."
    },
    sectorSeries: Array.from(series.entries()).map(([sector, pointsMap]) => {
      const rawPoints = Array.from(pointsMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dayKey, point]) => {
          const sentimentScore = point.sentimentSamples > 0 ? Number((point.sentimentSum / point.sentimentSamples).toFixed(2)) : 0;
          return {
            dayKey,
            mentionCount: point.mentionCount,
            sentimentScore
          };
        });

      // Smooth sparse sectors so charts are informative instead of flat-zero then spike.
      const points = rawPoints.map((point, index) => {
        const prev = index > 0 ? rawPoints[index - 1] : null;
        const smoothedMentions =
          point.mentionCount > 0
            ? point.mentionCount
            : prev
              ? Number((Math.max(0, prev.mentionCount * 0.65)).toFixed(2))
              : 0;
        const smoothedSentiment =
          point.mentionCount > 0
            ? point.sentimentScore
            : prev
              ? Number((prev.sentimentScore * 0.6).toFixed(2))
              : 0;
        const momentumIndex = Number((smoothedMentions * 0.8 + smoothedSentiment * 2.5).toFixed(2));
        return {
          dayKey: point.dayKey,
          mentionCount: smoothedMentions,
          sentimentScore: smoothedSentiment,
          momentumIndex
        };
      });
      return { sector, points };
    }),
    marketHeatmap: predictions.map((item) => ({
      sector: item.sector,
      confidence: item.confidence,
      outlook: item.outlook,
      growthScore: item.growthScore
    }))
  };

  const stored = await TrendPredictionModel.findOneAndUpdate(
    { dayKey: todayKey },
    { dayKey: todayKey, generatedAt: new Date(), predictions, graph },
    { upsert: true, new: true }
  ).lean();

  return res.json({
    dayKey: todayKey,
    predictions: stored?.predictions ?? predictions,
    graph: (stored as { graph?: unknown } | null)?.graph ?? graph,
    cached: false
  });
});
