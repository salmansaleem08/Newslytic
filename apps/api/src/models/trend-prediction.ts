import { Schema, model } from "mongoose";

const trendItemSchema = new Schema(
  {
    sector: { type: String, default: "", trim: true },
    topic: { type: String, required: true, trim: true },
    outlook: { type: String, default: "Watch", trim: true },
    growthScore: { type: Number, default: 0 },
    confidence: { type: Number, default: 0 },
    rationale: { type: String, default: "", trim: true },
    impactArea: { type: String, default: "", trim: true },
    horizon: { type: String, default: "next 24-72h", trim: true }
  },
  { _id: false }
);

const trendPredictionSchema = new Schema(
  {
    dayKey: { type: String, required: true, unique: true, index: true },
    generatedAt: { type: Date, required: true, default: Date.now },
    predictions: { type: [trendItemSchema], default: [] },
    graph: { type: Schema.Types.Mixed, default: null }
  },
  { timestamps: true }
);

export const TrendPredictionModel = model("TrendPrediction", trendPredictionSchema);
