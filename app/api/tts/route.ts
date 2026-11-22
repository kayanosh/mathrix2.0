import { NextRequest, NextResponse } from "next/server";
import { getOrGenerateTtsAudio } from "@/lib/tts-cache";
import { allowRequest, requestClientKey } from "@/lib/rate-limit";
import { TTS_SPEED, TTS_VOICE } from "@/lib/tts-voice";

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
    const { text } = (await req.json()) as { text?: string };

    if (!text || typeof text !== "string" || text.length > 4096) {
      return NextResponse.json({ error: "Invalid text" }, { status: 400 });
    }

    // One clip per sentence, at the voice's natural speed. The player sets the
    // pace; a `speed` in the request (sent by pages loaded before this change)
    // is ignored rather than generating a faster clip.
    const { buffer, source } = await getOrGenerateTtsAudio(text, TTS_VOICE, TTS_SPEED);

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
