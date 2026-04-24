import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import cron from "node-cron";
import path from "node:path";
import { authRouter } from "./routes/auth.js";
import { communityRouter } from "./routes/community.js";
import { env } from "./config.js";
import { connectDb } from "./db.js";
import { insightsRouter } from "./routes/insights.js";
import { newsCasterRouter } from "./routes/news-caster.js";
import { newsRouter } from "./routes/news.js";
import { truthCheckRouter } from "./routes/truth-check.js";
import { runNewsSync } from "./services/news-sync.js";

const app = express();

app.use(cors({ origin: env.APP_ORIGIN, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "newslytic-api" });
});

app.use("/api/news", newsRouter);
app.use("/api/news-caster", newsCasterRouter);
app.use("/api/truth-check", truthCheckRouter);
app.use("/api/community", communityRouter);
app.use("/api/insights", insightsRouter);
app.use("/api/auth", authRouter);
app.use("/media/news-caster", express.static(path.resolve(process.cwd(), "storage", "news-caster")));

async function bootstrap() {
  await connectDb();

  // Runs every 5 hours to protect provider API limits.
  cron.schedule("0 */5 * * *", async () => {
    try {
      await runNewsSync();
    } catch (error) {
      console.error("Scheduled news sync failed:", error);
    }
  });

  // Initial boot sync (best effort).
  runNewsSync().catch(() => undefined);

  app.listen(env.PORT, () => {
    console.log(`API listening on :${env.PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
