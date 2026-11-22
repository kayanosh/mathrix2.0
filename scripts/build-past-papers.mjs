#!/usr/bin/env node
/**
 * Builds lib/past-papers.generated.json: the list of GCSE Maths past papers
 * and mark schemes on the exam boards' OWN websites.
 *
 * Mathrix links to the boards' copies; it does not host them. The papers are
 * the boards' copyright, and their sites are where they are published for
 * students to use. So this script records where each paper is, and checks —
 * one request per file — that the link really answers with a PDF. A link that
 * does not is left out, and that series falls back to the board's own index
 * page. Nothing is downloaded.
 *
 * Run it again each year after results day, when a new series is released:
 *
 *     node scripts/build-past-papers.mjs
 *
 * AQA and Edexcel name their files to a pattern, so their links are worked
 * out and then checked. OCR's are read from its assessment page.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "lib", "past-papers.generated.json");
const AGENT = "Mozilla/5.0 (compatible; past-paper-link-check)";
const CONCURRENCY = 5;

/** True when the URL answers with a PDF. One HEAD request, no download. */
async function isPdf(url) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        method: "HEAD",
        redirect: "manual",
        headers: { "User-Agent": AGENT },
        signal: AbortSignal.timeout(20_000),
      });
      if (res.status === 200) return /pdf/i.test(res.headers.get("content-type") || "");
      if (res.status < 500) return false;
    } catch {
      /* retry once */
    }
  }
  return false;
}

/** The first candidate that is a PDF, or null. */
async function firstPdf(candidates) {
  for (const url of candidates) if (await isPdf(url)) return url;
  return null;
}

async function inBatches(jobs) {
  const results = new Array(jobs.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < jobs.length) {
        const i = next++;
        results[i] = await jobs[i]();
      }
    }),
  );
  return results;
}

const SERIES = [
  ...[2017, 2018, 2019, 2022, 2023, 2024, 2025].map((year) => ({ year, month: "June" })),
  ...[2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025].map((year) => ({ year, month: "November" })),
];
const TIERS = [
  { tier: "foundation", letter: "F" },
  { tier: "higher", letter: "H" },
];
const calculator = (paper) => (paper === 1 ? "Non-calculator" : "Calculator");

// ── AQA 8300 ────────────────────────────────────────────────────────────────
async function aqa() {
  const jobs = [];
  for (const { year, month } of SERIES) {
    const tag = `${month === "June" ? "JUN" : "NOV"}${String(year).slice(2)}`;
    const base = `https://filestore.aqa.org.uk/sample-papers-and-mark-schemes/${year}/${month.toLowerCase()}`;
    for (const { tier, letter } of TIERS) {
      for (const paper of [1, 2, 3]) {
        const code = `8300${paper}${letter}`;
        jobs.push(async () => {
          const questionPaper = await firstPdf([`${base}/AQA-${code}-QP-${tag}.PDF`]);
          if (!questionPaper) return null;
          const markScheme = await firstPdf([
            `${base}/AQA-${code}-MS-${tag}.PDF`,
            `${base}/AQA-${code}-W-MS-${tag}.PDF`,
          ]);
          return { board: "AQA", year, month, tier, paper, name: `Paper ${paper}`, note: calculator(paper), questionPaper, markScheme };
        });
      }
    }
  }
  const fromPattern = (await inBatches(jobs)).filter(Boolean);
  const have = new Set(fromPattern.map((p) => `${p.year}-${p.month}-${p.tier}-${p.paper}`));
  const listed = (await aqaListed()).filter((p) => !have.has(`${p.year}-${p.month}-${p.tier}-${p.paper}`));
  return [...fromPattern, ...listed];
}

/** Papers named on AQA's own resources page, each link checked. */
async function aqaListed() {
  const page =
    "https://www.aqa.org.uk/subjects/mathematics/gcse/mathematics-8300/assessment-resources?f.Resource+type%7C6=Question+papers&num_ranks=100";
  let html = "";
  try {
    const res = await fetch(page, { headers: { "User-Agent": AGENT }, signal: AbortSignal.timeout(40_000) });
    if (!res.ok) return [];
    html = (await res.text()).replaceAll('\\"', '"');
  } catch {
    return [];
  }
  const entry =
    /"_id":"sample-papers-and-mark-schemes\.(\d{4})\.(June|November)\.AQA-8300(\d)([FH])-(QP|MS|W-MS)-(?:JUN|NOV)\d\d_PDF"[\s\S]{0,900}?"url":"(https:\/\/[^"]+\.pdf)"/g;
  const found = new Map();
  for (const [, year, month, paper, letter, kind, url] of html.matchAll(entry)) {
    const key = `${year}-${month}-${letter}-${paper}`;
    const item = found.get(key) ?? {
      board: "AQA",
      year: Number(year),
      month,
      tier: letter === "F" ? "foundation" : "higher",
      paper: Number(paper),
      name: `Paper ${paper}`,
      note: calculator(Number(paper)),
      questionPaper: null,
      markScheme: null,
    };
    if (kind === "QP") item.questionPaper ??= url;
    else item.markScheme ??= url;
    found.set(key, item);
  }
  const jobs = [...found.values()].map((item) => async () => {
    if (!item.questionPaper || !(await isPdf(item.questionPaper))) return null;
    if (item.markScheme && !(await isPdf(item.markScheme))) item.markScheme = null;
    return item;
  });
  return (await inBatches(jobs)).filter(Boolean);
}

// ── Edexcel 1MA1 ────────────────────────────────────────────────────────────
// Files are named by date: the question paper by the day after the exam, the
// mark scheme by results day. Exam days below; a small window is tried around
// each because the offset is not perfectly regular.
const EDEXCEL_DATES = {
  "2017-June": { papers: ["2017-05-25", "2017-06-08", "2017-06-13"], results: "2017-08-24" },
  "2017-November": { papers: ["2017-11-02", "2017-11-06", "2017-11-08"], results: "2018-01-11" },
  "2018-June": { papers: ["2018-05-24", "2018-06-07", "2018-06-12"], results: "2018-08-23" },
  "2018-November": { papers: ["2018-11-06", "2018-11-08", "2018-11-12"], results: "2019-01-17" },
  "2019-June": { papers: ["2019-05-21", "2019-06-06", "2019-06-11"], results: "2019-08-22" },
  "2019-November": { papers: ["2019-11-05", "2019-11-07", "2019-11-11"], results: "2020-01-16" },
  "2020-November": { papers: ["2020-11-03", "2020-11-05", "2020-11-09"], results: "2021-01-14" },
  "2021-November": { papers: ["2021-11-02", "2021-11-04", "2021-11-08"], results: "2022-01-13" },
  "2022-June": { papers: ["2022-05-20", "2022-06-07", "2022-06-13"], results: "2022-08-25" },
  "2022-November": { papers: ["2022-11-01", "2022-11-03", "2022-11-07"], results: "2023-01-12" },
  "2023-June": { papers: ["2023-05-19", "2023-06-07", "2023-06-14"], results: "2023-08-24" },
  "2023-November": { papers: ["2023-11-08", "2023-11-10", "2023-11-13"], results: "2024-01-11" },
  "2024-June": { papers: ["2024-05-16", "2024-06-03", "2024-06-10"], results: "2024-08-22" },
  "2024-November": { papers: ["2024-11-06", "2024-11-08", "2024-11-11"], results: "2025-01-09" },
  "2025-June": { papers: ["2025-05-15", "2025-06-04", "2025-06-11"], results: "2025-08-21" },
};

function datesAround(iso, offsets) {
  return offsets.map((offset) => {
    const d = new Date(`${iso}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString().slice(0, 10).replace(/-/g, "");
  });
}

async function edexcel() {
  const base = "https://qualifications.pearson.com/content/dam/pdf/GCSE/mathematics/2015/exam-materials";
  const jobs = [];
  for (const { year, month } of SERIES) {
    const dates = EDEXCEL_DATES[`${year}-${month}`];
    if (!dates) continue;
    for (const { tier, letter } of TIERS) {
      for (const paper of [1, 2, 3]) {
        const code = `1MA1_${paper}${letter}`;
        jobs.push(async () => {
          // Two naming styles: 1MA1_1F_que_20190522.pdf (to 2021) and
          // 1ma1-1f-que-20220521.pdf (from 2022).
          const newCode = code.toLowerCase().replace("_", "-");
          const questionPaper = await firstPdf(
            datesAround(dates.papers[paper - 1], [1, 0, 2, 3, -1]).flatMap((d) =>
              year >= 2022
                ? [`${base}/${newCode}-que-${d}.pdf`, `${base}/${code}_que_${d}.pdf`]
                : [`${base}/${code}_que_${d}.pdf`, `${base}/${newCode}-que-${d}.pdf`],
            ),
          );
          if (!questionPaper) return null;
          const markScheme = await firstPdf(
            datesAround(dates.results, [0, -1, 1]).flatMap((d) =>
              year >= 2022
                ? [`${base}/${newCode}-rms-${d}.pdf`, `${base}/${code}_rms_${d}.pdf`]
                : [`${base}/${code}_rms_${d}.pdf`, `${base}/${code}_msc_${d}.pdf`, `${base}/${newCode}-rms-${d}.pdf`],
            ),
          );
          return { board: "Edexcel", year, month, tier, paper, name: `Paper ${paper}`, note: calculator(paper), questionPaper, markScheme };
        });
      }
    }
  }
  return (await inBatches(jobs)).filter(Boolean);
}

// ── OCR J560 ────────────────────────────────────────────────────────────────
// Foundation is papers 1–3, Higher is papers 4–6. Papers 2 and 5 are the
// non-calculator ones.
async function ocr() {
  const page = "https://www.ocr.org.uk/qualifications/gcse/mathematics-j560-from-2015/assessment/";
  const res = await fetch(page, { headers: { "User-Agent": AGENT }, signal: AbortSignal.timeout(40_000) });
  if (!res.ok) throw new Error(`OCR page answered ${res.status}`);
  const html = await res.text();

  const found = new Map();
  let series = null;
  const token = /<h[2-5][^>]*>([\s\S]*?)<\/h[2-5]>|<a[^>]*href="(\/Images\/[^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>/g;
  for (const match of html.matchAll(token)) {
    const text = (match[1] ?? match[3] ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (match[1] !== undefined) {
      const heading = text.match(/^(\d{4})\s*-\s*(June|November) series$/i);
      if (heading) series = { year: Number(heading[1]), month: heading[2][0].toUpperCase() + heading[2].slice(1).toLowerCase() };
      continue;
    }
    if (!series) continue;
    const link = text.match(/^(Question paper|Mark scheme)\s*-\s*Paper\s*(\d)$/i);
    if (!link) continue;
    const paper = Number(link[2]);
    if (paper < 1 || paper > 6) continue;
    const key = `${series.year}-${series.month}-${paper}`;
    const entry = found.get(key) ?? {
      board: "OCR",
      year: series.year,
      month: series.month,
      tier: paper <= 3 ? "foundation" : "higher",
      paper,
      name: `Paper ${paper}`,
      note: paper === 2 || paper === 5 ? "Non-calculator" : "Calculator",
      questionPaper: null,
      markScheme: null,
    };
    const url = `https://www.ocr.org.uk${match[2]}`;
    if (/question/i.test(link[1])) entry.questionPaper ??= url;
    else entry.markScheme ??= url;
    found.set(key, entry);
  }

  const jobs = [...found.values()].map((entry) => async () => {
    if (!entry.questionPaper || !(await isPdf(entry.questionPaper))) return null;
    if (entry.markScheme && !(await isPdf(entry.markScheme))) entry.markScheme = null;
    return entry;
  });
  return (await inBatches(jobs)).filter(Boolean);
}

const [aqaPapers, edexcelPapers, ocrPapers] = await Promise.all([aqa(), edexcel(), ocr()]);
const papers = [...aqaPapers, ...edexcelPapers, ...ocrPapers].sort(
  (a, b) =>
    a.board.localeCompare(b.board) ||
    b.year - a.year ||
    (a.month === b.month ? 0 : a.month === "November" ? -1 : 1) ||
    a.tier.localeCompare(b.tier) ||
    a.paper - b.paper,
);

writeFileSync(OUT, `${JSON.stringify({ checkedOn: new Date().toISOString().slice(0, 10), papers }, null, 1)}\n`);

for (const board of ["AQA", "Edexcel", "OCR"]) {
  const mine = papers.filter((p) => p.board === board);
  const series = new Set(mine.map((p) => `${p.month} ${p.year}`));
  console.log(
    `${board}: ${mine.length} papers across ${series.size} series, ${mine.filter((p) => p.markScheme).length} with a mark scheme`,
  );
}
console.log(`Wrote ${OUT}`);
