import OpenAI from "openai";

// If OPENAI_API_KEY is not defined, we fall back to a placeholder key to prevent
// the OpenAI client constructor from crashing the Next.js build-time compilation.
// Our API routes explicitly check process.env.OPENAI_API_KEY and bypass calls
// if it's missing, making this safe.
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy-key-for-nextjs-build-compilation",
});
