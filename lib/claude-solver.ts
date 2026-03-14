/**
 * Claude solver — wraps the Anthropic SDK for the main solver role.
 *
 * Uses claude-sonnet-4-6 with extended thinking enabled, which lets Claude
 * internally self-verify its maths before producing the JSON output.
 * The thinking content is logged server-side only and never sent to the client.
 *
 * Falls back gracefully — callers should catch errors and fall back to GPT-4o.
 */

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const CLAUDE_SOLVER_MODEL = "claude-sonnet-4-6-20250514";

/** Thinking budget in tokens — caps internal reasoning time. Lower = faster. */
const THINKING_BUDGET = 4096;
/** Max tokens for the combined thinking + text output */
const MAX_TOKENS = 12288;

export interface ClaudeSolverResult {
  /** The parsed JSON text block from Claude's response */
  content: string;
  /** Internal chain-of-thought (never sent to client) */
  thinkingContent?: string;
}

/**
 * Message format that matches Anthropic SDK's MessageParam.
 * We keep it loose here to avoid needing to import the full SDK type.
 */
export type AnthropicMessage = {
  role: "user" | "assistant";
  content:
    | string
    | Array<
        | { type: "text"; text: string }
        | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
        | { type: "thinking"; thinking: string; signature: string }
      >;
};

/**
 * Call Claude Sonnet with extended thinking to solve a maths problem.
 *
 * @param systemPrompt - The full system prompt (built by buildSystemPrompt)
 * @param messages - Conversation history in Anthropic message format
 */
export async function claudeSolve(
  systemPrompt: string,
  messages: AnthropicMessage[],
): Promise<ClaudeSolverResult> {
  const response = await anthropic.messages.create({
    model: CLAUDE_SOLVER_MODEL,
    max_tokens: MAX_TOKENS,
    thinking: {
      type: "enabled",
      budget_tokens: THINKING_BUDGET,
    },
    system: systemPrompt,
    // Cast needed because SDK types are strict about the union
    messages: messages as Parameters<typeof anthropic.messages.create>[0]["messages"],
  });

  let content = "";
  let thinkingContent = "";

  for (const block of response.content) {
    if (block.type === "text") {
      content = block.text;
    } else if (block.type === "thinking") {
      thinkingContent = block.thinking;
    }
  }

  // Log thinking for debugging — never exposed to client
  if (thinkingContent) {
    const preview = thinkingContent.slice(0, 200).replace(/\n/g, " ");
    console.log(`[Claude] Extended thinking (${thinkingContent.length} chars): ${preview}...`);
  }

  return { content, thinkingContent };
}

/**
 * Convert OpenAI-format messages to Anthropic message format.
 *
 * Handles:
 * - Plain text messages
 * - Image messages (OpenAI image_url → Anthropic image source)
 *
 * The system message is NOT included in the returned array — it goes
 * into the `system` parameter of anthropic.messages.create separately.
 */
export function convertToAnthropicMessages(
  openaiMessages: Array<{
    role: string;
    content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  }>,
): AnthropicMessage[] {
  const result: AnthropicMessage[] = [];

  for (const msg of openaiMessages) {
    if (msg.role === "system") continue; // handled separately

    if (typeof msg.content === "string") {
      result.push({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      });
      continue;
    }

    // Multi-part content (text + images)
    const parts: AnthropicMessage["content"] = [];
    if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === "text" && part.text) {
          parts.push({ type: "text", text: part.text });
        } else if (part.type === "image_url" && part.image_url?.url) {
          // Convert OpenAI image_url (data URI) → Anthropic base64 source
          const url = part.image_url.url;
          const dataUriMatch = url.match(/^data:([^;]+);base64,(.+)$/);
          if (dataUriMatch) {
            parts.push({
              type: "image",
              source: {
                type: "base64",
                media_type: dataUriMatch[1],
                data: dataUriMatch[2],
              },
            });
          }
        }
      }
    }

    if (parts.length > 0) {
      result.push({
        role: msg.role as "user" | "assistant",
        content: parts,
      });
    }
  }

  return result;
}
