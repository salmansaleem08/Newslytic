"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

function cleanSummaryText(input: string): string {
  return input
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^headline\s*:\s*/i, "")
    .replace(/^summary\s*:\s*/i, "")
    .replace(/\bheadline\s*:\s*/gi, "")
    .replace(/\bsummary\s*:\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

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

  function goPrev() {
    if (items.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  }

  function goNext() {
    if (items.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % items.length);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader
        overlay
        className="fixed left-0 right-0 top-0 z-[120] border-border/60 bg-background/85 text-foreground shadow-sm backdrop-blur-lg supports-[backdrop-filter]:bg-background/75"
      />
      <main className="w-full pt-[var(--header-height)]">
        <section className="relative h-[calc(100vh-var(--header-height))] w-full overflow-hidden">
          {items.length > 1 ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={goPrev}
                className="absolute left-3 top-1/2 z-30 h-10 w-10 -translate-y-1/2 border-white/35 bg-black/35 text-white hover:bg-black/55 sm:left-6"
                aria-label="Previous news"
              >
                <ChevronLeft />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={goNext}
                className="absolute right-3 top-1/2 z-30 h-10 w-10 -translate-y-1/2 border-white/35 bg-black/35 text-white hover:bg-black/55 sm:right-6"
                aria-label="Next news"
              >
                <ChevronRight />
              </Button>
            </>
          ) : null}
          {loading ? (
            <div className="absolute inset-0">
              <Skeleton className="h-full w-full rounded-none" />
              <div className="absolute inset-x-0 bottom-0 space-y-4 p-4 sm:p-8">
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
                <div className="absolute bottom-0 left-0 right-0 flex flex-col gap-4 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-end sm:justify-between sm:p-8">
                  <div className="min-w-0 max-w-3xl">
                    <h2 className="text-2xl font-bold leading-tight text-white sm:text-3xl lg:text-4xl">{cleanSummaryText(activeItem.title)}</h2>
                    <p className="mt-2 text-sm font-medium text-white/95 sm:mt-3 sm:text-base">{cleanSummaryText(activeItem.summary)}</p>
                  </div>
                  <Link href={`/dashboard/news/${activeItem._id}`} className="shrink-0 sm:self-end">
                    <Button className="h-11 w-full sm:w-auto">Read More</Button>
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
