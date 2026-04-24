"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Activity, AlertTriangle, BarChart3, BriefcaseBusiness, Flame, LineChart, Radar, TrendingUp } from "lucide-react";
import { AppHeader } from "../../../components/app-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Skeleton } from "../../../components/ui/skeleton";
import { API_BASE } from "../../../lib/api";

type Prediction = {
  sector: string;
  topic: string;
  outlook: "Upward" | "Downward" | "Watch";
  growthScore: number;
  confidence: number;
  rationale: string;
  impactArea: string;
  horizon: string;
};

type GraphPayload = {
  sectorSeries: Array<{
    sector: string;
    points: Array<{
      dayKey: string;
      mentionCount: number;
      sentimentScore: number;
      momentumIndex: number;
    }>;
  }>;
  marketHeatmap: Array<{
    sector: string;
    confidence: number;
    outlook: "Upward" | "Downward" | "Watch";
    growthScore: number;
  }>;
};

const METRIC_OPTIONS = [
  { key: "mentionCount", label: "Mentions", icon: BarChart3 },
  { key: "momentumIndex", label: "Momentum", icon: LineChart },
  { key: "sentimentScore", label: "Sentiment", icon: Activity }
] as const;

const SECTOR_COLORS: Record<string, string> = {
  Stocks: "#3b82f6",
  Crypto: "#a855f7",
  Fashion: "#ec4899",
  "AI & Tech": "#06b6d4",
  "Energy & Commodities": "#f59e0b",
  Geopolitics: "#ef4444"
};

export default function TrendPredictionPage() {
  const [loading, setLoading] = useState(true);
  const [dayKey, setDayKey] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [graph, setGraph] = useState<GraphPayload | null>(null);
  const [cached, setCached] = useState(false);
  const [activeMetric, setActiveMetric] = useState<(typeof METRIC_OPTIONS)[number]["key"]>("momentumIndex");
  const [activeSector, setActiveSector] = useState<string>("");

  useEffect(() => {
    async function load() {
      const res = await fetch(`${API_BASE}/api/insights/trends`, { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as { dayKey?: string; predictions?: Prediction[]; graph?: GraphPayload; cached?: boolean };
      if (res.ok) {
        setDayKey(data.dayKey ?? "");
        setPredictions(data.predictions ?? []);
        setGraph(data.graph ?? null);
        setCached(Boolean(data.cached));
        setActiveSector((prev) => prev || data.graph?.sectorSeries?.[0]?.sector || "");
      }
      setLoading(false);
    }
    void load();
  }, []);

  const selectedSeries = graph?.sectorSeries.find((series) => series.sector === activeSector) ?? graph?.sectorSeries[0];
  const chartPoints = selectedSeries?.points ?? [];
  const chartValues = chartPoints.map((point) => point[activeMetric]);
  const maxValue = Math.max(1, ...chartValues.map((value) => Math.abs(value)));
  const minValue = activeMetric === "sentimentScore" ? Math.min(0, ...chartValues) : 0;
  const range = Math.max(1, maxValue - minValue);
  const latestPoint = chartPoints[chartPoints.length - 1];
  const previousPoint = chartPoints[chartPoints.length - 2];
  const latestValue = latestPoint ? latestPoint[activeMetric] : 0;
  const previousValue = previousPoint ? previousPoint[activeMetric] : 0;
  const valueDelta = latestValue - previousValue;
  const averageValue = chartValues.length ? chartValues.reduce((sum, value) => sum + value, 0) / chartValues.length : 0;
  const highestPoint = chartPoints.reduce(
    (best, point) => (point[activeMetric] > best[activeMetric] ? point : best),
    chartPoints[0] ?? { dayKey: "", mentionCount: 0, sentimentScore: 0, momentumIndex: 0 }
  );
  const chartPath = chartPoints
    .map((point, index) => {
      const x = chartPoints.length <= 1 ? 0 : (index / (chartPoints.length - 1)) * 100;
      const y = 100 - ((point[activeMetric] - minValue) / range) * 100;
      return `${x},${Math.max(0, Math.min(100, y))}`;
    })
    .join(" ");

  const insightEngine = useMemo(() => {
    const scored = predictions
      .map((item) => {
        const score = item.confidence * 0.55 + item.growthScore * 18;
        return { ...item, score };
      })
      .sort((a, b) => b.score - a.score);

    const opportunities = scored.filter((item) => item.outlook === "Upward").slice(0, 3);
    const risks = scored
      .filter((item) => item.outlook === "Downward" || item.confidence >= 75)
      .sort((a, b) => {
        const riskWeightA = (a.outlook === "Downward" ? 1.2 : 0.8) * (a.confidence + Math.max(0, -a.growthScore * 20));
        const riskWeightB = (b.outlook === "Downward" ? 1.2 : 0.8) * (b.confidence + Math.max(0, -b.growthScore * 20));
        return riskWeightB - riskWeightA;
      })
      .slice(0, 3);

    const rotation = (graph?.sectorSeries ?? [])
      .map((series) => {
        const len = series.points.length;
        const latest = len > 0 ? series.points[len - 1].momentumIndex : 0;
        const prev = len > 1 ? series.points[len - 2].momentumIndex : 0;
        return {
          sector: series.sector,
          shift: Number((latest - prev).toFixed(2)),
          latest
        };
      })
      .sort((a, b) => b.shift - a.shift);

    const strongestRotation = rotation[0];
    const weakestRotation = rotation[rotation.length - 1];
    const avgConfidence = predictions.length
      ? Math.round(predictions.reduce((sum, item) => sum + item.confidence, 0) / predictions.length)
      : 0;

    const executiveSummary =
      opportunities.length > 0
        ? `Momentum leadership is currently in ${opportunities[0].sector}. Confidence across sectors is ${avgConfidence}%, suggesting ${
            avgConfidence >= 72 ? "high-conviction" : avgConfidence >= 60 ? "moderate-conviction" : "early-stage"
          } signal quality.`
        : "Signals are mixed today; the engine suggests defensive monitoring until stronger momentum emerges.";

    const playbook = [
      opportunities[0]
        ? `Lean into ${opportunities[0].sector}: ${opportunities[0].topic} shows the strongest upside setup (${opportunities[0].confidence}% confidence).`
        : "No high-conviction upside setup detected; keep exposure diversified.",
      risks[0]
        ? `Protect against ${risks[0].sector} volatility: current setup is ${risks[0].outlook.toLowerCase()} with ${risks[0].confidence}% confidence.`
        : "Risk posture is balanced; no sector shows exceptional downside pressure.",
      strongestRotation && weakestRotation
        ? `Rotation check: capital attention is moving toward ${strongestRotation.sector} and away from ${weakestRotation.sector}.`
        : "Rotation data is still building; monitor another cycle for clearer flow."
    ];

    return { opportunities, risks, strongestRotation, weakestRotation, avgConfidence, executiveSummary, playbook };
  }, [graph?.sectorSeries, predictions]);

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
                <div className="grid gap-3 lg:grid-cols-3">
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <Radar className="size-4 text-primary" />
                      Executive Brief
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">{insightEngine.executiveSummary}</p>
                    <p className="mt-3 text-xs text-muted-foreground">Average confidence: {insightEngine.avgConfidence}%</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <TrendingUp className="size-4 text-emerald-500" />
                      Best Opportunity
                    </p>
                    {insightEngine.opportunities[0] ? (
                      <>
                        <p className="mt-2 text-sm font-medium">{insightEngine.opportunities[0].sector}</p>
                        <p className="text-xs text-muted-foreground">{insightEngine.opportunities[0].topic}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Growth {insightEngine.opportunities[0].growthScore.toFixed(2)} • Confidence {insightEngine.opportunities[0].confidence}%
                        </p>
                      </>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">No strong upside leader detected yet.</p>
                    )}
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <AlertTriangle className="size-4 text-amber-500" />
                      Highest Risk
                    </p>
                    {insightEngine.risks[0] ? (
                      <>
                        <p className="mt-2 text-sm font-medium">{insightEngine.risks[0].sector}</p>
                        <p className="text-xs text-muted-foreground">{insightEngine.risks[0].topic}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Outlook {insightEngine.risks[0].outlook} • Confidence {insightEngine.risks[0].confidence}%
                        </p>
                      </>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">No critical risk alert in the current cycle.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <BriefcaseBusiness className="size-4 text-primary" />
                    Action Playbook (What users can do now)
                  </p>
                  <div className="mt-3 grid gap-2 md:grid-cols-3">
                    {insightEngine.playbook.map((line) => (
                      <div key={line} className="rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                        {line}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    <div className="rounded-md border border-border px-3 py-2">
                      <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Capital Rotation In</p>
                      <p className="mt-1 text-sm font-medium">
                        {insightEngine.strongestRotation ? `${insightEngine.strongestRotation.sector} (+${insightEngine.strongestRotation.shift.toFixed(2)})` : "N/A"}
                      </p>
                    </div>
                    <div className="rounded-md border border-border px-3 py-2">
                      <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Capital Rotation Out</p>
                      <p className="mt-1 text-sm font-medium">
                        {insightEngine.weakestRotation ? `${insightEngine.weakestRotation.sector} (${insightEngine.weakestRotation.shift.toFixed(2)})` : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
                {graph ? (
                  <div className="space-y-4 rounded-xl border border-border bg-gradient-to-b from-background to-muted/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">Interactive Trend Studio</p>
                      <div className="flex flex-wrap gap-2">
                        {METRIC_OPTIONS.map((metric) => {
                          const Icon = metric.icon;
                          return (
                            <Button
                              key={metric.key}
                              type="button"
                              variant={activeMetric === metric.key ? "default" : "outline"}
                              size="sm"
                              className="h-8"
                              onClick={() => setActiveMetric(metric.key)}
                            >
                              <Icon className="size-4" />
                              {metric.label}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {graph.sectorSeries.map((series) => (
                        <button
                          key={series.sector}
                          type="button"
                          onClick={() => setActiveSector(series.sector)}
                          className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                            (selectedSeries?.sector ?? "") === series.sector
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground"
                          }`}
                        >
                          {series.sector}
                        </button>
                      ))}
                    </div>

                    <div className="rounded-lg border border-border bg-card p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-medium">{selectedSeries?.sector ?? "Sector"} - {METRIC_OPTIONS.find((item) => item.key === activeMetric)?.label}</p>
                        <span className="text-xs text-muted-foreground">Last 10 days</span>
                      </div>
                      <div className="mb-3 grid gap-2 sm:grid-cols-3">
                        <div className="rounded-md border border-border bg-muted/20 px-2 py-1.5">
                          <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Latest</p>
                          <p className="text-sm font-semibold">
                            {activeMetric === "sentimentScore" ? latestValue.toFixed(2) : latestValue.toFixed(1)}
                          </p>
                        </div>
                        <div className="rounded-md border border-border bg-muted/20 px-2 py-1.5">
                          <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Day Change</p>
                          <p className={`text-sm font-semibold ${valueDelta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                            {valueDelta >= 0 ? "+" : ""}
                            {activeMetric === "sentimentScore" ? valueDelta.toFixed(2) : valueDelta.toFixed(1)}
                          </p>
                        </div>
                        <div className="rounded-md border border-border bg-muted/20 px-2 py-1.5">
                          <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">10-Day Avg</p>
                          <p className="text-sm font-semibold">
                            {activeMetric === "sentimentScore" ? averageValue.toFixed(2) : averageValue.toFixed(1)}
                          </p>
                        </div>
                      </div>
                      <div className="relative h-44 w-full rounded-md bg-muted/30 p-2">
                        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
                          <defs>
                            <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={SECTOR_COLORS[selectedSeries?.sector ?? ""] ?? "#00b67b"} stopOpacity="0.35" />
                              <stop offset="100%" stopColor={SECTOR_COLORS[selectedSeries?.sector ?? ""] ?? "#00b67b"} stopOpacity="0.03" />
                            </linearGradient>
                          </defs>
                          <polyline fill="none" stroke="hsl(var(--border))" strokeWidth="0.6" points="0,80 100,80" />
                          {chartPoints.length > 1 ? (
                            <>
                              <motion.polygon
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.5 }}
                                fill="url(#trend-fill)"
                                points={`${chartPath} 100,100 0,100`}
                              />
                              <motion.polyline
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 0.7, ease: "easeOut" }}
                                fill="none"
                                stroke={SECTOR_COLORS[selectedSeries?.sector ?? ""] ?? "#00b67b"}
                                strokeWidth="2.2"
                                points={chartPath}
                              />
                              <circle
                                cx={chartPoints.length <= 1 ? 0 : ((chartPoints.length - 1) / (chartPoints.length - 1)) * 100}
                                cy={100 - ((latestValue - minValue) / range) * 100}
                                r="1.8"
                                fill={SECTOR_COLORS[selectedSeries?.sector ?? ""] ?? "#00b67b"}
                              />
                            </>
                          ) : null}
                        </svg>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Y-axis: {activeMetric === "mentionCount" ? "Article mentions" : activeMetric === "momentumIndex" ? "Momentum score" : "Sentiment score (-1 to +1)"}</span>
                        <span>
                          Peak: {highestPoint.dayKey ? `${highestPoint.dayKey} (${highestPoint[activeMetric].toFixed(activeMetric === "sentimentScore" ? 2 : 1)})` : "N/A"}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-5 gap-1 text-[11px] text-muted-foreground sm:grid-cols-10">
                        {chartPoints.map((point) => (
                          <span key={`${selectedSeries?.sector}-${point.dayKey}`} className="truncate">
                            {point.dayKey.slice(5)}
                          </span>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Insight: {selectedSeries?.sector ?? "This sector"} is currently{" "}
                        {valueDelta > 0 ? "accelerating" : valueDelta < 0 ? "cooling" : "stable"} on{" "}
                        {METRIC_OPTIONS.find((item) => item.key === activeMetric)?.label.toLowerCase()} compared with yesterday.
                      </p>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {graph.marketHeatmap.map((cell) => (
                        <div key={cell.sector} className="rounded-md border border-border bg-card px-3 py-3 text-sm">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium">{cell.sector}</p>
                            <Flame
                              className={`size-4 ${
                                cell.outlook === "Upward"
                                  ? "text-emerald-500"
                                  : cell.outlook === "Downward"
                                    ? "text-red-500"
                                    : "text-amber-500"
                              }`}
                            />
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{cell.outlook} • Growth {cell.growthScore.toFixed(2)}</p>
                          <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full ${
                                cell.outlook === "Upward"
                                  ? "bg-emerald-500"
                                  : cell.outlook === "Downward"
                                    ? "bg-red-500"
                                    : "bg-amber-500"
                              }`}
                              style={{ width: `${Math.max(10, Math.min(100, cell.confidence))}%` }}
                            />
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground">Confidence {cell.confidence}%</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="space-y-3">
                  {predictions.map((item, index) => (
                    <div key={`${item.topic}-${index}`} className="rounded-md border border-border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{item.sector}</p>
                          <p className="text-base font-semibold">{item.topic}</p>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                          item.outlook === "Upward"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            : item.outlook === "Downward"
                              ? "bg-red-500/15 text-red-700 dark:text-red-300"
                              : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                        }`}>
                          {item.outlook}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full bg-muted px-2 py-1">{item.impactArea}</span>
                        <span className="rounded-full bg-muted px-2 py-1">{item.horizon}</span>
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">
                          Confidence {item.confidence}%
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.rationale}</p>
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
