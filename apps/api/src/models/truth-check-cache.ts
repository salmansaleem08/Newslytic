import { Schema, model } from "mongoose";

const sourceSchema = new Schema(
  {
    publisher: { type: String, default: "", trim: true },
    url: { type: String, default: "", trim: true },
    title: { type: String, default: "", trim: true },
    rating: { type: String, default: "", trim: true },
    reviewDate: { type: String, default: "", trim: true }
  },
  { _id: false }
);

const truthCheckCacheSchema = new Schema(
  {
    claimHash: { type: String, required: true, unique: true, index: true },
    claim: { type: String, required: true, trim: true },
    normalizedClaim: { type: String, required: true, trim: true },
    verdict: { type: String, required: true, trim: true },
    confidence: { type: Number, default: 0 },
    summary: { type: String, required: true, trim: true },
    sources: { type: [sourceSchema], default: [] },
    graph: {
      supports: { type: Number, default: 0 },
      disputes: { type: Number, default: 0 },
      mixed: { type: Number, default: 0 },
      unknown: { type: Number, default: 0 }
    },
    fetchedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export const TruthCheckCacheModel = model("TruthCheckCache", truthCheckCacheSchema);
