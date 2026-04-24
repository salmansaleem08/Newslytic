"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "../../components/app-header";
import { Button } from "../../components/ui/button";
import { Card, CardDescription, CardHeader } from "../../components/ui/card";
import { API_BASE } from "../../lib/api";

type NewsItem = {
  _id: string;
  title: string;
  summary: string;
  source: string;
  sourceUrl: string;
  imageUrl?: string;
  publishedAt: string;
  category: string;
};

export default function DashboardPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  async function loadFeed(): Promise<void> {
    const newsRes = await fetch(`${API_BASE}/api/news/feed?category=all&limit=15&refresh=0`, { cache: "no-store" });
    const newsData = (await newsRes.json().catch(() => ({ items: [] }))) as { items?: NewsItem[] };
    setItems(newsData.items ?? []);
  }

  useEffect(() => {
    async function load() {
      const meRes = await fetch(`${API_BASE}/api/auth/me`, { credentials: "include", cache: "no-store" });
      if (!meRes.ok) {
        window.location.href = "/login";
        return;
      }
      await loadFeed();
      setLoading(false);
    }
    load().catch(() => {
      window.location.href = "/login";
    });
  }, []);

  const activeItem = useMemo(() => {
    if (items.length === 0) return null;
    return items[currentIndex % items.length];
  }, [items, currentIndex]);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [items.length]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="w-full">
        <section className="relative h-[calc(100vh-64px)] w-full overflow-hidden">
          <AnimatePresence mode="wait">
            {activeItem ? (
              <motion.article
                key={activeItem._id}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.55, ease: "easeOut" }}
                className="absolute inset-0"
              >
                {activeItem.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={activeItem.imageUrl} alt={activeItem.title} className="h-full w-full object-cover" loading="eager" />
                ) : (
                  <div className="h-full w-full bg-muted" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-4 p-8">
                  <div className="max-w-3xl">
                    <h2 className="text-4xl font-bold leading-tight text-white">{activeItem.title}</h2>
                    <p className="mt-3 text-base text-white/90">{activeItem.summary}</p>
                  </div>
                  <Link href={`/dashboard/news/${activeItem._id}`}>
                    <Button className="h-11 shrink-0">Read More</Button>
                  </Link>
                </div>
              </motion.article>
            ) : null}
          </AnimatePresence>
        </section>

        <section className="grid gap-4 px-6 py-8 md:grid-cols-2 xl:grid-cols-3">
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
                <div className="mt-4 flex items-center justify-between">
                  <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="block text-xs text-primary hover:underline">
                    {item.source} · {new Date(item.publishedAt).toLocaleString()}
                  </a>
                  <Link href={`/dashboard/news/${item._id}`} className="text-xs text-foreground hover:underline">
                    Read More
                  </Link>
                </div>
              </motion.article>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
