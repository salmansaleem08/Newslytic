import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <div>
            <p className="text-xl font-bold">Newslytic</p>
            <p className="text-sm text-muted-foreground">Stay ahead of the curve, not under the noise.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium shadow-xs transition hover:bg-accent hover:text-accent-foreground"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8">
        <section className="rounded-xl border border-border bg-card p-8 shadow-sm">
          <h1 className="text-4xl font-bold leading-tight">News that moves your day forward</h1>
          <p className="mt-2 text-muted-foreground">
            Personalized briefings, trust signals, and rapid context so you stay informed without overload.
          </p>
          <div className="mt-6 flex gap-3">
            <Link
              href="/signup"
              className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              Create account
            </Link>
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-background px-6 text-sm font-medium shadow-xs transition hover:bg-accent hover:text-accent-foreground"
            >
              Sign in
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[
            ["Smart News Feed", "Top stories updated throughout the day with concise summaries."],
            ["Truth-Check Assistant", "Quick credibility checks for headlines and claims."],
            ["What You Missed", "Catch important updates since your last visit in seconds."]
          ].map(([title, desc]) => (
            <article key={title} className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="mt-3 text-sm text-muted-foreground">{desc}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
