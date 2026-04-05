/**
 * Revision content structure derived from "The Maths E-Book of Notes and Examples".
 *
 * The PDF is image-based (scanned pages). We map each topic and subtopic
 * to its page range so the embedded viewer can jump straight to the right section.
 *
 * Page numbers are 1-indexed matching the PDF page numbers.
 */

export interface RevisionSubtopic {
  name: string;
  startPage: number;
  endPage: number;
  higherOnly?: boolean;
}

export interface RevisionTopic {
  id: string;
  name: string;
  icon: string;            // emoji
  colour: string;          // tailwind bg class
  startPage: number;
  endPage: number;
  subtopics: RevisionSubtopic[];
}

export const REVISION_TOPICS: RevisionTopic[] = [
  {
    id: "number",
    name: "Number",
    icon: "🔢",
    colour: "bg-blue-600",
    startPage: 3,
    endPage: 71,
    subtopics: [
      { name: "Types of Number", startPage: 4, endPage: 9 },
      { name: "Prime Factors, HCF and LCM", startPage: 10, endPage: 15 },
      { name: "BODMAS", startPage: 16, endPage: 19 },
      { name: "Rounding and Approximations", startPage: 20, endPage: 25 },
      { name: "Decimals", startPage: 26, endPage: 31 },
      { name: "Fractions", startPage: 32, endPage: 41 },
      { name: "Percentages", startPage: 42, endPage: 49 },
      { name: "Negative Numbers", startPage: 50, endPage: 53 },
      { name: "Surds", startPage: 60, endPage: 65, higherOnly: true },
      { name: "Standard Form", startPage: 66, endPage: 71 },
      { name: "Upper and Lower Bounds", startPage: 0, endPage: 0, higherOnly: true },
      { name: "Recurring Decimals to Fractions", startPage: 0, endPage: 0, higherOnly: true },
      { name: "Growth and Decay", startPage: 0, endPage: 0, higherOnly: true },
    ],
  },
  {
    id: "algebra",
    name: "Algebra",
    icon: "📐",
    colour: "bg-purple-600",
    startPage: 88,
    endPage: 193,
    subtopics: [
      { name: "Rules of Algebra", startPage: 89, endPage: 94 },
      { name: "Single Brackets", startPage: 95, endPage: 100 },
      { name: "Factorising", startPage: 101, endPage: 106 },
      { name: "Solving Equations", startPage: 107, endPage: 116 },
      { name: "Double Brackets", startPage: 117, endPage: 122 },
      { name: "More Factorising — Quadratics", startPage: 123, endPage: 130 },
      { name: "Solving Quadratic Equations", startPage: 131, endPage: 138, higherOnly: true },
      { name: "Simultaneous Equations", startPage: 139, endPage: 146, higherOnly: true },
      { name: "Inequalities", startPage: 147, endPage: 154 },
      { name: "Indices", startPage: 155, endPage: 160 },
      { name: "Sequences", startPage: 54, endPage: 59 },
      { name: "Straight Line Graphs", startPage: 161, endPage: 170 },
      { name: "Quadratic and Cubic Graphs", startPage: 171, endPage: 178, higherOnly: true },
      { name: "Shapes of Graphs", startPage: 179, endPage: 184, higherOnly: true },
      { name: "Travel Graphs and Story Graphs", startPage: 185, endPage: 193 },
      { name: "Functions — Composite and Inverse", startPage: 0, endPage: 0, higherOnly: true },
      { name: "Iteration", startPage: 0, endPage: 0, higherOnly: true },
      { name: "Algebraic Proof", startPage: 0, endPage: 0, higherOnly: true },
      { name: "Completing the Square", startPage: 0, endPage: 0, higherOnly: true },
      { name: "Algebraic Fractions", startPage: 0, endPage: 0, higherOnly: true },
      { name: "Equation of a Circle", startPage: 0, endPage: 0, higherOnly: true },
    ],
  },
  {
    id: "ratio",
    name: "Ratio, Proportion & Rates of Change",
    icon: "⚖️",
    colour: "bg-orange-600",
    startPage: 72,
    endPage: 87,
    subtopics: [
      { name: "Ratio", startPage: 72, endPage: 79 },
      { name: "Proportion", startPage: 80, endPage: 87 },
      { name: "Direct and Inverse Proportion", startPage: 0, endPage: 0, higherOnly: true },
      { name: "Speed, Distance and Time", startPage: 0, endPage: 0 },
      { name: "Density and Pressure", startPage: 0, endPage: 0, higherOnly: true },
      { name: "Compound Measures", startPage: 0, endPage: 0 },
      { name: "Scale Factors", startPage: 0, endPage: 0 },
    ],
  },
  {
    id: "geometry",
    name: "Geometry & Measures",
    icon: "📏",
    colour: "bg-emerald-600",
    startPage: 194,
    endPage: 310,
    subtopics: [
      { name: "Angle Facts", startPage: 195, endPage: 204 },
      { name: "Polygons", startPage: 205, endPage: 212 },
      { name: "Circle Theorems", startPage: 213, endPage: 222, higherOnly: true },
      { name: "Loci", startPage: 223, endPage: 228 },
      { name: "Area", startPage: 229, endPage: 240 },
      { name: "Volume", startPage: 241, endPage: 250 },
      { name: "Dimensions", startPage: 251, endPage: 254 },
      { name: "Constructions", startPage: 255, endPage: 262 },
      { name: "Vectors", startPage: 263, endPage: 270, higherOnly: true },
      { name: "Transformations", startPage: 271, endPage: 282 },
      { name: "Similarity and Congruency", startPage: 283, endPage: 290 },
      { name: "Pythagoras' Theorem", startPage: 291, endPage: 296 },
      { name: "Sin, Cos, Tan", startPage: 297, endPage: 304 },
      { name: "3D Trigonometry", startPage: 305, endPage: 307, higherOnly: true },
      { name: "Sine and Cosine Rules", startPage: 308, endPage: 310, higherOnly: true },
      { name: "Geometric Proof", startPage: 0, endPage: 0, higherOnly: true },
      { name: "Bearings", startPage: 0, endPage: 0 },
      { name: "Arc Length and Sector Area", startPage: 0, endPage: 0, higherOnly: true },
      { name: "Surface Area — Cones, Spheres and Frustums", startPage: 0, endPage: 0, higherOnly: true },
    ],
  },
  {
    id: "probability",
    name: "Probability",
    icon: "🎲",
    colour: "bg-rose-600",
    startPage: 312,
    endPage: 329,
    subtopics: [
      { name: "Probability", startPage: 312, endPage: 321 },
      { name: "Tree Diagrams", startPage: 322, endPage: 329 },
      { name: "Venn Diagrams and Set Notation", startPage: 0, endPage: 0, higherOnly: true },
      { name: "Conditional Probability", startPage: 0, endPage: 0, higherOnly: true },
      { name: "Relative Frequency", startPage: 0, endPage: 0 },
    ],
  },
  {
    id: "statistics",
    name: "Statistics",
    icon: "📊",
    colour: "bg-amber-600",
    startPage: 330,
    endPage: 374,
    subtopics: [
      { name: "Averages", startPage: 330, endPage: 337 },
      { name: "Cumulative Frequency and Box Plots", startPage: 338, endPage: 347, higherOnly: true },
      { name: "Pie Charts", startPage: 348, endPage: 353 },
      { name: "Stem and Leaf Diagrams", startPage: 354, endPage: 359 },
      { name: "Bar Charts and Histograms", startPage: 360, endPage: 367, higherOnly: true },
      { name: "Scattergraphs", startPage: 368, endPage: 374 },
      { name: "Sampling Methods", startPage: 0, endPage: 0 },
    ],
  },
];

/** Total pages in the PDF */
export const TOTAL_PAGES = 374;

/** Path to the PDF in the public directory */
export const PDF_PATH = "/the-maths-ebook.pdf";
