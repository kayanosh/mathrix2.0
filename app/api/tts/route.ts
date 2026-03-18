import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

    const response = await openai.audio.speech.create({
      model: "tts-1",
      voice: "onyx",          // deep, authoritative — closest to Jarvis
      input: text,
      speed: clampedSpeed,
      response_format: "mp3",
    });

    const buffer = Buffer.from(await response.arrayBuffer());

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400", // cache for 24h
      },
    });
  } catch (err) {
    console.error("[TTS]", err);
    return NextResponse.json({ error: "TTS failed" }, { status: 500 });
  }
}
