"use client";

import { AlertTriangle, Sparkles, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "../../../components/app-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Skeleton } from "../../../components/ui/skeleton";
import { API_BASE } from "../../../lib/api";

type SentimentRow = {
  _id: string;
  title: string;
  source: string;
  category: string;
  sentiment: { label: "Positive" | "Negative" | "Neutral"; confidence: number };
  publishedAt: string;
};

type SentimentResponse = {
  category: string;
  days: number;
  distribution: { Positive: number; Negative: number; Neutral: number };
  byCategory: Record<string, { Positive: number; Negative: number; Neutral: number }>;
  sentimentTimeline: Array<{ dayKey: string; Positive: number; Negative: number; Neutral: number }>;
  highlights: {
    positive: Array<{ _id: string; title: string; source: string; category: string; confidence: number; publishedAt: string }>;
    risk: Array<{ _id: string; title: string; source: string; category: string; confidence: number; publishedAt: string }>;
  };
  sourceMood: Array<{ source: string; total: number; positiveRatio: number; negativeRatio: number }>;
  items: SentimentRow[];
};

const CATEGORY_OPTIONS = ["all", "global", "local", "politics", "technology", "business", "entertainment", "sports"] as const;

export default function WhatYouMissedPage() {
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<(typeof CATEGORY_OPTIONS)[number]>("all");
  const [distribution, setDistribution] = useState({ Positive: 0, Negative: 0, Neutral: 0 });
  const [timeline, setTimeline] = useState<Array<{ dayKey: string; Positive: number; Negative: number; Neutral: number }>>([]);
  const [positiveHighlights, setPositiveHighlights] = useState<Array<{ _id: string; title: string; source: string; category: string; confidence: number; publishedAt: string }>>([]);
  const [riskHighlights, setRiskHighlights] = useState<Array<{ _id: string; title: string; source: string; category: string; confidence: number; publishedAt: string }>>([]);
  const [sourceMood, setSourceMood] = useState<Array<{ source: string; total: number; positiveRatio: number; negativeRatio: number }>>([]);
  const [rows, setRows] = useState<SentimentRow[]>([]);
  const [error, setError] = useState("");

  async function load(category: (typeof CATEGORY_OPTIONS)[number]) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/insights/sentiment?limit=120&days=7&category=${category}`, { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as Partial<SentimentResponse> & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Unable to load sentiment intelligence.");
      setDistribution(data.distribution ?? { Positive: 0, Negative: 0, Neutral: 0 });
      setTimeline(data.sentimentTimeline ?? []);
      setPositiveHighlights(data.highlights?.positive ?? []);
      setRiskHighlights(data.highlights?.risk ?? []);
      setSourceMood(data.sourceMood ?? []);
      setRows(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load sentiment intelligence.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(selectedCategory);
  }, [selectedCategory]);

  const total = distribution.Positive + distribution.Negative + distribution.Neutral;
  const pct = (value: number) => (total > 0 ? Math.round((value / total) * 100) : 0);
  const moodIndex = useMemo(() => {
    if (total === 0) return 50;
    const raw = (distribution.Positive - distribution.Negative) / total;
    return Math.max(0, Math.min(100, Math.round(50 + raw * 50)));
  }, [distribution, total]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <Card>
          <CardHeader>
            <CardTitle>Sentiment Intelligence</CardTitle>
            <CardDescription>Actionable mood radar for what to monitor, avoid, and prioritize today.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              {CATEGORY_OPTIONS.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                    selectedCategory === category ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {error ? <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}

            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-md border border-border p-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Mood Index</p>
                    <p className="mt-2 text-2xl font-bold">{moodIndex}</p>
                    <p className="mt-1 text-xs text-muted-foreground">0 = heavy risk, 100 = strong optimism</p>
                    <div className="mt-3 h-2 w-full rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${moodIndex}%` }} />
                    </div>
                  </div>
                  <div className="rounded-md border border-border p-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Positive</p>
                    <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-300">{pct(distribution.Positive)}%</p>
                    <p className="mt-1 text-xs text-muted-foreground">{distribution.Positive} articles</p>
                  </div>
                  <div className="rounded-md border border-border p-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Neutral</p>
                    <p className="mt-2 text-2xl font-bold text-slate-600 dark:text-slate-300">{pct(distribution.Neutral)}%</p>
                    <p className="mt-1 text-xs text-muted-foreground">{distribution.Neutral} articles</p>
                  </div>
                  <div className="rounded-md border border-border p-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Negative</p>
                    <p className="mt-2 text-2xl font-bold text-red-600 dark:text-red-300">{pct(distribution.Negative)}%</p>
                    <p className="mt-1 text-xs text-muted-foreground">{distribution.Negative} articles</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { label: "Positive", value: distribution.Positive, color: "bg-emerald-500" },
                    { label: "Neutral", value: distribution.Neutral, color: "bg-slate-500" },
                    { label: "Negative", value: distribution.Negative, color: "bg-red-500" }
                  ].map((item) => (
                    <div key={item.label} className="rounded-md border border-border p-3">
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.value} articles ({pct(item.value)}%)</p>
                      <div className="mt-2 h-2 w-full rounded-full bg-muted">
                        <div className={`${item.color} h-full rounded-full`} style={{ width: `${pct(item.value)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-md border border-border p-4">
                    <p className="mb-3 flex items-center gap-2 text-sm font-medium">
                      <Sparkles className="h-4 w-4 text-emerald-500" />
                      Positive Momentum
                    </p>
                    <div className="space-y-2">
                      {positiveHighlights.length > 0 ? positiveHighlights.map((row) => (
                        <div key={row._id} className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
                          <p className="font-medium">{row.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {row.source} • {row.category} • confidence {row.confidence}%
                          </p>
                        </div>
                      )) : <p className="text-sm text-muted-foreground">No high-confidence positive signals in this window.</p>}
                    </div>
                  </div>

                  <div className="rounded-md border border-border p-4">
                    <p className="mb-3 flex items-center gap-2 text-sm font-medium">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      Risk Alerts
                    </p>
                    <div className="space-y-2">
                      {riskHighlights.length > 0 ? riskHighlights.map((row) => (
                        <div key={row._id} className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm">
                          <p className="font-medium">{row.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {row.source} • {row.category} • confidence {row.confidence}%
                          </p>
                        </div>
                      )) : <p className="text-sm text-muted-foreground">No high-confidence negative risks in this window.</p>}
                    </div>
                  </div>
                </div>

                <div className="rounded-md border border-border p-4">
                  <p className="mb-3 flex items-center gap-2 text-sm font-medium">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    7-Day Sentiment Drift
                  </p>
                  <div className="grid gap-2 sm:grid-cols-7">
                    {timeline.map((day) => {
                      const dayTotal = day.Positive + day.Negative + day.Neutral;
                      const positivePct = dayTotal ? Math.round((day.Positive / dayTotal) * 100) : 0;
                      const negativePct = dayTotal ? Math.round((day.Negative / dayTotal) * 100) : 0;
                      return (
                        <div key={day.dayKey} className="rounded-md border border-border bg-muted/20 p-2">
                          <p className="text-[11px] text-muted-foreground">{day.dayKey.slice(5)}</p>
                          <div className="mt-2 h-2 w-full rounded-full bg-muted">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${positivePct}%` }} />
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground">+{positivePct}% / -{negativePct}%</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-md border border-border p-4">
                  <p className="mb-3 text-sm font-medium">Source Mood Mix</p>
                  <div className="space-y-2">
                    {sourceMood.map((source) => (
                      <div key={source.source} className="rounded-md border border-border bg-muted/20 px-3 py-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{source.source}</span>
                          <span className="text-xs text-muted-foreground">{source.total} stories</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          +{Math.round(source.positiveRatio * 100)}% positive • -{Math.round(source.negativeRatio * 100)}% negative
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  {rows.slice(0, 12).map((row) => (
                    <div key={row._id} className="rounded-md border border-border px-3 py-2 text-sm">
                      <p className="font-medium">{row.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {row.source} • {row.category} • {row.sentiment.label} ({row.sentiment.confidence}%)
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
