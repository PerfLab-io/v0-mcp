import { v0 } from "v0-sdk";

const apiKey = process.env.V0_API_KEY;

if (!apiKey) {
  throw new Error("V0_API_KEY environment variable is required");
}

export const v0Client = v0;
