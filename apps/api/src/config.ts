import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(8080),
  MONGODB_URI: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  NEWS_API_KEY: z.string().optional(),
  GNEWS_API_KEY: z.string().optional(),
  FACTCHECK_API_KEY: z.string().optional(),
  APP_ORIGIN: z.string().default("http://localhost:3000")
});

export const env = envSchema.parse(process.env);
