/**
 * KS2 content dataset — Year 5 & Year 6, across three sections:
 *   - curriculum   : National Curriculum KS2 (year-specific)
 *   - sats         : KS2 SATs preparation (end of Year 6)
 *   - eleven_plus  : 11+ preparation (Maths, English, Verbal & Non-Verbal Reasoning)
 *
 * Subjects covered: Maths, English, Verbal Reasoning (VR), Non-Verbal Reasoning (NVR).
 *
 * This dataset is based on the standard England National Curriculum and common
 * 11+ (GL / CEM) syllabuses. Adjust topics/subtopics here to match the school's
 * own scheme of work — everything in the UI is driven from this file.
 */

export type KS2Year = "Year 5" | "Year 6";
export type KS2Section = "curriculum" | "sats" | "eleven_plus";
export type KS2SubjectId = "maths" | "english" | "vr" | "nvr";

export interface KS2Topic {
  id: string;
  name: string;
  subtopics: string[];
}

export interface KS2SubjectContent {
  id: KS2SubjectId;
  name: string;
  icon: string;
  topics: KS2Topic[];
}

export const KS2_YEARS: KS2Year[] = ["Year 5", "Year 6"];

export const KS2_SECTIONS: { id: KS2Section; label: string; blurb: string }[] = [
  { id: "curriculum", label: "Curriculum", blurb: "National Curriculum KS2 by year group" },
  { id: "sats", label: "SATs", blurb: "Key Stage 2 SATs preparation" },
  { id: "eleven_plus", label: "11+", blurb: "Eleven plus entrance exam preparation" },
];

export const KS2_SUBJECT_META: Record<KS2SubjectId, { name: string; icon: string }> = {
  maths: { name: "Mathematics", icon: "📐" },
  english: { name: "English", icon: "📖" },
  vr: { name: "Verbal Reasoning", icon: "🧩" },
  nvr: { name: "Non-Verbal Reasoning", icon: "🔷" },
};

/* ─────────────────────────────────────────────────────────────────────────── */
/*  CURRICULUM — Year 5                                                          */
/* ─────────────────────────────────────────────────────────────────────────── */

const Y5_MATHS: KS2Topic[] = [
  {
    id: "y5-place-value",
    name: "Number & Place Value",
    subtopics: [
      "Read and write numbers to 1,000,000",
      "Place value of each digit",
      "Powers of 10",
      "Round to the nearest 10, 100, 1000, 10,000, 100,000",
      "Negative numbers in context",
      "Roman numerals to 1000 (M)",
    ],
  },
  {
    id: "y5-add-subtract",
    name: "Addition & Subtraction",
    subtopics: [
      "Column addition of numbers with more than 4 digits",
      "Column subtraction of numbers with more than 4 digits",
      "Mental addition and subtraction with larger numbers",
      "Rounding to check answers",
      "Multi-step word problems",
    ],
  },
  {
    id: "y5-multiply-divide",
    name: "Multiplication & Division",
    subtopics: [
      "Multiples, factors and factor pairs",
      "Prime numbers, square numbers and cube numbers",
      "Multiply and divide by 10, 100 and 1000",
      "Multiply up to 4-digit by a 1- or 2-digit number",
      "Divide up to 4-digit by a 1-digit number with remainders",
      "Multiplication and division word problems",
    ],
  },
  {
    id: "y5-fractions",
    name: "Fractions, Decimals & Percentages",
    subtopics: [
      "Equivalent fractions",
      "Improper fractions and mixed numbers",
      "Compare and order fractions",
      "Add and subtract fractions with the same denominator and multiples",
      "Multiply proper fractions by whole numbers",
      "Decimals up to 3 decimal places",
      "Recognise the percent symbol and simple percentages",
    ],
  },
  {
    id: "y5-measurement",
    name: "Measurement",
    subtopics: [
      "Convert between metric units",
      "Understand approximate metric/imperial equivalents",
      "Perimeter of composite rectilinear shapes",
      "Area of rectangles (and estimate irregular areas)",
      "Estimate volume and capacity",
      "Solve problems involving money and time",
    ],
  },
  {
    id: "y5-geometry-shape",
    name: "Geometry — Properties of Shapes",
    subtopics: [
      "Measure and draw angles in degrees",
      "Angles at a point, on a line and a turn",
      "Reflex, acute, obtuse and right angles",
      "Regular and irregular polygons",
      "3D shapes from 2D representations",
    ],
  },
  {
    id: "y5-geometry-position",
    name: "Geometry — Position & Direction",
    subtopics: [
      "Reflection of shapes",
      "Translation of shapes",
      "Describe position using coordinates (first quadrant)",
    ],
  },
  {
    id: "y5-statistics",
    name: "Statistics",
    subtopics: [
      "Complete, read and interpret line graphs",
      "Read and interpret tables and timetables",
    ],
  },
];

const Y5_ENGLISH: KS2Topic[] = [
  {
    id: "y5-reading",
    name: "Reading Comprehension",
    subtopics: [
      "Retrieve and record information",
      "Draw inferences and justify with evidence",
      "Predict from details stated and implied",
      "Summarise main ideas across paragraphs",
      "Identify how language and structure contribute to meaning",
    ],
  },
  {
    id: "y5-writing",
    name: "Writing Composition",
    subtopics: [
      "Plan writing for purpose and audience",
      "Organise paragraphs around a theme",
      "Use cohesive devices within and across paragraphs",
      "Describe settings, characters and atmosphere",
      "Use dialogue to convey character and advance action",
    ],
  },
  {
    id: "y5-grammar",
    name: "Grammar & Punctuation",
    subtopics: [
      "Modal verbs and adverbs (possibility)",
      "Relative clauses with who, which, where, when, whose, that",
      "Adverbials of time, place and number",
      "Brackets, dashes and commas for parenthesis",
      "Expanded noun phrases",
    ],
  },
  {
    id: "y5-spelling-vocab",
    name: "Spelling & Vocabulary",
    subtopics: [
      "Prefixes and suffixes",
      "Homophones and commonly confused words",
      "Silent letters",
      "Words ending in -ough",
      "Synonyms and antonyms",
    ],
  },
];

/* ─────────────────────────────────────────────────────────────────────────── */
/*  CURRICULUM — Year 6                                                          */
/* ─────────────────────────────────────────────────────────────────────────── */

const Y6_MATHS: KS2Topic[] = [
  {
    id: "y6-place-value",
    name: "Number & Place Value",
    subtopics: [
      "Read and write numbers to 10,000,000",
      "Round any whole number to a required degree of accuracy",
      "Use negative numbers and calculate intervals across zero",
    ],
  },
  {
    id: "y6-four-operations",
    name: "Four Operations",
    subtopics: [
      "Long multiplication of up to 4-digit by 2-digit",
      "Long division with whole-number and decimal remainders",
      "Order of operations (BIDMAS / BODMAS)",
      "Common factors, common multiples and prime numbers",
      "Multi-step problems choosing operations",
    ],
  },
  {
    id: "y6-fractions",
    name: "Fractions",
    subtopics: [
      "Simplify fractions",
      "Compare and order fractions",
      "Add and subtract fractions with different denominators",
      "Multiply pairs of proper fractions",
      "Divide proper fractions by whole numbers",
      "Convert fractions to decimals",
    ],
  },
  {
    id: "y6-decimals-percentages",
    name: "Decimals & Percentages",
    subtopics: [
      "Multiply and divide decimals",
      "Round decimals to a given number of places",
      "Find percentages of amounts",
      "Equivalence of fractions, decimals and percentages",
    ],
  },
  {
    id: "y6-ratio-proportion",
    name: "Ratio & Proportion",
    subtopics: [
      "Relative sizes and the ratio symbol",
      "Scale factors and scaling problems",
      "Unequal sharing using fractions and multiples",
      "Percentage comparison problems",
    ],
  },
  {
    id: "y6-algebra",
    name: "Algebra",
    subtopics: [
      "Use simple formulae",
      "Generate and describe linear number sequences",
      "Express missing number problems algebraically",
      "Find pairs of numbers that satisfy an equation with two unknowns",
    ],
  },
  {
    id: "y6-measurement",
    name: "Measurement",
    subtopics: [
      "Convert between metric and imperial units",
      "Area and perimeter of shapes",
      "Area of triangles and parallelograms",
      "Volume of cubes and cuboids",
    ],
  },
  {
    id: "y6-geometry-shape",
    name: "Geometry — Properties of Shapes",
    subtopics: [
      "Draw and measure angles accurately",
      "Build and recognise nets of 3D shapes",
      "Parts of a circle: radius, diameter, circumference",
      "Angles in triangles, quadrilaterals and polygons",
      "Vertically opposite angles",
    ],
  },
  {
    id: "y6-geometry-position",
    name: "Geometry — Position & Direction",
    subtopics: [
      "Coordinates in all four quadrants",
      "Translate and reflect shapes on a grid",
    ],
  },
  {
    id: "y6-statistics",
    name: "Statistics",
    subtopics: [
      "Interpret and construct pie charts",
      "Interpret and construct line graphs",
      "Calculate and interpret the mean as an average",
    ],
  },
];

const Y6_ENGLISH: KS2Topic[] = [
  {
    id: "y6-reading",
    name: "Reading Comprehension",
    subtopics: [
      "Inference with evidence from the text",
      "Identify and discuss author's intent and viewpoint",
      "Explore figurative and descriptive language",
      "Compare characters, settings and themes within and across texts",
      "Distinguish fact from opinion",
    ],
  },
  {
    id: "y6-writing",
    name: "Writing Composition",
    subtopics: [
      "Select formal and informal vocabulary and structures",
      "Cohesion across paragraphs and whole texts",
      "Use the passive voice for effect",
      "Integrate dialogue and description purposefully",
      "Proofread and edit for accuracy and impact",
    ],
  },
  {
    id: "y6-grammar",
    name: "Grammar & Punctuation",
    subtopics: [
      "Active and passive voice",
      "Subjunctive form in formal writing",
      "Subject and object of a sentence",
      "Semicolons, colons and dashes to mark clauses",
      "Bullet points and hyphens",
      "Synonyms and antonyms for formal vocabulary",
    ],
  },
  {
    id: "y6-spelling-vocab",
    name: "Spelling & Vocabulary",
    subtopics: [
      "Suffixes -cious / -tious and -able / -ible",
      "Homophones and near-homophones",
      "The Year 5/6 statutory spelling list",
      "Word families and etymology",
    ],
  },
];

/* ─────────────────────────────────────────────────────────────────────────── */
/*  SATs — Key Stage 2 (end of Year 6)                                          */
/* ─────────────────────────────────────────────────────────────────────────── */

const SATS_MATHS: KS2Topic[] = [
  {
    id: "sats-arithmetic",
    name: "Arithmetic (Paper 1)",
    subtopics: [
      "Mental and written four operations",
      "Long multiplication and long division",
      "Fractions of amounts and operations with fractions",
      "Decimals and percentages",
      "Order of operations (BIDMAS)",
    ],
  },
  {
    id: "sats-reasoning",
    name: "Reasoning (Papers 2 & 3)",
    subtopics: [
      "Multi-step word problems",
      "Measurement and unit conversion problems",
      "Geometry, angles and shape problems",
      "Statistics: tables, graphs and the mean",
      "Ratio, proportion and scaling",
      "Algebra and sequences",
    ],
  },
];

const SATS_ENGLISH: KS2Topic[] = [
  {
    id: "sats-reading",
    name: "Reading Paper",
    subtopics: [
      "Retrieval of stated information",
      "Inference and deduction with evidence",
      "Vocabulary in context",
      "Summarising and sequencing",
      "Authorial choices and meaning",
    ],
  },
  {
    id: "sats-gps-grammar",
    name: "Grammar & Punctuation (Paper 1)",
    subtopics: [
      "Word classes and functions",
      "Clauses, phrases and sentence types",
      "Verb tenses and consistency",
      "Punctuation: commas, apostrophes, colons, semicolons",
      "Standard English and formality",
    ],
  },
  {
    id: "sats-gps-spelling",
    name: "Spelling (Paper 2)",
    subtopics: [
      "Statutory Year 5/6 spelling words",
      "Prefixes and suffixes",
      "Homophones",
      "Tricky and commonly misspelt words",
    ],
  },
];

/* ─────────────────────────────────────────────────────────────────────────── */
/*  11+ — Entrance exam preparation                                             */
/* ─────────────────────────────────────────────────────────────────────────── */

const ELEVEN_MATHS: KS2Topic[] = [
  {
    id: "11-number",
    name: "Number & Calculation",
    subtopics: [
      "Place value and rounding",
      "Four operations with large numbers",
      "Order of operations (BODMAS)",
      "Factors, multiples and primes",
      "Negative numbers",
    ],
  },
  {
    id: "11-fdp",
    name: "Fractions, Decimals, Percentages & Ratio",
    subtopics: [
      "Equivalence and simplifying fractions",
      "Operations with fractions and decimals",
      "Percentages of amounts and change",
      "Ratio and proportion problems",
    ],
  },
  {
    id: "11-algebra",
    name: "Algebra & Sequences",
    subtopics: [
      "Function machines and missing numbers",
      "Simple formulae and substitution",
      "Number sequences and nth-term patterns",
    ],
  },
  {
    id: "11-measures",
    name: "Measures & Money",
    subtopics: [
      "Unit conversions",
      "Time, timetables and calendars",
      "Money and best-buy problems",
      "Speed, distance and time",
    ],
  },
  {
    id: "11-geometry",
    name: "Geometry & Measures",
    subtopics: [
      "Angles and angle rules",
      "Properties of 2D and 3D shapes",
      "Perimeter, area and volume",
      "Coordinates and transformations",
      "Symmetry",
    ],
  },
  {
    id: "11-data",
    name: "Statistics & Problem Solving",
    subtopics: [
      "Tables, charts and graphs",
      "Averages: mean, median, mode and range",
      "Multi-step logic and word problems",
    ],
  },
];

const ELEVEN_ENGLISH: KS2Topic[] = [
  {
    id: "11-comprehension",
    name: "Reading Comprehension",
    subtopics: [
      "Fiction passages",
      "Non-fiction passages",
      "Poetry comprehension",
      "Inference and evidence",
      "Vocabulary in context",
    ],
  },
  {
    id: "11-spag",
    name: "Spelling, Punctuation & Grammar",
    subtopics: [
      "Word classes and grammar",
      "Punctuation accuracy",
      "Spelling rules and patterns",
      "Sentence correction",
    ],
  },
  {
    id: "11-vocabulary",
    name: "Vocabulary",
    subtopics: [
      "Synonyms and antonyms",
      "Word meanings and definitions",
      "Cloze (gap-fill) passages",
      "Sentence completion",
    ],
  },
  {
    id: "11-writing",
    name: "Writing & Composition",
    subtopics: [
      "Creative and narrative writing",
      "Descriptive writing",
      "Persuasive and discursive writing",
      "Planning and structure",
    ],
  },
];

const ELEVEN_VR: KS2Topic[] = [
  {
    id: "vr-words-meaning",
    name: "Word Meanings",
    subtopics: [
      "Synonyms",
      "Antonyms",
      "Odd one out",
      "Word analogies",
      "Closest in meaning",
    ],
  },
  {
    id: "vr-letters-codes",
    name: "Letters & Codes",
    subtopics: [
      "Letter sequences",
      "Word codes and ciphers",
      "Missing letters",
      "Move a letter to make two words",
      "Alphabet position problems",
    ],
  },
  {
    id: "vr-word-building",
    name: "Word Building & Logic",
    subtopics: [
      "Hidden words",
      "Compound words",
      "Anagrams",
      "Make a word from given letters",
      "Word relationships and classification",
    ],
  },
  {
    id: "vr-numbers-logic",
    name: "Numbers & Logic",
    subtopics: [
      "Number sequences",
      "Number relationships and analogies",
      "Logic problems and deductions",
      "Sorting and matching information",
    ],
  },
];

const ELEVEN_NVR: KS2Topic[] = [
  {
    id: "nvr-series",
    name: "Series & Sequences",
    subtopics: [
      "Which figure comes next",
      "Complete the sequence",
      "Find the pattern",
    ],
  },
  {
    id: "nvr-analogies",
    name: "Analogies & Classification",
    subtopics: [
      "Figure analogies (A is to B as C is to ?)",
      "Odd one out",
      "Belongs to the group",
    ],
  },
  {
    id: "nvr-matrices",
    name: "Matrices & Grids",
    subtopics: [
      "Complete the matrix",
      "Find the missing tile",
      "Pattern grids",
    ],
  },
  {
    id: "nvr-spatial",
    name: "Spatial Reasoning",
    subtopics: [
      "Reflections and rotations",
      "Symmetry",
      "Nets and cubes (3D)",
      "Paper folding and hole punches",
      "Combining shapes",
    ],
  },
  {
    id: "nvr-codes",
    name: "Shape Codes",
    subtopics: [
      "Figure codes",
      "Apply the code to a new shape",
    ],
  },
];

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Assembled content map                                                        */
/* ─────────────────────────────────────────────────────────────────────────── */

function subject(id: KS2SubjectId, topics: KS2Topic[]): KS2SubjectContent {
  return { id, name: KS2_SUBJECT_META[id].name, icon: KS2_SUBJECT_META[id].icon, topics };
}

/**
 * Content keyed by section. For "curriculum" the content is per year group.
 * For "sats" and "eleven_plus" the same set applies regardless of year toggle.
 */
const CURRICULUM_BY_YEAR: Record<KS2Year, KS2SubjectContent[]> = {
  "Year 5": [subject("maths", Y5_MATHS), subject("english", Y5_ENGLISH)],
  "Year 6": [subject("maths", Y6_MATHS), subject("english", Y6_ENGLISH)],
};

const SATS_SUBJECTS: KS2SubjectContent[] = [
  subject("maths", SATS_MATHS),
  subject("english", SATS_ENGLISH),
];

const ELEVEN_PLUS_SUBJECTS: KS2SubjectContent[] = [
  subject("maths", ELEVEN_MATHS),
  subject("english", ELEVEN_ENGLISH),
  subject("vr", ELEVEN_VR),
  subject("nvr", ELEVEN_NVR),
];

/** Returns the subjects (with topics) for a given section and year. */
export function getKS2Content(section: KS2Section, year: KS2Year): KS2SubjectContent[] {
  switch (section) {
    case "curriculum":
      return CURRICULUM_BY_YEAR[year];
    case "sats":
      return SATS_SUBJECTS;
    case "eleven_plus":
      return ELEVEN_PLUS_SUBJECTS;
    default:
      return [];
  }
}

/** Whether a section's content varies by year group (only the curriculum does). */
export function sectionUsesYear(section: KS2Section): boolean {
  return section === "curriculum";
}

/**
 * Builds the canonical skill key used for progress tracking, matching the
 * "Topic — subtopic" convention used elsewhere (see lib/skills.ts).
 */
export function ks2SkillKey(topicName: string, subtopic: string): string {
  return `${topicName} — ${subtopic}`;
}
