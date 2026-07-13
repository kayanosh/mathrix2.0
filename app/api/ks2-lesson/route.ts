import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { englishExplainExtra, englishLessonExtra } from "@/lib/ks2-english";
import { scienceLessonExtra } from "@/lib/ks2-science";
import { computingLessonExtra } from "@/lib/ks2-computing";
import { arabicLessonExtra } from "@/lib/ks2-arabic";
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
import {
  parseRomanNumeralQuestion,
  parseRomanToNumberQuestion,
} from "@/lib/methods/roman-numerals";
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
  coerceCanonicalLessonKeys,
  microStepsToTeachingSteps,
  type KS2MicroStep,
} from "@/lib/ks2-lesson-zod";
import {
  KS2_TEACHING_JSON_SHAPE,
  ks2TeachingEnginePrompt,
} from "@/lib/ks2-teaching-prompt";
import type { KS2TeachingLesson } from "@/types/ks2-lesson";
import {
  defaultPrerequisites,
  usesTeachingEngine,
} from "@/lib/ks2-subject-pedagogy/shared";
import { getKS2TopicById } from "@/lib/ks2";
import { allowRequest, requestClientKey } from "@/lib/rate-limit";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const BLOCKING_LESSON_ISSUES = new Set([
  "answer_before_reasoning",
  "uk_gcd_forbidden",
  "mistake_mismatch",
  "hcf_not_explained",
  "rounding_not_explained",
  "mixed_skill",
  "missing_visual",
  "unfit_visual",
  "visual_mismatch",
  "number_line_no_markers",
  "fraction_bar_invalid",
  "fraction_grid_invalid",
  "fraction_wall_empty",
  "bar_model_empty",
  "hundred_square_invalid",
  "area_model_invalid",
  "key_info_empty",
]);

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
  teachingSteps?: CachedKS2Lesson["workedExample"]["teachingSteps"];
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
  subjectId = "maths",
): KS2Lesson {
  const taxonomy = topicId
    ? resolveKS2Taxonomy(topicId, subtopics[0])
    : null;
  const sid = taxonomy?.subjectId || subjectId;
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

  if (!normalized.commonMistakes || normalized.commonMistakes.length === 0) {
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
    } else if (taxonomy?.commonMistakes?.length) {
      normalized.commonMistakes = taxonomy.commonMistakes.slice(0, 2);
    } else {
      normalized.commonMistakes = [
        {
          mistake: "Rushing to an answer without showing the method.",
          correction: `Use ${taxonomy?.method || "the steps shown"} and check carefully.`,
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
    normalized.prerequisiteKnowledge =
      taxonomy?.prerequisites?.length
        ? taxonomy.prerequisites
        : defaultPrerequisites(sid);
  }
  if (!normalized.recap) {
    normalized.recap = taxonomy
      ? `Remember: for ${taxonomy.skill}, use ${taxonomy.method}. Check each step carefully.`
      : `Remember the method for ${topic} and check each step carefully.`;
  }

  // UK KS2: never leave GCD wording in child-facing copy
  const scrubGcd = (s: string) =>
    s
      .replace(/\bGCD\b/g, "HCF")
      .replace(/\bgreatest common divisor\b/gi, "highest common factor")
      .replace(/\bgreatest common denominator\b/gi, "highest common factor");

  if (sid === "maths") {
    normalized.recap = scrubGcd(normalized.recap);
    if (normalized.learningObjective) {
      normalized.learningObjective = scrubGcd(normalized.learningObjective);
    }
    if (Array.isArray(normalized.commonMistakes)) {
      normalized.commonMistakes = normalized.commonMistakes.map((m) => ({
        mistake: scrubGcd(m.mistake),
        correction: scrubGcd(m.correction),
      }));
    }
  }

  // Prefer taxonomy skill-matched mistakes when LLM mistakes look off-topic for simplify
  if (
    sid === "maths" &&
    taxonomy?.pedagogyId === "fraction_simplify" &&
    taxonomy.commonMistakes?.length
  ) {
    const blob = (normalized.commonMistakes || [])
      .map((m) => `${m.mistake} ${m.correction}`)
      .join(" ")
      .toLowerCase();
    if (/add(?:ing)? fractions|common denominator|compare/.test(blob) || !blob) {
      normalized.commonMistakes = taxonomy.commonMistakes.slice(0, 2);
    }
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
    intro: lesson.intro ? scrubGcd(String(lesson.intro)) : lesson.intro,
    sections: Array.isArray(lesson.sections)
      ? lesson.sections.map((s) => ({
          ...s,
          heading: scrubGcd(String(s.heading || "")),
          body: scrubGcd(String(s.body || "")),
        }))
      : lesson.sections,
    workedExample: lesson.workedExample
      ? {
          ...lesson.workedExample,
          question: scrubGcd(String(lesson.workedExample.question || "")),
          steps: (lesson.workedExample.steps || []).map((st) => scrubGcd(String(st))),
          answer: scrubGcd(String(lesson.workedExample.answer || "")),
        }
      : lesson.workedExample,
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
  if (subtopics.some((skill) => /roman numerals?\s+to\s+1000/i.test(skill))) {
    const romanValue =
      parseRomanNumeralQuestion(next.question) ??
      parseRomanToNumberQuestion(next.question)?.value ??
      null;
    if (romanValue != null && romanValue > 1000) {
      next = {
        ...next,
        question: "How do we write 944 in Roman numerals?",
        steps: [],
        answer: "",
        teachingSteps: undefined,
        whiteboard: undefined,
      };
    }
  }
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
    if (!allowRequest(`ks2-lesson:${requestClientKey(req.headers)}`, 120, 600_000)) {
      return NextResponse.json({ error: "Too many lesson requests" }, { status: 429 });
    }
    const body = await req.json().catch(() => ({}));
    const subject: string = String(body.subject || "Mathematics").slice(0, 80);
    const topic: string = String(body.topic || "general").slice(0, 160);
    const subtopics: string[] = Array.isArray(body.subtopics)
      ? body.subtopics.slice(0, 20).map((value: unknown) => String(value).slice(0, 160))
      : [];
    const target: string = ["curriculum", "sats", "eleven_plus"].includes(body.target)
      ? body.target
      : "curriculum";
    const tier: string = ["developing", "secure", "greater_depth"].includes(body.tier)
      ? body.tier
      : "secure";
    const kind: string = ["lesson", "guided", "explain"].includes(body.kind) ? body.kind : "lesson";
    const topicId: string = (body.topicId || "").toString();
    const force: boolean = body.force === true;

    const isMaths = /math/i.test(subject);
    const topicCtx = topicId ? getKS2TopicById(topicId) : null;
    const subjectId =
      topicCtx?.subject.id ||
      (/math/i.test(subject)
        ? "maths"
        : /english/i.test(subject)
          ? "english"
          : /science/i.test(subject)
            ? "science"
            : /comput/i.test(subject)
              ? "computing"
              : /arabic/i.test(subject)
                ? "arabic"
                : "english");
    const teachingSubject = usesTeachingEngine(subjectId);
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
      const requestedSkill = String(body.skill || subtopics[0] || topic || "").slice(0, 160);
      const key = ks2LessonCacheKey(topicId, target, tier, kind, requestedSkill);
      const cached = await lookupKS2LessonCache(key);
      if (cached) {
        if (isMaths && cached.workedExample?.question) {
          cached.workedExample = hardenWorkedExample(
            cached.workedExample,
            topic,
            subtopics,
          );
        } else if (cached.workedExample?.whiteboard) {
          cached.workedExample.whiteboard =
            parseWorkedExampleWhiteboard(
              cached.workedExample.whiteboard,
              cached.workedExample.question || "",
            ) || undefined;
        }
        if (teachingSubject) {
          const enriched = enrichTeachingFields(
            cached,
            topic,
            subtopics,
            topicId,
            subjectId,
          );
          const cachedTaxonomy = resolveKS2Taxonomy(
            topicId,
            requestedSkill || undefined,
          );
          const cachedValidation = validateKS2TeachingLesson(
            normalizeToTeachingLesson(
              enriched as unknown as Record<string, unknown>,
              {
                topic,
                skill: requestedSkill || cachedTaxonomy?.skill,
                yearGroup: cachedTaxonomy?.yearGroup,
                strand: cachedTaxonomy?.strand,
                method: cachedTaxonomy?.method,
              },
            ),
            { subject: subjectId, requireVisual: isMaths },
          );
          if (cachedValidation.ok) {
            return NextResponse.json({ lesson: enriched, cached: true });
          }
          console.warn(
            "[ks2-lesson] ignoring invalid cached lesson:",
            cachedValidation.issues.map((issue) => issue.code).join(", "),
          );
        } else {
          return NextResponse.json({ lesson: cached, cached: true });
        }
      }
    }

    const requestedSkill = String(body.skill || subtopics[0] || topic || "").slice(0, 160);
    const focusSkill =
      subtopics.length === 0 || subtopics.includes(requestedSkill)
        ? requestedSkill
        : subtopics[0];
    const subtopicLine = focusSkill
      ? `Teach ONLY this one skill: "${focusSkill}". Do not mix nearby skills or cover the whole topic list.`
      : "";

    const guidedExtra =
      kind === "guided"
        ? `This is a GUIDED PRACTICE lesson: focus on worked examples with helpful HINTS for THIS skill only, and always include "tryThis".`
        : `This is a LEARN lesson: teach THIS one skill clearly from the start ("I do"), then name each step.`;

    const taxonomy = topicId
      ? resolveKS2Taxonomy(topicId, focusSkill || undefined)
      : null;

    const teachingEngineExtra = teachingSubject
      ? `
${isMaths ? `MATHEMATICS — WHITEBOARD DIAGRAM REQUIRED:\n${ks2LessonVisualsPrompt(topic, [focusSkill].filter(Boolean))}\n${KS2_LESSON_VISUAL_SCHEMA}\n` : ""}
${ks2TeachingEnginePrompt(taxonomy, kind, subject)}
${KS2_TEACHING_JSON_SHAPE}
`
      : "";

    const workedExampleShape = isMaths
      ? `"workedExample": {
    "question": "an example for THIS skill only",
    "method": "the method for this skill",
    "steps": [
      { "stepNumber": 1, "title": "...", "teacherText": "small teaching step" },
      { "stepNumber": 2, "title": "...", "teacherText": "..." },
      { "stepNumber": 3, "title": "...", "teacherText": "..." },
      { "stepNumber": 4, "title": "...", "teacherText": "..." },
      { "stepNumber": 5, "title": "...", "teacherText": "..." },
      { "stepNumber": 6, "title": "...", "teacherText": "..." }
    ],
    "finalAnswer": "the final answer",
    "check": "how we know it is right",
    "emoji": "a single emoji",
    "whiteboard": {
      "intro": "one sentence before the diagram",
      "blocks": [{ "type": "number_line", "...": "..." }],
      "conclusion": "one sentence with the answer"
    }
  }`
      : teachingSubject
        ? `"workedExample": {
    "question": "an example question for THIS skill",
    "steps": ["micro-step 1", "micro-step 2", "micro-step 3", "micro-step 4"],
    "answer": "the final answer",
    "emoji": "a single emoji",
    "whiteboard": {
      "intro": "optional — one sentence before a helpful table or key_info card",
      "blocks": [{ "type": "table", "headers": ["..."], "rows": [["..."]] }],
      "conclusion": "one sentence wrapping up"
    }
  }`
        : `"workedExample": { "question": "an example question", "steps": ["step 1", "step 2"], "answer": "the final answer", "emoji": "a single emoji" }`;

    const teachingFieldsShape = teachingSubject
      ? `,
  "skill": "${focusSkill.replace(/"/g, "")}",
  "learningObjective": "one clear sentence for this skill only",
  "priorKnowledge": ["short prior skill"],
  "coreExplanation": "what this skill means and why the method works",
  "commonMistake": { "mistake": "...", "correction": "..." },
  "guidedPractice": [{ "question": "...", "hint": "...", "answer": "..." }],
  "independentPractice": [{ "question": "...", "answer": "..." }],
  "quickCheck": { "question": "...", "answer": "..." },
  "recap": "2-3 sentences naming THIS skill and method"
`
      : "";

    const subjectExtras = [
      englishLessonExtra(subject, topic, [focusSkill].filter(Boolean)),
      scienceLessonExtra(subject, topic, [focusSkill].filter(Boolean)),
      computingLessonExtra(subject, topic, [focusSkill].filter(Boolean)),
      arabicLessonExtra(subject, topic, [focusSkill].filter(Boolean)),
    ]
      .filter(Boolean)
      .join("\n");
    const lessonInputGuard = detectPromptInjection(
      [subject, topic, focusSkill].join(" "),
    )
      ? INJECTION_GUARD
      : "";

    const sys = isMaths
      ? `You are a UK Year 5 and Year 6 maths teacher creating a ${targetPhrase(target)} lesson.
Subject: ${subject}. Topic: "${topic}". ${subtopicLine}
Difficulty: ${tierPhrase(tier)}.
${guidedExtra}
Return valid JSON only. Teach one skill only. Do not mix nearby topics.
${mathsRule}
${teachingEngineExtra}
${subjectExtras}
${lessonInputGuard}
Return ONLY valid JSON in exactly this shape (no markdown fences):
{
  "intro": "1-2 friendly sentences introducing THIS skill",
  "heroEmoji": "a single emoji",
  "sections": [{ "heading": "Core idea", "body": "core explanation for this skill", "emoji": "a single emoji" }],
  ${workedExampleShape},
  "keyPoints": ["short thing to remember", "another"],
  "tryThis": { "question": "a question for the pupil to try", "answer": "the answer" }${teachingFieldsShape}
}
Use 3-5 sections, 6-10 worked-example micro-steps, and 2-4 key points.`
      : `You are a warm, encouraging UK primary school teacher creating a ${targetPhrase(target)} lesson for a Year 5/6 pupil.
Subject: ${subject}. Topic: "${topic}". ${subtopicLine}
Difficulty: ${tierPhrase(tier)}.
${guidedExtra}
Write in simple, friendly language for a 9-11 year old. Be concrete and use everyday examples. ${mathsRule}
Keep sentences short (aim for 18 words or fewer) and define each new subject word immediately.
Make it playful and visual: pick a "heroEmoji" that represents the whole topic, and give every section a fitting "emoji".
Never use GCSE language — this is Key Stage 2 only.
${teachingEngineExtra}
${subjectExtras}
${lessonInputGuard}
Return ONLY valid JSON in exactly this shape (no markdown fences):
{
  "intro": "1-2 friendly sentences introducing the topic",
  "heroEmoji": "a single emoji for the topic",
  "sections": [{ "heading": "short heading", "body": "1-3 short sentences", "emoji": "a single emoji" }],
  ${workedExampleShape},
  "keyPoints": ["short thing to remember", "another"],
  "tryThis": { "question": "a question for the pupil to try", "answer": "the answer" }${teachingFieldsShape}
}
Use 3-5 sections, ${teachingSubject ? "4-8" : "2-4"} worked-example steps, and 2-4 key points.`;

    async function generateOnce(): Promise<KS2Lesson | null> {
      const completion = await openai.chat.completions.create({
        model: isMaths ? "gpt-4o" : "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: sys },
          { role: "user", content: `Create the ${kind} lesson now.` },
        ],
        max_tokens: isMaths ? 3200 : teachingSubject ? 2200 : 1400,
        temperature: 0.7,
      });

      const raw = completion.choices[0]?.message?.content || "{}";
      try {
        const parsed = coerceCanonicalLessonKeys(
          deepRepairStrings(JSON.parse(raw)) as Record<string, unknown>,
        );
        const weRaw = parsed.workedExample as Record<string, unknown> | undefined;
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
            : parsed.conceptExplanation || parsed.coreExplanation
              ? [
                  {
                    heading: "Core idea",
                    body: String(
                      parsed.conceptExplanation || parsed.coreExplanation,
                    ),
                  },
                ]
              : [],
          workedExample:
            weRaw && typeof weRaw === "object"
              ? {
                  question: (weRaw.question || "").toString(),
                  steps: Array.isArray(weRaw.steps)
                    ? weRaw.steps.map((x: unknown) => String(x))
                    : [],
                  answer: (
                    weRaw.answer ||
                    weRaw.finalAnswer ||
                    ""
                  ).toString(),
                  emoji: weRaw.emoji ? weRaw.emoji.toString() : undefined,
                  whiteboard: parseWorkedExampleWhiteboard(
                    weRaw.whiteboard,
                    (weRaw.question || "").toString(),
                  ),
                  teachingSteps: Array.isArray(weRaw.microSteps)
                    ? microStepsToTeachingSteps(
                        weRaw.microSteps as KS2MicroStep[],
                      )
                    : Array.isArray(weRaw.teachingSteps)
                      ? (weRaw.teachingSteps as WorkedExample["teachingSteps"])
                      : undefined,
                }
              : { question: "", steps: [], answer: "" },
          keyPoints: Array.isArray(parsed.keyPoints)
            ? parsed.keyPoints.map((x: unknown) => String(x))
            : [],
          tryThis:
            parsed.tryThis &&
            typeof parsed.tryThis === "object" &&
            (parsed.tryThis as { question?: string }).question
              ? {
                  question: String(
                    (parsed.tryThis as { question: string }).question,
                  ),
                  answer: String(
                    (parsed.tryThis as { answer?: string }).answer || "",
                  ),
                }
              : undefined,
          learningObjective: parsed.learningObjective
            ? String(parsed.learningObjective)
            : undefined,
          prerequisiteKnowledge: Array.isArray(parsed.prerequisiteKnowledge)
            ? parsed.prerequisiteKnowledge.map(String)
            : Array.isArray(parsed.priorKnowledge)
              ? parsed.priorKnowledge.map(String)
              : undefined,
          commonMistakes: Array.isArray(parsed.commonMistakes)
            ? parsed.commonMistakes
            : parsed.commonMistake
              ? [parsed.commonMistake]
              : undefined,
          guidedPractice: Array.isArray(parsed.guidedPractice)
            ? parsed.guidedPractice
            : undefined,
          independentPractice: Array.isArray(parsed.independentPractice)
            ? parsed.independentPractice
            : undefined,
          quickCheck: parsed.quickCheck as KS2Lesson["quickCheck"],
          recap: parsed.recap ? String(parsed.recap) : undefined,
          teachingBlocks: Array.isArray(parsed.teachingBlocks)
            ? parsed.teachingBlocks
            : undefined,
          skill: parsed.skill ? String(parsed.skill) : focusSkill || undefined,
          method: parsed.method ? String(parsed.method) : undefined,
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

    // Prefer deterministic method builders (maths) + enrich teaching fields.
    const skillSubs = [focusSkill].filter(Boolean);
    if (isMaths && lesson.workedExample?.question) {
      lesson.workedExample = hardenWorkedExample(
        lesson.workedExample,
        topic,
        skillSubs,
      );
    } else if (lesson.workedExample?.whiteboard) {
      lesson.workedExample.whiteboard =
        parseWorkedExampleWhiteboard(
          lesson.workedExample.whiteboard,
          lesson.workedExample.question || "",
        ) || undefined;
    }

    let cacheable = true;
    let qualityWarnings: string[] = [];

    if (teachingSubject) {
      lesson = enrichTeachingFields(
        lesson,
        topic,
        skillSubs,
        topicId,
        subjectId,
      );

      const taxMeta = topicId
        ? resolveKS2Taxonomy(topicId, focusSkill || undefined)
        : null;
      const teaching = normalizeToTeachingLesson(
        lesson as unknown as Record<string, unknown>,
        {
          topic,
          skill: focusSkill || taxMeta?.skill,
          yearGroup: taxMeta?.yearGroup,
          strand: taxMeta?.strand,
          method: taxMeta?.method,
        },
      ) as KS2TeachingLesson;
      let validation = validateKS2TeachingLesson(teaching, {
        subject: subjectId,
        requireVisual: isMaths,
      });
      if (!validation.ok) {
        const retry = await generateOnce();
        if (retry) {
          if (isMaths && retry.workedExample?.question) {
            retry.workedExample = hardenWorkedExample(
              retry.workedExample,
              topic,
              skillSubs,
            );
          }
          lesson = enrichTeachingFields(
            retry,
            topic,
            skillSubs,
            topicId,
            subjectId,
          );
          validation = validateKS2TeachingLesson(
            normalizeToTeachingLesson(
              lesson as unknown as Record<string, unknown>,
              { topic, skill: focusSkill },
            ),
            { subject: subjectId, requireVisual: isMaths },
          );
        }
        if (!validation.ok) {
          const blocking = validation.issues.filter((issue) =>
            BLOCKING_LESSON_ISSUES.has(issue.code),
          );
          qualityWarnings = validation.issues.map((issue) => issue.code);
          if (blocking.length > 0) {
            console.error(
              "[ks2-lesson] rejected unsafe lesson after quality retry:",
              qualityWarnings.join(", "),
            );
            return NextResponse.json(
              {
                error: "The generated lesson contained unsafe or mismatched teaching content.",
                issues: qualityWarnings,
              },
              { status: 422 },
            );
          }
          cacheable = false;
          console.warn(
            "[ks2-lesson] serving recoverable lesson without caching:",
            qualityWarnings.join(", "),
          );
        }
      }
    }

    if (topicId && cacheable) {
      await writeKS2LessonCache({
        cacheKey: ks2LessonCacheKey(topicId, target, tier, kind, focusSkill),
        topicId,
        subject,
        topicName: topic,
        target,
        tier,
        kind,
        lesson: lesson as CachedKS2Lesson,
      });
    }

    return NextResponse.json({
      lesson,
      cached: false,
      cacheable,
      qualityWarnings,
    });
  } catch (err) {
    console.error("ks2-lesson error:", err);
    return NextResponse.json({ error: "Failed to generate lesson" }, { status: 500 });
  }
}
