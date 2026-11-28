/**
 * Plain words, guaranteed.
 *
 * The prompts ask the model for short, everyday English, and mostly get it.
 * "Mostly" is the problem: a pupil who finds maths hard and is told to "isolate
 * the coefficient, hence determine x" has been lost by the explanation rather
 * than the maths. Answers are also saved and replayed, so wording written under
 * an older, more formal prompt keeps coming back.
 *
 * So the wording is not left to the model. Every explanation passes through
 * here on its way to the pupil — fresh or saved, written by a model or by one
 * of the step builders — and three things happen:
 *
 *   1. Formal or showy phrasing is replaced with what a teacher would say:
 *      "isolate x" → "get x on its own", "therefore" → "so".
 *   2. Butler-style flourishes are removed: "Very well —", "Shall we begin?".
 *   3. A maths word the pupil needs to learn is kept, and explained in brackets
 *      the first time it appears in an answer:
 *      "the denominator (the bottom number)".
 *
 * Nothing inside `$...$` is touched, and no number or symbol is changed: this
 * edits how the answer is explained, never the answer.
 */

/** A maths span, lifted out of the sentence while the wording is edited. */
const MATHS_SPAN = /\$\$[^$]+\$\$|\$[^$]+\$|\\\([\s\S]+?\\\)|\\[a-zA-Z]+(?:\{[^{}]*\})*/g;
const HELD = /[-]/g;
/** Matches one lifted maths span, or one plain word, as the thing being talked about. */
const THING = "(?:[\\uE000-\\uF8FF]|[A-Za-z0-9]+)";

type Replacement = string | ((...groups: Array<string | undefined>) => string);

/** Whole-word, any case; the replacement takes the capital letter of what it replaces. */
function swap(text: string, pattern: string, replacement: Replacement): string {
  const re = new RegExp(`(?<![\\\\\\w])(?:${pattern})(?![\\w])`, "gi");
  return text.replace(re, (match: string, ...rest: unknown[]) => {
    // The last two arguments are the match position and the whole string.
    const groups = rest.slice(0, -2) as Array<string | undefined>;
    const out = typeof replacement === "string" ? replacement : replacement(...groups);
    if (!out) return out;
    const capital = /^[A-Z]/.test(match) && !/^[-]/.test(out);
    return capital ? out.charAt(0).toUpperCase() + out.slice(1) : out;
  });
}

/** Formal word → the everyday one. Order matters: longer phrases first. */
const SWAPS: Array<[pattern: string, replacement: Replacement]> = [
  // Butler flourishes.
  ["allow me to walk you through (?:it|this)", "let's go through it step by step"],
  ["allow me to", "let me"],
  // A real question keeps its shape: "What shall we work on?" → "What should we…".
  ["shall we", "should we"],
  ["(we|i|you|it|this|that) shall", (who) => `${who ?? "we"} will`],
  ["shall", "will"],
  ["one must", "you need to"],
  ["splendid|marvellous|superb|magnificent", "great"],
  ["precisely", "exactly"],
  ["elegant(ly)?", (ly) => (ly ? "neatly" : "neat")],
  ["whilst", "while"],

  // Getting a letter on its own.
  [`isolat(e|es|ing) (the )?(${THING})( term)?(?: on (?:one|the (?:left|right)(?:-hand)?) side)?`,
    (ending, the = "", thing = "it", term = "") =>
      `${ending === "ing" ? "getting" : "get"} ${the}${thing}${term} on its own`],
  ["isolat(?:e|es)", "get it on its own"],
  ["isolating", "getting it on its own"],
  ["transpos(?:e|es|ing)", "move across"],

  // The number in front of a letter.
  [`the coefficient of (${THING})`, (thing) => `the number in front of ${thing ?? "it"}`],
  [`the (${THING})[- ]coefficient`, (thing) => `the number in front of ${thing ?? "it"}`],
  ["coefficients", "numbers in front of the letters"],
  ["coefficient", "number in front"],
  ["variables", "letters"],
  ["variable", "letter"],

  // Linking words.
  ["therefore|hence|thus|consequently|accordingly", "so"],
  ["furthermore|moreover|additionally", "also"],
  ["subsequently", "then"],
  ["in order to", "to"],
  ["prior to", "before"],
  ["with respect to", "for"],

  // Doing words.
  ["utili[sz]e(s)?", (s) => `use${s ?? ""}`],
  ["utili[sz]ing", "using"],
  ["employ(s)?", (s) => `use${s ?? ""}`],
  ["employing", "using"],
  ["determin(?:e|es)", "work out"],
  ["determining", "working out"],
  ["calculat(?:e|es)", "work out"],
  ["calculating", "working out"],
  ["evaluat(?:e|es)", "work out"],
  ["evaluating", "working out"],
  ["comput(?:e|es)", "work out"],
  ["computing", "working out"],
  ["obtain(s)?", (s) => `get${s ?? ""}`],
  ["obtaining", "getting"],
  ["obtained", "got"],
  ["commenc(?:e|es)", "start"],
  ["ensure", "make sure"],
  ["demonstrat(?:e|es)", "show"],
  ["manipulat(?:e|es)", "change"],
  ["manipulating", "changing"],

  // British spelling. The pupils sit British exams.
  ["favorable", "favourable"],
  ["center(s|ed)?", (end) => `centre${end === "ed" ? "d" : end ?? ""}`],
  ["factori[sz]ation", "factorisation"],
  ["factorize(s|d)?", (end) => `factorise${end ?? ""}`],
  ["factorizing", "factorising"],
  ["color(s|ed)?", (end) => `colour${end ?? ""}`],
  ["totaling", "totalling"],
  ["labeled", "labelled"],
  ["meters", "metres"],
  ["centimeters", "centimetres"],

  // Textbook words with a plain one that says the same.
  ["exponents", "powers"],
  ["exponent", "power"],
  ["perfect square trinomial", "squared bracket"],
  ["trinomial", "expression"],
  ["yield(s)?", (s) => `give${s ?? ""}`],
  ["yielding", "giving"],
  ["joint event", "two things both happening"],
  ["like bases", "the same base"],
  ["zero product property", "fact that if two things multiply to make zero, one of them is zero"],

  // Describing words.
  ["approximately", "about"],
  ["sufficient", "enough"],
  ["numerous", "many"],
  ["initially", "first"],
];

/**
 * Words a pupil does need to learn. Kept, and explained in brackets the first
 * time they come up in an answer.
 */
const GLOSSARY: Array<[term: string, pattern: string, meaning: string, plural?: string]> = [
  ["common denominator", "common denominators?", "the same bottom number"],
  ["numerator", "numerators?", "the top number", "the top numbers"],
  ["denominator", "denominators?", "the bottom number", "the bottom numbers"],
  ["reciprocal", "reciprocals?", "the fraction flipped upside down"],
  ["integer", "integers?", "a whole number", "whole numbers"],
  ["hypotenuse", "hypotenuse", "the longest side"],
  ["perpendicular", "perpendicular", "at a right angle"],
  ["factorise", "factori[sz](?:e|es|ing)", "put it into brackets"],
  ["expand", "expand(?:ing)? the brackets?", "multiply them out"],
  ["substitute", "substitut(?:e|es|ing)", "swap the number in"],
  ["equivalent", "equivalent(?: fractions?)?", "worth the same"],
  ["product", "product(?= of\\b)", "what you get when you multiply"],
  ["quotient", "quotient", "what you get when you divide"],
  ["inverse", "inverse(?: operations?)?", "the opposite"],
  ["gradient", "gradient", "how steep the line is"],
  ["y-intercept", "y[- ]intercept", "where the line crosses the y-axis"],
  ["circumference", "(?<!\\b(?:at|on|to|touching|touches) the )circumference", "the distance around the circle"],
  ["perimeter", "perimeter", "the distance around the outside"],
  ["radius", "radius", "from the centre to the edge"],
  ["diameter", "diameter", "all the way across the circle"],
  ["median", "median", "the middle value"],
  ["mode", "the mode", "the most common value"],
  ["congruent", "congruent", "exactly the same shape and size"],
  ["HCF", "HCF", "highest common factor"],
  ["LCM", "LCM", "lowest common multiple"],
];

/** Openers that add nothing: "Very well — ", "Ah, ", "Right then, ". */
const OPENER =
  /^\s*(?:very well|right then|now then|ah|indeed|splendid|marvellous|quite so|well now)(?:\s*[—–]+|\s+-+(?=\s)|[,!.])\s*/i;

function capitaliseFirst(text: string): string {
  return text.replace(/^(\s*)([a-z])/, (_m, lead: string, letter: string) => lead + letter.toUpperCase());
}

/** Capital letter after a sentence end, in case a swap left a lower-case start. */
function capitaliseSentences(text: string): string {
  // Only a real word after a real sentence: "e.g. the" and a sentence that
  // starts with the unknown "x" are left exactly as written.
  return text.replace(/(?<=[a-z]{2}[.!?]\s+)[a-z](?=[a-z])/g, (letter) => letter.toUpperCase());
}

/**
 * One piece of explanation, in plain words.
 *
 * `explained` carries which glossary words have already been explained in this
 * answer, so each is explained once. Pass the same set for every piece of text
 * in an answer; leave it out to explain each word once within this text.
 * `gloss: false` swaps wording only, for short labels with no room for brackets.
 */
export function plainLanguage(
  text: string,
  options: { explained?: Set<string>; gloss?: boolean } = {},
): string {
  if (!text || typeof text !== "string") return text;
  const explained = options.explained ?? new Set<string>();

  const held: string[] = [];
  let s = text.replace(MATHS_SPAN, (span) => {
    held.push(span);
    return String.fromCharCode(0xe000 + held.length - 1);
  });
  if (held.length > 0x18ff) return text;

  const before = s;
  let hadOpener = false;
  while (OPENER.test(s)) {
    s = s.replace(OPENER, "");
    hadOpener = true;
  }
  s = s.replace(/([,;])\s*indeed\s*([,;])/gi, "$1").replace(/\bindeed,?\s*/gi, "");
  // "rather elegant", "rather tricky": the word only as a flourish in front of
  // a describing word. "Rather than" and "I would rather" mean something.
  s = s.replace(
    /\brather (?=(?:elegant|neat|simple|tricky|nice|easy|straightforward|clever|lovely|good|large|small|big|important|useful|interesting|difficult|hard|special|handy|quick|long|short)\b)/gi,
    "",
  );
  // A question asked for effect, not to be answered.
  s = s.replace(/\b(s)hall we (?:begin|start|proceed|get started|dive in)\s*\?/gi, (_m, first: string) =>
    first === "S" ? "Let's start." : "let's start.",
  );
  s = s.replace(/,?\s*\bshall we\s*\?/gi, ".");

  for (const [pattern, replacement] of SWAPS) s = swap(s, pattern, replacement);

  if (options.gloss !== false) {
    for (const [term, pattern, meaning, plural] of GLOSSARY) {
      if (explained.has(term)) continue;
      const re = new RegExp(`(?<![\\\\\\w-])(${pattern})(?![\\w'’-])(?!\\s*\\()`, "i");
      const found = re.exec(s);
      if (!found) continue;
      explained.add(term);
      // Already explained by the writer, in these or similar words.
      if (s.toLowerCase().includes(meaning.toLowerCase())) continue;
      const words = plural && /s$/i.test(found[1]) ? plural : meaning;
      s = s.replace(re, `$1 (${words})`);
    }
  }

  if (s !== before) {
    s = s.replace(/[ \t]{2,}/g, " ").replace(/\s+([,.;:!?])/g, "$1").replace(/\.\s*\./g, ".");
    if (hadOpener) s = capitaliseFirst(s);
    s = capitaliseSentences(s);
  }

  return s.replace(HELD, (mark) => held[mark.charCodeAt(0) - 0xe000] ?? "");
}

/** Fields that hold explanation the pupil reads or hears. */
const PROSE_FIELDS = new Set([
  "intro",
  "conclusion",
  "hint",
  "explanation",
  "why",
  "narration",
  "check",
  "selfCheck",
  "content",
  "keyTakeaway",
  "examTip",
]);

/** Short labels: wording is simplified, but there is no room to explain a word. */
const LABEL_FIELDS = new Set(["operationLabel", "signRule"]);

/** Parts of one step that the pupil hears as a single run, in this order. */
const SPOKEN_TOGETHER = new Set(["explanation", "why", "selfCheck", "check"]);

/** Said last, after the working, whatever order the fields arrive in. */
const CLOSING_FIELDS = ["conclusion", "hint", "keyTakeaway", "examTip"];

/**
 * An answer (or anything shaped like one), with every piece of explanation in
 * plain words. Returns a copy; the input is not changed.
 *
 * A glossary word is explained once per answer, where the pupil first meets
 * it: the opening line, then the steps in order, then the closing lines. Things
 * that sit side by side — a step's "explanation" and its "narration", or the
 * board and the older text form of the same answer — are alternatives the page
 * chooses between, so each of them gets the bracket.
 *
 * `alsoProse` names extra fields that hold explanation in a shape that is not
 * a board (the KS2 "explain this question" steps keep theirs in "text").
 */
export function simplifyLanguage<T>(value: T, options: { alsoProse?: string[] } = {}): T {
  const prose = options.alsoProse ? new Set([...PROSE_FIELDS, ...options.alsoProse]) : PROSE_FIELDS;
  const walk = (node: unknown, explained: Set<string>): unknown => {
    if (Array.isArray(node)) return node.map((item) => walk(item, explained));
    if (!node || typeof node !== "object") return node;

    const source = node as Record<string, unknown>;
    const out: Record<string, unknown> = { ...source };

    if (typeof source.intro === "string") {
      out.intro = plainLanguage(source.intro, { explained });
    }

    const atStart = new Set(explained);
    // A step's explanation, its reason and its check are said one after the
    // other, so a word explained in the first is not explained again in the
    // second. They used to be treated as alternatives, and the pupil heard
    // "it's the mode (the most common value). The mode (the most common value)
    // is the number that appears most often."
    const spokenTogether = new Set(atStart);
    for (const [key, child] of Object.entries(source)) {
      if (key === "intro" || CLOSING_FIELDS.includes(key)) continue;
      const seen = SPOKEN_TOGETHER.has(key) ? spokenTogether : new Set(atStart);
      if (typeof child === "string") {
        if (prose.has(key)) out[key] = plainLanguage(child, { explained: seen });
        else if (LABEL_FIELDS.has(key)) out[key] = plainLanguage(child, { gloss: false });
      } else if (child && typeof child === "object") {
        out[key] = walk(child, seen);
      }
      seen.forEach((term) => explained.add(term));
    }

    for (const key of CLOSING_FIELDS) {
      const child = source[key];
      if (typeof child === "string") out[key] = plainLanguage(child, { explained });
    }
    return out;
  };

  return walk(value, new Set<string>()) as T;
}
