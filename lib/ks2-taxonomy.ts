/**
 * KS2 taxonomy — Key Stage → Year → Strand → Topic → Skill → Method.
 * Thin layer over lib/ks2.ts topic ids; does not change routes.
 * Covers maths + English/Science/Computing/Arabic teaching-engine subjects.
 */

import {
  getKS2TopicById,
  listAllKS2Topics,
  type KS2SubjectId,
} from "@/lib/ks2";
import {
  KS2_PEDAGOGY,
  KS2_MATHS_TOPIC_COVERAGE,
  lookupPedagogy,
  type PedagogyEntry,
} from "@/lib/ks2-pedagogy/registry";
import type { KS2VisualRuleId } from "@/lib/ks2-visual-rules";
import { getVisualRule } from "@/lib/ks2-visual-rules";
import { englishPedagogy } from "@/lib/ks2-subject-pedagogy/english";
import { sciencePedagogy } from "@/lib/ks2-subject-pedagogy/science";
import { computingPedagogy } from "@/lib/ks2-subject-pedagogy/computing";
import { arabicPedagogy } from "@/lib/ks2-subject-pedagogy/arabic";
import {
  defaultPrerequisites,
  usesTeachingEngine,
  type SubjectPedagogyHint,
} from "@/lib/ks2-subject-pedagogy/shared";

export type KS2Strand =
  | "Number"
  | "Fractions, Decimals & Percentages"
  | "Ratio"
  | "Geometry & Measure"
  | "Statistics"
  | "Algebra"
  | "Problem Solving"
  | "Reading"
  | "Writing"
  | "Grammar, Punctuation & Spelling"
  | "Science"
  | "Forces"
  | "Electricity"
  | "Earth & Space"
  | "Living things"
  | "Materials"
  | "Working Scientifically"
  | "Computing"
  | "Online safety"
  | "Programming"
  | "Data & information"
  | "Arabic"
  | "Vocabulary"
  | "Grammar & sentences";

export interface KS2TaxonomyNode {
  keyStage: "KS2";
  yearGroup: string;
  subjectId: KS2SubjectId;
  strand: KS2Strand;
  topicId: string;
  topic: string;
  skill: string;
  method: string;
  pedagogyId: string | null;
  builderId: string | null;
  visualRuleId: KS2VisualRuleId;
  preferredBlocks: string[];
  prerequisites: string[];
  commonMistakes: { mistake: string; correction: string }[];
  guidance: string;
  route: string;
}

function mathsStrandForTopic(topicName: string): KS2Strand {
  const n = topicName.toLowerCase();
  if (/ratio/.test(n)) return "Ratio";
  if (/algebra/.test(n)) return "Algebra";
  if (/statistic/.test(n)) return "Statistics";
  if (
    /perimeter|area|volume|shape|position|direction|converting units|measurement/.test(
      n,
    )
  ) {
    return "Geometry & Measure";
  }
  if (/fraction|decimal|percent/.test(n)) {
    return "Fractions, Decimals & Percentages";
  }
  if (/problem|project|consolidation|themed/.test(n)) return "Problem Solving";
  return "Number";
}

function visualRuleForMathsPedagogy(
  pedagogy: PedagogyEntry | undefined,
  strand: KS2Strand,
): KS2VisualRuleId {
  if (!pedagogy) {
    if (strand === "Ratio") return "ratio";
    if (strand === "Statistics") return "statistics";
    if (strand === "Algebra") return "algebra";
    if (strand === "Geometry & Measure") return "geometry";
    if (strand === "Fractions, Decimals & Percentages") return "fractions";
    return "place_value";
  }
  const id = pedagogy.id;
  if (id.startsWith("fraction") || id === "fractions_compare") return "fractions";
  if (id === "decimals_fdp") return "percentages";
  if (id === "decimal_column") return "decimals";
  if (
    id.includes("multiplication") ||
    id === "multiples_factors" ||
    id === "order_of_operations"
  )
    return "multiplication";
  if (id.includes("division")) return "division";
  if (id === "ratio") return "ratio";
  if (id === "statistics") return "statistics";
  if (id === "algebra") return "algebra";
  if (id === "negative_numbers") return "negatives";
  if (
    id === "perimeter_area" ||
    id === "volume" ||
    id === "shape_angles" ||
    id === "position_direction" ||
    id === "converting_units"
  ) {
    return id === "converting_units" ? "measurement" : "geometry";
  }
  if (
    id.startsWith("place_value") ||
    id === "column_addition" ||
    id === "column_subtraction"
  ) {
    return "place_value";
  }
  if (id === "problem_solving") return "word_problems";
  return "place_value";
}

function methodForMathsPedagogy(
  pedagogy: PedagogyEntry | undefined,
  skill: string,
): string {
  if (!pedagogy) return "Teacher explanation with visual model";
  switch (pedagogy.id) {
    case "fractions_compare":
      return "Common denominator method";
    case "fraction_simplify":
      return "Simplify using highest common factor (HCF)";
    case "fraction_ops":
      return "Fraction operations with equivalent fractions";
    case "place_value_rounding":
      return "Rounding on a number line";
    case "place_value_shift":
      return "Digit shift for ×÷ powers of ten";
    case "column_multiplication":
      return "Column multiplication";
    case "order_of_operations":
      return "BIDMAS with the full expression rewritten after each operation";
    case "long_division":
      return "Bus-stop / long division";
    case "fdp_equivalence":
      return "Fraction–decimal–percentage links";
    case "ratio":
      return "Ratio table / sharing parts";
    default:
      return pedagogy.label || skill;
  }
}

function subjectHint(
  subjectId: KS2SubjectId,
  topic: string,
  skill: string,
): SubjectPedagogyHint | null {
  switch (subjectId) {
    case "english":
      return englishPedagogy(topic, skill);
    case "science":
      return sciencePedagogy(topic, skill);
    case "computing":
      return computingPedagogy(topic, skill);
    case "arabic":
      return arabicPedagogy(topic, skill);
    default:
      return null;
  }
}

function visualRuleForSubject(subjectId: KS2SubjectId): KS2VisualRuleId {
  switch (subjectId) {
    case "english":
      return "literacy";
    case "science":
      return "science_enquiry";
    case "computing":
      return "computing";
    case "arabic":
      return "languages";
    default:
      return "place_value";
  }
}

/** Resolve taxonomy for a teaching-engine subject + optional skill (subtopic). */
export function resolveKS2Taxonomy(
  topicId: string,
  skill?: string,
): KS2TaxonomyNode | null {
  const ctx = getKS2TopicById(topicId);
  if (!ctx || !usesTeachingEngine(ctx.subject.id)) return null;

  const topicName = ctx.topic.name;
  const skillName = skill || ctx.topic.subtopics[0] || topicName;
  const subjectId = ctx.subject.id;

  if (subjectId === "maths") {
    const strand = mathsStrandForTopic(topicName);
    const hits = lookupPedagogy(skillName, topicName);
    const pedagogy =
      hits[0] ||
      KS2_PEDAGOGY.find((p) => p.id === KS2_MATHS_TOPIC_COVERAGE[topicName]) ||
      undefined;
    const visualRuleId = visualRuleForMathsPedagogy(pedagogy, strand);
    const rule = getVisualRule(visualRuleId);
    return {
      keyStage: "KS2",
      yearGroup: ctx.year,
      subjectId,
      strand,
      topicId,
      topic: topicName,
      skill: skillName,
      method: methodForMathsPedagogy(pedagogy, skillName),
      pedagogyId: pedagogy?.id ?? KS2_MATHS_TOPIC_COVERAGE[topicName] ?? null,
      builderId: pedagogy?.builderId ?? null,
      visualRuleId,
      preferredBlocks: pedagogy?.requiredBlocks?.length
        ? pedagogy.requiredBlocks
        : rule.preferredBlocks,
      prerequisites: defaultPrerequisites("maths"),
      commonMistakes: (pedagogy?.commonMistakes || []).map((m) => ({
        mistake: m,
        correction: "Use the method shown in the worked example.",
      })),
      guidance: rule.guidance,
      route: `/ks2/topic/${topicId}`,
    };
  }

  const hint = subjectHint(subjectId, topicName, skillName)!;
  const visualRuleId = visualRuleForSubject(subjectId);
  const rule = getVisualRule(visualRuleId);
  return {
    keyStage: "KS2",
    yearGroup: ctx.year,
    subjectId,
    strand: hint.strand as KS2Strand,
    topicId,
    topic: topicName,
    skill: skillName,
    method: hint.method,
    pedagogyId: `${subjectId}_${hint.strand.toLowerCase().replace(/\s+/g, "_")}`,
    builderId: null,
    visualRuleId,
    preferredBlocks: hint.preferredBlocks.length
      ? hint.preferredBlocks
      : rule.preferredBlocks,
    prerequisites: hint.prerequisites,
    commonMistakes: hint.commonMistakes,
    guidance: hint.guidance,
    route: `/ks2/topic/${topicId}`,
  };
}

/** Flat audit rows for curriculum teaching-engine subjects × subtopics. */
export function auditAllKS2MathsTopics(): KS2TaxonomyNode[] {
  return auditKS2CurriculumSubjects(["maths"]);
}

export function auditKS2CurriculumSubjects(
  subjects: KS2SubjectId[] = ["maths", "english", "science", "computing", "arabic"],
): KS2TaxonomyNode[] {
  const rows: KS2TaxonomyNode[] = [];
  for (const t of listAllKS2Topics()) {
    if (!subjects.includes(t.subjectId)) continue;
    if (t.section !== "curriculum") continue;
    const ctx = getKS2TopicById(t.id);
    if (!ctx) continue;
    const skills =
      ctx.topic.subtopics.length > 0 ? ctx.topic.subtopics : [ctx.topic.name];
    for (const skill of skills) {
      const node = resolveKS2Taxonomy(t.id, skill);
      if (node) rows.push(node);
    }
  }
  return rows;
}

export function taxonomyPromptFragment(node: KS2TaxonomyNode): string {
  const rule = getVisualRule(node.visualRuleId);
  return `Taxonomy: ${node.keyStage} → ${node.yearGroup} → ${node.subjectId} → ${node.strand} → ${node.topic} → ${node.skill} → ${node.method}.
${node.guidance || rule.guidance}
Preferred visuals: ${node.preferredBlocks.join(", ")}.`;
}
