"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "../../components/app-header";
import { Button } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/skeleton";
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  async function loadFeed(): Promise<void> {
    const newsRes = await fetch(`${API_BASE}/api/news/feed?category=all&limit=15&refresh=0`, { cache: "no-store" });
    const newsData = (await newsRes.json().catch(() => ({ items: [] }))) as { items?: NewsItem[] };
    setItems(newsData.items ?? []);
    setLoading(false);
  }

  useEffect(() => {
    async function load() {
      const meRes = await fetch(`${API_BASE}/api/auth/me`, { credentials: "include", cache: "no-store" });
      if (!meRes.ok) {
        window.location.href = "/login";
        return;
      }
      await loadFeed();
    }
    load().catch(() => {
      window.location.href = "/login";
      setLoading(false);
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
      <AppHeader
        overlay
        className="absolute left-0 right-0 top-0 z-50 border-border/60 bg-background/85 text-foreground shadow-sm backdrop-blur-lg supports-[backdrop-filter]:bg-background/75"
      />
      <main className="w-full">
        <section className="relative h-screen w-full overflow-hidden">
          {loading ? (
            <div className="absolute inset-0">
              <Skeleton className="h-full w-full rounded-none" />
              <div className="absolute inset-x-0 bottom-0 space-y-4 p-8">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-12 w-2/3 max-w-3xl" />
                <Skeleton className="h-4 w-1/2 max-w-2xl" />
                <Skeleton className="h-11 w-32" />
              </div>
            </div>
          ) : null}
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
            ) : !loading ? (
              <div className="absolute inset-0 flex items-center justify-center px-6">
                <p className="text-sm text-muted-foreground">News synchronization is running. Fresh stories will appear shortly.</p>
              </div>
            ) : null}
          </AnimatePresence>
        </section>
      </main>
    </div>
  );
}
