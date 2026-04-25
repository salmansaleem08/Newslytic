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

export async function summarizeTruthCheck(payload: {
  claim: string;
  verdict: string;
  confidence: number;
  evidence: Array<{ publisher: string; title: string; rating: string }>;
}): Promise<string> {
  const evidenceText = payload.evidence
    .slice(0, 6)
    .map((item, idx) => `${idx + 1}. ${item.publisher || "Unknown publisher"} | ${item.title || "Untitled"} | ${item.rating || "No rating"}`)
    .join("\n");

  const fallback = `Verdict: ${payload.verdict}. Confidence: ${payload.confidence}%. Evidence reviewed from ${payload.evidence.length} fact-check sources.`;

  try {
    const response = await genai.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: [
                "You are a fact-check assistant. Summarize in 3-5 bullet points.",
                "Use only the given evidence; do not invent facts.",
                "Mention certainty level and any disagreement across sources.",
                "",
                `Claim: ${payload.claim}`,
                `Verdict: ${payload.verdict}`,
                `Confidence: ${payload.confidence}%`,
                "",
                `Evidence:\n${evidenceText}`
              ].join("\n")
            }
          ]
        }
      ]
    });

    return response.text ?? fallback;
  } catch (error) {
    console.error("Gemini truth-check summarization failed:", error);
    return fallback;
  }
}

export async function assessClaimWithEvidence(payload: {
  claim: string;
  evidence: Array<{ publisher: string; title: string; snippet: string }>;
}): Promise<{ verdict: string; confidence: number; summary: string }> {
  const evidenceText = payload.evidence
    .slice(0, 8)
    .map((item, idx) => `${idx + 1}. ${item.publisher || "Unknown"} | ${item.title}\n   ${item.snippet}`)
    .join("\n");

  try {
    const response = await genai.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: [
                "Assess this claim using only the provided evidence snippets from news/fact-check publishers.",
                "Return strict JSON with keys: verdict, confidence, summary.",
                "verdict must be one of: Yes, No, Unclear.",
                "confidence must be integer 0-100.",
                "summary should be 3-5 short bullet-style lines without markdown symbols.",
                "",
                `Claim: ${payload.claim}`,
                "",
                `Evidence:\n${evidenceText}`
              ].join("\n")
            }
          ]
        }
      ]
    });

    const text = response.text ?? "";
    const jsonCandidate = text.match(/\{[\s\S]*\}/)?.[0] ?? "";
    if (jsonCandidate) {
      const parsed = JSON.parse(jsonCandidate) as { verdict?: string; confidence?: number; summary?: string };
      const verdict = ["Yes", "No", "Unclear"].includes(String(parsed.verdict)) ? String(parsed.verdict) : "Unclear";
      const confidence = Number.isFinite(parsed.confidence) ? Math.max(0, Math.min(100, Math.round(Number(parsed.confidence)))) : 55;
      const summary = String(parsed.summary ?? "").trim();
      if (summary) return { verdict, confidence, summary };
    }
  } catch (error) {
    console.error("Gemini claim assessment failed:", error);
  }

  return {
    verdict: "Unclear",
    confidence: 45,
    summary: "Available evidence does not provide a decisive yes or no. More direct reporting is needed to confirm the claim."
  };
}

export async function assessClaimDirect(payload: {
  claim: string;
}): Promise<{ verdict: string; confidence: number; summary: string }> {
  try {
    const response = await genai.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: [
                "Evaluate the claim using your best current knowledge and broad context.",
                "Return strict JSON with keys: verdict, confidence, summary.",
                "verdict must be one of: Yes, No, Unclear.",
                "confidence must be integer 0-100.",
                "summary should be 2-4 plain lines without markdown symbols.",
                "",
                `Claim: ${payload.claim}`
              ].join("\n")
            }
          ]
        }
      ]
    });

    const text = response.text ?? "";
    const jsonCandidate = text.match(/\{[\s\S]*\}/)?.[0] ?? "";
    if (jsonCandidate) {
      const parsed = JSON.parse(jsonCandidate) as { verdict?: string; confidence?: number; summary?: string };
      const verdict = ["Yes", "No", "Unclear"].includes(String(parsed.verdict)) ? String(parsed.verdict) : "Unclear";
      const confidence = Number.isFinite(parsed.confidence) ? Math.max(0, Math.min(100, Math.round(Number(parsed.confidence)))) : 55;
      const summary = String(parsed.summary ?? "").trim();
      if (summary) return { verdict, confidence, summary };
    }
  } catch (error) {
    console.error("Gemini direct claim assessment failed:", error);
  }

  return {
    verdict: "Unclear",
    confidence: 45,
    summary: "Not enough certainty from direct model reasoning alone. Use corroborating sources for stronger verification."
  };
}

export async function analyzeNewsSignals(payload: {
  title: string;
  summary: string;
  source: string;
}): Promise<{
  sentiment: { label: "Positive" | "Negative" | "Neutral"; confidence: number };
  bias: { label: "Left" | "Right" | "Neutral"; confidence: number };
}> {
  const fallback = {
    sentiment: { label: "Neutral" as const, confidence: 50 },
    bias: { label: "Neutral" as const, confidence: 45 }
  };

  try {
    const response = await genai.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: [
                "Classify sentiment and political bias for this news item.",
                "Return strict JSON only with format:",
                '{"sentiment":{"label":"Positive|Negative|Neutral","confidence":0-100},"bias":{"label":"Left|Right|Neutral","confidence":0-100}}',
                "Use conservative confidence when unsure.",
                "",
                `Title: ${payload.title}`,
                `Summary: ${payload.summary}`,
                `Source: ${payload.source}`
              ].join("\n")
            }
          ]
        }
      ]
    });

    const text = response.text ?? "";
    const jsonCandidate = text.match(/\{[\s\S]*\}/)?.[0] ?? "";
    if (!jsonCandidate) return fallback;
    const parsed = JSON.parse(jsonCandidate) as {
      sentiment?: { label?: string; confidence?: number };
      bias?: { label?: string; confidence?: number };
    };

    const sentimentLabel = ["Positive", "Negative", "Neutral"].includes(String(parsed.sentiment?.label))
      ? (parsed.sentiment?.label as "Positive" | "Negative" | "Neutral")
      : "Neutral";
    const biasLabel = ["Left", "Right", "Neutral"].includes(String(parsed.bias?.label))
      ? (parsed.bias?.label as "Left" | "Right" | "Neutral")
      : "Neutral";

    return {
      sentiment: {
        label: sentimentLabel,
        confidence: Math.max(0, Math.min(100, Math.round(Number(parsed.sentiment?.confidence ?? 50))))
      },
      bias: {
        label: biasLabel,
        confidence: Math.max(0, Math.min(100, Math.round(Number(parsed.bias?.confidence ?? 45))))
      }
    };
  } catch (error) {
    console.error("Gemini signal analysis failed:", error);
    return fallback;
  }
}

export async function decideTrendPredictions(payload: {
  candidates: Array<{
    sector: string;
    topic: string;
    freqToday: number;
    freqYesterday: number;
    growthScore: number;
    sentimentScore: number;
  }>;
}): Promise<Array<{ sector: string; topic: string; outlook: string; confidence: number; rationale: string; impactArea: string; horizon: string }>> {
  if (payload.candidates.length === 0) return [];

  try {
    const response = await genai.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: [
                "You are a market and culture trend analyst.",
                "Pick up to 6 strongest future-trending sectors from the candidates.",
                "Return strict JSON array only with items: {sector, topic, outlook, confidence, rationale, impactArea, horizon}.",
                "outlook must be one of: Upward, Downward, Watch.",
                "Confidence must be 0-100 integer.",
                "Use actionable language useful for normal users (e.g., stocks may rise, crypto may cool, fashion style may spread).",
                "",
                JSON.stringify(payload.candidates, null, 2)
              ].join("\n")
            }
          ]
        }
      ]
    });
    const text = response.text ?? "";
    const arrCandidate = text.match(/\[[\s\S]*\]/)?.[0] ?? "";
    if (!arrCandidate) return [];
    const parsed = JSON.parse(arrCandidate) as Array<{
      sector?: string;
      topic?: string;
      outlook?: string;
      confidence?: number;
      rationale?: string;
      impactArea?: string;
      horizon?: string;
    }>;
    return parsed
      .filter((item) => Boolean(item.topic))
      .slice(0, 6)
      .map((item) => ({
        sector: String(item.sector ?? "General"),
        topic: String(item.topic),
        outlook: ["Upward", "Downward", "Watch"].includes(String(item.outlook)) ? String(item.outlook) : "Watch",
        confidence: Math.max(0, Math.min(100, Math.round(Number(item.confidence ?? 60)))),
        rationale: String(item.rationale ?? "Rising mention frequency suggests growing attention."),
        impactArea: String(item.impactArea ?? "General market attention"),
        horizon: String(item.horizon ?? "next 24-72h")
      }));
  } catch (error) {
    console.error("Gemini trend decision failed:", error);
    return [];
  }
}
