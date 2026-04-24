import { Schema, model } from "mongoose";

const newsCasterSegmentSchema = new Schema(
  {
    heading: { type: String, required: true, trim: true },
    narration: { type: String, required: true, trim: true },
    imageUrl: { type: String, default: "" },
    source: { type: String, required: true, trim: true }
  },
  { _id: false }
);

const newsCasterSectionSchema = new Schema(
  {
    kind: { type: String, enum: ["intro", "segment", "outro"], required: true },
    heading: { type: String, default: "", trim: true },
    text: { type: String, required: true, trim: true },
    imageUrl: { type: String, default: "" },
    source: { type: String, default: "", trim: true },
    audioPath: { type: String, required: true, trim: true }
  },
  { _id: false }
);

const newsCasterScriptSchema = new Schema(
  {
    dayKey: { type: String, required: true, index: true },
    cycleKey: { type: String, required: true, index: true },
    voice: { type: String, required: true, default: "en-US-ChristopherNeural" },
    intro: { type: String, required: true, trim: true },
    outro: { type: String, required: true, trim: true },
    segments: { type: [newsCasterSegmentSchema], default: [] },
    sections: { type: [newsCasterSectionSchema], default: [] },
    audioPath: { type: String, default: "", trim: true }
  },
  { timestamps: true }
);

newsCasterScriptSchema.index({ dayKey: 1, cycleKey: 1, voice: 1 }, { unique: true });

export const NewsCasterScriptModel = model("NewsCasterScript", newsCasterScriptSchema);
