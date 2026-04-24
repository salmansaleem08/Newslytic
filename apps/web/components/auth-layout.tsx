"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function AuthLayout({ title, subtitle, children }: Props) {
  return (
    <div className="h-screen bg-background text-foreground">
      <div className="grid h-full grid-cols-1 lg:grid-cols-2">
        <div className="flex flex-col overflow-y-auto bg-background">
          <div className="p-8">
            <Link href="/" className="inline-flex items-center gap-3">
              <Image src="/logo.svg" alt="Newslytic logo" width={48} height={48} priority />
              <span className="text-xl font-bold">Newslytic</span>
            </Link>
          </div>

          <div className="flex flex-1 items-center justify-center px-8 pb-8">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="w-full max-w-md"
            >
              <h2 className="mb-2 text-2xl font-bold">{title}</h2>
              <p className="mb-6 text-muted-foreground">{subtitle}</p>
              {children}
            </motion.div>
          </div>
        </div>

        <div className="hidden overflow-y-auto bg-slate-900 text-white lg:flex">
          <div className="space-y-6 p-10 pb-6">
            <motion.h3
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="text-3xl font-bold"
            >
              Alumni Stories
            </motion.h3>
            <p className="mt-2 text-white/60">Trusted by readers who want signal over noise.</p>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                <p className="text-4xl font-bold text-blue-300">10x</p>
                <p className="mt-1 text-white/60">Faster daily briefing</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                <p className="text-4xl font-bold text-blue-300">95%</p>
                <p className="mt-1 text-white/60">Lower news overwhelm</p>
              </div>
            </div>

            <Card className="border-white/10 bg-white/5 text-white shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Trustpilot</CardTitle>
                <CardDescription className="text-white/60">What our early users say</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="rounded-md border border-white/10 bg-black/15 p-3 text-white/80">
                  &quot;I finally understand world events in 5 minutes every morning.&quot;
                </p>
                <p className="rounded-md border border-white/10 bg-black/15 p-3 text-white/80">
                  &quot;Newslytic reduces noise and keeps me focused on what matters.&quot;
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
