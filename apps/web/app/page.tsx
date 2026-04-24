import Link from "next/link";
import { Button } from "../components/ui/button";

const HIGHLIGHTS = [
  "AI News Caster with history playback",
  "Truth-check chatbot with confidence signals",
  "Community feed with comments and likes",
  "Sentiment, Bias, and Trend analytics"
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-4 py-10 sm:px-6">
        <p className="text-sm font-medium uppercase tracking-[0.12em] text-primary">Newslytic</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">
          Real-time news intelligence for people who want signal, not noise.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
          Track breaking narratives, verify claims, and follow momentum across global markets and categories with one unified platform.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild className="h-11 px-5">
            <Link href="/signup">Create Account</Link>
          </Button>
          <Button asChild variant="outline" className="h-11 px-5">
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild variant="ghost" className="h-11 px-5">
            <Link href="/dashboard">Open Dashboard</Link>
          </Button>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {HIGHLIGHTS.map((item) => (
            <div key={item} className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-card-foreground">
              {item}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
