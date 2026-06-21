/**
 * KS2 content dataset — Year 5 & Year 6, across three sections:
 *   - curriculum   : National Curriculum KS2 (year-specific)
 *   - sats         : KS2 SATs preparation (end of Year 6)
 *   - eleven_plus  : 11+ preparation (Maths, English, Verbal & Non-Verbal Reasoning)
 *
 * Subjects covered: Maths, English, Verbal Reasoning (VR), Non-Verbal Reasoning (NVR).
 *
 * The "curriculum" content mirrors Barnet Hill Academy's Year 5 & Year 6
 * Long Term Plans (2025-2026) for Maths and English. The SATs and 11+ sections
 * follow the standard KS2 SATs structure and common 11+ (GL / CEM) syllabuses.
 * Everything in the UI is driven from this file — edit here to adjust content.
 */

export type KS2Year = "Year 5" | "Year 6";
export type KS2Section = "curriculum" | "sats" | "eleven_plus";
export type KS2Term = "Autumn" | "Spring" | "Summer";
export type KS2SubjectId = "maths" | "english" | "science" | "arabic" | "computing" | "vr" | "nvr";

export interface KS2Topic {
  id: string;
  name: string;
  subtopics: string[];
  /** School term this unit is taught in (curriculum only; year-long units omit it). */
  term?: KS2Term;
}

export interface KS2SubjectContent {
  id: KS2SubjectId;
  name: string;
  icon: string;
  topics: KS2Topic[];
}

export const KS2_YEARS: KS2Year[] = ["Year 5", "Year 6"];

export const KS2_TERMS: KS2Term[] = ["Autumn", "Spring", "Summer"];

export const KS2_SECTIONS: { id: KS2Section; label: string; blurb: string }[] = [
  { id: "curriculum", label: "Curriculum", blurb: "National Curriculum KS2 by year group" },
  { id: "sats", label: "SATs", blurb: "Key Stage 2 SATs preparation" },
  { id: "eleven_plus", label: "11+", blurb: "Eleven plus entrance exam preparation" },
];

export const KS2_SUBJECT_META: Record<KS2SubjectId, { name: string; icon: string }> = {
  maths: { name: "Mathematics", icon: "📐" },
  english: { name: "English", icon: "📖" },
  science: { name: "Science", icon: "🔬" },
  arabic: { name: "Arabic", icon: "🔤" },
  computing: { name: "Computing", icon: "💻" },
  vr: { name: "Verbal Reasoning", icon: "🧩" },
  nvr: { name: "Non-Verbal Reasoning", icon: "🔷" },
};

/* ─────────────────────────────────────────────────────────────────────────── */
/*  CURRICULUM — Year 5                                                          */
/* ─────────────────────────────────────────────────────────────────────────── */

const Y5_MATHS: KS2Topic[] = [
  {
    id: "y5m-place-value",
    name: "Place Value",
    term: "Autumn",
    subtopics: [
      "Numbers to 10,000 and 100,000",
      "Numbers to 1,000,000",
      "Place value of each digit",
      "Powers of 10",
      "10, 100, 1000, 10,000 and 100,000 more or less",
      "Compare and order numbers to 1,000,000",
      "Round to the nearest 10, 100, 1000, 10,000 and 100,000",
      "Roman numerals to 1000",
    ],
  },
  {
    id: "y5m-add-subtract",
    name: "Addition & Subtraction",
    term: "Autumn",
    subtopics: [
      "Mental addition and subtraction",
      "Column addition of numbers with more than 4 digits",
      "Column subtraction of numbers with more than 4 digits",
      "Round to check answers",
      "Inverse operations",
      "Multi-step addition and subtraction problems",
    ],
  },
  {
    id: "y5m-mult-div-a",
    name: "Multiplication & Division A",
    term: "Autumn",
    subtopics: [
      "Multiples",
      "Factors and factor pairs",
      "Common factors",
      "Prime numbers",
      "Square numbers",
      "Cube numbers",
      "Multiply by 10, 100 and 1000",
      "Divide by 10, 100 and 1000",
    ],
  },
  {
    id: "y5m-fractions",
    name: "Fractions",
    term: "Autumn",
    subtopics: [
      "Equivalent fractions",
      "Improper fractions to mixed numbers",
      "Mixed numbers to improper fractions",
      "Compare and order fractions",
      "Add and subtract fractions",
      "Add and subtract mixed numbers",
      "Multiply fractions by integers",
      "Fraction of an amount",
    ],
  },
  {
    id: "y5m-mult-div-b",
    name: "Multiplication & Division B",
    term: "Spring",
    subtopics: [
      "Multiply up to 4-digit by 1-digit",
      "Multiply 2-digit by 2-digit",
      "Multiply 3-digit and 4-digit by 2-digit",
      "Divide 4-digit by 1-digit",
      "Division with remainders",
      "Multiplication and division problems",
    ],
  },
  {
    id: "y5m-decimals-percentages",
    name: "Decimals & Percentages",
    term: "Spring",
    subtopics: [
      "Decimals up to 2 decimal places",
      "Thousandths",
      "Compare and order decimals",
      "Round decimals",
      "Understand percentages",
      "Percentages as fractions and decimals",
      "Equivalent fractions, decimals and percentages",
    ],
  },
  {
    id: "y5m-perimeter-area",
    name: "Perimeter & Area",
    term: "Spring",
    subtopics: [
      "Perimeter of rectangles",
      "Perimeter of rectilinear shapes",
      "Area of rectangles",
      "Area of compound shapes",
      "Estimate area of irregular shapes",
    ],
  },
  {
    id: "y5m-statistics",
    name: "Statistics",
    term: "Spring",
    subtopics: [
      "Read and interpret line graphs",
      "Draw line graphs",
      "Read and interpret tables",
      "Two-way tables",
      "Timetables",
    ],
  },
  {
    id: "y5m-shape",
    name: "Shape",
    term: "Spring",
    subtopics: [
      "Measure angles in degrees",
      "Draw angles",
      "Angles on a straight line",
      "Angles around a point",
      "Calculate missing angles",
      "Regular and irregular polygons",
      "3D shapes",
    ],
  },
  {
    id: "y5m-position-direction",
    name: "Position & Direction",
    term: "Summer",
    subtopics: [
      "Read and plot coordinates (first quadrant)",
      "Translation",
      "Reflection",
      "Lines of symmetry",
    ],
  },
  {
    id: "y5m-decimals",
    name: "Decimals",
    term: "Summer",
    subtopics: [
      "Add and subtract decimals",
      "Decimal sequences",
      "Multiply decimals by 10, 100 and 1000",
      "Divide decimals by 10, 100 and 1000",
    ],
  },
  {
    id: "y5m-negative-numbers",
    name: "Negative Numbers",
    term: "Summer",
    subtopics: [
      "Understand negative numbers",
      "Count through zero",
      "Compare and order negative numbers",
      "Negative number problems",
    ],
  },
  {
    id: "y5m-converting-units",
    name: "Converting Units",
    term: "Summer",
    subtopics: [
      "Metric units of length, mass and capacity",
      "Convert metric units",
      "Imperial units",
      "Units of time",
      "Timetables and time problems",
    ],
  },
  {
    id: "y5m-volume",
    name: "Volume",
    term: "Summer",
    subtopics: [
      "What is volume?",
      "Compare volume",
      "Estimate volume",
      "Estimate capacity",
    ],
  },
];

const Y5_ENGLISH: KS2Topic[] = [
  {
    id: "y5e-read-autumn",
    name: "Reading — Autumn",
    term: "Autumn",
    subtopics: ["Stay Where You Are and Then Leave", "Kensuke's Kingdom"],
  },
  {
    id: "y5e-write-autumn",
    name: "Writing — Autumn",
    term: "Autumn",
    subtopics: [
      "Classic Fiction",
      "Letter Writing",
      "Stories with a Scary Setting",
      "Explanation Texts (with complex diagrams)",
      "Classical Poetry",
    ],
  },
  {
    id: "y5e-read-spring",
    name: "Reading — Spring",
    term: "Spring",
    subtopics: ["Beetle Boy", "Street Child"],
  },
  {
    id: "y5e-write-spring",
    name: "Writing — Spring",
    term: "Spring",
    subtopics: [
      "Stories with Mystery Settings",
      "Recounts: Biographies & Autobiographies",
      "Playscripts",
      "Drama and Roleplay",
      "Stories with a Fantasy Setting",
      "Poetry — Haiku",
    ],
  },
  {
    id: "y5e-read-summer",
    name: "Reading — Summer",
    term: "Summer",
    subtopics: ["Skellig", "Tom's Midnight Garden"],
  },
  {
    id: "y5e-write-summer",
    name: "Writing — Summer",
    term: "Summer",
    subtopics: [
      "Instructions",
      "Non-Chronological Reports (Posters)",
      "Poetry — Free Verse",
      "Legends",
      "Newspaper Reports",
      "Persuasive Texts — Advertisements (Leaflets)",
      "Discussion Texts",
    ],
  },
  {
    id: "y5e-gps",
    name: "Grammar, Punctuation & Spelling",
    subtopics: [
      "Relative clauses",
      "Modal verbs and adverbs",
      "Brackets, dashes and commas for parenthesis",
      "Adverbials of time, place and number",
      "Prefixes and suffixes",
      "Homophones",
      "Year 5/6 statutory spelling words",
    ],
  },
];

const Y5_SCIENCE: KS2Topic[] = [
  {
    id: "y5s-forces",
    name: "Forces — Unbalanced Forces",
    term: "Autumn",
    subtopics: [
      "Gravity and the force of gravity on Earth",
      "Air resistance",
      "Water resistance",
      "Friction",
      "Mechanisms: levers, pulleys and gears",
    ],
  },
  {
    id: "y5s-earth-space",
    name: "Forces — Earth and Space",
    term: "Autumn",
    subtopics: [
      "The Sun, Earth and Moon as spherical bodies",
      "Earth's rotation: day and night",
      "The Moon's orbit of the Earth",
      "The planets of the solar system",
    ],
  },
  {
    id: "y5s-materials-properties",
    name: "Materials — Properties and Changes",
    term: "Spring",
    subtopics: [
      "Compare and group everyday materials",
      "Solubility and dissolving",
      "Thermal and electrical conductivity",
      "Hardness, transparency and magnetism",
      "Reversible changes",
    ],
  },
  {
    id: "y5s-materials-mixtures",
    name: "Materials — Mixtures and Separation",
    term: "Spring",
    subtopics: [
      "Separating mixtures: filtering, sieving and evaporating",
      "Dissolving and recovering solutes",
      "Irreversible changes and new materials",
    ],
  },
  {
    id: "y5s-life-cycles",
    name: "Living Things — Life Cycles and Reproduction",
    term: "Summer",
    subtopics: [
      "Life cycles of mammals, amphibians, insects and birds",
      "The life cycle of a plant",
      "Reproduction in plants (pollination)",
      "Reproduction in animals",
    ],
  },
  {
    id: "y5s-human-timeline",
    name: "Animals Including Humans — Human Timeline & Puberty",
    term: "Summer",
    subtopics: [
      "Changes from birth to old age",
      "Stages of human development",
      "Changes during puberty",
      "Gestation periods of animals",
    ],
  },
  {
    id: "y5s-making-connections",
    name: "Making Connections (Working Scientifically)",
    term: "Summer",
    subtopics: [
      "Planning a fair test",
      "Taking measurements and recording results",
      "Drawing conclusions from evidence",
    ],
  },
];

const Y5_ARABIC: KS2Topic[] = [
  {
    id: "y5a-daily-routine",
    name: "My Daily Routine (Morning & Evening)",
    term: "Autumn",
    subtopics: [
      "Morning routine vocabulary",
      "Evening routine vocabulary",
      "Telling the time",
      "Describing daily activities",
    ],
  },
  {
    id: "y5a-free-time",
    name: "Entertainment & Free Time",
    term: "Autumn",
    subtopics: [
      "Hobbies vocabulary",
      "Free time activities",
      "Expressing likes and dislikes",
    ],
  },
  {
    id: "y5a-school",
    name: "Life at School",
    term: "Spring",
    subtopics: [
      "School subjects",
      "Classroom objects",
      "Phrases for the school day",
    ],
  },
  {
    id: "y5a-achievements",
    name: "Achievements",
    term: "Spring",
    subtopics: [
      "Talking about accomplishments",
      "Introduction to the past tense",
    ],
  },
  {
    id: "y5a-celebrations",
    name: "Celebrations",
    term: "Summer",
    subtopics: [
      "Islamic celebrations vocabulary",
      "Describing events",
    ],
  },
  {
    id: "y5a-feelings",
    name: "Thoughts & Feelings",
    term: "Summer",
    subtopics: [
      "Emotions vocabulary",
      "Expressing opinions",
    ],
  },
];

const Y5_COMPUTING: KS2Topic[] = [
  {
    id: "y5c-systems-searching",
    name: "Computing Systems & Networks — Systems and Searching",
    term: "Autumn",
    subtopics: [
      "How computers connect in a network",
      "The internet and the World Wide Web",
      "Searching the web effectively",
      "Evaluating search results and spotting reliable sources",
      "Online safety when searching and sharing",
      "Communicating respectfully online",
    ],
  },
  {
    id: "y5c-video-production",
    name: "Creating Media — Video Production",
    term: "Autumn",
    subtopics: [
      "What makes a good video",
      "Planning and storyboarding",
      "Filming techniques (camera angles, lighting, sound)",
      "Editing clips together",
      "Adding titles, transitions and music",
      "Reviewing and improving the final video",
    ],
  },
  {
    id: "y5c-programming-selection",
    name: "Programming B — Selection in Quizzes",
    term: "Spring",
    subtopics: [
      "What selection means (if… then… else)",
      "Conditions that can be true or false",
      "Designing a quiz in Scratch",
      "Using selection to score answers",
      "Testing and debugging the quiz program",
      "Evaluating and improving the project",
    ],
  },
  {
    id: "y5c-flat-file-databases",
    name: "Data & Information — Flat-File Databases",
    term: "Spring",
    subtopics: [
      "Records, fields and data types",
      "Entering and organising data",
      "Sorting and filtering records",
      "Querying data to answer questions",
      "Presenting findings clearly",
      "Evaluating the usefulness of data",
    ],
  },
  {
    id: "y5c-vector-graphics",
    name: "Creating Media — Introduction to Vector Graphics",
    term: "Summer",
    subtopics: [
      "Vector graphics vs raster images",
      "Drawing tools and shapes",
      "Layers and grouping objects",
      "Planning a logo or poster design",
      "Building the design step by step",
      "Evaluating and refining the final graphic",
    ],
  },
];

/* ─────────────────────────────────────────────────────────────────────────── */
/*  CURRICULUM — Year 6                                                          */
/* ─────────────────────────────────────────────────────────────────────────── */

const Y6_MATHS: KS2Topic[] = [
  {
    id: "y6m-place-value",
    name: "Place Value",
    term: "Autumn",
    subtopics: [
      "Numbers to 1,000,000",
      "Numbers to 10,000,000",
      "Read, write and compare numbers to 10,000,000",
      "Place value of each digit",
      "Round any number",
      "Negative numbers",
    ],
  },
  {
    id: "y6m-add-subtract",
    name: "Addition & Subtraction",
    term: "Autumn",
    subtopics: [
      "Add and subtract integers",
      "Common factors and common multiples",
      "Prime numbers",
      "Mental calculations and estimation",
      "Reason from known facts",
      "Multi-step problems",
    ],
  },
  {
    id: "y6m-mult-div",
    name: "Multiplication & Division",
    term: "Autumn",
    subtopics: [
      "Long multiplication",
      "Short division",
      "Long division",
      "Division with remainders",
      "Order of operations (BIDMAS)",
      "Multiplication and division problems",
    ],
  },
  {
    id: "y6m-fractions",
    name: "Fractions",
    term: "Autumn",
    subtopics: [
      "Simplify fractions",
      "Compare and order fractions",
      "Add and subtract fractions",
      "Add and subtract mixed numbers",
      "Multiply fractions",
      "Divide fractions by integers",
      "Fraction of an amount",
    ],
  },
  {
    id: "y6m-converting-units",
    name: "Converting Units",
    term: "Autumn",
    subtopics: [
      "Metric measures",
      "Convert metric measures",
      "Miles and kilometres",
      "Imperial measures",
    ],
  },
  {
    id: "y6m-ratio",
    name: "Ratio",
    term: "Spring",
    subtopics: [
      "Ratio and the ratio symbol",
      "Calculate ratio",
      "Scale factors and scale drawings",
      "Use ratio to compare",
      "Proportion problems",
      "Recipes",
    ],
  },
  {
    id: "y6m-algebra",
    name: "Algebra",
    term: "Spring",
    subtopics: [
      "One-step and two-step function machines",
      "Form expressions",
      "Substitution",
      "Formulae",
      "Form and solve equations",
      "Linear number sequences",
      "Find pairs of values",
    ],
  },
  {
    id: "y6m-decimals",
    name: "Decimals",
    term: "Spring",
    subtopics: [
      "Decimals as fractions",
      "Multiply and divide by 10, 100 and 1000",
      "Multiply decimals",
      "Divide decimals",
      "Decimals and fractions",
    ],
  },
  {
    id: "y6m-fdp",
    name: "Fractions, Decimals & Percentages",
    term: "Spring",
    subtopics: [
      "Equivalent fractions, decimals and percentages",
      "Order fractions, decimals and percentages",
      "Percentage of an amount",
      "Percentages — missing values",
    ],
  },
  {
    id: "y6m-area-perimeter-volume",
    name: "Area, Perimeter & Volume",
    term: "Spring",
    subtopics: [
      "Area and perimeter",
      "Area of triangles",
      "Area of parallelograms",
      "Volume of cuboids",
      "Volume of shapes",
    ],
  },
  {
    id: "y6m-statistics",
    name: "Statistics",
    term: "Spring",
    subtopics: [
      "Read and interpret line graphs",
      "Draw line graphs",
      "Read and interpret pie charts",
      "Pie charts with percentages",
      "The mean",
    ],
  },
  {
    id: "y6m-shape",
    name: "Shape",
    term: "Summer",
    subtopics: [
      "Measure and classify angles",
      "Calculate angles",
      "Vertically opposite angles",
      "Angles in a triangle",
      "Angles in quadrilaterals and polygons",
      "Draw shapes accurately",
      "Nets of 3D shapes",
      "Parts of a circle",
    ],
  },
  {
    id: "y6m-position-direction",
    name: "Position & Direction",
    term: "Summer",
    subtopics: [
      "Coordinates in four quadrants",
      "Translation",
      "Reflection",
    ],
  },
  {
    id: "y6m-problem-solving",
    name: "Themed Projects, Consolidation & Problem Solving",
    term: "Summer",
    subtopics: [
      "Multi-step problem solving",
      "Reasoning and investigations",
      "SATs revision and consolidation",
    ],
  },
];

const Y6_ENGLISH: KS2Topic[] = [
  {
    id: "y6e-read-autumn",
    name: "Reading — Autumn",
    term: "Autumn",
    subtopics: ["Rose Blanche", "Holes"],
  },
  {
    id: "y6e-write-autumn",
    name: "Writing — Autumn",
    term: "Autumn",
    subtopics: [
      "Informal Letter",
      "Diary Entry",
      "Poetry — War Poems",
      "Fiction Genres",
      "Poetry — Cinquain",
      "Persuasion",
      "Newspaper Report",
      "Legends",
    ],
  },
  {
    id: "y6e-read-spring",
    name: "Reading — Spring",
    term: "Spring",
    subtopics: ["Shackleton's Journey", "How to Live Forever?", "Macbeth"],
  },
  {
    id: "y6e-write-spring",
    name: "Writing — Spring",
    term: "Spring",
    subtopics: [
      "Instructions",
      "Recounts",
      "Drama and Roleplay",
      "Explanation",
      "Adventure Story",
      "Balanced/Unbalanced Arguments",
    ],
  },
  {
    id: "y6e-read-summer",
    name: "Reading — Summer",
    term: "Summer",
    subtopics: ["The Other Side of Truth"],
  },
  {
    id: "y6e-write-summer",
    name: "Writing — Summer",
    term: "Summer",
    subtopics: [
      "Stories with Flashbacks",
      "Character Viewpoint Narrative",
      "Autobiography",
      "Formal Letter",
      "Poetry — Free Verse",
      "Stories from Other Cultures",
    ],
  },
  {
    id: "y6e-gps",
    name: "Grammar, Punctuation & Spelling",
    subtopics: [
      "Active and passive voice",
      "Subjunctive form",
      "Semicolons, colons and dashes",
      "Hyphens, bullet points and ellipsis",
      "Synonyms and antonyms",
      "Year 5/6 statutory spelling words",
    ],
  },
];

const Y6_SCIENCE: KS2Topic[] = [
  {
    id: "y6s-classification",
    name: "Living Things — Classification",
    term: "Autumn",
    subtopics: [
      "Classifying living things into broad groups",
      "Micro-organisms, plants and animals",
      "Classification keys",
      "Comparing big and small organisms",
    ],
  },
  {
    id: "y6s-evolution",
    name: "Evolution and Inheritance",
    term: "Autumn",
    subtopics: [
      "Inheritance and offspring variation",
      "Adaptation to environments",
      "Natural selection and evolution",
      "Fossils as evidence",
    ],
  },
  {
    id: "y6s-circulation",
    name: "Animals Including Humans — Circulation and Health",
    term: "Spring",
    subtopics: [
      "The heart and circulatory system",
      "Blood and blood vessels",
      "Diet, exercise and lifestyle",
      "Impact of drugs and alcohol on the body",
    ],
  },
  {
    id: "y6s-electricity",
    name: "Energy — Circuits, Batteries and Switches",
    term: "Spring",
    subtopics: [
      "Components of a circuit",
      "Voltage and the brightness of bulbs",
      "Circuit symbols and diagrams",
      "Switches and how they work",
    ],
  },
  {
    id: "y6s-light",
    name: "Light and Reflection",
    term: "Summer",
    subtopics: [
      "How light travels",
      "Reflection",
      "How we see objects",
      "Shadows and the shape of objects",
    ],
  },
  {
    id: "y6s-fossils",
    name: "Fossils",
    term: "Summer",
    subtopics: [
      "How fossils are formed",
      "What fossils tell us about the past",
      "The work of Mary Anning",
    ],
  },
  {
    id: "y6s-making-connections",
    name: "Making Connections (Working Scientifically)",
    term: "Summer",
    subtopics: [
      "Planning enquiries and fair tests",
      "Recording and presenting data",
      "Drawing evidence-based conclusions",
    ],
  },
];

const Y6_ARABIC: KS2Topic[] = [
  {
    id: "y6a-healthy-lifestyle",
    name: "Healthy Lifestyle (Healthy Habits)",
    subtopics: [
      "Healthy habits vocabulary",
      "Exercise and wellbeing",
      "Giving advice",
    ],
  },
  {
    id: "y6a-food-drink",
    name: "Food & Drink (Preferences)",
    subtopics: [
      "Food and drink vocabulary",
      "Expressing preferences",
      "Ordering food",
    ],
  },
  {
    id: "y6a-city-environment",
    name: "My City & the Environment",
    subtopics: [
      "Places in the city",
      "Giving and following directions",
      "The environment vocabulary",
    ],
  },
  {
    id: "y6a-travel-tourism",
    name: "Travel & Tourism",
    subtopics: [
      "Travel vocabulary",
      "Means of transport",
      "Holidays and tourism",
    ],
  },
  {
    id: "y6a-house-furniture",
    name: "House & Furniture",
    subtopics: [
      "Rooms of the house",
      "Furniture vocabulary",
      "Describing your home",
    ],
  },
  {
    id: "y6a-descriptions",
    name: "Descriptions",
    subtopics: [
      "Describing people",
      "Describing places",
      "Adjectives and agreement",
    ],
  },
];

const Y6_COMPUTING: KS2Topic[] = [
  {
    id: "y6c-systems-networks",
    name: "Computing Systems & Networks — Communication",
    term: "Autumn",
    subtopics: [
      "The internet and the World Wide Web",
      "How data is shared across networks",
      "Ways we communicate online (email, messaging, video calls)",
      "Searching effectively and evaluating information",
      "Spotting reliable vs unreliable sources",
      "Communicating safely, kindly and respectfully online",
    ],
  },
  {
    id: "y6c-web-pages",
    name: "Creating Media — Web Page Creation",
    term: "Autumn",
    subtopics: [
      "What makes a good web page",
      "Introduction to Google Sites and basic HTML",
      "Planning the pages of a website",
      "Adding text, images and hyperlinks",
      "Navigation between linked pages",
      "Copyright, fair use and crediting sources",
      "Reviewing and improving the website",
    ],
  },
  {
    id: "y6c-programming-variables",
    name: "Programming A — Variables in Games",
    term: "Spring",
    subtopics: [
      "What a variable is and why we use one",
      "Creating and using variables in Scratch",
      "Changing a variable during play (score and lives)",
      "Designing a game that uses variables",
      "Building the game step by step",
      "Testing and debugging the program",
      "Evaluating and improving the project",
    ],
  },
  {
    id: "y6c-spreadsheets",
    name: "Data & Information — Introduction to Spreadsheets",
    term: "Spring",
    subtopics: [
      "Cells, rows and columns",
      "Entering data and labels",
      "Writing formulas to calculate",
      "Using functions such as SUM",
      "Creating charts from data",
      "Sorting and organising data",
      "Using a spreadsheet to answer questions",
    ],
  },
  {
    id: "y6c-3d-modelling",
    name: "Creating Media — 3D Modelling",
    term: "Summer",
    subtopics: [
      "Introduction to 3D modelling with TinkerCAD",
      "Working in three dimensions",
      "Moving, resizing and rotating objects",
      "Combining shapes using groups and holes",
      "Planning a 3D model for a purpose",
      "Building the model accurately",
      "Evaluating and refining the design",
    ],
  },
  {
    id: "y6c-programming-sensing",
    name: "Programming B — Sensing Movement",
    term: "Summer",
    subtopics: [
      "Introduction to the micro:bit",
      "Inputs, processes and outputs",
      "Sensing with the accelerometer and buttons",
      "Selection and conditions (if… then)",
      "Counting movements: a step-counter project",
      "Designing a wearable program",
      "Testing on a virtual and physical device",
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
  "Year 5": [
    subject("maths", Y5_MATHS),
    subject("english", Y5_ENGLISH),
    subject("science", Y5_SCIENCE),
    subject("computing", Y5_COMPUTING),
    subject("arabic", Y5_ARABIC),
  ],
  "Year 6": [
    subject("maths", Y6_MATHS),
    subject("english", Y6_ENGLISH),
    subject("science", Y6_SCIENCE),
    subject("computing", Y6_COMPUTING),
    subject("arabic", Y6_ARABIC),
  ],
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

/** Whether the curriculum for a year group is organised into school terms. */
export function yearHasTerms(year: KS2Year): boolean {
  return CURRICULUM_BY_YEAR[year].some((subject) =>
    subject.topics.some((topic) => !!topic.term)
  );
}

/** URL slug for each section (the route segment under /ks2). */
const SECTION_SLUGS: Record<KS2Section, string> = {
  curriculum: "curriculum",
  sats: "sats",
  eleven_plus: "eleven-plus",
};

/** The dedicated page path for a section, e.g. "/ks2/eleven-plus". */
export function ks2SectionPath(section: KS2Section): string {
  return `/ks2/${SECTION_SLUGS[section]}`;
}

/** Resolve a URL slug back to its section id, or null if unknown. */
export function ks2SectionFromSlug(slug: string): KS2Section | null {
  const entry = (Object.entries(SECTION_SLUGS) as [KS2Section, string][]).find(
    ([, s]) => s === slug
  );
  return entry ? entry[0] : null;
}

/**
 * Builds the canonical skill key used for progress tracking, matching the
 * "Topic — subtopic" convention used elsewhere (see lib/skills.ts).
 */
export function ks2SkillKey(topicName: string, subtopic: string): string {
  return `${topicName} — ${subtopic}`;
}

export interface KS2TopicContext {
  topic: KS2Topic;
  subject: KS2SubjectContent;
  section: KS2Section;
  year: KS2Year;
  /** Sibling topics within the same subject/section/year (for next-topic nav). */
  siblings: KS2Topic[];
}

/** Every (section, year) pair the dataset exposes. */
function allSectionYearPairs(): Array<{ section: KS2Section; year: KS2Year }> {
  const pairs: Array<{ section: KS2Section; year: KS2Year }> = [];
  for (const s of KS2_SECTIONS) {
    if (sectionUsesYear(s.id)) {
      for (const y of KS2_YEARS) pairs.push({ section: s.id, year: y });
    } else {
      // year is irrelevant; use the first as a canonical value
      pairs.push({ section: s.id, year: KS2_YEARS[0] });
    }
  }
  return pairs;
}

/** Find a topic (and its full context) by its globally-unique id. */
export function getKS2TopicById(topicId: string): KS2TopicContext | null {
  for (const { section, year } of allSectionYearPairs()) {
    const subjects = getKS2Content(section, year);
    for (const subject of subjects) {
      const topic = subject.topics.find((t) => t.id === topicId);
      if (topic) {
        return { topic, subject, section, year, siblings: subject.topics };
      }
    }
  }
  return null;
}

export interface KS2TopicSummary {
  id: string;
  name: string;
  subjectId: KS2SubjectId;
  subjectName: string;
  section: KS2Section;
  year: KS2Year;
}

/** A flat list of every topic across all sections/years (for pickers). */
export function listAllKS2Topics(): KS2TopicSummary[] {
  const out: KS2TopicSummary[] = [];
  const seen = new Set<string>();
  for (const { section, year } of allSectionYearPairs()) {
    for (const subject of getKS2Content(section, year)) {
      for (const topic of subject.topics) {
        if (seen.has(topic.id)) continue;
        seen.add(topic.id);
        out.push({
          id: topic.id,
          name: topic.name,
          subjectId: subject.id,
          subjectName: subject.name,
          section,
          year,
        });
      }
    }
  }
  return out;
}

/** The next topic in the same subject/section/year, or null if last. */
export function getNextKS2Topic(topicId: string): KS2TopicContext | null {
  const ctx = getKS2TopicById(topicId);
  if (!ctx) return null;
  const idx = ctx.siblings.findIndex((t) => t.id === topicId);
  const next = ctx.siblings[idx + 1];
  return next ? getKS2TopicById(next.id) : null;
}
