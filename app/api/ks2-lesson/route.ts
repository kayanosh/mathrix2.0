import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface LessonSection {
  heading: string;
  body: string;
  emoji?: string;
}
interface WorkedExample {
  question: string;
  steps: string[];
  answer: string;
  emoji?: string;
}
interface KS2Lesson {
  intro: string;
  heroEmoji?: string;
  sections: LessonSection[];
  workedExample: WorkedExample;
  keyPoints: string[];
  tryThis?: { question: string; answer: string };
}

interface ExplainStep {
  text: string;
  emoji?: string;
}
interface ExplainTable {
  headers: string[];
  rows: string[][];
  caption?: string;
}
interface KS2Explanation {
  intro: string;
  steps: ExplainStep[];
  table?: ExplainTable;
  conclusion: string;
  answer: string;
}

function targetPhrase(target: string): string {
  return target === "eleven_plus"
    ? "11+ entrance-exam"
    : target === "sats"
      ? "KS2 SATs"
      : "KS2 curriculum";
}

function tierPhrase(tier: string): string {
  return tier === "developing"
    ? "Working Towards (easier, friendly numbers, single-step)"
    : tier === "greater_depth"
      ? "Greater Depth (challenging, multi-step reasoning, the highest standard)"
      : "Expected Standard (typical year-group difficulty)";
}

/**
 * POST /api/ks2-lesson
 * Body: { subject, topic, subtopics?, target, tier, kind: "lesson"|"guided"|"explain", question? }
 *
 * Produces a kid-friendly (Year 5/6) lesson laid out for the topic page, or a
 * single step-by-step explanation for one question (kind: "explain"). Works for
 * every subject; maths content uses inline $...$ for any symbols/numbers.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const subject: string = body.subject || "Mathematics";
    const topic: string = body.topic || "general";
    const subtopics: string[] = Array.isArray(body.subtopics) ? body.subtopics : [];
    const target: string = body.target || "curriculum";
    const tier: string = body.tier || "secure";
    const kind: string = ["lesson", "guided", "explain"].includes(body.kind) ? body.kind : "lesson";

    const isMaths = /math/i.test(subject);
    const mathsRule = isMaths
      ? "Wrap every number, calculation, fraction, or symbol in $...$ so it renders nicely (for example $\\frac{3}{4}$, $12 \\times 4$). Use double backslashes for LaTeX commands in JSON."
      : "Do not use LaTeX or $ symbols.";

    // ── Single-question explanation (structured, step-by-step) ───────────────
    if (kind === "explain") {
      const question: string = (body.question || "").toString().slice(0, 800);
      if (!question.trim()) {
        return NextResponse.json({ error: "Missing question" }, { status: 400 });
      }
      const sys = `You are a kind, encouraging UK primary school teacher helping a Year 5/6 pupil with ${subject}.
Explain how to answer the question below in clear, friendly steps a 9-11 year old understands. Be warm and encouraging. ${mathsRule}
Break the explanation into short, logical steps. Give each step a fitting emoji.
If a small comparison or list of facts would help (for example word classes, science facts, vocabulary), include an optional "table".
Return ONLY valid JSON in exactly this shape (no markdown fences):
{
  "intro": "1 friendly sentence introducing how we'll work it out",
  "steps": [{ "text": "one clear step", "emoji": "a single emoji" }],
  "table": { "headers": ["..."], "rows": [["..."]], "caption": "short caption" },
  "conclusion": "1 sentence wrapping up",
  "answer": "the final answer"
}
Use 2-5 steps. Omit "table" entirely if it would not help.`;
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: sys },
          { role: "user", content: `Topic: ${topic}. Question: ${question}` },
        ],
        max_tokens: 900,
        temperature: 0.6,
      });
      const raw = completion.choices[0]?.message?.content || "{}";
      let explanation: KS2Explanation | null = null;
      try {
        const parsed = JSON.parse(raw);
        const steps: ExplainStep[] = Array.isArray(parsed.steps)
          ? parsed.steps
              .filter((s: unknown): s is ExplainStep => !!s && typeof (s as ExplainStep).text === "string")
              .map((s: ExplainStep) => ({ text: s.text.toString(), emoji: s.emoji ? s.emoji.toString() : undefined }))
          : [];
        let table: ExplainTable | undefined;
        if (
          parsed.table &&
          Array.isArray(parsed.table.headers) &&
          Array.isArray(parsed.table.rows) &&
          parsed.table.headers.length > 0
        ) {
          table = {
            headers: parsed.table.headers.map((x: unknown) => String(x)),
            rows: parsed.table.rows
              .filter((r: unknown) => Array.isArray(r))
              .map((r: unknown[]) => r.map((c) => String(c))),
            caption: parsed.table.caption ? String(parsed.table.caption) : undefined,
          };
        }
        explanation = {
          intro: (parsed.intro || "").toString(),
          steps,
          table,
          conclusion: (parsed.conclusion || "").toString(),
          answer: (parsed.answer || "").toString(),
        };
      } catch {
        /* ignore */
      }
      if (!explanation || explanation.steps.length === 0) {
        return NextResponse.json({ error: "Could not generate explanation" }, { status: 502 });
      }
      return NextResponse.json({ explanation });
    }

    // ── Full lesson / guided lesson ──────────────────────────────────────────
    const subtopicLine = subtopics.length
      ? `Cover these objectives: ${subtopics.join("; ")}.`
      : "";

    const guidedExtra =
      kind === "guided"
        ? `This is a GUIDED PRACTICE lesson: focus the sections on worked examples with helpful HINTS, and always include "tryThis" (a question the pupil attempts, with its answer).`
        : `This is a LEARN lesson: teach the idea clearly from the start. Include "tryThis" if it helps.`;

    const sys = `You are a warm, encouraging UK primary school teacher creating a ${targetPhrase(target)} lesson for a Year 5/6 pupil.
Subject: ${subject}. Topic: "${topic}". ${subtopicLine}
Difficulty: ${tierPhrase(tier)}.
${guidedExtra}
Write in simple, friendly language for a 9-11 year old. Be concrete and use everyday examples. ${mathsRule}
Make it playful and visual: pick a "heroEmoji" that represents the whole topic, and give every section a fitting "emoji".

Return ONLY valid JSON in exactly this shape (no markdown fences):
{
  "intro": "1-2 friendly sentences introducing the topic",
  "heroEmoji": "a single emoji for the topic",
  "sections": [{ "heading": "short heading", "body": "1-3 short sentences", "emoji": "a single emoji" }],
  "workedExample": { "question": "an example question", "steps": ["step 1", "step 2"], "answer": "the final answer", "emoji": "a single emoji" },
  "keyPoints": ["short thing to remember", "another"],
  "tryThis": { "question": "a question for the pupil to try", "answer": "the answer" }
}
Use 3-5 sections, 2-4 worked-example steps, and 2-4 key points.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: sys },
        { role: "user", content: `Create the ${kind} lesson now.` },
      ],
      max_tokens: 1400,
      temperature: 0.7,
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    let lesson: KS2Lesson | null = null;
    try {
      const parsed = JSON.parse(raw);
      lesson = {
        intro: (parsed.intro || "").toString(),
        heroEmoji: parsed.heroEmoji ? parsed.heroEmoji.toString() : undefined,
        sections: Array.isArray(parsed.sections)
          ? parsed.sections
              .filter((s: unknown): s is LessonSection => !!s && typeof (s as LessonSection).body === "string")
              .map((s: LessonSection) => ({
                heading: (s.heading || "").toString(),
                body: s.body.toString(),
                emoji: s.emoji ? s.emoji.toString() : undefined,
              }))
          : [],
        workedExample:
          parsed.workedExample && typeof parsed.workedExample === "object"
            ? {
                question: (parsed.workedExample.question || "").toString(),
                steps: Array.isArray(parsed.workedExample.steps)
                  ? parsed.workedExample.steps.map((x: unknown) => String(x))
                  : [],
                answer: (parsed.workedExample.answer || "").toString(),
                emoji: parsed.workedExample.emoji ? parsed.workedExample.emoji.toString() : undefined,
              }
            : { question: "", steps: [], answer: "" },
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.map((x: unknown) => String(x)) : [],
        tryThis:
          parsed.tryThis && typeof parsed.tryThis === "object" && parsed.tryThis.question
            ? {
                question: parsed.tryThis.question.toString(),
                answer: (parsed.tryThis.answer || "").toString(),
              }
            : undefined,
      };
    } catch {
      /* fall through */
    }

    if (!lesson || (!lesson.intro && lesson.sections.length === 0)) {
      return NextResponse.json({ error: "Could not generate lesson" }, { status: 502 });
    }

    return NextResponse.json({ lesson });
  } catch (err) {
    console.error("ks2-lesson error:", err);
    return NextResponse.json({ error: "Failed to generate lesson" }, { status: 500 });
  }
}
