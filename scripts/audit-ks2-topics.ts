/**
 * Audit KS2 curriculum teaching-engine subjects → taxonomy coverage.
 *
 * Usage: npx tsx scripts/audit-ks2-topics.ts
 * Writes: scripts/output/ks2-topic-audit.json (+ .md summary)
 */

import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { auditKS2CurriculumSubjects } from "../lib/ks2-taxonomy";
import { getVisualRule } from "../lib/ks2-visual-rules";

function main() {
  const rows = auditKS2CurriculumSubjects([
    "maths",
    "english",
    "science",
    "computing",
    "arabic",
  ]);
  const withBuilder = rows.filter((r) => r.builderId).length;
  const bySubject: Record<string, number> = {};
  for (const r of rows) {
    bySubject[r.subjectId] = (bySubject[r.subjectId] || 0) + 1;
  }
  const report = {
    generatedAt: new Date().toISOString(),
    totals: {
      skills: rows.length,
      withBuilder,
      withoutBuilder: rows.length - withBuilder,
      bySubject,
    },
    rows: rows.map((r) => ({
      route: r.route,
      yearGroup: r.yearGroup,
      subjectId: r.subjectId,
      strand: r.strand,
      topic: r.topic,
      skill: r.skill,
      method: r.method,
      pedagogyId: r.pedagogyId,
      builderId: r.builderId,
      visualRuleId: r.visualRuleId,
      preferredBlocks: r.preferredBlocks,
      visualGuidance: getVisualRule(r.visualRuleId).guidance,
      qualityPass: Boolean(r.method && r.preferredBlocks.length > 0),
    })),
  };

  const outDir = join(process.cwd(), "scripts/output");
  mkdirSync(outDir, { recursive: true });
  const jsonPath = join(outDir, "ks2-topic-audit.json");
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  const mdLines = [
    `# KS2 Curriculum Topic Audit (teaching engine)`,
    ``,
    `Generated: ${report.generatedAt}`,
    ``,
    `- Skills audited: **${report.totals.skills}**`,
    `- With deterministic builder: **${report.totals.withBuilder}**`,
    `- By subject: ${JSON.stringify(report.totals.bySubject)}`,
    ``,
    `| Year | Subject | Strand | Topic | Skill | Builder | Visual rule | Pass |`,
    `|---|---|---|---|---|---|---|---|`,
    ...report.rows.map(
      (r) =>
        `| ${r.yearGroup} | ${r.subjectId} | ${r.strand} | ${r.topic} | ${r.skill} | ${r.builderId || "—"} | ${r.visualRuleId} | ${r.qualityPass ? "yes" : "no"} |`,
    ),
  ];
  writeFileSync(join(outDir, "ks2-topic-audit.md"), mdLines.join("\n"));

  console.log(`Wrote ${jsonPath} (${rows.length} skills)`);
}

main();
