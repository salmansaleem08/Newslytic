import { Schema, model } from "mongoose";

const newsSyncStateSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    lastSyncedAt: { type: Date, required: true }
  },
  { timestamps: true }
);

export const NewsSyncStateModel = model("NewsSyncState", newsSyncStateSchema);
