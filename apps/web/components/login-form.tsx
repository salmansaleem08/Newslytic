"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { API_BASE } from "../lib/api";

export function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password })
    });

    setLoading(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Unable to login");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <form onSubmit={onSubmit} className={`grid gap-5 ${loading ? "opacity-70" : ""}`}>
      <div className="space-y-2">
        <label className="text-sm font-medium">Email</label>
        <input
          required
          name="email"
          type="email"
          placeholder="m@example.com"
          className="h-11 w-full rounded-md border border-input bg-transparent px-3 text-base outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Password</label>
          <button type="button" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
            Forgot your password?
          </button>
        </div>
        <input
          required
          name="password"
          type="password"
          className="h-11 w-full rounded-md border border-input bg-transparent px-3 text-base outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </div>

      <AnimatePresence>
        {error ? (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="rounded-md border border-secondary/50 bg-secondary/10 p-3 text-sm text-secondary"
          >
            {error}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <button
        disabled={loading}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {loading ? "Signing in..." : "Sign in"}
      </button>

      <div className="relative text-center text-sm text-muted-foreground">
        <span className="bg-background px-2">Or continue with</span>
      </div>

      <button
        type="button"
        className="inline-flex h-11 w-full items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium shadow-xs transition hover:bg-accent hover:text-accent-foreground"
      >
        Single Sign-On
      </button>

      <p className="text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-foreground hover:underline">
          Create one
        </Link>
      </p>
    </form>
  );
}
