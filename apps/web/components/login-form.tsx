"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { API_BASE } from "../lib/api";
import { Alert } from "./ui/alert";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { PasswordInput } from "./ui/password-input";

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

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Unable to login");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Unable to reach server. Please make sure backend is running.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={`grid gap-5 ${loading ? "opacity-70" : ""}`}>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          required
          name="email"
          type="email"
          placeholder="m@example.com"
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Button type="button" variant="link" size="sm" className="h-auto px-0 text-sm text-muted-foreground hover:text-foreground">
            Forgot your password?
          </Button>
        </div>
        <PasswordInput
          id="password"
          required
          name="password"
          className="h-11"
        />
      </div>

      <AnimatePresence>
        {error ? (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            <Alert variant="destructive" title="Sign in failed" description={error} />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Button
        disabled={loading}
        className="h-11 w-full font-medium"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {loading ? "Signing in..." : "Sign in"}
      </Button>

      <div className="relative text-center text-sm text-muted-foreground before:absolute before:left-0 before:top-1/2 before:h-px before:w-full before:bg-border">
        <span className="relative bg-background px-2">Or continue with</span>
      </div>

      <Button
        type="button"
        variant="outline"
        className="h-11 w-full font-medium"
      >
        Single Sign-On
      </Button>

      <p className="text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-foreground hover:underline">
          Create one
        </Link>
      </p>
    </form>
  );
}
