/**
 * The tutor's voice was generated 10% faster than natural speed on purpose,
 * and a separate clip was made for each speed setting. Pupils heard numbers
 * said too fast. These pin what replaced it: one clip per sentence at the
 * voice's natural speed, slowed a little by the player, made by the clearer
 * model, with a fallback so a setting can never silence the tutor.
 */
import { NextRequest } from "next/server";
import { hashTtsKey, LEGACY_TTS_MODEL } from "@/lib/tts-cache-key";
import { NARRATION_PACE, narrationPlaybackRate } from "@/lib/hooks/useWhiteboardSpeech";
import { TTS_FALLBACK_MODEL, TTS_MODEL, TTS_SPEED, acceptsInstructions } from "@/lib/tts-voice";

jest.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    storage: {
      from: () => ({
        download: async () => ({ data: null, error: { message: "not found" } }),
        upload: async () => ({ error: null }),
      }),
    },
    from: () => ({
      upsert: () => Promise.resolve(),
      select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
      update: () => ({ eq: async () => ({ error: null }) }),
    }),
    rpc: () => Promise.resolve(),
  },
}));

type SpeechRequest = { model: string; voice: string; input: string; speed?: number; instructions?: string };
let refuse: string[] = [];
const speech = jest.fn(async (request: SpeechRequest) => {
  if (refuse.includes(request.model)) throw new Error(`model ${request.model} not available`);
  return { arrayBuffer: async () => new TextEncoder().encode(`audio:${request.model}`).buffer };
});

jest.mock("@/lib/openai", () => ({
  getOpenAI: () => ({ audio: { speech: { create: (request: never) => speech(request) } } }),
}));

describe("the pace of the voice", () => {
  it("plays under natural speed at the normal setting, where it used to play 10% over", () => {
    expect(narrationPlaybackRate(1)).toBe(NARRATION_PACE);
    expect(NARRATION_PACE).toBeLessThan(1);
    expect(NARRATION_PACE).toBeGreaterThanOrEqual(0.85);
  });

  it("scales with the speed button, including the slow setting", () => {
    expect(narrationPlaybackRate(0.75)).toBeCloseTo(0.69, 2);
    expect(narrationPlaybackRate(1.5)).toBeCloseTo(1.38, 2);
    expect(narrationPlaybackRate(2)).toBeCloseTo(1.84, 2);
  });

  it("never returns a rate a browser would refuse", () => {
    for (const rate of [0, -1, NaN, Infinity, 0.01, 100]) {
      const out = narrationPlaybackRate(rate);
      expect(out).toBeGreaterThanOrEqual(0.5);
      expect(out).toBeLessThanOrEqual(4);
    }
  });

  it("generates clips at natural speed", () => {
    expect(TTS_SPEED).toBe(1);
  });
});

describe("the cache key", () => {
  it("keeps every clip saved before the model became a setting findable", () => {
    expect(hashTtsKey("hello", "onyx", 1.1, LEGACY_TTS_MODEL)).toBe(hashTtsKey("hello", "onyx", 1.1));
  });

  it("never serves one model's clip as another's", () => {
    expect(hashTtsKey("hello", "onyx", 1, "tts-1-hd")).not.toBe(hashTtsKey("hello", "onyx", 1));
    expect(hashTtsKey("hello", "onyx", 1, "tts-1-hd")).not.toBe(
      hashTtsKey("hello", "onyx", 1, "gpt-4o-mini-tts"),
    );
  });
});

describe("making a clip", () => {
  beforeEach(() => {
    refuse = [];
    speech.mockClear();
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("uses the clearer model, at the speed it is asked for", async () => {
    const { getOrGenerateTtsAudio } = await import("@/lib/tts-cache");
    const { source } = await getOrGenerateTtsAudio("clip one", "onyx", TTS_SPEED);
    expect(source).toBe("generated");
    expect(TTS_MODEL).toBe("tts-1-hd");
    expect(speech.mock.calls[0][0]).toMatchObject({ model: "tts-1-hd", voice: "onyx", input: "clip one", speed: 1 });
    expect(speech.mock.calls[0][0].instructions).toBeUndefined();
  });

  it("does not generate the same sentence twice", async () => {
    const { getOrGenerateTtsAudio } = await import("@/lib/tts-cache");
    await getOrGenerateTtsAudio("clip two", "onyx", TTS_SPEED);
    const again = await getOrGenerateTtsAudio("clip two", "onyx", TTS_SPEED);
    expect(again.source).toBe("memory");
    expect(speech).toHaveBeenCalledTimes(1);
  });

  it("falls back rather than going silent when the model is refused", async () => {
    const { getOrGenerateTtsAudio } = await import("@/lib/tts-cache");
    refuse = [TTS_MODEL];
    const { buffer, hash } = await getOrGenerateTtsAudio("clip three", "onyx", TTS_SPEED);
    expect(buffer.toString()).toBe(`audio:${TTS_FALLBACK_MODEL}`);
    // Saved under the model that actually made it.
    expect(hash).toBe(hashTtsKey("clip three", "onyx", TTS_SPEED, TTS_FALLBACK_MODEL));
    expect(speech.mock.calls.map(([r]) => r.model)).toEqual([TTS_MODEL, TTS_FALLBACK_MODEL]);

    // And does not pay for a refusal on every sentence that follows.
    speech.mockClear();
    await getOrGenerateTtsAudio("clip four", "onyx", TTS_SPEED);
    expect(speech.mock.calls.map(([r]) => r.model)).toEqual([TTS_FALLBACK_MODEL]);
  });

  it("only sends speaking directions to models that take them", () => {
    expect(acceptsInstructions("tts-1")).toBe(false);
    expect(acceptsInstructions("tts-1-hd")).toBe(false);
    expect(acceptsInstructions("gpt-4o-mini-tts")).toBe(true);
  });
});

describe("/api/tts", () => {
  beforeEach(() => {
    refuse = [];
    speech.mockClear();
  });

  it("ignores a speed sent by a page loaded before this change", async () => {
    const { POST } = await import("@/app/api/tts/route");
    const res = await POST(
      new NextRequest("http://localhost/api/tts", {
        method: "POST",
        body: JSON.stringify({ text: "an old page asks for a fast clip", speed: 2.2 }),
      }),
    );
    expect(res.status).toBe(200);
    expect(speech.mock.calls.at(-1)?.[0].speed).toBe(1);
  });
});
