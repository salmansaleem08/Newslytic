"use client";

import { Camera, Loader2, UserRound } from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "../../../components/app-header";
import { Alert } from "../../../components/ui/alert";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Skeleton } from "../../../components/ui/skeleton";
import { Textarea } from "../../../components/ui/textarea";
import { API_BASE, fetchMe } from "../../../lib/api";

type ThemeChoice = "light" | "dark";

type LocalProfile = {
  bio: string;
  avatarUrl: string;
  theme: ThemeChoice;
};

const PROFILE_KEY = "newslytic.profile";

function getInitialTheme(): ThemeChoice {
  if (typeof window === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export default function SettingsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [theme, setTheme] = useState<ThemeChoice>("light");

  useEffect(() => {
    async function load() {
      const me = await fetchMe();
      if (!me) {
        window.location.href = "/login";
        return;
      }

      let local: LocalProfile | null = null;
      try {
        local = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "null") as LocalProfile | null;
      } catch {
        local = null;
      }

      setFirstName(me.firstName ?? "");
      setLastName(me.lastName ?? "");
      setEmail(me.email ?? "");
      setBio(local?.bio ?? "");
      setAvatarUrl(local?.avatarUrl ?? "");
      setTheme(local?.theme ?? getInitialTheme());
      setLoading(false);
    }

    load().catch(() => {
      window.location.href = "/login";
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const initials = useMemo(() => {
    const fullName = `${firstName} ${lastName}`.trim();
    if (!fullName) return "U";
    return fullName
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [firstName, lastName]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    const localData: LocalProfile = { bio, avatarUrl, theme };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(localData));

    try {
      const response = await fetch(`${API_BASE}/api/auth/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ firstName, lastName, bio, avatarUrl, theme })
      });

      if (response.ok) {
        setMessage("Profile saved successfully.");
      } else {
        setMessage("Saved locally. Server profile update endpoint is unavailable.");
      }
    } catch {
      setMessage("Saved locally. Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  function onAvatarSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be 5MB or less.");
      event.target.value = "";
      return;
    }

    setError("");
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setAvatarUrl(result);
    };
    reader.readAsDataURL(file);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <AppHeader />
        <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
          <div className="mb-6 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="w-full space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-36" />
                <Skeleton className="h-4 w-52" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-28 w-full" />
              </CardContent>
              <CardFooter className="border-t border-border pt-6">
                <Skeleton className="h-11 w-36" />
              </CardFooter>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-44" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-14 w-14 rounded-full" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border bg-muted focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Upload profile picture"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="Profile avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-base font-semibold text-foreground">{initials}</div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                <Camera className="h-5 w-5 text-white" />
              </div>
            </button>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-foreground">{`${firstName} ${lastName}`.trim() || "Unnamed user"}</p>
              <p className="truncate text-sm text-muted-foreground">{email}</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 text-sm font-medium text-primary hover:underline"
              >
                Change profile photo
              </button>
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onAvatarSelect} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Edit profile</CardTitle>
              <CardDescription>Manage your account details like social apps.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className={`grid gap-5 ${saving ? "opacity-70" : ""}`} id="settings-form">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" value={firstName} onChange={(event) => setFirstName(event.target.value)} className="h-11" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" value={lastName} onChange={(event) => setLastName(event.target.value)} className="h-11" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={email} readOnly disabled className="h-11" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                    placeholder="Tell people what you read, write, and care about."
                    className="min-h-28"
                    maxLength={240}
                  />
                  <p className="text-xs text-muted-foreground">{bio.length}/240</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="theme-toggle">Theme</Label>
                  <div className="flex items-center justify-between rounded-md border border-border bg-muted/20 p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Dark mode</p>
                      <p className="text-xs text-muted-foreground">Switch interface appearance</p>
                    </div>
                    <button
                      id="theme-toggle"
                      type="button"
                      role="switch"
                      aria-checked={theme === "dark"}
                      onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full border transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
                        theme === "dark" ? "border-primary bg-primary" : "border-border bg-muted"
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-background shadow-sm transition-transform ${
                          theme === "dark" ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </form>
            </CardContent>
            <CardFooter className="border-t border-border pt-6">
              <Button form="settings-form" type="submit" className="h-11 w-full sm:w-auto" disabled={saving}>
                {saving ? <Loader2 className="animate-spin" /> : null}
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Profile preview</CardTitle>
              <CardDescription>How your profile appears to other readers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="Profile avatar" className="h-14 w-14 rounded-full border border-border object-cover" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-muted text-sm font-semibold text-foreground">
                    {initials}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-foreground">{`${firstName} ${lastName}`.trim() || "Unnamed user"}</p>
                  <p className="text-sm text-muted-foreground">{email}</p>
                </div>
              </div>
              <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                {bio || "Add a short bio so others can understand your interests."}
              </div>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <UserRound className="h-4 w-4" />
                Theme: <span className="font-medium text-foreground capitalize">{theme}</span>
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-4 space-y-3">
          {message ? <Alert variant="success" title="Saved" description={message} /> : null}
          {error ? <Alert variant="destructive" title="Update failed" description={error} /> : null}
        </div>
      </main>
    </div>
  );
}
