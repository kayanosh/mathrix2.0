/**
 * Audit all KS2 maths curriculum topics → taxonomy + pedagogy coverage.
 *
 * Usage: npx tsx scripts/audit-ks2-topics.ts
 * Writes: scripts/output/ks2-topic-audit.json (+ .md summary)
 */

import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { auditAllKS2MathsTopics } from "../lib/ks2-taxonomy";
import { getVisualRule } from "../lib/ks2-visual-rules";

function main() {
  const rows = auditAllKS2MathsTopics();
  const withBuilder = rows.filter((r) => r.builderId).length;
  const report = {
    generatedAt: new Date().toISOString(),
    totals: {
      skills: rows.length,
      withBuilder,
      withoutBuilder: rows.length - withBuilder,
    },
    rows: rows.map((r) => ({
      route: r.route,
      yearGroup: r.yearGroup,
      strand: r.strand,
      topic: r.topic,
      skill: r.skill,
      method: r.method,
      pedagogyId: r.pedagogyId,
      builderId: r.builderId,
      visualRuleId: r.visualRuleId,
      preferredBlocks: r.preferredBlocks,
      visualGuidance: getVisualRule(r.visualRuleId).guidance,
      qualityPass: Boolean(r.builderId || r.preferredBlocks.length > 0),
    })),
  };

  const outDir = join(process.cwd(), "scripts/output");
  mkdirSync(outDir, { recursive: true });
  const jsonPath = join(outDir, "ks2-topic-audit.json");
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  const mdLines = [
    `# KS2 Maths Topic Audit`,
    ``,
    `Generated: ${report.generatedAt}`,
    ``,
    `- Skills audited: **${report.totals.skills}**`,
    `- With deterministic builder: **${report.totals.withBuilder}**`,
    `- Visual-contract only: **${report.totals.withoutBuilder}**`,
    ``,
    `| Year | Strand | Topic | Skill | Builder | Visual rule | Pass |`,
    `|---|---|---|---|---|---|---|`,
    ...report.rows.map(
      (r) =>
        `| ${r.yearGroup} | ${r.strand} | ${r.topic} | ${r.skill} | ${r.builderId || "—"} | ${r.visualRuleId} | ${r.qualityPass ? "yes" : "no"} |`,
    ),
  ];
  writeFileSync(join(outDir, "ks2-topic-audit.md"), mdLines.join("\n"));

  console.log(`Wrote ${jsonPath} (${rows.length} skills)`);
}

main();
