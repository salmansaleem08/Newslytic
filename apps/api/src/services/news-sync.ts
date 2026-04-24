import axios from "axios";
import { env } from "../config.js";
import { NEWS_CATEGORIES, type NewsCategory, NewsItemModel } from "../models/news-item.js";
import { NewsSyncStateModel } from "../models/news-sync-state.js";
import { analyzeNewsSignals, summarizeNews } from "./gemini.js";

function getDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

async function pruneOldDays(): Promise<void> {
  const days = await NewsItemModel.distinct("dayKey");
  const sorted = [...days].sort();

  if (sorted.length <= 10) return;

  const toRemove = sorted.slice(0, sorted.length - 10);
  await NewsItemModel.deleteMany({ dayKey: { $in: toRemove } });
}

async function shouldRunSync(force = false): Promise<boolean> {
  if (force) return true;
  const state = await NewsSyncStateModel.findOne({ key: "feed-sync" }).lean();
  if (!state?.lastSyncedAt) return true;
  const ageMs = Date.now() - new Date(state.lastSyncedAt).getTime();
  return ageMs >= env.NEWS_SYNC_INTERVAL_MINUTES * 60_000;
}

async function markSynced(): Promise<void> {
  await NewsSyncStateModel.findOneAndUpdate(
    { key: "feed-sync" },
    { key: "feed-sync", lastSyncedAt: new Date() },
    { upsert: true, new: true }
  );
}

async function enforceDailyCap(dayKey: string, maxItems = 15): Promise<void> {
  const docs = await NewsItemModel.find({ dayKey })
    .sort({ relevanceScore: -1, publishedAt: -1 })
    .select({ _id: 1 })
    .lean();

  if (docs.length <= maxItems) return;
  const removeIds = docs.slice(maxItems).map((doc) => doc._id);
  await NewsItemModel.deleteMany({ _id: { $in: removeIds } });
}

type ProviderArticle = {
  title: string;
  description: string;
  source: string;
  sourceUrl: string;
  imageUrl: string;
  publishedAt: Date;
  category: NewsCategory;
};

function computeRelevanceScore(article: ProviderArticle): number {
  const ageHours = Math.max(0, (Date.now() - article.publishedAt.getTime()) / 3_600_000);
  const freshnessScore = Math.max(0, 100 - ageHours * 4);
  const impactful = /(breaking|war|election|crisis|urgent|market|policy|security)/i.test(
    `${article.title} ${article.description}`
  )
    ? 20
    : 0;
  const hasImage = article.imageUrl ? 5 : 0;
  return Number((freshnessScore + impactful + hasImage).toFixed(2));
}

async function isCategoryFresh(dayKey: string, category: NewsCategory): Promise<boolean> {
  const latest = await NewsItemModel.findOne({ dayKey, category }).sort({ updatedAt: -1 }).select({ updatedAt: 1 }).lean();
  if (!latest?.updatedAt) return false;
  const ageMs = Date.now() - new Date(latest.updatedAt).getTime();
  return ageMs < env.NEWS_SYNC_INTERVAL_MINUTES * 60_000;
}

function mapNewsApiCategory(category: NewsCategory): string {
  if (category === "technology") return "technology";
  if (category === "business") return "business";
  if (category === "entertainment") return "entertainment";
  if (category === "sports") return "sports";
  return "general";
}

async function fetchFromNewsApi(category: NewsCategory): Promise<ProviderArticle[]> {
  if (!env.NEWS_API_KEY) return [];

  const params: Record<string, string | number> = {
    apiKey: env.NEWS_API_KEY,
    pageSize: 8
  };

  if (category === "local") {
    params.country = env.LOCAL_NEWS_COUNTRY;
    params.category = "general";
  } else if (category === "politics") {
    params.q = "politics";
    params.sortBy = "publishedAt";
    params.language = "en";
  } else {
    params.category = mapNewsApiCategory(category);
    params.language = "en";
  }

  const { data } = await axios.get("https://newsapi.org/v2/top-headlines", { params });
  const rows = Array.isArray(data?.articles) ? data.articles : [];

  return (rows as Array<Record<string, unknown>>)
    .map(
      (row): ProviderArticle => ({
        title: String(row.title ?? "").trim(),
        description: String(row.description ?? "").trim(),
        source: String((row.source as { name?: string } | undefined)?.name ?? "Unknown"),
        sourceUrl: String(row.url ?? "").trim(),
        imageUrl: String(row.urlToImage ?? "").trim(),
        publishedAt: new Date(String(row.publishedAt ?? new Date().toISOString())),
        category
      })
    )
    .filter((row) => row.title && row.sourceUrl && !Number.isNaN(row.publishedAt.getTime()));
}

async function fetchFromGNews(category: NewsCategory): Promise<ProviderArticle[]> {
  if (!env.GNEWS_API_KEY) return [];

  const params: Record<string, string | number> = { token: env.GNEWS_API_KEY, lang: "en", max: 8 };
  if (category === "local") params.country = env.LOCAL_NEWS_COUNTRY;
  if (category === "politics") params.q = "politics";
  if (["business", "technology", "entertainment", "sports"].includes(category)) {
    params.topic = category === "technology" ? "science" : category;
  }

  const { data } = await axios.get("https://gnews.io/api/v4/top-headlines", { params });
  const rows = Array.isArray(data?.articles) ? data.articles : [];
  return (rows as Array<Record<string, unknown>>)
    .map(
      (row): ProviderArticle => ({
        title: String(row.title ?? "").trim(),
        description: String(row.description ?? "").trim(),
        source: String((row.source as { name?: string } | undefined)?.name ?? "Unknown"),
        sourceUrl: String(row.url ?? "").trim(),
        imageUrl: String(row.image ?? "").trim(),
        publishedAt: new Date(String(row.publishedAt ?? new Date().toISOString())),
        category
      })
    )
    .filter((row) => row.title && row.sourceUrl && !Number.isNaN(row.publishedAt.getTime()));
}

async function fetchCategoryArticles(category: NewsCategory): Promise<ProviderArticle[]> {
  const newsApiRows = await fetchFromNewsApi(category);
  if (newsApiRows.length > 0) return newsApiRows;
  return fetchFromGNews(category);
}

type SyncOptions = { force?: boolean; categories?: NewsCategory[] };

export async function runNewsSync(options: SyncOptions = {}): Promise<{ inserted: number; skipped: number }> {
  const canSyncNow = await shouldRunSync(Boolean(options.force));
  if (!canSyncNow) {
    return { inserted: 0, skipped: 0 };
  }

  const dayKey = getDayKey();
  let inserted = 0;
  let skipped = 0;

  const categories = options.categories && options.categories.length > 0 ? options.categories : [...NEWS_CATEGORIES];

  for (const category of categories) {
    if (!options.force) {
      const fresh = await isCategoryFresh(dayKey, category);
      if (fresh) continue;
    }

    const rawArticles = await fetchCategoryArticles(category);
    for (const article of rawArticles) {
      const existing = await NewsItemModel.findOne({ sourceUrl: article.sourceUrl })
        .select({ _id: 1 })
        .lean();
      if (existing) {
        skipped += 1;
        continue;
      }

      const summary = await summarizeNews(`${article.title}\n\n${article.description}`);
      const signals = await analyzeNewsSignals({
        title: article.title,
        summary,
        source: article.source
      });
      await NewsItemModel.create({
        title: article.title,
        summary,
        source: article.source,
        sourceUrl: article.sourceUrl,
        imageUrl: article.imageUrl,
        category: article.category,
        relevanceScore: computeRelevanceScore(article),
        sentiment: signals.sentiment,
        bias: signals.bias,
        publishedAt: article.publishedAt,
        dayKey
      });

      inserted += 1;
    }
  }

  await enforceDailyCap(dayKey, 15);
  await pruneOldDays();
  await markSynced();

  return { inserted, skipped };
}
