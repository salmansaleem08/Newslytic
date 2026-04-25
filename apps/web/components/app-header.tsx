"use client";

import { LogOut, Menu, Settings, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  async function logout() {
    await fetch(`${API_BASE}/api/auth/logout`, { method: "POST", credentials: "include" }).catch(() => undefined);
    window.location.href = "/login";
  }

  const linkClass = (active: boolean) =>
    overlay
      ? active
        ? "text-primary"
        : "text-foreground/80 hover:text-foreground"
      : active
        ? "text-primary"
        : "text-muted-foreground hover:text-foreground";

  return (
    <header className={cn("sticky top-0 z-40 h-[var(--header-height)] border-b border-border bg-background text-foreground", className)}>
      <div className="flex h-full w-full items-center gap-2 px-3 sm:gap-3 sm:px-4 lg:px-6">
        <Link href="/dashboard" className="flex min-w-0 shrink-0 items-center gap-2">
          <Image src="/logo.svg" alt="Newslytic logo" width={34} height={34} className="shrink-0" />
          <span className="truncate text-lg font-bold sm:text-xl">Newslytic</span>
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center justify-end gap-1 overflow-x-auto lg:flex lg:gap-3 xl:gap-4" aria-label="Main">
          {routes.map((route) => {
            const active = route.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(route.href);
            return (
              <Link
                key={route.href}
                href={route.href}
                className={cn("shrink-0 whitespace-nowrap rounded-md px-2 py-1.5 text-sm font-medium transition xl:px-2.5", linkClass(active))}
              >
                {route.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Link href="/dashboard/settings">
            <Button
              variant={pathname.startsWith("/dashboard/settings") ? "default" : "outline"}
              size="icon"
              aria-label="Open settings"
              className="h-9 w-9 sm:h-10 sm:w-10"
            >
              <Settings className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
            </Button>
          </Link>
          {showLogout ? (
            <Button variant="outline" size="sm" onClick={logout} className="hidden h-9 px-2 sm:h-10 sm:px-3 md:inline-flex">
              <LogOut className="h-4 w-4" />
              <span className="hidden lg:inline">Logout</span>
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 sm:h-10 sm:w-10 lg:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[100] lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close menu" onClick={() => setMobileOpen(false)} />
          <nav
            className="absolute right-0 top-0 flex h-full w-[min(100%,20rem)] flex-col border-l border-border bg-background shadow-xl"
            aria-label="Mobile main"
          >
            <div className="flex h-[var(--header-height)] items-center justify-between border-b border-border px-3">
              <span className="text-sm font-semibold text-foreground">Menu</span>
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9" aria-label="Close menu" onClick={() => setMobileOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
              {routes.map((route) => {
                const active = route.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(route.href);
                return (
                  <Link
                    key={route.href}
                    href={route.href}
                    className={cn(
                      "rounded-lg px-3 py-3 text-base font-medium transition",
                      active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                    )}
                    onClick={() => setMobileOpen(false)}
                  >
                    {route.label}
                  </Link>
                );
              })}
            </div>
            {showLogout ? (
              <div className="border-t border-border p-3">
                <Button variant="outline" className="h-11 w-full justify-center gap-2" onClick={() => void logout()}>
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
            ) : null}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
