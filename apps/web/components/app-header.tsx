"use client";

import { LogOut, Settings } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { API_BASE } from "../lib/api";
import { cn } from "../lib/cn";
import { Button } from "./ui/button";

const routes = [
  { href: "/dashboard", label: "Smart Feed" },
  { href: "/dashboard/ai-news-caster", label: "News Caster" },
  { href: "/dashboard/what-you-missed", label: "Sentiment" },
  { href: "/dashboard/truth-check", label: "Truth Check" },
  { href: "/dashboard/bias-detector", label: "Bias Detector" },
  { href: "/dashboard/trend-prediction", label: "Trend Engine" },
  { href: "/dashboard/community", label: "Community" }
];

type Props = {
  showLogout?: boolean;
  className?: string;
  overlay?: boolean;
};

export function AppHeader({ showLogout = true, className, overlay = false }: Props) {
  const pathname = usePathname();

  async function logout() {
    await fetch(`${API_BASE}/api/auth/logout`, { method: "POST", credentials: "include" }).catch(() => undefined);
    window.location.href = "/login";
  }

  return (
    <header className={cn("sticky top-0 z-40 h-[var(--header-height)] border-b border-border bg-background text-foreground", className)}>
      <div className="flex h-full w-full items-center gap-3 px-6">
        <Link href="/dashboard" className="flex shrink-0 items-center gap-2">
          <Image src="/logo.svg" alt="Newslytic logo" width={34} height={34} />
          <span className="hidden text-xl font-bold sm:inline">Newslytic</span>
        </Link>
        <nav className="ml-auto flex min-w-0 items-center gap-4 overflow-x-auto">
          {routes.map((route) => {
            const active = route.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(route.href);
            return (
              <Link
                key={route.href}
                href={route.href}
                className={`shrink-0 text-sm font-medium transition ${
                  overlay
                    ? active
                      ? "text-primary"
                      : "text-foreground/80 hover:text-foreground hover:underline hover:underline-offset-4"
                    : active
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground hover:underline hover:underline-offset-4"
                }`}
              >
                {route.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-2 flex shrink-0 items-center gap-2">
          <Link href="/dashboard/settings">
            <Button
              variant={pathname.startsWith("/dashboard/settings") ? "default" : "outline"}
              size="icon"
              aria-label="Open settings"
            >
              <Settings />
            </Button>
          </Link>
          {showLogout ? (
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
