import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { hashTtsKey, lookupTtsAudio, writeTtsAudio } from "@/lib/tts-cache";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const TTS_VOICE = "onyx"; // deep, authoritative — closest to Jarvis

export async function POST(req: NextRequest) {
  try {
    const { text, speed } = (await req.json()) as {
      text?: string;
      speed?: number;
    };

    if (!text || typeof text !== "string" || text.length > 4096) {
      return NextResponse.json({ error: "Invalid text" }, { status: 400 });
    }

    const clampedSpeed = Math.min(4, Math.max(0.25, speed ?? 1));
    const hash = hashTtsKey(text, TTS_VOICE, clampedSpeed);

    // ── Cache lookup: replay identical narration instantly ──────────────
    const cached = await lookupTtsAudio(hash);
    if (cached) {
      return new NextResponse(new Uint8Array(cached), {
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "public, max-age=604800", // 7 days
          "X-TTS-Cache": "HIT",
        },
      });
    }

    const response = await openai.audio.speech.create({
      model: "tts-1",
      voice: TTS_VOICE,
      input: text,
      speed: clampedSpeed,
      response_format: "mp3",
    });

    const buffer = Buffer.from(await response.arrayBuffer());

    // Persist for next time (fire-and-forget — never blocks the response).
    writeTtsAudio({ hash, audio: buffer, text, voice: TTS_VOICE, speed: clampedSpeed }).catch(
      (err) => console.warn("[TTS] Cache write failed:", (err as Error).message),
    );

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=604800", // 7 days
        "X-TTS-Cache": "MISS",
      },
    });
  } catch (err) {
    console.error("[TTS]", err);
    return NextResponse.json({ error: "TTS failed" }, { status: 500 });
  }
}
