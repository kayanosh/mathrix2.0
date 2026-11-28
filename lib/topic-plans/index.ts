/**
 * How each topic is taught.
 *
 * The teaching guidance used to stop at the six strands of the syllabus: one
 * page for all of Number, one for all of Geometry. Surds and standard form got
 * the same instructions, and so did circle theorems and vectors, which is why
 * some answers were a lesson and others were two lines of working.
 *
 * A plan is what a teacher holds in their head for one topic: what the pupil
 * needs first, the one idea underneath it, the picture that carries the idea,
 * the method in order, the mistake everyone makes, how to check, and how the
 * marks are given. It is given to the model whenever a question, or a "teach
 * me" lesson, is on that topic.
 *
 * There is a plan for every subtopic of the GCSE syllabus, one file per strand.
 * The content is a first draft and should be read by a maths teacher.
 */
import type { WhiteboardResponse } from "@/types/whiteboard";
import type { TopicPlan } from "./types";
import { NUMBER_PLANS } from "./number";
import { ALGEBRA_PLANS } from "./algebra";
import { RATIO_PLANS } from "./ratio";
import { GEOMETRY_PLANS } from "./geometry";
import { STATISTICS_PLANS } from "./statistics";
import { PROBABILITY_PLANS } from "./probability";

export type { Strand, TopicPlan } from "./types";

/**
 * Every plan, in the order a question is tested against them. The first that
 * matches is used, so the order runs from the topics with the most distinctive
 * wording to the most general. A probability question that mentions a mean, or
 * a trigonometry question that mentions a hypotenuse, has to be claimed by its
 * own topic before a broader one sees it. Within a strand the same rule holds:
 * see the order of each strand's own list.
 */
export const TOPIC_PLANS: TopicPlan[] = [
  ...PROBABILITY_PLANS,
  ...STATISTICS_PLANS,
  ...GEOMETRY_PLANS,
  ...RATIO_PLANS,
  ...NUMBER_PLANS,
  ...ALGEBRA_PLANS,
];

/** The plan for a question, or null when the question is not on a planned topic. */
export function planForQuestion(question: string | undefined | null): TopicPlan | null {
  const text = String(question ?? "");
  if (!text.trim()) return null;
  return (
    TOPIC_PLANS.find(
      (plan) => plan.match.some((re) => re.test(text)) && !(plan.not ?? []).some((re) => re.test(text)),
    ) ?? null
  );
}

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * The plan for a named topic ("Pythagoras' theorem", "Sharing in a ratio"), as
 * typed into "teach me a topic" or picked from the syllabus.
 */
export function planForTopic(topic: string | undefined | null): TopicPlan | null {
  const wanted = slug(String(topic ?? ""));
  if (!wanted) return null;
  const names = (plan: TopicPlan) => [plan.title, ...plan.subtopics].map(slug);

  // The exact name first. With 64 plans a loose match finds the wrong one:
  // "Expanding and factorising" contains "factorising", and "Functions" is
  // contained in "Inverse and composite functions".
  const exact = TOPIC_PLANS.find((plan) => names(plan).includes(wanted));
  if (exact) return exact;

  // Then a name typed loosely ("pythagoras", "the quadratic formula please").
  // The longest name that fits wins, so the more specific topic is chosen.
  let best: { plan: TopicPlan; length: number } | null = null;
  for (const plan of TOPIC_PLANS) {
    for (const known of names(plan)) {
      const fits = wanted.includes(known) || (wanted.length >= 6 && known.includes(wanted));
      if (fits && (!best || known.length > best.length)) best = { plan, length: known.length };
    }
  }
  return best?.plan ?? planForQuestion(topic);
}

const numbered = (lines: string[]) => lines.map((line, i) => `  ${i + 1}. ${line}`).join("\n");

/**
 * A plan as the model must see it: every LaTeX backslash doubled.
 *
 * The answer is JSON, where a LaTeX command needs two backslashes. The plans
 * are written with one, as maths is normally written, and the model copied what
 * it was shown. "\pi" inside a JSON string is not a legal escape, so the reply
 * came back with π replaced by an unprintable character, and the area of a
 * circle of radius 5 was shown as "25 cm²". Every other example in the prompt
 * is already doubled; the plans now are too.
 */
function forJson(plan: TopicPlan): TopicPlan {
  const twice = (text: string) => text.replace(/\\/g, "\\\\");
  return {
    ...plan,
    needsFirst: twice(plan.needsFirst),
    bigIdea: twice(plan.bigIdea),
    picture: plan.picture ? { ...plan.picture, draw: twice(plan.picture.draw) } : undefined,
    method: plan.method.map(twice),
    mistake: { wrong: twice(plan.mistake.wrong), right: twice(plan.mistake.right) },
    check: twice(plan.check),
    ask: twice(plan.ask),
    marks: twice(plan.marks),
  };
}

/**
 * The plan as instructions for answering ONE question. Each part is tied to the
 * field of the answer it belongs in, so that whether it was followed can be
 * seen in the answer and not only hoped for.
 */
export function planForSolving(written: TopicPlan): string {
  const plan = forJson(written);
  return `
━━━ HOW TO TEACH THIS TOPIC: ${plan.title.toUpperCase()} ━━━
This question is on ${plan.title}. Teach it the way set out here. Where this differs from the general guidance above, follow this. The format rules (JSON, arrows, block types) still apply.

THE OPENING. "intro" is exactly two sentences, as a teacher starts at the board. First, what we are asked to find, with this question's own numbers. Second, the idea we will use to find it, in plain words. Never "Let's work through this step by step": that says nothing.
  Good: "We need the length of the arc of a 60° slice of a circle with radius 6 cm. An arc is a fraction of the whole way round, so we find that fraction and take it of the circumference."

THE BIG IDEA. It is the second sentence of the "intro", and it goes in "keyTakeaway" in your own short words, as a rule the pupil can use on the next question (never this question's answer):
  ${plan.bigIdea}
${
  plan.picture
    ? `
THE PICTURE. Your first block must be a "${plan.picture.block}" block, before any working:
  ${plan.picture.draw}
`
    : ""
}
THE METHOD. Use the steps that this question needs, in this order, one move per step:
${numbered(plan.method)}

WRITE WHOLE LINES. Each "latexAfter" is a complete line of working that makes sense read on its own: what it is, the working, and the result. A line is never a bare number.
  Bad:  "12\\\\pi"            Good: "\\\\text{Circumference} = 2 \\\\times \\\\pi \\\\times 6 = 12\\\\pi \\\\text{ cm}"
  Bad:  "9"                 Good: "\\\\text{Edges} = 3 + 3 + 3 = 9"
  Bad:  "£24"               Good: "\\\\text{Amy} = 2 \\\\times £12 = £24"
Any sum that is said must also be written. If the "explanation" says "5 times 6 is 30", the line shows "5 \\\\times 6 = 30". Every step has a "latexAfter".

ONE MOVE PER LINE. A pupil must be able to see how each line came from the one before. Do not do two things in one step: "x^2 + 6x + 2" does not become "(x + 3)^2 - 7" in one line. Show "(x + 3)^2 - 9 + 2" first.

SAY THE NUMBERS. Every "explanation" names the numbers on its own line: "9 squared is 81 and 12 squared is 144", never "work out the squares".

THE REASON. EVERY step has a "why": one short sentence giving the reason the step is allowed or needed. A teacher never writes a line without saying why. Never leave it out, and never a "why" that only repeats the step ("Amy's share is calculated").
  Step: "Divide £60 by 5."          "why": "There are 5 equal parts, so one part is a fifth of the money."
  Step: "Take 60 over 360."         "why": "A full turn is 360°, so the slice is that fraction of the circle."

ASK ONE REAL QUESTION. Choose one step in the middle of the working. In that step's "selfCheck", put a question whose answer is that step's own line. The board asks it and waits BEFORE the line is written, so the pupil can work it out first. It starts with What, Which or How, ends in a question mark, uses this question's own numbers, and has one short answer. Never ask about something already on the board, and never "Does that make sense?" or "Ready?".
  It should be this kind of question: "${plan.ask}"
  Example: on the step whose line is "\\\\text{One part} = £60 \\\\div 5 = £12", the "selfCheck" is "What is one part worth?"

CHECK THE ANSWER. On the last step, put the check in "selfCheck" as a statement with the numbers worked through, not as a question:
  ${plan.check}

THE MISTAKE TO WARN ABOUT. Put it in "hint" as two plain sentences, what goes wrong and what to do instead, using this question's numbers where you can. Do not write the words "Wrong:" or "Right:".
  What goes wrong: ${plan.mistake.wrong}
  What to do: ${plan.mistake.right}

HOW THE MARKS ARE GIVEN. Put it in "examTip" in one sentence:
  ${plan.marks}

BEFORE YOU ANSWER, check your JSON has every one of these. An answer missing any of them is incomplete:
  □ "intro" is two sentences: what we are finding, then the idea we will use
  □ "keyTakeaway" gives the big idea as a rule for next time
  □ every "latexAfter" is a whole line (what it is = working = result), never a bare number
  □ no step makes two moves at once
${plan.picture ? `  □ the first block is a "${plan.picture.block}"\n` : ""}  □ each step's "explanation" names its numbers
  □ EVERY step has a "why" with a real reason in it
  □ one step in the middle has a "selfCheck" question whose answer is that step's own line
  □ the last step has a "selfCheck" that is a worked check, not a question
  □ "hint" warns about the mistake
  □ "examTip" says how the marks are given`;
}

/** The plan as instructions for a whole "teach me this topic" lesson. */
export function planForLesson(written: TopicPlan): string {
  const plan = forJson(written);
  return `
━━━ HOW TO TEACH THIS TOPIC: ${plan.title.toUpperCase()} ━━━
Build the lesson on this plan. The LESSON CONTRACT still sets the sections and their order; this sets what goes in them.

WHAT THE PUPIL NEEDS FIRST. Open with one quick question that checks it, and answer it:
  ${plan.needsFirst}

THE BIG IDEA. Give it in the "objective" or "rule" section before any method, and again as "keyTakeaway":
  ${plan.bigIdea}
${
  plan.picture
    ? `
THE PICTURE. Use a "${plan.picture.block}" block in the rule and in each worked example:
  ${plan.picture.draw}
`
    : ""
}
THE METHOD. Teach these steps in this order and use the same order in every example:
${numbered(plan.method)}

THREE LEVELS. The examples must get harder: one straightforward, one with a twist (a different unknown, a decimal, a context), and the pupil's own question for "you do".

THE MISTAKE. Show it being made, then put it right, in its own short part of the lesson, and in "hint":
  Wrong: ${plan.mistake.wrong}
  Right: ${plan.mistake.right}

A REAL QUESTION. In the guided example, stop and ask the pupil: "${plan.ask}"

CHECKING. Every worked example ends by checking its answer:
  ${plan.check}

EXAM MARKS. Finish with how the marks are given:
  ${plan.marks}`;
}

export interface PlanCoverage {
  picture: boolean;
  bigIdea: boolean;
  reasons: boolean;
  asksPupil: boolean;
  checksAnswer: boolean;
  mistake: boolean;
  marks: boolean;
}

/**
 * Which parts of a plan can be seen in an answer. Used to compare answers
 * before and after a plan, and in tests. It looks at where things are, not at
 * how well they are written: that still takes a person.
 */
export function planCoverage(plan: TopicPlan, answer: WhiteboardResponse): PlanCoverage {
  const steps = answer.blocks.flatMap((b) => (b.type === "equation_steps" ? b.steps : []));
  const doing = steps.filter((s) => (s.latexBefore ?? "") !== s.latexAfter);
  const withReason = doing.filter((s) => (s.why ?? "").trim().length > 12);
  const checks = steps.map((s) => (s.selfCheck ?? "").trim()).filter(Boolean);
  const isQuestion = (text: string) => /\?\s*$/.test(text.replace(/[✓✔]/g, "").trim());
  return {
    picture: !plan.picture || answer.blocks.some((b) => b.type === plan.picture?.block),
    bigIdea: (answer.keyTakeaway ?? "").trim().length > 15,
    reasons: doing.length > 0 && withReason.length >= Math.ceil(doing.length / 2),
    asksPupil: checks.some(isQuestion),
    checksAnswer: checks.some((text) => !isQuestion(text)),
    mistake: (answer.hint ?? "").trim().length > 15,
    marks: (answer.examTip ?? "").trim().length > 15,
  };
}

/** A version stamp for a topic's saved lesson: changes when its plan does. */
export function planVersionFor(topic: string | undefined | null): string {
  const plan = planForTopic(topic);
  return plan ? `${plan.id}@${plan.version}` : "";
}
