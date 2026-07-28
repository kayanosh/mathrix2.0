import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai";
import {
  getOrGenerateTtsAudio,
  lookupTtsSegments,
  writeTtsSegments,
  type CachedTtsSegment,
} from "@/lib/tts-cache";
import { allowRequest, requestClientKey } from "@/lib/rate-limit";
import { TTS_VOICE } from "@/app/api/tts/route";

/**
 * POST /api/tts-timing — real per-sentence timestamps for a narration clip
 * (DEF-002). Reuses the same cached/generated audio as /api/tts (never a
 * second OpenAI TTS call for the same text+voice+speed) and transcribes it
 * once via Whisper, caching the result alongside the audio.
 *
 * Word-level timestamps are deliberately not requested or used — verified
 * unreliable for comma-formatted numbers ("62,403" transcribes as two words,
 * desynchronising every following index). Sentence/segment boundaries are
 * robust to that; see MATHRIX_DEFECT_REGISTER.csv DEF-002.
 */
export async function POST(req: NextRequest) {
  try {
    if (!allowRequest(`tts-timing:${requestClientKey(req.headers)}`, 120, 60_000)) {
      return NextResponse.json({ error: "Too many narration requests" }, { status: 429 });
    }
    const { text, speed } = (await req.json()) as {
      text?: string;
      speed?: number;
    };

    if (!text || typeof text !== "string" || text.length > 4096) {
      return NextResponse.json({ error: "Invalid text" }, { status: 400 });
    }

    const clampedSpeed = Math.min(4, Math.max(0.25, speed ?? 1));
    const { buffer, hash } = await getOrGenerateTtsAudio(text, TTS_VOICE, clampedSpeed);

    const cachedSegments = await lookupTtsSegments(hash);
    if (cachedSegments) {
      return NextResponse.json({ segments: cachedSegments, cached: true });
    }

    const transcription = await getOpenAI().audio.transcriptions.create({
      file: new File([new Uint8Array(buffer)], "narration.mp3", { type: "audio/mpeg" }),
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    });

    const segments: CachedTtsSegment[] = (transcription.segments || []).map((s) => ({
      text: s.text.trim(),
      start: s.start,
      end: s.end,
    }));

    writeTtsSegments(hash, segments).catch((err) =>
      console.warn("[TTSTiming] Segment cache write failed:", (err as Error).message),
    );

    return NextResponse.json({ segments, cached: false });
  } catch (err) {
    console.error("[TTSTiming]", err);
    // Fail soft: the client falls back to whole-clip linear estimation when
    // this endpoint errors, same as when segments are simply absent.
    return NextResponse.json({ segments: [] }, { status: 200 });
  }
}
