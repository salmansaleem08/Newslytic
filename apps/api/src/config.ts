import dotenv from "dotenv";
import path from "node:path";
import { z } from "zod";

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(8080),
  MONGODB_URI: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  NEWS_API_KEY: z.string().optional(),
  GNEWS_API_KEY: z.string().optional(),
  FACTCHECK_API_KEY: z.string().optional(),
  APP_ORIGIN: z.string().default("http://localhost:3000"),
  JWT_SECRET: z.string().min(16).default("change-me-in-production"),
  LOCAL_NEWS_COUNTRY: z.string().default("us"),
  NEWS_SYNC_INTERVAL_MINUTES: z.coerce.number().default(20)
});

export const env = envSchema.parse(process.env);
