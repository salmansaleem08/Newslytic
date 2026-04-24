"use client";

import { SendHorizontal } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { AppHeader } from "../../../../components/app-header";
import { Button } from "../../../../components/ui/button";
import { Skeleton } from "../../../../components/ui/skeleton";
import { Textarea } from "../../../../components/ui/textarea";
import { API_BASE } from "../../../../lib/api";

type NewsItem = {
  _id: string;
  title: string;
  summary: string;
  source: string;
  sourceUrl: string;
  imageUrl?: string;
  category: string;
  publishedAt: string;
};

type Thought = {
  _id: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
};

export default function NewsDetailPage() {
  const PROFILE_KEY = "newslytic.profile";
  const params = useParams<{ id: string }>();
  const newsId = params.id;
  const [item, setItem] = useState<NewsItem | null>(null);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [meName, setMeName] = useState("");
  const [meAvatar, setMeAvatar] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async (): Promise<void> => {
    const [itemRes, thoughtsRes, meRes] = await Promise.all([
      fetch(`${API_BASE}/api/news/${newsId}`, { cache: "no-store" }),
      fetch(`${API_BASE}/api/news/${newsId}/thoughts`, { cache: "no-store" }),
      fetch(`${API_BASE}/api/auth/me`, { credentials: "include", cache: "no-store" })
    ]);
    if (itemRes.ok) {
      const data = (await itemRes.json()) as { item: NewsItem };
      setItem(data.item);
    }
    if (thoughtsRes.ok) {
      const data = (await thoughtsRes.json()) as { thoughts: Thought[] };
      setThoughts(data.thoughts);
    }
    if (meRes.ok) {
      const me = (await meRes.json()) as { user: { firstName: string; lastName: string } };
      setMeName(`${me.user.firstName} ${me.user.lastName}`.trim());
    }

    if (typeof window !== "undefined") {
      const localProfile = localStorage.getItem(PROFILE_KEY);
      if (localProfile) {
        try {
          const parsed = JSON.parse(localProfile) as { avatarUrl?: string };
          setMeAvatar(parsed.avatarUrl ?? "");
        } catch {
          setMeAvatar("");
        }
      }
    }
    setLoading(false);
  }, [newsId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, [loadData]);

  async function submitThought(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!content.trim()) return;
    await fetch(`${API_BASE}/api/news/${newsId}/thoughts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ content })
    });
    setContent("");
    await loadData();
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="relative h-[calc(100vh-var(--header-height))] overflow-hidden">
        {loading || !item ? (
          <>
            <aside className="fixed right-0 top-[var(--header-height)] hidden h-[calc(100vh-var(--header-height))] w-[44%] lg:block">
              <Skeleton className="h-full w-full rounded-none" />
            </aside>
            <section className="h-full w-full overflow-y-auto px-6 py-8 lg:w-[56%]">
              <Skeleton className="mb-5 h-9 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-12 w-4/5" />
              <Skeleton className="mt-3 h-5 w-full" />
              <Skeleton className="mt-2 h-5 w-5/6" />
              <div className="mt-8 space-y-4">
                <Skeleton className="h-6 w-40" />
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="w-full space-y-2">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="w-full space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-4/5" />
                    </div>
                  </div>
                </div>
                <Skeleton className="h-28 w-full" />
              </div>
            </section>
          </>
        ) : (
          <>
            <aside className="fixed right-0 top-[var(--header-height)] hidden h-[calc(100vh-var(--header-height))] w-[44%] lg:block">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">No image available</div>
              )}
            </aside>

            <section className="h-full w-full overflow-y-auto px-6 py-8 lg:w-[56%] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="mb-5">
                <Link href="/dashboard">
                  <Button variant="outline">Back to feed</Button>
                </Link>
              </div>

              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{item.category}</p>
              <h1 className="mt-3 text-4xl font-bold leading-tight text-foreground">{item.title}</h1>
              <p className="mt-4 text-lg leading-7 text-muted-foreground">{item.summary}</p>

              <div className="mt-6 space-y-2 text-sm">
                <p className="text-foreground">
                  <span className="font-semibold text-primary">Source:</span>{" "}
                  <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    {item.source}
                  </a>
                </p>
                <p className="text-muted-foreground">Published: {new Date(item.publishedAt).toLocaleString()}</p>
              </div>

              <h2 className="mt-10 text-2xl font-bold text-foreground">People Thoughts</h2>
              <div className="mt-5 space-y-4">
                {thoughts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No thoughts yet. Be the first to share perspective.</p>
                ) : (
                  thoughts.map((thought) => (
                    <article key={thought._id} className="flex items-start gap-3">
                      {thought.authorAvatar || (meAvatar && thought.authorName === meName) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thought.authorAvatar || meAvatar}
                          alt={`${thought.authorName} avatar`}
                          className="h-10 w-10 shrink-0 rounded-full border border-border object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                          {thought.authorName.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold text-foreground">{thought.authorName}</p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">{thought.content}</p>
                      </div>
                    </article>
                  ))
                )}
              </div>

              <h3 className="mt-10 text-lg font-semibold text-foreground">Add your thought</h3>
              {meName ? <p className="mt-1 text-sm text-muted-foreground">Commenting as {meName}</p> : null}
              <form onSubmit={submitThought} className="mt-3 space-y-3 pb-10">
                <div className="flex items-center gap-2 rounded-md border border-input bg-transparent px-3 py-1">
                  <Textarea
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    className="h-24 resize-none border-0 bg-transparent px-0 py-2 text-sm shadow-none focus-visible:border-0 focus-visible:ring-0"
                    placeholder="Write your thought..."
                    required
                  />
                  <Button type="submit" variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-primary hover:text-primary/80" aria-label="Post thought">
                    <SendHorizontal className="h-5 w-5" />
                  </Button>
                </div>
              </form>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
