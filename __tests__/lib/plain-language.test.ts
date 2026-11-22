/**
 * Pupils were being told to "isolate x" by a tutor that opened with "Very well
 * — allow me to walk you through it". The prompts now ask for plain English,
 * but a prompt is a request. These pin the part that is a guarantee: whatever
 * is written, by a model or a builder, today or in an answer saved last month,
 * the wording that reaches the pupil is plain — and the maths is untouched.
 */
import { plainLanguage, simplifyLanguage } from "@/lib/plain-language";
import { buildMethodForQuestion } from "@/lib/methods";
import { buildFollowUpPrompt, buildSystemPrompt } from "@/lib/prompts/system";
import { buildLessonPrompt, buildTeacherExplanationPrompt } from "@/lib/prompts/teacher";

describe("plainLanguage — formal wording", () => {
  it("rewrites the opening line the live site was showing", () => {
    expect(
      plainLanguage("Very well — we need to isolate $x$ on one side. Allow me to walk you through it."),
    ).toBe("We need to get $x$ on its own. Let's go through it step by step.");
  });

  it.each([
    ["Subtract 7 from both sides to isolate the x term.", "Subtract 7 from both sides to get the x term on its own."],
    ["Isolating $y$ gives $y = 4$.", "Getting $y$ on its own gives $y = 4$."],
    ["Divide both sides by the coefficient of $x$.", "Divide both sides by the number in front of $x$."],
    ["Therefore $x = 3$. Thus the answer is 3.", "So $x = 3$. So the answer is 3."],
    ["Calculate the area, then determine the length.", "Work out the area, then work out the length."],
    ["It is approximately $3.14$, which is sufficient.", "It is about $3.14$, which is enough."],
    ["We shall employ the sine rule here.", "We will use the sine rule here."],
    ["A quadratic — rather elegant once you see it. Shall we begin?", "A quadratic — neat once you see it. Let's start."],
    ["Let's go, shall we?", "Let's go."],
    ["That is indeed correct.", "That is correct."],
  ])("%s", (formal, plain) => {
    expect(plainLanguage(formal, { gloss: false })).toBe(plain);
  });

  it("drops a butler's opener and keeps the sentence", () => {
    expect(plainLanguage("Ah, circle theorems — splendid.")).toBe("Circle theorems — great.");
  });

  it("leaves wording that is already plain exactly as it was", () => {
    for (const text of [
      "Nice question. Let's work through it together.",
      "Take 7 away from both sides.",
      "Use the calculator to check your calculation.",
      "Rather than adding, we subtract.",
      "I would rather give you nothing than teach you something wrong.",
      "Ah-ha! There it is.",
      "The answer. x is 3, e.g. the first one.",
    ]) {
      expect(plainLanguage(text)).toBe(text);
    }
  });

  it("keeps a real question a question", () => {
    expect(plainLanguage("What maths shall we work on?")).toBe("What maths should we work on?");
  });
});

describe("plainLanguage — the maths is never touched", () => {
  it("leaves everything inside dollar signs alone", () => {
    const maths = "$\\therefore x = \\frac{3}{4}$";
    expect(plainLanguage(`Hence ${maths}.`)).toBe(`So ${maths}.`);
  });

  it("leaves LaTeX commands outside dollar signs alone", () => {
    expect(plainLanguage("\\therefore x = 2, thus done")).toBe("\\therefore x = 2, so done");
  });

  it("changes no digit or symbol", () => {
    const text = "Therefore calculate $3x + 7 = 25$ to obtain 18 ÷ 3 = 6, approximately 6.0.";
    const digits = (s: string) => s.replace(/[^0-9=+÷.$]/g, "");
    expect(digits(plainLanguage(text))).toBe(digits(text));
  });

  it("does not change the case of an unknown at the start of a sentence", () => {
    expect(plainLanguage("Therefore we are done. x is 3.")).toBe("So we are done. x is 3.");
  });
});

describe("plainLanguage — words a pupil has to learn", () => {
  it("keeps the word and explains it in brackets", () => {
    expect(plainLanguage("Multiply the numerator and the denominator by 2.")).toBe(
      "Multiply the numerator (the top number) and the denominator (the bottom number) by 2.",
    );
  });

  it("explains a word once, not every time", () => {
    const out = plainLanguage("The denominator is 8. Keep the denominator the same.");
    expect(out.match(/bottom number/g)).toHaveLength(1);
  });

  it("does not explain what the writer already explained", () => {
    const text = "The hypotenuse is the longest side of the triangle.";
    expect(plainLanguage(text)).toBe(text);
  });

  it("matches the plural", () => {
    expect(plainLanguage("Never add the denominators.")).toBe(
      "Never add the denominators (the bottom numbers).",
    );
  });

  it("spells out an abbreviation the first time", () => {
    expect(plainLanguage("Find the HCF of 12 and 18.")).toBe(
      "Find the HCF (highest common factor) of 12 and 18.",
    );
  });
});

describe("simplifyLanguage — a whole answer", () => {
  const answer = {
    // Deliberately out of reading order, as JSON from a model often is.
    conclusion: "Therefore the denominator is 8.",
    intro: "Very well — fractions.",
    blocks: [
      {
        type: "equation_steps",
        steps: [
          {
            operationLabel: "Determine the denominator",
            explanation: "Look at the denominator.",
            narration: "Look at the denominator.",
            latexBefore: "\\frac{1}{4}",
            latexAfter: "\\frac{2}{8}",
            rule: "Equivalent fractions",
          },
          { explanation: "The denominator stays the same.", latexAfter: "\\frac{2}{8}" },
        ],
      },
    ],
    hint: "Hence never add the denominators.",
    topic: "the denominator",
  };
  const out = simplifyLanguage(answer);

  it("explains a word where the pupil first meets it, and nowhere after", () => {
    const [first, second] = out.blocks[0].steps;
    expect(first.explanation).toBe("Look at the denominator (the bottom number).");
    expect(second.explanation).toBe("The denominator stays the same.");
    expect(out.conclusion).toBe("So the denominator is 8.");
    expect(out.hint).toBe("So never add the denominators.");
  });

  it("explains it in both the written and the spoken form of the same step", () => {
    expect(out.blocks[0].steps[0].narration).toBe("Look at the denominator (the bottom number).");
  });

  it("simplifies a short label without adding brackets to it", () => {
    expect(out.blocks[0].steps[0].operationLabel).toBe("Work out the denominator");
  });

  it("leaves the maths, the rule name and the topic alone", () => {
    const step = out.blocks[0].steps[0];
    expect(step.latexBefore).toBe("\\frac{1}{4}");
    expect(step.latexAfter).toBe("\\frac{2}{8}");
    expect(step.rule).toBe("Equivalent fractions");
    expect(out.topic).toBe("the denominator");
  });

  it("returns a copy and leaves the saved answer as it was", () => {
    expect(answer.intro).toBe("Very well — fractions.");
    expect(out.intro).toBe("Fractions.");
  });

  it("passes through things that are not answers", () => {
    expect(simplifyLanguage(null)).toBeNull();
    expect(simplifyLanguage("Therefore")).toBe("Therefore");
    expect(simplifyLanguage({ error: "limit_reached", count: 3 })).toEqual({ error: "limit_reached", count: 3 });
  });

  it("reaches fields named by the caller", () => {
    const explanation = { steps: [{ text: "Hence divide by 2." }] };
    expect(simplifyLanguage(explanation).steps[0].text).toBe("Hence divide by 2.");
    expect(simplifyLanguage(explanation, { alsoProse: ["text"] }).steps[0].text).toBe("So divide by 2.");
  });
});

describe("the sources of the wording", () => {
  it("the linear-equation builder speaks plainly without help", () => {
    const built = buildMethodForQuestion("3x + 7 = 25")!;
    const said = [
      built.intro,
      ...built.teachingSteps.flatMap((s) => [s.explanation, s.narration, s.why ?? ""]),
      ...(built.block as { steps: Array<{ explanation: string; why?: string }> }).steps.flatMap((s) => [
        s.explanation,
        s.why ?? "",
      ]),
    ].join(" ");
    expect(said).not.toMatch(/isolat|coefficient|very well|allow me|variable|inverse operations keep/i);
    expect(plainLanguage(built.intro ?? "")).toBe(built.intro);
  });

  it('the builder says "add … to", not "add … from"', () => {
    const built = buildMethodForQuestion("2x - 4 = 10")!;
    const labels = (built.block as { steps: Array<{ operationLabel: string }> }).steps.map((s) => s.operationLabel);
    expect(labels).toContain("Add 4 to both sides");
    expect(labels.join(" ")).not.toMatch(/add \d+ from/i);
  });

  it("no prompt asks for, or shows an example of, the butler", () => {
    const prompts = [
      buildSystemPrompt("algebra"),
      buildSystemPrompt("geometry"),
      buildSystemPrompt("statistics"),
      buildSystemPrompt("trigonometry"),
      buildSystemPrompt("number"),
      buildFollowUpPrompt(),
      buildTeacherExplanationPrompt("Algebra", "Linear equations"),
      buildLessonPrompt("Fractions"),
      buildLessonPrompt("Fractions", "KS2", "KS2"),
    ];
    for (const prompt of prompts) {
      expect(prompt).toContain("PLAIN ENGLISH");
      // The rules name these words in order to ban them, always in quotes.
      // What must not exist is an example or an instruction that uses them.
      expect(prompt).not.toMatch(/butler —|Posh but|composed, elegant|composed sentence/i);
      expect(prompt).not.toMatch(/"intro": "[^"]*(?:Very well|Allow me|Shall we|splendid|elegant|determine)/i);
    }
  });
});
