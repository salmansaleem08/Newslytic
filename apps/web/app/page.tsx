type NewsItem = {
  _id: string;
  title: string;
  summary: string;
  source: string;
  category: "global" | "local";
  publishedAt: string;
};

async function getTodayNews(): Promise<NewsItem[]> {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
    const response = await fetch(`${apiBase}/api/news/today`, { cache: "no-store" });
    if (!response.ok) return [];
    const data = (await response.json()) as { items?: NewsItem[] };
    return data.items ?? [];
  } catch {
    return [];
  }
}

export default async function Home() {
  const items = await getTodayNews();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <div>
            <p className="text-xl font-bold">Newslytic</p>
            <p className="text-sm text-muted-foreground">Stay ahead of the curve, not under the noise.</p>
          </div>
          <button className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90">
            Sign in
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8">
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h1 className="text-3xl font-bold">Smart News Feed</h1>
          <p className="mt-2 text-muted-foreground">
            Daily curated updates with AI summaries and incremental refresh.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.length === 0 ? (
            <article className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold">No synced news yet</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Configure API keys and run the backend sync process to populate today&apos;s feed.
              </p>
            </article>
          ) : (
            items.map((item) => (
              <article key={item._id} className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.category}</p>
                <h2 className="mt-2 text-lg font-semibold">{item.title}</h2>
                <p className="mt-3 text-sm text-muted-foreground">{item.summary}</p>
                <p className="mt-4 text-xs text-muted-foreground">
                  {item.source} · {new Date(item.publishedAt).toLocaleString()}
                </p>
              </article>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
