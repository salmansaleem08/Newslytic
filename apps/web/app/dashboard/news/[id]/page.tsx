"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { AppHeader } from "../../../../components/app-header";
import { Button } from "../../../../components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
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
  content: string;
  createdAt: string;
};

export default function NewsDetailPage() {
  const params = useParams<{ id: string }>();
  const newsId = params.id;
  const [item, setItem] = useState<NewsItem | null>(null);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [authorName, setAuthorName] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async (): Promise<void> => {
    const [itemRes, thoughtsRes] = await Promise.all([
      fetch(`${API_BASE}/api/news/${newsId}`, { cache: "no-store" }),
      fetch(`${API_BASE}/api/news/${newsId}/thoughts`, { cache: "no-store" })
    ]);
    if (itemRes.ok) {
      const data = (await itemRes.json()) as { item: NewsItem };
      setItem(data.item);
    }
    if (thoughtsRes.ok) {
      const data = (await thoughtsRes.json()) as { thoughts: Thought[] };
      setThoughts(data.thoughts);
    }
    setLoading(false);
  }, [newsId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, [loadData]);

  async function submitThought(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authorName.trim() || !content.trim()) return;
    await fetch(`${API_BASE}/api/news/${newsId}/thoughts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authorName, content })
    });
    setContent("");
    await loadData();
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="w-full px-6 py-8">
        <div className="mb-4">
          <Link href="/dashboard">
            <Button variant="outline">Back to feed</Button>
          </Link>
        </div>
        {loading || !item ? (
          <Card>
            <CardHeader>
              <CardDescription>Loading article...</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            <section className="grid gap-6 lg:grid-cols-2">
              <Card className="h-fit">
                <CardHeader>
                  <CardDescription className="uppercase tracking-wide">{item.category}</CardDescription>
                  <CardTitle className="text-3xl">{item.title}</CardTitle>
                  <CardDescription>{item.summary}</CardDescription>
                  <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
                    Source: {item.source}
                  </a>
                </CardHeader>
              </Card>
              <div className="relative h-[420px] overflow-hidden rounded-xl border border-border bg-card">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">No image available</div>
                )}
              </div>
            </section>

            <section className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">People&apos;s Thoughts</CardTitle>
                  <CardDescription>Community reactions on this update.</CardDescription>
                </CardHeader>
                <div className="space-y-3 px-6 pb-6">
                  {thoughts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No thoughts yet. Be the first to share perspective.</p>
                  ) : (
                    thoughts.map((thought) => (
                      <div key={thought._id} className="rounded-md border border-border bg-background p-3">
                        <p className="text-sm font-medium">{thought.authorName}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{thought.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Add Your Thought</CardTitle>
                  <CardDescription>Share a concise insight with the community.</CardDescription>
                </CardHeader>
                <form onSubmit={submitThought} className="space-y-3 px-6 pb-6">
                  <Input
                    placeholder="Your name"
                    value={authorName}
                    onChange={(event) => setAuthorName(event.target.value)}
                    className="h-11"
                    required
                  />
                  <textarea
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    className="h-28 w-full rounded-md border border-input bg-transparent p-3 text-sm"
                    placeholder="Your perspective..."
                    required
                  />
                  <Button className="h-10 w-full">Post Thought</Button>
                </form>
              </Card>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
