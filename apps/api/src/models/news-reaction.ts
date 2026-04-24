import { Schema, model } from "mongoose";

const newsReactionSchema = new Schema(
  {
    newsItemId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    type: { type: String, enum: ["like"], required: true, default: "like" }
  },
  { timestamps: true }
);

newsReactionSchema.index({ newsItemId: 1, userId: 1, type: 1 }, { unique: true });

export const NewsReactionModel = model("NewsReaction", newsReactionSchema);
