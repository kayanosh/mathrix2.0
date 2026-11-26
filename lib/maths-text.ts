/**
 * Maths a model wrote without its dollar signs.
 *
 * The page draws maths only inside `$...$`. Asked to wrap all maths, a model
 * mostly does, and then writes an answer as a bare `\frac{5}{18}` or a line of
 * working as `£7.25 \times 12 = £87`. Those reached the page as raw code.
 * Found on the first real worked-solutions paper: two answers out of 37.
 */

/** Commands that are a single symbol, safe to swap in the middle of a sentence. */
const SYMBOLS: Array<[RegExp, string]> = [
  [/\\times(?![a-zA-Z])/g, "×"],
  [/\\div(?![a-zA-Z])/g, "÷"],
  [/\\pm(?![a-zA-Z])/g, "±"],
  [/\\leq?(?![a-zA-Z])/g, "≤"],
  [/\\geq?(?![a-zA-Z])/g, "≥"],
  [/\\neq?(?![a-zA-Z])/g, "≠"],
  [/\\approx(?![a-zA-Z])/g, "≈"],
  [/\\pi(?![a-zA-Z])/g, "π"],
  [/\\degree(?![a-zA-Z])|\^\s*(?:\{\s*\\circ\s*\}|\\circ(?![a-zA-Z]))/g, "°"],
  [/\\pounds(?![a-zA-Z])/g, "£"],
  [/\\%/g, "%"],
];

const COMMAND = /\\[a-zA-Z]+/;
/** Two ordinary words in a row: this is a sentence, not a line of maths. */
const SENTENCE = /(?<![\\a-zA-Z])[a-zA-Z]{3,}\s+[a-zA-Z]{3,}/;

/**
 * Whether there are ordinary words in it. "That is \frac{12}{25}." is a
 * sentence with a fraction in it; "x = \sqrt{20}" and "\text{Area} = 32" are
 * maths. Two long words in a row was the old test, and "That is" slipped
 * through it, so the whole sentence was set as maths, in italics with no spaces.
 */
function hasWords(text: string): boolean {
  const bare = text
    .replace(/\\(?:text|mathrm|textbf|begin|end)\{[^}]*\}/g, " ")
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/\b(?:sin|cos|tan|log|cm|mm|km)\b/g, " ");
  return SENTENCE.test(text) || /[a-zA-Z]{3,}/.test(bare);
}

/** A power typed with a caret, "3^12" or "x^2": drawn, it is a small raised number. */
const TYPED_POWER = /(?<![\w\\{])([A-Za-z]|\d+(?:\.\d+)?)\^(?:\{(-?\w+)\}|(-?\d+|[a-z])(?!\w))/g;

export function mathsInDollars(raw: string): string {
  // "\(\frac{12}{25}\)" is the other way of marking maths. Left as it was, the
  // fraction inside was wrapped again and the brackets were printed round it:
  // "\($\frac{12}{25}$\)".
  const text = raw
    .replace(/\\\(\s*\$([^$]*)\$\s*\\\)/g, "$$$1$$")
    .replace(/\\\(([\s\S]*?)\\\)/g, "$$$1$$");
  if (!COMMAND.test(text) && !/\\%/.test(text) && !text.includes("^")) return text;

  // Outside the dollar signs, turn one-symbol commands into the symbol, and
  // draw a typed power.
  const tidied = text
    .split(/(\$[^$]*\$)/)
    .map((part, i) => {
      if (i % 2 === 1) return part;
      const symbols = SYMBOLS.reduce((s, [from, to]) => s.replace(from, to), part);
      if (COMMAND.test(symbols)) return symbols;
      return symbols.replace(TYPED_POWER, (_m, base: string, braced?: string, bare?: string) => `$${base}^{${braced ?? bare}}$`);
    })
    .join("");

  // What is left needs drawing (a fraction, a root, a vector). If the text is
  // nothing but maths, the whole of it goes inside dollar signs.
  if (!tidied.includes("$") && COMMAND.test(tidied) && !hasWords(tidied)) return `$${tidied}$`;

  // A sentence with a fraction or a root typed into it: draw just that piece.
  // "The probability that both are red is \frac{3}{28}." was shown as written.
  return tidied
    .split(/(\$[^$]*\$)/)
    .map((part, i) => (i % 2 === 1 ? part : part.replace(DRAWN_PIECE, (piece) => `$${piece}$`)))
    .join("");
}

/** A fraction or a root with nothing nested inside it. */
const DRAWN_PIECE = /\\[dt]?frac\{[^{}]*\}\{[^{}]*\}|\\sqrt(?:\[[^\]]*\])?\{[^{}]*\}/g;

/**
 * Picture emoji taken out. An answer card that read "So x = 4. 🎉 Let's
 * check…" is a worksheet with a sticker on it. Ticks and maths symbols stay.
 */
export function withoutEmoji(text: string): string {
  return text
    .replace(/[\u{1F300}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{26FF}\u{FE0F}\u{200D}]/gu, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([.,!?])/g, "$1");
}

/**
 * The opening and closing lines of an answer, with any bare maths drawn.
 * Works on the payload the chat route sends, whichever shape it carries.
 */
export function drawBareMaths<T>(payload: T): T {
  if (!payload || typeof payload !== "object") return payload;
  const fix = (answer: unknown) => {
    if (!answer || typeof answer !== "object") return answer;
    const a = answer as Record<string, unknown>;
    const out: Record<string, unknown> = { ...a };
    for (const key of ["intro", "conclusion"]) {
      if (typeof a[key] === "string") out[key] = mathsInDollars(withoutEmoji(a[key] as string));
    }
    for (const key of ["hint", "keyTakeaway", "examTip"]) {
      if (typeof a[key] === "string") out[key] = mathsInDollars(a[key] as string);
    }
    // The words beside each line of working, and any text block. Not the
    // working itself ("latexBefore", "latexAfter"), which is maths already.
    if (Array.isArray(a.blocks)) {
      out.blocks = a.blocks.map((block) => {
        if (!block || typeof block !== "object") return block;
        const b = block as Record<string, unknown>;
        if (b.type === "text" && typeof b.content === "string") return { ...b, content: mathsInDollars(b.content) };
        if (b.type !== "equation_steps" || !Array.isArray(b.steps)) return block;
        return {
          ...b,
          steps: b.steps.map((step) => {
            if (!step || typeof step !== "object") return step;
            const s = { ...(step as Record<string, unknown>) };
            for (const key of ["operationLabel", "explanation", "why", "selfCheck"]) {
              if (typeof s[key] === "string") s[key] = mathsInDollars(s[key] as string);
            }
            return s;
          }),
        };
      });
    }
    return out;
  };
  const p = payload as Record<string, unknown>;
  if (!("whiteboard" in p) && !("response" in p)) return payload;
  return { ...p, whiteboard: fix(p.whiteboard), response: fix(p.response) } as T;
}
