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

/** A power typed with a caret, "3^12" or "x^2": drawn, it is a small raised number. */
const TYPED_POWER = /(?<![\w\\{])([A-Za-z]|\d+(?:\.\d+)?)\^(?:\{(-?\w+)\}|(-?\d+|[a-z])(?!\w))/g;

export function mathsInDollars(text: string): string {
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
  if (!tidied.includes("$") && COMMAND.test(tidied) && !SENTENCE.test(tidied)) return `$${tidied}$`;

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
      if (typeof a[key] === "string") out[key] = mathsInDollars(a[key] as string);
    }
    return out;
  };
  const p = payload as Record<string, unknown>;
  if (!("whiteboard" in p) && !("response" in p)) return payload;
  return { ...p, whiteboard: fix(p.whiteboard), response: fix(p.response) } as T;
}
