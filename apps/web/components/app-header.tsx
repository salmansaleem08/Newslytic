"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Button } from "./ui/button";

const routes = [
  { href: "/dashboard", label: "Smart Feed" },
  { href: "/dashboard/ai-news-caster", label: "7.2 AI News Caster" },
  { href: "/dashboard/what-you-missed", label: "7.3 What You Missed" },
  { href: "/dashboard/truth-check", label: "7.4 Truth-Check Chatbot" },
  { href: "/dashboard/meme-decoder", label: "7.5 Meme Decoder" },
  { href: "/dashboard/community", label: "7.6 Community" }
];

type Props = {
  rightSlot?: ReactNode;
};

export function AppHeader({ rightSlot }: Props) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
      <div className="flex w-full items-center gap-4 px-6 py-3">
        <Link href="/dashboard" className="shrink-0 text-xl font-bold text-foreground">
          Newslytic
        </Link>
        <nav className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
          {routes.map((route) => {
            const active = pathname === route.href;
            return (
              <Link key={route.href} href={route.href} className="shrink-0">
                <Button variant={active ? "default" : "outline"} size="sm" className="whitespace-nowrap">
                  {route.label}
                </Button>
              </Link>
            );
          })}
        </nav>
        <div className="shrink-0">{rightSlot}</div>
      </div>
    </header>
  );
}
