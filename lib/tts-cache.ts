/**
 * Persistence for generated TTS narration audio.
 *
 * Narration is spoken many times (every replay, every student who opens the
 * same cached lesson), yet the same text + voice + speed always yields the
 * same audio. Regenerating it on OpenAI each time wastes latency and money, so
 * we cache the mp3 bytes in Supabase Storage keyed by a text+voice+speed hash.
 *
 * All operations fail soft: if the bucket/DB is missing or misconfigured, the
 * caller simply falls back to live generation (and ultimately browser TTS on
 * the client), so audio never breaks because of a cache problem.
 */
import { supabaseAdmin } from "./supabase/admin";
import { getOpenAI } from "./openai";
import { normalizeTtsText, normalizeSpeed, hashTtsKey } from "./tts-cache-key";

// Re-export the pure key helpers so callers can import everything from here.
export { normalizeTtsText, normalizeSpeed, hashTtsKey };

export const TTS_BUCKET = "tts-cache";
let storageAvailable = true;

const memoryTtsCache = new Map<string, Buffer>();

/**
 * Get narration audio for text+voice+speed, generating it only on a full
 * miss. Shared by /api/tts and /api/tts-timing so the timing endpoint never
 * pays for (or waits on) a second OpenAI TTS call for audio the other route
 * already generated or cached.
 */
export async function getOrGenerateTtsAudio(
  text: string,
  voice: string,
  speed: number,
): Promise<{ buffer: Buffer; hash: string; source: "memory" | "persisted" | "generated" }> {
  const hash = hashTtsKey(text, voice, speed);

  const memoryCached = memoryTtsCache.get(hash);
  if (memoryCached) return { buffer: memoryCached, hash, source: "memory" };

  const persisted = await lookupTtsAudio(hash);
  if (persisted) {
    memoryTtsCache.set(hash, persisted);
    return { buffer: persisted, hash, source: "persisted" };
  }

  const response = await getOpenAI().audio.speech.create({
    model: "tts-1",
    voice,
    input: text,
    speed,
    response_format: "mp3",
  });
  const buffer = Buffer.from(await response.arrayBuffer());

  if (memoryTtsCache.size >= 200) {
    const oldest = memoryTtsCache.keys().next().value;
    if (oldest) memoryTtsCache.delete(oldest);
  }
  memoryTtsCache.set(hash, buffer);

  writeTtsAudio({ hash, audio: buffer, text, voice, speed }).catch((err) =>
    console.warn("[TTSCache] Cache write failed:", (err as Error).message),
  );

  return { buffer, hash, source: "generated" };
}

function objectPath(hash: string): string {
  return `${hash}.mp3`;
}

/**
 * Look up cached narration audio. Returns the mp3 bytes on a hit, or null on a
 * miss / any error.
 */
export async function lookupTtsAudio(hash: string): Promise<Buffer | null> {
  if (!storageAvailable) return null;
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(TTS_BUCKET)
      .download(objectPath(hash));

    if (error || !data) {
      if (error && /bucket not found/i.test(error.message)) storageAvailable = false;
      return null;
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    if (buffer.length === 0) return null;

    // Best-effort hit telemetry — never blocks the response.
    supabaseAdmin.rpc("increment_tts_hit", { p_hash: hash }).then(
      () => {},
      () => {},
    );

    return buffer;
  } catch (err) {
    console.warn("[TTSCache] Lookup failed:", (err as Error).message);
    return null;
  }
}

/**
 * Persist generated narration audio. Uploads the mp3 to Storage and records
 * lightweight metadata. Uses upsert-without-overwrite so concurrent writes of
 * the same clip don't error.
 */
export async function writeTtsAudio(entry: {
  hash: string;
  audio: Buffer;
  text: string;
  voice: string;
  speed: number;
}): Promise<void> {
  if (!storageAvailable) return;
  try {
    const { error: uploadError } = await supabaseAdmin.storage
      .from(TTS_BUCKET)
      .upload(objectPath(entry.hash), entry.audio, {
        contentType: "audio/mpeg",
        upsert: false,
      });

    // "already exists" is fine (another request cached it first).
    if (uploadError && !/exists|duplicate/i.test(uploadError.message)) {
      if (/bucket not found/i.test(uploadError.message)) storageAvailable = false;
      console.warn("[TTSCache] Upload failed:", uploadError.message);
      return;
    }

    // Metadata row is best-effort; the audio in Storage is the source of truth.
    supabaseAdmin
      .from("tts_cache")
      .upsert(
        {
          tts_hash: entry.hash,
          text_preview: normalizeTtsText(entry.text).slice(0, 200),
          voice: entry.voice,
          speed: normalizeSpeed(entry.speed),
          byte_size: entry.audio.length,
          hit_count: 0,
        },
        { onConflict: "tts_hash", ignoreDuplicates: true },
      )
      .then(
        () => {},
        () => {},
      );
  } catch (err) {
    console.warn("[TTSCache] Write threw:", (err as Error).message);
  }
}

export interface CachedTtsSegment {
  text: string;
  start: number;
  end: number;
}

/**
 * Look up cached per-sentence timestamps for a clip (DEF-002). Returns null
 * on a miss, a schema-not-migrated project (see
 * supabase-tts-segments-migration.sql), or any error — callers fall back to
 * whole-clip linear estimation, same fail-soft pattern as the audio cache.
 */
export async function lookupTtsSegments(
  hash: string,
): Promise<CachedTtsSegment[] | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("tts_cache")
      .select("segments")
      .eq("tts_hash", hash)
      .single();
    if (error || !data?.segments) return null;
    return data.segments as CachedTtsSegment[];
  } catch (err) {
    console.warn("[TTSCache] Segment lookup failed:", (err as Error).message);
    return null;
  }
}

/**
 * Persist per-sentence timestamps for a clip whose audio is already cached
 * under the same hash. Best-effort — a failure here just means the next
 * request re-transcribes instead of losing narration audio.
 */
export async function writeTtsSegments(
  hash: string,
  segments: CachedTtsSegment[],
): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from("tts_cache")
      .update({ segments })
      .eq("tts_hash", hash);
    if (error) {
      console.warn("[TTSCache] Segment write failed:", error.message);
    }
  } catch (err) {
    console.warn("[TTSCache] Segment write threw:", (err as Error).message);
  }
}
