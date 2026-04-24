"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const routes = [
  { href: "/dashboard/ai-news-caster", label: "News Caster" },
  { href: "/dashboard/what-you-missed", label: "What You Missed" },
  { href: "/dashboard/truth-check", label: "Truth Check" },
  { href: "/dashboard/meme-decoder", label: "Meme Decoder" },
  { href: "/dashboard/community", label: "Community" }
];

type Props = {
  rightSlot?: ReactNode;
};

export function AppHeader({ rightSlot }: Props) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background text-foreground">
      <div className="flex w-full items-center gap-3 px-6 py-3">
        <Link href="/dashboard" className="flex shrink-0 items-center gap-2">
          <Image src="/logo.svg" alt="Newslytic logo" width={34} height={34} />
          <span className="text-xl font-bold">Newslytic</span>
        </Link>
        <nav className="ml-auto flex min-w-0 items-center gap-4 overflow-x-auto">
          {routes.map((route) => {
            const active = pathname.startsWith(route.href);
            return (
              <Link
                key={route.href}
                href={route.href}
                className={`shrink-0 text-sm font-medium transition ${active ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {route.label}
              </Link>
            );
          })}
        </nav>
        {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
      </div>
    </header>
  );
}
