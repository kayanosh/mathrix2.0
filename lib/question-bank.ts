/**
 * Static question bank for the Practice Hub.
 * ~200 curated GCSE Maths questions across topics and difficulty levels.
 *
 * When the bank is empty for a given topic/difficulty combo,
 * the Practice Hub falls back to AI-generated questions via /api/generate-practice.
 */

export type Difficulty = "easy" | "medium" | "hard";

export interface QuestionBankEntry {
  id: string;
  topicId: string;       // matches topic.id from lib/subjects.ts
  subtopic: string;      // matches a subtopic string
  difficulty: Difficulty;
  questionText: string;
  answer: string;
  hintText?: string;
}

// ── ALGEBRA ────────────────────────────────────────────────────────────────

const ALGEBRA_EASY: QuestionBankEntry[] = [
  { id: "alg-e1", topicId: "algebra", subtopic: "Solving linear equations", difficulty: "easy", questionText: "Solve $3x + 5 = 20$", answer: "$x = 5$" },
  { id: "alg-e2", topicId: "algebra", subtopic: "Solving linear equations", difficulty: "easy", questionText: "Solve $2x - 7 = 9$", answer: "$x = 8$" },
  { id: "alg-e3", topicId: "algebra", subtopic: "Solving linear equations", difficulty: "easy", questionText: "Solve $4x = 28$", answer: "$x = 7$" },
  { id: "alg-e4", topicId: "algebra", subtopic: "Expanding brackets", difficulty: "easy", questionText: "Expand $3(x + 4)$", answer: "$3x + 12$" },
  { id: "alg-e5", topicId: "algebra", subtopic: "Expanding brackets", difficulty: "easy", questionText: "Expand $5(2x - 1)$", answer: "$10x - 5$" },
  { id: "alg-e6", topicId: "algebra", subtopic: "Expanding brackets", difficulty: "easy", questionText: "Expand $2(3x + 7)$", answer: "$6x + 14$" },
  { id: "alg-e7", topicId: "algebra", subtopic: "Factorising quadratics", difficulty: "easy", questionText: "Factorise $x^2 + 5x + 6$", answer: "$(x + 2)(x + 3)$" },
  { id: "alg-e8", topicId: "algebra", subtopic: "Factorising quadratics", difficulty: "easy", questionText: "Factorise $x^2 + 7x + 12$", answer: "$(x + 3)(x + 4)$" },
  { id: "alg-e9", topicId: "algebra", subtopic: "Inequalities", difficulty: "easy", questionText: "Solve $2x + 1 > 7$", answer: "$x > 3$" },
  { id: "alg-e10", topicId: "algebra", subtopic: "Inequalities", difficulty: "easy", questionText: "List the integer values of $x$ where $-2 < x \\leq 3$", answer: "$-1, 0, 1, 2, 3$" },
];

const ALGEBRA_MEDIUM: QuestionBankEntry[] = [
  { id: "alg-m1", topicId: "algebra", subtopic: "Solving linear equations", difficulty: "medium", questionText: "Solve $\\frac{3x + 1}{2} = 7$", answer: "$x = \\frac{13}{3}$", hintText: "Multiply both sides by 2 first." },
  { id: "alg-m2", topicId: "algebra", subtopic: "Solving linear equations", difficulty: "medium", questionText: "Solve $5(x - 3) = 2(x + 6)$", answer: "$x = 9$" },
  { id: "alg-m3", topicId: "algebra", subtopic: "Expanding brackets", difficulty: "medium", questionText: "Expand and simplify $(x + 3)(x + 5)$", answer: "$x^2 + 8x + 15$" },
  { id: "alg-m4", topicId: "algebra", subtopic: "Expanding brackets", difficulty: "medium", questionText: "Expand and simplify $(2x - 1)(x + 4)$", answer: "$2x^2 + 7x - 4$" },
  { id: "alg-m5", topicId: "algebra", subtopic: "Factorising quadratics", difficulty: "medium", questionText: "Factorise $x^2 - 5x - 14$", answer: "$(x - 7)(x + 2)$" },
  { id: "alg-m6", topicId: "algebra", subtopic: "Simultaneous equations", difficulty: "medium", questionText: "Solve simultaneously:\n$2x + y = 7$\n$x - y = 2$", answer: "$x = 3,\\ y = 1$" },
  { id: "alg-m7", topicId: "algebra", subtopic: "Simultaneous equations", difficulty: "medium", questionText: "Solve simultaneously:\n$3x + 2y = 12$\n$x + 2y = 8$", answer: "$x = 2,\\ y = 3$" },
  { id: "alg-m8", topicId: "algebra", subtopic: "Inequalities", difficulty: "medium", questionText: "Solve $3x - 4 \\leq 2x + 5$", answer: "$x \\leq 9$" },
  { id: "alg-m9", topicId: "algebra", subtopic: "Factorising quadratics", difficulty: "medium", questionText: "Solve $x^2 + 3x - 10 = 0$", answer: "$x = 2$ or $x = -5$" },
  { id: "alg-m10", topicId: "algebra", subtopic: "Expanding brackets", difficulty: "medium", questionText: "Expand and simplify $(x + 2)^2$", answer: "$x^2 + 4x + 4$" },
];

const ALGEBRA_HARD: QuestionBankEntry[] = [
  { id: "alg-h1", topicId: "algebra", subtopic: "Completing the square", difficulty: "hard", questionText: "Write $x^2 + 6x + 2$ in the form $(x + a)^2 + b$", answer: "$(x + 3)^2 - 7$" },
  { id: "alg-h2", topicId: "algebra", subtopic: "Completing the square", difficulty: "hard", questionText: "Solve $x^2 - 8x + 10 = 0$ by completing the square. Give your answer in surd form.", answer: "$x = 4 \\pm \\sqrt{6}$" },
  { id: "alg-h3", topicId: "algebra", subtopic: "The quadratic formula", difficulty: "hard", questionText: "Use the quadratic formula to solve $2x^2 + 5x - 3 = 0$", answer: "$x = \\frac{1}{2}$ or $x = -3$" },
  { id: "alg-h4", topicId: "algebra", subtopic: "Algebraic fractions", difficulty: "hard", questionText: "Simplify $\\frac{x^2 - 9}{x^2 - x - 6}$", answer: "$\\frac{x + 3}{x + 2}$", hintText: "Factorise the numerator and denominator separately." },
  { id: "alg-h5", topicId: "algebra", subtopic: "Algebraic fractions", difficulty: "hard", questionText: "Solve $\\frac{3}{x+1} + \\frac{2}{x-1} = 1$", answer: "$x = 1 \\pm \\sqrt{6}$" },
  { id: "alg-h6", topicId: "algebra", subtopic: "Simultaneous equations", difficulty: "hard", questionText: "Solve simultaneously:\n$y = x^2 - 3x + 2$\n$y = 2x - 2$", answer: "$x = 1,\\ y = 0$ and $x = 4,\\ y = 6$" },
  { id: "alg-h7", topicId: "algebra", subtopic: "The quadratic formula", difficulty: "hard", questionText: "A rectangle has length $(x + 5)$ cm and width $(x - 2)$ cm. Its area is 60 cm². Find $x$.", answer: "$x = 7$" },
  { id: "alg-h8", topicId: "algebra", subtopic: "Inequalities", difficulty: "hard", questionText: "Solve $x^2 - 5x + 6 < 0$", answer: "$2 < x < 3$" },
  { id: "alg-h9", topicId: "algebra", subtopic: "Completing the square", difficulty: "hard", questionText: "Find the minimum value of $x^2 - 4x + 7$ and the value of $x$ at which it occurs.", answer: "Minimum value is $3$ when $x = 2$" },
  { id: "alg-h10", topicId: "algebra", subtopic: "Factorising quadratics", difficulty: "hard", questionText: "Factorise $6x^2 + x - 12$", answer: "$(2x + 3)(3x - 4)$" },
];

// ── NUMBER ─────────────────────────────────────────────────────────────────

const NUMBER_EASY: QuestionBankEntry[] = [
  { id: "num-e1", topicId: "number", subtopic: "Fractions, decimals, percentages", difficulty: "easy", questionText: "Convert $\\frac{3}{4}$ to a decimal.", answer: "$0.75$" },
  { id: "num-e2", topicId: "number", subtopic: "Fractions, decimals, percentages", difficulty: "easy", questionText: "What is 25% of 80?", answer: "$20$" },
  { id: "num-e3", topicId: "number", subtopic: "Fractions, decimals, percentages", difficulty: "easy", questionText: "Work out $\\frac{2}{5} + \\frac{1}{5}$", answer: "$\\frac{3}{5}$" },
  { id: "num-e4", topicId: "number", subtopic: "HCF and LCM", difficulty: "easy", questionText: "Find the HCF of 12 and 18.", answer: "$6$" },
  { id: "num-e5", topicId: "number", subtopic: "HCF and LCM", difficulty: "easy", questionText: "Find the LCM of 4 and 6.", answer: "$12$" },
  { id: "num-e6", topicId: "number", subtopic: "Prime factorisation", difficulty: "easy", questionText: "Write 36 as a product of prime factors.", answer: "$2^2 \\times 3^2$" },
  { id: "num-e7", topicId: "number", subtopic: "Ratio and proportion", difficulty: "easy", questionText: "Share £40 in the ratio 3 : 5.", answer: "£15 and £25" },
  { id: "num-e8", topicId: "number", subtopic: "Fractions, decimals, percentages", difficulty: "easy", questionText: "Convert 0.6 to a fraction in its simplest form.", answer: "$\\frac{3}{5}$" },
  { id: "num-e9", topicId: "number", subtopic: "Ratio and proportion", difficulty: "easy", questionText: "Simplify the ratio 15 : 25.", answer: "$3 : 5$" },
  { id: "num-e10", topicId: "number", subtopic: "Prime factorisation", difficulty: "easy", questionText: "Is 29 a prime number? Explain.", answer: "Yes — 29 has no factors other than 1 and itself." },
];

const NUMBER_MEDIUM: QuestionBankEntry[] = [
  { id: "num-m1", topicId: "number", subtopic: "Fractions, decimals, percentages", difficulty: "medium", questionText: "Work out $\\frac{2}{3} \\times \\frac{5}{8}$. Give your answer in its simplest form.", answer: "$\\frac{5}{12}$" },
  { id: "num-m2", topicId: "number", subtopic: "Fractions, decimals, percentages", difficulty: "medium", questionText: "Decrease £350 by 15%.", answer: "£297.50" },
  { id: "num-m3", topicId: "number", subtopic: "Ratio and proportion", difficulty: "medium", questionText: "A recipe for 4 people uses 300g of flour. How much flour is needed for 10 people?", answer: "$750\\text{g}$" },
  { id: "num-m4", topicId: "number", subtopic: "Standard form", difficulty: "medium", questionText: "Write 0.00045 in standard form.", answer: "$4.5 \\times 10^{-4}$" },
  { id: "num-m5", topicId: "number", subtopic: "Standard form", difficulty: "medium", questionText: "Calculate $(3 \\times 10^4) \\times (2 \\times 10^3)$. Give your answer in standard form.", answer: "$6 \\times 10^7$" },
  { id: "num-m6", topicId: "number", subtopic: "HCF and LCM", difficulty: "medium", questionText: "Using prime factorisation, find the HCF and LCM of 60 and 90.", answer: "HCF = 30, LCM = 180" },
  { id: "num-m7", topicId: "number", subtopic: "Fractions, decimals, percentages", difficulty: "medium", questionText: "Work out $1\\frac{2}{3} \\div \\frac{5}{6}$", answer: "$2$" },
  { id: "num-m8", topicId: "number", subtopic: "Ratio and proportion", difficulty: "medium", questionText: "The ratio of boys to girls in a class is 3 : 4. There are 12 boys. How many students are in the class?", answer: "$28$" },
  { id: "num-m9", topicId: "number", subtopic: "Fractions, decimals, percentages", difficulty: "medium", questionText: "A coat costs £120 after a 20% discount. What was the original price?", answer: "£150", hintText: "£120 represents 80% of the original." },
  { id: "num-m10", topicId: "number", subtopic: "Standard form", difficulty: "medium", questionText: "Write $5.2 \\times 10^{-3}$ as an ordinary number.", answer: "$0.0052$" },
];

const NUMBER_HARD: QuestionBankEntry[] = [
  { id: "num-h1", topicId: "number", subtopic: "Indices and surds", difficulty: "hard", questionText: "Simplify $\\sqrt{72}$", answer: "$6\\sqrt{2}$" },
  { id: "num-h2", topicId: "number", subtopic: "Indices and surds", difficulty: "hard", questionText: "Rationalise the denominator of $\\frac{5}{\\sqrt{3}}$", answer: "$\\frac{5\\sqrt{3}}{3}$" },
  { id: "num-h3", topicId: "number", subtopic: "Indices and surds", difficulty: "hard", questionText: "Simplify $\\frac{\\sqrt{50} + \\sqrt{18}}{\\sqrt{2}}$", answer: "$8$" },
  { id: "num-h4", topicId: "number", subtopic: "Fractions, decimals, percentages", difficulty: "hard", questionText: "A car depreciates by 12% per year. It is worth £18,000 now. What will it be worth in 3 years? Give your answer to the nearest pound.", answer: "£12,262" },
  { id: "num-h5", topicId: "number", subtopic: "Standard form", difficulty: "hard", questionText: "The mass of a proton is $1.67 \\times 10^{-27}$ kg. A sample contains $5 \\times 10^{23}$ protons. What is the total mass? Give your answer in standard form.", answer: "$8.35 \\times 10^{-4}$ kg" },
  { id: "num-h6", topicId: "number", subtopic: "Indices and surds", difficulty: "hard", questionText: "Evaluate $27^{\\frac{2}{3}}$", answer: "$9$" },
  { id: "num-h7", topicId: "number", subtopic: "Ratio and proportion", difficulty: "hard", questionText: "y is inversely proportional to $x^2$. When $x = 3$, $y = 4$. Find $y$ when $x = 6$.", answer: "$y = 1$" },
  { id: "num-h8", topicId: "number", subtopic: "Indices and surds", difficulty: "hard", questionText: "Simplify $(2\\sqrt{3})^2 + \\sqrt{48}$", answer: "$12 + 4\\sqrt{3}$" },
  { id: "num-h9", topicId: "number", subtopic: "Ratio and proportion", difficulty: "hard", questionText: "p is directly proportional to $\\sqrt{q}$. When $q = 16$, $p = 20$. Find $p$ when $q = 100$.", answer: "$p = 50$" },
  { id: "num-h10", topicId: "number", subtopic: "Fractions, decimals, percentages", difficulty: "hard", questionText: "A population increases by 5% each year from an initial value of 20,000. After how many full years will the population first exceed 25,000?", answer: "5 years" },
];

// ── GEOMETRY ───────────────────────────────────────────────────────────────

const GEOMETRY_EASY: QuestionBankEntry[] = [
  { id: "geo-e1", topicId: "geometry", subtopic: "Area and perimeter", difficulty: "easy", questionText: "Find the area of a rectangle with length 8 cm and width 5 cm.", answer: "$40\\text{ cm}^2$" },
  { id: "geo-e2", topicId: "geometry", subtopic: "Area and perimeter", difficulty: "easy", questionText: "Find the perimeter of a square with side length 6 cm.", answer: "$24\\text{ cm}$" },
  { id: "geo-e3", topicId: "geometry", subtopic: "Area and perimeter", difficulty: "easy", questionText: "Find the area of a triangle with base 10 cm and height 7 cm.", answer: "$35\\text{ cm}^2$" },
  { id: "geo-e4", topicId: "geometry", subtopic: "Angles in polygons", difficulty: "easy", questionText: "What is the sum of angles in a triangle?", answer: "$180°$" },
  { id: "geo-e5", topicId: "geometry", subtopic: "Angles in polygons", difficulty: "easy", questionText: "Find the missing angle in a triangle if the other two angles are 55° and 70°.", answer: "$55°$" },
  { id: "geo-e6", topicId: "geometry", subtopic: "Transformations", difficulty: "easy", questionText: "Describe the single transformation that maps shape A at (1, 2) to shape B at (4, 5).", answer: "Translation by $\\binom{3}{3}$" },
  { id: "geo-e7", topicId: "geometry", subtopic: "Pythagoras theorem", difficulty: "easy", questionText: "Find the hypotenuse of a right-angled triangle with sides 3 cm and 4 cm.", answer: "$5\\text{ cm}$" },
  { id: "geo-e8", topicId: "geometry", subtopic: "Area and perimeter", difficulty: "easy", questionText: "Find the circumference of a circle with radius 7 cm. Give your answer in terms of $\\pi$.", answer: "$14\\pi\\text{ cm}$" },
  { id: "geo-e9", topicId: "geometry", subtopic: "Angles in polygons", difficulty: "easy", questionText: "Find the sum of the interior angles of a hexagon.", answer: "$720°$" },
  { id: "geo-e10", topicId: "geometry", subtopic: "Area and perimeter", difficulty: "easy", questionText: "Find the area of a circle with radius 5 cm. Give your answer in terms of $\\pi$.", answer: "$25\\pi\\text{ cm}^2$" },
];

const GEOMETRY_MEDIUM: QuestionBankEntry[] = [
  { id: "geo-m1", topicId: "geometry", subtopic: "Pythagoras theorem", difficulty: "medium", questionText: "A ladder leans against a wall. The foot is 5 m from the wall and the ladder is 13 m long. How high up the wall does it reach?", answer: "$12\\text{ m}$" },
  { id: "geo-m2", topicId: "geometry", subtopic: "Trigonometry (SOH CAH TOA)", difficulty: "medium", questionText: "In a right-angled triangle, the opposite side is 8 cm and the hypotenuse is 10 cm. Find the angle. Give your answer to 1 d.p.", answer: "$53.1°$" },
  { id: "geo-m3", topicId: "geometry", subtopic: "Trigonometry (SOH CAH TOA)", difficulty: "medium", questionText: "Find the length of the adjacent side in a right-angled triangle where the angle is 40° and the hypotenuse is 12 cm. Give your answer to 1 d.p.", answer: "$9.2\\text{ cm}$" },
  { id: "geo-m4", topicId: "geometry", subtopic: "Area and perimeter", difficulty: "medium", questionText: "Find the area of a trapezium with parallel sides 6 cm and 10 cm, and height 4 cm.", answer: "$32\\text{ cm}^2$" },
  { id: "geo-m5", topicId: "geometry", subtopic: "Angles in polygons", difficulty: "medium", questionText: "Find the size of each interior angle of a regular octagon.", answer: "$135°$" },
  { id: "geo-m6", topicId: "geometry", subtopic: "Transformations", difficulty: "medium", questionText: "Describe a reflection of the point (3, 2) in the line $y = x$.", answer: "$(2, 3)$" },
  { id: "geo-m7", topicId: "geometry", subtopic: "Pythagoras theorem", difficulty: "medium", questionText: "A ship sails 8 km north and then 6 km east. How far is it from its starting point?", answer: "$10\\text{ km}$" },
  { id: "geo-m8", topicId: "geometry", subtopic: "Area and perimeter", difficulty: "medium", questionText: "Find the area of a sector with radius 9 cm and angle 60°. Give your answer in terms of $\\pi$.", answer: "$\\frac{27\\pi}{2}\\text{ cm}^2$" },
  { id: "geo-m9", topicId: "geometry", subtopic: "Trigonometry (SOH CAH TOA)", difficulty: "medium", questionText: "A tree casts a shadow 15 m long. The angle of elevation of the sun is 35°. Find the height of the tree to 1 d.p.", answer: "$10.5\\text{ m}$" },
  { id: "geo-m10", topicId: "geometry", subtopic: "Area and perimeter", difficulty: "medium", questionText: "Find the volume of a cylinder with radius 4 cm and height 10 cm. Give your answer in terms of $\\pi$.", answer: "$160\\pi\\text{ cm}^3$" },
];

const GEOMETRY_HARD: QuestionBankEntry[] = [
  { id: "geo-h1", topicId: "geometry", subtopic: "Circle theorems", difficulty: "hard", questionText: "The angle at the centre of a circle is 140°. Find the angle at the circumference subtended by the same arc.", answer: "$70°$" },
  { id: "geo-h2", topicId: "geometry", subtopic: "Circle theorems", difficulty: "hard", questionText: "A, B, C and D are points on a circle. Angle ABC = 75°. Find angle ADC.", answer: "$105°$", hintText: "Opposite angles in a cyclic quadrilateral add up to 180°." },
  { id: "geo-h3", topicId: "geometry", subtopic: "Vectors", difficulty: "hard", questionText: "If $\\vec{OA} = \\binom{3}{5}$ and $\\vec{OB} = \\binom{7}{-1}$, find $\\vec{AB}$.", answer: "$\\binom{4}{-6}$" },
  { id: "geo-h4", topicId: "geometry", subtopic: "Vectors", difficulty: "hard", questionText: "M is the midpoint of AB. $\\vec{OA} = \\mathbf{a}$ and $\\vec{OB} = \\mathbf{b}$. Write $\\vec{OM}$ in terms of $\\mathbf{a}$ and $\\mathbf{b}$.", answer: "$\\frac{1}{2}(\\mathbf{a} + \\mathbf{b})$" },
  { id: "geo-h5", topicId: "geometry", subtopic: "Trigonometry (SOH CAH TOA)", difficulty: "hard", questionText: "In triangle ABC, AB = 10 cm, angle A = 50°, angle B = 60°. Find BC using the sine rule. Give your answer to 1 d.p.", answer: "$8.9\\text{ cm}$" },
  { id: "geo-h6", topicId: "geometry", subtopic: "Trigonometry (SOH CAH TOA)", difficulty: "hard", questionText: "Find the area of a triangle with sides $a = 7$ cm, $b = 9$ cm and included angle $C = 65°$. Give your answer to 1 d.p.", answer: "$28.6\\text{ cm}^2$", hintText: "Use $\\frac{1}{2}ab\\sin C$." },
  { id: "geo-h7", topicId: "geometry", subtopic: "Circle theorems", difficulty: "hard", questionText: "PT is a tangent to a circle at T. The chord TA makes an angle of 55° with PT. Find the angle in the alternate segment.", answer: "$55°$" },
  { id: "geo-h8", topicId: "geometry", subtopic: "Pythagoras theorem", difficulty: "hard", questionText: "Find the length of the space diagonal of a cuboid with dimensions 3 cm, 4 cm and 12 cm.", answer: "$13\\text{ cm}$" },
  { id: "geo-h9", topicId: "geometry", subtopic: "Area and perimeter", difficulty: "hard", questionText: "A cone has radius 6 cm and slant height 10 cm. Find the total surface area. Give your answer in terms of $\\pi$.", answer: "$96\\pi\\text{ cm}^2$" },
  { id: "geo-h10", topicId: "geometry", subtopic: "Vectors", difficulty: "hard", questionText: "P divides AB in the ratio 2 : 3. $\\vec{OA} = \\mathbf{a}$, $\\vec{OB} = \\mathbf{b}$. Express $\\vec{OP}$ in terms of $\\mathbf{a}$ and $\\mathbf{b}$.", answer: "$\\frac{3}{5}\\mathbf{a} + \\frac{2}{5}\\mathbf{b}$" },
];

// ── STATISTICS & PROBABILITY ───────────────────────────────────────────────

const STATS_EASY: QuestionBankEntry[] = [
  { id: "sta-e1", topicId: "statistics", subtopic: "Mean, median, mode", difficulty: "easy", questionText: "Find the mean of: 3, 5, 7, 9, 11", answer: "$7$" },
  { id: "sta-e2", topicId: "statistics", subtopic: "Mean, median, mode", difficulty: "easy", questionText: "Find the median of: 2, 7, 4, 9, 3", answer: "$4$" },
  { id: "sta-e3", topicId: "statistics", subtopic: "Mean, median, mode", difficulty: "easy", questionText: "Find the mode of: 4, 2, 5, 2, 8, 2, 9", answer: "$2$" },
  { id: "sta-e4", topicId: "statistics", subtopic: "Probability trees", difficulty: "easy", questionText: "A bag contains 3 red and 5 blue balls. One ball is picked at random. What is the probability it is red?", answer: "$\\frac{3}{8}$" },
  { id: "sta-e5", topicId: "statistics", subtopic: "Venn diagrams", difficulty: "easy", questionText: "In a class of 30 students, 18 study French and 15 study Spanish. 8 study both. How many study neither?", answer: "$5$" },
  { id: "sta-e6", topicId: "statistics", subtopic: "Mean, median, mode", difficulty: "easy", questionText: "Find the range of: 12, 5, 8, 15, 3", answer: "$12$" },
  { id: "sta-e7", topicId: "statistics", subtopic: "Probability trees", difficulty: "easy", questionText: "A coin is flipped. What is the probability of getting heads?", answer: "$\\frac{1}{2}$" },
  { id: "sta-e8", topicId: "statistics", subtopic: "Probability trees", difficulty: "easy", questionText: "A dice is rolled. What is the probability of getting a number greater than 4?", answer: "$\\frac{1}{3}$" },
  { id: "sta-e9", topicId: "statistics", subtopic: "Mean, median, mode", difficulty: "easy", questionText: "The mean of 5 numbers is 8. What is their total?", answer: "$40$" },
  { id: "sta-e10", topicId: "statistics", subtopic: "Venn diagrams", difficulty: "easy", questionText: "Set A = {1, 2, 3, 4} and Set B = {3, 4, 5, 6}. Find $A \\cap B$.", answer: "$\\{3, 4\\}$" },
];

const STATS_MEDIUM: QuestionBankEntry[] = [
  { id: "sta-m1", topicId: "statistics", subtopic: "Mean, median, mode", difficulty: "medium", questionText: "The mean of four numbers is 15. Three of the numbers are 12, 18 and 14. Find the fourth.", answer: "$16$" },
  { id: "sta-m2", topicId: "statistics", subtopic: "Probability trees", difficulty: "medium", questionText: "A bag has 4 red and 6 blue balls. Two balls are drawn without replacement. What is the probability both are red?", answer: "$\\frac{2}{15}$" },
  { id: "sta-m3", topicId: "statistics", subtopic: "Cumulative frequency", difficulty: "medium", questionText: "From a cumulative frequency graph, the median is at the $\\frac{n}{2}$th value. If $n = 80$, at what position do you read off the median?", answer: "The 40th value" },
  { id: "sta-m4", topicId: "statistics", subtopic: "Box plots", difficulty: "medium", questionText: "A box plot shows: min = 5, Q1 = 12, median = 18, Q3 = 25, max = 35. Find the interquartile range.", answer: "$13$" },
  { id: "sta-m5", topicId: "statistics", subtopic: "Probability trees", difficulty: "medium", questionText: "The probability of rain on Monday is 0.3 and on Tuesday is 0.4 (independent). Find the probability it rains on both days.", answer: "$0.12$" },
  { id: "sta-m6", topicId: "statistics", subtopic: "Venn diagrams", difficulty: "medium", questionText: "P(A) = 0.5, P(B) = 0.4, P(A ∩ B) = 0.2. Find P(A ∪ B).", answer: "$0.7$" },
  { id: "sta-m7", topicId: "statistics", subtopic: "Mean, median, mode", difficulty: "medium", questionText: "Estimate the mean from this frequency table:\n| Score | 1-5 | 6-10 | 11-15 |\n| Freq  |  4  |  8   |   3   |", answer: "$7.3$ (to 1 d.p.)", hintText: "Use mid-points: 3, 8, 13." },
  { id: "sta-m8", topicId: "statistics", subtopic: "Probability trees", difficulty: "medium", questionText: "A spinner has P(red) = 0.6 and P(blue) = 0.4. It is spun twice. Find the probability of getting one of each colour.", answer: "$0.48$" },
  { id: "sta-m9", topicId: "statistics", subtopic: "Box plots", difficulty: "medium", questionText: "Compare two box plots:\nBoys: median = 45, IQR = 20\nGirls: median = 52, IQR = 10\nWrite one comparison.", answer: "On average, girls scored higher (median 52 vs 45). Girls' scores were also more consistent (IQR 10 vs 20)." },
  { id: "sta-m10", topicId: "statistics", subtopic: "Cumulative frequency", difficulty: "medium", questionText: "The lower quartile is 22 and the upper quartile is 38. Find the interquartile range.", answer: "$16$" },
];

const STATS_HARD: QuestionBankEntry[] = [
  { id: "sta-h1", topicId: "statistics", subtopic: "Histograms", difficulty: "hard", questionText: "A histogram has a bar from 0–10 with frequency density 3. The bar from 10–25 has frequency density 2. Which class has the higher frequency?", answer: "10–25 (frequency = $2 \\times 15 = 30$ vs $3 \\times 10 = 30$). They are equal.", hintText: "Frequency = frequency density × class width." },
  { id: "sta-h2", topicId: "statistics", subtopic: "Probability trees", difficulty: "hard", questionText: "Box A has 3 red and 2 blue balls. Box B has 4 red and 1 blue ball. A box is chosen at random, then a ball drawn. Find P(red).", answer: "$\\frac{7}{10}$" },
  { id: "sta-h3", topicId: "statistics", subtopic: "Cumulative frequency", difficulty: "hard", questionText: "The cumulative frequency diagram for 120 students' scores shows Q1 = 35, Q2 = 52, Q3 = 68. Estimate the number of students who scored between 35 and 68.", answer: "$60$ students" },
  { id: "sta-h4", topicId: "statistics", subtopic: "Histograms", difficulty: "hard", questionText: "A histogram has bars:\n0–5 (fd = 4), 5–15 (fd = 3), 15–20 (fd = 6).\nFind the total frequency.", answer: "$20 + 30 + 30 = 80$" },
  { id: "sta-h5", topicId: "statistics", subtopic: "Probability trees", difficulty: "hard", questionText: "Three coins are flipped. Find the probability of getting exactly 2 heads.", answer: "$\\frac{3}{8}$" },
  { id: "sta-h6", topicId: "statistics", subtopic: "Venn diagrams", difficulty: "hard", questionText: "P(A) = 0.6, P(B) = 0.5, P(A ∪ B) = 0.8. Are A and B independent? Show your working.", answer: "P(A ∩ B) = 0.6 + 0.5 − 0.8 = 0.3. P(A) × P(B) = 0.3. Since P(A ∩ B) = P(A) × P(B), yes they are independent." },
  { id: "sta-h7", topicId: "statistics", subtopic: "Cumulative frequency", difficulty: "hard", questionText: "From a cumulative frequency diagram for 200 values, the 80th percentile corresponds to a value of 65. How many values are above 65?", answer: "$40$ values" },
  { id: "sta-h8", topicId: "statistics", subtopic: "Probability trees", difficulty: "hard", questionText: "A and B are independent events. P(A) = $x$, P(B) = $x + 0.1$, P(A ∩ B) = 0.12. Find $x$.", answer: "$x = 0.3$" },
  { id: "sta-h9", topicId: "statistics", subtopic: "Mean, median, mode", difficulty: "hard", questionText: "Five numbers have mean 12 and median 11. The mode is 11. The range is 10. The smallest number is 7. Find all five numbers.", answer: "$7, 11, 11, 14, 17$" },
  { id: "sta-h10", topicId: "statistics", subtopic: "Histograms", difficulty: "hard", questionText: "A histogram shows ages 0–20 (fd = 1.5), 20–30 (fd = 4), 30–50 (fd = 2.5), 50–80 (fd = 1). Find the total number of people.", answer: "$30 + 40 + 50 + 30 = 150$" },
];

// ── CALCULUS (A-Level) ─────────────────────────────────────────────────────

const CALCULUS_EASY: QuestionBankEntry[] = [
  { id: "cal-e1", topicId: "calculus", subtopic: "Differentiation from first principles", difficulty: "easy", questionText: "Differentiate $y = x^3$", answer: "$\\frac{dy}{dx} = 3x^2$" },
  { id: "cal-e2", topicId: "calculus", subtopic: "Differentiation from first principles", difficulty: "easy", questionText: "Differentiate $y = 5x^2 + 3x - 7$", answer: "$\\frac{dy}{dx} = 10x + 3$" },
  { id: "cal-e3", topicId: "calculus", subtopic: "Integration", difficulty: "easy", questionText: "Find $\\int 4x\\, dx$", answer: "$2x^2 + C$" },
  { id: "cal-e4", topicId: "calculus", subtopic: "Integration", difficulty: "easy", questionText: "Find $\\int (3x^2 + 2)\\, dx$", answer: "$x^3 + 2x + C$" },
  { id: "cal-e5", topicId: "calculus", subtopic: "Differentiation from first principles", difficulty: "easy", questionText: "Differentiate $y = 7x - 4$", answer: "$\\frac{dy}{dx} = 7$" },
  { id: "cal-e6", topicId: "calculus", subtopic: "Differentiation from first principles", difficulty: "easy", questionText: "Differentiate $y = x^{-2}$", answer: "$\\frac{dy}{dx} = -2x^{-3}$" },
  { id: "cal-e7", topicId: "calculus", subtopic: "Integration", difficulty: "easy", questionText: "Evaluate $\\int_0^2 3x^2\\, dx$", answer: "$8$" },
  { id: "cal-e8", topicId: "calculus", subtopic: "Differentiation from first principles", difficulty: "easy", questionText: "Find the gradient of $y = x^2 + 4x$ when $x = 3$.", answer: "$10$" },
];

const CALCULUS_MEDIUM: QuestionBankEntry[] = [
  { id: "cal-m1", topicId: "calculus", subtopic: "Product rule", difficulty: "medium", questionText: "Differentiate $y = x^2 \\sin x$ using the product rule.", answer: "$\\frac{dy}{dx} = 2x\\sin x + x^2\\cos x$" },
  { id: "cal-m2", topicId: "calculus", subtopic: "Chain rule", difficulty: "medium", questionText: "Differentiate $y = (3x + 2)^5$", answer: "$\\frac{dy}{dx} = 15(3x + 2)^4$" },
  { id: "cal-m3", topicId: "calculus", subtopic: "Chain rule", difficulty: "medium", questionText: "Differentiate $y = \\sqrt{4x - 1}$", answer: "$\\frac{dy}{dx} = \\frac{2}{\\sqrt{4x - 1}}$" },
  { id: "cal-m4", topicId: "calculus", subtopic: "Integration", difficulty: "medium", questionText: "Find $\\int (2x + 1)^3\\, dx$", answer: "$\\frac{(2x + 1)^4}{8} + C$" },
  { id: "cal-m5", topicId: "calculus", subtopic: "Differentiation from first principles", difficulty: "medium", questionText: "Find the stationary points of $y = x^3 - 3x + 2$ and determine their nature.", answer: "$(1, 0)$ minimum, $(-1, 4)$ maximum" },
  { id: "cal-m6", topicId: "calculus", subtopic: "Quotient rule", difficulty: "medium", questionText: "Differentiate $y = \\frac{x^2}{x + 1}$", answer: "$\\frac{dy}{dx} = \\frac{x^2 + 2x}{(x + 1)^2}$" },
  { id: "cal-m7", topicId: "calculus", subtopic: "Integration", difficulty: "medium", questionText: "Find the area under $y = x^2 + 1$ between $x = 0$ and $x = 3$.", answer: "$12$" },
  { id: "cal-m8", topicId: "calculus", subtopic: "Product rule", difficulty: "medium", questionText: "Differentiate $y = x^3 e^x$", answer: "$\\frac{dy}{dx} = 3x^2 e^x + x^3 e^x = x^2 e^x(3 + x)$" },
];

const CALCULUS_HARD: QuestionBankEntry[] = [
  { id: "cal-h1", topicId: "calculus", subtopic: "Integration by parts", difficulty: "hard", questionText: "Find $\\int x e^x\\, dx$", answer: "$xe^x - e^x + C$" },
  { id: "cal-h2", topicId: "calculus", subtopic: "Integration by parts", difficulty: "hard", questionText: "Find $\\int x \\cos x\\, dx$", answer: "$x\\sin x + \\cos x + C$" },
  { id: "cal-h3", topicId: "calculus", subtopic: "Chain rule", difficulty: "hard", questionText: "Differentiate $y = \\ln(\\sin x)$", answer: "$\\frac{dy}{dx} = \\cot x$" },
  { id: "cal-h4", topicId: "calculus", subtopic: "Integration", difficulty: "hard", questionText: "Find $\\int \\frac{3x + 1}{x^2 + x}\\, dx$", answer: "$\\ln|x| + 2\\ln|x + 1| + C$", hintText: "Use partial fractions." },
  { id: "cal-h5", topicId: "calculus", subtopic: "Chain rule", difficulty: "hard", questionText: "Find $\\frac{dy}{dx}$ when $x^2 + y^2 = 25$ (implicit differentiation).", answer: "$\\frac{dy}{dx} = -\\frac{x}{y}$" },
  { id: "cal-h6", topicId: "calculus", subtopic: "Product rule", difficulty: "hard", questionText: "Differentiate $y = e^{2x} \\ln x$", answer: "$\\frac{dy}{dx} = 2e^{2x}\\ln x + \\frac{e^{2x}}{x}$" },
  { id: "cal-h7", topicId: "calculus", subtopic: "Integration by parts", difficulty: "hard", questionText: "Find $\\int x^2 e^x\\, dx$", answer: "$x^2 e^x - 2xe^x + 2e^x + C$" },
  { id: "cal-h8", topicId: "calculus", subtopic: "Integration", difficulty: "hard", questionText: "Find the area enclosed between $y = x^2$ and $y = 2x$.", answer: "$\\frac{4}{3}$" },
];

// ── COMBINED BANK ──────────────────────────────────────────────────────────

export const QUESTION_BANK: QuestionBankEntry[] = [
  ...ALGEBRA_EASY, ...ALGEBRA_MEDIUM, ...ALGEBRA_HARD,
  ...NUMBER_EASY, ...NUMBER_MEDIUM, ...NUMBER_HARD,
  ...GEOMETRY_EASY, ...GEOMETRY_MEDIUM, ...GEOMETRY_HARD,
  ...STATS_EASY, ...STATS_MEDIUM, ...STATS_HARD,
  ...CALCULUS_EASY, ...CALCULUS_MEDIUM, ...CALCULUS_HARD,
];

/**
 * Get questions for a specific topic and difficulty.
 * Returns a shuffled copy so each session feels fresh.
 */
export function getQuestions(topicId: string, difficulty: Difficulty): QuestionBankEntry[] {
  const matching = QUESTION_BANK.filter(
    (q) => q.topicId === topicId && q.difficulty === difficulty,
  );
  // Fisher-Yates shuffle
  const shuffled = [...matching];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Get a count of available questions per topic per difficulty.
 */
export function getQuestionCounts(topicId: string): Record<Difficulty, number> {
  return {
    easy: QUESTION_BANK.filter((q) => q.topicId === topicId && q.difficulty === "easy").length,
    medium: QUESTION_BANK.filter((q) => q.topicId === topicId && q.difficulty === "medium").length,
    hard: QUESTION_BANK.filter((q) => q.topicId === topicId && q.difficulty === "hard").length,
  };
}
