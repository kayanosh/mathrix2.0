/**
 * The KS2 learning pathway: targets, difficulty tiers, and standards.
 *
 * Pupils pick a TARGET (what they are working towards) and a TIER (how hard).
 * The tier maps to a recognised KS2 standard so teachers and parents can see
 * how close a pupil is to the highest grade possible.
 */

export type KS2Target = "curriculum" | "sats" | "eleven_plus";
export type KS2Tier = "developing" | "secure" | "greater_depth";

export const KS2_TARGETS: { id: KS2Target; label: string; blurb: string }[] = [
  { id: "curriculum", label: "Curriculum", blurb: "Master the year-group objectives" },
  { id: "sats", label: "SATs", blurb: "Aim for a strong scaled score (110+)" },
  { id: "eleven_plus", label: "11+", blurb: "Stretch towards an entrance-exam pass" },
];

export const KS2_TIERS: {
  id: KS2Tier;
  label: string;
  standard: string;
  blurb: string;
  /** Difficulty token passed to the practice generator. */
  difficulty: "easy" | "medium" | "hard";
}[] = [
  {
    id: "developing",
    label: "Developing",
    standard: "Working Towards",
    blurb: "Building the basics with friendly numbers",
    difficulty: "easy",
  },
  {
    id: "secure",
    label: "Secure",
    standard: "Expected Standard",
    blurb: "Confident with the year-group objective",
    difficulty: "medium",
  },
  {
    id: "greater_depth",
    label: "Greater Depth",
    standard: "Greater Depth",
    blurb: "Tricky, multi-step reasoning — the highest grade",
    difficulty: "hard",
  },
];

export const PATHWAY_STAGES = [
  { id: "learn", label: "Learn", blurb: "A friendly lesson with examples", emoji: "📘" },
  { id: "guided", label: "Guided", blurb: "Worked examples with hints", emoji: "🧑‍🏫" },
  { id: "practise", label: "Practise", blurb: "Have a go yourself", emoji: "✏️" },
  { id: "quiz", label: "Mastery Quiz", blurb: "Pass to earn your star", emoji: "⭐" },
] as const;

export type KS2StageId = (typeof PATHWAY_STAGES)[number]["id"];

/** Number of correct answers needed in the mastery quiz to "master" the topic. */
export const MASTERY_QUIZ_SIZE = 4;
export const MASTERY_PASS_MARK = 3;

export function tierMeta(tier: KS2Tier) {
  return KS2_TIERS.find((t) => t.id === tier) ?? KS2_TIERS[1];
}

export function targetMeta(target: KS2Target) {
  return KS2_TARGETS.find((t) => t.id === target) ?? KS2_TARGETS[0];
}

/** Human context phrase for prompts, e.g. "an 11+ Greater Depth". */
export function targetTierPhrase(target: KS2Target, tier: KS2Tier): string {
  const t = targetMeta(target).label;
  const d = tierMeta(tier).label;
  if (target === "eleven_plus") return `an 11+ (${d}) standard`;
  if (target === "sats") return `a KS2 SATs (${d}) standard`;
  return `a KS2 ${d} standard`;
}
