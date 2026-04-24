import { GoogleGenAI } from "@google/genai";
import { env } from "../config.js";

const genai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

function fallbackSummary(content: string): string {
  const clean = content.replace(/\s+/g, " ").trim();
  if (!clean) return "Summary unavailable.";
  return clean.length > 220 ? `${clean.slice(0, 217)}...` : clean;
}

export async function summarizeNews(content: string): Promise<string> {
  try {
    const response = await genai.models.generateContent({
      model: env.GEMINI_MODEL,
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

    return response.text ?? fallbackSummary(content);
  } catch (error) {
    console.error("Gemini summarization failed:", error);
    return fallbackSummary(content);
  }
}
