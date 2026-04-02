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
  /** Short worked examples */
  examples?: { question: string; solution: string }[];
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
    examples: [
      {
        question: "Calculate $\\frac{2}{3} + \\frac{1}{4}$.",
        solution:
          "Common denominator $= 12$. $\\frac{8}{12} + \\frac{3}{12} = \\frac{11}{12}$.",
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
    examples: [
      {
        question: "A shirt costs $£40$ after a $20\\%$ discount. What was the original price?",
        solution:
          "Multiplier $= 0.8$, so original $= \\frac{40}{0.8} = £50$.",
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
    topicId: "number",
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
    examples: [
      {
        question: "Find the $n$th term of $5, 8, 11, 14, \\ldots$",
        solution:
          "Common difference $d = 3$. $n$th term $= 3n + 2$. Check: when $n = 1$, $3(1) + 2 = 5$. ✓",
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
    examples: [
      {
        question: "Simplify $\\sqrt{50}$.",
        solution: "$\\sqrt{50} = \\sqrt{25 \\times 2} = 5\\sqrt{2}$.",
      },
      {
        question: "Rationalise $\\frac{3}{\\sqrt{5}}$.",
        solution:
          "$\\frac{3}{\\sqrt{5}} \\times \\frac{\\sqrt{5}}{\\sqrt{5}} = \\frac{3\\sqrt{5}}{5}$.",
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
    examples: [
      {
        question:
          "Calculate $(3 \\times 10^4) \\times (2 \\times 10^3)$.",
        solution:
          "$3 \\times 2 = 6$ and $10^4 \\times 10^3 = 10^7$. Answer: $6 \\times 10^7$.",
      },
    ],
    tips: [
      "If your $A$ value ends up $\\geq 10$ or $< 1$, adjust it and change the power.",
    ],
  },

  // 12. Ratio
  {
    subtopic: "Ratio",
    topicId: "number",
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
    examples: [
      {
        question: "Share $£120$ in the ratio $3:5$.",
        solution:
          "Total parts $= 3 + 5 = 8$. One part $= \\frac{120}{8} = 15$. Shares: $3 \\times 15 = £45$ and $5 \\times 15 = £75$.",
      },
    ],
    tips: [
      "Always check your shares add up to the original total.",
    ],
  },

  // 13. Proportion
  {
    subtopic: "Proportion",
    topicId: "number",
    summary:
      "Solve direct and inverse proportion problems, including using the unitary method and algebraic formulae.",
    keyConcepts: [
      "Direct proportion: as one quantity increases, the other increases at the same rate. $y = kx$.",
      "Inverse proportion: as one increases, the other decreases. $y = \\frac{k}{x}$.",
      "Unitary method: find the value of $1$ unit first, then scale up.",
      "For direct proportion: $\\frac{y_1}{x_1} = \\frac{y_2}{x_2}$.",
      "$y \\propto x^2$ means $y = kx^2$. $y \\propto \\sqrt{x}$ means $y = k\\sqrt{x}$.",
    ],
    examples: [
      {
        question:
          "If $y$ is directly proportional to $x$, and $y = 12$ when $x = 4$, find $y$ when $x = 7$.",
        solution:
          "$k = \\frac{12}{4} = 3$. So $y = 3x$. When $x = 7$: $y = 21$.",
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
    examples: [
      {
        question: "Expand and simplify $3(2x + 1) + 2(x - 4)$.",
        solution:
          "$6x + 3 + 2x - 8 = 8x - 5$.",
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
    examples: [
      {
        question: "Factorise $12x^2 - 18x$.",
        solution:
          "HCF $= 6x$. So $12x^2 - 18x = 6x(2x - 3)$.",
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
    examples: [
      {
        question: "Solve $3x + 7 = 22$.",
        solution:
          "$3x = 22 - 7 = 15$, so $x = \\frac{15}{3} = 5$.",
      },
      {
        question: "Solve $5(x - 2) = 3x + 4$.",
        solution:
          "Expand: $5x - 10 = 3x + 4$. Then $2x = 14$, so $x = 7$.",
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
    examples: [
      {
        question: "Expand $(x + 4)(x - 3)$.",
        solution:
          "$x^2 - 3x + 4x - 12 = x^2 + x - 12$.",
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
    examples: [
      {
        question: "Factorise $x^2 - 5x + 6$.",
        solution:
          "Need two numbers that multiply to $6$ and add to $-5$: $-2$ and $-3$. So $(x - 2)(x - 3)$.",
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
    examples: [
      {
        question: "Solve $x^2 - 5x + 6 = 0$.",
        solution:
          "$(x - 2)(x - 3) = 0$, so $x = 2$ or $x = 3$.",
      },
      {
        question: "Solve $2x^2 + 3x - 5 = 0$ using the formula.",
        solution:
          "$a = 2, b = 3, c = -5$. $x = \\frac{-3 \\pm \\sqrt{9 + 40}}{4} = \\frac{-3 \\pm 7}{4}$. So $x = 1$ or $x = -2.5$.",
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
    examples: [
      {
        question: "Solve $2x + y = 7$ and $x - y = 2$.",
        solution:
          "Add the equations: $3x = 9$, so $x = 3$. Then $y = 7 - 2(3) = 1$.",
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
    examples: [
      {
        question: "Solve $3x + 2 > 11$.",
        solution: "$3x > 9$, so $x > 3$.",
      },
      {
        question: "Solve $-2x < 8$.",
        solution:
          "Divide by $-2$ and flip: $x > -4$.",
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
    examples: [
      {
        question: "Simplify $\\frac{x^5 \\times x^3}{x^2}$.",
        solution: "$x^{5+3-2} = x^6$.",
      },
      {
        question: "Evaluate $27^{\\frac{2}{3}}$.",
        solution:
          "$\\sqrt[3]{27} = 3$, then $3^2 = 9$.",
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
    examples: [
      {
        question: "Find the equation of the line through $(1, 3)$ and $(3, 7)$.",
        solution:
          "Gradient $= \\frac{7-3}{3-1} = 2$. Using $(1, 3)$: $y - 3 = 2(x - 1)$, so $y = 2x + 1$.",
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
    examples: [
      {
        question:
          "On a distance-time graph, a line goes from $(0, 0)$ to $(2, 10)$. What is the speed?",
        solution:
          "Speed $= \\frac{\\text{distance}}{\\text{time}} = \\frac{10}{2} = 5$ units per time period.",
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
    tips: [
      "In the exam, always state the reason (e.g. \"angles on a straight line\") to get full marks.",
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
    examples: [
      {
        question: "Find the interior angle of a regular hexagon.",
        solution:
          "$(6 - 2) \\times 180 = 720°$. Each angle $= \\frac{720}{6} = 120°$.",
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
    ],
    examples: [
      {
        question: "Find the area of a circle with radius $5$ cm.",
        solution:
          "$A = \\pi \\times 5^2 = 25\\pi \\approx 78.5$ cm².",
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
    examples: [
      {
        question: "Find the volume of a cylinder with radius $3$ cm and height $10$ cm.",
        solution:
          "$V = \\pi \\times 3^2 \\times 10 = 90\\pi \\approx 283$ cm³.",
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
    examples: [
      {
        question:
          "Two similar shapes have lengths in ratio $2:5$. If the area of the smaller is $12$ cm², find the area of the larger.",
        solution:
          "Area factor $= (\\frac{5}{2})^2 = \\frac{25}{4}$. Area $= 12 \\times \\frac{25}{4} = 75$ cm².",
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
    examples: [
      {
        question:
          "Find the hypotenuse of a right-angled triangle with sides $6$ and $8$.",
        solution:
          "$c = \\sqrt{6^2 + 8^2} = \\sqrt{36 + 64} = \\sqrt{100} = 10$.",
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
    examples: [
      {
        question: "In a right-angled triangle, the opposite side is $5$ and the hypotenuse is $13$. Find the angle.",
        solution:
          "$\\sin\\theta = \\frac{5}{13}$. $\\theta = \\sin^{-1}(\\frac{5}{13}) \\approx 22.6°$.",
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
    examples: [
      {
        question:
          "A cuboid is $3 \\times 4 \\times 12$. Find the length of the space diagonal.",
        solution:
          "$d = \\sqrt{3^2 + 4^2 + 12^2} = \\sqrt{9 + 16 + 144} = \\sqrt{169} = 13$.",
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
    examples: [
      {
        question:
          "In triangle $ABC$, $a = 8$, $b = 6$, $C = 60°$. Find side $c$.",
        solution:
          "$c^2 = 8^2 + 6^2 - 2(8)(6)\\cos 60° = 64 + 36 - 48 = 52$. So $c = \\sqrt{52} \\approx 7.21$.",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  DATA HANDLING AND PROBABILITY
  // ═══════════════════════════════════════════════════════════════════════

  // 43. Probability
  {
    subtopic: "Probability",
    topicId: "data",
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
    examples: [
      {
        question: "A bag has $3$ red, $5$ blue and $2$ green balls. What is the probability of picking a blue ball?",
        solution:
          "$P(\\text{blue}) = \\frac{5}{10} = \\frac{1}{2}$.",
      },
    ],
  },

  // 44. Tree Diagrams
  {
    subtopic: "Tree Diagrams",
    topicId: "data",
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
    examples: [
      {
        question: "A bag has $4$ red and $6$ blue balls. Two are picked without replacement. Find $P$(both red).",
        solution:
          "$P = \\frac{4}{10} \\times \\frac{3}{9} = \\frac{12}{90} = \\frac{2}{15}$.",
      },
    ],
    tips: [
      "Label every branch clearly and check that probabilities from each node sum to $1$.",
    ],
  },

  // 45. Averages
  {
    subtopic: "Averages",
    topicId: "data",
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
    examples: [
      {
        question: "Find the mean of $3, 5, 7, 8, 12$.",
        solution:
          "Mean $= \\frac{3+5+7+8+12}{5} = \\frac{35}{5} = 7$.",
      },
    ],
  },

  // 46. Cumulative Frequency and Box Plots (Higher)
  {
    subtopic: "Cumulative Frequency and Box Plots",
    topicId: "data",
    summary:
      "Draw and interpret cumulative frequency curves and box plots to compare data sets.",
    keyConcepts: [
      "Cumulative frequency: a running total of frequencies. Plot at the upper boundary of each class.",
      "From the cumulative frequency curve, read off: median ($\\frac{n}{2}$), lower quartile ($\\frac{n}{4}$), upper quartile ($\\frac{3n}{4}$).",
      "Interquartile range (IQR) $= Q_3 - Q_1$. A measure of spread of the middle $50\\%$.",
      "Box plot shows: minimum, $Q_1$, median, $Q_3$, maximum.",
      "Use IQR and median to compare data sets. A smaller IQR means more consistent data.",
    ],
    tips: [
      "Plot cumulative frequency at the upper class boundary, not the midpoint.",
    ],
  },

  // 47. Pie Charts
  {
    subtopic: "Pie Charts",
    topicId: "data",
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
    topicId: "data",
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
    topicId: "data",
    summary:
      "Draw and interpret bar charts and histograms, understanding that in histograms the area represents frequency.",
    keyConcepts: [
      "Bar charts: the height of each bar represents the frequency. Bars have gaps between them for categorical data.",
      "Histograms: used for continuous grouped data. Bars have no gaps.",
      "In a histogram, $\\text{frequency density} = \\frac{\\text{frequency}}{\\text{class width}}$.",
      "The area of each bar $=$ the frequency.",
      "Unequal class widths mean you must use frequency density, not frequency, on the $y$-axis.",
    ],
    examples: [
      {
        question: "A class $10 \\leq x < 20$ has frequency $30$. What is the frequency density?",
        solution:
          "Class width $= 10$. Frequency density $= \\frac{30}{10} = 3$.",
      },
    ],
    tips: [
      "For histograms, frequency density goes on the $y$-axis, not frequency.",
    ],
  },

  // 50. Scattergraphs
  {
    subtopic: "Scattergraphs",
    topicId: "data",
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
];
