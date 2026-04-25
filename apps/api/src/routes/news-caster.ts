import { Router } from "express";
import { NEWS_CASTER_VOICES, getCasterHistory, getCasterScriptById, getNewsCasterDiagnostics, getOrCreateTodayCasterScript } from "../services/news-caster.js";
import { runNewsSync } from "../services/news-sync.js";

export const newsCasterRouter = Router();

newsCasterRouter.get("/today", async (req, res) => {
  try {
    void runNewsSync({ force: false }).catch(() => undefined);
    const voice = req.query.voice ? String(req.query.voice) : undefined;
    const script = await getOrCreateTodayCasterScript(voice);
    return res.json({ script });
  } catch (error) {
    return res.status(500).json({
      error: "Unable to prepare AI news caster script",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

newsCasterRouter.get("/voices", (_req, res) => {
  return res.json({ voices: NEWS_CASTER_VOICES });
});

newsCasterRouter.get("/history", async (_req, res) => {
  const history = await getCasterHistory();
  return res.json({ history });
});

newsCasterRouter.get("/script/:id", async (req, res) => {
  const script = await getCasterScriptById(req.params.id);
  if (!script) return res.status(404).json({ error: "Script not found" });
  return res.json({ script });
});

newsCasterRouter.get("/diagnostics", async (_req, res) => {
  try {
    const diagnostics = await getNewsCasterDiagnostics();
    return res.json({ diagnostics });
  } catch (error) {
    return res.status(500).json({
      error: "Unable to gather diagnostics",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

newsCasterRouter.post("/regenerate", async (req, res) => {
  try {
    const voice = req.query.voice ? String(req.query.voice) : undefined;
    const script = await getOrCreateTodayCasterScript(voice, true);
    return res.json({ script });
  } catch (error) {
    return res.status(500).json({
      error: "Unable to regenerate AI news caster script",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
