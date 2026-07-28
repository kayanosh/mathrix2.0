import { NextRequest, NextResponse } from "next/server";
import { getOrGenerateTtsAudio } from "@/lib/tts-cache";
import { allowRequest, requestClientKey } from "@/lib/rate-limit";

export const TTS_VOICE = "onyx"; // deep, authoritative — closest to Jarvis

const CACHE_HEADER = {
  memory: "MEMORY",
  persisted: "HIT",
  generated: "MISS",
} as const;

export async function POST(req: NextRequest) {
  try {
    if (!allowRequest(`tts:${requestClientKey(req.headers)}`, 120, 60_000)) {
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
    const { buffer, source } = await getOrGenerateTtsAudio(text, TTS_VOICE, clampedSpeed);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=604800", // 7 days
        "X-TTS-Cache": CACHE_HEADER[source],
      },
    });
  } catch (err) {
    console.error("[TTS]", err);
    return NextResponse.json({ error: "TTS failed" }, { status: 500 });
  }
}
