import mongoose from "mongoose";
import { env } from "./config.js";

export async function connectDb(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI, {
    dbName: "newslytic"
  });
}
