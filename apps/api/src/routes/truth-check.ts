import { Router } from "express";
import { z } from "zod";
import { verifyClaim } from "../services/truth-check.js";

export const truthCheckRouter = Router();

const verifySchema = z.object({
  claim: z.string().min(5).max(800)
});

truthCheckRouter.post("/verify", async (req, res) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Please provide a valid claim to verify." });

  try {
    const result = await verifyClaim(parsed.data.claim);
    return res.json({ result });
  } catch (error) {
    console.error("Truth-check failed:", error);
    return res.status(500).json({ error: "Unable to verify this claim right now." });
  }
});
