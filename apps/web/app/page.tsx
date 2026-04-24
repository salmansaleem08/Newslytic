"use client";

import { motion } from "framer-motion";
import { ArrowRight, BadgeCheck, Newspaper, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

const features = [
  {
    title: "Smart News Feed",
    desc: "Top stories refreshed through the day with concise summaries and clearer context.",
    icon: Newspaper
  },
  {
    title: "Truth Signals",
    desc: "Credibility-first guidance to help you quickly separate facts from noisy claims.",
    icon: ShieldCheck
  },
  {
    title: "What You Missed",
    desc: "Highlights important updates since your last visit so you never lose momentum.",
    icon: BadgeCheck
  }
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="relative flex w-full flex-col gap-10 overflow-hidden py-14 md:py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="pointer-events-none absolute -left-28 top-12 h-64 w-64 rounded-full bg-primary/15 blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: "easeOut", delay: 0.1 }}
          className="pointer-events-none absolute -right-20 top-28 h-72 w-72 rounded-full bg-secondary/15 blur-3xl"
        />

        <section className="grid items-center gap-6 px-6 lg:grid-cols-2 lg:px-10 xl:px-14">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="space-y-5"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-xs">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              AI-powered intelligence for daily news
            </div>
            <h1 className="text-4xl font-bold leading-tight md:text-5xl">
              Stay informed with clarity,
              <span className="block text-primary">not information overload.</span>
            </h1>
            <p className="max-w-xl text-base text-muted-foreground">
              Newslytic turns breaking updates into focused insight with short summaries, trust signals, and context that
              helps you act faster.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/signup">
                <Button className="h-11 px-6">
                  Start for free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" className="h-11 px-6">
                  Sign in
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
          >
            <Card className="relative overflow-hidden">
              <div className="absolute -right-14 -top-14 h-36 w-36 rounded-full bg-primary/20 blur-2xl" />
              <CardHeader>
                <CardTitle className="text-xl">Today at a glance</CardTitle>
                <CardDescription>Signal-first briefing curated for your next decision.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  "Markets react to policy shift in Asia.",
                  "Global AI regulation talks enter final stage.",
                  "Energy prices stabilize after supply update."
                ].map((line, idx) => (
                  <motion.div
                    key={line}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + idx * 0.08, duration: 0.45 }}
                    className="rounded-md border border-border bg-background p-3 text-sm text-foreground shadow-xs"
                  >
                    {line}
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </section>

        <section className="grid gap-4 px-6 pb-2 md:grid-cols-2 lg:px-10 xl:grid-cols-3 xl:px-14">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: index * 0.08, duration: 0.45 }}
            >
              <Card className="h-full transition hover:-translate-y-1 hover:shadow-md">
                <CardHeader>
                  <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <feature.icon className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription>{feature.desc}</CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </section>
      </main>
    </div>
  );
}
