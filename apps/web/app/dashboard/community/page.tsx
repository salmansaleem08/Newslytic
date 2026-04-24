"use client";

import { Heart, MessageCircle, Repeat2, Send } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AppHeader } from "../../../components/app-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Skeleton } from "../../../components/ui/skeleton";
import { API_BASE } from "../../../lib/api";

type FeedItem = {
  _id: string;
  title: string;
  summary: string;
  source: string;
  sourceUrl: string;
  imageUrl?: string;
  category: string;
  publishedAt: string;
  interaction: {
    likeCount: number;
    commentCount: number;
    likedByMe: boolean;
  };
  comments: Array<{
    _id: string;
    authorName: string;
    authorAvatar?: string;
    content: string;
    createdAt: string;
  }>;
};

const CATEGORY_OPTIONS = ["global", "local", "politics", "technology", "business", "entertainment", "sports"] as const;

export default function CommunityPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [appliedCategories, setAppliedCategories] = useState<string[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [openCommentFor, setOpenCommentFor] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [feedPreferences, setFeedPreferences] = useState<string[]>([...CATEGORY_OPTIONS]);
  const [savingPreferences, setSavingPreferences] = useState(false);

  const loadFeed = useCallback(async (category: string, mode: "reset" | "append" = "reset") => {
    if (mode === "reset") setLoading(true);
    if (mode === "append") setLoadingMore(true);
    setError("");
    try {
      const params = new URLSearchParams({ category, limit: "20" });
      if (mode === "append" && nextCursor) params.set("before", nextCursor);
      const response = await fetch(`${API_BASE}/api/community/feed?${params.toString()}`, {
        credentials: "include",
        cache: "no-store"
      });
      const data = (await response.json().catch(() => ({}))) as {
        feed?: FeedItem[];
        appliedCategories?: string[];
        hasMore?: boolean;
        nextCursor?: string | null;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Unable to load community feed.");
      setFeed((prev) => (mode === "append" ? [...prev, ...(data.feed ?? [])] : data.feed ?? []));
      setAppliedCategories(data.appliedCategories ?? []);
      setHasMore(Boolean(data.hasMore));
      setNextCursor(data.nextCursor ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load feed.");
    } finally {
      if (mode === "reset") setLoading(false);
      if (mode === "append") setLoadingMore(false);
    }
  }, [nextCursor]);

  const loadPreferences = useCallback(async () => {
    const response = await fetch(`${API_BASE}/api/community/preferences/me`, { credentials: "include", cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json().catch(() => ({}))) as { categories?: string[] };
    if (data.categories?.length) setFeedPreferences(data.categories);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPreferences();
    void loadFeed("all");
  }, [loadFeed, loadPreferences]);

  async function toggleLike(newsId: string) {
    const response = await fetch(`${API_BASE}/api/community/${newsId}/likes/toggle`, {
      method: "POST",
      credentials: "include"
    });
    if (!response.ok) return;
    const data = (await response.json().catch(() => ({}))) as { likedByMe: boolean; likeCount: number };
    setFeed((prev) =>
      prev.map((item) =>
        item._id === newsId
          ? { ...item, interaction: { ...item.interaction, likedByMe: data.likedByMe, likeCount: data.likeCount } }
          : item
      )
    );
  }

  async function postComment(newsId: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = (commentDrafts[newsId] ?? "").trim();
    if (!content) return;

    const response = await fetch(`${API_BASE}/api/community/${newsId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ content })
    });
    if (!response.ok) return;

    const data = (await response.json().catch(() => ({}))) as {
      comment?: { _id: string; authorName: string; authorAvatar?: string; content: string; createdAt: string };
    };
    if (!data.comment) return;

    setFeed((prev) =>
      prev.map((item) =>
        item._id === newsId
          ? {
              ...item,
              interaction: { ...item.interaction, commentCount: item.interaction.commentCount + 1 },
              comments: [data.comment!, ...item.comments].slice(0, 4)
            }
          : item
      )
    );
    setCommentDrafts((prev) => ({ ...prev, [newsId]: "" }));
  }

  async function togglePreference(category: string) {
    const current = new Set(feedPreferences);
    if (current.has(category)) current.delete(category);
    else current.add(category);
    const next = Array.from(current);
    if (next.length === 0) return;

    setFeedPreferences(next);
    setSavingPreferences(true);
    await fetch(`${API_BASE}/api/community/preferences/me`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ categories: next })
    }).catch(() => undefined);
    setSavingPreferences(false);
    await loadFeed(selectedCategory);
  }

  const heading = useMemo(() => `Community Feed (${selectedCategory === "all" ? "All categories" : selectedCategory})`, [selectedCategory]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="mr-3 text-xl font-bold">Community</h1>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory("all");
                setNextCursor(null);
                void loadFeed("all", "reset");
              }}
              className={`rounded-full px-3 py-1 text-xs font-medium ${selectedCategory === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              All
            </button>
            {CATEGORY_OPTIONS.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => {
                  setSelectedCategory(category);
                  setNextCursor(null);
                  void loadFeed(category, "reset");
                }}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                  selectedCategory === category ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <p className="text-sm text-muted-foreground">{heading}</p>
          {selectedCategory === "all" && appliedCategories.length > 0 ? (
            <p className="text-xs text-muted-foreground">Using preferences: {appliedCategories.join(", ")}</p>
          ) : null}
          {error ? <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}

          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-52 w-full" />
              <Skeleton className="h-52 w-full" />
            </div>
          ) : (
            <div className="space-y-4">
              {feed.map((item) => (
                <Card key={item._id}>
                  <CardContent className="pt-6">
                    <article className="space-y-3">
                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                        <div className="relative aspect-square overflow-hidden rounded-md border border-border bg-muted">
                          {item.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No image</div>
                          )}
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.12em] text-primary">{item.category}</p>
                          <h2 className="mt-1 text-lg font-semibold">{item.title}</h2>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.summary}</p>
                          <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-primary hover:underline">
                            {item.source}
                          </a>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 border-t border-border pt-2 text-sm">
                        <button
                          type="button"
                          onClick={() => setOpenCommentFor((current) => (current === item._id ? null : item._id))}
                          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                        >
                          <MessageCircle className="h-4 w-4" />
                          {item.interaction.commentCount}
                        </button>
                        <button
                          type="button"
                          onClick={() => void toggleLike(item._id)}
                          className={`inline-flex items-center gap-1 ${item.interaction.likedByMe ? "text-red-500" : "text-muted-foreground hover:text-foreground"}`}
                        >
                          <Heart className={`h-4 w-4 ${item.interaction.likedByMe ? "fill-current" : ""}`} />
                          {item.interaction.likeCount}
                        </button>
                        <button type="button" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
                          <Repeat2 className="h-4 w-4" />
                          Repost
                        </button>
                      </div>

                      {openCommentFor === item._id ? (
                        <form onSubmit={(event) => void postComment(item._id, event)} className="flex items-center gap-2">
                          <input
                            value={commentDrafts[item._id] ?? ""}
                            onChange={(event) => setCommentDrafts((prev) => ({ ...prev, [item._id]: event.target.value }))}
                            placeholder="Write a comment..."
                            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                          />
                          <button
                            type="submit"
                            className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                            aria-label="Post comment"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        </form>
                      ) : null}

                      {item.comments.length > 0 ? (
                        <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
                          {item.comments.map((comment) => (
                            <div key={comment._id} className="flex items-start gap-2">
                              {comment.authorAvatar ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={comment.authorAvatar} alt={comment.authorName} className="h-8 w-8 rounded-full border border-border object-cover" />
                              ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                                  {comment.authorName.slice(0, 1).toUpperCase()}
                                </div>
                              )}
                              <div className="text-sm">
                                <p className="font-medium">{comment.authorName}</p>
                                <p className="text-muted-foreground">{comment.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  </CardContent>
                </Card>
              ))}
              {hasMore ? (
                <button
                  type="button"
                  onClick={() => void loadFeed(selectedCategory, "append")}
                  disabled={loadingMore}
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground transition hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-60"
                >
                  {loadingMore ? "Loading more..." : "Load older posts"}
                </button>
              ) : null}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feed Preferences</CardTitle>
              <CardDescription>Select topics you want in your community timeline.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {CATEGORY_OPTIONS.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => void togglePreference(category)}
                  className={`w-full rounded-md border px-3 py-2 text-left text-sm capitalize ${
                    feedPreferences.includes(category)
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {category}
                </button>
              ))}
              {savingPreferences ? <p className="text-xs text-muted-foreground">Saving preferences...</p> : null}
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  );
}
