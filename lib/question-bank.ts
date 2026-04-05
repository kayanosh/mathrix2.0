/**
 * Static question bank for the Practice Hub.
 * ~360 curated Maths questions.
 * GCSE topics use grade bands: "1-3" (Foundation), "4-6" (Core), "7-9" (Higher).
 * Calculus (A-Level) uses: "easy", "medium", "hard".
 *
 * When the bank is empty for a given topic/difficulty combo,
 * the Practice Hub falls back to AI-generated questions via /api/generate-practice.
 */

import type { VisualBlock } from "@/types/whiteboard";

export type Difficulty = "1-3" | "4-6" | "7-9" | "easy" | "medium" | "hard";

export type GCSEDifficulty = "1-3" | "4-6" | "7-9";

export interface QuestionBankEntry {
  id: string;
  topicId: string;       // matches topic.id from lib/subjects.ts
  subtopic: string;      // matches a subtopic string
  difficulty: Difficulty;
  questionText: string;
  answer: string;
  hintText?: string;
  diagram?: VisualBlock;
}

// ── NUMBER ─────────────────────────────────────────────────────────────────

const NUMBER_G1_3: QuestionBankEntry[] = [
  { id: "num-e1", topicId: "number", subtopic: "Fractions", difficulty: "1-3", questionText: "Convert $\\frac{3}{4}$ to a decimal.", answer: "$0.75$" },
  { id: "num-e2", topicId: "number", subtopic: "Percentages", difficulty: "1-3", questionText: "What is 25% of 80?", answer: "$20$" },
  { id: "num-e3", topicId: "number", subtopic: "Fractions", difficulty: "1-3", questionText: "Work out $\\frac{2}{5} + \\frac{1}{5}$", answer: "$\\frac{3}{5}$" },
  { id: "num-e4", topicId: "number", subtopic: "HCF and LCM", difficulty: "1-3", questionText: "Find the HCF of 12 and 18.", answer: "$6$" },
  { id: "num-e5", topicId: "number", subtopic: "HCF and LCM", difficulty: "1-3", questionText: "Find the LCM of 4 and 6.", answer: "$12$" },
  { id: "num-e6", topicId: "number", subtopic: "Prime factorisation", difficulty: "1-3", questionText: "Write 36 as a product of prime factors.", answer: "$2^2 \\times 3^2$" },
  { id: "num-e8", topicId: "number", subtopic: "Decimals", difficulty: "1-3", questionText: "Convert 0.6 to a fraction in its simplest form.", answer: "$\\frac{3}{5}$" },
  { id: "num-e10", topicId: "number", subtopic: "Prime factorisation", difficulty: "1-3", questionText: "Is 29 a prime number? Explain.", answer: "Yes — 29 has no factors other than 1 and itself." },
  { id: "num-e11", topicId: "number", subtopic: "BIDMAS", difficulty: "1-3", questionText: "Work out $3 + 4 \\times 2$", answer: "$11$" },
  { id: "num-e12", topicId: "number", subtopic: "Rounding and estimation", difficulty: "1-3", questionText: "Round 3.456 to 2 decimal places.", answer: "$3.46$" },
  // New — filling gaps
  { id: "num-13-1", topicId: "number", subtopic: "Factors and multiples", difficulty: "1-3", questionText: "List all the factors of 12.", answer: "$1, 2, 3, 4, 6, 12$" },
  { id: "num-13-2", topicId: "number", subtopic: "Factors and multiples", difficulty: "1-3", questionText: "List the first five multiples of 7.", answer: "$7, 14, 21, 28, 35$" },
  { id: "num-13-3", topicId: "number", subtopic: "Factors and multiples", difficulty: "1-3", questionText: "What is the largest factor of 20 that is not 20 itself?", answer: "$10$" },
  { id: "num-13-4", topicId: "number", subtopic: "Decimals", difficulty: "1-3", questionText: "Work out $0.3 + 0.45$", answer: "$0.75$" },
  { id: "num-13-5", topicId: "number", subtopic: "Decimals", difficulty: "1-3", questionText: "Put these in order from smallest to largest: $0.4,\\ 0.35,\\ 0.42$", answer: "$0.35,\\ 0.4,\\ 0.42$" },
  { id: "num-13-6", topicId: "number", subtopic: "Percentages", difficulty: "1-3", questionText: "What is 50% of 60?", answer: "$30$" },
  { id: "num-13-7", topicId: "number", subtopic: "Percentages", difficulty: "1-3", questionText: "What is 10% of 250?", answer: "$25$" },
  { id: "num-13-8", topicId: "number", subtopic: "BIDMAS", difficulty: "1-3", questionText: "Work out $(5 + 3) \\times 2$", answer: "$16$" },
  { id: "num-13-9", topicId: "number", subtopic: "BIDMAS", difficulty: "1-3", questionText: "Work out $20 - 3 \\times 4$", answer: "$8$" },
  { id: "num-13-10", topicId: "number", subtopic: "Powers and roots", difficulty: "1-3", questionText: "What is $3^2$?", answer: "$9$" },
  { id: "num-13-11", topicId: "number", subtopic: "Powers and roots", difficulty: "1-3", questionText: "What is $\\sqrt{49}$?", answer: "$7$" },
  { id: "num-13-12", topicId: "number", subtopic: "Powers and roots", difficulty: "1-3", questionText: "Find the value of $2^4$.", answer: "$16$" },
  { id: "num-13-13", topicId: "number", subtopic: "Standard form", difficulty: "1-3", questionText: "Write 5000 in standard form.", answer: "$5 \\times 10^3$" },
  { id: "num-13-14", topicId: "number", subtopic: "Standard form", difficulty: "1-3", questionText: "Write $3 \\times 10^2$ as an ordinary number.", answer: "$300$" },
  { id: "num-13-15", topicId: "number", subtopic: "Rounding and estimation", difficulty: "1-3", questionText: "Round 67 to the nearest 10.", answer: "$70$" },
  { id: "num-13-16", topicId: "number", subtopic: "Fractions", difficulty: "1-3", questionText: "Work out $\\frac{1}{2} + \\frac{1}{4}$", answer: "$\\frac{3}{4}$" },
];

const NUMBER_G4_6: QuestionBankEntry[] = [
  { id: "num-m1", topicId: "number", subtopic: "Fractions", difficulty: "4-6", questionText: "Work out $\\frac{2}{3} \\times \\frac{5}{8}$. Give your answer in its simplest form.", answer: "$\\frac{5}{12}$" },
  { id: "num-m2", topicId: "number", subtopic: "Percentages", difficulty: "4-6", questionText: "Decrease £350 by 15%.", answer: "£297.50" },
  { id: "num-m4", topicId: "number", subtopic: "Standard form", difficulty: "4-6", questionText: "Write 0.00045 in standard form.", answer: "$4.5 \\times 10^{-4}$" },
  { id: "num-m5", topicId: "number", subtopic: "Standard form", difficulty: "4-6", questionText: "Calculate $(3 \\times 10^4) \\times (2 \\times 10^3)$. Give your answer in standard form.", answer: "$6 \\times 10^7$" },
  { id: "num-m6", topicId: "number", subtopic: "HCF and LCM", difficulty: "4-6", questionText: "Using prime factorisation, find the HCF and LCM of 60 and 90.", answer: "HCF = 30, LCM = 180" },
  { id: "num-m7", topicId: "number", subtopic: "Fractions", difficulty: "4-6", questionText: "Work out $1\\frac{2}{3} \\div \\frac{5}{6}$", answer: "$2$" },
  { id: "num-m9", topicId: "number", subtopic: "Percentages", difficulty: "4-6", questionText: "A coat costs £120 after a 20% discount. What was the original price?", answer: "£150", hintText: "£120 represents 80% of the original." },
  { id: "num-m10", topicId: "number", subtopic: "Standard form", difficulty: "4-6", questionText: "Write $5.2 \\times 10^{-3}$ as an ordinary number.", answer: "$0.0052$" },
  { id: "num-m11", topicId: "number", subtopic: "Rounding and estimation", difficulty: "4-6", questionText: "Estimate the value of $\\frac{49.8 \\times 0.512}{9.9}$ by rounding each number to 1 significant figure.", answer: "$\\approx 2.5$" },
  { id: "num-m12", topicId: "number", subtopic: "Powers and roots", difficulty: "4-6", questionText: "Evaluate $2^5 \\times 2^3$. Give your answer as a power of 2.", answer: "$2^8 = 256$" },
  // New — filling gaps
  { id: "num-46-1", topicId: "number", subtopic: "Factors and multiples", difficulty: "4-6", questionText: "Find the common factors of 24 and 36.", answer: "$1, 2, 3, 4, 6, 12$" },
  { id: "num-46-2", topicId: "number", subtopic: "Factors and multiples", difficulty: "4-6", questionText: "A number is a common multiple of 6 and 8. It is between 40 and 50. What is it?", answer: "$48$" },
  { id: "num-46-3", topicId: "number", subtopic: "Factors and multiples", difficulty: "4-6", questionText: "Write 84 as a product of its prime factors.", answer: "$2^2 \\times 3 \\times 7$" },
  { id: "num-46-4", topicId: "number", subtopic: "Decimals", difficulty: "4-6", questionText: "Work out $3.7 \\times 0.4$", answer: "$1.48$" },
  { id: "num-46-5", topicId: "number", subtopic: "Decimals", difficulty: "4-6", questionText: "Convert $\\frac{5}{8}$ to a decimal.", answer: "$0.625$" },
  { id: "num-46-6", topicId: "number", subtopic: "BIDMAS", difficulty: "4-6", questionText: "Work out $5^2 - 3 \\times (4 + 1)$", answer: "$10$" },
  { id: "num-46-7", topicId: "number", subtopic: "BIDMAS", difficulty: "4-6", questionText: "Work out $\\frac{8 + 4}{2} + 3^2$", answer: "$15$" },
  { id: "num-46-8", topicId: "number", subtopic: "Powers and roots", difficulty: "4-6", questionText: "Simplify $3^4 \\div 3^2$.", answer: "$3^2 = 9$" },
  { id: "num-46-9", topicId: "number", subtopic: "Prime factorisation", difficulty: "4-6", questionText: "Write 120 as a product of prime factors.", answer: "$2^3 \\times 3 \\times 5$" },
  { id: "num-46-10", topicId: "number", subtopic: "Prime factorisation", difficulty: "4-6", questionText: "Use prime factorisation to find the HCF of 48 and 72.", answer: "$24$" },
  { id: "num-46-11", topicId: "number", subtopic: "Rounding and estimation", difficulty: "4-6", questionText: "Round 0.04567 to 2 significant figures.", answer: "$0.046$" },
  { id: "num-46-12", topicId: "number", subtopic: "Bounds", difficulty: "4-6", questionText: "A mass is 5.4 kg correct to 1 decimal place. Write down the lower and upper bounds.", answer: "$5.35 \\leq m < 5.45$ kg" },
  { id: "num-46-13", topicId: "number", subtopic: "Bounds", difficulty: "4-6", questionText: "A length is measured as 30 cm to the nearest 10 cm. What are the upper and lower bounds?", answer: "$25 \\leq l < 35$ cm" },
  { id: "num-46-14", topicId: "number", subtopic: "Surds", difficulty: "4-6", questionText: "Simplify $\\sqrt{50}$.", answer: "$5\\sqrt{2}$" },
  { id: "num-46-15", topicId: "number", subtopic: "Surds", difficulty: "4-6", questionText: "Simplify $\\sqrt{12}$.", answer: "$2\\sqrt{3}$" },
  { id: "num-46-16", topicId: "number", subtopic: "HCF and LCM", difficulty: "4-6", questionText: "Find the LCM of 12 and 15.", answer: "$60$" },
];

const NUMBER_G7_9: QuestionBankEntry[] = [
  { id: "num-h1", topicId: "number", subtopic: "Surds", difficulty: "7-9", questionText: "Simplify $\\sqrt{72}$", answer: "$6\\sqrt{2}$" },
  { id: "num-h2", topicId: "number", subtopic: "Surds", difficulty: "7-9", questionText: "Rationalise the denominator of $\\frac{5}{\\sqrt{3}}$", answer: "$\\frac{5\\sqrt{3}}{3}$" },
  { id: "num-h3", topicId: "number", subtopic: "Surds", difficulty: "7-9", questionText: "Simplify $\\frac{\\sqrt{50} + \\sqrt{18}}{\\sqrt{2}}$", answer: "$8$" },
  { id: "num-h4", topicId: "number", subtopic: "Percentages", difficulty: "7-9", questionText: "A car depreciates by 12% per year. It is worth £18,000 now. What will it be worth in 3 years? Give your answer to the nearest pound.", answer: "£12,262" },
  { id: "num-h5", topicId: "number", subtopic: "Standard form", difficulty: "7-9", questionText: "The mass of a proton is $1.67 \\times 10^{-27}$ kg. A sample contains $5 \\times 10^{23}$ protons. What is the total mass? Give your answer in standard form.", answer: "$8.35 \\times 10^{-4}$ kg" },
  { id: "num-h6", topicId: "number", subtopic: "Powers and roots", difficulty: "7-9", questionText: "Evaluate $27^{\\frac{2}{3}}$", answer: "$9$" },
  { id: "num-h8", topicId: "number", subtopic: "Surds", difficulty: "7-9", questionText: "Simplify $(2\\sqrt{3})^2 + \\sqrt{48}$", answer: "$12 + 4\\sqrt{3}$" },
  { id: "num-h10", topicId: "number", subtopic: "Percentages", difficulty: "7-9", questionText: "A population increases by 5% each year from an initial value of 20,000. After how many full years will the population first exceed 25,000?", answer: "5 years" },
  { id: "num-h11", topicId: "number", subtopic: "Bounds", difficulty: "7-9", questionText: "A length is 12.5 cm correct to 1 decimal place. Write down the error interval.", answer: "$12.45 \\leq l < 12.55$ cm" },
  { id: "num-h12", topicId: "number", subtopic: "Surds", difficulty: "7-9", questionText: "Rationalise the denominator of $\\frac{3}{2 + \\sqrt{5}}$", answer: "$-6 + 3\\sqrt{5}$" },
  // New — filling gaps
  { id: "num-79-1", topicId: "number", subtopic: "Factors and multiples", difficulty: "7-9", questionText: "Prove that the product of any two consecutive integers is always even.", answer: "One of any two consecutive integers must be even. An even number times any integer is even." },
  { id: "num-79-2", topicId: "number", subtopic: "Factors and multiples", difficulty: "7-9", questionText: "Find the smallest positive integer that has exactly 6 factors.", answer: "$12$ (factors: 1, 2, 3, 4, 6, 12)" },
  { id: "num-79-3", topicId: "number", subtopic: "Decimals", difficulty: "7-9", questionText: "Prove that $0.\\dot{3}\\dot{6} = \\frac{4}{11}$.", answer: "Let $x = 0.3636...$, then $100x = 36.3636...$, so $99x = 36$, giving $x = \\frac{36}{99} = \\frac{4}{11}$." },
  { id: "num-79-4", topicId: "number", subtopic: "Decimals", difficulty: "7-9", questionText: "Convert $0.1\\dot{6}$ to a fraction.", answer: "$\\frac{1}{6}$" },
  { id: "num-79-5", topicId: "number", subtopic: "BIDMAS", difficulty: "7-9", questionText: "Insert one pair of brackets to make this correct: $2 + 3 \\times 5 - 1 = 24$", answer: "$(2 + 3) \\times 5 - 1 = 24$" },
  { id: "num-79-6", topicId: "number", subtopic: "BIDMAS", difficulty: "7-9", questionText: "Evaluate $\\frac{2^3 + 3^2}{\\sqrt{25} - 2}$", answer: "$\\frac{17}{3}$" },
  { id: "num-79-7", topicId: "number", subtopic: "Powers and roots", difficulty: "7-9", questionText: "Evaluate $\\left(\\frac{8}{27}\\right)^{\\frac{2}{3}}$", answer: "$\\frac{4}{9}$" },
  { id: "num-79-8", topicId: "number", subtopic: "Powers and roots", difficulty: "7-9", questionText: "Simplify $\\frac{x^5 \\times x^{-2}}{x^2}$, giving your answer as a single power of $x$.", answer: "$x$" },
  { id: "num-79-9", topicId: "number", subtopic: "Prime factorisation", difficulty: "7-9", questionText: "Find the HCF and LCM of 126 and 168 using prime factorisation.", answer: "$126 = 2 \\times 3^2 \\times 7$, $168 = 2^3 \\times 3 \\times 7$. HCF = 42, LCM = 504." },
  { id: "num-79-10", topicId: "number", subtopic: "Prime factorisation", difficulty: "7-9", questionText: "The HCF of two numbers is 6 and their LCM is 120. One number is 24. Find the other.", answer: "$30$", hintText: "HCF × LCM = product of the two numbers." },
  { id: "num-79-11", topicId: "number", subtopic: "Rounding and estimation", difficulty: "7-9", questionText: "A rectangle is $12.4$ cm by $5.3$ cm (both to 3 s.f. and 2 s.f. respectively). Calculate the upper bound of the area.", answer: "$12.45 \\times 5.35 = 66.6075\\text{ cm}^2$" },
  { id: "num-79-12", topicId: "number", subtopic: "Rounding and estimation", difficulty: "7-9", questionText: "Estimate $\\frac{\\sqrt{63.7}}{2.03^2}$ by rounding to appropriate values.", answer: "$\\approx \\frac{8}{4} = 2$" },
  { id: "num-79-13", topicId: "number", subtopic: "Fractions", difficulty: "7-9", questionText: "Work out $\\frac{2}{3} \\div \\frac{4}{5} + \\frac{1}{6}$", answer: "$\\frac{5}{6} + \\frac{1}{6} = 1$" },
  { id: "num-79-14", topicId: "number", subtopic: "Fractions", difficulty: "7-9", questionText: "Show that $\\frac{3}{4} - \\frac{2}{5} = \\frac{7}{20}$.", answer: "$\\frac{15}{20} - \\frac{8}{20} = \\frac{7}{20}$" },
  { id: "num-79-15", topicId: "number", subtopic: "HCF and LCM", difficulty: "7-9", questionText: "Two buses leave at 9:00 am. Bus A returns every 18 min and Bus B every 24 min. When will they next both be at the station?", answer: "LCM(18, 24) = 72 min later, at 10:12 am." },
  { id: "num-79-16", topicId: "number", subtopic: "HCF and LCM", difficulty: "7-9", questionText: "Find the LCM of 15, 20 and 24.", answer: "$120$" },
  { id: "num-79-17", topicId: "number", subtopic: "Standard form", difficulty: "7-9", questionText: "Calculate $\\frac{4.8 \\times 10^5}{1.6 \\times 10^{-2}}$. Give your answer in standard form.", answer: "$3 \\times 10^7$" },
  { id: "num-79-18", topicId: "number", subtopic: "Bounds", difficulty: "7-9", questionText: "A rectangle has length $8.5$ cm and width $4.2$ cm, both to 1 d.p. Calculate the lower bound of the perimeter.", answer: "$2(8.45 + 4.15) = 25.2$ cm" },
  { id: "num-79-19", topicId: "number", subtopic: "Bounds", difficulty: "7-9", questionText: "Speed = distance ÷ time. Distance = 120 km (2 s.f.), time = 1.5 h (1 d.p.). Find the upper bound of the speed.", answer: "$\\frac{125}{1.45} \\approx 86.2$ km/h" },
];

// ── ALGEBRA ────────────────────────────────────────────────────────────────

const ALGEBRA_G1_3: QuestionBankEntry[] = [
  { id: "alg-e1", topicId: "algebra", subtopic: "Solving equations", difficulty: "1-3", questionText: "Solve $3x + 5 = 20$", answer: "$x = 5$" },
  { id: "alg-e2", topicId: "algebra", subtopic: "Solving equations", difficulty: "1-3", questionText: "Solve $2x - 7 = 9$", answer: "$x = 8$" },
  { id: "alg-e3", topicId: "algebra", subtopic: "Solving equations", difficulty: "1-3", questionText: "Solve $4x = 28$", answer: "$x = 7$" },
  { id: "alg-e4", topicId: "algebra", subtopic: "Expanding brackets", difficulty: "1-3", questionText: "Expand $3(x + 4)$", answer: "$3x + 12$" },
  { id: "alg-e5", topicId: "algebra", subtopic: "Expanding brackets", difficulty: "1-3", questionText: "Expand $5(2x - 1)$", answer: "$10x - 5$" },
  { id: "alg-e6", topicId: "algebra", subtopic: "Expanding brackets", difficulty: "1-3", questionText: "Expand $2(3x + 7)$", answer: "$6x + 14$" },
  { id: "alg-e7", topicId: "algebra", subtopic: "Factorising", difficulty: "1-3", questionText: "Factorise $x^2 + 5x + 6$", answer: "$(x + 2)(x + 3)$" },
  { id: "alg-e8", topicId: "algebra", subtopic: "Factorising", difficulty: "1-3", questionText: "Factorise $x^2 + 7x + 12$", answer: "$(x + 3)(x + 4)$" },
  { id: "alg-e9", topicId: "algebra", subtopic: "Inequalities", difficulty: "1-3", questionText: "Solve $2x + 1 > 7$", answer: "$x > 3$" },
  { id: "alg-e10", topicId: "algebra", subtopic: "Inequalities", difficulty: "1-3", questionText: "List the integer values of $x$ where $-2 < x \\leq 3$", answer: "$-1, 0, 1, 2, 3$" },
  // New — filling gaps
  { id: "alg-13-1", topicId: "algebra", subtopic: "Expressions and simplifying", difficulty: "1-3", questionText: "Simplify $3a + 5a$", answer: "$8a$" },
  { id: "alg-13-2", topicId: "algebra", subtopic: "Expressions and simplifying", difficulty: "1-3", questionText: "Simplify $4x + 2y - x + 3y$", answer: "$3x + 5y$" },
  { id: "alg-13-3", topicId: "algebra", subtopic: "Expressions and simplifying", difficulty: "1-3", questionText: "Simplify $2 \\times a \\times 3 \\times b$", answer: "$6ab$" },
  { id: "alg-13-4", topicId: "algebra", subtopic: "Sequences", difficulty: "1-3", questionText: "Write the next two terms: 2, 5, 8, 11, ...", answer: "$14, 17$" },
  { id: "alg-13-5", topicId: "algebra", subtopic: "Sequences", difficulty: "1-3", questionText: "Find the common difference: 3, 7, 11, 15, ...", answer: "$4$" },
  { id: "alg-13-6", topicId: "algebra", subtopic: "Sequences", difficulty: "1-3", questionText: "Write the first 4 terms of the sequence with $n$th term $2n + 1$.", answer: "$3, 5, 7, 9$" },
  { id: "alg-13-7", topicId: "algebra", subtopic: "Straight line graphs", difficulty: "1-3", questionText: "What is the gradient and y-intercept of $y = 3x + 2$?", answer: "Gradient = $3$, y-intercept = $2$" },
  { id: "alg-13-8", topicId: "algebra", subtopic: "Straight line graphs", difficulty: "1-3", questionText: "Complete the table for $y = 2x - 1$ when $x = 0, 1, 2, 3$.", answer: "$y = -1, 1, 3, 5$" },
  { id: "alg-13-9", topicId: "algebra", subtopic: "Straight line graphs", difficulty: "1-3", questionText: "Does the point $(2, 7)$ lie on the line $y = 3x + 1$?", answer: "Yes: $3(2) + 1 = 7$ ✓" },
  { id: "alg-13-10", topicId: "algebra", subtopic: "Quadratics", difficulty: "1-3", questionText: "Solve $x^2 = 25$", answer: "$x = 5$ or $x = -5$" },
  { id: "alg-13-11", topicId: "algebra", subtopic: "Quadratics", difficulty: "1-3", questionText: "Solve $x^2 - 9 = 0$", answer: "$x = 3$ or $x = -3$" },
  { id: "alg-13-12", topicId: "algebra", subtopic: "Simultaneous equations", difficulty: "1-3", questionText: "Solve: $x + y = 10$ and $x - y = 4$", answer: "$x = 7,\\ y = 3$" },
  { id: "alg-13-13", topicId: "algebra", subtopic: "Simultaneous equations", difficulty: "1-3", questionText: "Solve: $2x + y = 8$ and $x = 3$", answer: "$x = 3,\\ y = 2$" },
  // Diagram question
  {
    id: "alg-d1", topicId: "algebra", subtopic: "Straight line graphs", difficulty: "1-3",
    questionText: "The graph below shows a straight line. What is the gradient?",
    answer: "Gradient $= 2$",
    hintText: "Pick two points and use $\\frac{\\text{rise}}{\\text{run}}$.",
    diagram: {
      type: "coordinate_graph",
      xRange: [-1, 5],
      yRange: [-1, 9],
      grid: true,
      xLabel: "x",
      yLabel: "y",
      plots: [{ equation: "y = 2x + 1", fn: "2*x + 1", color: "#818cf8", label: "y = 2x + 1" }],
      points: [
        { point: { x: 0, y: 1 }, label: "(0, 1)" },
        { point: { x: 2, y: 5 }, label: "(2, 5)" },
      ],
    },
  },
];

const ALGEBRA_G4_6: QuestionBankEntry[] = [
  { id: "alg-m1", topicId: "algebra", subtopic: "Solving equations", difficulty: "4-6", questionText: "Solve $\\frac{3x + 1}{2} = 7$", answer: "$x = \\frac{13}{3}$", hintText: "Multiply both sides by 2 first." },
  { id: "alg-m2", topicId: "algebra", subtopic: "Solving equations", difficulty: "4-6", questionText: "Solve $5(x - 3) = 2(x + 6)$", answer: "$x = 9$" },
  { id: "alg-m3", topicId: "algebra", subtopic: "Expanding brackets", difficulty: "4-6", questionText: "Expand and simplify $(x + 3)(x + 5)$", answer: "$x^2 + 8x + 15$" },
  { id: "alg-m4", topicId: "algebra", subtopic: "Expanding brackets", difficulty: "4-6", questionText: "Expand and simplify $(2x - 1)(x + 4)$", answer: "$2x^2 + 7x - 4$" },
  { id: "alg-m5", topicId: "algebra", subtopic: "Factorising", difficulty: "4-6", questionText: "Factorise $x^2 - 5x - 14$", answer: "$(x - 7)(x + 2)$" },
  { id: "alg-m6", topicId: "algebra", subtopic: "Simultaneous equations", difficulty: "4-6", questionText: "Solve simultaneously:\n$2x + y = 7$\n$x - y = 2$", answer: "$x = 3,\\ y = 1$" },
  { id: "alg-m7", topicId: "algebra", subtopic: "Simultaneous equations", difficulty: "4-6", questionText: "Solve simultaneously:\n$3x + 2y = 12$\n$x + 2y = 8$", answer: "$x = 2,\\ y = 3$" },
  { id: "alg-m8", topicId: "algebra", subtopic: "Inequalities", difficulty: "4-6", questionText: "Solve $3x - 4 \\leq 2x + 5$", answer: "$x \\leq 9$" },
  { id: "alg-m9", topicId: "algebra", subtopic: "Quadratics", difficulty: "4-6", questionText: "Solve $x^2 + 3x - 10 = 0$", answer: "$x = 2$ or $x = -5$" },
  { id: "alg-m10", topicId: "algebra", subtopic: "Expanding brackets", difficulty: "4-6", questionText: "Expand and simplify $(x + 2)^2$", answer: "$x^2 + 4x + 4$" },
  // New — filling gaps
  { id: "alg-46-1", topicId: "algebra", subtopic: "Expressions and simplifying", difficulty: "4-6", questionText: "Simplify $3x^2 + 5x - 2x^2 + x$", answer: "$x^2 + 6x$" },
  { id: "alg-46-2", topicId: "algebra", subtopic: "Expressions and simplifying", difficulty: "4-6", questionText: "Simplify $\\frac{12x^3}{4x}$", answer: "$3x^2$" },
  { id: "alg-46-3", topicId: "algebra", subtopic: "Expressions and simplifying", difficulty: "4-6", questionText: "Expand and simplify $2(3x + 1) - 3(x - 4)$", answer: "$3x + 14$" },
  { id: "alg-46-4", topicId: "algebra", subtopic: "Sequences", difficulty: "4-6", questionText: "Find the $n$th term of the sequence 5, 9, 13, 17, ...", answer: "$4n + 1$" },
  { id: "alg-46-5", topicId: "algebra", subtopic: "Sequences", difficulty: "4-6", questionText: "The $n$th term of a sequence is $3n - 2$. Is 50 a term in this sequence?", answer: "No. $3n - 2 = 50 \\Rightarrow n = \\frac{52}{3}$, which is not an integer." },
  { id: "alg-46-6", topicId: "algebra", subtopic: "Sequences", difficulty: "4-6", questionText: "Find the 20th term of the sequence 7, 12, 17, 22, ...", answer: "$5(20) + 2 = 102$" },
  { id: "alg-46-7", topicId: "algebra", subtopic: "Straight line graphs", difficulty: "4-6", questionText: "Find the equation of the line passing through $(0, 3)$ with gradient 2.", answer: "$y = 2x + 3$" },
  { id: "alg-46-8", topicId: "algebra", subtopic: "Straight line graphs", difficulty: "4-6", questionText: "Find the gradient of the line passing through $(1, 3)$ and $(4, 9)$.", answer: "$\\frac{9-3}{4-1} = 2$" },
  { id: "alg-46-9", topicId: "algebra", subtopic: "Straight line graphs", difficulty: "4-6", questionText: "Rearrange $2x + 3y = 12$ into the form $y = mx + c$.", answer: "$y = -\\frac{2}{3}x + 4$" },
  { id: "alg-46-10", topicId: "algebra", subtopic: "Quadratic and cubic graphs", difficulty: "4-6", questionText: "Sketch $y = x^2 - 4$. State the y-intercept and the roots.", answer: "y-intercept: $(0, -4)$. Roots: $x = 2$ and $x = -2$." },
  { id: "alg-46-11", topicId: "algebra", subtopic: "Quadratic and cubic graphs", difficulty: "4-6", questionText: "What is the turning point of $y = (x - 3)^2 + 1$?", answer: "$(3, 1)$ — a minimum point." },
  { id: "alg-46-12", topicId: "algebra", subtopic: "Functions", difficulty: "4-6", questionText: "If $f(x) = 3x - 1$, find $f(4)$.", answer: "$11$" },
  { id: "alg-46-13", topicId: "algebra", subtopic: "Functions", difficulty: "4-6", questionText: "If $f(x) = x^2 + 2$, find $f(-3)$.", answer: "$11$" },
  { id: "alg-46-14", topicId: "algebra", subtopic: "Algebraic fractions", difficulty: "4-6", questionText: "Simplify $\\frac{6x}{3x^2}$.", answer: "$\\frac{2}{x}$" },
  { id: "alg-46-15", topicId: "algebra", subtopic: "Algebraic fractions", difficulty: "4-6", questionText: "Simplify $\\frac{x^2 - 4}{x + 2}$.", answer: "$x - 2$" },
  { id: "alg-46-16", topicId: "algebra", subtopic: "Completing the square", difficulty: "4-6", questionText: "Write $x^2 + 4x$ in the form $(x + a)^2 + b$.", answer: "$(x + 2)^2 - 4$" },
  { id: "alg-46-17", topicId: "algebra", subtopic: "Completing the square", difficulty: "4-6", questionText: "Write $x^2 - 10x + 20$ in the form $(x + a)^2 + b$.", answer: "$(x - 5)^2 - 5$" },
  { id: "alg-46-18", topicId: "algebra", subtopic: "The quadratic formula", difficulty: "4-6", questionText: "Solve $x^2 + 5x + 4 = 0$ using the quadratic formula.", answer: "$x = -1$ or $x = -4$" },
  { id: "alg-46-19", topicId: "algebra", subtopic: "The quadratic formula", difficulty: "4-6", questionText: "Solve $x^2 - 3x - 10 = 0$.", answer: "$x = 5$ or $x = -2$" },
  // Diagram question
  {
    id: "alg-d2", topicId: "algebra", subtopic: "Quadratic and cubic graphs", difficulty: "4-6",
    questionText: "From the graph of $y = x^2 - 4$ below, write down the roots and the y-intercept.",
    answer: "Roots: $x = -2$ and $x = 2$. y-intercept: $(0, -4)$.",
    diagram: {
      type: "coordinate_graph",
      xRange: [-4, 4],
      yRange: [-5, 6],
      grid: true,
      xLabel: "x",
      yLabel: "y",
      plots: [{ equation: "y = x^2 - 4", fn: "x*x - 4", color: "#818cf8", label: "y = x² − 4" }],
      points: [
        { point: { x: -2, y: 0 }, label: "(−2, 0)" },
        { point: { x: 2, y: 0 }, label: "(2, 0)" },
        { point: { x: 0, y: -4 }, label: "(0, −4)" },
      ],
    },
  },
];

const ALGEBRA_G7_9: QuestionBankEntry[] = [
  { id: "alg-h1", topicId: "algebra", subtopic: "Completing the square", difficulty: "7-9", questionText: "Write $x^2 + 6x + 2$ in the form $(x + a)^2 + b$", answer: "$(x + 3)^2 - 7$" },
  { id: "alg-h2", topicId: "algebra", subtopic: "Completing the square", difficulty: "7-9", questionText: "Solve $x^2 - 8x + 10 = 0$ by completing the square. Give your answer in surd form.", answer: "$x = 4 \\pm \\sqrt{6}$" },
  { id: "alg-h3", topicId: "algebra", subtopic: "The quadratic formula", difficulty: "7-9", questionText: "Use the quadratic formula to solve $2x^2 + 5x - 3 = 0$", answer: "$x = \\frac{1}{2}$ or $x = -3$" },
  { id: "alg-h4", topicId: "algebra", subtopic: "Algebraic fractions", difficulty: "7-9", questionText: "Simplify $\\frac{x^2 - 9}{x^2 - x - 6}$", answer: "$\\frac{x + 3}{x + 2}$", hintText: "Factorise the numerator and denominator separately." },
  { id: "alg-h5", topicId: "algebra", subtopic: "Algebraic fractions", difficulty: "7-9", questionText: "Solve $\\frac{3}{x+1} + \\frac{2}{x-1} = 1$", answer: "$x = 1 \\pm \\sqrt{6}$" },
  { id: "alg-h6", topicId: "algebra", subtopic: "Simultaneous equations", difficulty: "7-9", questionText: "Solve simultaneously:\n$y = x^2 - 3x + 2$\n$y = 2x - 2$", answer: "$x = 1,\\ y = 0$ and $x = 4,\\ y = 6$" },
  { id: "alg-h7", topicId: "algebra", subtopic: "The quadratic formula", difficulty: "7-9", questionText: "A rectangle has length $(x + 5)$ cm and width $(x - 2)$ cm. Its area is 60 cm². Find $x$.", answer: "$x = 7$" },
  { id: "alg-h8", topicId: "algebra", subtopic: "Inequalities", difficulty: "7-9", questionText: "Solve $x^2 - 5x + 6 < 0$", answer: "$2 < x < 3$" },
  { id: "alg-h9", topicId: "algebra", subtopic: "Completing the square", difficulty: "7-9", questionText: "Find the minimum value of $x^2 - 4x + 7$ and the value of $x$ at which it occurs.", answer: "Minimum value is $3$ when $x = 2$" },
  { id: "alg-h10", topicId: "algebra", subtopic: "Factorising", difficulty: "7-9", questionText: "Factorise $6x^2 + x - 12$", answer: "$(2x + 3)(3x - 4)$" },
  // New — filling gaps
  { id: "alg-79-1", topicId: "algebra", subtopic: "Expressions and simplifying", difficulty: "7-9", questionText: "Show that $(n + 1)^2 - (n - 1)^2$ is always a multiple of 4.", answer: "$(n+1)^2 - (n-1)^2 = 4n$, which is divisible by 4." },
  { id: "alg-79-2", topicId: "algebra", subtopic: "Expressions and simplifying", difficulty: "7-9", questionText: "Simplify fully $\\frac{2x^2 + 6x}{x^2 + 5x + 6}$.", answer: "$\\frac{2x}{x + 2}$" },
  { id: "alg-79-3", topicId: "algebra", subtopic: "Expanding brackets", difficulty: "7-9", questionText: "Expand and simplify $(2x + 3)(x - 1)(x + 2)$", answer: "$2x^3 + 5x^2 - x - 6$" },
  { id: "alg-79-4", topicId: "algebra", subtopic: "Expanding brackets", difficulty: "7-9", questionText: "Expand and simplify $(x + 3)^3$", answer: "$x^3 + 9x^2 + 27x + 27$" },
  { id: "alg-79-5", topicId: "algebra", subtopic: "Sequences", difficulty: "7-9", questionText: "Find the $n$th term of the quadratic sequence 3, 8, 15, 24, ...", answer: "$n^2 + 2n$" },
  { id: "alg-79-6", topicId: "algebra", subtopic: "Sequences", difficulty: "7-9", questionText: "The first three terms of a geometric sequence are 2, 6, 18. Find the 6th term.", answer: "$2 \\times 3^5 = 486$" },
  { id: "alg-79-7", topicId: "algebra", subtopic: "Sequences", difficulty: "7-9", questionText: "Prove that the sum of the first $n$ terms of 2, 4, 6, 8, ... is $n(n + 1)$.", answer: "$S_n = \\frac{n}{2}(2 + 2n) = n(n + 1)$." },
  { id: "alg-79-8", topicId: "algebra", subtopic: "Straight line graphs", difficulty: "7-9", questionText: "Find the equation of the line perpendicular to $y = 2x - 3$ that passes through $(4, 1)$.", answer: "$y = -\\frac{1}{2}x + 3$" },
  { id: "alg-79-9", topicId: "algebra", subtopic: "Straight line graphs", difficulty: "7-9", questionText: "Find the equation of the line passing through $(2, 5)$ and $(6, 13)$.", answer: "$y = 2x + 1$" },
  { id: "alg-79-10", topicId: "algebra", subtopic: "Straight line graphs", difficulty: "7-9", questionText: "Line $L$ passes through $(-1, 3)$ and is parallel to $3x + y = 7$. Find the equation of $L$.", answer: "$y = -3x$" },
  { id: "alg-79-11", topicId: "algebra", subtopic: "Quadratic and cubic graphs", difficulty: "7-9", questionText: "By completing the square, find the turning point of $y = 2x^2 - 8x + 5$.", answer: "$(2, -3)$" },
  { id: "alg-79-12", topicId: "algebra", subtopic: "Quadratic and cubic graphs", difficulty: "7-9", questionText: "Sketch $y = x^3 - 3x^2$. Find the coordinates where it crosses the x-axis.", answer: "$x = 0$ (touching) and $x = 3$. Factorised: $y = x^2(x - 3)$." },
  { id: "alg-79-13", topicId: "algebra", subtopic: "Functions", difficulty: "7-9", questionText: "If $f(x) = 2x + 3$ and $g(x) = x^2$, find $fg(x)$.", answer: "$2x^2 + 3$" },
  { id: "alg-79-14", topicId: "algebra", subtopic: "Functions", difficulty: "7-9", questionText: "Find the inverse function of $f(x) = \\frac{2x + 1}{3}$.", answer: "$f^{-1}(x) = \\frac{3x - 1}{2}$" },
  { id: "alg-79-15", topicId: "algebra", subtopic: "Solving equations", difficulty: "7-9", questionText: "Solve $\\frac{2x + 1}{3} - \\frac{x - 2}{4} = 2$", answer: "$x = \\frac{14}{5}$" },
  { id: "alg-79-16", topicId: "algebra", subtopic: "Solving equations", difficulty: "7-9", questionText: "Solve $\\frac{5}{x - 1} = \\frac{3}{x + 2}$", answer: "$x = -\\frac{13}{2}$" },
];

// ── GEOMETRY ───────────────────────────────────────────────────────────────

const GEOMETRY_G1_3: QuestionBankEntry[] = [
  { id: "geo-e1", topicId: "geometry", subtopic: "Area and perimeter", difficulty: "1-3", questionText: "Find the area of a rectangle with length 8 cm and width 5 cm.", answer: "$40\\text{ cm}^2$" },
  { id: "geo-e2", topicId: "geometry", subtopic: "Area and perimeter", difficulty: "1-3", questionText: "Find the perimeter of a square with side length 6 cm.", answer: "$24\\text{ cm}$" },
  { id: "geo-e3", topicId: "geometry", subtopic: "Area and perimeter", difficulty: "1-3", questionText: "Find the area of a triangle with base 10 cm and height 7 cm.", answer: "$35\\text{ cm}^2$" },
  { id: "geo-e4", topicId: "geometry", subtopic: "Polygons", difficulty: "1-3", questionText: "What is the sum of angles in a triangle?", answer: "$180°$" },
  { id: "geo-e5", topicId: "geometry", subtopic: "Polygons", difficulty: "1-3", questionText: "Find the missing angle in a triangle if the other two angles are 55° and 70°.", answer: "$55°$" },
  { id: "geo-e6", topicId: "geometry", subtopic: "Transformations", difficulty: "1-3", questionText: "Describe the single transformation that maps shape A at (1, 2) to shape B at (4, 5).", answer: "Translation by $\\binom{3}{3}$" },
  { id: "geo-e7", topicId: "geometry", subtopic: "Pythagoras' theorem", difficulty: "1-3", questionText: "Find the hypotenuse of a right-angled triangle with sides 3 cm and 4 cm.", answer: "$5\\text{ cm}$" },
  { id: "geo-e8", topicId: "geometry", subtopic: "Area and perimeter", difficulty: "1-3", questionText: "Find the circumference of a circle with radius 7 cm. Give your answer in terms of $\\pi$.", answer: "$14\\pi\\text{ cm}$" },
  { id: "geo-e9", topicId: "geometry", subtopic: "Polygons", difficulty: "1-3", questionText: "Find the sum of the interior angles of a hexagon.", answer: "$720°$" },
  { id: "geo-e10", topicId: "geometry", subtopic: "Area and perimeter", difficulty: "1-3", questionText: "Find the area of a circle with radius 5 cm. Give your answer in terms of $\\pi$.", answer: "$25\\pi\\text{ cm}^2$" },
  // New — filling gaps
  { id: "geo-13-1", topicId: "geometry", subtopic: "Angles", difficulty: "1-3", questionText: "Find the missing angle on a straight line if one angle is 110°.", answer: "$70°$" },
  { id: "geo-13-2", topicId: "geometry", subtopic: "Angles", difficulty: "1-3", questionText: "Two angles are vertically opposite. One is 65°. What is the other?", answer: "$65°$" },
  { id: "geo-13-3", topicId: "geometry", subtopic: "Angles", difficulty: "1-3", questionText: "Work out the missing angle in a triangle with angles 40° and 80°.", answer: "$60°$" },
  { id: "geo-13-4", topicId: "geometry", subtopic: "Volume", difficulty: "1-3", questionText: "Find the volume of a cuboid with length 5 cm, width 3 cm and height 4 cm.", answer: "$60\\text{ cm}^3$" },
  { id: "geo-13-5", topicId: "geometry", subtopic: "Volume", difficulty: "1-3", questionText: "Find the volume of a cube with side length 4 cm.", answer: "$64\\text{ cm}^3$" },
  { id: "geo-13-6", topicId: "geometry", subtopic: "Bearings", difficulty: "1-3", questionText: "What bearing is due East?", answer: "$090°$" },
  { id: "geo-13-7", topicId: "geometry", subtopic: "Bearings", difficulty: "1-3", questionText: "The bearing from A to B is 040°. What is the bearing from B to A?", answer: "$220°$" },
  { id: "geo-13-8", topicId: "geometry", subtopic: "Bearings", difficulty: "1-3", questionText: "What bearing is due South?", answer: "$180°$" },
  { id: "geo-13-9", topicId: "geometry", subtopic: "Loci and constructions", difficulty: "1-3", questionText: "What is the locus of points equidistant from a single point P?", answer: "A circle with centre P." },
  { id: "geo-13-10", topicId: "geometry", subtopic: "Loci and constructions", difficulty: "1-3", questionText: "What tool do you use to draw a circle with a fixed radius?", answer: "A pair of compasses." },
  { id: "geo-13-11", topicId: "geometry", subtopic: "Trigonometry (SOH CAH TOA)", difficulty: "1-3", questionText: "In a right-angled triangle, the opposite side is 3 cm and the adjacent side is 4 cm. Which ratio gives the angle?", answer: "$\\tan \\theta = \\frac{3}{4}$" },
  { id: "geo-13-12", topicId: "geometry", subtopic: "Trigonometry (SOH CAH TOA)", difficulty: "1-3", questionText: "In a right-angled triangle, the hypotenuse is 10 cm and the opposite side is 6 cm. Find the angle to the nearest degree.", answer: "$\\sin^{-1}(0.6) \\approx 37°$" },
  { id: "geo-13-13", topicId: "geometry", subtopic: "Transformations", difficulty: "1-3", questionText: "Reflect the point $(3, 2)$ in the x-axis.", answer: "$(3, -2)$" },
  // Diagram questions
  {
    id: "geo-d1", topicId: "geometry", subtopic: "Polygons", difficulty: "1-3",
    questionText: "Find the missing angle $x$ in the triangle below.",
    answer: "$x = 60°$",
    hintText: "Angles in a triangle add up to 180°.",
    diagram: {
      type: "labeled_shape",
      shape: "triangle",
      vertices: [{ label: "A" }, { label: "B" }, { label: "C" }],
      angles: [
        { vertex: "A", degrees: 50, label: "50°" },
        { vertex: "B", degrees: 70, label: "70°" },
        { vertex: "C", degrees: 60, label: "x" },
      ],
    },
  },
  {
    id: "geo-d2", topicId: "geometry", subtopic: "Area and perimeter", difficulty: "1-3",
    questionText: "Find the area of the rectangle below.",
    answer: "$40\\text{ cm}^2$",
    diagram: {
      type: "labeled_shape",
      shape: "rectangle",
      vertices: [{ label: "A" }, { label: "B" }, { label: "C" }, { label: "D" }],
      sides: [
        { from: "A", to: "B", label: "8 cm" },
        { from: "B", to: "C", label: "5 cm" },
      ],
    },
  },
  {
    id: "geo-d3", topicId: "geometry", subtopic: "Pythagoras' theorem", difficulty: "1-3",
    questionText: "Find the length of the hypotenuse in the right-angled triangle below.",
    answer: "$5\\text{ cm}$",
    diagram: {
      type: "labeled_shape",
      shape: "triangle",
      vertices: [{ label: "A" }, { label: "B" }, { label: "C" }],
      sides: [
        { from: "A", to: "B", label: "3 cm" },
        { from: "B", to: "C", label: "4 cm" },
        { from: "A", to: "C", label: "?" },
      ],
      angles: [{ vertex: "B", degrees: 90, label: "90°", isRightAngle: true }],
    },
  },
];

const GEOMETRY_G4_6: QuestionBankEntry[] = [
  { id: "geo-m1", topicId: "geometry", subtopic: "Pythagoras' theorem", difficulty: "4-6", questionText: "A ladder leans against a wall. The foot is 5 m from the wall and the ladder is 13 m long. How high up the wall does it reach?", answer: "$12\\text{ m}$" },
  { id: "geo-m2", topicId: "geometry", subtopic: "Trigonometry (SOH CAH TOA)", difficulty: "4-6", questionText: "In a right-angled triangle, the opposite side is 8 cm and the hypotenuse is 10 cm. Find the angle. Give your answer to 1 d.p.", answer: "$53.1°$" },
  { id: "geo-m3", topicId: "geometry", subtopic: "Trigonometry (SOH CAH TOA)", difficulty: "4-6", questionText: "Find the length of the adjacent side in a right-angled triangle where the angle is 40° and the hypotenuse is 12 cm. Give your answer to 1 d.p.", answer: "$9.2\\text{ cm}$" },
  { id: "geo-m4", topicId: "geometry", subtopic: "Area and perimeter", difficulty: "4-6", questionText: "Find the area of a trapezium with parallel sides 6 cm and 10 cm, and height 4 cm.", answer: "$32\\text{ cm}^2$" },
  { id: "geo-m5", topicId: "geometry", subtopic: "Polygons", difficulty: "4-6", questionText: "Find the size of each interior angle of a regular octagon.", answer: "$135°$" },
  { id: "geo-m6", topicId: "geometry", subtopic: "Transformations", difficulty: "4-6", questionText: "Describe a reflection of the point (3, 2) in the line $y = x$.", answer: "$(2, 3)$" },
  { id: "geo-m7", topicId: "geometry", subtopic: "Pythagoras' theorem", difficulty: "4-6", questionText: "A ship sails 8 km north and then 6 km east. How far is it from its starting point?", answer: "$10\\text{ km}$" },
  { id: "geo-m8", topicId: "geometry", subtopic: "Area and perimeter", difficulty: "4-6", questionText: "Find the area of a sector with radius 9 cm and angle 60°. Give your answer in terms of $\\pi$.", answer: "$\\frac{27\\pi}{2}\\text{ cm}^2$" },
  { id: "geo-m9", topicId: "geometry", subtopic: "Trigonometry (SOH CAH TOA)", difficulty: "4-6", questionText: "A tree casts a shadow 15 m long. The angle of elevation of the sun is 35°. Find the height of the tree to 1 d.p.", answer: "$10.5\\text{ m}$" },
  { id: "geo-m10", topicId: "geometry", subtopic: "Volume", difficulty: "4-6", questionText: "Find the volume of a cylinder with radius 4 cm and height 10 cm. Give your answer in terms of $\\pi$.", answer: "$160\\pi\\text{ cm}^3$" },
  // New — filling gaps
  { id: "geo-46-1", topicId: "geometry", subtopic: "Angles", difficulty: "4-6", questionText: "Two parallel lines are cut by a transversal. One alternate angle is 65°. Find the other.", answer: "$65°$" },
  { id: "geo-46-2", topicId: "geometry", subtopic: "Angles", difficulty: "4-6", questionText: "Find the exterior angle of a regular decagon.", answer: "$36°$" },
  { id: "geo-46-3", topicId: "geometry", subtopic: "Angles", difficulty: "4-6", questionText: "Two co-interior angles on parallel lines: one is 115°. Find the other.", answer: "$65°$" },
  { id: "geo-46-4", topicId: "geometry", subtopic: "Bearings", difficulty: "4-6", questionText: "The bearing from P to Q is 070°. The bearing from P to R is 160°. Find angle QPR.", answer: "$90°$" },
  { id: "geo-46-5", topicId: "geometry", subtopic: "Bearings", difficulty: "4-6", questionText: "A ship sails 50 km on a bearing of 120°. How far south has it travelled? Give your answer to 1 d.p.", answer: "$25\\text{ km}$", hintText: "Use $\\cos 60°$." },
  { id: "geo-46-6", topicId: "geometry", subtopic: "Loci and constructions", difficulty: "4-6", questionText: "What is the locus of points equidistant from two fixed points A and B?", answer: "The perpendicular bisector of AB." },
  { id: "geo-46-7", topicId: "geometry", subtopic: "Loci and constructions", difficulty: "4-6", questionText: "Construct the angle bisector of a 70° angle using a ruler and compasses. What angle does each half measure?", answer: "$35°$" },
  { id: "geo-46-8", topicId: "geometry", subtopic: "Circle theorems", difficulty: "4-6", questionText: "An angle in a semicircle is always what type of angle?", answer: "A right angle (90°)." },
  { id: "geo-46-9", topicId: "geometry", subtopic: "Circle theorems", difficulty: "4-6", questionText: "The angle at the centre is 100°. What is the angle at the circumference subtended by the same arc?", answer: "$50°$" },
  { id: "geo-46-10", topicId: "geometry", subtopic: "Vectors", difficulty: "4-6", questionText: "If $\\vec{a} = \\binom{3}{2}$ and $\\vec{b} = \\binom{1}{-4}$, find $\\vec{a} + \\vec{b}$.", answer: "$\\binom{4}{-2}$" },
  { id: "geo-46-11", topicId: "geometry", subtopic: "Vectors", difficulty: "4-6", questionText: "Find $2\\vec{a}$ where $\\vec{a} = \\binom{-1}{5}$.", answer: "$\\binom{-2}{10}$" },
  { id: "geo-46-12", topicId: "geometry", subtopic: "Similarity and congruence", difficulty: "4-6", questionText: "Two similar triangles have sides 3, 4, 5 cm and the longest side of the larger is 10 cm. Find the other two sides.", answer: "6 cm and 8 cm" },
  { id: "geo-46-13", topicId: "geometry", subtopic: "Similarity and congruence", difficulty: "4-6", questionText: "State three conditions that prove two triangles are congruent.", answer: "SSS, SAS, ASA (or AAS, RHS)." },
  { id: "geo-46-14", topicId: "geometry", subtopic: "Volume", difficulty: "4-6", questionText: "Find the volume of a triangular prism with cross-section area 12 cm² and length 8 cm.", answer: "$96\\text{ cm}^3$" },
  { id: "geo-46-15", topicId: "geometry", subtopic: "Transformations", difficulty: "4-6", questionText: "Describe the single transformation: $(1,1),(3,1),(1,3)$ maps to $(-1,1),(-3,1),(-1,3)$.", answer: "Reflection in the y-axis." },
  // Diagram questions
  {
    id: "geo-d4", topicId: "geometry", subtopic: "Area and perimeter", difficulty: "4-6",
    questionText: "Find the area of the trapezium below.",
    answer: "$32\\text{ cm}^2$",
    diagram: {
      type: "labeled_shape",
      shape: "trapezium",
      vertices: [{ label: "A" }, { label: "B" }, { label: "C" }, { label: "D" }],
      sides: [
        { from: "A", to: "B", label: "6 cm" },
        { from: "D", to: "C", label: "10 cm" },
        { from: "B", to: "C", label: "4 cm" },
      ],
      angles: [{ vertex: "B", degrees: 90, label: "90°", isRightAngle: true }],
    },
  },
  {
    id: "geo-d5", topicId: "geometry", subtopic: "Trigonometry (SOH CAH TOA)", difficulty: "4-6",
    questionText: "Find the angle $\\theta$ in the right-angled triangle below. Give your answer to 1 d.p.",
    answer: "$\\theta \\approx 53.1°$",
    hintText: "Use $\\sin \\theta = \\frac{\\text{opp}}{\\text{hyp}}$",
    diagram: {
      type: "labeled_shape",
      shape: "triangle",
      vertices: [{ label: "A" }, { label: "B" }, { label: "C" }],
      sides: [
        { from: "A", to: "C", label: "10 cm" },
        { from: "B", to: "C", label: "8 cm" },
      ],
      angles: [
        { vertex: "A", degrees: 53.1, label: "θ" },
        { vertex: "B", degrees: 90, label: "90°", isRightAngle: true },
      ],
    },
  },
  {
    id: "geo-d6", topicId: "geometry", subtopic: "Polygons", difficulty: "4-6",
    questionText: "Find the sum of interior angles of the regular pentagon below. Then find each interior angle.",
    answer: "Sum $= 540°$. Each interior angle $= 108°$.",
    diagram: {
      type: "labeled_shape",
      shape: "polygon",
      vertices: [{ label: "A" }, { label: "B" }, { label: "C" }, { label: "D" }, { label: "E" }],
    },
  },
  {
    id: "geo-d7", topicId: "geometry", subtopic: "Circle theorems", difficulty: "4-6",
    questionText: "O is the centre of the circle. The angle at the centre is 130°. Find the angle at the circumference.",
    answer: "$65°$",
    hintText: "The angle at the centre is twice the angle at the circumference.",
    diagram: {
      type: "labeled_shape",
      shape: "circle",
      vertices: [{ label: "O" }, { label: "A" }, { label: "B" }, { label: "C" }],
      circle: { center: "O", showRadius: true },
      angles: [{ vertex: "O", degrees: 130, label: "130°" }],
    },
  },
];

const GEOMETRY_G7_9: QuestionBankEntry[] = [
  { id: "geo-h1", topicId: "geometry", subtopic: "Circle theorems", difficulty: "7-9", questionText: "The angle at the centre of a circle is 140°. Find the angle at the circumference subtended by the same arc.", answer: "$70°$" },
  { id: "geo-h2", topicId: "geometry", subtopic: "Circle theorems", difficulty: "7-9", questionText: "A, B, C and D are points on a circle. Angle ABC = 75°. Find angle ADC.", answer: "$105°$", hintText: "Opposite angles in a cyclic quadrilateral add up to 180°." },
  { id: "geo-h3", topicId: "geometry", subtopic: "Vectors", difficulty: "7-9", questionText: "If $\\vec{OA} = \\binom{3}{5}$ and $\\vec{OB} = \\binom{7}{-1}$, find $\\vec{AB}$.", answer: "$\\binom{4}{-6}$" },
  { id: "geo-h4", topicId: "geometry", subtopic: "Vectors", difficulty: "7-9", questionText: "M is the midpoint of AB. $\\vec{OA} = \\mathbf{a}$ and $\\vec{OB} = \\mathbf{b}$. Write $\\vec{OM}$ in terms of $\\mathbf{a}$ and $\\mathbf{b}$.", answer: "$\\frac{1}{2}(\\mathbf{a} + \\mathbf{b})$" },
  { id: "geo-h5", topicId: "geometry", subtopic: "Trigonometry (SOH CAH TOA)", difficulty: "7-9", questionText: "In triangle ABC, AB = 10 cm, angle A = 50°, angle B = 60°. Find BC using the sine rule. Give your answer to 1 d.p.", answer: "$8.9\\text{ cm}$" },
  { id: "geo-h6", topicId: "geometry", subtopic: "Trigonometry (SOH CAH TOA)", difficulty: "7-9", questionText: "Find the area of a triangle with sides $a = 7$ cm, $b = 9$ cm and included angle $C = 65°$. Give your answer to 1 d.p.", answer: "$28.6\\text{ cm}^2$", hintText: "Use $\\frac{1}{2}ab\\sin C$." },
  { id: "geo-h7", topicId: "geometry", subtopic: "Circle theorems", difficulty: "7-9", questionText: "PT is a tangent to a circle at T. The chord TA makes an angle of 55° with PT. Find the angle in the alternate segment.", answer: "$55°$" },
  { id: "geo-h8", topicId: "geometry", subtopic: "Pythagoras' theorem", difficulty: "7-9", questionText: "Find the length of the space diagonal of a cuboid with dimensions 3 cm, 4 cm and 12 cm.", answer: "$13\\text{ cm}$" },
  { id: "geo-h9", topicId: "geometry", subtopic: "Area and perimeter", difficulty: "7-9", questionText: "A cone has radius 6 cm and slant height 10 cm. Find the total surface area. Give your answer in terms of $\\pi$.", answer: "$96\\pi\\text{ cm}^2$" },
  { id: "geo-h10", topicId: "geometry", subtopic: "Vectors", difficulty: "7-9", questionText: "P divides AB in the ratio 2 : 3. $\\vec{OA} = \\mathbf{a}$, $\\vec{OB} = \\mathbf{b}$. Express $\\vec{OP}$ in terms of $\\mathbf{a}$ and $\\mathbf{b}$.", answer: "$\\frac{3}{5}\\mathbf{a} + \\frac{2}{5}\\mathbf{b}$" },
  // New — filling gaps
  { id: "geo-79-1", topicId: "geometry", subtopic: "Angles", difficulty: "7-9", questionText: "The interior angle of a regular polygon is 156°. How many sides does it have?", answer: "Exterior = $24°$. Sides = $360 \\div 24 = 15$." },
  { id: "geo-79-2", topicId: "geometry", subtopic: "Angles", difficulty: "7-9", questionText: "Prove that the exterior angle of a triangle equals the sum of the two opposite interior angles.", answer: "The three interior angles sum to 180°. The exterior angle and its adjacent interior angle also sum to 180°. So the exterior angle equals the sum of the other two." },
  { id: "geo-79-3", topicId: "geometry", subtopic: "Bearings", difficulty: "7-9", questionText: "A ship sails 12 km on bearing 060° then 16 km on bearing 150°. Find the direct distance from start to finish.", answer: "$20\\text{ km}$", hintText: "The angle between the legs is 90°. Use Pythagoras." },
  { id: "geo-79-4", topicId: "geometry", subtopic: "Bearings", difficulty: "7-9", questionText: "From point A, the bearing of B is 245°. Find the bearing of A from B.", answer: "$065°$" },
  { id: "geo-79-5", topicId: "geometry", subtopic: "Loci and constructions", difficulty: "7-9", questionText: "In triangle ABC, shade the region closer to AB than AC and less than 3 cm from B. Describe the constructions needed.", answer: "Construct the angle bisector of angle A. Draw an arc radius 3 cm at B. The region is the intersection." },
  { id: "geo-79-6", topicId: "geometry", subtopic: "Loci and constructions", difficulty: "7-9", questionText: "A rectangular garden is 20 m × 15 m. A tree must be more than 5 m from each wall. What area is available?", answer: "$(20 - 10)(15 - 10) = 50\\text{ m}^2$" },
  { id: "geo-79-7", topicId: "geometry", subtopic: "Volume", difficulty: "7-9", questionText: "Find the volume of a cone with radius 6 cm and height 10 cm. Give your answer in terms of $\\pi$.", answer: "$120\\pi\\text{ cm}^3$" },
  { id: "geo-79-8", topicId: "geometry", subtopic: "Volume", difficulty: "7-9", questionText: "A sphere has radius 5 cm. Find its volume in terms of $\\pi$.", answer: "$\\frac{500\\pi}{3}\\text{ cm}^3$" },
  { id: "geo-79-9", topicId: "geometry", subtopic: "Transformations", difficulty: "7-9", questionText: "Describe fully the single transformation that maps $(1, 2)$ to $(2, -1)$.", answer: "Rotation 90° clockwise about the origin." },
  { id: "geo-79-10", topicId: "geometry", subtopic: "Transformations", difficulty: "7-9", questionText: "Triangle A has vertices $(1,1),(3,1),(1,3)$. It is enlarged by scale factor $-2$ about the origin. Find the image vertices.", answer: "$(-2,-2),(-6,-2),(-2,-6)$" },
  { id: "geo-79-11", topicId: "geometry", subtopic: "Similarity and congruence", difficulty: "7-9", questionText: "Two similar triangles have areas 18 cm² and 50 cm². The smaller has a side of 6 cm. Find the corresponding side of the larger.", answer: "Area ratio $= \\frac{25}{9}$. Length ratio $= \\frac{5}{3}$. Side $= 10$ cm." },
  { id: "geo-79-12", topicId: "geometry", subtopic: "Similarity and congruence", difficulty: "7-9", questionText: "DE is parallel to BC in triangle ABC. Prove that triangles ADE and ABC are similar.", answer: "Angle A is common. Angle ADE = angle ABC (corresponding, DE ∥ BC). So AA similarity." },
  { id: "geo-79-13", topicId: "geometry", subtopic: "Polygons", difficulty: "7-9", questionText: "The sum of interior angles of a polygon is 3240°. How many sides?", answer: "$(n-2) \\times 180 = 3240$, so $n = 20$." },
  { id: "geo-79-14", topicId: "geometry", subtopic: "Polygons", difficulty: "7-9", questionText: "A regular polygon has exterior angle 24°. Find the number of sides and each interior angle.", answer: "Sides = $15$. Interior = $156°$." },
  // Diagram questions
  {
    id: "geo-d8", topicId: "geometry", subtopic: "Circle theorems", difficulty: "7-9",
    questionText: "A, B, C and D are points on a circle. Angle ABC = 75°. Find angle ADC.",
    answer: "$105°$",
    hintText: "Opposite angles in a cyclic quadrilateral add up to 180°.",
    diagram: {
      type: "labeled_shape",
      shape: "circle",
      vertices: [{ label: "A" }, { label: "B" }, { label: "C" }, { label: "D" }],
      circle: { center: "O" },
      angles: [{ vertex: "B", degrees: 75, label: "75°" }],
    },
  },
  {
    id: "geo-d9", topicId: "geometry", subtopic: "Trigonometry (SOH CAH TOA)", difficulty: "7-9",
    questionText: "Find the area of triangle ABC using $\\frac{1}{2}ab\\sin C$.",
    answer: "$28.6\\text{ cm}^2$",
    diagram: {
      type: "labeled_shape",
      shape: "triangle",
      vertices: [{ label: "A" }, { label: "B" }, { label: "C" }],
      sides: [
        { from: "A", to: "B", label: "7 cm" },
        { from: "A", to: "C", label: "9 cm" },
      ],
      angles: [{ vertex: "A", degrees: 65, label: "65°" }],
    },
  },
  {
    id: "geo-d10", topicId: "geometry", subtopic: "Similarity and congruence", difficulty: "7-9",
    questionText: "Triangles ABC and DEF are similar. Find the length of EF.",
    answer: "$EF = 10\\text{ cm}$",
    hintText: "Scale factor = $\\frac{DE}{AB}$",
    diagram: {
      type: "labeled_shape",
      shape: "triangle",
      vertices: [{ label: "A" }, { label: "B" }, { label: "C" }],
      sides: [
        { from: "A", to: "B", label: "3 cm" },
        { from: "B", to: "C", label: "4 cm" },
        { from: "A", to: "C", label: "5 cm" },
      ],
    },
  },
];

// ── RATIO, PROPORTION & RATES OF CHANGE ───────────────────────────────────

const RATIO_G1_3: QuestionBankEntry[] = [
  { id: "rat-e1", topicId: "ratio", subtopic: "Sharing in a ratio", difficulty: "1-3", questionText: "Share £40 in the ratio 3 : 5.", answer: "£15 and £25" },
  { id: "rat-e2", topicId: "ratio", subtopic: "Ratio", difficulty: "1-3", questionText: "Simplify the ratio 15 : 25.", answer: "$3 : 5$" },
  { id: "rat-e3", topicId: "ratio", subtopic: "Sharing in a ratio", difficulty: "1-3", questionText: "Share 60 sweets in the ratio 2 : 3.", answer: "24 and 36" },
  { id: "rat-e4", topicId: "ratio", subtopic: "Ratio", difficulty: "1-3", questionText: "Write the ratio 4 : 12 in its simplest form.", answer: "$1 : 3$" },
  { id: "rat-e5", topicId: "ratio", subtopic: "Direct proportion", difficulty: "1-3", questionText: "5 pens cost £3.50. How much do 8 pens cost?", answer: "£5.60" },
  { id: "rat-e6", topicId: "ratio", subtopic: "Speed, distance, time", difficulty: "1-3", questionText: "A car travels 120 km in 2 hours. What is its speed?", answer: "60 km/h" },
  { id: "rat-e7", topicId: "ratio", subtopic: "Speed, distance, time", difficulty: "1-3", questionText: "How far does a cyclist travel in 3 hours at 15 km/h?", answer: "45 km" },
  { id: "rat-e8", topicId: "ratio", subtopic: "Scale factors", difficulty: "1-3", questionText: "A map has a scale of 1 : 50000. A road is 4 cm on the map. How long is the real road in km?", answer: "2 km" },
  { id: "rat-e9", topicId: "ratio", subtopic: "Direct proportion", difficulty: "1-3", questionText: "A recipe for 4 people uses 200g of flour. How much flour is needed for 6 people?", answer: "300g" },
  { id: "rat-e10", topicId: "ratio", subtopic: "Ratio", difficulty: "1-3", questionText: "The ratio of cats to dogs in a shelter is 5 : 3. There are 15 cats. How many dogs are there?", answer: "9" },
  // New
  { id: "rat-13-1", topicId: "ratio", subtopic: "Scale factors", difficulty: "1-3", questionText: "A photo is 6 cm wide and 4 cm tall. It is enlarged by scale factor 2. What are the new dimensions?", answer: "12 cm × 8 cm" },
  { id: "rat-13-2", topicId: "ratio", subtopic: "Ratio", difficulty: "1-3", questionText: "A bag has red and blue balls in the ratio 2 : 1. There are 12 red balls. How many blue?", answer: "$6$" },
];

const RATIO_G4_6: QuestionBankEntry[] = [
  { id: "rat-m1", topicId: "ratio", subtopic: "Sharing in a ratio", difficulty: "4-6", questionText: "Share £120 in the ratio 2 : 3 : 5.", answer: "£24, £36 and £60" },
  { id: "rat-m2", topicId: "ratio", subtopic: "Direct proportion", difficulty: "4-6", questionText: "A recipe for 4 people uses 300g of flour. How much flour is needed for 10 people?", answer: "$750\\text{g}$" },
  { id: "rat-m3", topicId: "ratio", subtopic: "Ratio", difficulty: "4-6", questionText: "The ratio of boys to girls in a class is 3 : 4. There are 12 boys. How many students in total?", answer: "$28$" },
  { id: "rat-m4", topicId: "ratio", subtopic: "Speed, distance, time", difficulty: "4-6", questionText: "A train travels at 90 mph. How long does it take to travel 315 miles? Give your answer in hours and minutes.", answer: "3 hours 30 minutes" },
  { id: "rat-m5", topicId: "ratio", subtopic: "Density and pressure", difficulty: "4-6", questionText: "A block has mass 540g and volume 200 cm³. Find its density.", answer: "$2.7\\text{ g/cm}^3$" },
  { id: "rat-m6", topicId: "ratio", subtopic: "Compound measures", difficulty: "4-6", questionText: "A tap fills a 60-litre tank in 5 minutes. What is the flow rate in litres per minute?", answer: "12 litres per minute" },
  { id: "rat-m7", topicId: "ratio", subtopic: "Direct proportion", difficulty: "4-6", questionText: "Which is better value: 500ml for £1.20 or 750ml for £1.65?", answer: "750ml (£0.0022/ml vs £0.0024/ml)" },
  { id: "rat-m8", topicId: "ratio", subtopic: "Scale factors", difficulty: "4-6", questionText: "Shape A is enlarged by scale factor 3 to make shape B. The area of A is 5 cm². What is the area of B?", answer: "$45\\text{ cm}^2$", hintText: "Area scale factor = linear scale factor²" },
  { id: "rat-m9", topicId: "ratio", subtopic: "Speed, distance, time", difficulty: "4-6", questionText: "A cyclist travels 24 km at 16 km/h, then 18 km at 12 km/h. Find the average speed for the whole journey.", answer: "14 km/h" },
  { id: "rat-m10", topicId: "ratio", subtopic: "Sharing in a ratio", difficulty: "4-6", questionText: "Ali and Ben share money in the ratio 5 : 3. Ali gets £30 more than Ben. How much does each get?", answer: "Ali = £75, Ben = £45" },
  // New — filling gaps
  { id: "rat-46-1", topicId: "ratio", subtopic: "Inverse proportion", difficulty: "4-6", questionText: "It takes 4 workers 12 hours to build a fence. How long would it take 6 workers?", answer: "8 hours" },
  { id: "rat-46-2", topicId: "ratio", subtopic: "Inverse proportion", difficulty: "4-6", questionText: "3 taps fill a pool in 8 hours. How long would 6 taps take?", answer: "4 hours" },
  { id: "rat-46-3", topicId: "ratio", subtopic: "Density and pressure", difficulty: "4-6", questionText: "A metal block has mass 750g and volume 100 cm³. Find its density.", answer: "$7.5\\text{ g/cm}^3$" },
  { id: "rat-46-4", topicId: "ratio", subtopic: "Compound measures", difficulty: "4-6", questionText: "A car uses 8 litres per 100 km. How much petrol for a 350 km journey?", answer: "28 litres" },
];

const RATIO_G7_9: QuestionBankEntry[] = [
  { id: "rat-h1", topicId: "ratio", subtopic: "Inverse proportion", difficulty: "7-9", questionText: "y is inversely proportional to $x^2$. When $x = 3$, $y = 4$. Find $y$ when $x = 6$.", answer: "$y = 1$" },
  { id: "rat-h2", topicId: "ratio", subtopic: "Direct proportion", difficulty: "7-9", questionText: "p is directly proportional to $\\sqrt{q}$. When $q = 16$, $p = 20$. Find $p$ when $q = 100$.", answer: "$p = 50$" },
  { id: "rat-h3", topicId: "ratio", subtopic: "Compound measures", difficulty: "7-9", questionText: "A force of 150 N acts on an area of 0.03 m². Calculate the pressure.", answer: "$5000\\text{ Pa}$" },
  { id: "rat-h4", topicId: "ratio", subtopic: "Inverse proportion", difficulty: "7-9", questionText: "It takes 6 workers 10 days to build a wall. How long would it take 4 workers?", answer: "15 days" },
  { id: "rat-h5", topicId: "ratio", subtopic: "Density and pressure", difficulty: "7-9", questionText: "A gold bar has density 19.3 g/cm³ and volume 50 cm³. Find its mass in kg.", answer: "0.965 kg" },
  { id: "rat-h6", topicId: "ratio", subtopic: "Scale factors", difficulty: "7-9", questionText: "Two similar cylinders have heights in the ratio 2 : 5. The volume of the smaller is 40 cm³. Find the volume of the larger.", answer: "$625\\text{ cm}^3$", hintText: "Volume scale factor = linear scale factor³" },
  { id: "rat-h7", topicId: "ratio", subtopic: "Direct proportion", difficulty: "7-9", questionText: "y is proportional to $x^3$. When $x = 2$, $y = 24$. Find $x$ when $y = 192$.", answer: "$x = 4$" },
  { id: "rat-h8", topicId: "ratio", subtopic: "Compound measures", difficulty: "7-9", questionText: "Convert a speed of 20 m/s into km/h.", answer: "72 km/h" },
  { id: "rat-h9", topicId: "ratio", subtopic: "Speed, distance, time", difficulty: "7-9", questionText: "Two cars start 300 km apart and drive towards each other at 70 km/h and 80 km/h. After how long do they meet?", answer: "2 hours" },
  { id: "rat-h10", topicId: "ratio", subtopic: "Sharing in a ratio", difficulty: "7-9", questionText: "Three friends share a prize in the ratio $x : 2x : 3x$. The largest share is £45 more than the smallest. Find the total prize.", answer: "£135" },
  // New
  { id: "rat-79-1", topicId: "ratio", subtopic: "Scale factors", difficulty: "7-9", questionText: "Two similar solids have surface areas 50 cm² and 200 cm². The smaller's volume is 100 cm³. Find the larger's volume.", answer: "$800\\text{ cm}^3$", hintText: "Area ratio = $k^2$, volume ratio = $k^3$." },
  { id: "rat-79-2", topicId: "ratio", subtopic: "Compound measures", difficulty: "7-9", questionText: "A substance has mass $2.4 \\times 10^3$ kg and volume $8 \\times 10^{-1}$ m³. Find its density.", answer: "$3000\\text{ kg/m}^3$" },
];

// ── PROBABILITY ────────────────────────────────────────────────────────────

const PROBABILITY_G1_3: QuestionBankEntry[] = [
  { id: "pro-e1", topicId: "probability", subtopic: "Probability scale", difficulty: "1-3", questionText: "A bag contains 3 red and 5 blue balls. One ball is picked at random. What is the probability it is red?", answer: "$\\frac{3}{8}$" },
  { id: "pro-e2", topicId: "probability", subtopic: "Probability scale", difficulty: "1-3", questionText: "A coin is flipped. What is the probability of getting heads?", answer: "$\\frac{1}{2}$" },
  { id: "pro-e3", topicId: "probability", subtopic: "Probability scale", difficulty: "1-3", questionText: "A dice is rolled. What is the probability of getting a number greater than 4?", answer: "$\\frac{1}{3}$" },
  { id: "pro-e4", topicId: "probability", subtopic: "Venn diagrams", difficulty: "1-3", questionText: "In a class of 30 students, 18 study French and 15 study Spanish. 8 study both. How many study neither?", answer: "$5$" },
  { id: "pro-e5", topicId: "probability", subtopic: "Venn diagrams", difficulty: "1-3", questionText: "Set A = {1, 2, 3, 4} and Set B = {3, 4, 5, 6}. Find $A \\cap B$.", answer: "$\\{3, 4\\}$" },
  { id: "pro-e6", topicId: "probability", subtopic: "Probability scale", difficulty: "1-3", questionText: "A bag contains 4 red, 3 blue and 3 green balls. What is the probability of picking a green ball?", answer: "$\\frac{3}{10}$" },
  { id: "pro-e7", topicId: "probability", subtopic: "Relative frequency", difficulty: "1-3", questionText: "A spinner is spun 50 times and lands on red 15 times. What is the relative frequency of red?", answer: "$\\frac{15}{50} = 0.3$" },
  { id: "pro-e8", topicId: "probability", subtopic: "Probability scale", difficulty: "1-3", questionText: "What is the probability of rolling an even number on a fair dice?", answer: "$\\frac{1}{2}$" },
  // New — filling gaps
  { id: "pro-13-1", topicId: "probability", subtopic: "Tree diagrams", difficulty: "1-3", questionText: "A coin is flipped twice. List all possible outcomes.", answer: "HH, HT, TH, TT" },
  { id: "pro-13-2", topicId: "probability", subtopic: "Tree diagrams", difficulty: "1-3", questionText: "A coin is flipped twice. What is the probability of getting two heads?", answer: "$\\frac{1}{4}$" },
  { id: "pro-13-3", topicId: "probability", subtopic: "Relative frequency", difficulty: "1-3", questionText: "A dice is rolled 60 times and lands on 3 a total of 15 times. Find the relative frequency of rolling a 3.", answer: "$\\frac{15}{60} = 0.25$" },
];

const PROBABILITY_G4_6: QuestionBankEntry[] = [
  { id: "pro-m1", topicId: "probability", subtopic: "Tree diagrams", difficulty: "4-6", questionText: "A bag has 4 red and 6 blue balls. Two balls are drawn without replacement. What is the probability both are red?", answer: "$\\frac{2}{15}$" },
  { id: "pro-m2", topicId: "probability", subtopic: "Tree diagrams", difficulty: "4-6", questionText: "The probability of rain on Monday is 0.3 and on Tuesday is 0.4 (independent). Find the probability it rains on both days.", answer: "$0.12$" },
  { id: "pro-m3", topicId: "probability", subtopic: "Venn diagrams", difficulty: "4-6", questionText: "P(A) = 0.5, P(B) = 0.4, P(A ∩ B) = 0.2. Find P(A ∪ B).", answer: "$0.7$" },
  { id: "pro-m4", topicId: "probability", subtopic: "Tree diagrams", difficulty: "4-6", questionText: "A spinner has P(red) = 0.6 and P(blue) = 0.4. It is spun twice. Find the probability of getting one of each colour.", answer: "$0.48$" },
  { id: "pro-m5", topicId: "probability", subtopic: "Relative frequency", difficulty: "4-6", questionText: "A biased coin is flipped 200 times and gets 130 heads. Estimate the probability of tails.", answer: "$\\frac{70}{200} = 0.35$" },
  { id: "pro-m6", topicId: "probability", subtopic: "Tree diagrams", difficulty: "4-6", questionText: "There are 5 red and 3 blue counters. Two are taken without replacement. Find P(both different colours).", answer: "$\\frac{15}{28}$" },
  { id: "pro-m7", topicId: "probability", subtopic: "Probability scale", difficulty: "4-6", questionText: "Events A and B are mutually exclusive. P(A) = 0.35 and P(B) = 0.25. Find P(A or B).", answer: "$0.6$" },
  { id: "pro-m8", topicId: "probability", subtopic: "Venn diagrams", difficulty: "4-6", questionText: "In a group of 40 students, 22 play football, 18 play tennis, and 5 play neither. How many play both?", answer: "$5$" },
  // New — filling gaps
  { id: "pro-46-1", topicId: "probability", subtopic: "Conditional probability", difficulty: "4-6", questionText: "A bag has 5 red and 3 blue balls. One is taken and not replaced, then another is taken. Find P(first red AND second blue).", answer: "$\\frac{5}{8} \\times \\frac{3}{7} = \\frac{15}{56}$" },
  { id: "pro-46-2", topicId: "probability", subtopic: "Conditional probability", difficulty: "4-6", questionText: "There are 4 boys and 6 girls. Two are chosen at random. What is the probability both are girls?", answer: "$\\frac{6}{10} \\times \\frac{5}{9} = \\frac{1}{3}$" },
  { id: "pro-46-3", topicId: "probability", subtopic: "Probability scale", difficulty: "4-6", questionText: "The probability of event A is 0.35. What is the probability A does not happen?", answer: "$0.65$" },
  { id: "pro-46-4", topicId: "probability", subtopic: "Venn diagrams", difficulty: "4-6", questionText: "P(A) = 0.6, P(B) = 0.3, P(A ∩ B) = 0.15. Find P(A but not B).", answer: "$0.45$" },
  // Diagram question
  {
    id: "pro-d1", topicId: "probability", subtopic: "Venn diagrams", difficulty: "4-6",
    questionText: "Use the Venn diagram below to find $P(A \\cup B)$. There are 50 students in total.",
    answer: "$P(A \\cup B) = \\frac{35}{50} = 0.7$",
    diagram: {
      type: "venn_diagram",
      sets: [{ label: "A", elements: [] }, { label: "B", elements: [] }],
      regions: [
        { region: "A_only", value: "15" },
        { region: "A_and_B", value: "10" },
        { region: "B_only", value: "10" },
        { region: "neither", value: "15" },
      ],
      universalLabel: "ξ",
      universalTotal: 50,
    },
  },
];

const PROBABILITY_G7_9: QuestionBankEntry[] = [
  { id: "pro-h1", topicId: "probability", subtopic: "Tree diagrams", difficulty: "7-9", questionText: "Box A has 3 red and 2 blue balls. Box B has 4 red and 1 blue ball. A box is chosen at random, then a ball drawn. Find P(red).", answer: "$\\frac{7}{10}$" },
  { id: "pro-h2", topicId: "probability", subtopic: "Tree diagrams", difficulty: "7-9", questionText: "Three coins are flipped. Find the probability of getting exactly 2 heads.", answer: "$\\frac{3}{8}$" },
  { id: "pro-h3", topicId: "probability", subtopic: "Venn diagrams", difficulty: "7-9", questionText: "P(A) = 0.6, P(B) = 0.5, P(A ∪ B) = 0.8. Are A and B independent? Show your working.", answer: "P(A ∩ B) = 0.6 + 0.5 − 0.8 = 0.3. P(A) × P(B) = 0.3. Since P(A ∩ B) = P(A) × P(B), yes they are independent." },
  { id: "pro-h4", topicId: "probability", subtopic: "Conditional probability", difficulty: "7-9", questionText: "A and B are independent events. P(A) = $x$, P(B) = $x + 0.1$, P(A ∩ B) = 0.12. Find $x$.", answer: "$x = 0.3$" },
  { id: "pro-h5", topicId: "probability", subtopic: "Tree diagrams", difficulty: "7-9", questionText: "A bag has 6 red and 4 blue balls. Three are drawn without replacement. Find P(all red).", answer: "$\\frac{1}{6}$" },
  { id: "pro-h6", topicId: "probability", subtopic: "Conditional probability", difficulty: "7-9", questionText: "P(A) = 0.4 and P(B|A) = 0.75. Find P(A ∩ B).", answer: "$0.3$" },
  // New — filling gaps
  { id: "pro-79-1", topicId: "probability", subtopic: "Probability scale", difficulty: "7-9", questionText: "Two events A and B are independent. P(A) = 0.3 and P(A ∩ B) = 0.12. Find P(B).", answer: "$P(B) = \\frac{0.12}{0.3} = 0.4$" },
  { id: "pro-79-2", topicId: "probability", subtopic: "Probability scale", difficulty: "7-9", questionText: "The probability of winning a game is $p$. Two independent games are played. P(winning both) = 0.16. Find $p$.", answer: "$p^2 = 0.16$, so $p = 0.4$." },
  { id: "pro-79-3", topicId: "probability", subtopic: "Relative frequency", difficulty: "7-9", questionText: "A biased spinner's relative frequency converges to 0.35 for red. Out of 400 spins, estimate how many land on red.", answer: "$0.35 \\times 400 = 140$" },
  { id: "pro-79-4", topicId: "probability", subtopic: "Relative frequency", difficulty: "7-9", questionText: "After 100 trials, relative frequency of A is 0.42. In 100 more trials, A occurs 38 times. Find the new relative frequency.", answer: "$\\frac{42 + 38}{200} = 0.4$" },
];

// ── STATISTICS ─────────────────────────────────────────────────────────────

const STATISTICS_G1_3: QuestionBankEntry[] = [
  { id: "sta-e1", topicId: "statistics", subtopic: "Averages (mean, median, mode)", difficulty: "1-3", questionText: "Find the mean of: 3, 5, 7, 9, 11", answer: "$7$" },
  { id: "sta-e2", topicId: "statistics", subtopic: "Averages (mean, median, mode)", difficulty: "1-3", questionText: "Find the median of: 2, 7, 4, 9, 3", answer: "$4$" },
  { id: "sta-e3", topicId: "statistics", subtopic: "Averages (mean, median, mode)", difficulty: "1-3", questionText: "Find the mode of: 4, 2, 5, 2, 8, 2, 9", answer: "$2$" },
  { id: "sta-e4", topicId: "statistics", subtopic: "Averages (mean, median, mode)", difficulty: "1-3", questionText: "Find the range of: 12, 5, 8, 15, 3", answer: "$12$" },
  { id: "sta-e5", topicId: "statistics", subtopic: "Averages (mean, median, mode)", difficulty: "1-3", questionText: "The mean of 5 numbers is 8. What is their total?", answer: "$40$" },
  { id: "sta-e6", topicId: "statistics", subtopic: "Scatter graphs", difficulty: "1-3", questionText: "What type of correlation does a scatter graph show if the points go up from left to right?", answer: "Positive correlation" },
  { id: "sta-e7", topicId: "statistics", subtopic: "Sampling", difficulty: "1-3", questionText: "A school has 600 boys and 400 girls. A stratified sample of 50 is needed. How many girls should be in the sample?", answer: "20" },
  { id: "sta-e8", topicId: "statistics", subtopic: "Averages (mean, median, mode)", difficulty: "1-3", questionText: "Find the mean of: 10, 12, 14, 16, 18", answer: "$14$" },
  // New — filling gaps
  { id: "sta-13-1", topicId: "statistics", subtopic: "Box plots", difficulty: "1-3", questionText: "From a box plot: min = 10, max = 40, median = 25. What is the range?", answer: "$30$" },
  { id: "sta-13-2", topicId: "statistics", subtopic: "Box plots", difficulty: "1-3", questionText: "From a box plot: Q1 = 15, Q3 = 35. Find the interquartile range.", answer: "$20$" },
  { id: "sta-13-3", topicId: "statistics", subtopic: "Scatter graphs", difficulty: "1-3", questionText: "As temperature increases, ice cream sales increase. What type of correlation is this?", answer: "Positive correlation." },
  { id: "sta-13-4", topicId: "statistics", subtopic: "Sampling", difficulty: "1-3", questionText: "Give one reason why a sample is used instead of surveying the whole population.", answer: "It is quicker, cheaper, or more practical than surveying everyone." },
];

const STATISTICS_G4_6: QuestionBankEntry[] = [
  { id: "sta-m1", topicId: "statistics", subtopic: "Averages (mean, median, mode)", difficulty: "4-6", questionText: "The mean of four numbers is 15. Three of the numbers are 12, 18 and 14. Find the fourth.", answer: "$16$" },
  { id: "sta-m2", topicId: "statistics", subtopic: "Cumulative frequency", difficulty: "4-6", questionText: "From a cumulative frequency graph, the median is at the $\\frac{n}{2}$th value. If $n = 80$, at what position do you read off the median?", answer: "The 40th value" },
  { id: "sta-m3", topicId: "statistics", subtopic: "Box plots", difficulty: "4-6", questionText: "A box plot shows: min = 5, Q1 = 12, median = 18, Q3 = 25, max = 35. Find the interquartile range.", answer: "$13$" },
  { id: "sta-m4", topicId: "statistics", subtopic: "Averages (mean, median, mode)", difficulty: "4-6", questionText: "Estimate the mean from this frequency table:\n| Score | 1-5 | 6-10 | 11-15 |\n| Freq  |  4  |  8   |   3   |", answer: "$7.3$ (to 1 d.p.)", hintText: "Use mid-points: 3, 8, 13." },
  { id: "sta-m5", topicId: "statistics", subtopic: "Box plots", difficulty: "4-6", questionText: "Compare two box plots:\nBoys: median = 45, IQR = 20\nGirls: median = 52, IQR = 10\nWrite one comparison.", answer: "On average, girls scored higher (median 52 vs 45). Girls' scores were also more consistent (IQR 10 vs 20)." },
  { id: "sta-m6", topicId: "statistics", subtopic: "Cumulative frequency", difficulty: "4-6", questionText: "The lower quartile is 22 and the upper quartile is 38. Find the interquartile range.", answer: "$16$" },
  { id: "sta-m7", topicId: "statistics", subtopic: "Scatter graphs", difficulty: "4-6", questionText: "A scatter graph shows strong positive correlation. The line of best fit passes through (3, 50) and (7, 80). Estimate the score for 5 hours studied.", answer: "About 65 marks" },
  { id: "sta-m8", topicId: "statistics", subtopic: "Sampling", difficulty: "4-6", questionText: "Explain one advantage and one disadvantage of using a random sample.", answer: "Advantage: every member has equal chance of selection (reduces bias). Disadvantage: may not represent all subgroups proportionally." },
  // New — filling gaps
  { id: "sta-46-1", topicId: "statistics", subtopic: "Histograms", difficulty: "4-6", questionText: "A histogram bar spans 10–20 with frequency density 3. What is the frequency?", answer: "$3 \\times 10 = 30$" },
  { id: "sta-46-2", topicId: "statistics", subtopic: "Histograms", difficulty: "4-6", questionText: "A class has width 5 and frequency 20. What is the frequency density?", answer: "$\\frac{20}{5} = 4$" },
  { id: "sta-46-3", topicId: "statistics", subtopic: "Scatter graphs", difficulty: "4-6", questionText: "A line of best fit passes through $(2, 10)$ and $(8, 40)$. Estimate $y$ when $x = 5$.", answer: "Gradient $= 5$. $y = 10 + 5(3) = 25$." },
  { id: "sta-46-4", topicId: "statistics", subtopic: "Sampling", difficulty: "4-6", questionText: "120 Year 10 and 80 Year 11 students. Stratified sample of 40 needed. How many Year 11?", answer: "$\\frac{80}{200} \\times 40 = 16$" },
  // Diagram question
  {
    id: "sta-d1", topicId: "statistics", subtopic: "Box plots", difficulty: "4-6",
    questionText: "From the box plot below, find the interquartile range.",
    answer: "$IQR = 25 - 12 = 13$",
    diagram: {
      type: "chart",
      chartType: "box_plot",
      title: "Test Scores",
      xLabel: "Score",
      boxPlot: { min: 5, q1: 12, median: 18, q3: 25, max: 35 },
      xRange: [0, 40],
    },
  },
];

const STATISTICS_G7_9: QuestionBankEntry[] = [
  { id: "sta-h1", topicId: "statistics", subtopic: "Histograms", difficulty: "7-9", questionText: "A histogram has a bar from 0–10 with frequency density 3. The bar from 10–25 has frequency density 2. Which class has the higher frequency?", answer: "10–25 (frequency = $2 \\times 15 = 30$ vs $3 \\times 10 = 30$). They are equal.", hintText: "Frequency = frequency density × class width." },
  { id: "sta-h2", topicId: "statistics", subtopic: "Cumulative frequency", difficulty: "7-9", questionText: "The cumulative frequency diagram for 120 students' scores shows Q1 = 35, Q2 = 52, Q3 = 68. Estimate the number who scored between 35 and 68.", answer: "$60$ students" },
  { id: "sta-h3", topicId: "statistics", subtopic: "Histograms", difficulty: "7-9", questionText: "A histogram has bars:\n0–5 (fd = 4), 5–15 (fd = 3), 15–20 (fd = 6).\nFind the total frequency.", answer: "$20 + 30 + 30 = 80$" },
  { id: "sta-h4", topicId: "statistics", subtopic: "Cumulative frequency", difficulty: "7-9", questionText: "From a cumulative frequency diagram for 200 values, the 80th percentile corresponds to 65. How many values are above 65?", answer: "$40$ values" },
  { id: "sta-h5", topicId: "statistics", subtopic: "Averages (mean, median, mode)", difficulty: "7-9", questionText: "Five numbers have mean 12 and median 11. The mode is 11. The range is 10. The smallest number is 7. Find all five numbers.", answer: "$7, 11, 11, 14, 17$" },
  { id: "sta-h6", topicId: "statistics", subtopic: "Histograms", difficulty: "7-9", questionText: "A histogram shows ages 0–20 (fd = 1.5), 20–30 (fd = 4), 30–50 (fd = 2.5), 50–80 (fd = 1). Find the total.", answer: "$30 + 40 + 50 + 30 = 150$" },
  // New — filling gaps
  { id: "sta-79-1", topicId: "statistics", subtopic: "Box plots", difficulty: "7-9", questionText: "Two datasets: A (median 45, IQR 30, range 60) and B (median 50, IQR 15, range 35). Compare them.", answer: "B has a higher average (50 vs 45) and is more consistent (IQR 15 vs 30)." },
  { id: "sta-79-2", topicId: "statistics", subtopic: "Box plots", difficulty: "7-9", questionText: "Q1 = 20, Q3 = 40. Outliers are > 1.5 × IQR beyond Q1 or Q3. Find the outlier boundaries.", answer: "IQR = 20. Lower: $-10$. Upper: $70$." },
  { id: "sta-79-3", topicId: "statistics", subtopic: "Scatter graphs", difficulty: "7-9", questionText: "Explain why correlation does not imply causation. Give an example.", answer: "Both variables may be caused by a third factor. E.g. ice cream sales and drowning rates both rise in summer — heat causes both." },
  { id: "sta-79-4", topicId: "statistics", subtopic: "Scatter graphs", difficulty: "7-9", questionText: "A dataset shows negative correlation with one outlier. What happens to the line of best fit if the outlier is removed?", answer: "Correlation becomes stronger (closer to −1), and the line becomes steeper." },
  { id: "sta-79-5", topicId: "statistics", subtopic: "Sampling", difficulty: "7-9", questionText: "Explain the difference between stratified and systematic sampling.", answer: "Stratified: population divided into groups, sample from each in proportion. Systematic: every $k$th member selected after a random start." },
  { id: "sta-79-6", topicId: "statistics", subtopic: "Sampling", difficulty: "7-9", questionText: "A researcher uses the first 50 hospital arrivals as her sample. Explain why this may be biased.", answer: "Convenience sample — early arrivals may not represent all patients (different demographics attend at different times)." },
  // Diagram question
  {
    id: "sta-d2", topicId: "statistics", subtopic: "Histograms", difficulty: "7-9",
    questionText: "The histogram below shows the ages of people at an event. Find the total number of people.",
    answer: "$30 + 40 + 50 + 30 = 150$",
    diagram: {
      type: "chart",
      chartType: "histogram",
      title: "Ages at Event",
      xLabel: "Age",
      yLabel: "Frequency density",
      classIntervals: [
        { from: 0, to: 20, frequency: 30 },
        { from: 20, to: 30, frequency: 40 },
        { from: 30, to: 50, frequency: 50 },
        { from: 50, to: 80, frequency: 30 },
      ],
    },
  },
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
  ...NUMBER_G1_3, ...NUMBER_G4_6, ...NUMBER_G7_9,
  ...ALGEBRA_G1_3, ...ALGEBRA_G4_6, ...ALGEBRA_G7_9,
  ...GEOMETRY_G1_3, ...GEOMETRY_G4_6, ...GEOMETRY_G7_9,
  ...RATIO_G1_3, ...RATIO_G4_6, ...RATIO_G7_9,
  ...PROBABILITY_G1_3, ...PROBABILITY_G4_6, ...PROBABILITY_G7_9,
  ...STATISTICS_G1_3, ...STATISTICS_G4_6, ...STATISTICS_G7_9,
  ...CALCULUS_EASY, ...CALCULUS_MEDIUM, ...CALCULUS_HARD,
];

/** GCSE topic IDs — used to determine which grade system to show */
const GCSE_TOPIC_IDS = new Set(["number", "algebra", "geometry", "ratio", "probability", "statistics"]);

export function isGCSETopic(topicId: string): boolean {
  return GCSE_TOPIC_IDS.has(topicId);
}

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
export function getQuestionCounts(topicId: string): Record<string, number> {
  const diffs: Difficulty[] = isGCSETopic(topicId)
    ? ["1-3", "4-6", "7-9"]
    : ["easy", "medium", "hard"];

  const result: Record<string, number> = {};
  for (const d of diffs) {
    result[d] = QUESTION_BANK.filter((q) => q.topicId === topicId && q.difficulty === d).length;
  }
  return result;
}
