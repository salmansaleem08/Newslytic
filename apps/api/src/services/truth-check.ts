import axios from "axios";
import crypto from "node:crypto";
import { env } from "../config.js";
import { TruthCheckCacheModel } from "../models/truth-check-cache.js";
import { assessClaimWithEvidence, summarizeTruthCheck } from "./gemini.js";

type Source = {
  publisher: string;
  url: string;
  title: string;
  rating: string;
  reviewDate: string;
};

type GraphData = {
  supports: number;
  disputes: number;
  mixed: number;
  unknown: number;
};

export type TruthCheckResult = {
  claim: string;
  verdict: string;
  confidence: number;
  summary: string;
  sources: Source[];
  graph: GraphData;
  cached: boolean;
  fetchedAt: string;
};

function normalizeClaim(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function claimHash(normalized: string): string {
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

function classifyRating(rating: string): keyof GraphData {
  const text = rating.toLowerCase();
  if (/(true|correct|accurate|legit|real)/.test(text) && !/(mostly true|partly true|half true)/.test(text)) return "supports";
  if (/(false|incorrect|fake|pants on fire|misleading|hoax)/.test(text)) return "disputes";
  if (/(mostly true|partly true|half true|mixed|needs context)/.test(text)) return "mixed";
  return "unknown";
}

function buildVerdict(graph: GraphData): { verdict: string; confidence: number } {
  const total = graph.supports + graph.disputes + graph.mixed + graph.unknown;
  if (total === 0) return { verdict: "Insufficient evidence", confidence: 20 };

  if (graph.disputes > graph.supports && graph.disputes >= graph.mixed) {
    return { verdict: "Likely false or misleading", confidence: Math.min(95, Math.round((graph.disputes / total) * 100 + 20)) };
  }
  if (graph.supports > graph.disputes && graph.supports >= graph.mixed) {
    return { verdict: "Likely true", confidence: Math.min(95, Math.round((graph.supports / total) * 100 + 20)) };
  }
  if (graph.mixed > 0) return { verdict: "Mixed / partially true", confidence: Math.min(88, Math.round((graph.mixed / total) * 100 + 25)) };
  return { verdict: "Insufficient evidence", confidence: 35 };
}

function fromGeminiVerdict(verdict: string): string {
  if (verdict === "Yes") return "Likely true";
  if (verdict === "No") return "Likely false or misleading";
  return "Mixed / partially true";
}

async function fetchFactChecks(claim: string): Promise<Source[]> {
  if (!env.FACTCHECK_API_KEY) return [];

  const { data } = await axios.get("https://factchecktools.googleapis.com/v1alpha1/claims:search", {
    params: {
      query: claim,
      key: env.FACTCHECK_API_KEY,
      languageCode: "en"
    }
  });

  const claims = Array.isArray(data?.claims) ? data.claims : [];
  const sources: Source[] = [];
  for (const claimEntry of claims as Array<Record<string, unknown>>) {
    const reviews = Array.isArray(claimEntry.claimReview) ? claimEntry.claimReview : [];
    for (const review of reviews as Array<Record<string, unknown>>) {
      sources.push({
        publisher: String((review.publisher as { name?: string } | undefined)?.name ?? ""),
        url: String(review.url ?? ""),
        title: String(review.title ?? ""),
        rating: String(review.textualRating ?? ""),
        reviewDate: String(review.reviewDate ?? "")
      });
    }
  }
  return sources.filter((item) => item.url || item.title || item.rating);
}

async function fetchNewsEvidence(claim: string): Promise<Source[]> {
  const sources: Source[] = [];

  if (env.NEWS_API_KEY) {
    const { data } = await axios.get("https://newsapi.org/v2/everything", {
      params: {
        q: claim,
        apiKey: env.NEWS_API_KEY,
        language: "en",
        sortBy: "publishedAt",
        pageSize: 8
      }
    });
    const articles = Array.isArray(data?.articles) ? data.articles : [];
    for (const article of articles as Array<Record<string, unknown>>) {
      sources.push({
        publisher: String((article.source as { name?: string } | undefined)?.name ?? ""),
        url: String(article.url ?? ""),
        title: String(article.title ?? ""),
        rating: "Reported by publisher",
        reviewDate: String(article.publishedAt ?? "")
      });
    }
  }

  if (sources.length === 0 && env.GNEWS_API_KEY) {
    const { data } = await axios.get("https://gnews.io/api/v4/search", {
      params: {
        q: claim,
        token: env.GNEWS_API_KEY,
        lang: "en",
        max: 8
      }
    });
    const articles = Array.isArray(data?.articles) ? data.articles : [];
    for (const article of articles as Array<Record<string, unknown>>) {
      sources.push({
        publisher: String((article.source as { name?: string } | undefined)?.name ?? ""),
        url: String(article.url ?? ""),
        title: String(article.title ?? ""),
        rating: "Reported by publisher",
        reviewDate: String(article.publishedAt ?? "")
      });
    }
  }

  return sources.filter((item) => item.url || item.title);
}

export async function verifyClaim(claim: string): Promise<TruthCheckResult> {
  const normalized = normalizeClaim(claim);
  const hash = claimHash(normalized);
  const cached = await TruthCheckCacheModel.findOne({ claimHash: hash }).lean();
  if (cached) {
    const isWeakVerdict = /insufficient evidence/i.test(cached.verdict);
    const ageMs = Date.now() - new Date(cached.updatedAt ?? cached.fetchedAt).getTime();
    if (!(isWeakVerdict && ageMs > 60 * 60 * 1000)) {
      return {
        claim: cached.claim,
        verdict: cached.verdict,
        confidence: cached.confidence,
        summary: cached.summary,
        sources: cached.sources as Source[],
        graph: cached.graph as GraphData,
        cached: true,
        fetchedAt: new Date(cached.fetchedAt).toISOString()
      };
    }
  }

  let sources = await fetchFactChecks(claim);
  if (sources.length === 0) {
    sources = await fetchNewsEvidence(claim);
  }

  const graph: GraphData = { supports: 0, disputes: 0, mixed: 0, unknown: 0 };
  for (const source of sources) {
    graph[classifyRating(source.rating)] += 1;
  }

  const localVerdict = buildVerdict(graph);
  let verdictInfo = localVerdict;
  let summary = "";

  let geminiResult: { verdict: string; confidence: number; summary: string } | null = null;
  if (sources.length > 0) {
    const assessed = await assessClaimWithEvidence({
      claim,
      evidence: sources.slice(0, 8).map((source) => ({
        publisher: source.publisher,
        title: source.title,
        snippet: source.rating
      }))
    });
    geminiResult = {
      verdict: fromGeminiVerdict(assessed.verdict),
      confidence: assessed.confidence,
      summary: assessed.summary
    };
  }

  // Compare the rule-based provider verdict and Gemini assessment, choose higher-confidence.
  const localCandidate = {
    verdict: localVerdict.verdict,
    confidence: localVerdict.confidence,
    summary: "",
    provider: "provider" as const
  };
  const geminiCandidate = geminiResult
    ? {
        verdict: geminiResult.verdict,
        confidence: geminiResult.confidence,
        summary: geminiResult.summary,
        provider: "gemini" as const
      }
    : null;
  const selected =
    geminiCandidate && geminiCandidate.confidence >= localCandidate.confidence ? geminiCandidate : localCandidate;

  verdictInfo = { verdict: selected.verdict, confidence: selected.confidence };
  if (selected.provider === "gemini" && selected.summary) {
    summary = selected.summary;
  }

  if (!summary) {
    summary = await summarizeTruthCheck({
      claim,
      verdict: verdictInfo.verdict,
      confidence: verdictInfo.confidence,
      evidence: sources.map((source) => ({
        publisher: source.publisher,
        title: source.title,
        rating: source.rating
      }))
    });
  }

  const created = await TruthCheckCacheModel.findOneAndUpdate(
    { claimHash: hash },
    {
      claimHash: hash,
      claim,
      normalizedClaim: normalized,
      verdict: verdictInfo.verdict,
      confidence: verdictInfo.confidence,
      summary,
      sources,
      graph,
      fetchedAt: new Date()
    },
    { upsert: true, new: true }
  );

  if (!created) throw new Error("Unable to store truth-check cache");
  return {
    claim: created.claim,
    verdict: created.verdict,
    confidence: created.confidence,
    summary: created.summary,
    sources: created.sources as Source[],
    graph: created.graph as GraphData,
    cached: false,
    fetchedAt: created.fetchedAt.toISOString()
  };
}
