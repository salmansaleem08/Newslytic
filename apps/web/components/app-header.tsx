"use client";

import { LogOut, Moon, Sun } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { API_BASE } from "../lib/api";
import { Button } from "./ui/button";

const routes = [
  { href: "/dashboard", label: "Smart Feed" },
  { href: "/dashboard/ai-news-caster", label: "News Caster" },
  { href: "/dashboard/what-you-missed", label: "What You Missed" },
  { href: "/dashboard/truth-check", label: "Truth Check" },
  { href: "/dashboard/meme-decoder", label: "Meme Decoder" },
  { href: "/dashboard/community", label: "Community" }
];

type Props = {
  showLogout?: boolean;
};

export function AppHeader({ showLogout = true }: Props) {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(
    typeof window !== "undefined" ? document.documentElement.classList.contains("dark") : false
  );

  function toggleTheme() {
    const root = document.documentElement;
    const nextDark = !root.classList.contains("dark");
    root.classList.toggle("dark", nextDark);
    root.classList.toggle("light", !nextDark);
    root.style.colorScheme = nextDark ? "dark" : "light";
    localStorage.setItem("theme", nextDark ? "dark" : "light");
    setIsDark(nextDark);
  }

  async function logout() {
    await fetch(`${API_BASE}/api/auth/logout`, { method: "POST", credentials: "include" }).catch(() => undefined);
    window.location.href = "/login";
  }

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
        <div className="ml-2 flex shrink-0 items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
            {isDark ? <Sun /> : <Moon />}
          </Button>
          {showLogout ? (
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut />
              Logout
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
