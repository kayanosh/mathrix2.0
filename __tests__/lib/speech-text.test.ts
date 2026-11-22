/**
 * What the voice is actually given to say.
 *
 * Pupils reported words pronounced wrongly and numbers said too fast. A voice
 * reads the characters it is handed, so both come down to the text: "ab",
 * "5cm²", "90^\circ" and "≤" are guesses for it, and "3x+7=25" has no pause in
 * it anywhere. These pin the spoken form of the things that turn up on a maths
 * board.
 */
import { sanitizeForTTS } from "@/lib/narration";
import { mathsToSpeech, pauseBeforeEquals, proseToSpeech } from "@/lib/speech-text";
import { spokenTermIndex } from "@/lib/spoken-terms";

describe("a line of working is not one run of numbers", () => {
  it("pauses before 'equals' when there is a sum in front of it", () => {
    expect(sanitizeForTTS("$3x + 7 = 25$")).toBe("3 x plus 7, equals 25");
    expect(sanitizeForTTS("Subtract $7$ from both sides: $3x + 7 - 7 = 25 - 7$.")).toBe(
      "Subtract 7 from both sides: 3 x plus 7 minus 7, equals 25 minus 7.",
    );
  });

  it("leaves a short statement alone", () => {
    expect(sanitizeForTTS("So $x = 6$. Done!")).toBe("So x equals 6. Done!");
    expect(sanitizeForTTS("$2x = 18$")).toBe("2 x equals 18");
  });

  it("does the same for maths typed without dollar signs", () => {
    expect(sanitizeForTTS("We have 3x + 7 = 25, so 3x = 18.")).toBe(
      "We have 3 x plus 7, equals 25, so 3 x equals 18.",
    );
  });

  it("does not add a second pause to text that already has one", () => {
    const once = pauseBeforeEquals("3 x plus 7 equals 25");
    expect(pauseBeforeEquals(once)).toBe(once);
  });

  it("does not put a pause into an ordinary sentence", () => {
    expect(pauseBeforeEquals("So the answer is x equals 3")).toBe("So the answer is x equals 3");
  });
});

describe("letters and numbers written side by side", () => {
  it.each([
    ["$3x$", "3 x"],
    ["$y = mx + c$", "y equals m x plus c"],
    ["$ab + 2a = 4ab$", "A b plus 2 A, equals 4 A b"],
    ["In triangle $ABC$, $AB = 5$.", "In triangle A B C, A B equals 5."],
    ["$v = u + at$", "v equals u plus A t"],
    ["$x_1 + x_2$", "x 1 plus x 2"],
  ])("%s", (written, spoken) => {
    expect(sanitizeForTTS(written)).toBe(spoken);
  });

  it("does not spell out a word someone forgot to wrap in \\text", () => {
    expect(sanitizeForTTS("$Area = 6$")).toBe("Area equals 6");
    expect(sanitizeForTTS("$x = 2$ or $x = 3$")).toBe("x equals 2 or x equals 3");
    expect(mathsToSpeech("x = 2 or x = 3")).toBe("x equals 2 or x equals 3");
  });

  it("keeps words inside \\text as words", () => {
    expect(sanitizeForTTS("$\\text{Area} = \\frac{1}{2} \\times \\text{base} \\times \\text{height}$")).toBe(
      "Area equals 1 over 2 times base times height",
    );
  });
});

describe("powers, roots and fractions", () => {
  it.each([
    ["$x^2 - 5x + 6 = 0$", "x squared minus 5 x plus 6, equals 0"],
    // Was "x squared5": the rule for ^2 matched the front of ^25.
    ["$x^{25}$", "x to the power of 25"],
    ["$x^25$", "x to the power of 25"],
    ["$2^{10}$", "2 to the power of 10"],
    ["$1.5 \\times 10^3$", "1.5 times 10 cubed"],
    ["$\\sqrt{49} = 7$", "the square root of 49 equals 7"],
    ["$\\sqrt[3]{8} = 2$", "the cube root of 8 equals 2"],
    ["$\\frac{3}{4}$ of $20$", "3 over 4 of 20"],
    ["$2\\frac{1}{2}$", "2 and 1 over 2"],
    ["$\\frac{x+1}{2} = 5$", "x plus 1, all over 2, equals 5"],
    ["$\\frac{dy}{dx} = 2x$", "d y by d x, equals 2 x"],
    ["3/4 + 1/4 = 1", "3 over 4 plus 1 over 4, equals 1"],
  ])("%s", (written, spoken) => {
    expect(sanitizeForTTS(written)).toBe(spoken);
  });
});

describe("symbols a voice would guess at", () => {
  it.each([
    // Was "90 to the power of": the power rule took ^\circ.
    ["The angle is $90^\\circ$ and the other is $45^{\\circ}$.", "The angle is 90 degrees and the other is 45 degrees."],
    ["$x \\leq 4$ and x >= 2 and $y < 3$", "x is less than or equal to 4 and x is greater than or equal to 2 and y is less than 3"],
    ["That is $15\\%$ of £40, about 33.3% in total.", "That is 15 percent of £40, about 33.3 percent in total."],
    ["6 ÷ 2 = 3 and 5 × 3 = 15", "6 divided by 2, equals 3 and 5 times 3, equals 15"],
    ["3 x 4 = 12", "3 times 4, equals 12"],
    ["$\\pi r^2 \\approx 28.3$", "pi r squared is about 28.3"],
    ["$-5 + 8 = 3$", "minus 5 plus 8, equals 3"],
    ["x = -4", "x equals minus 4"],
    ["$3 : 2$", "3 to 2"],
    ["$62,403 + 1,250$", "62,403 plus 1,250"],
  ])("%s", (written, spoken) => {
    expect(sanitizeForTTS(written)).toBe(spoken);
  });
});

describe("units and shorthand", () => {
  it.each([
    ["The area is 20cm² and the length is 5 cm.", "The area is 20 centimetres squared and the length is 5 centimetres."],
    ["It is 1 cm long, or 10mm.", "It is 1 centimetre long, or 10 millimetres."],
    ["The area is $5 \\times 4 = 20\\text{ cm}^2$.", "The area is 5 times 4, equals 20 centimetres squared."],
    ["$5\\,\\text{kg}$ and $1\\text{ m}$ and $3\\text{ m}$", "5 kilograms and 1 metre and 3 metres"],
    ["The speed is 30 km/h or $12\\text{ m/s}$.", "The speed is 30 kilometres per hour or 12 metres per second."],
    ["Round to 2 d.p. and then to 3 s.f., or 1 dp.", "Round to 2 decimal places and then to 3 significant figures, or 1 decimal place."],
    ["e.g. the 2nd term, i.e. the nth term is $3n + 1$", "for example, the 2nd term, that is, the nth term is 3 n plus 1"],
  ])("%s", (written, spoken) => {
    expect(sanitizeForTTS(written)).toBe(spoken);
  });

  it("does not read a letter as a unit: 3m is three m", () => {
    expect(sanitizeForTTS("$3m + 2 = 11$")).toBe("3 m plus 2, equals 11");
    expect(proseToSpeech("so 3m = 9")).toBe("so 3 m equals 9");
  });
});

describe("a sentence stays a sentence", () => {
  it("leaves hyphens and dashes that are not minus signs", () => {
    const text = "This is a two-step problem - don't worry. Use the x-axis.";
    expect(sanitizeForTTS(text)).toBe(text);
    expect(sanitizeForTTS("Multiply \\frac{1}{2} by 4 to get 2 - a well-known trick.")).toBe(
      "Multiply 1 over 2 by 4 to get 2 - a well-known trick.",
    );
  });

  it("reads a minus as a minus", () => {
    expect(sanitizeForTTS("x - 3 = 5 and 25-7 = 18")).toBe("x minus 3, equals 5 and 25 minus 7, equals 18");
  });

  it("reads a ratio as a ratio and a time as a time", () => {
    expect(sanitizeForTTS("Share £60 in the ratio 2:1. At 3:30 pm it starts.")).toBe(
      "Share £60 in the ratio 2 to 1. At 3:30 pm it starts.",
    );
    expect(sanitizeForTTS("The lesson is at 9:15.")).toBe("The lesson is at 9:15.");
  });

  it("does not turn the article 'a' into the letter A", () => {
    expect(sanitizeForTTS("This is a triangle with a base of $6$.")).toBe("This is a triangle with a base of 6.");
  });

  it("removes emoji and ticks", () => {
    expect(sanitizeForTTS("Great job! 🎉 Correct ✓")).toBe("Great job! Correct");
  });
});

describe("the pen can still follow the words", () => {
  it("finds each term by the digits that are spoken", () => {
    const spoken = sanitizeForTTS("That $7$ is in the way, so subtract $7$ from $3x + 7$.");
    const words = spoken.split(/\s+/);
    const terms = ["3", "x", "7"];
    const at = (word: string, nth = 0) => {
      let seen = -1;
      return words.findIndex((w) => w.replace(/[.,]/g, "") === word && ++seen === nth);
    };
    expect(spokenTermIndex(terms, spoken, at("7"))).toBe(2);
    expect(spokenTermIndex(terms, spoken, at("3"))).toBe(0);
    expect(spokenTermIndex(terms, spoken, at("x"))).toBe(1);
  });
});
