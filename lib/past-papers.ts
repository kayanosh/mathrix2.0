/**
 * GCSE Maths past papers, as links to the exam boards' own copies.
 *
 * The list in past-papers.generated.json is written by
 * scripts/build-past-papers.mjs, which checks every link answers with a PDF.
 * Mathrix does not host the papers: they are the boards' copyright, and each
 * board publishes them on its own site for students to use.
 */
import generated from "./past-papers.generated.json";

export type PaperBoard = "AQA" | "Edexcel" | "OCR";
export type PaperTier = "foundation" | "higher";

export interface PastPaper {
  board: PaperBoard;
  year: number;
  month: "June" | "November";
  tier: PaperTier;
  /** The board's own paper number (OCR numbers Higher papers 4–6). */
  paper: number;
  name: string;
  /** "Calculator" or "Non-calculator". */
  note: string;
  questionPaper: string;
  markScheme: string | null;
}

export interface PaperSeries {
  board: PaperBoard;
  year: number;
  month: "June" | "November";
  label: string;
  papers: PastPaper[];
}

export interface BoardInfo {
  board: PaperBoard;
  /** The qualification's name and code, as the board writes it. */
  qualification: string;
  /** The board's own page listing every paper it has released. */
  indexUrl: string;
  indexLabel: string;
}

export const PAPER_BOARDS: BoardInfo[] = [
  {
    board: "AQA",
    qualification: "GCSE Mathematics (8300)",
    indexUrl: "https://www.aqa.org.uk/subjects/mathematics/gcse/mathematics-8300/assessment-resources",
    indexLabel: "All AQA papers on aqa.org.uk",
  },
  {
    board: "Edexcel",
    qualification: "GCSE (9–1) Mathematics (1MA1)",
    indexUrl:
      "https://qualifications.pearson.com/en/qualifications/edexcel-gcses/mathematics-2015.coursematerials.html#%2FfilterQuery=category:Pearson-UK:Category%2FExam-materials",
    indexLabel: "All Edexcel papers on pearson.com",
  },
  {
    board: "OCR",
    qualification: "GCSE (9–1) Mathematics (J560)",
    indexUrl: "https://www.ocr.org.uk/qualifications/gcse/mathematics-j560-from-2015/assessment/",
    indexLabel: "All OCR papers on ocr.org.uk",
  },
];

export const PAST_PAPERS = generated.papers as PastPaper[];

/** The date the links were last checked, as YYYY-MM-DD. */
export const PAPERS_CHECKED_ON: string = generated.checkedOn;

/**
 * Every exam series since the 9–1 GCSE began. There was no summer series in
 * 2020 or 2021. Used to say plainly which series a board has that are not
 * linked here, rather than leaving them out silently.
 */
export const ALL_SERIES: Array<{ year: number; month: "June" | "November" }> = [
  ...[2017, 2018, 2019, 2022, 2023, 2024, 2025].map((year) => ({ year, month: "June" as const })),
  ...[2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025].map((year) => ({ year, month: "November" as const })),
].sort((a, b) => b.year - a.year || (a.month === b.month ? 0 : a.month === "November" ? -1 : 1));

export interface PaperFilter {
  board?: PaperBoard | "all";
  tier?: PaperTier | "all";
  year?: number | "all";
}

/** Papers grouped into exam series, newest first. */
export function paperSeries(filter: PaperFilter = {}, papers: PastPaper[] = PAST_PAPERS): PaperSeries[] {
  const wanted = papers.filter(
    (p) =>
      (!filter.board || filter.board === "all" || p.board === filter.board) &&
      (!filter.tier || filter.tier === "all" || p.tier === filter.tier) &&
      (!filter.year || filter.year === "all" || p.year === filter.year),
  );
  const groups = new Map<string, PaperSeries>();
  for (const paper of wanted) {
    const key = `${paper.board}|${paper.year}|${paper.month}`;
    const group = groups.get(key) ?? {
      board: paper.board,
      year: paper.year,
      month: paper.month,
      label: `${paper.month} ${paper.year}`,
      papers: [],
    };
    group.papers.push(paper);
    groups.set(key, group);
  }
  return [...groups.values()]
    .map((group) => ({
      ...group,
      papers: [...group.papers].sort((a, b) => a.tier.localeCompare(b.tier) || a.paper - b.paper),
    }))
    .sort(
      (a, b) =>
        b.year - a.year ||
        (a.month === b.month ? 0 : a.month === "November" ? -1 : 1) ||
        a.board.localeCompare(b.board),
    );
}

/** The series a board has sat that are not linked here, newest first. */
export function seriesNotLinked(board: PaperBoard, papers: PastPaper[] = PAST_PAPERS): string[] {
  const have = new Set(papers.filter((p) => p.board === board).map((p) => `${p.month} ${p.year}`));
  return ALL_SERIES.map((s) => `${s.month} ${s.year}`).filter((label) => !have.has(label));
}

export function paperYears(papers: PastPaper[] = PAST_PAPERS): number[] {
  return [...new Set(papers.map((p) => p.year))].sort((a, b) => b - a);
}
