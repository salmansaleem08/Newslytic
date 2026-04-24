import cors from "cors";
import express from "express";
import cron from "node-cron";
import { env } from "./config.js";
import { connectDb } from "./db.js";
import { newsRouter } from "./routes/news.js";
import { runNewsSync } from "./services/news-sync.js";

const app = express();

app.use(cors({ origin: env.APP_ORIGIN }));
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "newslytic-api" });
});

app.use("/api/news", newsRouter);

async function bootstrap() {
  await connectDb();

  // Runs at minute 0 every hour for incremental updates.
  cron.schedule("0 * * * *", async () => {
    await runNewsSync();
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
