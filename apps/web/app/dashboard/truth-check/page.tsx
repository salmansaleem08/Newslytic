"use client";

import { Loader2, Send } from "lucide-react";
import { FormEvent, useState } from "react";
import { AppHeader } from "../../../components/app-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Skeleton } from "../../../components/ui/skeleton";
import { API_BASE } from "../../../lib/api";

type VerifyResult = {
  claim: string;
  verdict: string;
  confidence: number;
  summary: string;
  sources: Array<{
    publisher: string;
    url: string;
    title: string;
    rating: string;
    reviewDate: string;
  }>;
  graph: {
    supports: number;
    disputes: number;
    mixed: number;
    unknown: number;
  };
  cached: boolean;
  fetchedAt: string;
};

type Message =
  | { role: "user"; text: string }
  | { role: "bot"; text: string; result?: VerifyResult };

function sanitizeDisplayText(input: string): string {
  return input
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`/g, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .trim();
}

function barPercent(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}

export default function TruthCheckPage() {
  const [claim, setClaim] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "bot",
      text: "Send any headline or claim, and I will verify it against fact-check sources then summarize with AI."
    }
  ]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextClaim = claim.trim();
    if (!nextClaim) return;

    setMessages((prev) => [...prev, { role: "user", text: nextClaim }]);
    setClaim("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/truth-check/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claim: nextClaim })
      });
      const data = (await response.json().catch(() => ({}))) as { result?: VerifyResult; error?: string };
      if (!response.ok || !data.result) {
        setMessages((prev) => [...prev, { role: "bot", text: data.error ?? "I could not verify that claim right now." }]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: sanitizeDisplayText(data.result.summary),
          result: data.result
        }
      ]);
    } catch {
      setMessages((prev) => [...prev, { role: "bot", text: "Network issue: unable to verify right now." }]);
    } finally {
      setLoading(false);
    }
  }

  const latestResult = [...messages].reverse().find((msg) => msg.role === "bot" && msg.result)?.result;
  const cleanedSummary = latestResult ? sanitizeDisplayText(latestResult.summary) : "";
  const totalGraph =
    (latestResult?.graph.supports ?? 0) +
    (latestResult?.graph.disputes ?? 0) +
    (latestResult?.graph.mixed ?? 0) +
    (latestResult?.graph.unknown ?? 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <Card className="min-h-[70vh]">
          <CardHeader>
            <CardTitle>Truth-Check Chatbot</CardTitle>
            <CardDescription>Verify any headline or claim with cached fact-check evidence and AI summary.</CardDescription>
          </CardHeader>
          <CardContent className="flex h-full flex-col gap-4">
            <div className="flex-1 space-y-3 overflow-y-auto rounded-md border border-border bg-muted/20 p-3">
              {messages.map((message, idx) => (
                <div
                  key={`${message.role}-${idx}`}
                  className={`max-w-[92%] rounded-md px-3 py-2 text-sm ${
                    message.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "border border-border bg-card text-card-foreground"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{sanitizeDisplayText(message.text)}</p>
                </div>
              ))}
              {loading ? (
                <div className="max-w-[92%] rounded-md border border-border bg-card px-3 py-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="mt-2 h-3 w-full" />
                </div>
              ) : null}
            </div>

            <form onSubmit={onSubmit} className="flex items-center gap-2">
              <input
                value={claim}
                onChange={(event) => setClaim(event.target.value)}
                placeholder="Paste a headline or write a claim to verify..."
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-primary text-primary-foreground transition hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
                aria-label="Send claim"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Verification Summary</CardTitle>
              <CardDescription>Latest result snapshot.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {latestResult ? (
                <>
                  <div className="rounded-md border border-border bg-card p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          /false|misleading/i.test(latestResult.verdict)
                            ? "bg-red-500/15 text-red-600 dark:text-red-300"
                            : /true/i.test(latestResult.verdict)
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                        }`}
                      >
                        {latestResult.verdict}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                        {latestResult.cached ? "Cached" : "Fresh"}
                      </span>
                    </div>
                    <p className="mt-2 text-muted-foreground">Confidence: {latestResult.confidence}%</p>
                    <div className="mt-2 h-2 w-full rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${latestResult.confidence}%` }} />
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap leading-6 text-muted-foreground">{cleanedSummary}</p>
                </>
              ) : (
                <p className="text-muted-foreground">No verification yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evidence Distribution</CardTitle>
              <CardDescription>Supports vs disputes from fact-check sources.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {latestResult ? (
                <>
                  {[
                    { label: "Supports", value: latestResult.graph.supports, color: "bg-emerald-500" },
                    { label: "Disputes", value: latestResult.graph.disputes, color: "bg-red-500" },
                    { label: "Mixed", value: latestResult.graph.mixed, color: "bg-amber-500" },
                    { label: "Unknown", value: latestResult.graph.unknown, color: "bg-slate-500" }
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{item.label}</span>
                        <span>{item.value} ({barPercent(item.value, totalGraph)}%)</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted">
                        <div className={`h-full rounded-full ${item.color}`} style={{ width: `${barPercent(item.value, totalGraph)}%` }} />
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <p className="text-muted-foreground">Graph appears after first check.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Sources</CardTitle>
              <CardDescription>Fact-check references used for latest output.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {latestResult?.sources?.length ? (
                latestResult.sources.slice(0, 6).map((source, idx) => (
                  <div key={`${source.url}-${idx}`} className="rounded-md border border-border bg-card px-3 py-2">
                    <p className="font-medium text-foreground">{source.publisher || "Unknown Publisher"}</p>
                    <p className="text-muted-foreground">{sanitizeDisplayText(source.rating || "No rating provided")}</p>
                    {source.title ? <p className="mt-1 text-xs text-muted-foreground">{sanitizeDisplayText(source.title)}</p> : null}
                    {source.url ? (
                      <a href={source.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        Open source
                      </a>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">No sources yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
