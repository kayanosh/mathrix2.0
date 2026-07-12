import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { englishExplainExtra, englishLessonExtra } from "@/lib/ks2-english";
import {
  ks2LessonCacheKey,
  lookupKS2LessonCache,
  writeKS2LessonCache,
  type CachedKS2Lesson,
  type CachedKS2WorkedExampleWhiteboard,
} from "@/lib/ks2-lesson-cache";
import {
  KS2_LESSON_VISUAL_SCHEMA,
  ks2LessonVisualsPrompt,
} from "@/lib/ks2-required-visuals";
import { applyMethodBuilderToWorkedExample } from "@/lib/methods/apply-builder";
import { filterFitBlocks } from "@/lib/ks2-visual-fitness";
import { deepRepairStrings } from "@/lib/validate";
import { detectPromptInjection, INJECTION_GUARD } from "@/lib/input-safety";
import type { VisualBlock } from "@/types/whiteboard";
import { resolveKS2Taxonomy } from "@/lib/ks2-taxonomy";
import {
  normalizeToTeachingLesson,
  validateKS2TeachingLesson,
} from "@/lib/ks2-lesson-validator";
import {
  KS2_TEACHING_JSON_SHAPE,
  ks2TeachingEnginePrompt,
} from "@/lib/ks2-teaching-prompt";
import type { KS2TeachingLesson } from "@/types/ks2-lesson";

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
  whiteboard?: CachedKS2WorkedExampleWhiteboard;
}
type KS2Lesson = CachedKS2Lesson;

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

function enrichTeachingFields(
  lesson: KS2Lesson,
  topic: string,
  subtopics: string[],
  topicId: string,
): KS2Lesson {
  const taxonomy = topicId
    ? resolveKS2Taxonomy(topicId, subtopics[0])
    : null;
  const normalized = normalizeToTeachingLesson(
    lesson as unknown as Record<string, unknown>,
    {
      topic,
      yearGroup: taxonomy?.yearGroup,
      strand: taxonomy?.strand,
      skill: taxonomy?.skill || subtopics[0],
      method: taxonomy?.method,
    },
  );

  if (
    (!normalized.commonMistakes || normalized.commonMistakes.length === 0)
  ) {
    const watch = (normalized.workedExample.teachingSteps || []).find((s) =>
      /watch out|mistake|do not/i.test(`${s.title} ${s.explanation}`),
    );
    if (watch) {
      normalized.commonMistakes = [
        {
          mistake: watch.explanation,
          correction:
            watch.why || "Use the method shown in the worked example.",
        },
      ];
    } else if (taxonomy?.pedagogyId) {
      normalized.commonMistakes = [
        {
          mistake: "Rushing to an answer without showing the method.",
          correction: `Use ${taxonomy.method} and check each step.`,
        },
      ];
    }
  }

  if (!normalized.learningObjective) {
    normalized.learningObjective = taxonomy
      ? `Learn to ${taxonomy.skill.toLowerCase()} using ${taxonomy.method.toLowerCase()}.`
      : `Learn ${topic}.`;
  }
  if (!normalized.prerequisiteKnowledge?.length) {
    normalized.prerequisiteKnowledge = [
      "Place value and times tables",
      "Reading number lines and tables",
    ];
  }
  if (!normalized.recap) {
    normalized.recap = `Today we practised ${topic}. Use the method shown in the worked example and check your answer.`;
  }

  return {
    ...lesson,
    schemaVersion: 2,
    learningObjective: normalized.learningObjective,
    prerequisiteKnowledge: normalized.prerequisiteKnowledge,
    teachingBlocks: normalized.teachingBlocks,
    commonMistakes: normalized.commonMistakes,
    guidedPractice: normalized.guidedPractice,
    independentPractice: normalized.independentPractice,
    quickCheck: normalized.quickCheck,
    recap: normalized.recap,
    yearGroup: normalized.yearGroup,
    strand: normalized.strand,
    skill: normalized.skill,
    method: normalized.method,
    tryThis: lesson.tryThis || normalized.tryThis,
  };
}

function parseWorkedExampleWhiteboard(
  raw: unknown,
  question = "",
): CachedKS2WorkedExampleWhiteboard | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const wb = raw as Record<string, unknown>;
  if (!Array.isArray(wb.blocks) || wb.blocks.length === 0) return undefined;
  const repaired = deepRepairStrings({
    intro: (wb.intro || "").toString(),
    blocks: wb.blocks as VisualBlock[],
    conclusion: (wb.conclusion || "").toString(),
  });
  // Normalise column_method digit rows (strip spaces between digits)
  // and tolerate incomplete LLM table / number_line sketches.
  const normalised: VisualBlock[] = [];
  for (const block of repaired.blocks) {
    if (block.type === "column_method") {
      const rows = Array.isArray(block.rows) ? block.rows : [];
      normalised.push({
        ...block,
        rows: rows.map((row) => {
          const op = row.match(/^[+\-×x]/)?.[0] ?? "";
          const digits = row.replace(/^[+\-×x]\s*/, "").replace(/\s+/g, "");
          return op ? `${op}${digits}` : digits;
        }),
      });
      continue;
    }
    if (block.type === "table") {
      normalised.push({
        ...block,
        headers: Array.isArray(block.headers) ? block.headers.map(String) : [],
        rows: Array.isArray(block.rows)
          ? block.rows.map((row) => (Array.isArray(row) ? row.map(String) : []))
          : [],
        highlightCells: Array.isArray(block.highlightCells)
          ? block.highlightCells.filter(
              (c): c is [number, number] =>
                Array.isArray(c) &&
                c.length >= 2 &&
                Number.isFinite(Number(c[0])) &&
                Number.isFinite(Number(c[1])),
            )
          : undefined,
      });
      continue;
    }
    if (block.type === "number_line") {
      // Never invent a [0,10] placeholder — drop unfit lines via filterFitBlocks.
      if (!Array.isArray(block.range) || block.range.length < 2) continue;
      const min = Number(block.range[0]);
      const max = Number(block.range[1]);
      if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) continue;
      normalised.push({
        ...block,
        range: [min, max],
        tickInterval:
          typeof block.tickInterval === "number" && block.tickInterval > 0
            ? block.tickInterval
            : 1,
        markers: Array.isArray(block.markers) ? block.markers : [],
      });
      continue;
    }
    if (block.type === "equation_steps") {
      normalised.push({
        ...block,
        steps: Array.isArray(block.steps) ? block.steps : [],
      });
      continue;
    }
    normalised.push(block);
  }

  const fit = filterFitBlocks(normalised, question);
  if (fit.length === 0) return undefined;
  return {
    intro: repaired.intro,
    blocks: fit,
    conclusion: repaired.conclusion,
  };
}

function hardenWorkedExample(example: WorkedExample, topic: string, subtopics: string[]): WorkedExample {
  let next = example;
  if (next.whiteboard) {
    next = {
      ...next,
      whiteboard:
        parseWorkedExampleWhiteboard(next.whiteboard, next.question) || undefined,
    };
  }
  next = applyMethodBuilderToWorkedExample(next, topic, subtopics);
  if (next.whiteboard?.blocks) {
    const fit = filterFitBlocks(next.whiteboard.blocks, next.question);
    next = {
      ...next,
      whiteboard:
        fit.length > 0
          ? { ...next.whiteboard, blocks: fit }
          : undefined,
    };
  }
  return next;
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
    const topicId: string = (body.topicId || "").toString();
    const force: boolean = body.force === true;

    const isMaths = /math/i.test(subject);
    const mathsRule = isMaths
      ? `Wrap every number, calculation, fraction, or symbol in $...$ so it renders nicely. In JSON every LaTeX backslash MUST be doubled: write "$12 \\\\times 4$" and "$\\\\frac{3}{4}$". A single backslash before t becomes a tab and shows as the broken word "imes" — never do that.`
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
Keep every step to one short sentence in Year 5 language every pupil understands — never a paragraph or a chunk of text.
If a small comparison or list of facts would help (for example word classes, science facts, vocabulary), include an optional "table".
Return ONLY valid JSON in exactly this shape (no markdown fences):
{
  "intro": "1 friendly sentence introducing how we'll work it out",
  "steps": [{ "text": "one clear step", "emoji": "a single emoji" }],
  "table": { "headers": ["..."], "rows": [["..."]], "caption": "short caption" },
  "conclusion": "1 sentence wrapping up",
  "answer": "the final answer"
}
Use 2-5 steps. Omit "table" entirely if it would not help.
${englishExplainExtra(subject, topic, subtopics)}${detectPromptInjection(question) ? "\n\n" + INJECTION_GUARD : ""}`;
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
    if (topicId && !force) {
      const key = ks2LessonCacheKey(topicId, target, tier, kind);
      const cached = await lookupKS2LessonCache(key);
      if (cached) {
        if (isMaths && cached.workedExample?.question) {
          cached.workedExample = hardenWorkedExample(
            cached.workedExample,
            topic,
            subtopics,
          );
          const enriched = enrichTeachingFields(
            cached,
            topic,
            subtopics,
            topicId,
          );
          return NextResponse.json({ lesson: enriched, cached: true });
        } else if (cached.workedExample?.whiteboard) {
          cached.workedExample.whiteboard =
            parseWorkedExampleWhiteboard(
              cached.workedExample.whiteboard,
              cached.workedExample.question || "",
            ) || undefined;
        }
        return NextResponse.json({ lesson: cached, cached: true });
      }
    }

    const subtopicLine = subtopics.length
      ? `Cover these objectives: ${subtopics.join("; ")}.`
      : "";

    const guidedExtra =
      kind === "guided"
        ? `This is a GUIDED PRACTICE lesson: focus the sections on worked examples with helpful HINTS, and always include "tryThis" (a question the pupil attempts, with its answer). Show the method on a whiteboard-style diagram — steps are hints, not a word-only solution.`
        : `This is a LEARN lesson: teach the idea clearly from the start. Show the method visually first ("I do"), then name each step. Include "tryThis" if it helps.`;

    const mathsVisualExtra = isMaths
      ? `
MATHEMATICS — WHITEBOARD DIAGRAM REQUIRED:
${ks2LessonVisualsPrompt(topic, subtopics)}
${KS2_LESSON_VISUAL_SCHEMA}
${ks2TeachingEnginePrompt(
  topicId ? resolveKS2Taxonomy(topicId, subtopics[0]) : null,
  kind,
)}
${KS2_TEACHING_JSON_SHAPE}
`
      : "";

    const workedExampleShape = isMaths
      ? `"workedExample": {
    "question": "an example question",
    "steps": ["micro-step 1", "micro-step 2", "micro-step 3", "micro-step 4"],
    "answer": "the final answer",
    "emoji": "a single emoji",
    "whiteboard": {
      "intro": "one sentence before the diagram",
      "blocks": [{ "type": "column_method", "...": "..." }],
      "conclusion": "one sentence with the answer"
    }
  }`
      : `"workedExample": { "question": "an example question", "steps": ["step 1", "step 2"], "answer": "the final answer", "emoji": "a single emoji" }`;

    const teachingFieldsShape = isMaths
      ? `,
  "learningObjective": "one clear sentence",
  "prerequisiteKnowledge": ["short prior skill"],
  "commonMistakes": [{ "mistake": "...", "correction": "..." }],
  "guidedPractice": [{ "question": "...", "hint": "...", "answer": "..." }],
  "independentPractice": [{ "question": "...", "answer": "..." }],
  "quickCheck": { "question": "...", "answer": "..." },
  "recap": "2-3 sentences summarising the method"
`
      : "";

    const sys = `You are a warm, encouraging UK primary school teacher creating a ${targetPhrase(target)} lesson for a Year 5/6 pupil.
Subject: ${subject}. Topic: "${topic}". ${subtopicLine}
Difficulty: ${tierPhrase(tier)}.
${guidedExtra}
Write in simple, friendly language for a 9-11 year old. Be concrete and use everyday examples. ${mathsRule}
Make it playful and visual: pick a "heroEmoji" that represents the whole topic, and give every section a fitting "emoji".
Never use GCSE language — this is Key Stage 2 only.
${mathsVisualExtra}
Return ONLY valid JSON in exactly this shape (no markdown fences):
{
  "intro": "1-2 friendly sentences introducing the topic",
  "heroEmoji": "a single emoji for the topic",
  "sections": [{ "heading": "short heading", "body": "1-3 short sentences", "emoji": "a single emoji" }],
  ${workedExampleShape},
  "keyPoints": ["short thing to remember", "another"],
  "tryThis": { "question": "a question for the pupil to try", "answer": "the answer" }${teachingFieldsShape}
}
Use 3-5 sections, ${isMaths ? "4-8" : "2-4"} worked-example steps, and 2-4 key points.
${englishLessonExtra(subject, topic, subtopics)}`;

    async function generateOnce(): Promise<KS2Lesson | null> {
      const completion = await openai.chat.completions.create({
        model: isMaths ? "gpt-4o" : "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: sys },
          { role: "user", content: `Create the ${kind} lesson now.` },
        ],
        max_tokens: isMaths ? 3200 : 1400,
        temperature: 0.7,
      });

      const raw = completion.choices[0]?.message?.content || "{}";
      try {
        const parsed = deepRepairStrings(JSON.parse(raw));
        const built: KS2Lesson = {
          intro: (parsed.intro || "").toString(),
          heroEmoji: parsed.heroEmoji ? parsed.heroEmoji.toString() : undefined,
          sections: Array.isArray(parsed.sections)
            ? parsed.sections
                .filter(
                  (s: unknown): s is LessonSection =>
                    !!s && typeof (s as LessonSection).body === "string",
                )
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
                  emoji: parsed.workedExample.emoji
                    ? parsed.workedExample.emoji.toString()
                    : undefined,
                  whiteboard: parseWorkedExampleWhiteboard(
                    parsed.workedExample.whiteboard,
                    (parsed.workedExample.question || "").toString(),
                  ),
                }
              : { question: "", steps: [], answer: "" },
          keyPoints: Array.isArray(parsed.keyPoints)
            ? parsed.keyPoints.map((x: unknown) => String(x))
            : [],
          tryThis:
            parsed.tryThis &&
            typeof parsed.tryThis === "object" &&
            parsed.tryThis.question
              ? {
                  question: parsed.tryThis.question.toString(),
                  answer: (parsed.tryThis.answer || "").toString(),
                }
              : undefined,
          learningObjective: parsed.learningObjective
            ? String(parsed.learningObjective)
            : undefined,
          prerequisiteKnowledge: Array.isArray(parsed.prerequisiteKnowledge)
            ? parsed.prerequisiteKnowledge.map(String)
            : undefined,
          commonMistakes: Array.isArray(parsed.commonMistakes)
            ? parsed.commonMistakes
            : undefined,
          guidedPractice: Array.isArray(parsed.guidedPractice)
            ? parsed.guidedPractice
            : undefined,
          independentPractice: Array.isArray(parsed.independentPractice)
            ? parsed.independentPractice
            : undefined,
          quickCheck: parsed.quickCheck,
          recap: parsed.recap ? String(parsed.recap) : undefined,
          teachingBlocks: Array.isArray(parsed.teachingBlocks)
            ? parsed.teachingBlocks
            : undefined,
        };
        return built;
      } catch {
        return null;
      }
    }

    let lesson = await generateOnce();

    if (!lesson || (!lesson.intro && lesson.sections.length === 0)) {
      return NextResponse.json({ error: "Could not generate lesson" }, { status: 502 });
    }

    // Prefer deterministic method builders + drop unfit LLM sketches.
    if (isMaths && lesson.workedExample?.question) {
      lesson.workedExample = hardenWorkedExample(
        lesson.workedExample,
        topic,
        subtopics,
      );
      lesson = enrichTeachingFields(lesson, topic, subtopics, topicId);

      const teaching = normalizeToTeachingLesson(
        lesson as unknown as Record<string, unknown>,
        {
          topic,
          skill: subtopics[0],
        },
      ) as KS2TeachingLesson;
      let validation = validateKS2TeachingLesson(teaching, { maths: true });
      if (!validation.ok) {
        // One regenerate attempt with stricter user nudge
        const retry = await generateOnce();
        if (retry) {
          if (retry.workedExample?.question) {
            retry.workedExample = hardenWorkedExample(
              retry.workedExample,
              topic,
              subtopics,
            );
          }
          lesson = enrichTeachingFields(retry, topic, subtopics, topicId);
          validation = validateKS2TeachingLesson(
            normalizeToTeachingLesson(
              lesson as unknown as Record<string, unknown>,
              { topic, skill: subtopics[0] },
            ),
            { maths: true },
          );
        }
        // Soft-accept after enrich (builders often supply steps/why/mistakes)
        if (!validation.ok) {
          console.warn(
            "[ks2-lesson] validation issues after enrich:",
            validation.issues.map((i) => i.code).join(", "),
          );
        }
      }
    }

    if (topicId) {
      await writeKS2LessonCache({
        cacheKey: ks2LessonCacheKey(topicId, target, tier, kind),
        topicId,
        subject,
        topicName: topic,
        target,
        tier,
        kind,
        lesson: lesson as CachedKS2Lesson,
      });
    }

    return NextResponse.json({ lesson, cached: false });
  } catch (err) {
    console.error("ks2-lesson error:", err);
    return NextResponse.json({ error: "Failed to generate lesson" }, { status: 500 });
  }
}
