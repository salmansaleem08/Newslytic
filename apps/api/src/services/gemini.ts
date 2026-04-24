import { GoogleGenAI } from "@google/genai";
import { env } from "../config.js";

const genai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

export async function summarizeNews(content: string): Promise<string> {
  const response = await genai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: [
              "Generate a concise summary and headline for the given news article.",
              "Rules:",
              "1) Keep summary under 3 lines",
              "2) Avoid hallucination",
              "3) Focus on factual information",
              "",
              `Article:\n${content}`
            ].join("\n")
          }
        ]
      }
    ]
  });

  return response.text ?? "Summary unavailable.";
}
