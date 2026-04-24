"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "../../../components/app-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Skeleton } from "../../../components/ui/skeleton";
import { API_BASE } from "../../../lib/api";

type BiasRow = {
  _id: string;
  title: string;
  source: string;
  category: string;
  bias: { label: "Left" | "Right" | "Neutral"; confidence: number };
  publishedAt: string;
};

export default function MemeDecoderPage() {
  const [loading, setLoading] = useState(true);
  const [distribution, setDistribution] = useState({ Left: 0, Right: 0, Neutral: 0 });
  const [rows, setRows] = useState<BiasRow[]>([]);

  useEffect(() => {
    async function load() {
      const res = await fetch(`${API_BASE}/api/insights/bias?limit=50`, { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as { distribution?: { Left: number; Right: number; Neutral: number }; items?: BiasRow[] };
      if (res.ok) {
        setDistribution(data.distribution ?? { Left: 0, Right: 0, Neutral: 0 });
        setRows(data.items ?? []);
      }
      setLoading(false);
    }
    void load();
  }, []);

  const total = distribution.Left + distribution.Right + distribution.Neutral;
  const pct = (value: number) => (total > 0 ? Math.round((value / total) * 100) : 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <Card>
          <CardHeader>
            <CardTitle>Bias Detector</CardTitle>
            <CardDescription>Political leaning signals across sources and categories.</CardDescription>
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
                    { label: "Left", value: distribution.Left, color: "bg-blue-500" },
                    { label: "Neutral", value: distribution.Neutral, color: "bg-slate-500" },
                    { label: "Right", value: distribution.Right, color: "bg-rose-500" }
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
                        {row.source} • {row.category} • {row.bias.label} ({row.bias.confidence}%)
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
