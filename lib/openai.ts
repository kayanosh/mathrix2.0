import OpenAI from "openai";

// Shared lazy client. Instantiating OpenAI at module top level throws when
// OPENAI_API_KEY is absent, which crashes `next build` page-data collection
// and any test that imports a route. Defer construction to first use so a
// missing key fails the request, not the build.
let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}
