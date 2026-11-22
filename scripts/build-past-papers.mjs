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
  // Each file on the page is a record with its address followed by a title
  // such as "Mark scheme (Higher): Paper 2 Calculator - June 2025". Titles
  // for modified, large-print and insert versions do not match and are left.
  const record = /"url":"(https:\/\/[^"]+\.pdf)"[\s\S]{0,400}?"title":"([^"]+)"/g;
  const title = /^(Question paper|Mark scheme) \((Foundation|Higher)\): Paper ([123]) .*? - (June|November) (\d{4})$/;
  const found = new Map();
  for (const [, url, rawTitle] of html.matchAll(record)) {
    const parts = rawTitle.trim().match(title);
    if (!parts) continue;
    const [, kind, tierName, paper, month, year] = parts;
    const letter = tierName === "Foundation" ? "F" : "H";
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
    if (kind === "Question paper") item.questionPaper ??= url;
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
// Pearson names each file by a date that cannot be worked out (the question
// paper by roughly the day after the exam, the mark scheme by results day), in
// one of two spellings and one of two folders. So the dates are written down
// here, read from Pearson's own course-materials page, and every candidate
// spelling is tried until one answers.
//
// To add a series: open
//   https://qualifications.pearson.com/en/qualifications/edexcel-gcses/mathematics-2015.coursematerials.html
// choose "Exam materials", find the series, and copy the date out of the file
// names of Paper 1, 2 and 3 and of any mark scheme.
//
// Pearson publishes from June 2019. The 2017 and 2018 papers are no longer on
// its site, and the newest series stay locked to teachers for some months.
const EDEXCEL_FILES = {
  "2019-June": { papers: ["20190522", "20190607", "20190612"], markScheme: "20190822" },
  "2019-November": { papers: ["20200116", "20200116", "20200116"], markScheme: "20200116" },
  "2020-November": { papers: ["20201104", "20201106", "20201110"], markScheme: "20210114" },
  "2021-November": { papers: ["20211103", "20211105", "20211109"], markScheme: "20220113" },
  "2022-June": { papers: ["20220521", "20220608", "20220614"], markScheme: "20220825" },
  "2022-November": { papers: ["20221102", "20221104", "20221108"], markScheme: "20230112" },
  "2023-June": { papers: ["20230520", "20230608", "20230615"], markScheme: "20230824" },
  "2023-November": { papers: ["20231109", "20231111", "20231114"], markScheme: "20240111" },
  "2024-June": { papers: ["20240517", "20240604", "20240611"], markScheme: "20240822" },
  "2024-November": { papers: ["20241107", "20241109", "20241112"], markScheme: "20250109" },
  "2025-June": { papers: ["20250516", "20250605", "20250612"], markScheme: "20250821" },
};

const EDEXCEL_FOLDERS = [
  "https://qualifications.pearson.com/content/dam/pdf/GCSE/mathematics/2015/exam-materials",
  "https://qualifications.pearson.com/content/dam/pdf/GCSE/Mathematics/2015/Exam-materials",
];

/** Every way Pearson might have spelled one file. */
function edexcelCandidates(paper, letter, kinds, date) {
  const names = kinds.flatMap((kind) => [
    `1ma1-${paper}${letter.toLowerCase()}-${kind}-${date}.pdf`,
    `1MA1_${paper}${letter}_${kind}_${date}.pdf`,
  ]);
  return EDEXCEL_FOLDERS.flatMap((folder) => names.map((name) => `${folder}/${name}`));
}

async function edexcel() {
  const jobs = [];
  for (const { year, month } of SERIES) {
    const files = EDEXCEL_FILES[`${year}-${month}`];
    if (!files) continue;
    for (const { tier, letter } of TIERS) {
      for (const paper of [1, 2, 3]) {
        jobs.push(async () => {
          const questionPaper = await firstPdf(edexcelCandidates(paper, letter, ["que"], files.papers[paper - 1]));
          if (!questionPaper) return null;
          const markScheme = await firstPdf(edexcelCandidates(paper, letter, ["rms", "msc"], files.markScheme));
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
