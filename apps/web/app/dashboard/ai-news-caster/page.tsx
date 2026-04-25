"use client";

import { Pause, Play, Radio, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "../../../components/app-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Skeleton } from "../../../components/ui/skeleton";
import { API_BASE } from "../../../lib/api";

type Segment = {
  heading: string;
  narration: string;
  imageUrl: string;
  source: string;
};

type ScriptPayload = {
  dayKey: string;
  cycleKey?: string;
  voice: string;
  intro: string;
  outro: string;
  segments: Segment[];
  sections: Array<{
    kind: "intro" | "segment" | "outro";
    heading: string;
    text: string;
    imageUrl: string;
    source: string;
    audioUrl: string;
  }>;
};

type HistoryItem = {
  id: string;
  dayKey: string;
  cycleKey?: string;
  voice: string;
  audioUrl: string;
  segmentCount: number;
};

function cleanNarrationText(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^\s*headline\s*:\s*/gim, "")
    .replace(/^\s*summary\s*:\s*/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function fetchJsonWithRetry<T>(url: string, init: RequestInit = {}, attempts = 3): Promise<T> {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, init);
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      return (await response.json()) as T;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 600 * attempt));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Failed to fetch");
}

export default function AiNewsCasterPage() {
  const DEFAULT_VOICE = "en-US-ChristopherNeural";
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [playerNotice, setPlayerNotice] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeClipIndex, setActiveClipIndex] = useState(0);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);
  const [script, setScript] = useState<ScriptPayload | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [voices, setVoices] = useState<string[]>([DEFAULT_VOICE]);
  const [selectedVoice, setSelectedVoice] = useState(DEFAULT_VOICE);
  const [failedImageUrls, setFailedImageUrls] = useState<Record<string, true>>({});
  const [selectedHistoryId, setSelectedHistoryId] = useState<string>("");

  const loadCasterData = useCallback(async (voice: string) => {
    setLoading(true);
    setLoadError("");
    setPlayerNotice("");

    const scriptController = new AbortController();
    const scriptTimeoutMs = 240_000;
    const scriptTimeoutId = window.setTimeout(() => scriptController.abort(), scriptTimeoutMs);

    try {
      const scriptUrl = `${API_BASE}/api/news-caster/today?voice=${encodeURIComponent(voice)}`;
      const [voicesData, scriptData, historyData] = await Promise.all([
        fetchJsonWithRetry<{ voices: string[] }>(`${API_BASE}/api/news-caster/voices`, { cache: "no-store" }),
        fetchJsonWithRetry<{ script: ScriptPayload }>(scriptUrl, { cache: "no-store", signal: scriptController.signal }),
        fetchJsonWithRetry<{ history: HistoryItem[] }>(`${API_BASE}/api/news-caster/history`, { cache: "no-store" })
      ]);

      if (voicesData.voices.length > 0) setVoices(voicesData.voices);
      setScript(scriptData.script);
      setSelectedVoice(scriptData.script.voice);
      setSelectedHistoryId("");
      setActiveClipIndex(0);
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
      setShouldAutoPlay(false);

      setHistory(historyData.history);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setLoadError(
          "Loading timed out while generating audio. Try again in a minute, or open News Caster again once the server has finished preparing clips."
        );
      } else {
        setLoadError(err instanceof Error ? err.message : "Unable to load AI News Caster");
      }
    } finally {
      window.clearTimeout(scriptTimeoutId);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCasterData(DEFAULT_VOICE);
  }, [loadCasterData]);

  const sections = script?.sections ?? [];
  const firstPlayableSectionIndex = useMemo(() => sections.findIndex((section) => Boolean(section.audioUrl)), [sections]);
  const activeSection = sections[activeClipIndex];
  const isIntroPhase = activeSection?.kind === "intro";
  const audioSrc = activeSection
    ? activeSection.audioUrl.startsWith("http://") || activeSection.audioUrl.startsWith("https://")
      ? activeSection.audioUrl
      : `${API_BASE}${activeSection.audioUrl}`
    : "";

  useEffect(() => {
    if (!sections.length) return;
    if (firstPlayableSectionIndex > -1) {
      setActiveClipIndex(firstPlayableSectionIndex);
    } else {
      setActiveClipIndex(0);
    }
  }, [firstPlayableSectionIndex, sections.length]);

  function onTogglePlayback() {
    const node = audioRef.current;
    if (!node || !activeSection) return;
    if (!audioSrc) {
      if ("speechSynthesis" in window) {
        if (isPlaying) {
          window.speechSynthesis.cancel();
          setIsPlaying(false);
          setShouldAutoPlay(false);
          return;
        }
        const utterance = new SpeechSynthesisUtterance(activeSection.text);
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.onend = () => moveToNextPlayableSegment();
        utterance.onerror = () => {
          setIsPlaying(false);
          setShouldAutoPlay(false);
          setPlayerNotice("Audio file unavailable, and browser speech fallback failed for this segment.");
        };
        speechRef.current = utterance;
        setPlayerNotice("Server audio unavailable. Using browser speech fallback.");
        setIsPlaying(true);
        setShouldAutoPlay(true);
        window.speechSynthesis.speak(utterance);
        return;
      }
      setPlayerNotice("No playable audio clip was generated for this broadcast yet. Please refresh or switch voice.");
      return;
    }

    if (node.paused) {
      setShouldAutoPlay(true);
      void node.play();
      setIsPlaying(true);
    } else {
      node.pause();
      setIsPlaying(false);
      setShouldAutoPlay(false);
    }
  }

  function moveToNextPlayableSegment(): void {
    const nextIndex = sections.findIndex((section, idx) => idx > activeClipIndex && Boolean(section.audioUrl));
    if (nextIndex > -1) {
      setShouldAutoPlay(true);
      setActiveClipIndex(nextIndex);
      return;
    }
    setIsPlaying(false);
    setShouldAutoPlay(false);
    setPlayerNotice("Audio source is unavailable for this segment. Please try another broadcast/voice.");
  }

  async function loadHistoryScript(historyId: string) {
    try {
      setLoading(true);
      setLoadError("");
      setPlayerNotice("");
      const data = await fetchJsonWithRetry<{ script: ScriptPayload }>(`${API_BASE}/api/news-caster/script/${encodeURIComponent(historyId)}`, { cache: "no-store" });
      setScript(data.script);
      setPlayerNotice("");
      setSelectedVoice(data.script.voice);
      setSelectedHistoryId(historyId);
      const firstPlayable = data.script.sections.findIndex((section) => Boolean(section.audioUrl));
      setActiveClipIndex(firstPlayable > -1 ? firstPlayable : 0);
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
      setShouldAutoPlay(false);
      if (audioRef.current) audioRef.current.pause();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Unable to load selected broadcast");
    } finally {
      setLoading(false);
    }
  }

  const currentCaption = useMemo(() => {
    if (!activeSection) return "";
    const clean = cleanNarrationText(activeSection.text);
    if (!duration) return clean;
    const words = clean.split(/\s+/).filter(Boolean);
    const progress = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;
    const shownWords = Math.max(1, Math.floor(words.length * progress));
    return words.slice(0, shownWords).join(" ");
  }, [activeSection, currentTime, duration]);

  function jumpBy(seconds: number) {
    const node = audioRef.current;
    if (!node || !duration) return;
    const next = Math.min(duration, Math.max(0, node.currentTime + seconds));
    node.currentTime = next;
    setCurrentTime(next);
  }

  useEffect(() => {
    const node = audioRef.current;
    if (!node) return;
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    node.load();
    setCurrentTime(0);
    setDuration(0);
    if (shouldAutoPlay) {
      void node.play();
    }
  }, [audioSrc, shouldAutoPlay]);

  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold sm:text-3xl">AI News Caster</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Structured daily narration of top stories with professional visual broadcast flow.
          </p>
        </div>

        {loading ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)]">
            <Card>
              <CardContent className="p-0">
                <Skeleton className="aspect-[16/9] w-full rounded-b-none rounded-t-xl" />
                <div className="space-y-3 p-6">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-4 w-40" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          </div>
        ) : loadError ? (
          <Card>
            <CardHeader>
              <CardTitle>AI News Caster unavailable</CardTitle>
              <CardDescription>{loadError}</CardDescription>
            </CardHeader>
          </Card>
        ) : script ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)]">
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="relative aspect-[16/9] w-full bg-muted">
                  {isIntroPhase ? (
                    <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_center,_hsl(var(--primary)/0.25),_transparent_58%),linear-gradient(120deg,#0b1021_0%,#111827_50%,#0b1021_100%)] p-6">
                      <div className="max-w-2xl text-center">
                        <p className="text-xs uppercase tracking-[0.2em] text-white/70 sm:text-sm">Newslytic Broadcast</p>
                        <h2 className="mt-3 text-2xl font-bold text-white sm:text-4xl">AI News Caster Daily Briefing</h2>
                        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-white/80 sm:text-base">
                          Engaging, structured updates from today&apos;s top stories. Stay with the broadcast as each story appears with live narration.
                        </p>
                      </div>
                    </div>
                  ) : activeSection?.imageUrl && !failedImageUrls[activeSection.imageUrl] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={activeSection.imageUrl}
                      alt={activeSection.heading}
                      className="h-full w-full object-cover"
                      onError={() => {
                        setFailedImageUrls((prev) => ({ ...prev, [activeSection.imageUrl]: true }));
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_center,_hsl(var(--primary)/0.18),_transparent_62%),linear-gradient(120deg,#0b1021_0%,#111827_50%,#0b1021_100%)] p-6 text-center">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-white/70">Newslytic</p>
                        <p className="mt-2 text-sm font-semibold text-white">{activeSection?.heading ?? "Breaking story"}</p>
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 space-y-2 p-4 sm:p-6">
                    <p className="text-xs uppercase tracking-[0.12em] text-primary-foreground/80">{isIntroPhase ? "Broadcast Intro" : "Now Narrating"}</p>
                    <h2 className="line-clamp-2 text-lg font-bold text-white sm:text-2xl">
                      {isIntroPhase ? "Welcome to the Daily AI News Caster" : activeSection?.heading}
                    </h2>
                    <p className="line-clamp-3 text-sm leading-6 text-white/90 sm:text-base">{currentCaption}</p>
                    {!isIntroPhase ? <p className="text-xs text-white/70">Source: {activeSection?.source}</p> : null}
                  </div>
                </div>

                <div className="space-y-4 p-4 sm:p-6">
                  {playerNotice ? <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">{playerNotice}</p> : null}
                  <audio
                    ref={audioRef}
                    src={audioSrc}
                    preload="metadata"
                    onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
                    onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => {
                      if (!script || sections.length === 0) {
                        setIsPlaying(false);
                        setShouldAutoPlay(false);
                        return;
                      }
                      moveToNextPlayableSegment();
                    }}
                    onError={() => {
                      moveToNextPlayableSegment();
                    }}
                  />
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => jumpBy(-10)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-foreground transition hover:bg-accent hover:text-accent-foreground"
                      aria-label="Back 10 seconds"
                    >
                      <SkipBack className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={onTogglePlayback}
                      className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition hover:bg-primary/90"
                      aria-label={isPlaying ? "Pause broadcast" : "Play broadcast"}
                    >
                      {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => jumpBy(10)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-foreground transition hover:bg-accent hover:text-accent-foreground"
                      aria-label="Forward 10 seconds"
                    >
                      <SkipForward className="h-4 w-4" />
                    </button>
                    <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <Volume2 className="h-4 w-4" />
                      <span>{script.voice}</span>
                    </div>
                    <div className="ml-auto">
                      <select
                        value={selectedVoice}
                        onChange={(event) => {
                          const nextVoice = event.target.value;
                          setSelectedVoice(nextVoice);
                          if (audioRef.current) {
                            audioRef.current.pause();
                          }
                          setShouldAutoPlay(false);
                          void loadCasterData(nextVoice);
                        }}
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        aria-label="Select speaker voice"
                      >
                        {voices.map((voice) => (
                          <option key={voice} value={voice}>
                            {voice}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Broadcast Desk</CardTitle>
                  <CardDescription>Live channel information and presenter controls.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-md border border-border bg-card p-3 text-sm">
                    <p className="flex items-center gap-2 font-medium text-foreground">
                      <Radio className="h-4 w-4 text-primary" />
                      Live status: {isPlaying ? "On Air" : "Standby"}
                    </p>
                    <p className="mt-1 text-muted-foreground">Active voice: {selectedVoice}</p>
                  </div>
                  <div className="rounded-md border border-border bg-card p-3 text-sm">
                    <p className="font-medium text-foreground">Current segment</p>
                    <p className="mt-1 text-muted-foreground">
                      {isIntroPhase ? "Introductory segment in progress" : `Story ${Math.max(1, activeClipIndex)} of ${script.segments.length}`}
                    </p>
                  </div>
                  <div className="rounded-md border border-border bg-card p-3 text-sm">
                    <p className="font-medium text-foreground">Control tip</p>
                    <p className="mt-1 text-muted-foreground">Use back/forward buttons to fine-tune the narration position during playback.</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Last 10 Days</CardTitle>
                  <CardDescription>Stored scripts and generated narration audio.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {history.map((entry) => (
                    <button
                      type="button"
                      key={entry.id}
                      onClick={() => {
                        void loadHistoryScript(entry.id);
                      }}
                      className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                        selectedHistoryId === entry.id
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:border-primary/50"
                      }`}
                    >
                      <p className="font-medium text-foreground">
                        {entry.dayKey} {entry.cycleKey ? `• ${entry.cycleKey.split("-").pop()?.toUpperCase()}` : ""}
                      </p>
                      <p className="text-muted-foreground">{entry.segmentCount} headlines scripted • {entry.voice}</p>
                    </button>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
