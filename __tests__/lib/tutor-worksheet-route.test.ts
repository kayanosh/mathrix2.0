/**
 * "Regenerate worksheet" in the tutor portal returned the same questions every
 * time. The button sent the same request as "Generate", and the server answers
 * that from its saved copy. These pin the fix on the server side:
 *
 *   - a plain request is still served from the saved copy (cheap, instant);
 *   - `force` writes a new worksheet, is told which questions to avoid, and
 *     replaces the saved copy;
 *   - the number of questions is part of what is saved, so asking for 12 after
 *     someone saved 8 does not return 8;
 *   - none of it is available to someone who is not a signed-in tutor.
 */
import { NextRequest } from "next/server";
import { tutorWorksheetCacheKey } from "@/lib/tutor-lesson-cache";

let profile: { id: string; role: string; centre_id: string | null } | null = {
  id: "tutor-1",
  role: "tutor",
  centre_id: "centre-1",
};

jest.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: profile ? { id: profile.id } : null } }) },
  }),
}));

jest.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: profile ? { ...profile, email: null, full_name: null } : null,
          }),
        }),
      }),
    }),
  },
}));

const saved = new Map<string, unknown>();
const lookup = jest.fn(async (key: string) => saved.get(key) ?? null);
const write = jest.fn(async (entry: { cacheKey: string; worksheet: unknown }) => {
  saved.set(entry.cacheKey, entry.worksheet);
});

jest.mock("@/lib/tutor-lesson-cache", () => ({
  ...jest.requireActual("@/lib/tutor-lesson-cache"),
  lookupTutorWorksheetCache: (key: string) => lookup(key),
  writeTutorWorksheetCache: (entry: { cacheKey: string; worksheet: unknown }) => write(entry),
}));

let batch = 0;
const create = jest.fn(async (_request: { messages: Array<{ role: string; content: string }>; temperature: number }) => {
  batch += 1;
  return {
    choices: [
      {
        message: {
          content: JSON.stringify({
            questions: [
              { question: `Batch ${batch} question A`, answer: "1", solutionSteps: ["s"], difficulty: "easy" },
              { question: `Batch ${batch} question B`, answer: "2", solutionSteps: ["s"], difficulty: "hard" },
            ],
          }),
        },
      },
    ],
  };
});

jest.mock("@/lib/openai", () => ({
  getOpenAI: () => ({ chat: { completions: { create: (request: never) => create(request) } } }),
}));

const TOPIC = {
  stageId: "gcse",
  stageLabel: "GCSE",
  subjectId: "maths",
  subjectName: "Maths",
  topicId: "gcse-algebra",
  topicName: "Solving equations",
  subtopics: ["Linear equations"],
  level: "Higher",
};

async function post(body: Record<string, unknown>) {
  const { POST } = await import("@/app/api/tutor-worksheet/route");
  const res = await POST(
    new NextRequest("http://localhost/api/tutor-worksheet", {
      method: "POST",
      body: JSON.stringify({ ...TOPIC, ...body }),
    }),
  );
  return { status: res.status, data: await res.json() };
}

const texts = (data: { questions: Array<{ questionText: string }> }) =>
  data.questions.map((q) => q.questionText);

describe("/api/tutor-worksheet", () => {
  beforeEach(() => {
    profile = { id: `tutor-${Math.random()}`, role: "tutor", centre_id: "centre-1" };
    saved.clear();
    batch = 0;
    lookup.mockClear();
    write.mockClear();
    create.mockClear();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  it("serves a plain request from the saved copy the second time", async () => {
    const first = await post({ count: 8 });
    const second = await post({ count: 8 });
    expect(first.data.cached).toBe(false);
    expect(second.data.cached).toBe(true);
    expect(texts(second.data)).toEqual(texts(first.data));
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("writes a NEW worksheet when asked to regenerate", async () => {
    const first = await post({ count: 8 });
    const again = await post({ count: 8, force: true, avoid: texts(first.data) });
    expect(again.data.cached).toBe(false);
    expect(texts(again.data)).not.toEqual(texts(first.data));
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("tells the model which questions are already on the tutor's screen", async () => {
    await post({ count: 8, force: true, avoid: ["Solve 3x + 7 = 25", "Solve 2x = 10"] });
    const request = create.mock.calls[0][0];
    const user = request.messages.find((m) => m.role === "user")!.content;
    expect(user).toMatch(/do not repeat/i);
    expect(user).toContain("Solve 3x + 7 = 25");
    expect(user).toContain("Solve 2x = 10");
  });

  it("does not mention avoiding anything on a first generation", async () => {
    await post({ count: 8 });
    const user = create.mock.calls[0][0].messages.find((m) => m.role === "user")!.content;
    expect(user).not.toMatch(/do not repeat/i);
  });

  it("replaces the saved copy, so the next plain request gets the new one", async () => {
    await post({ count: 8 });
    const regenerated = await post({ count: 8, force: true });
    const next = await post({ count: 8 });
    expect(next.data.cached).toBe(true);
    expect(texts(next.data)).toEqual(texts(regenerated.data));
  });

  it("keeps a different number of questions as a different worksheet", async () => {
    // Was: 8 saved once, then returned for 12 and 16 as well.
    expect(tutorWorksheetCacheKey("t", "AQA", "Higher", null, 8)).not.toBe(
      tutorWorksheetCacheKey("t", "AQA", "Higher", null, 12),
    );
    await post({ count: 8 });
    const twelve = await post({ count: 12 });
    expect(twelve.data.cached).toBe(false);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("ignores a junk avoid list rather than passing it to the model", async () => {
    await post({ count: 8, force: true, avoid: [42, null, "", { a: 1 }, "x".repeat(2000)] });
    const user = create.mock.calls[0][0].messages.find((m) => m.role === "user")!.content;
    expect(user.length).toBeLessThan(700);
  });

  it("refuses someone who is not signed in, without calling the model", async () => {
    profile = null;
    const res = await post({ count: 8, force: true });
    expect(res.status).toBe(401);
    expect(create).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });

  it("refuses a signed-in pupil, without calling the model", async () => {
    profile = { id: "pupil-1", role: "student", centre_id: null };
    const res = await post({ count: 8, force: true });
    expect(res.status).toBe(403);
    expect(create).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });

  it("stops one tutor regenerating without limit", async () => {
    profile = { id: "tutor-busy", role: "tutor", centre_id: "centre-1" };
    let last = 200;
    for (let i = 0; i < 25; i += 1) last = (await post({ count: 8, force: true })).status;
    expect(last).toBe(429);
    expect(create.mock.calls.length).toBeLessThanOrEqual(20);
  });
});
