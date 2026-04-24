import { Schema, model } from "mongoose";

const newsThoughtSchema = new Schema(
  {
    newsItemId: { type: String, required: true, index: true },
    authorName: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true, maxlength: 400 }
  },
  { timestamps: true }
);

newsThoughtSchema.index({ newsItemId: 1, createdAt: -1 });

export const NewsThoughtModel = model("NewsThought", newsThoughtSchema);
