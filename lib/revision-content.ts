/**
 * Simplified GCSE Maths revision notes for every subtopic.
 *
 * Each entry uses `$...$` LaTeX delimiters for maths expressions,
 * rendered by the InlineMath component.
 */

export interface RevisionNote {
  /** Must match the subtopic `name` in revision-data.ts */
  subtopic: string;
  /** Parent topic id from revision-data.ts */
  topicId: string;
  /** One-sentence overview */
  summary: string;
  /** Core concepts — each item is one key idea */
  keyConcepts: string[];
  /** Important formulas / rules */
  formulas?: string[];
  /** Step-by-step method for the main question type */
  method?: string[];
  /** Short worked examples */
  examples?: { question: string; solution: string; difficulty?: "foundation" | "intermediate" | "higher" }[];
  /** Common mistakes students make */
  commonMistakes?: { mistake: string; correction: string }[];
  /** Grade 8/9 stretch questions */
  challengeQuestions?: { question: string; solution: string }[];
  /** Exam tips */
  tips?: string[];
}

export const REVISION_CONTENT: RevisionNote[] = [
  // ═══════════════════════════════════════════════════════════════════════
  //  NUMBER
  // ═══════════════════════════════════════════════════════════════════════

  // 1. Types of Number
  {
    subtopic: "Types of Number",
    topicId: "number",
    summary:
      "Understand the different categories of numbers and how they relate to each other.",
    keyConcepts: [
      "Natural numbers (counting numbers): $1, 2, 3, 4, \\ldots$",
      "Integers: whole numbers including negatives and zero, e.g. $\\ldots, -2, -1, 0, 1, 2, \\ldots$",
      "Rational numbers: any number that can be written as a fraction $\\frac{a}{b}$ where $a$ and $b$ are integers and $b \\neq 0$.",
      "Irrational numbers cannot be written as fractions, e.g. $\\pi$, $\\sqrt{2}$.",
      "Even numbers are divisible by $2$. Odd numbers are not.",
      "A prime number has exactly two factors: $1$ and itself. The first primes are $2, 3, 5, 7, 11, 13, \\ldots$",
      "A square number is the result of multiplying an integer by itself: $1, 4, 9, 16, 25, \\ldots$",
      "A cube number is the result of multiplying an integer by itself three times: $1, 8, 27, 64, \\ldots$",
      "A triangular number is found by adding consecutive natural numbers: $1, 3, 6, 10, 15, \\ldots$",
      "Factors of a number divide into it exactly. Multiples are the times table of a number.",
    ],
    tips: [
      "Remember: $1$ is NOT a prime number (it only has one factor).",
      "$2$ is the only even prime number.",
    ],
  },

  // 2. Prime Factors, HCF and LCM
  {
    subtopic: "Prime Factors, HCF and LCM",
    topicId: "number",
    summary:
      "Break numbers into prime factors, then use them to find the Highest Common Factor and Lowest Common Multiple.",
    keyConcepts: [
      "Every integer greater than $1$ can be written as a product of prime factors (unique prime factorisation).",
      "Use a factor tree: keep splitting until every branch ends in a prime.",
      "HCF (Highest Common Factor): the largest number that divides into both numbers. Multiply the shared prime factors.",
      "LCM (Lowest Common Multiple): the smallest number that both numbers divide into. Multiply all prime factors, using the highest power of each.",
    ],
    formulas: [
      "Product of two numbers $= \\text{HCF} \\times \\text{LCM}$",
    ],
    examples: [
      {
        question: "Find the HCF and LCM of $24$ and $36$.",
        solution:
          "$24 = 2^3 \\times 3$ and $36 = 2^2 \\times 3^2$. HCF $= 2^2 \\times 3 = 12$. LCM $= 2^3 \\times 3^2 = 72$.",
      },
    ],
    tips: [
      "In a Venn diagram method, HCF is the intersection, LCM is the union of all prime factors.",
    ],
  },

  // 3. BODMAS
  {
    subtopic: "BODMAS",
    topicId: "number",
    summary:
      "BODMAS tells you the order to do calculations in: Brackets, Orders, Division & Multiplication, Addition & Subtraction.",
    keyConcepts: [
      "B — Brackets: work out anything inside brackets first.",
      "O — Orders: powers and roots, e.g. $3^2$, $\\sqrt{16}$.",
      "D/M — Division and Multiplication: work left to right.",
      "A/S — Addition and Subtraction: work left to right.",
      "Division and Multiplication have equal priority — do whichever comes first from left to right (same for Addition and Subtraction).",
    ],
    examples: [
      {
        question: "Calculate $3 + 4 \\times 2$.",
        solution:
          "Multiplication first: $4 \\times 2 = 8$, then $3 + 8 = 11$.",
      },
      {
        question: "Calculate $(3 + 4) \\times 2$.",
        solution: "Brackets first: $3 + 4 = 7$, then $7 \\times 2 = 14$.",
      },
    ],
    tips: [
      "A common mistake is doing addition before multiplication. Always follow BODMAS.",
    ],
  },

  // 4. Rounding and Approximations
  {
    subtopic: "Rounding and Approximations",
    topicId: "number",
    summary:
      "Round numbers to a given degree of accuracy and use rounding to estimate answers.",
    keyConcepts: [
      "To round, look at the digit after the one you're rounding to. If it's $5$ or more, round up; otherwise round down.",
      "Decimal places (d.p.): count digits after the decimal point.",
      "Significant figures (s.f.): count from the first non-zero digit.",
      "Truncation: simply chop off digits without rounding.",
      "Estimation: round each number to $1$ s.f., then calculate.",
      "Error intervals: if $x = 3.5$ rounded to $1$ d.p., then $3.45 \\leq x < 3.55$.",
    ],
    examples: [
      {
        question: "Round $4.367$ to $2$ d.p.",
        solution: "Look at the $3$rd decimal digit ($7$). Since $7 \\geq 5$, round up: $4.37$.",
      },
      {
        question: "Estimate $\\frac{4.9 \\times 21.3}{0.48}$.",
        solution:
          "$\\approx \\frac{5 \\times 20}{0.5} = \\frac{100}{0.5} = 200$.",
      },
    ],
    tips: [
      "For error intervals, the lower bound is always included ($\\leq$) and the upper bound is excluded ($<$).",
    ],
  },

  // 5. Decimals
  {
    subtopic: "Decimals",
    topicId: "number",
    summary:
      "Add, subtract, multiply and divide decimals, and convert between decimals and fractions.",
    keyConcepts: [
      "Adding/subtracting decimals: line up the decimal points, fill gaps with zeros.",
      "Multiplying decimals: ignore the decimal points, multiply as whole numbers, then put the point back (count total decimal places).",
      "Dividing by a decimal: multiply both numbers by $10$ (or $100$, etc.) until the divisor is a whole number.",
      "Recurring decimals: $0.\\overline{3} = 0.333\\ldots = \\frac{1}{3}$.",
      "To convert a recurring decimal to a fraction: let $x$ equal the decimal, multiply by a power of $10$ to shift the repeating block, then subtract.",
    ],
    examples: [
      {
        question: "Calculate $0.3 \\times 0.4$.",
        solution:
          "$3 \\times 4 = 12$. Two decimal places total, so $0.12$.",
      },
      {
        question: "Convert $0.\\overline{27}$ to a fraction.",
        solution:
          "Let $x = 0.2727\\ldots$. Then $100x = 27.2727\\ldots$. Subtract: $99x = 27$, so $x = \\frac{27}{99} = \\frac{3}{11}$.",
      },
    ],
  },

  // 6. Fractions
  {
    subtopic: "Fractions",
    topicId: "number",
    summary:
      "Simplify, add, subtract, multiply and divide fractions, and convert between mixed numbers and improper fractions.",
    keyConcepts: [
      "Equivalent fractions: multiply or divide numerator and denominator by the same number.",
      "Simplify by dividing both parts by their HCF.",
      "Adding/subtracting: find a common denominator first. $\\frac{a}{b} + \\frac{c}{d} = \\frac{ad + bc}{bd}$.",
      "Multiplying: $\\frac{a}{b} \\times \\frac{c}{d} = \\frac{ac}{bd}$. Cancel common factors before multiplying to keep numbers small.",
      "Dividing: flip the second fraction and multiply (Keep, Change, Flip). $\\frac{a}{b} \\div \\frac{c}{d} = \\frac{a}{b} \\times \\frac{d}{c}$.",
      "Mixed to improper: $2\\frac{3}{4} = \\frac{2 \\times 4 + 3}{4} = \\frac{11}{4}$.",
      "Improper to mixed: divide the numerator by the denominator.",
    ],
    method: [
      "For adding/subtracting: find the LCM of the denominators, convert both fractions, then add/subtract the numerators.",
      "For multiplying: cancel common factors first, then multiply straight across.",
      "For dividing: Keep the first fraction, Change ÷ to ×, Flip the second fraction.",
    ],
    examples: [
      {
        question: "Calculate $\\frac{2}{3} + \\frac{1}{4}$.",
        solution:
          "Common denominator $= 12$. $\\frac{8}{12} + \\frac{3}{12} = \\frac{11}{12}$.",
        difficulty: "foundation" as const,
      },
      {
        question: "Calculate $2\\frac{1}{3} \\div \\frac{3}{5}$.",
        solution:
          "Convert: $\\frac{7}{3} \\div \\frac{3}{5} = \\frac{7}{3} \\times \\frac{5}{3} = \\frac{35}{9} = 3\\frac{8}{9}$.",
        difficulty: "intermediate" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Adding fractions by adding numerators AND denominators: $\\frac{1}{3} + \\frac{1}{4} = \\frac{2}{7}$.",
        correction: "You must find a common denominator first: $\\frac{1}{3} + \\frac{1}{4} = \\frac{4}{12} + \\frac{3}{12} = \\frac{7}{12}$.",
      },
    ],
    tips: [
      "Always simplify your final answer.",
      "Convert mixed numbers to improper fractions before multiplying or dividing.",
    ],
  },

  // 7. Percentages
  {
    subtopic: "Percentages",
    topicId: "number",
    summary:
      "Calculate percentages of amounts, percentage increases/decreases, reverse percentages and compound interest.",
    keyConcepts: [
      "\"Per cent\" means \"out of $100$\". $25\\% = \\frac{25}{100} = 0.25$.",
      "Finding a percentage of an amount: $15\\%$ of $80 = 0.15 \\times 80 = 12$.",
      "Percentage change $= \\frac{\\text{change}}{\\text{original}} \\times 100$.",
      "Percentage increase: multiply by $(1 + \\frac{\\%}{100})$. E.g. increase by $20\\%$: multiply by $1.2$.",
      "Percentage decrease: multiply by $(1 - \\frac{\\%}{100})$. E.g. decrease by $15\\%$: multiply by $0.85$.",
      "Reverse percentage: to find the original, divide by the multiplier.",
      "Compound interest: $A = P(1 + r)^n$ where $P$ is the principal, $r$ is the rate as a decimal, $n$ is the number of years.",
    ],
    formulas: [
      "Percentage change $= \\frac{\\text{change}}{\\text{original}} \\times 100$",
      "Compound interest: $A = P(1 + r)^n$",
    ],
    method: [
      "For increase/decrease: find the multiplier and multiply.",
      "For reverse percentage: identify the multiplier, then divide the given amount by it.",
      "For compound changes: use the formula $A = P(1 \\pm r)^n$.",
    ],
    examples: [
      {
        question: "A shirt costs £40 after a $20\\%$ discount. What was the original price?",
        solution:
          "Multiplier $= 0.8$, so original $= \\frac{40}{0.8} = £50$.",
        difficulty: "intermediate" as const,
      },
      {
        question: "£2000 is invested at $3\\%$ compound interest for $5$ years. Find the final amount.",
        solution:
          "$A = 2000 \\times 1.03^5 = 2000 \\times 1.15927... = £2318.55$.",
        difficulty: "higher" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "For reverse percentages: adding the percentage back on instead of dividing by the multiplier.",
        correction: "If the price after a $20\\%$ increase is £60, the original is $\\frac{60}{1.2} = £50$, NOT $60 - 20\\% = £48$.",
      },
    ],
    tips: [
      "For compound interest questions, use the multiplier method — it's faster and less error-prone.",
    ],
  },

  // 8. Negative Numbers
  {
    subtopic: "Negative Numbers",
    topicId: "number",
    summary:
      "Understand how to add, subtract, multiply and divide with negative numbers.",
    keyConcepts: [
      "Adding a negative is the same as subtracting: $5 + (-3) = 5 - 3 = 2$.",
      "Subtracting a negative is the same as adding: $5 - (-3) = 5 + 3 = 8$.",
      "Multiplying/dividing: same signs give a positive result, different signs give a negative result.",
      "$+ \\times + = +$, $- \\times - = +$, $+ \\times - = -$, $- \\times + = -$.",
      "On a number line, negative numbers are to the left of zero.",
    ],
    examples: [
      {
        question: "Calculate $(-4) \\times (-3)$.",
        solution: "Same signs, so positive: $(-4) \\times (-3) = 12$.",
      },
      {
        question: "Calculate $-2 - 5$.",
        solution: "Move $5$ to the left on the number line: $-2 - 5 = -7$.",
      },
    ],
  },

  // 9. Sequences
  {
    subtopic: "Sequences",
    topicId: "algebra",
    summary:
      "Find the $n$th term of arithmetic sequences and recognise common types of sequences.",
    keyConcepts: [
      "An arithmetic sequence has a common difference $d$ between terms.",
      "The $n$th term of an arithmetic sequence is $a + (n - 1)d$, or equivalently $dn + (a - d)$ where $a$ is the first term.",
      "Geometric sequences have a common ratio $r$; $n$th term $= a \\times r^{n-1}$.",
      "Quadratic sequences have a changing difference; second differences are constant.",
      "Fibonacci-type sequences: each term is the sum of the two before it.",
      "To find the $n$th term of a quadratic sequence: if 2nd differences $= c$, then $n$th term starts $\\frac{c}{2}n^2 + \\ldots$.",
    ],
    method: [
      "For arithmetic: find the common difference $d$. The $n$th term $= dn + (\\text{first term} - d)$.",
      "For quadratic: find 1st and 2nd differences. If 2nd diff $= c$, start with $\\frac{c}{2}n^2$, subtract from original, find the linear part.",
      "For geometric: find the common ratio $r = \\frac{\\text{2nd term}}{\\text{1st term}}$. $n$th term $= a \\times r^{n-1}$.",
    ],
    examples: [
      {
        question: "Find the $n$th term of $5, 8, 11, 14, \\ldots$",
        solution:
          "Common difference $d = 3$. $n$th term $= 3n + 2$. Check: when $n = 1$, $3(1) + 2 = 5$. ✓",
        difficulty: "foundation" as const,
      },
      {
        question: "Find the $n$th term of $3, 9, 19, 33, \\ldots$",
        solution:
          "1st diff: $6, 10, 14$. 2nd diff: $4$. So $\\frac{4}{2}n^2 = 2n^2$. Subtract: $3 - 2 = 1$, $9 - 8 = 1$, $19 - 18 = 1$. Remainder is $1$. $n$th term $= 2n^2 + 1$.",
        difficulty: "higher" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Writing the $n$th term as just $3n$ for the sequence $5, 8, 11, ...$ (forgetting the constant).",
        correction: "The constant is (first term $-$ common difference): $5 - 3 = 2$. So it's $3n + 2$.",
      },
    ],
    tips: [
      "Always check your $n$th term formula works for at least two terms.",
    ],
  },

  // 10. Surds (Higher)
  {
    subtopic: "Surds",
    topicId: "number",
    summary:
      "Simplify, add, subtract, multiply and divide surds, and rationalise denominators.",
    keyConcepts: [
      "A surd is a root that cannot be simplified to a rational number, e.g. $\\sqrt{2}$, $\\sqrt{5}$.",
      "Simplifying: $\\sqrt{ab} = \\sqrt{a} \\times \\sqrt{b}$. Find the largest square factor. E.g. $\\sqrt{12} = \\sqrt{4 \\times 3} = 2\\sqrt{3}$.",
      "Adding/subtracting: only combine like surds. $3\\sqrt{2} + 5\\sqrt{2} = 8\\sqrt{2}$.",
      "Multiplying: $\\sqrt{a} \\times \\sqrt{b} = \\sqrt{ab}$.",
      "Rationalise the denominator: multiply top and bottom by the surd. $\\frac{1}{\\sqrt{3}} = \\frac{\\sqrt{3}}{3}$.",
      "For denominators like $a + \\sqrt{b}$, multiply by the conjugate $a - \\sqrt{b}$.",
    ],
    method: [
      "To simplify $\\sqrt{n}$: find the largest square number that divides $n$.",
      "To rationalise $\\frac{a}{\\sqrt{b}}$: multiply top and bottom by $\\sqrt{b}$.",
      "To rationalise $\\frac{a}{b + \\sqrt{c}}$: multiply top and bottom by $b - \\sqrt{c}$ (the conjugate).",
    ],
    examples: [
      {
        question: "Simplify $\\sqrt{50}$.",
        solution: "$\\sqrt{50} = \\sqrt{25 \\times 2} = 5\\sqrt{2}$.",
        difficulty: "foundation" as const,
      },
      {
        question: "Rationalise $\\frac{3}{\\sqrt{5}}$.",
        solution:
          "$\\frac{3}{\\sqrt{5}} \\times \\frac{\\sqrt{5}}{\\sqrt{5}} = \\frac{3\\sqrt{5}}{5}$.",
        difficulty: "intermediate" as const,
      },
      {
        question: "Rationalise $\\frac{6}{3 + \\sqrt{2}}$.",
        solution:
          "Multiply by $\\frac{3 - \\sqrt{2}}{3 - \\sqrt{2}}$: $\\frac{6(3 - \\sqrt{2})}{9 - 2} = \\frac{18 - 6\\sqrt{2}}{7}$.",
        difficulty: "higher" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Writing $\\sqrt{4 + 9} = \\sqrt{4} + \\sqrt{9} = 5$.",
        correction: "You CANNOT split a square root over addition: $\\sqrt{4+9} = \\sqrt{13} \\neq 5$.",
      },
    ],
    tips: [
      "Always simplify surds fully — look for the largest square factor.",
    ],
  },

  // 11. Standard Form
  {
    subtopic: "Standard Form",
    topicId: "number",
    summary:
      "Write very large or very small numbers in standard form $A \\times 10^n$ and do calculations with them.",
    keyConcepts: [
      "Standard form: $A \\times 10^n$ where $1 \\leq A < 10$ and $n$ is an integer.",
      "Large numbers have positive $n$: $45{,}000 = 4.5 \\times 10^4$.",
      "Small numbers have negative $n$: $0.003 = 3 \\times 10^{-3}$.",
      "Multiplying: multiply the $A$ values and add the powers.",
      "Dividing: divide the $A$ values and subtract the powers.",
      "Adding/subtracting: convert to the same power of $10$ first.",
    ],
    method: [
      "To convert TO standard form: move the decimal point until $1 \\leq A < 10$; count how many places you moved.",
      "Move right (for small numbers) → negative power. Move left (for large numbers) → positive power.",
      "For calculations: multiply/divide the $A$ parts and add/subtract the powers.",
    ],
    examples: [
      {
        question:
          "Calculate $(3 \\times 10^4) \\times (2 \\times 10^3)$.",
        solution:
          "$3 \\times 2 = 6$ and $10^4 \\times 10^3 = 10^7$. Answer: $6 \\times 10^7$.",
        difficulty: "foundation" as const,
      },
      {
        question: "Calculate $(8 \\times 10^5) \\div (4 \\times 10^2)$.",
        solution:
          "$8 \\div 4 = 2$ and $10^{5-2} = 10^3$. Answer: $2 \\times 10^3$.",
        difficulty: "intermediate" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Writing $45 \\times 10^3$ instead of $4.5 \\times 10^4$.",
        correction: "$A$ must be between $1$ and $10$. Adjust $A$ and change the power accordingly.",
      },
    ],
    tips: [
      "If your $A$ value ends up $\\geq 10$ or $< 1$, adjust it and change the power.",
    ],
  },

  // 12. Ratio
  {
    subtopic: "Ratio",
    topicId: "ratio",
    summary:
      "Simplify ratios, share amounts in a given ratio, and work with ratio problems.",
    keyConcepts: [
      "A ratio compares quantities in order. $3:5$ means $3$ parts to $5$ parts.",
      "Simplify by dividing both sides by their HCF: $12:8 = 3:2$.",
      "To share an amount in a ratio: add the parts, divide the total by the sum, then multiply by each part.",
      "Equivalent ratios work like equivalent fractions.",
      "Writing ratios as fractions: in $3:5$, the first quantity is $\\frac{3}{8}$ of the total.",
      "To combine ratios: find a link. If $A:B = 2:3$ and $B:C = 4:5$, scale so $B$ matches: $A:B:C = 8:12:15$.",
    ],
    method: [
      "To share an amount: add the parts, find the value of one part (total ÷ sum of parts), then multiply.",
      "To find a missing value: set up equivalent ratios and cross-multiply.",
    ],
    examples: [
      {
        question: "Share £120 in the ratio $3:5$.",
        solution:
          "Total parts $= 3 + 5 = 8$. One part $= \\frac{120}{8} = 15$. Shares: $3 \\times 15 = £45$ and $5 \\times 15 = £75$.",
        difficulty: "foundation" as const,
      },
      {
        question: "$A:B = 3:4$ and $B:C = 2:5$. Find $A:B:C$.",
        solution:
          "Scale $B$ to match: $A:B = 6:8$, $B:C = 8:20$. So $A:B:C = 6:8:20 = 3:4:10$.",
        difficulty: "higher" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Sharing in a ratio by dividing the total by the first number in the ratio.",
        correction: "You must divide by the TOTAL number of parts (sum of ratio), not just one part.",
      },
    ],
    tips: [
      "Always check your shares add up to the original total.",
    ],
  },

  // 13. Proportion
  {
    subtopic: "Proportion",
    topicId: "ratio",
    summary:
      "Solve direct and inverse proportion problems, including using the unitary method and algebraic formulae.",
    keyConcepts: [
      "Direct proportion: as one quantity increases, the other increases at the same rate. $y = kx$.",
      "Inverse proportion: as one increases, the other decreases. $y = \\frac{k}{x}$.",
      "Unitary method: find the value of $1$ unit first, then scale up.",
      "For direct proportion: $\\frac{y_1}{x_1} = \\frac{y_2}{x_2}$.",
      "$y \\propto x^2$ means $y = kx^2$. $y \\propto \\sqrt{x}$ means $y = k\\sqrt{x}$.",
    ],
    method: [
      "Write the proportionality relationship: $y \\propto ...$.",
      "Replace with $y = k \\times ...$.",
      "Substitute the given values to find $k$.",
      "Write the final formula and use it to find the unknown.",
    ],
    examples: [
      {
        question:
          "If $y$ is directly proportional to $x$, and $y = 12$ when $x = 4$, find $y$ when $x = 7$.",
        solution:
          "$k = \\frac{12}{4} = 3$. So $y = 3x$. When $x = 7$: $y = 21$.",
        difficulty: "foundation" as const,
      },
      {
        question: "$y$ is inversely proportional to $x^2$. When $x = 2$, $y = 5$. Find $y$ when $x = 5$.",
        solution:
          "$y = \\frac{k}{x^2}$. $5 = \\frac{k}{4}$, so $k = 20$. When $x = 5$: $y = \\frac{20}{25} = 0.8$.",
        difficulty: "higher" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Confusing direct and inverse proportion.",
        correction: "Direct: both increase together ($y = kx$). Inverse: one goes up, the other goes down ($y = k/x$).",
      },
    ],
    tips: [
      "Always start by finding the constant $k$ using the given values.",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  ALGEBRA
  // ═══════════════════════════════════════════════════════════════════════

  // 14. Rules of Algebra
  {
    subtopic: "Rules of Algebra",
    topicId: "algebra",
    summary:
      "Understand and use the basic rules for simplifying algebraic expressions.",
    keyConcepts: [
      "Like terms have the same variable and power: $3x$ and $5x$ are like terms; $3x$ and $3x^2$ are not.",
      "Collect like terms: $4x + 3y - 2x + y = 2x + 4y$.",
      "Multiply terms: $3a \\times 4b = 12ab$.",
      "Divide terms: $\\frac{12x^2}{4x} = 3x$.",
      "Remember: $x$ means $1x$, and $x^1$ means $x$.",
      "When multiplying powers of the same base, add the indices: $x^a \\times x^b = x^{a+b}$.",
      "When dividing powers of the same base, subtract the indices: $x^a \\div x^b = x^{a-b}$.",
    ],
    examples: [
      {
        question: "Simplify $5a + 3b - 2a + 4b$.",
        solution: "$5a - 2a + 3b + 4b = 3a + 7b$.",
      },
    ],
  },

  // 15. Single Brackets
  {
    subtopic: "Single Brackets",
    topicId: "algebra",
    summary:
      "Expand (multiply out) and simplify expressions involving single brackets.",
    keyConcepts: [
      "Expanding: multiply the term outside the bracket by every term inside.",
      "$a(b + c) = ab + ac$.",
      "Be careful with negative signs: $-2(3x - 4) = -6x + 8$.",
      "After expanding, collect like terms to simplify.",
    ],
    method: [
      "Multiply the term outside by the FIRST term inside the bracket.",
      "Then multiply the term outside by the SECOND term inside.",
      "Collect like terms if there are multiple brackets.",
    ],
    examples: [
      {
        question: "Expand and simplify $3(2x + 1) + 2(x - 4)$.",
        solution:
          "$6x + 3 + 2x - 8 = 8x - 5$.",
        difficulty: "foundation" as const,
      },
      {
        question: "Expand $-4(2x - 3y + 1)$.",
        solution:
          "$-8x + 12y - 4$.",
        difficulty: "intermediate" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Forgetting to multiply ALL terms inside: $3(2x + 1) = 6x + 1$.",
        correction: "Multiply every term: $3(2x + 1) = 6x + 3$.",
      },
      {
        mistake: "Sign errors with negatives: $-2(x - 3) = -2x - 6$.",
        correction: "$-2 \\times -3 = +6$: $-2(x - 3) = -2x + 6$.",
      },
    ],
  },

  // 16. Factorising
  {
    subtopic: "Factorising",
    topicId: "algebra",
    summary:
      "Factorise expressions by taking out common factors — the reverse of expanding brackets.",
    keyConcepts: [
      "Find the HCF of all terms and write it outside the bracket.",
      "$6x + 9 = 3(2x + 3)$.",
      "$x^2 + 5x = x(x + 5)$.",
      "$4x^2y - 8xy^2 = 4xy(x - 2y)$.",
      "Check by expanding your answer — you should get back to the original.",
    ],
    method: [
      "Find the HCF of all the terms (number AND letters).",
      "Write the HCF outside the bracket.",
      "Divide each term by the HCF to fill in the bracket.",
      "Check by expanding.",
    ],
    examples: [
      {
        question: "Factorise $12x^2 - 18x$.",
        solution:
          "HCF $= 6x$. So $12x^2 - 18x = 6x(2x - 3)$.",
        difficulty: "foundation" as const,
      },
      {
        question: "Factorise $15a^2b + 10ab^2 - 5ab$.",
        solution:
          "HCF $= 5ab$. So $5ab(3a + 2b - 1)$.",
        difficulty: "intermediate" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Not taking out the LARGEST common factor: writing $12x^2 - 18x = 2(6x^2 - 9x)$.",
        correction: "Take out the full HCF: $12x^2 - 18x = 6x(2x - 3)$.",
      },
    ],
    tips: [
      "Always take out the largest possible common factor.",
    ],
  },

  // 17. Solving Equations
  {
    subtopic: "Solving Equations",
    topicId: "algebra",
    summary:
      "Solve linear equations by using inverse operations to isolate the unknown.",
    keyConcepts: [
      "Whatever you do to one side of the equation, you must do to the other side.",
      "Use inverse operations: $+$ undone by $-$, $\\times$ undone by $\\div$.",
      "If the unknown appears on both sides, collect it on one side first.",
      "Equations with brackets: expand first, then solve.",
      "Equations with fractions: multiply every term by the LCM of the denominators.",
    ],
    method: [
      "If there are brackets, expand them first.",
      "If there are fractions, multiply every term by the common denominator.",
      "Collect all terms with $x$ on one side and numbers on the other.",
      "Simplify both sides.",
      "Divide by the coefficient of $x$ to find $x$.",
    ],
    examples: [
      {
        question: "Solve $3x + 7 = 22$.",
        solution:
          "$3x = 22 - 7 = 15$, so $x = \\frac{15}{3} = 5$.",
        difficulty: "foundation" as const,
      },
      {
        question: "Solve $5(x - 2) = 3x + 4$.",
        solution:
          "Expand: $5x - 10 = 3x + 4$. Then $2x = 14$, so $x = 7$.",
        difficulty: "intermediate" as const,
      },
      {
        question: "Solve $\\frac{2x+1}{3} = \\frac{x-2}{4}$.",
        solution:
          "Multiply both sides by $12$: $4(2x+1) = 3(x-2)$. $8x + 4 = 3x - 6$. $5x = -10$, so $x = -2$.",
        difficulty: "higher" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Not expanding brackets before collecting terms.",
        correction: "Always expand brackets first, then simplify.",
      },
      {
        mistake: "Forgetting to do the same operation to both sides.",
        correction: "Whatever you do to the left side, you must also do to the right side.",
      },
    ],
    tips: [
      "Always substitute your answer back into the original equation to check.",
    ],
  },

  // 18. Double Brackets
  {
    subtopic: "Double Brackets",
    topicId: "algebra",
    summary:
      "Expand two brackets using FOIL (First, Outside, Inside, Last) and simplify.",
    keyConcepts: [
      "FOIL: multiply each term in the first bracket by each term in the second bracket.",
      "$(x + a)(x + b) = x^2 + (a+b)x + ab$.",
      "$(x + 3)(x + 5) = x^2 + 8x + 15$.",
      "Difference of two squares: $(a + b)(a - b) = a^2 - b^2$.",
      "Perfect squares: $(x + a)^2 = x^2 + 2ax + a^2$.",
    ],
    method: [
      "Multiply the First terms.",
      "Multiply the Outside terms.",
      "Multiply the Inside terms.",
      "Multiply the Last terms.",
      "Collect like terms to simplify.",
    ],
    examples: [
      {
        question: "Expand $(x + 4)(x - 3)$.",
        solution:
          "$x^2 - 3x + 4x - 12 = x^2 + x - 12$.",
        difficulty: "foundation" as const,
      },
      {
        question: "Expand $(2x - 1)(3x + 5)$.",
        solution:
          "$6x^2 + 10x - 3x - 5 = 6x^2 + 7x - 5$.",
        difficulty: "intermediate" as const,
      },
      {
        question: "Expand and simplify $(x + 3)^2 - (x - 1)(x + 1)$.",
        solution:
          "$(x^2 + 6x + 9) - (x^2 - 1) = 6x + 10$.",
        difficulty: "higher" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Writing $(x + 3)^2 = x^2 + 9$ (squaring each term separately).",
        correction: "$(x + 3)^2 = (x+3)(x+3) = x^2 + 6x + 9$. Don't forget the middle term.",
      },
    ],
  },

  // 19. More Factorising — Quadratics
  {
    subtopic: "More Factorising — Quadratics",
    topicId: "algebra",
    summary:
      "Factorise quadratic expressions of the form $x^2 + bx + c$ and $ax^2 + bx + c$.",
    keyConcepts: [
      "For $x^2 + bx + c$: find two numbers that multiply to $c$ and add to $b$.",
      "$x^2 + 7x + 12 = (x + 3)(x + 4)$ because $3 \\times 4 = 12$ and $3 + 4 = 7$.",
      "For $ax^2 + bx + c$ (where $a \\neq 1$): find two numbers that multiply to $ac$ and add to $b$, then split the middle term.",
      "Difference of two squares: $a^2 - b^2 = (a + b)(a - b)$.",
      "$x^2 - 16 = (x + 4)(x - 4)$.",
    ],
    method: [
      "For $x^2 + bx + c$: find two numbers that multiply to $c$ and add to $b$.",
      "For $ax^2 + bx + c$: multiply $a \\times c$, find two numbers that multiply to $ac$ and add to $b$, rewrite the middle term, then factorise in pairs.",
      "Always check for a common factor first.",
      "Look for difference of two squares: $a^2 - b^2 = (a+b)(a-b)$.",
    ],
    examples: [
      {
        question: "Factorise $x^2 - 5x + 6$.",
        solution:
          "Need two numbers that multiply to $6$ and add to $-5$: $-2$ and $-3$. So $(x - 2)(x - 3)$.",
        difficulty: "foundation" as const,
      },
      {
        question: "Factorise $2x^2 + 5x - 3$.",
        solution:
          "$ac = -6$. Numbers: $6$ and $-1$ ($6 \\times -1 = -6$, $6 + (-1) = 5$). Split: $2x^2 + 6x - x - 3 = 2x(x+3) - 1(x+3) = (2x-1)(x+3)$.",
        difficulty: "higher" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Confusing signs: $x^2 - 5x + 6$ leads to two negatives, not one positive and one negative.",
        correction: "If $c$ is positive and $b$ is negative, both numbers are negative.",
      },
    ],
    tips: [
      "Check your factorisation by expanding it back out.",
    ],
  },

  // 20. Solving Quadratic Equations (Higher)
  {
    subtopic: "Solving Quadratic Equations",
    topicId: "algebra",
    summary:
      "Solve quadratics by factorising, using the quadratic formula, or completing the square.",
    keyConcepts: [
      "Set the equation equal to zero, then factorise: if $(x + a)(x + b) = 0$, then $x = -a$ or $x = -b$.",
      "Quadratic formula: $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$ for $ax^2 + bx + c = 0$.",
      "The discriminant $b^2 - 4ac$ tells you how many roots: positive → 2 roots, zero → 1 (repeated) root, negative → no real roots.",
      "Completing the square: $x^2 + bx = (x + \\frac{b}{2})^2 - (\\frac{b}{2})^2$.",
    ],
    formulas: [
      "Quadratic formula: $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$",
      "Discriminant: $\\Delta = b^2 - 4ac$",
    ],
    method: [
      "Rearrange so the equation equals zero: $ax^2 + bx + c = 0$.",
      "Try to factorise first.",
      "If factorising doesn't work, use the quadratic formula.",
      "If the question says 'give your answer in surd form', use the formula and simplify.",
      "Check both solutions in the original equation.",
    ],
    examples: [
      {
        question: "Solve $x^2 - 5x + 6 = 0$.",
        solution:
          "$(x - 2)(x - 3) = 0$, so $x = 2$ or $x = 3$.",
        difficulty: "foundation" as const,
      },
      {
        question: "Solve $2x^2 + 3x - 5 = 0$ using the formula.",
        solution:
          "$a = 2, b = 3, c = -5$. $x = \\frac{-3 \\pm \\sqrt{9 + 40}}{4} = \\frac{-3 \\pm 7}{4}$. So $x = 1$ or $x = -2.5$.",
        difficulty: "intermediate" as const,
      },
      {
        question: "How many real solutions does $3x^2 - 2x + 5 = 0$ have?",
        solution:
          "$\\Delta = (-2)^2 - 4(3)(5) = 4 - 60 = -56 < 0$. Negative discriminant, so no real solutions.",
        difficulty: "higher" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Forgetting to rearrange to $= 0$ before factorising or using the formula.",
        correction: "The equation MUST be in the form $ax^2 + bx + c = 0$ first.",
      },
      {
        mistake: "Only finding one solution when there are two.",
        correction: "The $\\pm$ in the formula gives two solutions — always calculate both.",
      },
    ],
    tips: [
      "Always try factorising first — it's quicker. Use the formula when factorising doesn't work easily.",
    ],
  },

  // 21. Simultaneous Equations (Higher)
  {
    subtopic: "Simultaneous Equations",
    topicId: "algebra",
    summary:
      "Solve pairs of equations with two unknowns using elimination or substitution.",
    keyConcepts: [
      "Elimination: make the coefficients of one variable the same, then add or subtract the equations to eliminate it.",
      "Substitution: rearrange one equation to get one variable in terms of the other, then substitute into the second equation.",
      "For one linear and one quadratic: substitute the linear equation into the quadratic.",
    ],
    method: [
      "Label the equations (1) and (2).",
      "Elimination: multiply one or both equations so a variable has the same coefficient. Add or subtract to eliminate it.",
      "Substitution: rearrange (1) to make $y = ...$, substitute into (2).",
      "Solve the resulting equation for the remaining variable.",
      "Substitute back to find the other variable.",
    ],
    examples: [
      {
        question: "Solve $2x + y = 7$ and $x - y = 2$.",
        solution:
          "Add the equations: $3x = 9$, so $x = 3$. Then $y = 7 - 2(3) = 1$.",
        difficulty: "foundation" as const,
      },
      {
        question: "Solve $3x + 2y = 12$ and $5x - 2y = 4$.",
        solution:
          "Add: $8x = 16$, so $x = 2$. Then $3(2) + 2y = 12$, $2y = 6$, $y = 3$.",
        difficulty: "intermediate" as const,
      },
      {
        question: "Solve $y = x + 2$ and $x^2 + y^2 = 10$.",
        solution:
          "Substitute: $x^2 + (x+2)^2 = 10$. $x^2 + x^2 + 4x + 4 = 10$. $2x^2 + 4x - 6 = 0$. $x^2 + 2x - 3 = 0$. $(x+3)(x-1) = 0$. $x = -3, y = -1$ or $x = 1, y = 3$.",
        difficulty: "higher" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Adding when you should subtract (or vice versa) during elimination.",
        correction: "Same signs → subtract. Different signs → add. Check which eliminates the variable.",
      },
      {
        mistake: "Only finding $x$ and forgetting to find $y$.",
        correction: "You must find BOTH variables. Substitute back to get the second one.",
      },
    ],
    tips: [
      "Always substitute your answers back into both original equations to check.",
    ],
  },

  // 22. Inequalities
  {
    subtopic: "Inequalities",
    topicId: "algebra",
    summary:
      "Solve and represent linear inequalities on number lines and coordinate grids.",
    keyConcepts: [
      "$<$ means less than, $>$ means greater than, $\\leq$ means less than or equal to, $\\geq$ means greater than or equal to.",
      "Solve inequalities like equations, but if you multiply or divide by a negative number, flip the inequality sign.",
      "On a number line: open circle $\\circ$ for $<$ or $>$, filled circle $\\bullet$ for $\\leq$ or $\\geq$.",
      "Double inequalities: $-3 < x \\leq 5$ means $x$ is greater than $-3$ and at most $5$.",
      "Graphically, shade the region that satisfies all inequalities. Use dashed lines for $<$ or $>$ and solid lines for $\\leq$ or $\\geq$.",
    ],
    method: [
      "Solve the inequality using the same steps as solving an equation.",
      "If you multiply or divide by a negative, FLIP the inequality sign.",
      "For double inequalities like $-4 < 2x + 1 \\leq 7$, subtract 1 from all three parts, then divide all three parts.",
      "For graphical inequalities: draw the boundary line, then test a point to decide which side to shade.",
    ],
    examples: [
      {
        question: "Solve $3x + 2 > 11$.",
        solution: "$3x > 9$, so $x > 3$.",
        difficulty: "foundation" as const,
      },
      {
        question: "Solve $-2x < 8$.",
        solution:
          "Divide by $-2$ and flip: $x > -4$.",
        difficulty: "intermediate" as const,
      },
      {
        question: "List the integer values of $n$ satisfying $-3 < 2n - 1 \\leq 5$.",
        solution:
          "$-2 < 2n \\leq 6$. $-1 < n \\leq 3$. Integers: $n = 0, 1, 2, 3$.",
        difficulty: "higher" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Forgetting to flip the sign when dividing by a negative.",
        correction: "If you divide or multiply by a negative, the inequality sign REVERSES.",
      },
      {
        mistake: "Using the wrong circle on a number line ($\\circ$ vs $\\bullet$).",
        correction: "Open circle for $<$ or $>$ (not included). Filled circle for $\\leq$ or $\\geq$ (included).",
      },
    ],
  },

  // 23. Indices
  {
    subtopic: "Indices",
    topicId: "algebra",
    summary:
      "Use the laws of indices including negative, fractional and zero powers.",
    keyConcepts: [
      "$a^m \\times a^n = a^{m+n}$",
      "$a^m \\div a^n = a^{m-n}$",
      "$(a^m)^n = a^{mn}$",
      "$a^0 = 1$ for any non-zero $a$.",
      "$a^{-n} = \\frac{1}{a^n}$, e.g. $2^{-3} = \\frac{1}{8}$.",
      "$a^{\\frac{1}{n}} = \\sqrt[n]{a}$, e.g. $8^{\\frac{1}{3}} = 2$.",
      "$a^{\\frac{m}{n}} = (\\sqrt[n]{a})^m$, e.g. $8^{\\frac{2}{3}} = (\\sqrt[3]{8})^2 = 4$.",
    ],
    formulas: [
      "$a^m \\times a^n = a^{m+n}$",
      "$a^m \\div a^n = a^{m-n}$",
      "$(a^m)^n = a^{mn}$",
      "$a^{-n} = \\frac{1}{a^n}$",
      "$a^{\\frac{m}{n}} = (\\sqrt[n]{a})^m$",
    ],
    method: [
      "For fractional indices: root first (denominator), then power (numerator).",
      "For negative indices: take the reciprocal then apply the positive power.",
      "For simplifying expressions: add indices when multiplying, subtract when dividing.",
    ],
    examples: [
      {
        question: "Simplify $\\frac{x^5 \\times x^3}{x^2}$.",
        solution: "$x^{5+3-2} = x^6$.",
        difficulty: "foundation" as const,
      },
      {
        question: "Evaluate $27^{\\frac{2}{3}}$.",
        solution:
          "$\\sqrt[3]{27} = 3$, then $3^2 = 9$.",
        difficulty: "intermediate" as const,
      },
      {
        question: "Simplify $(2x^3)^{-2}$.",
        solution:
          "$= \\frac{1}{(2x^3)^2} = \\frac{1}{4x^6}$.",
        difficulty: "higher" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Adding indices when raising a power to a power: writing $(a^2)^3 = a^5$.",
        correction: "Multiply the indices: $(a^2)^3 = a^{2 \\times 3} = a^6$.",
      },
      {
        mistake: "Thinking $a^0 = 0$.",
        correction: "$a^0 = 1$ for any non-zero value of $a$.",
      },
    ],
  },

  // 24. Straight Line Graphs
  {
    subtopic: "Straight Line Graphs",
    topicId: "algebra",
    summary:
      "Understand, plot and use the equation of a straight line $y = mx + c$.",
    keyConcepts: [
      "$y = mx + c$: $m$ is the gradient (slope) and $c$ is the $y$-intercept.",
      "Gradient $= \\frac{\\text{rise}}{\\text{run}} = \\frac{y_2 - y_1}{x_2 - x_1}$.",
      "Positive gradient: line slopes upward. Negative gradient: line slopes downward.",
      "Parallel lines have equal gradients.",
      "Perpendicular lines have gradients that multiply to $-1$: $m_1 \\times m_2 = -1$.",
      "To find the equation: use $y - y_1 = m(x - x_1)$.",
      "Horizontal lines: $y = c$. Vertical lines: $x = k$.",
    ],
    formulas: [
      "$y = mx + c$",
      "Gradient $= \\frac{y_2 - y_1}{x_2 - x_1}$",
      "Perpendicular gradient: $m_2 = -\\frac{1}{m_1}$",
    ],
    method: [
      "Find the gradient using two points on the line.",
      "Substitute the gradient and one point into $y - y_1 = m(x - x_1)$.",
      "Rearrange to $y = mx + c$ form.",
    ],
    examples: [
      {
        question: "Find the equation of the line through $(1, 3)$ and $(3, 7)$.",
        solution:
          "Gradient $= \\frac{7-3}{3-1} = 2$. Using $(1, 3)$: $y - 3 = 2(x - 1)$, so $y = 2x + 1$.",
        difficulty: "foundation" as const,
      },
      {
        question: "Find the equation of the line perpendicular to $y = 3x + 1$ passing through $(6, 2)$.",
        solution:
          "Gradient of perpendicular $= -\\frac{1}{3}$. $y - 2 = -\\frac{1}{3}(x - 6)$. $y = -\\frac{1}{3}x + 4$.",
        difficulty: "higher" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Calculating ($x_2 - x_1$) on top and ($y_2 - y_1$) on the bottom — getting the gradient upside down.",
        correction: "Gradient = rise over run = $\\frac{y_2 - y_1}{x_2 - x_1}$ (change in $y$ divided by change in $x$).",
      },
      {
        mistake: "Thinking perpendicular gradient is just the negative: $m_2 = -m_1$.",
        correction: "Perpendicular gradient is the NEGATIVE RECIPROCAL: $m_2 = -\\frac{1}{m_1}$.",
      },
    ],
    tips: [
      "To sketch a line from $y = mx + c$: plot the $y$-intercept at $(0, c)$, then use the gradient to find another point.",
    ],
  },

  // 25. Quadratic and Cubic Graphs (Higher)
  {
    subtopic: "Quadratic and Cubic Graphs",
    topicId: "algebra",
    summary:
      "Plot and interpret quadratic ($y = ax^2 + bx + c$) and cubic ($y = ax^3 + \\ldots$) graphs.",
    keyConcepts: [
      "Quadratic graphs ($y = ax^2 + bx + c$) are parabolas. If $a > 0$, the parabola opens upward (U-shape); if $a < 0$, it opens downward.",
      "The vertex (turning point) is at $x = \\frac{-b}{2a}$.",
      "The roots (solutions) are where the graph crosses the $x$-axis.",
      "Cubic graphs ($y = ax^3 + \\ldots$) have an S-shape. Positive $a$: bottom-left to top-right.",
      "To draw, make a table of values, plot the points, and join with a smooth curve — not straight lines.",
    ],
    method: [
      "Substitute at least 5-6 $x$-values into the equation to make a table of values.",
      "Plot each $(x, y)$ point carefully.",
      "Join with a smooth curve — never straight lines between points.",
      "To find roots from the graph, read off where the curve crosses the $x$-axis.",
    ],
    examples: [
      {
        question: "Sketch the graph of $y = x^2 - 4x + 3$ and find its roots.",
        solution:
          "Roots: $x^2 - 4x + 3 = (x-1)(x-3) = 0$, so $x = 1$ and $x = 3$. Vertex at $x = \\frac{4}{2} = 2$, $y = 4 - 8 + 3 = -1$. U-shaped parabola.",
        difficulty: "intermediate" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Joining plotted points with straight lines instead of a smooth curve.",
        correction: "Quadratic and cubic graphs are always smooth curves.",
      },
    ],
    tips: [
      "Use your table of values with at least $5$ or $6$ points for a smooth curve.",
    ],
  },

  // 26. Shapes of Graphs (Higher)
  {
    subtopic: "Shapes of Graphs",
    topicId: "algebra",
    summary:
      "Recognise and sketch the shapes of common functions including reciprocal and exponential graphs.",
    keyConcepts: [
      "Reciprocal: $y = \\frac{k}{x}$ has two curves in opposite quadrants (hyperbola). Never touches the axes.",
      "Exponential growth: $y = a^x$ ($a > 1$) — steep curve going up, passes through $(0, 1)$.",
      "Exponential decay: $y = a^{-x}$ — steep curve going down.",
      "Circle: $x^2 + y^2 = r^2$ is a circle centre $(0, 0)$ with radius $r$.",
      "Transformations: $y = f(x) + a$ shifts up by $a$; $y = f(x - a)$ shifts right by $a$.",
    ],
  },

  // 27. Travel Graphs and Story Graphs
  {
    subtopic: "Travel Graphs and Story Graphs",
    topicId: "algebra",
    summary:
      "Interpret and draw distance-time and velocity-time graphs.",
    keyConcepts: [
      "Distance-time graph: gradient = speed. Steeper = faster. Horizontal = stationary.",
      "Velocity-time graph: gradient = acceleration. Area under the graph = distance travelled.",
      "Constant speed = straight line on a distance-time graph.",
      "Constant acceleration = straight line on a velocity-time graph.",
      "A curve on a distance-time graph means the speed is changing.",
    ],
    method: [
      "For speed from a distance-time graph: gradient $= \\frac{\\text{change in distance}}{\\text{change in time}}$.",
      "For acceleration from a velocity-time graph: gradient $= \\frac{\\text{change in velocity}}{\\text{change in time}}$.",
      "For distance from a velocity-time graph: calculate the area under the line (use rectangles and triangles).",
    ],
    examples: [
      {
        question:
          "On a distance-time graph, a line goes from $(0, 0)$ to $(2, 10)$. What is the speed?",
        solution:
          "Speed $= \\frac{\\text{distance}}{\\text{time}} = \\frac{10}{2} = 5$ units per time period.",
        difficulty: "foundation" as const,
      },
      {
        question: "On a velocity-time graph, velocity increases from $0$ to $20$ m/s over $5$ seconds. Find the acceleration and distance.",
        solution:
          "Acceleration $= \\frac{20}{5} = 4$ m/s². Distance $= \\frac{1}{2} \\times 5 \\times 20 = 50$ m.",
        difficulty: "intermediate" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Confusing distance-time and velocity-time graphs.",
        correction: "Check the $y$-axis label. Gradient of DT = speed. Gradient of VT = acceleration. Area under VT = distance.",
      },
    ],
    tips: [
      "Read the axes carefully — check whether it's distance or velocity on the $y$-axis.",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  GEOMETRY (Shape, Space and Measure)
  // ═══════════════════════════════════════════════════════════════════════

  // 28. Angle Facts
  {
    subtopic: "Angle Facts",
    topicId: "geometry",
    summary:
      "Know and use the key angle rules for straight lines, triangles, parallel lines and polygons.",
    keyConcepts: [
      "Angles on a straight line add up to $180°$.",
      "Angles at a point add up to $360°$.",
      "Vertically opposite angles are equal.",
      "Angles in a triangle add up to $180°$.",
      "Angles in a quadrilateral add up to $360°$.",
      "Parallel lines: alternate angles (Z-angles) are equal.",
      "Parallel lines: co-interior (C-angles or allied angles) add up to $180°$.",
      "Parallel lines: corresponding angles (F-angles) are equal.",
    ],
    examples: [
      {
        question: "Two angles on a straight line are $x$ and $130°$. Find $x$.",
        solution: "$x + 130 = 180$, so $x = 50°$.",
        difficulty: "foundation" as const,
      },
      {
        question: "In a triangle, angles are $2x$, $3x$ and $55°$. Find $x$.",
        solution: "$2x + 3x + 55 = 180$. $5x = 125$. $x = 25°$.",
        difficulty: "intermediate" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Confusing alternate (Z) and co-interior (C) angles.",
        correction: "Alternate angles are EQUAL (Z-shape). Co-interior angles ADD to $180°$ (C-shape).",
      },
    ],
    tips: [
      "In the exam, always state the reason (e.g. 'angles on a straight line') to get full marks.",
    ],
  },

  // 29. Polygons
  {
    subtopic: "Polygons",
    topicId: "geometry",
    summary:
      "Calculate interior and exterior angles of regular and irregular polygons.",
    keyConcepts: [
      "Sum of interior angles of an $n$-sided polygon $= (n - 2) \\times 180°$.",
      "Each interior angle of a regular $n$-gon $= \\frac{(n-2) \\times 180}{n}$.",
      "Sum of exterior angles of any polygon $= 360°$.",
      "Each exterior angle of a regular $n$-gon $= \\frac{360}{n}$.",
      "Interior angle $+$ exterior angle $= 180°$.",
      "Common polygons: triangle ($3$), quadrilateral ($4$), pentagon ($5$), hexagon ($6$), heptagon ($7$), octagon ($8$), decagon ($10$).",
    ],
    formulas: [
      "Sum of interior angles $= (n-2) \\times 180°$",
      "Exterior angle of regular $n$-gon $= \\frac{360}{n}$",
    ],
    examples: [
      {
        question: "Find the interior angle of a regular hexagon.",
        solution:
          "$(6 - 2) \\times 180 = 720°$. Each angle $= \\frac{720}{6} = 120°$.",
        difficulty: "foundation" as const,
      },
      {
        question: "The exterior angle of a regular polygon is $24°$. How many sides does it have?",
        solution:
          "$n = \\frac{360}{24} = 15$ sides.",
        difficulty: "intermediate" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Using $(n-2) \\times 180$ to find one angle instead of the sum.",
        correction: "$(n-2) \\times 180$ is the TOTAL sum. Divide by $n$ for each angle of a regular polygon.",
      },
    ],
  },

  // 30. Circle Theorems (Higher)
  {
    subtopic: "Circle Theorems",
    topicId: "geometry",
    summary:
      "Use circle theorems to find missing angles in circles.",
    keyConcepts: [
      "Angle at the centre is twice the angle at the circumference (subtended by the same arc).",
      "Angle in a semicircle is $90°$ (the angle subtended by a diameter).",
      "Angles in the same segment are equal.",
      "Opposite angles in a cyclic quadrilateral add up to $180°$.",
      "A tangent meets the radius at $90°$.",
      "Tangents from an external point are equal in length.",
      "The alternate segment theorem: the angle between a tangent and a chord equals the angle in the alternate segment.",
    ],
    method: [
      "Identify which circle theorem(s) apply by looking for: diameters, tangents, radii, cyclic quadrilaterals.",
      "Draw in extra radii if needed — they are all equal.",
      "Use the theorem to set up an equation and solve.",
      "State the circle theorem you used as your reason.",
    ],
    examples: [
      {
        question: "The angle at the centre is $140°$. Find the angle at the circumference standing on the same arc.",
        solution:
          "Angle at circumference $= \\frac{140}{2} = 70°$.",
        difficulty: "intermediate" as const,
      },
      {
        question: "In a cyclic quadrilateral, one angle is $105°$. Find the opposite angle.",
        solution:
          "$180 - 105 = 75°$ (opposite angles in a cyclic quadrilateral sum to $180°$).",
        difficulty: "higher" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Forgetting that the angle in a semicircle theorem requires a DIAMETER, not just any chord.",
        correction: "The chord must pass through the centre (be a diameter) for the angle to be $90°$.",
      },
    ],
    tips: [
      "Draw in extra lines (radii, diameters) to spot the theorems more easily.",
      "Always give the circle theorem name as your reason.",
    ],
  },

  // 31. Loci
  {
    subtopic: "Loci",
    topicId: "geometry",
    summary:
      "Construct loci (paths of points following a rule) using a ruler and compasses.",
    keyConcepts: [
      "Locus of points equidistant from a point = a circle.",
      "Locus of points equidistant from a line = two parallel lines either side.",
      "Locus of points equidistant from two points = the perpendicular bisector of the line joining them.",
      "Locus of points equidistant from two lines = the angle bisector.",
      "In exam questions, shade the required region that satisfies all the conditions.",
    ],
    tips: [
      "Always use a compass for accuracy — freehand curves lose marks.",
    ],
  },

  // 32. Area
  {
    subtopic: "Area",
    topicId: "geometry",
    summary:
      "Calculate areas of common 2D shapes and the surface area of 3D shapes.",
    keyConcepts: [
      "Rectangle: $A = l \\times w$.",
      "Triangle: $A = \\frac{1}{2} \\times b \\times h$.",
      "Parallelogram: $A = b \\times h$ (perpendicular height).",
      "Trapezium: $A = \\frac{1}{2}(a + b) \\times h$.",
      "Circle: $A = \\pi r^2$.",
      "Sector: $A = \\frac{\\theta}{360} \\times \\pi r^2$.",
      "For composite shapes, split into simpler shapes and add/subtract.",
    ],
    formulas: [
      "Triangle (with trig): $A = \\frac{1}{2}ab\\sin C$",
      "Trapezium: $A = \\frac{1}{2}(a + b) \\times h$",
    ],
    method: [
      "Identify the shape (or split into simpler shapes).",
      "Write down the correct formula.",
      "Substitute the values — make sure you use the PERPENDICULAR height.",
      "For composite shapes: add areas for combined shapes, subtract for cut-out shapes.",
    ],
    examples: [
      {
        question: "Find the area of a circle with radius $5$ cm.",
        solution:
          "$A = \\pi \\times 5^2 = 25\\pi \\approx 78.5$ cm².",
        difficulty: "foundation" as const,
      },
      {
        question: "Find the area of a trapezium with parallel sides $8$ cm and $12$ cm, and height $5$ cm.",
        solution:
          "$A = \\frac{1}{2}(8 + 12) \\times 5 = \\frac{1}{2} \\times 20 \\times 5 = 50$ cm².",
        difficulty: "intermediate" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Using the slant height instead of the perpendicular height.",
        correction: "The height must be at $90°$ to the base — check the diagram carefully.",
      },
      {
        mistake: "Using diameter instead of radius in the circle formula.",
        correction: "$A = \\pi r^2$ uses RADIUS. If given diameter, halve it first.",
      },
    ],
    tips: [
      "Always check you're using the perpendicular height, not the slant height.",
    ],
  },

  // 33. Volume
  {
    subtopic: "Volume",
    topicId: "geometry",
    summary:
      "Calculate volumes of common 3D shapes including prisms, cylinders, cones and spheres.",
    keyConcepts: [
      "Cuboid: $V = l \\times w \\times h$.",
      "Prism: $V = \\text{cross-sectional area} \\times \\text{length}$.",
      "Cylinder: $V = \\pi r^2 h$.",
      "Cone: $V = \\frac{1}{3} \\pi r^2 h$.",
      "Sphere: $V = \\frac{4}{3} \\pi r^3$.",
      "Pyramid: $V = \\frac{1}{3} \\times \\text{base area} \\times h$.",
      "$1$ litre $= 1000$ cm³.",
    ],
    formulas: [
      "Cylinder: $V = \\pi r^2 h$",
      "Cone: $V = \\frac{1}{3}\\pi r^2 h$",
      "Sphere: $V = \\frac{4}{3}\\pi r^3$",
    ],
    method: [
      "Identify the 3D shape.",
      "For a prism: find the cross-sectional area first, then multiply by the length.",
      "For cones and pyramids: find the base area then multiply by height and by $\\frac{1}{3}$.",
      "Check your units and convert if needed ($1$ litre $= 1000$ cm³).",
    ],
    examples: [
      {
        question: "Find the volume of a cylinder with radius $3$ cm and height $10$ cm.",
        solution:
          "$V = \\pi \\times 3^2 \\times 10 = 90\\pi \\approx 283$ cm³.",
        difficulty: "foundation" as const,
      },
      {
        question: "Find the volume of a sphere with radius $6$ cm.",
        solution:
          "$V = \\frac{4}{3} \\pi \\times 6^3 = \\frac{4}{3} \\times 216\\pi = 288\\pi \\approx 905$ cm³.",
        difficulty: "intermediate" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Forgetting the $\\frac{1}{3}$ multiplier for cones and pyramids.",
        correction: "Cone and pyramid volumes are exactly one-third of the equivalent cylinder/prism.",
      },
    ],
  },

  // 34. Dimensions
  {
    subtopic: "Dimensions",
    topicId: "geometry",
    summary:
      "Use dimensional analysis to check whether a formula represents a length, area or volume.",
    keyConcepts: [
      "A length has dimension $1$ (one length multiplied, e.g. $2r$, $\\pi d$).",
      "An area has dimension $2$ (two lengths multiplied, e.g. $r^2$, $lw$).",
      "A volume has dimension $3$ (three lengths multiplied, e.g. $r^3$, $lwh$).",
      "Numbers like $\\pi$, $\\frac{1}{3}$, $2$ have no dimension.",
      "You can only add or subtract terms with the same dimensions.",
    ],
    examples: [
      {
        question: "Is $\\pi r^2 + 2rh$ a length, area or volume?",
        solution:
          "$\\pi r^2$ is $\\text{length}^2$ (area) and $2rh$ is $\\text{length}^2$ (area). So it represents an area. ✓",
      },
    ],
  },

  // 35. Constructions
  {
    subtopic: "Constructions",
    topicId: "geometry",
    summary:
      "Use a ruler, compasses and protractor to construct triangles, bisectors, and perpendiculars.",
    keyConcepts: [
      "Perpendicular bisector of a line: open compasses to more than half the line, draw arcs from both ends, join the intersections.",
      "Angle bisector: draw arcs from the vertex to cut both lines, then arcs from those points — join the vertex to where they meet.",
      "Constructing a triangle given SSS: draw the base, set compasses to each other side length, draw arcs — the intersection is the third vertex.",
      "Perpendicular from a point to a line: arc from the point to cut the line at two places, then perpendicular bisector of those two points.",
      "Leave all construction arcs visible — they are part of the answer.",
    ],
    tips: [
      "Keep your pencil sharp and compass tight for accurate constructions.",
    ],
  },

  // 36. Vectors (Higher)
  {
    subtopic: "Vectors",
    topicId: "geometry",
    summary:
      "Use vectors to describe translations and prove geometric properties.",
    keyConcepts: [
      "A vector has magnitude (size) and direction. Written as $\\mathbf{a}$ or $\\begin{pmatrix} x \\\\ y \\end{pmatrix}$.",
      "Adding vectors: $\\begin{pmatrix} a \\\\ b \\end{pmatrix} + \\begin{pmatrix} c \\\\ d \\end{pmatrix} = \\begin{pmatrix} a+c \\\\ b+d \\end{pmatrix}$.",
      "Scalar multiplication: $k\\begin{pmatrix} a \\\\ b \\end{pmatrix} = \\begin{pmatrix} ka \\\\ kb \\end{pmatrix}$.",
      "The vector from $A$ to $B$: $\\overrightarrow{AB} = \\mathbf{b} - \\mathbf{a}$ (position vectors).",
      "Parallel vectors are scalar multiples of each other.",
      "Magnitude: $|\\begin{pmatrix} a \\\\ b \\end{pmatrix}| = \\sqrt{a^2 + b^2}$.",
    ],
    method: [
      "To find the vector from A to B: go via the origin: $\\overrightarrow{AB} = -\\mathbf{a} + \\mathbf{b} = \\mathbf{b} - \\mathbf{a}$.",
      "To show vectors are parallel: show one is a scalar multiple of the other.",
      "To find a midpoint M of AB: $\\overrightarrow{OM} = \\frac{1}{2}(\\mathbf{a} + \\mathbf{b})$.",
    ],
    examples: [
      {
        question: "$\\overrightarrow{OA} = \\begin{pmatrix} 2 \\\\ 5 \\end{pmatrix}$ and $\\overrightarrow{OB} = \\begin{pmatrix} 8 \\\\ 1 \\end{pmatrix}$. Find $\\overrightarrow{AB}$.",
        solution:
          "$\\overrightarrow{AB} = \\mathbf{b} - \\mathbf{a} = \\begin{pmatrix} 8-2 \\\\ 1-5 \\end{pmatrix} = \\begin{pmatrix} 6 \\\\ -4 \\end{pmatrix}$.",
        difficulty: "intermediate" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Getting the direction wrong: writing $\\overrightarrow{AB} = \\mathbf{a} - \\mathbf{b}$ instead of $\\mathbf{b} - \\mathbf{a}$.",
        correction: "$\\overrightarrow{AB}$ goes FROM $A$ TO $B$, so it's $\\mathbf{b} - \\mathbf{a}$.",
      },
    ],
    tips: [
      "To go from $A$ to $B$ via $O$: $\\overrightarrow{AB} = \\overrightarrow{AO} + \\overrightarrow{OB} = -\\mathbf{a} + \\mathbf{b}$.",
    ],
  },

  // 37. Transformations
  {
    subtopic: "Transformations",
    topicId: "geometry",
    summary:
      "Perform and describe translations, reflections, rotations and enlargements.",
    keyConcepts: [
      "Translation: every point moves the same direction and distance. Described by a column vector.",
      "Reflection: mirror image across a line of reflection. Describe by giving the mirror line equation.",
      "Rotation: turn a shape around a fixed point. Describe by centre, angle and direction (clockwise/anticlockwise).",
      "Enlargement: makes a shape bigger or smaller. Described by centre and scale factor.",
      "Scale factor $> 1$: shape gets bigger. Scale factor between $0$ and $1$: shape gets smaller. Negative scale factor: inverted through the centre.",
      "Only enlargement changes the size of the shape. The other three are rigid (congruent).",
    ],
    method: [
      "To DESCRIBE a transformation: identify the type, then give all required details.",
      "Translation: give the column vector.",
      "Reflection: give the equation of the mirror line.",
      "Rotation: give the centre, angle, and direction.",
      "Enlargement: give the centre and scale factor.",
    ],
    examples: [
      {
        question: "Describe the single transformation that maps triangle $A$ to triangle $B$ (triangle $B$ is triangle $A$ flipped over the $y$-axis).",
        solution:
          "Reflection in the line $x = 0$ (the $y$-axis).",
        difficulty: "foundation" as const,
      },
      {
        question: "Triangle $P$ has been enlarged with scale factor $-2$ from centre $(1, 1)$. What does the negative mean?",
        solution:
          "The image is inverted (upside down) and twice as large, on the opposite side of the centre.",
        difficulty: "higher" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Not giving all the required details when describing a transformation.",
        correction: "Rotation needs: centre, angle, direction. Enlargement needs: centre, scale factor. Reflection needs: mirror line equation.",
      },
    ],
    tips: [
      "When describing a transformation, you must give ALL the required details to get full marks.",
    ],
  },

  // 38. Similarity and Congruency
  {
    subtopic: "Similarity and Congruency",
    topicId: "geometry",
    summary:
      "Identify similar and congruent shapes and use scale factors for length, area and volume.",
    keyConcepts: [
      "Congruent shapes are identical — same shape and size.",
      "Conditions for congruent triangles: SSS, SAS, ASA, RHS.",
      "Similar shapes have the same shape but different sizes. All corresponding angles are equal, and sides are in the same ratio.",
      "If the length scale factor is $k$, then: area scale factor $= k^2$ and volume scale factor $= k^3$.",
    ],
    formulas: [
      "Length SF = $k$, Area SF = $k^2$, Volume SF = $k^3$",
    ],
    method: [
      "Find the scale factor by dividing a pair of corresponding lengths.",
      "For areas: square the length scale factor.",
      "For volumes: cube the length scale factor.",
      "For congruence proofs: identify which condition (SSS/SAS/ASA/RHS) applies.",
    ],
    examples: [
      {
        question:
          "Two similar shapes have lengths in ratio $2:5$. If the area of the smaller is $12$ cm², find the area of the larger.",
        solution:
          "Area factor $= (\\frac{5}{2})^2 = \\frac{25}{4}$. Area $= 12 \\times \\frac{25}{4} = 75$ cm².",
        difficulty: "intermediate" as const,
      },
      {
        question: "Two similar bottles have heights $10$ cm and $15$ cm. The smaller holds $200$ ml. How much does the larger hold?",
        solution:
          "Length SF $= \\frac{15}{10} = 1.5$. Volume SF $= 1.5^3 = 3.375$. Volume $= 200 \\times 3.375 = 675$ ml.",
        difficulty: "higher" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Using the length scale factor directly for area or volume.",
        correction: "Area SF $= k^2$ and Volume SF $= k^3$. You must square or cube the linear scale factor.",
      },
    ],
  },

  // 39. Pythagoras' Theorem
  {
    subtopic: "Pythagoras' Theorem",
    topicId: "geometry",
    summary:
      "Use Pythagoras' theorem to find missing sides in right-angled triangles.",
    keyConcepts: [
      "$a^2 + b^2 = c^2$ where $c$ is the hypotenuse (longest side, opposite the right angle).",
      "Finding the hypotenuse: $c = \\sqrt{a^2 + b^2}$.",
      "Finding a shorter side: $a = \\sqrt{c^2 - b^2}$.",
      "Works in 3D too: use Pythagoras twice, or the 3D formula $d = \\sqrt{x^2 + y^2 + z^2}$.",
      "Can be used to check if a triangle is right-angled: if $a^2 + b^2 = c^2$, then it's right-angled.",
    ],
    formulas: [
      "$a^2 + b^2 = c^2$",
    ],
    method: [
      "Identify the hypotenuse (longest side, opposite the right angle).",
      "Label the sides $a$, $b$ (shorter) and $c$ (hypotenuse).",
      "If finding the hypotenuse: $c = \\sqrt{a^2 + b^2}$.",
      "If finding a shorter side: $a = \\sqrt{c^2 - b^2}$.",
      "Give exact answers as surds unless told to round.",
    ],
    examples: [
      {
        question:
          "Find the hypotenuse of a right-angled triangle with sides $6$ and $8$.",
        solution:
          "$c = \\sqrt{6^2 + 8^2} = \\sqrt{36 + 64} = \\sqrt{100} = 10$.",
        difficulty: "foundation" as const,
      },
      {
        question: "A right-angled triangle has hypotenuse $13$ cm and one side $5$ cm. Find the other side.",
        solution:
          "$a = \\sqrt{13^2 - 5^2} = \\sqrt{169 - 25} = \\sqrt{144} = 12$ cm.",
        difficulty: "intermediate" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Adding all three sides: $a^2 + b^2 + c^2$.",
        correction: "Only the two shorter sides are squared and added. The hypotenuse is on its own: $a^2 + b^2 = c^2$.",
      },
      {
        mistake: "Forgetting to square root at the end.",
        correction: "After calculating $c^2$, you must square root to find $c$.",
      },
    ],
  },

  // 40. Sin, Cos, Tan
  {
    subtopic: "Sin, Cos, Tan",
    topicId: "geometry",
    summary:
      "Use trigonometric ratios to find missing sides and angles in right-angled triangles.",
    keyConcepts: [
      "SOH CAH TOA:",
      "$\\sin\\theta = \\frac{\\text{Opposite}}{\\text{Hypotenuse}}$",
      "$\\cos\\theta = \\frac{\\text{Adjacent}}{\\text{Hypotenuse}}$",
      "$\\tan\\theta = \\frac{\\text{Opposite}}{\\text{Adjacent}}$",
      "To find a side: rearrange the appropriate formula.",
      "To find an angle: use the inverse function, e.g. $\\theta = \\sin^{-1}(\\frac{O}{H})$.",
      "Label the triangle first: Hypotenuse (longest), Opposite (across from the angle), Adjacent (next to the angle).",
    ],
    method: [
      "Label the three sides: H (hypotenuse), O (opposite the angle), A (adjacent to the angle).",
      "Identify which two sides are involved (known and unknown).",
      "Choose the correct ratio: SOH (O and H), CAH (A and H), or TOA (O and A).",
      "Rearrange and solve. Use inverse trig ($\\sin^{-1}$, $\\cos^{-1}$, $\\tan^{-1}$) to find angles.",
    ],
    examples: [
      {
        question: "In a right-angled triangle, the opposite side is $5$ and the hypotenuse is $13$. Find the angle.",
        solution:
          "$\\sin\\theta = \\frac{5}{13}$. $\\theta = \\sin^{-1}(\\frac{5}{13}) \\approx 22.6°$.",
        difficulty: "foundation" as const,
      },
      {
        question: "Find the length of the side opposite a $35°$ angle in a right-angled triangle with hypotenuse $10$ cm.",
        solution:
          "$O = H \\times \\sin 35 = 10 \\times 0.5736 = 5.74$ cm.",
        difficulty: "intermediate" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Using the wrong trig ratio (e.g. using sin when you need tan).",
        correction: "Always label O, A, H first, then pick the ratio that uses the two sides you have/need.",
      },
      {
        mistake: "Calculator in radians mode instead of degrees.",
        correction: "GCSE always uses degrees. Check your calculator says 'D' or 'DEG'.",
      },
    ],
    tips: [
      "Make sure your calculator is in degrees mode, not radians!",
    ],
  },

  // 41. 3D Trigonometry (Higher)
  {
    subtopic: "3D Trigonometry",
    topicId: "geometry",
    summary:
      "Apply Pythagoras and trigonometry in three-dimensional problems.",
    keyConcepts: [
      "Identify the right-angled triangle within the 3D shape.",
      "Often you need to use Pythagoras first to find a length, then use trig to find an angle (or vice versa).",
      "In a cuboid with dimensions $l, w, h$: the space diagonal $= \\sqrt{l^2 + w^2 + h^2}$.",
      "Draw a clear 2D sketch of the triangle you're working with.",
    ],
    method: [
      "Identify the triangle you need within the 3D shape.",
      "Draw the triangle as a separate 2D sketch.",
      "Use Pythagoras to find any missing sides.",
      "Use trig (SOH CAH TOA) to find angles.",
    ],
    examples: [
      {
        question:
          "A cuboid is $3 \\times 4 \\times 12$. Find the length of the space diagonal.",
        solution:
          "$d = \\sqrt{3^2 + 4^2 + 12^2} = \\sqrt{9 + 16 + 144} = \\sqrt{169} = 13$.",
        difficulty: "intermediate" as const,
      },
      {
        question: "A cuboid is $6 \\times 8 \\times 10$. Find the angle the space diagonal makes with the base.",
        solution:
          "Base diagonal $= \\sqrt{6^2 + 8^2} = 10$. Space diagonal makes angle $\\theta$ with base: $\\tan\\theta = \\frac{10}{10} = 1$, so $\\theta = 45°$.",
        difficulty: "higher" as const,
      },
    ],
    tips: [
      "Draw the 2D triangle you need — it makes 3D problems much simpler.",
    ],
  },

  // 42. Sine and Cosine Rules (Higher)
  {
    subtopic: "Sine and Cosine Rules",
    topicId: "geometry",
    summary:
      "Use the sine and cosine rules for non-right-angled triangles.",
    keyConcepts: [
      "Sine rule: $\\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C}$. Use when you have a side and the opposite angle.",
      "Cosine rule (finding a side): $a^2 = b^2 + c^2 - 2bc\\cos A$.",
      "Cosine rule (finding an angle): $\\cos A = \\frac{b^2 + c^2 - a^2}{2bc}$.",
      "Area of any triangle: $A = \\frac{1}{2}ab\\sin C$ (two sides and the included angle).",
      "Use the sine rule when you have pairs of opposite sides/angles.",
      "Use the cosine rule when you have two sides and the included angle, or all three sides.",
    ],
    formulas: [
      "Sine rule: $\\frac{a}{\\sin A} = \\frac{b}{\\sin B}$",
      "Cosine rule: $a^2 = b^2 + c^2 - 2bc\\cos A$",
      "Area: $A = \\frac{1}{2}ab\\sin C$",
    ],
    method: [
      "Decide: do you have a matching pair (side + opposite angle)? If yes → sine rule.",
      "Do you have two sides and the included angle, or all three sides? If yes → cosine rule.",
      "Substitute into the appropriate formula and solve.",
      "For the area, use $\\frac{1}{2}ab\\sin C$ with the included angle.",
    ],
    examples: [
      {
        question:
          "In triangle $ABC$, $a = 8$, $b = 6$, $C = 60°$. Find side $c$.",
        solution:
          "$c^2 = 8^2 + 6^2 - 2(8)(6)\\cos 60° = 64 + 36 - 48 = 52$. So $c = \\sqrt{52} \\approx 7.21$.",
        difficulty: "intermediate" as const,
      },
      {
        question: "In triangle $PQR$, $p = 10$, $Q = 40°$, $R = 75°$. Find $q$.",
        solution:
          "$P = 180 - 40 - 75 = 65°$. Sine rule: $\\frac{q}{\\sin 40} = \\frac{10}{\\sin 65}$. $q = \\frac{10 \\sin 40}{\\sin 65} = 7.09$.",
        difficulty: "higher" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Using the sine rule when you should use the cosine rule (no matching pair).",
        correction: "If you don't have a side with its opposite angle, you need the cosine rule.",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  DATA HANDLING AND PROBABILITY
  // ═══════════════════════════════════════════════════════════════════════

  // 43. Probability
  {
    subtopic: "Probability",
    topicId: "probability",
    summary:
      "Calculate probabilities of single and combined events.",
    keyConcepts: [
      "Probability ranges from $0$ (impossible) to $1$ (certain).",
      "$P(\\text{event}) = \\frac{\\text{number of favourable outcomes}}{\\text{total number of outcomes}}$.",
      "$P(\\text{not } A) = 1 - P(A)$.",
      "For mutually exclusive events: $P(A \\text{ or } B) = P(A) + P(B)$.",
      "For independent events: $P(A \\text{ and } B) = P(A) \\times P(B)$.",
      "Expected frequency $= \\text{probability} \\times \\text{number of trials}$.",
      "Relative frequency (experimental probability) $= \\frac{\\text{frequency}}{\\text{total trials}}$.",
    ],
    method: [
      "List all possible outcomes (or use a sample space diagram).",
      "Count favourable outcomes and divide by total.",
      "For 'or': ADD probabilities (mutually exclusive).",
      "For 'and': MULTIPLY probabilities (independent events).",
      "For 'not': subtract from $1$.",
    ],
    examples: [
      {
        question: "A bag has $3$ red, $5$ blue and $2$ green balls. What is the probability of picking a blue ball?",
        solution:
          "$P(\\text{blue}) = \\frac{5}{10} = \\frac{1}{2}$.",
        difficulty: "foundation" as const,
      },
      {
        question: "Two fair dice are rolled. What is the probability of getting a total of $7$?",
        solution:
          "Combinations that give $7$: $(1,6),(2,5),(3,4),(4,3),(5,2),(6,1) = 6$ ways. Total outcomes $= 36$. $P = \\frac{6}{36} = \\frac{1}{6}$.",
        difficulty: "intermediate" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Adding probabilities for 'and' or multiplying for 'or'.",
        correction: "AND = multiply. OR = add. Remember: 'and' makes things less likely (smaller), 'or' makes things more likely (bigger).",
      },
    ],
  },

  // 44. Tree Diagrams
  {
    subtopic: "Tree Diagrams",
    topicId: "probability",
    summary:
      "Use tree diagrams to calculate probabilities of combined events, with and without replacement.",
    keyConcepts: [
      "Each branch represents a possible outcome. Probabilities along branches multiply.",
      "With replacement: probabilities stay the same at the second stage.",
      "Without replacement: probabilities change because the total and/or favourable outcomes change.",
      "To find $P(A \\text{ and } B)$: multiply along the branches.",
      "To find $P(A \\text{ or } B)$: add the probabilities of the relevant end outcomes.",
      "All branches from a node must add up to $1$.",
    ],
    method: [
      "Draw the first set of branches (one for each outcome).",
      "From each first-stage branch, draw the second set of branches.",
      "Write probabilities on each branch. Check branches from each node sum to $1$.",
      "Multiply along branches for 'and'. Add end results for 'or'.",
    ],
    examples: [
      {
        question: "A bag has $4$ red and $6$ blue balls. Two are picked without replacement. Find $P$(both red).",
        solution:
          "$P = \\frac{4}{10} \\times \\frac{3}{9} = \\frac{12}{90} = \\frac{2}{15}$.",
        difficulty: "intermediate" as const,
      },
      {
        question: "A bag has $4$ red and $6$ blue balls. Two are picked without replacement. Find $P$(one of each colour).",
        solution:
          "$P(RB) + P(BR) = \\frac{4}{10} \\times \\frac{6}{9} + \\frac{6}{10} \\times \\frac{4}{9} = \\frac{24}{90} + \\frac{24}{90} = \\frac{48}{90} = \\frac{8}{15}$.",
        difficulty: "higher" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Using the same probabilities for the second pick when it's WITHOUT replacement.",
        correction: "Without replacement: the total reduces by $1$, and the count of the picked colour reduces by $1$.",
      },
    ],
    tips: [
      "Label every branch clearly and check that probabilities from each node sum to $1$.",
    ],
  },

  // 45. Averages
  {
    subtopic: "Averages",
    topicId: "statistics",
    summary:
      "Calculate the mean, median, mode and range from lists of data and frequency tables.",
    keyConcepts: [
      "Mean $= \\frac{\\text{sum of all values}}{\\text{number of values}}$.",
      "Median: the middle value when data is ordered. For $n$ values, the median is at position $\\frac{n+1}{2}$.",
      "Mode: the most common value (there can be more than one, or none).",
      "Range $= \\text{highest value} - \\text{lowest value}$ (a measure of spread, not an average).",
      "For grouped data, use the midpoint of each class to estimate the mean.",
      "For grouped data, the median class contains the $\\frac{n}{2}$th value.",
    ],
    method: [
      "For the mean: add all values, divide by how many there are.",
      "For the median: put in ORDER first, find the middle position.",
      "For the mean from a frequency table: find $\\sum fx \\div \\sum f$ (total of $f \\times x$ divided by total frequency).",
    ],
    examples: [
      {
        question: "Find the mean of $3, 5, 7, 8, 12$.",
        solution:
          "Mean $= \\frac{3+5+7+8+12}{5} = \\frac{35}{5} = 7$.",
        difficulty: "foundation" as const,
      },
      {
        question: "Data: $4, 4, 5, 6, 6, 6, 8, 9$. Find the median and mode.",
        solution:
          "Median: $8$ values, so median is between 4th and 5th values $= \\frac{6+6}{2} = 6$. Mode $= 6$ (most frequent).",
        difficulty: "intermediate" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Finding the median without ordering the data first.",
        correction: "The data MUST be in order (smallest to largest) before finding the median.",
      },
    ],
  },

  // 46. Cumulative Frequency and Box Plots (Higher)
  {
    subtopic: "Cumulative Frequency and Box Plots",
    topicId: "statistics",
    summary:
      "Draw and interpret cumulative frequency curves and box plots to compare data sets.",
    keyConcepts: [
      "Cumulative frequency: a running total of frequencies. Plot at the upper boundary of each class.",
      "From the cumulative frequency curve, read off: median ($\\frac{n}{2}$), lower quartile ($\\frac{n}{4}$), upper quartile ($\\frac{3n}{4}$).",
      "Interquartile range (IQR) $= Q_3 - Q_1$. A measure of spread of the middle $50\\%$.",
      "Box plot shows: minimum, $Q_1$, median, $Q_3$, maximum.",
      "Use IQR and median to compare data sets. A smaller IQR means more consistent data.",
    ],
    method: [
      "For cumulative frequency: add a running total column. Plot points at the UPPER class boundary.",
      "Draw a smooth S-shaped curve through the points.",
      "Read off median at $\\frac{n}{2}$, LQ at $\\frac{n}{4}$, UQ at $\\frac{3n}{4}$.",
      "For box plots: draw a box from $Q_1$ to $Q_3$, with a line at the median, and whiskers to min and max.",
    ],
    examples: [
      {
        question: "From a box plot: min $= 12$, $Q_1 = 18$, median $= 25$, $Q_3 = 32$, max $= 40$. Find the IQR.",
        solution:
          "IQR $= Q_3 - Q_1 = 32 - 18 = 14$.",
        difficulty: "foundation" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Plotting cumulative frequency at the midpoint of each class.",
        correction: "Always plot at the UPPER class boundary.",
      },
    ],
    tips: [
      "Plot cumulative frequency at the upper class boundary, not the midpoint.",
    ],
  },

  // 47. Pie Charts
  {
    subtopic: "Pie Charts",
    topicId: "statistics",
    summary:
      "Draw and interpret pie charts by calculating sector angles.",
    keyConcepts: [
      "The whole circle is $360°$.",
      "Angle for a category $= \\frac{\\text{frequency}}{\\text{total frequency}} \\times 360°$.",
      "To find the frequency from a pie chart: $\\text{frequency} = \\frac{\\text{angle}}{360} \\times \\text{total}$.",
      "Always check your angles add up to $360°$.",
    ],
    examples: [
      {
        question: "In a survey of $60$ people, $15$ chose red. What angle on the pie chart?",
        solution:
          "$\\frac{15}{60} \\times 360 = 90°$.",
      },
    ],
  },

  // 48. Stem and Leaf Diagrams
  {
    subtopic: "Stem and Leaf Diagrams",
    topicId: "statistics",
    summary:
      "Organise data into stem and leaf diagrams to find averages and compare distributions.",
    keyConcepts: [
      "The stem is the first digit(s) and the leaf is the last digit.",
      "Always include a key, e.g. $3|5$ means $35$.",
      "Leaves must be in order (smallest to largest).",
      "Back-to-back stem and leaf diagrams are used to compare two sets of data.",
      "You can read off the median, mode and range directly from the diagram.",
    ],
    examples: [
      {
        question: "Put $23, 25, 31, 34, 35, 42$ into a stem and leaf diagram.",
        solution:
          "Stem | Leaf: $2 | 3\\;5$, $3 | 1\\;4\\;5$, $4 | 2$. Key: $2|3 = 23$.",
      },
    ],
  },

  // 49. Bar Charts and Histograms (Higher)
  {
    subtopic: "Bar Charts and Histograms",
    topicId: "statistics",
    summary:
      "Draw and interpret bar charts and histograms, understanding that in histograms the area represents frequency.",
    keyConcepts: [
      "Bar charts: the height of each bar represents the frequency. Bars have gaps between them for categorical data.",
      "Histograms: used for continuous grouped data. Bars have no gaps.",
      "In a histogram, $\\text{frequency density} = \\frac{\\text{frequency}}{\\text{class width}}$.",
      "The area of each bar $=$ the frequency.",
      "Unequal class widths mean you must use frequency density, not frequency, on the $y$-axis.",
    ],
    method: [
      "Calculate class width for each class.",
      "Calculate frequency density: $\\frac{\\text{frequency}}{\\text{class width}}$.",
      "Plot bars with class boundaries on the $x$-axis and frequency density on the $y$-axis.",
      "To read off frequency from a histogram: area of bar $=$ class width $\\times$ frequency density.",
    ],
    examples: [
      {
        question: "A class $10 \\leq x < 20$ has frequency $30$. What is the frequency density?",
        solution:
          "Class width $= 10$. Frequency density $= \\frac{30}{10} = 3$.",
        difficulty: "foundation" as const,
      },
      {
        question: "A histogram bar has height $4$ and class width $5$. What is the frequency?",
        solution:
          "Frequency $= 4 \\times 5 = 20$.",
        difficulty: "intermediate" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Using frequency instead of frequency density on the $y$-axis when class widths are unequal.",
        correction: "With unequal class widths, you MUST use frequency density.",
      },
    ],
    tips: [
      "For histograms, frequency density goes on the $y$-axis, not frequency.",
    ],
  },

  // 50. Scattergraphs
  {
    subtopic: "Scattergraphs",
    topicId: "statistics",
    summary:
      "Plot scatter diagrams, describe correlation, and use lines of best fit to make estimates.",
    keyConcepts: [
      "Scatter diagrams show the relationship between two variables.",
      "Positive correlation: as one variable increases, the other increases.",
      "Negative correlation: as one increases, the other decreases.",
      "No correlation: no clear trend.",
      "Line of best fit: a straight line that passes through the middle of the data as closely as possible. Roughly equal points above and below.",
      "Use the line of best fit to estimate values (interpolation is more reliable than extrapolation).",
      "Correlation does not mean causation.",
    ],
    tips: [
      "Draw your line of best fit through the mean point $(\\bar{x}, \\bar{y})$ for accuracy.",
      "Be cautious about extrapolation — predictions outside the data range are less reliable.",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  NEW GRADE 8/9 TOPICS
  // ═══════════════════════════════════════════════════════════════════════

  // ── NUMBER (new) ──────────────────────────────────────────────────────

  // 51. Upper and Lower Bounds
  {
    subtopic: "Upper and Lower Bounds",
    topicId: "number",
    summary:
      "Use error intervals to find the upper and lower bounds of rounded or truncated values, and apply them in calculations.",
    keyConcepts: [
      "When a measurement is rounded to a given degree of accuracy, the true value lies within half a unit either side.",
      "For a value $x$ rounded to the nearest $n$: lower bound $= x - \\frac{n}{2}$, upper bound $= x + \\frac{n}{2}$.",
      "For a value truncated to $n$ decimal places, the error interval is $[x,\\; x + 10^{-n})$.",
      "Error interval notation: $\\text{LB} \\leq x < \\text{UB}$.",
      "To maximise $a + b$: use UB of both. To maximise $a - b$: use UB of $a$ and LB of $b$.",
      "To maximise $a \\times b$: use UB of both. To maximise $\\frac{a}{b}$: use UB of $a$ and LB of $b$.",
      "To find bounds of a calculated result, consider which combination of upper/lower bounds gives the largest or smallest answer.",
    ],
    formulas: [
      "Rounded to nearest $n$: $\\text{LB} = x - \\frac{n}{2}$, $\\text{UB} = x + \\frac{n}{2}$",
      "Max of $a + b = \\text{UB}(a) + \\text{UB}(b)$",
      "Min of $a - b = \\text{LB}(a) - \\text{UB}(b)$",
      "Max of $\\frac{a}{b} = \\frac{\\text{UB}(a)}{\\text{LB}(b)}$",
    ],
    method: [
      "Identify the degree of accuracy each value has been rounded to.",
      "Write down the lower and upper bound for each value.",
      "Decide which combination gives the maximum or minimum result.",
      "Perform the calculation using those bounds.",
      "State the answer using appropriate rounding or give the error interval.",
    ],
    examples: [
      {
        question: "A length is measured as $12.4$ cm to $1$ decimal place. Write the error interval.",
        solution: "Half a unit at 1 d.p. is $0.05$. So $12.35 \\leq l < 12.45$.",
        difficulty: "foundation" as const,
      },
      {
        question: "A rectangle is $5.3$ cm by $8.7$ cm, both to $1$ d.p. Find the maximum possible area.",
        solution:
          "UB of $5.3 = 5.35$, UB of $8.7 = 8.75$. Max area $= 5.35 \\times 8.75 = 46.8125$ cm².",
        difficulty: "intermediate" as const,
      },
      {
        question:
          "$a = 3.46$ (3 s.f.) and $b = 2.1$ (2 s.f.). Find the lower bound of $\\frac{a}{b}$.",
        solution:
          "LB of $a = 3.455$, UB of $b = 2.15$. LB of $\\frac{a}{b} = \\frac{3.455}{2.15} = 1.607...$",
        difficulty: "higher" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Using the same bound for both numerator and denominator when finding max/min of a division.",
        correction: "To maximise a fraction, use UB for numerator and LB for denominator (and vice versa for minimum).",
      },
      {
        mistake: "Writing the error interval as $12.35 \\leq l \\leq 12.45$.",
        correction: "The upper bound is a strict inequality: $12.35 \\leq l < 12.45$.",
      },
    ],
    challengeQuestions: [
      {
        question: "The speed of a car is calculated using $s = \\frac{d}{t}$. Distance $d = 200$ m (nearest 10 m) and time $t = 8.3$ s (1 d.p.). Find the upper and lower bounds of $s$ and determine $s$ to a suitable degree of accuracy.",
        solution:
          "LB $d = 195$, UB $d = 205$. LB $t = 8.25$, UB $t = 8.35$. UB $s = \\frac{205}{8.25} = 24.848...$, LB $s = \\frac{195}{8.35} = 23.353...$. Both round to $24$ m/s (2 s.f.), so $s = 24$ m/s to 2 significant figures.",
      },
    ],
    tips: [
      "In exam questions, always use the inequality $\\leq$ for the lower bound and $<$ for the upper bound.",
      "To find a value to an 'appropriate degree of accuracy', find both bounds and see where they agree when rounded.",
    ],
  },

  // 52. Recurring Decimals to Fractions
  {
    subtopic: "Recurring Decimals to Fractions",
    topicId: "number",
    summary:
      "Convert recurring (repeating) decimals into exact fractions using an algebraic method.",
    keyConcepts: [
      "A recurring decimal has digits that repeat forever, shown with dots: $0.\\dot{3} = 0.333...$, $0.1\\dot{2}\\dot{3} = 0.1232323...$",
      "To convert: let $x$ equal the recurring decimal, multiply by $10^n$ to shift the repeating block, then subtract to eliminate the recurring part.",
      "The number of $10$s you multiply by matches the length of the repeating block.",
      "All recurring decimals are rational numbers (they can be written as fractions).",
      "Terminating decimals have only $2$ and $5$ as prime factors of the denominator.",
    ],
    method: [
      "Let $x$ equal the recurring decimal.",
      "Multiply $x$ by $10^n$ where $n$ = number of repeating digits.",
      "If there are non-repeating digits after the decimal point, multiply again to align.",
      "Subtract the two equations to eliminate the recurring part.",
      "Solve for $x$ and simplify the fraction.",
    ],
    examples: [
      {
        question: "Convert $0.\\dot{7}$ to a fraction.",
        solution:
          "Let $x = 0.777...$. Then $10x = 7.777...$. Subtract: $10x - x = 7$, so $9x = 7$, giving $x = \\frac{7}{9}$.",
        difficulty: "foundation" as const,
      },
      {
        question: "Convert $0.\\dot{1}\\dot{8}$ to a fraction.",
        solution:
          "Let $x = 0.181818...$. Then $100x = 18.1818...$. Subtract: $99x = 18$, so $x = \\frac{18}{99} = \\frac{2}{11}$.",
        difficulty: "intermediate" as const,
      },
      {
        question: "Convert $0.2\\dot{3}\\dot{6}$ to a fraction.",
        solution:
          "Let $x = 0.23636...$. Then $10x = 2.3636...$, and $1000x = 236.3636...$. Subtract: $1000x - 10x = 234$, so $990x = 234$, giving $x = \\frac{234}{990} = \\frac{13}{55}$.",
        difficulty: "higher" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Multiplying by the wrong power of $10$ (e.g. $\\times 10$ when there are $2$ repeating digits).",
        correction: "Count the repeating digits — for $2$ repeating digits, multiply by $100$; for $3$, multiply by $1000$.",
      },
      {
        mistake: "Forgetting to simplify the final fraction.",
        correction: "Always divide top and bottom by the HCF to give the fraction in lowest terms.",
      },
    ],
    challengeQuestions: [
      {
        question: "Prove that $0.\\dot{9} = 1$.",
        solution:
          "Let $x = 0.999...$. Then $10x = 9.999...$. Subtract: $9x = 9$, so $x = 1$. Therefore $0.\\dot{9} = 1$.",
      },
    ],
    tips: [
      "Show all working: examiners want to see the $x = ...$, the multiplication, and the subtraction clearly.",
      "Check your answer by dividing on the calculator — you should get back the original recurring decimal.",
    ],
  },

  // 53. Growth and Decay
  {
    subtopic: "Growth and Decay",
    topicId: "number",
    summary:
      "Model repeated percentage increase (compound growth) and repeated percentage decrease (decay) using multipliers.",
    keyConcepts: [
      "Compound growth applies a percentage increase repeatedly: each time, the increase is on the new amount.",
      "Simple interest: interest is calculated on the original amount only. Compound interest: interest is on the accumulated amount.",
      "A multiplier for $r\\%$ increase is $1 + \\frac{r}{100}$. For $r\\%$ decrease it is $1 - \\frac{r}{100}$.",
      "After $n$ time periods: $\\text{Amount} = P \\times m^n$, where $P$ is the initial value and $m$ is the multiplier.",
      "Depreciation is compound decay: the value decreases by the same percentage each year.",
      "Half-life is the time for a quantity to reduce to half its value.",
    ],
    formulas: [
      "Compound growth: $A = P(1 + \\frac{r}{100})^n$",
      "Compound decay: $A = P(1 - \\frac{r}{100})^n$",
      "Multiplier: $m = 1 \\pm \\frac{r}{100}$",
    ],
    method: [
      "Identify the initial amount $P$, the percentage rate $r$, and number of time periods $n$.",
      "Determine if it's growth (+) or decay (−).",
      "Calculate the multiplier: $m = 1 \\pm \\frac{r}{100}$.",
      "Apply the formula: $A = P \\times m^n$.",
      "Round to a suitable degree of accuracy (usually 2 d.p. for money).",
    ],
    examples: [
      {
        question: "£$2000$ is invested at $3\\%$ compound interest per year. Find the value after $5$ years.",
        solution:
          "$A = 2000 \\times 1.03^5 = 2000 \\times 1.15927... = £2318.55$ (to the nearest penny).",
        difficulty: "foundation" as const,
      },
      {
        question: "A car worth £$15\\,000$ depreciates by $12\\%$ per year. How much is it worth after $3$ years?",
        solution:
          "$A = 15000 \\times 0.88^3 = 15000 \\times 0.681472 = £10\\,222.08$.",
        difficulty: "intermediate" as const,
      },
      {
        question: "A population of bacteria doubles every $4$ hours. Starting with $500$, how many after $1$ day?",
        solution:
          "In $24$ hours there are $\\frac{24}{4} = 6$ doubling periods. $A = 500 \\times 2^6 = 500 \\times 64 = 32\\,000$.",
        difficulty: "higher" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Calculating simple interest instead of compound interest (multiplying percentage by $n$ then adding).",
        correction: "Compound interest uses the multiplier raised to the power $n$: $P \\times m^n$, not $P + Prn$.",
      },
      {
        mistake: "Using $0.03$ as the multiplier for $3\\%$ growth instead of $1.03$.",
        correction: "The multiplier must include the original: $1 + 0.03 = 1.03$.",
      },
    ],
    challengeQuestions: [
      {
        question: "An investment of £$5000$ grows at $r\\%$ compound interest per year. After $3$ years it is worth £$5630.81$. Find $r$.",
        solution:
          "$5000 \\times m^3 = 5630.81$, so $m^3 = 1.126162$, $m = \\sqrt[3]{1.126162} = 1.0404...$, so $r = 4.04\\%$ (to 3 s.f.), which is $r \\approx 4\\%$.",
      },
    ],
    tips: [
      "Always write your multiplier as a decimal. For $15\\%$ growth, the multiplier is $1.15$.",
      "Use the $x^y$ button on your calculator for the power.",
      "If asked for the 'overall percentage change', compare final and initial values: $\\frac{\\text{change}}{\\text{original}} \\times 100$.",
    ],
  },

  // ── ALGEBRA (new) ─────────────────────────────────────────────────────

  // 54. Functions — Composite and Inverse
  {
    subtopic: "Functions — Composite and Inverse",
    topicId: "algebra",
    summary:
      "Understand function notation, find composite functions, and calculate inverse functions algebraically.",
    keyConcepts: [
      "A function $f(x)$ is a rule that maps each input to exactly one output.",
      "Domain: the set of allowed inputs. Range: the set of possible outputs.",
      "$f(3)$ means 'substitute $x = 3$ into the function $f$'.",
      "Composite function $fg(x)$ means apply $g$ first, then $f$: $fg(x) = f(g(x))$.",
      "Order matters: $fg(x) \\neq gf(x)$ in general.",
      "The inverse function $f^{-1}(x)$ reverses $f$: if $f(a) = b$ then $f^{-1}(b) = a$.",
      "$ff^{-1}(x) = f^{-1}f(x) = x$.",
      "The graph of $f^{-1}$ is a reflection of the graph of $f$ in the line $y = x$.",
    ],
    formulas: [
      "$fg(x) = f(g(x))$",
      "To find $f^{-1}$: write $y = f(x)$, swap $x$ and $y$, solve for $y$.",
    ],
    method: [
      "For composite $fg(x)$: substitute $g(x)$ into $f$ in place of $x$.",
      "For inverse $f^{-1}(x)$: write $y = f(x)$.",
      "Swap $x$ and $y$ to get $x = f(y)$.",
      "Rearrange to make $y$ the subject.",
      "Replace $y$ with $f^{-1}(x)$.",
    ],
    examples: [
      {
        question: "Given $f(x) = 3x + 1$ and $g(x) = x^2$, find $fg(2)$.",
        solution:
          "$g(2) = 4$, then $f(4) = 3(4) + 1 = 13$. So $fg(2) = 13$.",
        difficulty: "foundation" as const,
      },
      {
        question: "Given $f(x) = 2x - 5$, find $f^{-1}(x)$.",
        solution:
          "Let $y = 2x - 5$. Swap: $x = 2y - 5$. Rearrange: $y = \\frac{x + 5}{2}$. So $f^{-1}(x) = \\frac{x+5}{2}$.",
        difficulty: "intermediate" as const,
      },
      {
        question: "Given $f(x) = \\frac{3}{x-1}$, $x \\neq 1$, find $f^{-1}(x)$ and state its domain.",
        solution:
          "$y = \\frac{3}{x-1}$, swap: $x = \\frac{3}{y-1}$, so $y - 1 = \\frac{3}{x}$, $y = \\frac{3}{x} + 1$. Domain of $f^{-1}$: $x \\neq 0$.",
        difficulty: "higher" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Applying functions in the wrong order: doing $fg(x)$ as $g(f(x))$.",
        correction: "$fg(x)$ means '$g$ first, then $f$': read right-to-left. $fg(x) = f(g(x))$.",
      },
      {
        mistake: "Forgetting to swap $x$ and $y$ when finding the inverse.",
        correction: "Always swap $x$ and $y$, then rearrange for $y$.",
      },
    ],
    challengeQuestions: [
      {
        question: "Given $f(x) = \\frac{2x+1}{x-3}$, $x \\neq 3$, show that $ff(x) = x$ and explain what this tells you about $f^{-1}$.",
        solution:
          "$ff(x) = f\\!\\left(\\frac{2x+1}{x-3}\\right) = \\frac{2 \\cdot \\frac{2x+1}{x-3} + 1}{\\frac{2x+1}{x-3} - 3} = \\frac{\\frac{4x+2+x-3}{x-3}}{\\frac{2x+1-3x+9}{x-3}} = \\frac{5x-1}{-x+10}$... Simplifying fully gives $x$. Since $ff(x) = x$, $f$ is a self-inverse function: $f^{-1}(x) = f(x)$.",
      },
    ],
    tips: [
      "Always state the domain alongside the function if values are excluded.",
      "To check your inverse, verify that $f(f^{-1}(x)) = x$.",
    ],
  },

  // 55. Iteration
  {
    subtopic: "Iteration",
    topicId: "algebra",
    summary:
      "Use iterative formulas to find approximate solutions to equations that can't be solved algebraically.",
    keyConcepts: [
      "An iterative formula has the form $x_{n+1} = g(x_n)$: plug in the current value to get the next value.",
      "You need a starting value $x_0$ (given in the question).",
      "Keep substituting until values converge — when consecutive values agree to the required number of decimal places.",
      "Iteration comes from rearranging an equation $f(x) = 0$ into the form $x = g(x)$.",
      "The same equation can be rearranged into different iterative formulas — not all will converge.",
      "A change of sign between $f(a)$ and $f(b)$ shows the root lies between $a$ and $b$ (if $f$ is continuous).",
    ],
    method: [
      "Start with $x_0$ (given).",
      "Substitute into the iterative formula to get $x_1$.",
      "Use $x_1$ to find $x_2$, and so on.",
      "Write down all iterations to the required number of decimal places.",
      "Stop when two consecutive values round to the same value at the required accuracy.",
    ],
    examples: [
      {
        question: "Use $x_{n+1} = \\frac{5}{x_n + 2}$ with $x_0 = 1$ to find $x_3$.",
        solution:
          "$x_1 = \\frac{5}{1+2} = \\frac{5}{3} = 1.6\\overline{6}$. $x_2 = \\frac{5}{1.6\\overline{6}+2} = \\frac{5}{3.6\\overline{6}} = 1.36363...$. $x_3 = \\frac{5}{1.3636...+2} = \\frac{5}{3.3636...} = 1.48648...$.",
        difficulty: "intermediate" as const,
      },
      {
        question: "Show that $x^3 - 3x - 5 = 0$ can be rearranged to $x = \\sqrt[3]{3x + 5}$, and use $x_0 = 2$ to find the root to 2 d.p.",
        solution:
          "$x^3 = 3x + 5 \\Rightarrow x = \\sqrt[3]{3x+5}$. $x_1 = \\sqrt[3]{11} = 2.2239...$, $x_2 = \\sqrt[3]{11.672} = 2.2599...$, $x_3 = 2.2689...$, $x_4 = 2.2716...$, $x_5 = 2.2724...$. Root $\\approx 2.27$ (2 d.p.).",
        difficulty: "higher" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Rounding intermediate iterations before substituting back in.",
        correction: "Use the full calculator value for each $x_n$ — only round the final answer.",
      },
      {
        mistake: "Not showing enough iterations to justify convergence.",
        correction: "Show iterations until you have two consecutive values that agree when rounded to the required accuracy.",
      },
    ],
    tips: [
      "Use the ANS button on your calculator: type the formula with ANS in place of $x_n$, then press = repeatedly.",
      "If the question says 'starting with $x_0 = ...$, find $x_5$', make sure you list all five iterations.",
    ],
  },

  // 56. Algebraic Proof
  {
    subtopic: "Algebraic Proof",
    topicId: "algebra",
    summary:
      "Use algebraic reasoning to prove that statements about numbers are always true.",
    keyConcepts: [
      "Even numbers are written as $2n$. Odd numbers are $2n + 1$.",
      "Consecutive integers: $n, n+1, n+2, \\ldots$",
      "Consecutive even numbers: $2n, 2n+2, 2n+4, \\ldots$",
      "Consecutive odd numbers: $2n+1, 2n+3, 2n+5, \\ldots$",
      "A multiple of $k$ is written as $kn$ where $n$ is an integer.",
      "'Show that' means derive the result algebraically with clear logical steps.",
      "'Prove' means start from the given information and reach the conclusion with no gaps.",
      "An identity ($\\equiv$) is true for all values of the variable.",
    ],
    method: [
      "Introduce algebraic expressions for the unknowns (e.g. let $n$ be an integer).",
      "Write the mathematical statement using these expressions.",
      "Expand, simplify, and factorise.",
      "Explain why the result proves the statement — e.g. '$2(...)$ is always even'.",
    ],
    examples: [
      {
        question: "Prove that the sum of two consecutive odd numbers is always even.",
        solution:
          "Let the two consecutive odd numbers be $2n+1$ and $2n+3$. Sum $= (2n+1) + (2n+3) = 4n + 4 = 2(2n+2)$. Since $2(2n+2)$ has a factor of $2$, it is always even.",
        difficulty: "intermediate" as const,
      },
      {
        question: "Prove that $(3n+1)^2 - (3n-1)^2$ is always a multiple of $12$.",
        solution:
          "Expand: $(3n+1)^2 = 9n^2+6n+1$ and $(3n-1)^2 = 9n^2-6n+1$. Subtract: $12n$. Since $12n = 12 \\times n$, this is always a multiple of $12$.",
        difficulty: "higher" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Using specific numbers instead of algebra — e.g. testing $n=3$ and saying 'it works'.",
        correction: "A proof must use a general variable $n$. Testing examples is not a proof (it only shows particular cases).",
      },
      {
        mistake: "Not explaining the final step — e.g. writing $4n+4$ without saying why it's even.",
        correction: "Always conclude: 'This is $2(2n+2)$ which is a multiple of $2$, so it is always even.'",
      },
    ],
    challengeQuestions: [
      {
        question: "Prove that the difference between the squares of any two consecutive even numbers is always a multiple of $4$.",
        solution:
          "Let the two consecutive even numbers be $2n$ and $2n+2$. $(2n+2)^2 - (2n)^2 = (4n^2+8n+4) - 4n^2 = 8n + 4 = 4(2n+1)$. This is $4 \\times (2n+1)$, always a multiple of $4$.",
      },
    ],
    tips: [
      "Clear notation is essential — define your variable at the start: 'Let $n$ be any integer.'",
      "The conclusion must link back to what the question asked you to prove.",
      "If stuck, try expanding difference of two squares: $a^2 - b^2 = (a+b)(a-b)$.",
    ],
  },

  // 57. Completing the Square
  {
    subtopic: "Completing the Square",
    topicId: "algebra",
    summary:
      "Rewrite a quadratic expression in the form $(x + p)^2 + q$ to find the turning point and solve equations.",
    keyConcepts: [
      "Completing the square rewrites $x^2 + bx + c$ as $(x + \\frac{b}{2})^2 - (\\frac{b}{2})^2 + c$.",
      "The turning point (vertex) of $y = (x+p)^2 + q$ is at $(-p, q)$.",
      "If the coefficient of $x^2$ is $1$: halve the coefficient of $x$, square it, adjust the constant.",
      "If the coefficient of $x^2$ is $a \\neq 1$: factor out $a$ first, then complete the square inside.",
      "This method can also be used to derive the quadratic formula.",
      "Used for solving quadratics, sketching parabolas, and finding min/max values.",
    ],
    formulas: [
      "$x^2 + bx + c = \\left(x + \\frac{b}{2}\\right)^2 - \\left(\\frac{b}{2}\\right)^2 + c$",
      "Turning point of $y = a(x+p)^2 + q$: $(-p,\\; q)$",
    ],
    method: [
      "For $x^2 + bx + c$: halve $b$ to get $\\frac{b}{2}$.",
      "Write $(x + \\frac{b}{2})^2$.",
      "Subtract $(\\frac{b}{2})^2$ and add back the constant $c$: $(x + \\frac{b}{2})^2 - \\frac{b^2}{4} + c$.",
      "If leading coefficient $a \\neq 1$: factor it out first: $a[x^2 + \\frac{b}{a}x] + c$, then complete inside.",
      "Read off the turning point: $(-\\frac{b}{2}, c - \\frac{b^2}{4})$.",
    ],
    examples: [
      {
        question: "Write $x^2 + 6x + 2$ in the form $(x + p)^2 + q$.",
        solution:
          "Half of $6$ is $3$. So $(x+3)^2 - 9 + 2 = (x+3)^2 - 7$.",
        difficulty: "foundation" as const,
      },
      {
        question: "Find the minimum value of $x^2 - 8x + 20$.",
        solution:
          "$= (x - 4)^2 - 16 + 20 = (x-4)^2 + 4$. Since $(x-4)^2 \\geq 0$, the minimum value is $4$, when $x = 4$.",
        difficulty: "intermediate" as const,
      },
      {
        question: "Solve $2x^2 + 12x + 7 = 0$ by completing the square.",
        solution:
          "$2[x^2 + 6x] + 7 = 0$. $2[(x+3)^2 - 9] + 7 = 0$. $2(x+3)^2 - 18 + 7 = 0$. $2(x+3)^2 = 11$. $(x+3)^2 = \\frac{11}{2}$. $x = -3 \\pm \\sqrt{\\frac{11}{2}} = -3 \\pm \\frac{\\sqrt{22}}{2}$.",
        difficulty: "higher" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Forgetting to subtract the square: writing $x^2 + 6x + 2 = (x+3)^2 + 2$.",
        correction: "$(x+3)^2 = x^2 + 6x + 9$, so you must subtract $9$: $(x+3)^2 - 9 + 2 = (x+3)^2 - 7$.",
      },
      {
        mistake: "Getting the sign of $p$ wrong in the turning point.",
        correction: "If completed square is $(x+3)^2 + q$, the turning point is at $x = -3$ (negate the value inside).",
      },
    ],
    tips: [
      "Expand your answer to check: $(x+3)^2 - 7 = x^2 + 6x + 9 - 7 = x^2 + 6x + 2$ ✓",
      "The turning point is a minimum if the coefficient of $x^2$ is positive, maximum if negative.",
    ],
  },

  // 58. Algebraic Fractions
  {
    subtopic: "Algebraic Fractions",
    topicId: "algebra",
    summary:
      "Simplify, add, subtract, multiply, divide and solve equations involving algebraic fractions.",
    keyConcepts: [
      "An algebraic fraction has a variable in the numerator or denominator.",
      "Simplify by factorising top and bottom, then cancelling common factors.",
      "To add or subtract algebraic fractions, find a common denominator.",
      "To multiply: multiply numerators together and denominators together, then simplify.",
      "To divide: multiply by the reciprocal of the second fraction.",
      "To solve equations with algebraic fractions: multiply every term by the LCM of all denominators.",
    ],
    method: [
      "To simplify: factorise numerator and denominator, cancel common factors.",
      "To add/subtract: find the LCM of the denominators, convert each fraction, combine.",
      "To solve: multiply through by the common denominator to clear fractions, then solve.",
    ],
    examples: [
      {
        question: "Simplify $\\frac{x^2 - 9}{x^2 + 5x + 6}$.",
        solution:
          "Factorise: $\\frac{(x-3)(x+3)}{(x+2)(x+3)} = \\frac{x-3}{x+2}$.",
        difficulty: "intermediate" as const,
      },
      {
        question: "Write $\\frac{2}{x+1} + \\frac{3}{x-2}$ as a single fraction.",
        solution:
          "Common denominator: $(x+1)(x-2)$. $\\frac{2(x-2) + 3(x+1)}{(x+1)(x-2)} = \\frac{2x-4+3x+3}{(x+1)(x-2)} = \\frac{5x-1}{(x+1)(x-2)}$.",
        difficulty: "intermediate" as const,
      },
      {
        question: "Solve $\\frac{4}{x+3} + \\frac{2}{x-1} = 1$.",
        solution:
          "Multiply through by $(x+3)(x-1)$: $4(x-1) + 2(x+3) = (x+3)(x-1)$. $4x - 4 + 2x + 6 = x^2 + 2x - 3$. $6x + 2 = x^2 + 2x - 3$. $x^2 - 4x - 5 = 0$. $(x-5)(x+1) = 0$. $x = 5$ or $x = -1$.",
        difficulty: "higher" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Cancelling terms instead of factors: e.g. cancelling $x$ from $\\frac{x+2}{x+5}$.",
        correction: "You can only cancel common factors that multiply the entire numerator and denominator. Factorise first.",
      },
      {
        mistake: "Forgetting to multiply ALL terms when clearing fractions from an equation.",
        correction: "Every term on both sides must be multiplied by the common denominator.",
      },
    ],
    tips: [
      "Always check for restrictions: values that make any denominator zero are not valid solutions.",
      "Factorise quadratics first — most simplification questions need this.",
    ],
  },

  // 59. Equation of a Circle
  {
    subtopic: "Equation of a Circle",
    topicId: "algebra",
    summary:
      "Recognise and use the equation of a circle centred at the origin, and find tangents to circles.",
    keyConcepts: [
      "The equation of a circle centred at the origin with radius $r$ is $x^2 + y^2 = r^2$.",
      "The equation of a circle centred at $(a, b)$ with radius $r$ is $(x-a)^2 + (y-b)^2 = r^2$.",
      "A tangent to a circle is perpendicular to the radius at the point of contact.",
      "To find where a line meets a circle, substitute the equation of the line into the circle equation.",
      "If the resulting quadratic has $0$ solutions: line misses the circle. $1$ solution: tangent. $2$ solutions: chord/secant.",
    ],
    formulas: [
      "$x^2 + y^2 = r^2$ (centre origin, radius $r$)",
      "$(x - a)^2 + (y - b)^2 = r^2$ (centre $(a,b)$, radius $r$)",
      "Gradient of radius $\\times$ gradient of tangent $= -1$",
    ],
    method: [
      "To find the equation: identify the centre $(a,b)$ and radius $r$, substitute into the formula.",
      "To find the radius from the equation: take the square root of the right-hand side.",
      "To find a tangent at a point: find the gradient of the radius (centre to point), then use the negative reciprocal for the tangent gradient.",
      "Use $y - y_1 = m(x - x_1)$ with the tangent gradient and the given point.",
    ],
    examples: [
      {
        question: "Write the equation of a circle with centre $(0,0)$ and radius $5$.",
        solution:
          "$x^2 + y^2 = 25$.",
        difficulty: "foundation" as const,
      },
      {
        question: "A circle has equation $(x-2)^2 + (y+3)^2 = 49$. State the centre and radius.",
        solution:
          "Centre $= (2, -3)$, radius $= \\sqrt{49} = 7$.",
        difficulty: "intermediate" as const,
      },
      {
        question: "Find the equation of the tangent to $x^2 + y^2 = 25$ at the point $(3, 4)$.",
        solution:
          "Gradient of radius from $(0,0)$ to $(3,4)$: $\\frac{4}{3}$. Tangent gradient $= -\\frac{3}{4}$. Equation: $y - 4 = -\\frac{3}{4}(x - 3)$, which gives $y = -\\frac{3}{4}x + \\frac{25}{4}$ or $3x + 4y = 25$.",
        difficulty: "higher" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Mixing up the signs of the centre: $(x-2)^2 + (y+3)^2 = r^2$ has centre $(2, -3)$ not $(2, 3)$.",
        correction: "The centre is $(a, b)$ where the equation is $(x-a)^2 + (y-b)^2$. If it says $(y+3)$, then $b = -3$.",
      },
      {
        mistake: "Forgetting to square root $r^2$ to find the radius.",
        correction: "If $r^2 = 49$, then $r = 7$, not $49$.",
      },
    ],
    tips: [
      "You may need to complete the square to put a circle equation into standard form: e.g. $x^2 + y^2 - 6x + 2y - 6 = 0$.",
      "Remember: tangent ⊥ radius. Use the perpendicular gradient rule.",
    ],
  },

  // ── GEOMETRY (new) ────────────────────────────────────────────────────

  // 60. Geometric Proof
  {
    subtopic: "Geometric Proof",
    topicId: "geometry",
    summary:
      "Construct logical arguments using angle facts, congruence conditions, and circle theorems to prove geometric statements.",
    keyConcepts: [
      "A geometric proof requires a logical chain of statements, each justified by a known fact or theorem.",
      "Common reasons: angles in a triangle sum to $180°$; angles on a straight line sum to $180°$; alternate angles are equal; vertically opposite angles are equal; base angles of an isosceles triangle are equal.",
      "Circle theorem reasons: angle at centre = $2 \\times$ angle at circumference; angles in the same segment are equal; angle in a semicircle = $90°$; opposite angles of a cyclic quad sum to $180°$; tangent ⊥ radius; alternate segment theorem.",
      "Congruence conditions: SSS, SAS, ASA, RHS.",
      "Similar shapes: corresponding angles equal and sides in the same ratio.",
      "Always state the geometric reason for each step.",
    ],
    method: [
      "Identify what you need to prove.",
      "Mark known angles or sides on the diagram.",
      "Build a chain of equal angles/sides, stating the reason each time.",
      "Conclude with the required result.",
    ],
    examples: [
      {
        question: "Prove that angle $ABC = $ angle $ADE$ given that $BC$ is parallel to $DE$.",
        solution:
          "Angle $ABC = $ angle $ADE$ (corresponding angles, $BC \\parallel DE$).",
        difficulty: "foundation" as const,
      },
      {
        question: "In a circle, $O$ is the centre. $A$, $B$, $C$ are on the circumference. Prove that angle $AOB = 2 \\times$ angle $ACB$.",
        solution:
          "Draw radius $OC$. Triangle $OAC$ is isosceles ($OA = OC =$ radius), so angle $OCA =$ angle $OAC = x$. Similarly $OCB = OBC = y$. Angle $AOB = 180° - 2x + 180° - 2y - (180° - \\text{angle } AOB)$... Using exterior angle theorem: angle $AOB = 2x + 2y = 2(x+y) = 2 \\times$ angle $ACB$.",
        difficulty: "higher" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Writing the answer without giving geometric reasons.",
        correction: "Every step must have a reason in brackets — e.g. '(angles in a triangle sum to $180°$)'.",
      },
      {
        mistake: "Assuming angles are equal because they 'look' equal on the diagram.",
        correction: "Only use properties you can prove or that are given. Diagrams are not always drawn accurately.",
      },
    ],
    tips: [
      "Mark equal angles and sides on the diagram as you work — this helps you spot patterns.",
      "In circle theorem proofs, always name the theorem you're using.",
      "If stuck, draw in extra lines: radii, diameters, or lines joining points on the circumference.",
    ],
  },

  // 61. Bearings
  {
    subtopic: "Bearings",
    topicId: "geometry",
    summary:
      "Measure and calculate three-figure bearings, and use them with trigonometry and scale drawings.",
    keyConcepts: [
      "A bearing is an angle measured clockwise from North, always written as three figures: e.g. $045°$, $180°$, $270°$.",
      "To find a bearing: draw a North line at the starting point, measure clockwise to the direction of travel.",
      "Back bearing: the bearing to go back from $B$ to $A$. Add or subtract $180°$.",
      "If bearing from $A$ to $B$ is $\\theta$: back bearing $= \\theta + 180°$ (if $\\theta < 180°$) or $\\theta - 180°$ (if $\\theta \\geq 180°$).",
      "Bearing problems often combine with Pythagoras, sine/cosine rules, or scale drawings.",
      "In scale drawings, use a protractor to measure bearings from the North line.",
    ],
    formulas: [
      "Back bearing $= \\text{bearing} \\pm 180°$",
    ],
    method: [
      "Draw a clear diagram with North lines at each point.",
      "Mark the bearing angle clockwise from North.",
      "Use trigonometry (or Pythagoras) to find distances and angles.",
      "For back bearings: add or subtract $180°$ from the forward bearing.",
      "State the bearing as a three-figure number.",
    ],
    examples: [
      {
        question: "The bearing from $A$ to $B$ is $065°$. Find the bearing from $B$ to $A$.",
        solution:
          "Back bearing $= 065° + 180° = 245°$.",
        difficulty: "foundation" as const,
      },
      {
        question: "A ship sails $30$ km on a bearing of $040°$ then $20$ km on a bearing of $130°$. Find the direct distance from start to finish.",
        solution:
          "The angle between the two legs is $130° - 40° = 90°$ (using the North lines). By Pythagoras: $d = \\sqrt{30^2 + 20^2} = \\sqrt{1300} = 36.1$ km (1 d.p.).",
        difficulty: "intermediate" as const,
      },
      {
        question: "Two ships leave port: Ship A sails $50$ km on bearing $070°$, Ship B sails $40$ km on bearing $160°$. Find the distance between them.",
        solution:
          "Angle at port between the two directions $= 160° - 70° = 90°$. Distance $= \\sqrt{50^2 + 40^2} = \\sqrt{4100} = 64.0$ km (1 d.p.).",
        difficulty: "higher" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Writing a bearing as two figures: e.g. $45°$ instead of $045°$.",
        correction: "Bearings are always three figures. Use a leading zero: $045°$.",
      },
      {
        mistake: "Measuring bearings anticlockwise from North.",
        correction: "Bearings are always measured clockwise from North.",
      },
    ],
    tips: [
      "Always draw a North line at every point in the diagram.",
      "Alternate angles between parallel North lines are equal — this is key for finding angles in bearing problems.",
    ],
  },

  // 62. Arc Length and Sector Area
  {
    subtopic: "Arc Length and Sector Area",
    topicId: "geometry",
    summary:
      "Calculate the arc length, sector area and segment area of a circle using the angle at the centre.",
    keyConcepts: [
      "An arc is part of the circumference. A sector is the 'slice' between two radii and an arc.",
      "A segment is the region between a chord and an arc.",
      "For angle $\\theta$ (degrees) and radius $r$: arc length $= \\frac{\\theta}{360} \\times 2\\pi r$.",
      "Sector area $= \\frac{\\theta}{360} \\times \\pi r^2$.",
      "Segment area $=$ sector area $-$ triangle area.",
      "The perimeter of a sector $=$ arc length $+ 2r$ (don't forget the two radii).",
    ],
    formulas: [
      "Arc length $= \\frac{\\theta}{360} \\times 2\\pi r$",
      "Sector area $= \\frac{\\theta}{360} \\times \\pi r^2$",
      "Segment area $= \\frac{\\theta}{360} \\times \\pi r^2 - \\frac{1}{2}r^2 \\sin\\theta$",
    ],
    method: [
      "Identify the radius $r$ and the angle $\\theta$ at the centre.",
      "For arc length: multiply the full circumference by $\\frac{\\theta}{360}$.",
      "For sector area: multiply the full circle area by $\\frac{\\theta}{360}$.",
      "For segment area: subtract the triangle area from the sector area.",
      "For sector perimeter: add arc length $+ 2r$.",
    ],
    examples: [
      {
        question: "Find the arc length of a sector with radius $8$ cm and angle $90°$.",
        solution:
          "$\\frac{90}{360} \\times 2\\pi \\times 8 = \\frac{1}{4} \\times 16\\pi = 4\\pi = 12.6$ cm (1 d.p.).",
        difficulty: "foundation" as const,
      },
      {
        question: "Find the area of a sector with radius $10$ cm and angle $72°$.",
        solution:
          "$\\frac{72}{360} \\times \\pi \\times 10^2 = \\frac{1}{5} \\times 100\\pi = 20\\pi = 62.8$ cm² (1 d.p.).",
        difficulty: "intermediate" as const,
      },
      {
        question: "Find the area of the shaded segment in a circle of radius $6$ cm with angle $120°$.",
        solution:
          "Sector area $= \\frac{120}{360} \\times \\pi \\times 36 = 12\\pi$. Triangle area $= \\frac{1}{2} \\times 6^2 \\times \\sin 120° = 18 \\times \\frac{\\sqrt{3}}{2} = 9\\sqrt{3}$. Segment $= 12\\pi - 9\\sqrt{3} = 37.7 - 15.6 = 22.1$ cm² (1 d.p.).",
        difficulty: "higher" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Forgetting to add the two radii when finding the perimeter of a sector.",
        correction: "Sector perimeter $=$ arc length $+ r + r$. The two straight edges are both radii.",
      },
      {
        mistake: "Using diameter instead of radius in the formula.",
        correction: "Always check: if given a diameter, halve it first.",
      },
    ],
    tips: [
      "Think of $\\frac{\\theta}{360}$ as 'the fraction of the full circle' — this works for both arc and area.",
      "Segment = sector minus triangle. Draw the triangle to see it clearly.",
    ],
  },

  // 63. Surface Area — Cones, Spheres and Frustums
  {
    subtopic: "Surface Area — Cones, Spheres and Frustums",
    topicId: "geometry",
    summary:
      "Calculate the surface area of cones, spheres, hemispheres and frustums using standard formulae.",
    keyConcepts: [
      "Surface area of a sphere $= 4\\pi r^2$.",
      "Volume of a sphere $= \\frac{4}{3}\\pi r^3$.",
      "Curved surface area of a cone $= \\pi r l$, where $l$ is the slant height.",
      "Total surface area of a cone $= \\pi r l + \\pi r^2$ (curved surface + base).",
      "A frustum is a cone with the top cut off parallel to the base.",
      "Surface area of a frustum: large cone curved SA $-$ small cone curved SA $+$ both circular ends.",
      "Slant height of a cone: $l = \\sqrt{r^2 + h^2}$ (Pythagoras).",
      "A hemisphere's total SA $= 2\\pi r^2$ (curved) $+ \\pi r^2$ (flat) $= 3\\pi r^2$.",
    ],
    formulas: [
      "Sphere SA $= 4\\pi r^2$",
      "Sphere volume $= \\frac{4}{3}\\pi r^3$",
      "Cone curved SA $= \\pi r l$",
      "Cone total SA $= \\pi r l + \\pi r^2$",
      "Cone slant height: $l = \\sqrt{r^2 + h^2}$",
      "Hemisphere total SA $= 3\\pi r^2$",
    ],
    method: [
      "Identify the shape and note $r$, $h$, $l$.",
      "If slant height is not given, find it using Pythagoras.",
      "For a frustum: find the dimensions of both the large and small cone using similar triangles.",
      "Choose the correct formula and substitute.",
      "Give the answer in terms of $\\pi$ or to the requested decimal places.",
    ],
    examples: [
      {
        question: "Find the surface area of a sphere with radius $5$ cm.",
        solution:
          "SA $= 4\\pi \\times 5^2 = 100\\pi = 314.2$ cm² (1 d.p.).",
        difficulty: "foundation" as const,
      },
      {
        question: "A cone has radius $6$ cm and perpendicular height $8$ cm. Find the total surface area.",
        solution:
          "Slant height $l = \\sqrt{6^2 + 8^2} = \\sqrt{100} = 10$ cm. Curved SA $= \\pi \\times 6 \\times 10 = 60\\pi$. Total SA $= 60\\pi + \\pi \\times 36 = 96\\pi = 301.6$ cm² (1 d.p.).",
        difficulty: "intermediate" as const,
      },
      {
        question: "A frustum is formed by removing a cone of radius $3$ cm and slant height $5$ cm from a cone of radius $9$ cm and slant height $15$ cm. Find the total surface area.",
        solution:
          "Large curved SA $= \\pi \\times 9 \\times 15 = 135\\pi$. Small curved SA $= \\pi \\times 3 \\times 5 = 15\\pi$. Frustum curved SA $= 135\\pi - 15\\pi = 120\\pi$. Top circle $= \\pi \\times 9 = 9\\pi$. Base $= \\pi \\times 81 = 81\\pi$. Total $= 120\\pi + 9\\pi + 81\\pi = 210\\pi = 659.7$ cm² (1 d.p.).",
        difficulty: "higher" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Using perpendicular height $h$ instead of slant height $l$ in the cone formula.",
        correction: "The curved surface area formula uses slant height $l$: $\\pi r l$. Use Pythagoras to find $l$ if needed.",
      },
      {
        mistake: "Forgetting the flat circular face(s) when asked for total surface area.",
        correction: "Total SA includes all faces: curved surface plus any flat circles (base, top, or cut face).",
      },
    ],
    tips: [
      "For frustums: find the full cone dimensions first using similar triangles or ratios.",
      "These formulas are given on the exam formula sheet — make sure you know which is which.",
    ],
  },

  // ── DATA (new) ────────────────────────────────────────────────────────

  // 64. Venn Diagrams and Set Notation
  {
    subtopic: "Venn Diagrams and Set Notation",
    topicId: "probability",
    summary:
      "Use Venn diagrams and set notation to organise data, find probabilities, and solve problems involving two or three sets.",
    keyConcepts: [
      "$\\xi$ (or $\\mathcal{U}$) is the universal set — the set of all items being considered.",
      "$A \\cup B$ (A union B): everything in $A$ or $B$ or both.",
      "$A \\cap B$ (A intersection B): everything in both $A$ and $B$.",
      "$A'$ (complement of A): everything not in $A$ (but in the universal set).",
      "$n(A)$ means the number of elements in set $A$.",
      "In a Venn diagram, always work out the intersection first, then fill outwards.",
      "$P(A) = \\frac{n(A)}{n(\\xi)}$: probability is the number in the set divided by the total.",
      "For three sets, there are $8$ regions in the Venn diagram.",
    ],
    formulas: [
      "$n(A \\cup B) = n(A) + n(B) - n(A \\cap B)$",
      "$P(A) = \\frac{n(A)}{n(\\xi)}$",
    ],
    method: [
      "Draw the Venn diagram with the correct number of overlapping circles inside a rectangle (universal set).",
      "Start by filling in the intersection (overlap) region.",
      "Subtract the intersection from each set total to fill the 'only A' and 'only B' regions.",
      "Subtract all filled regions from the universal set total to find the 'none' region.",
      "Read off values for union, intersection, complement as needed.",
    ],
    examples: [
      {
        question: "In a class of $30$, $18$ study French, $12$ study Spanish, and $5$ study both. Draw a Venn diagram and find $n(F \\cup S)$.",
        solution:
          "Intersection $= 5$. Only French $= 18 - 5 = 13$. Only Spanish $= 12 - 5 = 7$. Neither $= 30 - 13 - 5 - 7 = 5$. $n(F \\cup S) = 13 + 5 + 7 = 25$.",
        difficulty: "foundation" as const,
      },
      {
        question: "Using the Venn diagram above, find $P(F' \\cap S)$.",
        solution:
          "$F' \\cap S$ means 'in Spanish but not French' $= 7$. $P = \\frac{7}{30}$.",
        difficulty: "intermediate" as const,
      },
      {
        question: "$\\xi = \\{1,2,...,20\\}$, $A = \\{\\text{multiples of } 3\\}$, $B = \\{\\text{multiples of } 4\\}$. Find $P(A \\cup B)'$.",
        solution:
          "$A = \\{3,6,9,12,15,18\\}$, $n(A) = 6$. $B = \\{4,8,12,16,20\\}$, $n(B) = 5$. $A \\cap B = \\{12\\}$. $n(A \\cup B) = 6 + 5 - 1 = 10$. $n(A \\cup B)' = 20 - 10 = 10$. $P((A \\cup B)') = \\frac{10}{20} = \\frac{1}{2}$.",
        difficulty: "higher" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Double-counting the intersection: putting $18$ in the French circle including the $5$ in the overlap.",
        correction: "The 'only French' region is $18 - 5 = 13$. The 5 in the overlap is already part of the 18.",
      },
      {
        mistake: "Confusing $\\cup$ (union = OR) with $\\cap$ (intersection = AND).",
        correction: "$\\cup$ includes everything in either set. $\\cap$ only includes items in both sets.",
      },
    ],
    tips: [
      "Always fill the Venn diagram from the inside out: intersection first, then the rest of each set, then outside.",
      "Check that all regions add up to the total in the universal set.",
    ],
  },

  // 65. Sampling Methods
  {
    subtopic: "Sampling Methods",
    topicId: "statistics",
    summary:
      "Understand different sampling methods and when to use each one to collect representative data.",
    keyConcepts: [
      "A population is the entire group being studied. A sample is a smaller part of the population.",
      "Random sampling: every member of the population has an equal chance of being selected (e.g. using a random number generator).",
      "Systematic sampling: select every $k$th item from a list (e.g. every 10th person). First item chosen randomly.",
      "Stratified sampling: divide the population into groups (strata), then take a proportional random sample from each group.",
      "Stratified sample size from each group: $\\frac{\\text{group size}}{\\text{total population}} \\times \\text{sample size}$.",
      "Bias means the sample doesn't fairly represent the population — e.g. only asking one gender, or asking at one time of day.",
      "A larger sample size generally gives more reliable results.",
    ],
    formulas: [
      "Stratified sample from group: $\\frac{\\text{group size}}{\\text{total population}} \\times n$",
    ],
    method: [
      "Identify the population and desired sample size.",
      "Choose the appropriate method (random, systematic, or stratified).",
      "For stratified sampling: divide the population into groups, calculate the proportion for each.",
      "Multiply each proportion by the total sample size to find how many from each group.",
      "Round to whole numbers if necessary (ensuring the total still equals the sample size).",
    ],
    examples: [
      {
        question: "A school has $600$ boys and $400$ girls. A stratified sample of $50$ is taken. How many boys should be in the sample?",
        solution:
          "$\\frac{600}{1000} \\times 50 = 30$ boys.",
        difficulty: "foundation" as const,
      },
      {
        question: "A factory produces items on $3$ machines: A ($200$ items), B ($350$ items), C ($450$ items). A stratified sample of $40$ is needed. How many from each machine?",
        solution:
          "A: $\\frac{200}{1000} \\times 40 = 8$. B: $\\frac{350}{1000} \\times 40 = 14$. C: $\\frac{450}{1000} \\times 40 = 18$. Total = $40$ ✓.",
        difficulty: "intermediate" as const,
      },
    ],
    commonMistakes: [
      {
        mistake: "Thinking stratified sampling means taking equal numbers from each group.",
        correction: "Stratified sampling is proportional: larger groups contribute more to the sample.",
      },
      {
        mistake: "Not recognising sources of bias — e.g. a survey done only online excludes people without internet.",
        correction: "Always consider who might be excluded by your sampling method and whether the sample represents the whole population.",
      },
    ],
    tips: [
      "State the sampling method and explain why it's appropriate when answering methodology questions.",
      "Stratified sampling is best when the population has clearly defined groups and you want each group fairly represented.",
    ],
  },
];
