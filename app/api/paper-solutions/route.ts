import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai";
import { claudeSolve } from "@/lib/claude-solver";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { allowRequest, requestClientKey } from "@/lib/rate-limit";
import type { PastPaper } from "@/lib/past-papers";
import {
  SOLUTIONS_MIN_ITEMS,
  assembleSolutions,
  buildSolutionsCheckPrompt,
  buildSolutionsPrompt,
  confirmedRefs,
  findPaper,
  isOfficialUrl,
  parseSolutions,
  readSavedDraft,
  readSavedSolutions,
  solutionsCheckInput,
  solutionsKey,
  type SolutionItem,
} from "@/lib/paper-solutions";

// Reading a whole exam paper and writing out every solution is slow. It is
// done in two requests ("write", then "check") so that neither has to finish
// both inside one time limit.
export const maxDuration = 300;

/** New solutions papers one visitor may have written in ten minutes. */
const NEW_PAPERS_PER_WINDOW = 4;
const WINDOW_MS = 600_000;
const MAX_PDF_BYTES = 25 * 1024 * 1024;
/** Below this share of answers matching the mark scheme, the paper was misread. */
const MIN_CONFIRMED_SHARE = 0.6;

const TABLE = "tutor_lesson_cache";

async function load(key: string): Promise<unknown> {
  try {
    const { data, error } = await supabaseAdmin.from(TABLE).select("lesson_json").eq("cache_key", key).maybeSingle();
    return error || !data ? null : data.lesson_json;
  } catch {
    return null;
  }
}

async function save(key: string, paper: PastPaper, kind: string, value: unknown): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from(TABLE).upsert(
      {
        cache_key: key,
        stage_id: "gcse",
        subject: "Maths",
        exam_board: paper.board,
        topic_id: `${paper.year}-${paper.month}`.toLowerCase(),
        topic_name: `${paper.month} ${paper.year} ${paper.name}`,
        level: paper.tier,
        kind,
        lesson_json: value,
        hit_count: 0,
      },
      { onConflict: "cache_key" },
    );
    if (error) console.error("[PaperSolutions] Save failed:", error.message);
  } catch (err) {
    console.error("[PaperSolutions] Save threw:", (err as Error).message);
  }
}

/** One of the paper's official PDFs, as base64. Only ever an address from our own list. */
async function fetchPdf(paper: PastPaper, url: string): Promise<string> {
  if (!isOfficialUrl(paper.board, url)) throw new Error("not an official paper address");
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Mathrix)" },
    signal: AbortSignal.timeout(40_000),
  });
  if (!res.ok) throw new Error(`paper fetch answered ${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_PDF_BYTES) throw new Error("paper is empty or too large");
  if (bytes.subarray(0, 5).toString("latin1") !== "%PDF-") throw new Error("paper is not a PDF");
  return bytes.toString("base64");
}

interface Pdf {
  name: string;
  data: string;
}

/** Ask a model that can read PDFs. Claude first, GPT-4o if it is unavailable. */
async function askWithPdfs(system: string, pdfs: Pdf[], text: string, maxTokens: number): Promise<string> {
  try {
    const result = await claudeSolve(
      system,
      [
        {
          role: "user",
          content: [
            ...pdfs.map((pdf) => ({
              type: "document" as const,
              source: { type: "base64" as const, media_type: "application/pdf" as const, data: pdf.data },
            })),
            { type: "text" as const, text },
          ],
        },
      ],
      { thinkingBudget: 3000, maxTokens },
    );
    if (result.content.trim()) return result.content;
  } catch {
    // Reported by claudeSolve; fall through to the other model.
  }
  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: [
          ...pdfs.map((pdf) => ({
            type: "file" as const,
            file: { filename: pdf.name, file_data: `data:application/pdf;base64,${pdf.data}` },
          })),
          { type: "text" as const, text },
        ],
      },
    ],
    max_tokens: Math.min(maxTokens, 16_000),
    temperature: 0.2,
  });
  return completion.choices[0]?.message?.content || "";
}

async function write(paper: PastPaper): Promise<SolutionItem[]> {
  const [questionPaper, markScheme] = await Promise.all([
    fetchPdf(paper, paper.questionPaper),
    fetchPdf(paper, paper.markScheme as string),
  ]);
  const raw = await askWithPdfs(
    buildSolutionsPrompt(paper),
    [
      { name: "question-paper.pdf", data: questionPaper },
      { name: "mark-scheme.pdf", data: markScheme },
    ],
    "The first PDF is the question paper and the second is the mark scheme. Write the worked solutions now.",
    16_000,
  );
  return parseSolutions(raw);
}

async function check(paper: PastPaper, items: SolutionItem[]): Promise<Set<string> | null> {
  try {
    const markScheme = await fetchPdf(paper, paper.markScheme as string);
    const raw = await askWithPdfs(
      buildSolutionsCheckPrompt(paper),
      [{ name: "mark-scheme.pdf", data: markScheme }],
      `These are the final answers from our worked solutions:\n${solutionsCheckInput(items)}`,
      8_000,
    );
    return confirmedRefs(raw, items);
  } catch (err) {
    console.error("[PaperSolutions] Check failed:", (err as Error).message);
    return null;
  }
}

/**
 * POST /api/paper-solutions
 * Body: { paper: "<id from the past-paper list>", step?: "load" | "write" | "check" }
 *
 *   load   — the saved worked solutions, or { status: "missing" }
 *   write  — read the paper and write the solutions (saved as a draft)
 *   check  — compare the draft with the mark scheme and save the finished paper
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const paper = findPaper(body.paper);
    if (!paper) return NextResponse.json({ error: "That paper is not on our list." }, { status: 400 });
    const step = body.step === "write" || body.step === "check" ? body.step : "load";

    const saved = readSavedSolutions(await load(solutionsKey(paper)));
    if (saved) return NextResponse.json({ solutions: saved, cached: true });
    if (step === "load") return NextResponse.json({ status: "missing" });

    const draftKey = solutionsKey(paper, "draft");
    let draft = readSavedDraft(await load(draftKey));

    if (step === "write") {
      if (draft) return NextResponse.json({ status: "written" });
      if (!allowRequest(`paper-solutions:${requestClientKey(req.headers)}`, NEW_PAPERS_PER_WINDOW, WINDOW_MS)) {
        return NextResponse.json(
          { error: "That's a lot of new solutions at once. Try again in a few minutes." },
          { status: 429 },
        );
      }
      draft = await write(paper);
      if (draft.length < SOLUTIONS_MIN_ITEMS) {
        return NextResponse.json({ error: "Could not read that paper properly. Please try again." }, { status: 502 });
      }
      await save(draftKey, paper, "paper_solutions_draft", { draft });
      return NextResponse.json({ status: "written" });
    }

    if (!draft) return NextResponse.json({ error: "Those solutions have not been written yet." }, { status: 409 });

    const confirmed = await check(paper, draft);
    if (confirmed && confirmed.size < draft.length * MIN_CONFIRMED_SHARE) {
      return NextResponse.json(
        { error: "Too many of those answers did not match the mark scheme, so we have not shown them." },
        { status: 502 },
      );
    }
    const solutions = assembleSolutions(paper, draft, confirmed);
    // Only a checked paper is kept for everyone. An unchecked one is shown,
    // labelled; the draft stays, so the next visit only has to run the check.
    if (solutions.checked) await save(solutionsKey(paper), paper, "paper_solutions", solutions);
    return NextResponse.json({ solutions, cached: false });
  } catch (err) {
    console.error("[PaperSolutions]", err);
    return NextResponse.json({ error: "Could not load those solutions. Please try again." }, { status: 500 });
  }
}
