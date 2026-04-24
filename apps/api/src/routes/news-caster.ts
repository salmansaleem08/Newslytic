import { Router } from "express";
import { NEWS_CASTER_VOICES, getCasterHistory, getCasterScriptById, getOrCreateTodayCasterScript } from "../services/news-caster.js";
import { runNewsSync } from "../services/news-sync.js";

export const newsCasterRouter = Router();

newsCasterRouter.get("/today", async (req, res) => {
  try {
    await runNewsSync({ force: false });
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
