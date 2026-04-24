import { Schema, model } from "mongoose";

const trendItemSchema = new Schema(
  {
    topic: { type: String, required: true, trim: true },
    growthScore: { type: Number, default: 0 },
    confidence: { type: Number, default: 0 },
    rationale: { type: String, default: "", trim: true }
  },
  { _id: false }
);

const trendPredictionSchema = new Schema(
  {
    dayKey: { type: String, required: true, unique: true, index: true },
    generatedAt: { type: Date, required: true, default: Date.now },
    predictions: { type: [trendItemSchema], default: [] }
  },
  { timestamps: true }
);

export const TrendPredictionModel = model("TrendPrediction", trendPredictionSchema);
