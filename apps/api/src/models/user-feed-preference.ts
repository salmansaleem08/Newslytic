import { Schema, model } from "mongoose";
import { NEWS_CATEGORIES } from "./news-item.js";

const userFeedPreferenceSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    categories: { type: [String], default: [...NEWS_CATEGORIES] }
  },
  { timestamps: true }
);

export const UserFeedPreferenceModel = model("UserFeedPreference", userFeedPreferenceSchema);
