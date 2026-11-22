/**
 * Keeping a pupil's conversation when the page reloads.
 *
 * The chat lived only in the page's memory: a refresh, a tap on another page
 * and back, or the phone reclaiming the tab, and every question and answer was
 * gone — and with them everything a follow-up could refer to.
 *
 * It is kept in sessionStorage, not localStorage, on purpose. Many pupils use a
 * shared family or school computer; sessionStorage belongs to one tab and is
 * wiped when that tab closes, so the next person to open the site does not see
 * the last person's questions. Photos are not kept: they are large, and a
 * photo of homework can have a name on it.
 */
import type { ChatMessage } from "@/types";
import type { WhiteboardResponse } from "@/types/whiteboard";

export const CHAT_MEMORY_KEY = "mathrix_conversation_v1";

/** The most recent messages worth keeping; older ones are dropped first. */
const MAX_MESSAGES = 40;
/** Well inside the ~5MB a browser allows per site. */
const MAX_CHARS = 1_500_000;

export interface SavedConversation {
  messages: ChatMessage[];
  whiteboards: Map<string, WhiteboardResponse>;
}

interface Stored {
  v: 1;
  messages: Array<Omit<ChatMessage, "timestamp" | "imageUrl" | "imageUrls" | "whiteboard"> & {
    timestamp: string;
    hadImage?: boolean;
  }>;
  whiteboards: Array<[string, WhiteboardResponse]>;
}

/** The conversation as text to store, or null when there is nothing to keep. */
export function serialiseConversation(
  messages: ChatMessage[],
  whiteboards: Map<string, WhiteboardResponse>,
): string | null {
  let kept = messages.slice(-MAX_MESSAGES);
  // Never start on an answer whose question has been dropped.
  while (kept.length > 0 && kept[0].role !== "user") kept = kept.slice(1);

  while (kept.length > 0) {
    const ids = new Set(kept.map((m) => m.id));
    const stored: Stored = {
      v: 1,
      messages: kept.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        parsed: m.parsed,
        timestamp: new Date(m.timestamp).toISOString(),
        hadImage: m.imageUrl || m.imageUrls?.length ? true : undefined,
      })),
      whiteboards: [...whiteboards.entries()]
        .filter(([id]) => ids.has(id))
        // The photo is embedded in the board as well as the message.
        .map(([id, board]) => [id, { ...board, questionImageUrl: undefined }]),
    };
    const text = JSON.stringify(stored);
    if (text.length <= MAX_CHARS) return text;
    // Too big: drop the oldest question and its answer, then try again.
    kept = kept.slice(1);
    while (kept.length > 0 && kept[0].role !== "user") kept = kept.slice(1);
  }
  return null;
}

/** A stored conversation, or null if there is none or it cannot be read. */
export function parseConversation(text: string | null | undefined): SavedConversation | null {
  if (!text) return null;
  try {
    const stored = JSON.parse(text) as Partial<Stored>;
    if (stored.v !== 1 || !Array.isArray(stored.messages)) return null;
    const messages: ChatMessage[] = [];
    for (const m of stored.messages) {
      if (!m || typeof m.id !== "string" || typeof m.content !== "string") return null;
      if (m.role !== "user" && m.role !== "assistant") return null;
      const when = new Date(m.timestamp);
      messages.push({
        id: m.id,
        role: m.role,
        content: m.content,
        parsed: m.parsed,
        timestamp: Number.isNaN(when.getTime()) ? new Date() : when,
      });
    }
    if (messages.length === 0) return null;
    const whiteboards = new Map<string, WhiteboardResponse>();
    for (const entry of Array.isArray(stored.whiteboards) ? stored.whiteboards : []) {
      if (Array.isArray(entry) && typeof entry[0] === "string" && entry[1] && typeof entry[1] === "object") {
        whiteboards.set(entry[0], entry[1]);
      }
    }
    return { messages, whiteboards };
  } catch {
    return null;
  }
}

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    // Storage can be blocked outright (private mode, strict settings).
    return null;
  }
}

export function loadConversation(): SavedConversation | null {
  try {
    return parseConversation(storage()?.getItem(CHAT_MEMORY_KEY));
  } catch {
    return null;
  }
}

export function saveConversation(
  messages: ChatMessage[],
  whiteboards: Map<string, WhiteboardResponse>,
): void {
  const store = storage();
  if (!store) return;
  try {
    const text = serialiseConversation(messages, whiteboards);
    if (text) store.setItem(CHAT_MEMORY_KEY, text);
    else store.removeItem(CHAT_MEMORY_KEY);
  } catch {
    // Full or blocked: the chat still works, it just will not survive a reload.
  }
}

/**
 * What to send the server as the conversation so far. Photos are sent for the
 * new message and the one before it (which a follow-up may be about); older
 * ones are left out. Every earlier photo used to be sent again with every new
 * question, which made requests slow and could push them over the size limit.
 */
export function historyForRequest(
  messages: Array<Pick<ChatMessage, "role" | "content" | "imageUrl" | "imageUrls">>,
): Array<{ role: string; content: string; imageUrl?: string; imageUrls?: string[] }> {
  const userTurns = messages.map((m, i) => (m.role === "user" ? i : -1)).filter((i) => i >= 0);
  const keepImages = new Set(userTurns.slice(-2));
  return messages.map((m, i) => ({
    role: m.role,
    content: m.content,
    imageUrl: keepImages.has(i) ? m.imageUrl : undefined,
    imageUrls: keepImages.has(i) ? m.imageUrls : undefined,
  }));
}
