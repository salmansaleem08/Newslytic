import axios from "axios";
import { NewsItemModel } from "../models/news-item.js";
import { summarizeNews } from "./gemini.js";

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

async function fetchRawArticles(): Promise<Array<Record<string, unknown>>> {
  // If no provider key is configured yet, return empty and keep app stable.
  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) return [];

  const { data } = await axios.get("https://gnews.io/api/v4/top-headlines", {
    params: { token: apiKey, lang: "en", max: 15 }
  });

  return data.articles ?? [];
}

export async function runNewsSync(): Promise<{ inserted: number; skipped: number }> {
  const dayKey = getDayKey();
  const existingToday = await NewsItemModel.countDocuments({ dayKey });

  if (existingToday >= 15) {
    return { inserted: 0, skipped: 0 };
  }

  const raw = await fetchRawArticles();
  let inserted = 0;
  let skipped = 0;

  for (const article of raw) {
    const sourceUrl = String(article.url ?? "");
    if (!sourceUrl) {
      skipped += 1;
      continue;
    }

    const alreadyExists = await NewsItemModel.exists({ sourceUrl });
    if (alreadyExists) {
      skipped += 1;
      continue;
    }

    const title = String(article.title ?? "");
    const description = String(article.description ?? "");
    const source = String((article.source as { name?: string } | undefined)?.name ?? "Unknown");
    const publishedAt = new Date(String(article.publishedAt ?? new Date().toISOString()));

    const summary = await summarizeNews(`${title}\n\n${description}`);

    await NewsItemModel.create({
      title,
      summary,
      source,
      sourceUrl,
      category: "global",
      publishedAt,
      dayKey
    });

    inserted += 1;
    if (inserted + existingToday >= 15) break;
  }

  await pruneOldDays();

  return { inserted, skipped };
}
