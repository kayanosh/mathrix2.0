import {
  detectSkillVisualFamily,
  repairWordProblemVisuals,
  satisfiesSkillVisuals,
} from "@/lib/ks2-skill-visuals";
import { validateKS2TeachingLesson } from "@/lib/ks2-lesson-validator";
import type { KS2TeachingLesson } from "@/types/ks2-lesson";
import type { VisualBlock } from "@/types/whiteboard";

describe("LaTeX does not hijack visual family detection", () => {
  it("$\\square$ in a sequence question is not detected as geometry", () => {
    const family = detectSkillVisualFamily(
      "Continue the sequence: $7$, $12$, $17$, $22$, $\\square$, $\\square$",
      "Algebra",
      "Linear number sequences",
    );
    expect(family).toBe("algebra");
  });

  it("a bare sequence question with LaTeX blanks is still not geometry", () => {
    const family = detectSkillVisualFamily(
      "Find the missing numbers: $3$, $8$, $13$, $\\square$, $23$",
    );
    expect(family).not.toBe("geometry");
  });

  it("genuine geometry wording still detects as geometry", () => {
    expect(
      detectSkillVisualFamily("How many lines of symmetry does this square have?"),
    ).toBe("geometry");
  });
});

describe("word problems inside a multiplication/division skill are not mixed-skill", () => {
  it("classifies the family pair as expected", () => {
    const skillFam = detectSkillVisualFamily("", "", "Multiplication and division problems");
    const qFam = detectSkillVisualFamily(
      "A school orders 24 boxes of pencils. Each box holds 36 pencils. How many pencils are there altogether?",
    );
    expect(["multiplication", "division"]).toContain(skillFam);
    expect(qFam).toBe("word_problems");
  });

  it("validateKS2TeachingLesson does not raise mixed_skill", () => {
    const lesson: KS2TeachingLesson = {
      schemaVersion: 2,
      keyStage: "KS2",
      yearGroup: "Year 5",
      strand: "Number",
      topic: "Multiplication and Division",
      skill: "Multiplication and division problems",
      method: "Identify the operation, then calculate",
      learningObjective:
        "Solve multiplication and division word problems using formal written methods.",
      prerequisiteKnowledge: ["Times tables to 12 × 12"],
      teachingBlocks: [],
      workedExamples: [],
      guidedPractice: [
        {
          question: "A shop packs 18 eggs into each of 14 boxes. How many eggs are packed?",
          answer: "252",
          hint: "Multiply 18 by 14",
        },
      ],
      independentPractice: [
        { question: "25 × 16", answer: "400" },
      ],
      quickCheck: { question: "12 × 15", answer: "180" },
      commonMistakes: [
        {
          mistake: "Adding instead of multiplying.",
          correction: "Equal groups mean we multiply the group size by the number of groups.",
        },
      ],
      recap: "Word problems: find the operation, then calculate carefully.",
      intro: "Word problems hide a calculation inside a story.",
      sections: [
        { heading: "Core idea", body: "Equal groups mean multiplication." },
      ],
      workedExample: {
        question:
          "A school orders 24 boxes of pencils. Each box holds 36 pencils. How many pencils are there altogether?",
        steps: [
          "Underline the key numbers: 24 boxes and 36 pencils in each box.",
          "Equal groups mean multiply: work out 36 × 24.",
          "36 × 24 = 864, so there are 864 pencils altogether.",
        ],
        answer: "864",
        whiteboard: {
          intro: "Find the key information first.",
          blocks: [
            {
              type: "table",
              caption: "Key information",
              headers: ["Item", "Value"],
              rows: [
                ["Boxes", "24"],
                ["Pencils per box", "36"],
                ["Total pencils", "36 × 24 = 864"],
              ],
            },
          ],
          conclusion: "864 pencils",
        },
        teachingSteps: [
          {
            title: "Find the key information",
            explanation: "The story tells us there are 24 boxes with 36 pencils in each.",
            why: "Identifying the numbers first stops us grabbing the wrong operation.",
            narration: "First, find the key numbers in the story.",
            cellKeys: [],
            carryKeys: [],
            noteKeys: [],
          },
          {
            title: "Choose the operation",
            explanation: "Equal groups of 36, 24 times, means 36 × 24.",
            narration: "Equal groups mean we multiply.",
            cellKeys: [],
            carryKeys: [],
            noteKeys: [],
          },
          {
            title: "Calculate",
            explanation: "36 × 24 = 864. There are 864 pencils altogether.",
            narration: "Thirty-six times twenty-four is 864.",
            cellKeys: [],
            carryKeys: [],
            noteKeys: [],
          },
        ],
      },
      keyPoints: ["Equal groups mean multiply", "Check the units in your answer"],
    };
    const v = validateKS2TeachingLesson(lesson, { maths: true });
    expect(v.issues.some((i) => i.code === "mixed_skill")).toBe(false);
  });
});

describe("repairWordProblemVisuals", () => {
  const question =
    "A school buys $24$ boxes of pencils. Each box has $36$ pencils. How many pencils does the school buy?";
  const columnOnly: VisualBlock[] = [
    {
      type: "column_method",
      method: "column_multiplication",
      rows: ["36", "24", "144", "720", "864"],
      question: "36 × 24",
      answer: "864",
    },
  ];

  it("prepends a key_info block when only a calculation method is present", () => {
    const repaired = repairWordProblemVisuals(
      columnOnly,
      question,
      "Multiplication & Division B",
      "Multiplication and division problems",
    );
    expect(repaired[0].type).toBe("key_info");
    expect(repaired).toHaveLength(2);
    // The repaired set now satisfies the strict word_problems contract
    expect(
      satisfiesSkillVisuals(
        repaired.map((b) => b.type),
        "word_problems",
      ),
    ).toBe(true);
    // Key numbers from the question are highlighted
    const keyInfo = repaired[0];
    if (keyInfo.type !== "key_info") throw new Error("expected key_info");
    expect(keyInfo.stem).toBe(question);
    expect(keyInfo.highlights.map((h) => h.text)).toEqual(["24", "36"]);
  });

  it("leaves blocks that already satisfy the contract unchanged", () => {
    const withTable: VisualBlock[] = [
      {
        type: "table",
        headers: ["Item", "Value"],
        rows: [["Boxes", "24"]],
      },
    ];
    const repaired = repairWordProblemVisuals(
      withTable,
      question,
      "Multiplication & Division B",
      "Multiplication and division problems",
    );
    expect(repaired).toBe(withTable);
  });

  it("does not touch non-word-problem families", () => {
    const repaired = repairWordProblemVisuals(
      columnOnly,
      "Simplify 12/16",
      "Fractions",
      "Simplify fractions using the highest common factor",
    );
    expect(repaired).toBe(columnOnly);
  });

  it("returns blocks unchanged when the question has no numbers", () => {
    const repaired = repairWordProblemVisuals(
      columnOnly,
      "How many pencils are left over altogether?",
      "",
      "",
    );
    expect(repaired).toBe(columnOnly);
  });
});
