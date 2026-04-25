import { promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { v2 as cloudinary } from "cloudinary";
import { env } from "../config.js";
import { NewsCasterScriptModel } from "../models/news-caster-script.js";
import { NewsItemModel } from "../models/news-item.js";

type ScriptSegment = {
  heading: string;
  narration: string;
  imageUrl: string;
  source: string;
};

type CasterPayload = {
  dayKey: string;
  cycleKey: string;
  voice: string;
  intro: string;
  outro: string;
  segments: ScriptSegment[];
  sections: Array<{
    kind: "intro" | "segment" | "outro";
    heading: string;
    text: string;
    imageUrl: string;
    source: string;
    audioUrl: string;
  }>;
};

const STORAGE_ROOT = path.resolve(process.cwd(), "storage", "news-caster");
const PY_TTS_SCRIPT = path.resolve(process.cwd(), "src", "scripts", "edge_tts_generate.py");
let indexesEnsured = false;
const cloudinaryEnabled = Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
let lastGenerationReport: {
  generatedAt: string;
  dayKey: string;
  cycleKey: string;
  voice: string;
  totalSections: number;
  playableSections: number;
  failures: Array<{ index: number; heading: string; error: string }>;
} | null = null;

if (cloudinaryEnabled) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true
  });
}
export const NEWS_CASTER_VOICES = [
  "en-US-ChristopherNeural",
  "en-US-GuyNeural",
  "en-US-AriaNeural",
  "en-GB-RyanNeural",
  "en-AU-NatashaNeural"
] as const;

async function ensureCasterIndexes(): Promise<void> {
  if (indexesEnsured) return;
  try {
    await NewsCasterScriptModel.collection.dropIndex("dayKey_1");
  } catch {
    // Ignore if index does not exist.
  }
  await NewsCasterScriptModel.syncIndexes().catch(() => undefined);
  indexesEnsured = true;
}

function getDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function getCycleKey(date = new Date()): string {
  const dayKey = getDayKey(date);
  const cycleHour = Math.floor(date.getUTCHours() / 4) * 4;
  return `${dayKey}-h${String(cycleHour).padStart(2, "0")}`;
}

function isRemoteAsset(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

async function uploadCasterAudioToCloudinary(localPath: string, publicId: string): Promise<string> {
  if (!cloudinaryEnabled) return localPath;
  const uploaded = await cloudinary.uploader.upload(localPath, {
    resource_type: "video",
    folder: env.CLOUDINARY_FOLDER,
    public_id: publicId,
    overwrite: true
  });
  return uploaded.secure_url;
}

async function checkCloudinaryConnectivity(): Promise<{ ok: boolean; message: string }> {
  if (!cloudinaryEnabled) return { ok: false, message: "Cloudinary env vars are not fully configured." };
  try {
    await cloudinary.api.ping();
    return { ok: true, message: "Cloudinary API ping successful." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Cloudinary API ping failed."
    };
  }
}

async function runEdgeTts(text: string, outputPath: string, voice: string): Promise<void> {
  await fs.mkdir(STORAGE_ROOT, { recursive: true });
  const tempTextPath = path.join(STORAGE_ROOT, `tts-input-${Date.now()}.txt`);
  await fs.writeFile(tempTextPath, text, "utf-8");

  await new Promise<void>((resolve, reject) => {
    const pythonBin = env.TTS_PYTHON_BIN_NEWS_CASTER || env.TTS_PYTHON_BIN;
    const proc = spawn(pythonBin, [PY_TTS_SCRIPT, "--input", tempTextPath, "--output", outputPath, "--voice", voice], {
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stderr = "";
    proc.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    proc.on("error", (error) => {
      reject(error);
    });

    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `edge-tts exited with code ${code}`));
    });
  }).finally(async () => {
    await fs.rm(tempTextPath, { force: true });
  });
}

async function pruneScriptHistory(): Promise<void> {
  const dayKeys = await NewsCasterScriptModel.distinct("dayKey");
  const sortedDays = [...dayKeys].sort().reverse();
  if (sortedDays.length <= 10) return;
  const removeDays = sortedDays.slice(10);
  const toDelete = await NewsCasterScriptModel.find({ dayKey: { $in: removeDays } })
    .select({ _id: 1, audioPath: 1, sections: 1 })
    .lean();
  await NewsCasterScriptModel.deleteMany({ _id: { $in: toDelete.map((x) => x._id) } });
  await Promise.all(
    toDelete.map(async (entry) => {
      const cleanupTargets = [
        ...(entry.audioPath ? [entry.audioPath] : []),
        ...((entry.sections ?? []).map((section) => section.audioPath).filter(Boolean) as string[])
      ];
      await Promise.all(
        cleanupTargets.map(async (targetPath) => {
          if (!targetPath || isRemoteAsset(targetPath)) return;
          const abs = path.resolve(process.cwd(), targetPath);
          await fs.rm(abs, { force: true }).catch(() => undefined);
        })
      );
    })
  );
}

async function hasPlayableSections(
  sections: Array<{
    audioPath: string;
  }>
): Promise<boolean> {
  const firstPlayable = sections.find((section) => Boolean(section.audioPath || ""));
  if (!firstPlayable) return false;
  if (isRemoteAsset(firstPlayable.audioPath)) return true;
  const absolute = path.resolve(process.cwd(), firstPlayable.audioPath);
  try {
    await fs.access(absolute);
    return true;
  } catch {
    return false;
  }
}

function buildSegments(items: Array<{ title: string; summary: string; imageUrl: string; source: string }>): ScriptSegment[] {
  return items.map((item) => ({
    heading: item.title,
    narration: item.summary,
    imageUrl: item.imageUrl,
    source: item.source
  }));
}

function toResponse(doc: {
  dayKey: string;
  cycleKey?: string;
  voice: string;
  intro: string;
  outro: string;
  segments: ScriptSegment[];
  sections: Array<{
    kind: "intro" | "segment" | "outro";
    heading?: string;
    text: string;
    imageUrl?: string;
    source?: string;
    audioPath: string;
  }>;
}): CasterPayload {
  return {
    dayKey: doc.dayKey,
    cycleKey: doc.cycleKey ?? `${doc.dayKey}-h00`,
    voice: doc.voice,
    intro: doc.intro,
    outro: doc.outro,
    segments: doc.segments,
    sections: doc.sections.map((section) => {
      const rawPath = section.audioPath || "";
      const fileName = path.basename(rawPath);
      return {
        kind: section.kind,
        heading: section.heading ?? "",
        text: section.text,
        imageUrl: section.imageUrl ?? "",
        source: section.source ?? "",
        audioUrl: !rawPath ? "" : isRemoteAsset(rawPath) ? rawPath : fileName ? `/media/news-caster/${fileName}` : ""
      };
    })
  };
}

export async function getCasterHistory(): Promise<Array<{ dayKey: string; voice: string; audioUrl: string; segmentCount: number; createdAt?: Date }>> {
  await ensureCasterIndexes();
  const rows = await NewsCasterScriptModel.find({})
    .sort({ createdAt: -1 })
    .select({ dayKey: 1, cycleKey: 1, voice: 1, audioPath: 1, sections: 1, segments: 1, createdAt: 1 })
    .lean();
  return rows.map((row) => ({
    id: String(row._id),
    dayKey: row.dayKey,
    cycleKey: row.cycleKey ?? `${row.dayKey}-h00`,
    voice: row.voice,
    audioUrl: row.sections?.[0]?.audioPath
      ? isRemoteAsset(row.sections[0].audioPath)
        ? row.sections[0].audioPath
        : `/media/news-caster/${path.basename(row.sections[0].audioPath)}`
      : isRemoteAsset(row.audioPath || "")
        ? String(row.audioPath || "")
        : `/media/news-caster/${path.basename(row.audioPath || "")}`,
    segmentCount: row.segments.length,
    createdAt: row.createdAt
  }));
}

export async function getCasterScriptById(id: string): Promise<CasterPayload | null> {
  await ensureCasterIndexes();
  const doc = await NewsCasterScriptModel.findById(id).lean();
  if (!doc || !doc.sections?.length) return null;
  return toResponse(doc as never);
}

export async function getNewsCasterDiagnostics(): Promise<{
  cloudinaryEnabled: boolean;
  cloudinary: { ok: boolean; message: string };
  tts: { pythonBin: string; scriptPath: string };
  latestScript: null | {
    id: string;
    dayKey: string;
    cycleKey: string;
    voice: string;
    sections: number;
    playableSections: number;
    createdAt?: string;
  };
  lastGenerationReport: typeof lastGenerationReport;
}> {
  await ensureCasterIndexes();
  const cloudinaryStatus = await checkCloudinaryConnectivity();
  const latest = await NewsCasterScriptModel.findOne({})
    .sort({ createdAt: -1 })
    .select({ dayKey: 1, cycleKey: 1, voice: 1, sections: 1, createdAt: 1 })
    .lean();

  return {
    cloudinaryEnabled,
    cloudinary: cloudinaryStatus,
    tts: {
      pythonBin: env.TTS_PYTHON_BIN_NEWS_CASTER || env.TTS_PYTHON_BIN,
      scriptPath: PY_TTS_SCRIPT
    },
    latestScript: latest
      ? {
          id: String(latest._id),
          dayKey: latest.dayKey,
          cycleKey: latest.cycleKey,
          voice: latest.voice,
          sections: latest.sections?.length ?? 0,
          playableSections: (latest.sections ?? []).filter((section) => Boolean(section.audioPath)).length,
          createdAt: latest.createdAt?.toISOString()
        }
      : null,
    lastGenerationReport
  };
}

export async function getOrCreateTodayCasterScript(requestedVoice?: string): Promise<CasterPayload> {
  await ensureCasterIndexes();
  const now = new Date();
  const dayKey = getDayKey(now);
  const cycleKey = getCycleKey(now);
  const voice = NEWS_CASTER_VOICES.includes((requestedVoice || env.TTS_VOICE) as (typeof NEWS_CASTER_VOICES)[number])
    ? (requestedVoice || env.TTS_VOICE)
    : env.TTS_VOICE;
  let existing = await NewsCasterScriptModel.findOne({ dayKey, cycleKey, voice }).lean();
  if (existing && existing.sections && existing.sections.length > 0 && (await hasPlayableSections(existing.sections as Array<{ audioPath: string }>))) {
    return toResponse(existing as never);
  }

  // Same calendar day but different 4h cycle: reuse latest script so the client does not wait on cold TTS again.
  existing = await NewsCasterScriptModel.findOne({ dayKey, voice, "sections.0": { $exists: true } })
    .sort({ createdAt: -1 })
    .lean();
  if (existing && existing.sections && existing.sections.length > 0 && (await hasPlayableSections(existing.sections as Array<{ audioPath: string }>))) {
    return toResponse(existing as never);
  }

  const todayItems = await NewsItemModel.find({ dayKey })
    .sort({ relevanceScore: -1, publishedAt: -1 })
    .lean();

  const casterCandidates = todayItems.slice(15, 25);
  const fallback = todayItems.slice(0, 10);
  const selected = (casterCandidates.length >= 10 ? casterCandidates : fallback).slice(0, 10);
  if (selected.length === 0) {
    throw new Error("No news available for caster script");
  }

  const dateLabel = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const intro = `Good day. This is your AI News Caster briefing for ${dateLabel}. Here are ten important stories in a clear sequence.`;
  const outro = "That concludes your daily briefing. Stay informed, stay thoughtful, and I will see you in the next update.";
  const segments = buildSegments(
    selected.map((item) => ({
      title: item.title,
      summary: item.summary,
      imageUrl: item.imageUrl || "",
      source: item.source
    }))
  );

  const safeVoice = voice.replace(/[^a-zA-Z0-9-_]/g, "_");
  const sections = [
    {
      kind: "intro" as const,
      heading: "Welcome to the Daily AI News Caster",
      text: intro,
      imageUrl: "",
      source: ""
    },
    ...segments.map((segment) => ({
      kind: "segment" as const,
      heading: segment.heading,
      text: segment.narration,
      imageUrl: segment.imageUrl,
      source: segment.source
    })),
    {
      kind: "outro" as const,
      heading: "Broadcast Complete",
      text: outro,
      imageUrl: "",
      source: ""
    }
  ];

  const CONCURRENCY = 4;
  const sectionsWithAudio: Array<(typeof sections)[number] & { audioPath: string }> = new Array(sections.length);
  const failures: Array<{ index: number; heading: string; error: string }> = [];
  let nextSectionIndex = 0;
  async function ttsWorker(): Promise<void> {
    for (;;) {
      const index = nextSectionIndex;
      nextSectionIndex += 1;
      if (index >= sections.length) return;
      const section = sections[index];
      const fileName = `caster-${cycleKey}-${safeVoice}-part-${index + 1}.mp3`;
      const absoluteAudioPath = path.join(STORAGE_ROOT, fileName);
      try {
        await runEdgeTts(section.text, absoluteAudioPath, voice);
        const publicId = `${cycleKey}-${safeVoice}-part-${index + 1}`;
        const persistedAudioPath = await uploadCasterAudioToCloudinary(absoluteAudioPath, publicId);
        if (cloudinaryEnabled) {
          await fs.rm(absoluteAudioPath, { force: true }).catch(() => undefined);
        }
        sectionsWithAudio[index] = {
          ...section,
          audioPath: persistedAudioPath
        };
      } catch (error) {
        console.error("News caster TTS segment generation failed:", error);
        failures.push({
          index,
          heading: section.heading || section.kind,
          error: error instanceof Error ? error.message : "Unknown TTS/upload failure"
        });
        sectionsWithAudio[index] = {
          ...section,
          audioPath: ""
        };
      }
    }
  }
  const poolSize = Math.min(CONCURRENCY, sections.length);
  await Promise.all(Array.from({ length: poolSize }, () => ttsWorker()));
  const firstPlayable = sectionsWithAudio.find((section) => Boolean(section.audioPath));
  const playableSections = sectionsWithAudio.filter((section) => Boolean(section.audioPath)).length;
  lastGenerationReport = {
    generatedAt: new Date().toISOString(),
    dayKey,
    cycleKey,
    voice,
    totalSections: sectionsWithAudio.length,
    playableSections,
    failures
  };
  const primaryAudioPath = firstPlayable?.audioPath ?? "";
  const created = await NewsCasterScriptModel.findOneAndUpdate(
    { dayKey, cycleKey, voice },
    {
      dayKey,
      cycleKey,
      voice,
      intro,
      outro,
      segments,
      sections: sectionsWithAudio,
      audioPath: primaryAudioPath
    },
    { upsert: true, new: true }
  );

  if (!created) throw new Error("Unable to store news caster script");

  await pruneScriptHistory();
  return toResponse(created.toObject() as never);
}
