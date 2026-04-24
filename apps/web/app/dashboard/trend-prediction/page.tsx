"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "../../../components/app-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Skeleton } from "../../../components/ui/skeleton";
import { API_BASE } from "../../../lib/api";

type Prediction = {
  topic: string;
  growthScore: number;
  confidence: number;
  rationale: string;
};

export default function TrendPredictionPage() {
  const [loading, setLoading] = useState(true);
  const [dayKey, setDayKey] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [cached, setCached] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch(`${API_BASE}/api/insights/trends`, { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as { dayKey?: string; predictions?: Prediction[]; cached?: boolean };
      if (res.ok) {
        setDayKey(data.dayKey ?? "");
        setPredictions(data.predictions ?? []);
        setCached(Boolean(data.cached));
      }
      setLoading(false);
    }
    void load();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <Card>
          <CardHeader>
            <CardTitle>Trend Prediction Engine</CardTitle>
            <CardDescription>
              Forecasted high-momentum topics using frequency/growth metrics with AI final prioritization.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Snapshot: {dayKey || "N/A"} • {cached ? "Loaded from cache" : "Freshly generated"}
                </p>
                <div className="space-y-3">
                  {predictions.map((item, index) => (
                    <div key={`${item.topic}-${index}`} className="rounded-md border border-border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-base font-semibold capitalize">{item.topic}</p>
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                          Confidence {item.confidence}%
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{item.rationale}</p>
                      <div className="mt-3">
                        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                          <span>Growth Score</span>
                          <span>{item.growthScore.toFixed(2)}</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(8, item.confidence))}%` }} />
                        </div>
                      </div>
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
