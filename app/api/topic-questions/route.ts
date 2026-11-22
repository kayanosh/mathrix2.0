import { NextRequest, NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai";
import { claudeSolve } from "@/lib/claude-solver";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { allowRequest, requestClientKey } from "@/lib/rate-limit";
import {
  SHEET_MIN_QUESTIONS,
  assembleSheet,
  buildCheckPrompt,
  buildSheetPrompt,
  checkInput,
  parseSheetQuestions,
  passedChecks,
  readSavedSheet,
  resolveSheetRequest,
  topicSheetKey,
  type SheetQuestion,
  type SheetRequest,
  type TopicSheet,
} from "@/lib/topic-sheets";

export const maxDuration = 120;

/** New sheets one visitor may have written in ten minutes. Saved sheets are free. */
const NEW_SHEETS_PER_WINDOW = 6;
const WINDOW_MS = 600_000;

const TABLE = "tutor_lesson_cache";

async function lookupSheet(key: string): Promise<TopicSheet | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("lesson_json")
      .eq("cache_key", key)
      .maybeSingle();
    if (error || !data) return null;
    return readSavedSheet(data.lesson_json);
  } catch {
    return null;
  }
}

async function saveSheet(key: string, request: SheetRequest, sheet: TopicSheet): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from(TABLE).upsert(
      {
        cache_key: key,
        stage_id: "gcse",
        subject: "Maths",
        exam_board: request.board,
        topic_id: request.topic.id,
        topic_name: request.subtopic,
        level: request.tier,
        kind: "topic_sheet",
        lesson_json: sheet,
        hit_count: 0,
      },
      { onConflict: "cache_key" },
    );
    if (error) console.error("[TopicSheet] Save failed:", error.message);
  } catch (err) {
    console.error("[TopicSheet] Save threw:", (err as Error).message);
  }
}

async function writeQuestions(request: SheetRequest): Promise<SheetQuestion[]> {
  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildSheetPrompt(request) },
      { role: "user", content: `Write the ${request.subtopic} question sheet now.` },
    ],
    max_tokens: 4500,
    temperature: 0.6,
  });
  return parseSheetQuestions(completion.choices[0]?.message?.content || "");
}

/**
 * A second opinion on every answer, from a different model where possible.
 * Returns null when no check could be made at all.
 */
async function checkQuestions(questions: SheetQuestion[]): Promise<Set<number> | null> {
  const system = buildCheckPrompt();
  const input = checkInput(questions);
  try {
    const result = await claudeSolve(system, [{ role: "user", content: input }], {
      thinkingBudget: 4096,
      maxTokens: 9000,
    });
    const passed = passedChecks(result.content, questions);
    if (passed) return passed;
  } catch {
    // Fall through to the other model.
  }
  try {
    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: input },
      ],
      max_tokens: 3000,
      temperature: 0,
    });
    return passedChecks(completion.choices[0]?.message?.content || "", questions);
  } catch (err) {
    console.error("[TopicSheet] Check failed:", (err as Error).message);
    return null;
  }
}

/**
 * POST /api/topic-questions
 * Body: { board, tier, topic, subtopic } — a place in the GCSE syllabus.
 *
 * Returns the saved question sheet for that subtopic, writing and checking it
 * first if nobody has asked for it before.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const request = resolveSheetRequest(body);
    if (!request) {
      return NextResponse.json({ error: "That topic is not on the syllabus." }, { status: 400 });
    }

    const key = topicSheetKey(request);
    const saved = await lookupSheet(key);
    if (saved) return NextResponse.json({ sheet: saved, cached: true });

    if (!allowRequest(`topic-sheet:${requestClientKey(req.headers)}`, NEW_SHEETS_PER_WINDOW, WINDOW_MS)) {
      return NextResponse.json(
        { error: "That's a lot of new sheets at once. Try again in a few minutes." },
        { status: 429 },
      );
    }

    const written = await writeQuestions(request);
    if (written.length < SHEET_MIN_QUESTIONS) {
      return NextResponse.json({ error: "Could not write that sheet. Please try again." }, { status: 502 });
    }

    const passed = await checkQuestions(written);
    const sheet = assembleSheet(request, written, passed);
    if (sheet.questions.length < SHEET_MIN_QUESTIONS) {
      return NextResponse.json(
        { error: "Too many of those questions failed our checks. Please try again." },
        { status: 502 },
      );
    }

    // Only a checked sheet is kept. An unchecked one is still shown, labelled,
    // but the next request writes a fresh one rather than serving it for ever.
    if (sheet.checked) await saveSheet(key, request, sheet);

    return NextResponse.json({ sheet, cached: false });
  } catch (err) {
    console.error("[TopicSheet]", err);
    return NextResponse.json({ error: "Could not load that sheet. Please try again." }, { status: 500 });
  }
}
