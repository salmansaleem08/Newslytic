"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { API_BASE } from "../lib/api";

export function SignupForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const payload = {
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      password: String(formData.get("password") ?? "")
    };

    const response = await fetch(`${API_BASE}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload)
    });

    setLoading(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Unable to create account");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <form onSubmit={onSubmit} className={`grid gap-5 ${loading ? "opacity-70" : ""}`}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">First Name</label>
          <input
            required
            name="firstName"
            className="h-11 w-full rounded-md border border-input bg-transparent px-3 text-base outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Last Name</label>
          <input
            required
            name="lastName"
            className="h-11 w-full rounded-md border border-input bg-transparent px-3 text-base outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </div>
      </div>

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
        <label className="flex items-center gap-2 text-sm font-medium">
          Phone Number <span className="text-xs text-muted-foreground">Detected: +92</span>
        </label>
        <input
          required
          name="phone"
          type="tel"
          placeholder="123 456 7890"
          className="h-11 w-full rounded-md border border-input bg-transparent px-3 text-base outline-none transition focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Password</label>
        <input
          required
          name="password"
          type="password"
          minLength={8}
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
        {loading ? "Creating account..." : "Create account"}
      </button>

      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
