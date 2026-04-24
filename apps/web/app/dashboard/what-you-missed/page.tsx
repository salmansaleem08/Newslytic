"use client";

import { useEffect, useState } from "react";
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

export default function WhatYouMissedPage() {
  const [loading, setLoading] = useState(true);
  const [distribution, setDistribution] = useState({ Positive: 0, Negative: 0, Neutral: 0 });
  const [rows, setRows] = useState<SentimentRow[]>([]);

  useEffect(() => {
    async function load() {
      const res = await fetch(`${API_BASE}/api/insights/sentiment?limit=60`, { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as { distribution?: { Positive: number; Negative: number; Neutral: number }; items?: SentimentRow[] };
      if (res.ok) {
        setDistribution(data.distribution ?? { Positive: 0, Negative: 0, Neutral: 0 });
        setRows(data.items ?? []);
      }
      setLoading(false);
    }
    void load();
  }, []);

  const total = distribution.Positive + distribution.Negative + distribution.Neutral;
  const pct = (value: number) => (total > 0 ? Math.round((value / total) * 100) : 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <Card>
          <CardHeader>
            <CardTitle>Sentiment Analysis Module</CardTitle>
            <CardDescription>Computed once per article and reused for analytics dashboards.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : (
              <>
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

                <div className="space-y-2">
                  {rows.slice(0, 20).map((row) => (
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
