/**
 * Worked solutions for past papers are written by a model, so the tests are
 * about what is guaranteed whatever it writes: only papers on our list, only
 * the boards' own PDFs, no answer shown as checked unless the mark scheme
 * agreed, and nothing unchecked saved for everyone.
 */
import { NextRequest } from "next/server";
import { PAST_PAPERS, type PastPaper } from "@/lib/past-papers";
import {
  WITHHELD_ANSWER,
  assembleSolutions,
  buildSolutionsPrompt,
  confirmedRefs,
  findPaper,
  isOfficialUrl,
  paperId,
  parseSolutions,
  solutionsHref,
  solutionsKey,
  type SolutionItem,
} from "@/lib/paper-solutions";

const PAPER = PAST_PAPERS.find((p) => p.board === "AQA" && p.year === 2022 && p.month === "June" && p.tier === "higher" && p.paper === 1)!;

const item = (ref: string, answer = "$x = 3$"): SolutionItem => ({
  ref,
  marks: 2,
  working: ["Subtract 7 from both sides.", "Divide both sides by 3."],
  answer,
  confirmed: false,
});

const written = (refs: string[]) =>
  JSON.stringify({
    solutions: refs.map((ref) => ({ ref, marks: 2, working: ["Do the sum."], answer: `answer to ${ref}` })),
  });

const TWELVE = ["1", "2", "3", "4", "5(a)", "5(b)", "6", "7", "8", "9", "10", "11"];

describe("which paper", () => {
  it("gives every paper on the list its own id, and finds it again", () => {
    const ids = PAST_PAPERS.map(paperId);
    expect(new Set(ids).size).toBe(PAST_PAPERS.length);
    for (const paper of PAST_PAPERS) expect(findPaper(paperId(paper))).toBe(paper);
  });

  it("offers solutions for every paper, since every paper has a mark scheme", () => {
    expect(PAST_PAPERS.length).toBeGreaterThanOrEqual(240);
    expect(PAST_PAPERS.every((p) => Boolean(p.markScheme))).toBe(true);
  });

  it.each([["aqa-2099-june-higher-1"], ["https://evil.example/paper.pdf"], [""], [42], [null], ["x".repeat(200)]])(
    "refuses %p",
    (id) => {
      expect(findPaper(id)).toBeNull();
    },
  );

  it("will not write solutions for a paper with no mark scheme to check against", () => {
    const bare: PastPaper = { ...PAPER, markScheme: null };
    expect(findPaper(paperId(bare), [bare])).toBeNull();
  });

  it("links to the solutions page by id", () => {
    expect(solutionsHref(PAPER)).toBe("/exam-papers/solutions?paper=aqa-2022-june-higher-1");
    expect(solutionsKey(PAPER)).not.toBe(solutionsKey(PAPER, "draft"));
  });

  it("only ever fetches a paper from its own exam board's website", () => {
    for (const paper of PAST_PAPERS) {
      expect(isOfficialUrl(paper.board, paper.questionPaper)).toBe(true);
      expect(isOfficialUrl(paper.board, paper.markScheme as string)).toBe(true);
    }
    expect(isOfficialUrl("AQA", "https://evil.example/AQA-83001H-QP-JUN22.PDF")).toBe(false);
    expect(isOfficialUrl("AQA", "https://filestore.aqa.org.uk.evil.example/x.pdf")).toBe(false);
    expect(isOfficialUrl("OCR", "https://www.ocr.org.uk/Images/1-question-paper.html")).toBe(false);
    expect(isOfficialUrl("Edexcel", "http://qualifications.pearson.com/x.pdf")).toBe(false);
  });

  it("tells the writer to follow the mark scheme and not to copy the questions", () => {
    const prompt = buildSolutionsPrompt(PAPER);
    expect(prompt).toContain("AQA June 2022 Higher Paper 1");
    expect(prompt).toMatch(/must be the answer in the mark scheme/);
    expect(prompt).toMatch(/Never reproduce the wording of a question/);
    expect(prompt).toMatch(/non-calculator paper/);
  });
});

describe("reading what the writer wrote", () => {
  it("keeps one entry per question part, in order", () => {
    const items = parseSolutions(written(["1", "2(a)", "2(b)(ii)", "12"]));
    expect(items.map((i) => i.ref)).toEqual(["1", "2(a)", "2(b)(ii)", "12"]);
    expect(items.every((i) => i.confirmed === false)).toBe(true);
  });

  it("tidies a reference written as 'Question 7 (a)'", () => {
    const [only] = parseSolutions(JSON.stringify({ solutions: [{ ref: "Question 7 (a)", working: [], answer: "5" }] }));
    expect(only.ref).toBe("7(a)");
  });

  it("drops entries with no answer, a repeated reference, or a reference that is not one", () => {
    const items = parseSolutions(
      JSON.stringify({
        solutions: [
          { ref: "1", answer: "4" },
          { ref: "1", answer: "5" },
          { ref: "2", answer: "" },
          { ref: "the last one", answer: "6" },
          { ref: "3", answer: 7 },
        ],
      }),
    );
    expect(items.map((i) => [i.ref, i.answer])).toEqual([["1", "4"], ["3", "7"]]);
  });

  it("returns nothing for a reply it cannot read", () => {
    expect(parseSolutions("I could not open the PDF")).toEqual([]);
    expect(parseSolutions(JSON.stringify({ solutions: {} }))).toEqual([]);
  });
});

describe("held to the mark scheme", () => {
  const items = [item("1"), item("2(a)"), item("2(b)"), item("3")];

  it("confirms only what the checker said matched", () => {
    const confirmed = confirmedRefs(
      JSON.stringify({ checks: [{ ref: "1", matches: true }, { ref: "2(a)", matches: false }, { ref: "2 (b)", matches: true }] }),
      items,
    )!;
    expect([...confirmed].sort()).toEqual(["1", "2(b)"]);
  });

  it("does not confirm a part the checker never mentioned, or a vague yes", () => {
    const confirmed = confirmedRefs(JSON.stringify({ checks: [{ ref: "1", matches: "yes" }, { ref: "99", matches: true }] }), items)!;
    expect(confirmed.size).toBe(0);
  });

  it("knows the difference between 'nothing matched' and 'no check happened'", () => {
    expect(confirmedRefs("the mark scheme would not open", items)).toBeNull();
    expect(confirmedRefs(JSON.stringify({ checks: [] }), items)?.size).toBe(0);
  });

  it("withholds working whose answer did not match, rather than showing it with a warning", () => {
    const paper = assembleSolutions(PAPER, items, new Set(["1", "3"]));
    expect(paper.checked).toBe(true);
    expect(paper.withheld).toBe(2);
    const shown = paper.items.find((i) => i.ref === "1")!;
    const held = paper.items.find((i) => i.ref === "2(a)")!;
    expect(shown.confirmed).toBe(true);
    expect(shown.working).toHaveLength(2);
    expect(held.confirmed).toBe(false);
    expect(held.working).toEqual([]);
    expect(held.answer).toBe(WITHHELD_ANSWER);
    expect(JSON.stringify(held)).not.toContain("x = 3");
  });

  it("marks nothing as confirmed when the check could not run", () => {
    const paper = assembleSolutions(PAPER, items, null);
    expect(paper.checked).toBe(false);
    expect(paper.items.every((i) => !i.confirmed)).toBe(true);
    expect(paper.items[0].working).toHaveLength(2);
  });

  it("does not change the draft it was given", () => {
    assembleSolutions(PAPER, items, new Set());
    expect(items[0].answer).toBe("$x = 3$");
  });
});

// ── The route ───────────────────────────────────────────────────────────────

const saved = new Map<string, unknown>();
jest.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: (_column: string, key: string) => ({
          maybeSingle: async () => ({ data: saved.has(key) ? { lesson_json: saved.get(key) } : null, error: null }),
        }),
      }),
      upsert: async (row: { cache_key: string; lesson_json: unknown }) => {
        saved.set(row.cache_key, row.lesson_json);
        return { error: null };
      },
    }),
  },
}));

let writerReply = written(TWELVE);
let checkerReply: string | Error = "";
const model = jest.fn(async (system: string) => {
  if (/checking a worked-solutions paper/.test(system)) {
    if (checkerReply instanceof Error) throw checkerReply;
    return { content: checkerReply };
  }
  return { content: writerReply };
});
jest.mock("@/lib/claude-solver", () => ({ claudeSolve: (system: string) => model(system) }));
jest.mock("@/lib/openai", () => ({
  getOpenAI: () => ({
    chat: {
      completions: {
        create: async () => {
          throw new Error("fallback model unavailable in this test");
        },
      },
    },
  }),
}));

const fetched: string[] = [];
let caller = 100;
async function ask(body: Record<string, unknown>) {
  const { POST } = await import("@/app/api/paper-solutions/route");
  const res = await POST(
    new NextRequest("http://localhost/api/paper-solutions", {
      method: "POST",
      headers: { "x-forwarded-for": `10.1.0.${caller}` },
      body: JSON.stringify(body),
    }),
  );
  return { status: res.status, data: await res.json() };
}

describe("/api/paper-solutions", () => {
  const id = paperId(PAPER);
  const allMatch = (refs: string[]) => JSON.stringify({ checks: refs.map((ref) => ({ ref, matches: true })) });

  beforeEach(() => {
    caller += 1;
    saved.clear();
    fetched.length = 0;
    model.mockClear();
    writerReply = written(TWELVE);
    checkerReply = allMatch(TWELVE);
    jest.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = jest.fn(async (url: string | URL | Request) => {
      fetched.push(String(url));
      return new Response(Buffer.from("%PDF-1.7 pretend paper"), { status: 200 });
    }) as typeof fetch;
  });

  it("says a paper has no solutions yet without writing any", async () => {
    const res = await ask({ paper: id });
    expect(res.data).toEqual({ status: "missing" });
    expect(model).not.toHaveBeenCalled();
    expect(fetched).toEqual([]);
  });

  it("refuses a paper that is not on the list, without fetching or calling a model", async () => {
    const res = await ask({ paper: "https://evil.example/paper.pdf", step: "write" });
    expect(res.status).toBe(400);
    expect(model).not.toHaveBeenCalled();
    expect(fetched).toEqual([]);
  });

  it("writes from the board's two PDFs, checks against the mark scheme, then serves the saved paper", async () => {
    expect((await ask({ paper: id, step: "write" })).data).toEqual({ status: "written" });
    expect(fetched.sort()).toEqual([PAPER.markScheme, PAPER.questionPaper].sort());

    const checked = await ask({ paper: id, step: "check" });
    expect(checked.status).toBe(200);
    expect(checked.data.solutions.checked).toBe(true);
    expect(checked.data.solutions.items).toHaveLength(12);
    expect(checked.data.solutions.items.every((i: SolutionItem) => i.confirmed)).toBe(true);

    model.mockClear();
    const again = await ask({ paper: id });
    expect(again.data.cached).toBe(true);
    expect(again.data.solutions.items).toEqual(checked.data.solutions.items);
    expect(model).not.toHaveBeenCalled();
  });

  it("does not write the same paper twice if the check has to be retried", async () => {
    await ask({ paper: id, step: "write" });
    await ask({ paper: id, step: "write" });
    expect(model).toHaveBeenCalledTimes(1);
  });

  it("will not check solutions that were never written", async () => {
    expect((await ask({ paper: id, step: "check" })).status).toBe(409);
  });

  it("withholds the answers the mark scheme did not confirm", async () => {
    await ask({ paper: id, step: "write" });
    checkerReply = allMatch(TWELVE.filter((ref) => ref !== "7" && ref !== "5(b)"));
    const { data } = await ask({ paper: id, step: "check" });
    expect(data.solutions.withheld).toBe(2);
    expect(data.solutions.items.find((i: SolutionItem) => i.ref === "7").answer).toBe(WITHHELD_ANSWER);
  });

  it("shows nothing when most answers failed the mark scheme", async () => {
    await ask({ paper: id, step: "write" });
    checkerReply = allMatch(["1", "2"]);
    const res = await ask({ paper: id, step: "check" });
    expect(res.status).toBe(502);
    expect(saved.has(solutionsKey(PAPER))).toBe(false);
  });

  it("shows an unchecked paper as unchecked, and does not save it for everyone", async () => {
    await ask({ paper: id, step: "write" });
    checkerReply = new Error("model down");
    const res = await ask({ paper: id, step: "check" });
    expect(res.status).toBe(200);
    expect(res.data.solutions.checked).toBe(false);
    expect(saved.has(solutionsKey(PAPER))).toBe(false);
    // The draft is kept, so the next visit only needs the check.
    expect(saved.has(solutionsKey(PAPER, "draft"))).toBe(true);
  });

  it("refuses a paper it could not read properly", async () => {
    writerReply = written(["1", "2"]);
    const res = await ask({ paper: id, step: "write" });
    expect(res.status).toBe(502);
    expect(saved.size).toBe(0);
  });

  it("refuses a download that is not a PDF", async () => {
    global.fetch = jest.fn(async () => new Response("<html>Sign in</html>", { status: 200 })) as typeof fetch;
    const res = await ask({ paper: id, step: "write" });
    expect(res.status).toBe(500);
    expect(model).not.toHaveBeenCalled();
  });

  it("stops one visitor having paper after paper written", async () => {
    const papers = PAST_PAPERS.slice(0, 7);
    let last = 200;
    for (const paper of papers) last = (await ask({ paper: paperId(paper), step: "write" })).status;
    expect(last).toBe(429);
    expect(model.mock.calls.length).toBeLessThanOrEqual(4);
  });
});
