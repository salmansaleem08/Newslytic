"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { API_BASE, type AuthUser } from "../../lib/api";

const FEED_CATEGORIES = ["all", "global", "local", "politics", "technology", "business", "entertainment", "sports"] as const;
type FeedCategory = (typeof FEED_CATEGORIES)[number];

type NewsItem = {
  _id: string;
  title: string;
  summary: string;
  source: string;
  sourceUrl: string;
  imageUrl?: string;
  relevanceScore?: number;
  publishedAt: string;
  category: FeedCategory;
};

export default function DashboardPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<FeedCategory>("all");
  const [syncing, setSyncing] = useState(false);

  async function loadFeed(category: FeedCategory, refresh = false): Promise<void> {
    setSyncing(true);
    const params = new URLSearchParams({
      category,
      limit: "15",
      refresh: refresh ? "1" : "0"
    });
    const newsRes = await fetch(`${API_BASE}/api/news/feed?${params.toString()}`, { cache: "no-store" });
    const newsData = (await newsRes.json().catch(() => ({ items: [] }))) as { items?: NewsItem[] };
    setItems(newsData.items ?? []);
    setSyncing(false);
  }

  useEffect(() => {
    async function load() {
      const meRes = await fetch(`${API_BASE}/api/auth/me`, { credentials: "include", cache: "no-store" });
      if (!meRes.ok) {
        window.location.href = "/login";
        return;
      }
      const meData = (await meRes.json()) as { user: AuthUser };
      setUser(meData.user);

      await loadFeed("all");
      setLoading(false);
    }
    load().catch(() => {
      window.location.href = "/login";
    });
  }, []);

  async function logout() {
    await fetch(`${API_BASE}/api/auth/logout`, { method: "POST", credentials: "include" });
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <div>
            <p className="text-xl font-bold">Newslytic Dashboard</p>
            <p className="text-sm text-muted-foreground">Welcome {user ? `${user.firstName} ${user.lastName}` : ""}</p>
          </div>
          <Button variant="outline" onClick={logout}>
            Logout
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="rounded-xl border border-border bg-card p-2 shadow-sm"
        >
          <Card className="border-0 bg-transparent shadow-none">
            <CardHeader>
              <CardTitle className="text-3xl">Your Smart Feed</CardTitle>
              <CardDescription className="text-base">
                Verified summaries and signal-first updates crafted for founder-level decision speed.
              </CardDescription>
            </CardHeader>
          </Card>
        </motion.section>

        <section className="mt-6 flex flex-wrap items-center gap-2">
          {FEED_CATEGORIES.map((category) => (
            <Button
              key={category}
              variant={activeCategory === category ? "default" : "outline"}
              onClick={() => {
                setActiveCategory(category);
                void loadFeed(category);
              }}
              className="capitalize"
            >
              {category}
            </Button>
          ))}
          <Button
            variant="outline"
            onClick={() => void loadFeed(activeCategory, true)}
            className="ml-auto"
            disabled={syncing}
          >
            {syncing ? "Refreshing..." : "Refresh feed"}
          </Button>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            <Card>
              <CardHeader>
                <CardDescription>Loading your dashboard...</CardDescription>
              </CardHeader>
            </Card>
          ) : items.length === 0 ? (
            <Card>
              <CardHeader>
                <CardDescription>News synchronization is running. Fresh stories will appear here shortly.</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            items.map((item, index) => (
              <motion.article
                key={item._id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.45 }}
                className="rounded-xl border border-border bg-card p-6 shadow-sm hover:-translate-y-0.5"
              >
                <div className="relative mb-3 h-40 overflow-hidden rounded-md border border-border bg-muted">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No image available</div>
                  )}
                </div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.category}</p>
                <h2 className="mt-2 text-lg font-semibold">{item.title}</h2>
                <p className="mt-3 text-sm text-muted-foreground">{item.summary}</p>
                <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="mt-4 block text-xs text-primary hover:underline">
                  {item.source} · {new Date(item.publishedAt).toLocaleString()}
                </a>
              </motion.article>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
