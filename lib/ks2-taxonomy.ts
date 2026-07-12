/**
 * KS2 taxonomy — Key Stage → Year → Strand → Topic → Skill → Method.
 * Thin layer over lib/ks2.ts topic ids; does not change routes.
 */

import { getKS2TopicById, listAllKS2Topics } from "@/lib/ks2";
import {
  KS2_PEDAGOGY,
  KS2_MATHS_TOPIC_COVERAGE,
  lookupPedagogy,
  type PedagogyEntry,
} from "@/lib/ks2-pedagogy/registry";
import type { KS2VisualRuleId } from "@/lib/ks2-visual-rules";
import { getVisualRule } from "@/lib/ks2-visual-rules";

export type KS2Strand =
  | "Number"
  | "Fractions, Decimals & Percentages"
  | "Ratio"
  | "Geometry & Measure"
  | "Statistics"
  | "Algebra"
  | "Problem Solving";

export interface KS2TaxonomyNode {
  keyStage: "KS2";
  yearGroup: string;
  strand: KS2Strand;
  topicId: string;
  topic: string;
  skill: string;
  method: string;
  pedagogyId: string | null;
  builderId: string | null;
  visualRuleId: KS2VisualRuleId;
  preferredBlocks: string[];
  route: string;
}

function strandForTopic(topicName: string): KS2Strand {
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
  if (
    /fraction|decimal|percent/.test(n)
  ) {
    return "Fractions, Decimals & Percentages";
  }
  if (/problem|project|consolidation|themed/.test(n)) return "Problem Solving";
  return "Number";
}

function visualRuleForPedagogy(
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
  if (id.includes("multiplication") || id === "multiples_factors")
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
  if (id.startsWith("place_value") || id === "column_addition" || id === "column_subtraction")
    return "place_value";
  if (id === "problem_solving") return "word_problems";
  return "place_value";
}

function methodForPedagogy(pedagogy: PedagogyEntry | undefined, skill: string): string {
  if (!pedagogy) return "Teacher explanation with visual model";
  switch (pedagogy.id) {
    case "fractions_compare":
      return "Common denominator method";
    case "fraction_ops":
      return "Fraction operations with equivalent fractions";
    case "place_value_rounding":
      return "Rounding on a number line";
    case "place_value_shift":
      return "Digit shift for ×÷ powers of ten";
    case "column_multiplication":
      return "Column multiplication";
    case "long_division":
      return "Bus-stop / long division";
    case "fdp_equivalence":
      return "Fraction–decimal–percentage links";
    case "ratio_table":
    case "ratio":
      return "Ratio table / sharing parts";
    default:
      return pedagogy.label || skill;
  }
}

/** Resolve taxonomy for a maths topic + optional skill (subtopic). */
export function resolveKS2Taxonomy(
  topicId: string,
  skill?: string,
): KS2TaxonomyNode | null {
  const ctx = getKS2TopicById(topicId);
  if (!ctx || ctx.subject.id !== "maths") return null;

  const topicName = ctx.topic.name;
  const skillName =
    skill ||
    ctx.topic.subtopics[0] ||
    topicName;
  const strand = strandForTopic(topicName);
  const hits = lookupPedagogy(skillName, topicName, ctx.topic.subtopics);
  const pedagogy =
    hits[0] ||
    KS2_PEDAGOGY.find(
      (p) => p.id === KS2_MATHS_TOPIC_COVERAGE[topicName],
    ) ||
    undefined;
  const visualRuleId = visualRuleForPedagogy(pedagogy, strand);
  const rule = getVisualRule(visualRuleId);

  return {
    keyStage: "KS2",
    yearGroup: ctx.year,
    strand,
    topicId,
    topic: topicName,
    skill: skillName,
    method: methodForPedagogy(pedagogy, skillName),
    pedagogyId: pedagogy?.id ?? KS2_MATHS_TOPIC_COVERAGE[topicName] ?? null,
    builderId: pedagogy?.builderId ?? null,
    visualRuleId,
    preferredBlocks: pedagogy?.requiredBlocks?.length
      ? pedagogy.requiredBlocks
      : rule.preferredBlocks,
    route: `/ks2/topic/${topicId}`,
  };
}

/** Flat audit rows for every maths curriculum topic × subtopic. */
export function auditAllKS2MathsTopics(): KS2TaxonomyNode[] {
  const rows: KS2TaxonomyNode[] = [];
  for (const t of listAllKS2Topics()) {
    if (t.subjectId !== "maths") continue;
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
  return `Taxonomy: ${node.keyStage} → ${node.yearGroup} → ${node.strand} → ${node.topic} → ${node.skill} → ${node.method}.
${rule.guidance}
Preferred visuals: ${node.preferredBlocks.join(", ")}.`;
}
