import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";

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
              className="inline-flex"
            >
              <Button variant="outline">Sign in</Button>
            </Link>
            <Link
              href="/signup"
              className="inline-flex"
            >
              <Button>Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
        <Card className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-16 left-20 h-44 w-44 rounded-full bg-secondary/10 blur-2xl" />
          <CardHeader>
            <CardTitle className="text-4xl leading-tight">News that moves your day forward</CardTitle>
            <CardDescription className="max-w-2xl text-base">
              Personalized briefings, trust signals, and rapid context so you stay informed without overload.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Link href="/signup">
              <Button className="h-11 px-6">Create account</Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" className="h-11 px-6">
                Sign in
              </Button>
            </Link>
          </CardContent>
        </Card>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[
            ["Smart News Feed", "Top stories updated throughout the day with concise summaries."],
            ["Truth-Check Assistant", "Quick credibility checks for headlines and claims."],
            ["What You Missed", "Catch important updates since your last visit in seconds."]
          ].map(([title, desc]) => (
            <Card key={title}>
              <CardHeader>
                <CardTitle className="text-lg">{title}</CardTitle>
                <CardDescription>{desc}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>
      </main>
    </div>
  );
}
