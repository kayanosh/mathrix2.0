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
 * This is a pilot: one plan in each strand. The content is a first draft and
 * should be read by a maths teacher before more are added.
 */
import type { WhiteboardResponse } from "@/types/whiteboard";

export type Strand = "number" | "algebra" | "ratio" | "geometry" | "statistics" | "probability";

export interface TopicPlan {
  id: string;
  strand: Strand;
  /** Name shown to the model and used in logs. */
  title: string;
  /** The syllabus subtopics this plan teaches, as written in lib/syllabus.ts. */
  subtopics: string[];
  /** A question is on this topic if it matches one of these… */
  match: RegExp[];
  /** …and none of these, which belong to a neighbouring topic. */
  not?: RegExp[];
  /** What the pupil must already be able to do. */
  needsFirst: string;
  /** The idea underneath the method, in words a pupil could repeat. */
  bigIdea: string;
  /** The picture that carries the idea, and exactly how to draw it. */
  picture?: { block: string; draw: string };
  /** The method, one move per line, in the order it is taught. */
  method: string[];
  /** The mistake most pupils make, and what to do instead. */
  mistake: { wrong: string; right: string };
  /** How the answer is checked. Shown by the teacher on the last step. */
  check: string;
  /** One real question put to the pupil part-way through. */
  ask: string;
  /** How the marks are given in the exam. */
  marks: string;
  /** Bump when the plan changes, so saved lessons are written again. */
  version: number;
}

export const TOPIC_PLANS: TopicPlan[] = [
  {
    id: "standard-form",
    strand: "number",
    title: "Standard form",
    subtopics: ["Standard form"],
    match: [/standard (?:index )?form/i, /\d\s*(?:×|x|\\times|\*)\s*10\s*\^/i],
    needsFirst: "Multiplying and dividing by 10, 100 and 1000, and what a power of 10 means.",
    bigIdea:
      "Standard form writes any number as a number from 1 up to 10, times a power of 10. The power says how many places the digits have moved.",
    method: [
      "For a calculation: deal with the front numbers first (multiply or divide them).",
      "Then deal with the powers of 10: add the powers when multiplying, subtract them when dividing.",
      "Look at the front number. If it is not at least 1 and less than 10, move it one place and change the power by one to make up for it.",
      "For changing an ordinary number: put the decimal point after the first digit that is not zero, then count how many places the digits moved. A big number has a positive power; a number smaller than 1 has a negative power.",
    ],
    mistake: {
      wrong: "Stopping at an answer such as $12 \\times 10^{8}$, where the front number is not between 1 and 10.",
      right: "$12 \\times 10^{8}$ is $1.2 \\times 10^{9}$. The front number became 10 times smaller, so the power goes up by one.",
    },
    check: "Say how big the answer is as an ordinary number ($6 \\times 10^{9}$ is 6 billion) and confirm the front number is between 1 and 10.",
    ask: "Is the front number at least 1 and less than 10?",
    marks:
      "One mark for handling the front numbers and the powers separately, one for the answer in correct standard form. An answer left out of standard form loses the last mark.",
    version: 1,
  },
  {
    id: "linear-equations",
    strand: "algebra",
    title: "Solving linear equations",
    subtopics: ["Solving linear equations"],
    match: [/\bsolve\b[^.?!]*=/i, /find (?:the value of )?[a-z]\b[^.?!]*=/i],
    not: [/\^\s*\{?\s*[2-9]|²|³|simultaneous|quadratic|inequalit|[<>≤≥]|\band\b[^.?!]*=|sin|cos|tan|\\frac\{[^}]*\}\{[^}]*[a-z]/i],
    needsFirst: "Adding and subtracting negative numbers, and that $3x$ means 3 times $x$.",
    bigIdea:
      "An equation is a balance: both sides are worth the same. Whatever you do to one side you must do to the other. To find $x$, undo what has been done to it, one thing at a time.",
    method: [
      "Write the equation down.",
      "If the letter is on both sides, take the smaller letter term away from both sides.",
      "Undo the number that is added or subtracted, by doing the opposite to both sides.",
      "Undo the multiplying or dividing, by doing the opposite to both sides.",
      "Put the answer back into the original equation to check both sides are equal.",
    ],
    mistake: {
      wrong: "Doing something to one side only: going from $4x + 7 = 19$ to $4x = 19 + 7$.",
      right: "Take 7 from both sides: $4x = 19 - 7$. The sign changes because 7 was taken away from both sides, not because it crossed over.",
    },
    check: "Put the answer into both sides of the original equation and show they come to the same number.",
    ask: "What is still being done to $x$ that we need to undo?",
    marks:
      "A method mark for each correct step of undoing, and a mark for the answer. Showing the same thing done to both sides earns the method marks even if the arithmetic slips.",
    version: 1,
  },
  {
    id: "sharing-in-a-ratio",
    strand: "ratio",
    title: "Sharing in a ratio",
    subtopics: ["Sharing in a ratio"],
    match: [/\bshar(?:e|ed|es|ing)\b[^.?!]*\bratio\b/i, /\bratio\b[^.?!]*\bshar(?:e|ed|es|ing)\b/i, /\b(?:divide|divided|split)\b[^.?!]*\bin the ratio\b/i],
    needsFirst: "Dividing by a whole number, and multiplying to scale an amount up.",
    bigIdea:
      "A ratio says how many equal parts each person gets. Find what one part is worth first. After that, every share is a multiplication.",
    picture: {
      block: "bar_model",
      draw:
        'Draw one bar cut into the total number of equal parts, in this shape: {"type":"bar_model","parts":[{"label":"Amy","value":12,"weight":1},{"label":"Amy","value":12,"weight":1},{"label":"Ben","value":12,"weight":1}],"totalLabel":"£36"}. One entry in "parts" for every part of the ratio, each labelled with whose it is and what one part is worth. "totalLabel" is the amount being shared.',
    },
    method: [
      "Add the numbers in the ratio to find how many parts there are altogether.",
      "Divide the amount by the number of parts. That is what one part is worth.",
      "Multiply one part by each person's number of parts.",
      "Add the shares together to check they make the amount you started with.",
    ],
    mistake: {
      wrong: "Dividing the amount by each number in the ratio: $60 \\div 2$ and $60 \\div 3$.",
      right: "The 2 and the 3 are numbers of parts. There are $2 + 3 = 5$ parts, so one part is $60 \\div 5$.",
    },
    check: "Add the shares: they must make the amount that was shared.",
    ask: "How many parts are there altogether?",
    marks: "One mark for dividing by the total number of parts, one for one correct share, one for all the shares.",
    version: 1,
  },
  {
    id: "pythagoras",
    strand: "geometry",
    title: "Pythagoras' theorem",
    subtopics: ["Pythagoras' theorem"],
    match: [/pythagoras/i, /hypotenuse/i, /right[- ]angled? triangle[^.?!]*(?:\.[^.?!]*)?\b(?:longest|shorter|shortest|missing|third) side/i],
    not: [/\bsin\b|\bcos\b|\btan\b|trigonometr|angle of (?:elevation|depression)|work out (?:the size of )?(?:the )?angle/i],
    needsFirst: "Squaring a number and finding a square root.",
    bigIdea:
      "In a right-angled triangle, the square of the longest side equals the squares of the two shorter sides added together. The longest side is always the one opposite the right angle.",
    picture: {
      block: "labeled_shape",
      draw:
        "Draw the triangle with the right angle marked (isRightAngle: true), both known sides labelled with their lengths and units, and the missing side labelled with a letter. The right angle must be at the corner between the two shorter sides.",
    },
    method: [
      "Find the longest side: it is opposite the right angle. Say whether the missing side is the longest side or a shorter one.",
      "Write $a^2 + b^2 = c^2$, with $c$ as the longest side.",
      "Put the numbers in.",
      "Square them.",
      "Add the squares if you are finding the longest side. Subtract if you are finding a shorter side.",
      "Square root to get the length. Give the units.",
    ],
    mistake: {
      wrong: "Adding the squares when the missing side is one of the shorter sides, or forgetting to square root at the end.",
      right: "If the missing side is not the longest, take the smaller square from the larger. Then square root.",
    },
    check:
      "The longest side must be longer than each of the other two, and shorter than the other two added together.",
    ask: "Which side is the longest side here, and how can you tell?",
    marks: "One mark for squaring and adding (or subtracting), one for the square root, one for the answer.",
    version: 1,
  },
  {
    id: "averages",
    strand: "statistics",
    title: "Mean, median, mode and range",
    subtopics: ["Mean, median, mode, range"],
    match: [/\b(?:mean|median|mode|modal|range|averages?)\b/i],
    // "Average speed" is a ratio topic, tables and grouped data are their own
    // topic, and "what does this mean" is not about the mean.
    not: [
      /frequency table|grouped|estimate[^.?!]*mean|cumulative|box plot|histogram|class interval|gradient|range of values|domain/i,
      /average speed|\bspeed\b|what does|mean by|means? that|meaning/i,
    ],
    needsFirst: "Putting numbers in order, adding a list accurately and dividing.",
    bigIdea:
      "An average is one number that stands for the whole set. The mean shares the total out equally, the median is the middle one, the mode is the most common. The range is not an average: it says how spread out the numbers are.",
    method: [
      "Write the numbers out in order, smallest first. Use this ordered list for everything that follows.",
      "Mean: add them all up, then divide by how many numbers there are.",
      "Median: the middle number of the ordered list. With two middle numbers, it is halfway between them.",
      "Mode: the number that appears most often.",
      "Range: the largest take away the smallest. It is one number.",
    ],
    mistake: {
      wrong: "Finding the median before putting the numbers in order, or writing the range as two numbers ('4 to 17').",
      right: "Order first. The range is a single number: $17 - 4 = 13$.",
    },
    check:
      "The mean and the median must both lie between the smallest and the largest number. Multiply the mean by how many numbers there are and you should get the total back.",
    ask: "Which number is in the middle once they are in order?",
    marks: "One method mark for total divided by how many, then one mark for each value the question asks for.",
    version: 1,
  },
  {
    id: "probability-trees",
    strand: "probability",
    title: "Probability trees",
    subtopics: ["Probability trees"],
    match: [
      /tree diagram|probability tree/i,
      /probab[^.?!]*(?:without replacement|with replacement|put back|replaced|not replaced)/i,
      /(?:without replacement|with replacement|put back|replaced|not replaced)[^?!]*probab/i,
    ],
    needsFirst: "Multiplying and adding fractions.",
    bigIdea:
      "A tree diagram shows every way two things can happen. Go along the branches and multiply. Then add the routes you want. The branches from any one point always add up to 1.",
    picture: {
      block: "probability_tree",
      draw:
        "Draw the whole tree with the probability written as a fraction on every branch. If the first item is not put back, the second set of branches has one fewer of that colour and one fewer in total.",
    },
    method: [
      "Draw the tree and write the probability on each of the first branches.",
      "Decide whether the first item is put back. If it is, the second branches are the same. If it is not, there is one fewer of that kind and one fewer altogether.",
      "Multiply along each route that gives what the question asks for. Write each multiplication out with its numbers.",
      "Add those routes together.",
      "Simplify the fraction.",
    ],
    mistake: {
      wrong: "Adding along a route instead of multiplying, or counting 'one of each' as a single route.",
      right: "Multiply along, add between. 'One of each' is two routes: red then blue, and blue then red.",
    },
    check: "The probabilities at the ends of all the routes add up to 1.",
    ask: "How many routes through the tree give what the question asks for?",
    marks:
      "One mark for the probabilities on the branches, one for multiplying along a route, one for adding the right routes, one for the answer.",
    version: 1,
  },
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
  const byName = TOPIC_PLANS.find((plan) =>
    [plan.title, ...plan.subtopics].some((name) => {
      const known = slug(name);
      return known === wanted || wanted.includes(known) || (wanted.length >= 6 && known.includes(wanted));
    }),
  );
  return byName ?? planForQuestion(topic);
}

const numbered = (lines: string[]) => lines.map((line, i) => `  ${i + 1}. ${line}`).join("\n");

/**
 * The plan as instructions for answering ONE question. Each part is tied to the
 * field of the answer it belongs in, so that whether it was followed can be
 * seen in the answer and not only hoped for.
 */
export function planForSolving(plan: TopicPlan): string {
  return `
━━━ HOW TO TEACH THIS TOPIC: ${plan.title.toUpperCase()} ━━━
This question is on ${plan.title}. Teach it the way set out here. Where this differs from the general guidance above, follow this. The format rules (JSON, arrows, block types) still apply.

THE BIG IDEA. Say it once, in the "intro", after naming what we are finding, and put it in "keyTakeaway" in your own short words:
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

SAY THE NUMBERS. Every "explanation" names the numbers on its own line: "9 squared is 81 and 12 squared is 144", never "work out the squares".

THE REASON. Every step that changes the line has a "why": one sentence giving the reason the step is allowed or needed. Never a "why" that only repeats the step ("Amy's share is calculated").

ASK ONE REAL QUESTION. On one step before the last, put a question for the pupil in "selfCheck", ending in a question mark, about this question's own numbers. It should be this kind of question: "${plan.ask}"

CHECK THE ANSWER. On the last step, put the check in "selfCheck" as a statement with the numbers worked through, not as a question:
  ${plan.check}

THE MISTAKE TO WARN ABOUT. Put it in "hint" as two plain sentences, what goes wrong and what to do instead, using this question's numbers where you can. Do not write the words "Wrong:" or "Right:".
  What goes wrong: ${plan.mistake.wrong}
  What to do: ${plan.mistake.right}

HOW THE MARKS ARE GIVEN. Put it in "examTip" in one sentence:
  ${plan.marks}

BEFORE YOU ANSWER, check your JSON has every one of these. An answer missing any of them is incomplete:
  □ "keyTakeaway" gives the big idea
${plan.picture ? `  □ the first block is a "${plan.picture.block}"\n` : ""}  □ each step's "explanation" names its numbers, and each step that changes the line has a "why"
  □ one step before the last has a "selfCheck" that ends in a question mark
  □ the last step has a "selfCheck" that is a worked check, not a question
  □ "hint" warns about the mistake
  □ "examTip" says how the marks are given`;
}

/** The plan as instructions for a whole "teach me this topic" lesson. */
export function planForLesson(plan: TopicPlan): string {
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
