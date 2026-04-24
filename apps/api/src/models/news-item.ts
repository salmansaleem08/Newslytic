import { Schema, model } from "mongoose";

export type NewsCategory = "global" | "local";

const newsItemSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    summary: { type: String, required: true, trim: true },
    source: { type: String, required: true, trim: true },
    sourceUrl: { type: String, required: true, trim: true },
    category: { type: String, enum: ["global", "local"], required: true },
    sentiment: {
      label: { type: String, enum: ["Positive", "Negative", "Neutral"] },
      confidence: { type: Number }
    },
    bias: {
      label: { type: String, enum: ["Left", "Right", "Neutral"] },
      confidence: { type: Number }
    },
    publishedAt: { type: Date, required: true },
    dayKey: { type: String, required: true, index: true }
  },
  { timestamps: true }
);

newsItemSchema.index({ dayKey: 1, category: 1, publishedAt: -1 });
newsItemSchema.index({ sourceUrl: 1 }, { unique: true });

export const NewsItemModel = model("NewsItem", newsItemSchema);
