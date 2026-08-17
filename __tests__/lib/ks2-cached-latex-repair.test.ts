/**
 * Mangled LaTeX escapes in STORED lessons.
 *
 * A model emitting JSON sometimes single-escapes its LaTeX, so "\frac" arrives
 * as a form feed followed by "rac", and "\times" as a tab followed by "imes".
 * A pupil then reads "rac{9}{4}" and "3456 imes 7", and the builders cannot
 * parse the question either — which also produced missing_visual and
 * mixed_skill, because family detection was reading mangled text.
 *
 * repairMangledBackslashes already handled this, but it only ever ran on FRESH
 * model output. Measured across the live cache: 8 of 440 lessons carried 29
 * corrupted strings and stayed broken on every read, because the cache-read path
 * never repaired anything.
 */
import { deepRepairStrings, repairMangledBackslashes } from "@/lib/validate";
import { readFileSync } from "fs";

// Built from character codes so this file contains no literal control chars.
const FF = String.fromCharCode(12); // was a backslash before "f"
const TAB = String.fromCharCode(9); // was a backslash before "t"

describe("repairMangledBackslashes", () => {
  it("restores \\frac from a form feed", () => {
    expect(repairMangledBackslashes(`$${FF}rac{9}{4}$`)).toBe("$\\frac{9}{4}$");
  });

  it("restores \\times from a tab", () => {
    expect(repairMangledBackslashes(`$3456 ${TAB}imes 7$`)).toBe("$3456 \\times 7$");
  });

  it("leaves already-correct LaTeX untouched", () => {
    for (const ok of ["$\\frac{1}{2}$", "$2 \\times 3$", "plain text", ""]) {
      expect(repairMangledBackslashes(ok)).toBe(ok);
    }
  });
});

describe("deepRepairStrings on a stored lesson", () => {
  it("repairs every nested string, including inside the whiteboard", () => {
    // Shape mirrors a real cached row.
    const stored = {
      skill: "Equivalent fractions",
      workedExample: {
        question: `Convert the improper fraction $${FF}rac{9}{4}$ to a mixed number.`,
        answer: `$2${FF}rac{1}{4}$`,
        steps: [`$9 ${TAB}imes 1 = 9$`],
        whiteboard: {
          blocks: [
            { type: "equation_steps", steps: [{ latexBefore: `${FF}rac{9}{4}`, latexAfter: "2\\frac{1}{4}" }] },
          ],
        },
      },
      keyPoints: [`Use $${FF}rac{a}{b}$ notation.`],
    };
    const out = deepRepairStrings(stored);
    expect(out.workedExample.question).toBe(
      "Convert the improper fraction $\\frac{9}{4}$ to a mixed number.",
    );
    expect(out.workedExample.answer).toBe("$2\\frac{1}{4}$");
    expect(out.workedExample.steps[0]).toBe("$9 \\times 1 = 9$");
    expect(out.workedExample.whiteboard.blocks[0].steps[0].latexBefore).toBe("\\frac{9}{4}");
    expect(out.keyPoints[0]).toBe("Use $\\frac{a}{b}$ notation.");
  });

  it("leaves no control characters behind anywhere", () => {
    const out = JSON.stringify(
      deepRepairStrings({ a: `${FF}rac`, b: [`${TAB}imes`], c: { d: `${FF}orall` } }),
    );
    // JSON.stringify emits \f / \t for real control chars; a repaired string
    // contains a literal backslash, which serialises as \\.
    expect(out).not.toMatch(/(?<!\\)\\[ftrb](?![a-z])/);
  });
});

describe("the KS2 serve path applies it to cached lessons", () => {
  it("repairs on cache read, not only on fresh generation", () => {
    // This is the actual defect: the repair existed but never ran here.
    const route = readFileSync("app/api/ks2-lesson/route.ts", "utf-8");
    const cacheBlock = route.slice(
      route.indexOf("let cached = await lookupKS2LessonCache(key)"),
      route.indexOf("if (isMaths && cached.workedExample?.question)"),
    );
    expect(cacheBlock).toContain("deepRepairStrings(cached)");
  });
});
