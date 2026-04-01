import OpenAI from "openai";
import { supabaseAdmin } from "./supabase/admin";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Retrieve the most relevant content chunks for a user's question.
 * Uses OpenAI embeddings + pgvector cosine similarity search.
 *
 * @param question - The user's question text
 * @param topic - Classified topic (e.g., "algebra", "geometry")
 * @param tier - Student's tier (foundation/higher) — used to filter relevant content
 * @param limit - Max chunks to return (default 5)
 * @returns Array of relevant text chunks, or empty array if no content is available
 */
export async function retrieveContentChunks(
  question: string,
  topic?: string,
  tier?: string | null,
  limit: number = 5
): Promise<string[]> {
  try {
    // Generate embedding for the question
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: question,
    });

    const questionEmbedding = embeddingResponse.data[0].embedding;

    // Build RPC call for vector similarity search
    // We use a raw query since Supabase JS client doesn't natively support pgvector ordering
    let query = supabaseAdmin.rpc("match_content_chunks", {
      query_embedding: JSON.stringify(questionEmbedding),
      match_threshold: 0.3,
      match_count: limit,
      filter_topic: topic || null,
      filter_tier: tier || null,
    });

    const { data, error } = await query;

    if (error) {
      // If the RPC function doesn't exist yet, fall back to basic text search
      console.warn("[RAG] Vector search failed, falling back to text search:", error.message);
      return fallbackTextSearch(question, topic, tier, limit);
    }

    if (!data || data.length === 0) return [];

    return (data as Array<{ chunk_text: string }>).map((row) => row.chunk_text);
  } catch (err) {
    console.warn("[RAG] Content retrieval failed:", (err as Error).message);
    return [];
  }
}

/**
 * Fallback: simple text-based search when vector search is unavailable.
 */
async function fallbackTextSearch(
  question: string,
  topic?: string,
  tier?: string | null,
  limit: number = 5
): Promise<string[]> {
  // Extract key terms from question for text search
  const keywords = question
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 5);

  if (keywords.length === 0) return [];

  let query = supabaseAdmin
    .from("content_chunks")
    .select("chunk_text")
    .limit(limit);

  // Filter by topic if available
  if (topic) query = query.eq("topic", topic);

  // Filter by tier: show content matching the student's tier or "both"
  if (tier) query = query.or(`tier.eq.${tier},tier.eq.both`);

  // Use textSearch on chunk_text for the first keyword
  query = query.ilike("chunk_text", `%${keywords[0]}%`);

  const { data, error } = await query;

  if (error || !data) return [];
  return (data as Array<{ chunk_text: string }>).map((row) => row.chunk_text);
}

/**
 * Format retrieved chunks into a prompt block for the system prompt.
 */
export function buildContentChunkBlock(chunks: string[]): string {
  if (chunks.length === 0) return "";

  const chunkTexts = chunks
    .map((c, i) => `[${i + 1}] ${c}`)
    .join("\n\n");

  return `
━━━ GCSE CONTENT REFERENCE ━━━

The following content is from the official GCSE curriculum materials.
Use these as reference when explaining concepts or generating practice questions.
Where relevant, draw examples and exam-style questions from this content.
Do NOT copy text verbatim — explain concepts in your own words using the Jarvis persona.

${chunkTexts}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}
