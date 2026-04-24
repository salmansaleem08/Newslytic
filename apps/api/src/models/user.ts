import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    bio: { type: String, default: "", trim: true, maxlength: 240 },
    avatarUrl: { type: String, default: "", trim: true },
    theme: { type: String, enum: ["light", "dark"], default: "light" }
  },
  { timestamps: true }
);

export const UserModel = model("User", userSchema);
