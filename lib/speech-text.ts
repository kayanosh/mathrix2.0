/**
 * Turning what is written on the board into words a voice can say.
 *
 * A text-to-speech voice reads exactly the characters it is given. Handed
 * "3x+7=25" it runs the whole line together in one breath; handed "5cm²",
 * "x ≤ 4", "ab" or "90^\circ" it guesses. Pupils heard those guesses as words
 * pronounced wrongly, and a line of numbers with no pause in it as numbers said
 * too fast.
 *
 * Maths and prose need different treatment, so there are two functions:
 *
 *   mathsToSpeech(tex)   — the inside of `$...$`. Everything in it is maths, so
 *                          "ab" is a times b and "-" is always minus.
 *   proseToSpeech(text)  — an ordinary sentence that may have maths typed into
 *                          it without dollar signs. Here "ab" could be a word
 *                          and "-" could be a dash, so only what is plainly
 *                          maths is touched.
 *
 * The result is also what the caption shows and what the pen follows word by
 * word, so numbers stay as digits ("3 x plus 7", never "three x plus seven"):
 * the pen finds a term on the board by its digits.
 */

type Unit = [abbr: string, one: string, many: string];

/** Unit abbreviations a voice cannot be trusted to expand. */
const UNITS: Unit[] = [
  ["km", "kilometre", "kilometres"],
  ["cm", "centimetre", "centimetres"],
  ["mm", "millimetre", "millimetres"],
  ["kg", "kilogram", "kilograms"],
  ["mg", "milligram", "milligrams"],
  ["ml", "millilitre", "millilitres"],
  ["m", "metre", "metres"],
  ["g", "gram", "grams"],
  ["l", "litre", "litres"],
];

function unitWords(amount: string | null, abbr: string): string | null {
  const unit = UNITS.find(([u]) => u === abbr);
  if (!unit) return null;
  return amount !== null && Number(amount.replace(/,/g, "")) === 1 ? unit[1] : unit[2];
}

/**
 * Words that turn up inside `$...$` without \text{…}. Any other short run of
 * letters in maths is letters multiplied together ("ab" → "a b").
 */
const WORDS_IN_MATHS = new Set([
  "sin", "cos", "tan", "log", "ln", "max", "min", "mod", "lim",
  "or", "and", "cm", "mm", "km", "kg", "ml", "mph",
]);

/**
 * Text lifted out of the way while the letter rules run is replaced by one
 * private-use character, which no rule matches as a letter or a digit.
 */
const HELD = "\\uE000-\\uF8FF";
const HELD_ANY = new RegExp(`[${HELD}]`, "g");

/**
 * Marks a lone "a" that is the unknown, not the word. A voice reads a
 * lower-case "a" as the word and it all but disappears, so it is sent to the
 * voice as "A". It used to be written "A" in the caption too, which gave
 * "A squared plus b squared" under a board that says a² + b².
 */
export const SAID_AS_A_LETTER = "\u2060";

/** The text as the voice should be given it. The caption keeps the original. */
export function forVoice(text: string): string {
  return text.replace(new RegExp(`a${SAID_AS_A_LETTER}`, "g"), "A").replace(new RegExp(SAID_AS_A_LETTER, "g"), "");
}

/** Symbols that mean the same thing in maths and in a sentence. */
function speakSymbols(text: string): string {
  let s = text;
  s = s.replace(/½/g, " 1 half ").replace(/¼/g, " 1 quarter ").replace(/¾/g, " 3 quarters ");
  s = s.replace(/[×✕·⋅]/g, " times ");
  s = s.replace(/÷/g, " divided by ");
  s = s.replace(/±/g, " plus or minus ");
  s = s.replace(/≤/g, " is less than or equal to ");
  s = s.replace(/≥/g, " is greater than or equal to ");
  s = s.replace(/≠/g, " is not equal to ");
  s = s.replace(/≈/g, " is about ");
  s = s.replace(/√/g, " the square root of ");
  s = s.replace(/π/g, " pi ");
  s = s.replace(/θ/g, " theta ");
  s = s.replace(/²/g, " squared");
  s = s.replace(/³/g, " cubed");
  s = s.replace(/°\s*C\b/g, " degrees Celsius");
  s = s.replace(/°/g, " degrees");
  s = s.replace(/∩/g, " intersection ").replace(/∪/g, " union ").replace(/[ξℰ]/g, " the universal set ");
  s = s.replace(/∈/g, " is in ").replace(/∉/g, " is not in ");
  s = s.replace(/∠/g, " angle ");
  s = s.replace(/[△▵]/g, " triangle ");
  s = s.replace(/∴/g, " so ");
  s = s.replace(/[→⇒⟹⟶]/g, " gives ");
  s = s.replace(/%/g, " percent");
  return s;
}

/** LaTeX commands with a spoken form. */
const NAMED: Record<string, string> = {
  alpha: "alpha", beta: "beta", gamma: "gamma", delta: "delta",
  theta: "theta", pi: "pi", sigma: "sigma", lambda: "lambda",
  mu: "mu", epsilon: "epsilon", omega: "omega", phi: "phi",
  rho: "rho", tau: "tau",
  sin: "sin", cos: "cos", tan: "tan", log: "log", ln: "the natural log of",
  int: "the integral of", sum: "the sum of", infty: "infinity",
  times: "times", cdot: "times", div: "divided by",
  pm: "plus or minus", mp: "minus or plus",
  leq: "is less than or equal to", le: "is less than or equal to",
  geq: "is greater than or equal to", ge: "is greater than or equal to",
  neq: "is not equal to", ne: "is not equal to",
  approx: "is about", lt: "is less than", gt: "is greater than",
  ldots: "and so on", dots: "and so on", cdots: "and so on",
  rightarrow: "gives", to: "gives", Rightarrow: "so", implies: "so", therefore: "so",
  cap: "intersection", cup: "union", xi: "the universal set", varnothing: "the empty set",
  emptyset: "the empty set", in: "is in", notin: "is not in", subset: "is a subset of",
  angle: "angle", triangle: "triangle",
  parallel: "is parallel to", perp: "is at right angles to",
  circ: "degrees",
};

/** Fractions a teacher says as words. Held so later rules leave them whole. */
const EVERYDAY_FRACTIONS: Record<string, string> = {
  "1/2": "one half",
  "1/3": "one third",
  "2/3": "two thirds",
  "1/4": "one quarter",
  "3/4": "three quarters",
};

const MATHS_TOKEN =
  /^(?:\d[\d.,]*|[a-zA-Z]|plus|minus|times|over|all|squared|cubed|divided|by|sin|cos|tan|pi|percent|degrees)$/;

/**
 * A short pause before "equals" once there is a sum in front of it:
 * "3 x plus 7, equals 25". A bare "x equals 3" is left alone. This is the pause
 * a teacher leaves before saying what it comes to, and it is what stops a line
 * of working being heard as one run of numbers.
 */
export function pauseBeforeEquals(spoken: string): string {
  const words = spoken.split(" ");
  for (let i = 1; i < words.length; i++) {
    if (words[i] !== "equals") continue;
    let run = 0;
    for (let j = i - 1; j >= 0; j--) {
      // Punctuation is already a pause, and the end of whatever came before.
      if (/[,.;:!?]$/.test(words[j])) break;
      if (!MATHS_TOKEN.test(words[j].replace(/^\(+|\)+$/g, "").replace(SAID_AS_A_LETTER, ""))) break;
      run++;
    }
    if (run >= 3) words[i - 1] = `${words[i - 1]},`;
  }
  return words.join(" ");
}

/**
 * The inside of `$...$` as spoken words.
 *
 * `prose` is for a whole sentence that has LaTeX commands in it but no dollar
 * signs. The commands are converted and everything else is left for
 * proseToSpeech, because most of the letters in it are English.
 */
export function mathsToSpeech(tex: string, options: { prose?: boolean } = {}): string {
  const prose = options.prose === true;
  let s = tex;

  const held: string[] = [];
  const hold = (words: string) => {
    held.push(words);
    return ` ${String.fromCharCode(0xe000 + held.length - 1)} `;
  };

  // Wrappers that carry no sound: \htmlId{id}{content}, \textcolor{#dc2626}{content},
  // \boxed{content}. The content may hold one level of braces of its own
  // (\htmlId{a}{\frac{15}{3}}). A colour used to be read out: "#d c 2626 the
  // square root of 67".
  const INNER = "((?:[^{}]|\\{[^{}]*\\})*)";
  for (let i = 0; i < 3; i++) {
    s = s.replace(new RegExp(`\\\\(?:htmlId|textcolor|color|colorbox|htmlClass)\\{[^{}]*\\}\\{${INNER}\\}`, "g"), "$1");
    s = s.replace(new RegExp(`\\\\(?:boxed|underline|cancel|mathbf|boldsymbol|bm)\\{${INNER}\\}`, "g"), "$1");
  }
  s = s.replace(/\\color\{[^{}]*\}/g, " ");

  // Spacing commands and sizing wrappers carry no sound.
  s = s.replace(/\\[,;:!]|\\ |~/g, " ");
  s = s.replace(/\\(?:left|right|big|Big|bigg|Bigg|displaystyle|quad|qquad)(?![a-zA-Z])/g, " ");
  s = s.replace(/\\phantom\{[^}]*\}/g, "");

  // Escaped characters.
  s = s.replace(/\\%/g, "%");
  s = s.replace(/\\pounds(?![a-zA-Z])/g, "£");
  s = s.replace(/\\[{}]/g, " ");

  // Degrees, before the power rule reads "^\circ" as a power.
  // "250^{\textdegree}" was read as "250 to the power of".
  s = s.replace(
    /\^\s*\{\s*(?:\\circ|\\textdegree|\\degree|°)\s*\}|\^\s*(?:\\circ|\\textdegree|\\degree)(?![a-zA-Z])|\^\s*°|\\(?:textdegree|degree)(?![a-zA-Z])/g,
    "°",
  );

  // A unit written as \text{cm} after a number: here even "m" is a unit.
  s = s.replace(
    /(\d(?:[\d.,]*\d)?)\s*\\(?:text|mathrm)\{\s*(km|cm|mm|kg|mg|ml|m|g|l)\s*\}/g,
    (whole, amount: string, abbr: string) => {
      const words = unitWords(amount, abbr);
      return words ? `${amount}${hold(words)}` : whole;
    },
  );

  // \text{…} is prose sitting inside maths. Hold it so the letter rules below
  // do not spell it out.
  s = s.replace(
    /\\(?:text|mathrm|textbf|mathbf|textit|mathit|operatorname)\{([^}]*)\}/g,
    (_m, content: string) => hold(content),
  );

  // dy/dx, before the letter rule splits it and the fraction rule takes it.
  s = s.replace(/\\[dt]?frac\{d\s*([a-zA-Z]?)\}\{d\s*([a-zA-Z]?)\}/g, (_m, top: string, bottom: string) =>
    hold(`d ${top} by d ${bottom}`.replace(/\s+/g, " ").trim()),
  );

  // sin(30°) is "sin 30 degrees": these brackets are never said.
  s = s.replace(/\\(sin|cos|tan|log|ln)\s*\(([^()]*)\)/g, "\\$1 $2 ");

  s = s.replace(/\\([a-zA-Z]+)/g, (whole, name: string) => (name in NAMED ? hold(NAMED[name]) : whole));

  if (!prose) {
    // "3 x 4" typed with the letter x is a multiplication.
    s = s.replace(/(\d)\s+[xX]\s+(?=\d)/g, "$1 times ");

    // Things written side by side are separate things: 3x is "3 x", ab is
    // "a b", AB is the line "A B". Left as one token, a voice reads "ab" as a
    // word. Runs of four or more lower-case letters are left whole: they are
    // far more often a word someone forgot to wrap in \text{}.
    s = s.replace(/(\d)(?=[a-zA-Z])/g, "$1 ");
    s = s.replace(/\\[a-zA-Z]+|[A-Za-z]{2,}/g, (run) => {
      if (run.startsWith("\\") || WORDS_IN_MATHS.has(run.toLowerCase())) return run;
      if (run.length > 3 && run !== run.toUpperCase()) return run;
      return run.split("").join(" ");
    });
    s = s.replace(/(\\[a-zA-Z]+)(?=\d)/g, "$1 ");
    s = s.replace(/(^|[^\\a-zA-Z])([a-zA-Z])(?=\d)/g, "$1$2 ");

    // A unit straight after a number.
    s = s.replace(/(\d(?:[\d.,]*\d)?)\s*(km|cm|mm|kg|ml)(?![a-zA-Z])/g, (whole, amount: string, abbr: string) => {
      const words = unitWords(amount, abbr);
      return words ? `${amount} ${words}` : whole;
    });

    // A lone "a" is the unknown, said "ay". Lower-case, a voice reads it as
    // the word "a" and it all but disappears.
    s = s.replace(/(^|[^A-Za-z\\])a(?![A-Za-z])/g, `$1a${SAID_AS_A_LETTER}`);
  }

  // Roots.
  s = s.replace(/\\sqrt\s*\[\s*3\s*\]\s*\{([^{}]+)\}/g, " the cube root of $1 ");
  s = s.replace(/\\sqrt\s*\[([^\]]+)\]\s*\{([^{}]+)\}/g, " the $1th root of $2 ");
  s = s.replace(/\\sqrt\s*\{([^{}]+)\}/g, " the square root of $1 ");
  s = s.replace(/\\sqrt\s*(\w)/g, " the square root of $1 ");

  // Fractions. A whole number in front makes a mixed number ("2 and 1 over 2").
  // A top or bottom with more than one term gets "all over", as a teacher says
  // it, so "x plus 1 over 2" is not heard as x + ½.
  // The everyday fractions are said as words: "a half", not "1 over 2".
  s = s.replace(/(\d)?\s*\\[dt]?frac\s*\{\s*([123])\s*\}\s*\{\s*([234])\s*\}/g, (whole_, lead: string | undefined, top: string, bottom: string) => {
    const said = EVERYDAY_FRACTIONS[`${top}/${bottom}`];
    if (!said) return whole_;
    return lead ? `${lead} and ${said} ` : ` ${said} `;
  });
  for (let i = 0; i < 4; i++) {
    s = s.replace(
      /(\d)?\s*\\[dt]?frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g,
      (_m, whole: string | undefined, top: string, bottom: string) => {
        const compound = /\S\s*[+\-−]/.test(top.trim()) || /\S\s*[+\-−]/.test(bottom.trim());
        const fraction = compound ? `${top}, all over ${bottom}` : `${top} over ${bottom}`;
        return whole ? `${whole} and ${fraction} ` : ` ${fraction} `;
      },
    );
  }

  // Powers. The lookahead stops "^25" being read as "squared 5".
  s = s.replace(/\^\s*\{\s*2\s*\}|\^\s*2(?!\d|\.\d)/g, " squared ");
  s = s.replace(/\^\s*\{\s*3\s*\}|\^\s*3(?!\d|\.\d)/g, " cubed ");
  s = s.replace(/\^\s*\{([^{}]+)\}/g, " to the power of $1 ");
  s = s.replace(new RegExp(`\\^\\s*(-?[\\w.${HELD}]+)`, "g"), " to the power of $1 ");

  // Subscripts: x_1 is said "x 1".
  s = s.replace(/_\s*\{([^{}]+)\}/g, " $1 ");
  s = s.replace(/_/g, " ");

  s = speakSymbols(s);

  if (!prose) {
    // A ratio. Outside maths a colon is punctuation, so only here.
    s = s.replace(/(\d)\s*:\s*(?=\d)/g, "$1 to ");

    s = s.replace(/<=/g, " is less than or equal to ");
    s = s.replace(/>=/g, " is greater than or equal to ");
    s = s.replace(/</g, " is less than ");
    s = s.replace(/>/g, " is greater than ");
    s = s.replace(/=/g, " equals ");
    s = s.replace(/\+/g, " plus ");
    s = s.replace(/\*/g, " times ");
    s = s.replace(/[-−–]/g, " minus ");
    s = s.replace(new RegExp(`([\\w)${HELD}])\\s*/\\s*(?=[\\w(${HELD}])`, "g"), "$1 over ");

    s = speakBrackets(s);
  }

  // Whatever LaTeX is left has no spoken form.
  s = s.replace(/\\[a-zA-Z]+/g, " ");
  s = s.replace(/[{}\\]/g, " ");

  s = s.replace(HELD_ANY, (mark) => held[mark.charCodeAt(0) - 0xe000] ?? "");
  return s
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/,(\s*,)+/g, ",")
    .trim();
}

/**
 * Brackets, said aloud. A voice skips them, so "(x - 2)(x - 3)" was heard as
 * "x minus 2 x minus 3", which is a different sum.
 *
 *   (x - 2)(x - 3) = 0   bracket x minus 2, bracket x minus 3, equals 0
 *   3(x + 4)             3 bracket x plus 4
 *   (x + 1)^2            bracket x plus 1, all squared
 *   2(3 + 4) × 5         2 bracket 3 plus 4 close bracket times 5
 *   f(x)                 f of x
 *   (2, 5)               2, 5          a point: the comma is the pause
 *   (-3) + 5             minus 3 plus 5   one thing in brackets needs no words
 *
 * Runs on maths whose signs are already words, innermost brackets first.
 */
function speakBrackets(text: string): string {
  // Square brackets are said the same way. Roots, the one other use of them,
  // have been read by now.
  let s = text.replace(/\[/g, "(").replace(/\]/g, ")");

  // f(x), and P(A) in probability.
  s = s.replace(/(^|[^A-Za-z])([fghP])\s*\(([^()]*)\)/g, "$1$2 of $3 ");

  for (let depth = 0; depth < 6 && /\([^()]*\)/.test(s); depth++) {
    s = s.replace(/\(([^()]*)\)/g, (whole: string, inner: string, offset: number, all: string) => {
      const content = inner.trim();
      if (!content) return " ";
      if (content.includes(",")) return ` ${content} `;

      const after = all.slice(offset + whole.length).trimStart();
      const raised = /^(?:squared|cubed|to the power)/.test(after);
      const parts = content.split(/\s+/);
      const oneThing = parts.length === 1 || (parts.length === 2 && parts[0] === "minus" && !raised);
      if (oneThing) {
        // A number against a bracket is a multiplication: "5(4)" is "5 times
        // 4". Without the word it was read "5 4", which is fifty-four.
        const before = all.slice(0, offset).trimEnd();
        return /\d$/.test(before) ? ` times ${content} ` : ` ${content} `;
      }

      if (raised) return ` bracket ${content}${PAUSE} all `;
      // Nothing follows: the sentence around the maths supplies the pause.
      if (after === "") return ` bracket ${content} `;
      const pauseIsEnough = /^(?:equals|is |[(,.;:!?])/.test(after);
      return pauseIsEnough ? ` bracket ${content}${PAUSE} ` : ` bracket ${content} close bracket `;
    });
  }
  return s.replace(new RegExp(PAUSE, "g"), ",");
}

/**
 * A pause the bracket rule adds. It becomes a comma only at the end, so that a
 * comma already inside brackets still means a point, "(2, 5)".
 */
const PAUSE = "\u0001";

/**
 * A sentence, with any maths typed into it made speakable. Call this after the
 * `$...$` spans have been replaced by mathsToSpeech.
 */
export function proseToSpeech(text: string): string {
  let s = text;

  // Shorthand a voice reads letter by letter, or not at all.
  s = s.replace(/\be\.g\.,?/gi, "for example,");
  s = s.replace(/\bi\.e\.,?/gi, "that is,");
  s = s.replace(/\bvs\.?(?=\s)/gi, "versus");
  s = s.replace(/\bapprox\.?(?=\s)/gi, "about");
  // "d.p." ends in a full stop that may also be the end of the sentence; keep
  // one when a new sentence (or nothing) follows.
  const spellOut = (words: string) => (whole: string, n: string, after: string | undefined) =>
    `${n} ${words}${after !== undefined && whole.includes(".") ? "." : ""}${after ?? ""}`;
  s = s.replace(/(\d)\s*(?:d\.\s?p\.|dp)(?![a-zA-Z])(\s+[A-Z]|\s*$)?/g, spellOut("decimal places"));
  s = s.replace(/(\d)\s*(?:s\.\s?f\.|sf)(?![a-zA-Z])(\s+[A-Z]|\s*$)?/g, spellOut("significant figures"));
  s = s.replace(/(^|[^\d.])1 decimal places/g, "$11 decimal place");
  s = s.replace(/(^|[^\d.])1 significant figures/g, "$11 significant figure");
  s = s.replace(/\bLHS\b/g, "left-hand side");
  s = s.replace(/\bRHS\b/g, "right-hand side");
  s = s.replace(/\bSOH\s?CAH\s?TOA\b/gi, "soh cah toa");

  // Rates and units, while the digits are still next to them.
  s = s.replace(/\bkm\s*\/\s*h\b/g, "kilometres per hour");
  s = s.replace(/\bm\s*\/\s*s\b/g, "metres per second");
  s = s.replace(/\bmph\b/g, "miles per hour");
  s = s.replace(/(\d(?:[\d.,]*\d)?)\s?(km|cm|mm|kg|mg|ml)(?![a-zA-Z])/g, (whole, amount: string, abbr: string) => {
    const words = unitWords(amount, abbr);
    return words ? `${amount} ${words}` : whole;
  });
  // "m" on its own is a letter; in front of ² or ³ it can only be metres.
  s = s.replace(/(\d)\s?m(?=\s*(?:²|³|\^\s*[23](?!\d)))/g, "$1 metres");
  // The same units with no number in front: "the answer is in cm".
  s = s.replace(/(^|[\s(])(km|cm|mm|kg|ml)(?![a-zA-Z])/g, (whole, lead: string, abbr: string) => {
    const words = unitWords(null, abbr);
    return words ? `${lead}${words}` : whole;
  });

  // Powers typed with a caret.
  s = s.replace(/\^\s*2(?!\d|\.\d)/g, " squared");
  s = s.replace(/\^\s*3(?!\d|\.\d)/g, " cubed");
  s = s.replace(/\^\s*\(?(-?[\w.]+)\)?/g, " to the power of $1");

  s = speakSymbols(s);

  // "3 x 4" typed with the letter x is a multiplication. Checked before "3x"
  // is split below, which would otherwise make every 3x look like this.
  s = s.replace(/(\d)\s+[xX]\s+(?=\d)/g, "$1 times ");
  s = s.replace(/(\d)\s*\*\s*(?=\d)/g, "$1 times ");

  // "3x" → "3 x". One letter only, so "2nd" and "5kg" are left to their own
  // rules; "3D" becomes "3 D", which is how it is said.
  s = s.replace(/(\d)([a-zA-Z])(?![a-zA-Z])/g, "$1 $2");

  s = s.replace(/<=/g, " is less than or equal to ");
  s = s.replace(/>=/g, " is greater than or equal to ");
  s = s.replace(/(\w)\s*<\s*(?=[\w(-])/g, "$1 is less than ");
  s = s.replace(/(\w)\s*>\s*(?=[\w(-])/g, "$1 is greater than ");
  s = s.replace(/=/g, " equals ");
  s = s.replace(/(\w|\))\s*\+\s*(?=[\w(])/g, "$1 plus ");
  s = s.replace(/(^|[\s(])\+(?=\d)/g, "$1plus ");

  // A hyphen is a minus only where it cannot be a dash: straight in front of a
  // number, between two numbers, after a bracket, or spaced between two things
  // that are each a number or a single letter. "two-step", "x-axis" and
  // "Nice - let's go" are left alone.
  s = s.replace(/(^|[\s(]|equals\s+)[-−](?=\d)/g, "$1minus ");
  s = s.replace(/(\d)\s*[-−]\s*(?=\d)/g, "$1 minus ");
  s = s.replace(/\)\s*[-−]\s*(?=[\d(a-zA-Z])/g, ") minus ");
  s = s.replace(/(^|[\s(])(\d[\d.]*|[a-zA-Z])\s+[-−]\s+(?=\d|\(|(?![aI]\s+[a-z]{2})[a-zA-Z](?![a-zA-Z]))/g, "$1$2 minus ");

  s = s.replace(/(\d)\s*\/\s*(?=\d)/g, "$1 over ");

  // A ratio, only where the sentence is about one: "3:30" is otherwise a time.
  if (/\b(?:ratios?|scale|share[ds]?|proportion)\b/i.test(s)) {
    s = s.replace(/(\d)\s*:\s*(?=\d)(?!\d{2}\s?(?:am|pm|a\.m|p\.m)\b)/gi, "$1 to ");
  }

  return s.replace(/\s+/g, " ").replace(/\s+([,.;:!?])/g, "$1").trim();
}
