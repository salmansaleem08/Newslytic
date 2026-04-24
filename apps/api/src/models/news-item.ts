import { Schema, model } from "mongoose";

export const NEWS_CATEGORIES = [
  "global",
  "local",
  "politics",
  "technology",
  "business",
  "entertainment",
  "sports"
] as const;

export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

const newsItemSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    summary: { type: String, required: true, trim: true },
    source: { type: String, required: true, trim: true },
    sourceUrl: { type: String, required: true, trim: true },
    imageUrl: { type: String, default: "" },
    category: { type: String, enum: NEWS_CATEGORIES, required: true },
    relevanceScore: { type: Number, default: 0 },
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

newsItemSchema.index({ dayKey: 1, category: 1, relevanceScore: -1, publishedAt: -1 });
newsItemSchema.index({ sourceUrl: 1 }, { unique: true });

export const NewsItemModel = model("NewsItem", newsItemSchema);
