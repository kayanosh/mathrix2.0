import type { TopicPlan } from "./types";

/**
 * Number. Ordered from the most distinctive wording to the most general, so
 * that "standard form" and "surd" are claimed before a plan that would match
 * any calculation.
 */
export const NUMBER_PLANS: TopicPlan[] = [
  {
    id: "standard-form",
    strand: "number",
    title: "Standard form",
    subtopics: ["Standard form"],
    match: [/standard (?:index )?form/i, /\d\s*(?:×|x|\\times|\*)\s*10\s*\^/i],
    needsFirst: "Multiplying and dividing by 10, 100 and 1000, and what a power of 10 means.",
    bigIdea:
      "Standard form writes any number as a number from 1 up to 10, times a power of 10. The power says how many places the digits have moved.",
    method: [
      "For a calculation: deal with the front numbers first (multiply or divide them).",
      "Then deal with the powers of 10: add the powers when multiplying, subtract them when dividing.",
      "Look at the front number. If it is not at least 1 and less than 10, move it one place and change the power by one to make up for it.",
      "For changing an ordinary number: put the decimal point after the first digit that is not zero, then count how many places the digits moved. A big number has a positive power; a number smaller than 1 has a negative power.",
    ],
    mistake: {
      wrong: "Stopping at an answer such as $12 \\times 10^{8}$, where the front number is not between 1 and 10.",
      right: "$12 \\times 10^{8}$ is $1.2 \\times 10^{9}$. The front number became 10 times smaller, so the power goes up by one.",
    },
    check: "Say how big the answer is as an ordinary number ($6 \\times 10^{9}$ is 6 billion) and confirm the front number is between 1 and 10.",
    ask: "Is the front number at least 1 and less than 10?",
    marks:
      "One mark for handling the front numbers and the powers separately, one for the answer in correct standard form. An answer left out of standard form loses the last mark.",
    version: 1,
  },
  {
    id: "surds",
    strand: "number",
    title: "Surds",
    subtopics: ["Surds", "Surds and irrational numbers"],
    match: [/\bsurds?\b/i, /rationalis/i, /simplify[^.?!]*(?:√|\\sqrt|square root)/i, /(?:√|\\sqrt)\s*\{?\d+\}?\s*(?:[+\-×*]|\\times)\s*\d*\s*(?:√|\\sqrt)/i],
    needsFirst: "The square numbers up to 144, and that $\\sqrt{a} \\times \\sqrt{a} = a$.",
    bigIdea:
      "A surd is a square root that does not come out as a whole number. You leave it as a root to keep it exact, and you make it simpler by taking out the biggest square number hiding inside it.",
    method: [
      "To simplify: find the biggest square number that divides into the number under the root.",
      "Write the number as that square times what is left: $\\sqrt{72} = \\sqrt{36 \\times 2}$.",
      "Square root the square number and bring it out in front: $6\\sqrt{2}$.",
      "To add or subtract surds, simplify each one first; only roots of the same number can be collected, like like terms.",
      "To rationalise a fraction, multiply top and bottom by the root on the bottom.",
    ],
    mistake: {
      wrong: "Adding under the root: writing $\\sqrt{9} + \\sqrt{16} = \\sqrt{25}$.",
      right: "$\\sqrt{9} + \\sqrt{16} = 3 + 4 = 7$. Roots multiply and divide, $\\sqrt{a} \\times \\sqrt{b} = \\sqrt{ab}$, but they do not add.",
    },
    check: "Square the simplified answer and confirm it gives the number you started with: $(6\\sqrt{2})^2 = 36 \\times 2 = 72$.",
    ask: "What is the biggest square number that divides into the number under the root?",
    marks: "One mark for splitting off a square number, one for the fully simplified surd. A surd that can be simplified further loses the last mark.",
    version: 1,
  },
  {
    id: "bounds",
    strand: "number",
    title: "Bounds and error intervals",
    subtopics: ["Bounds and error intervals", "Upper and lower bounds", "Error intervals and bounds"],
    match: [/\b(?:upper|lower) bound/i, /error interval/i, /\bbounds\b/i, /correct to (?:the )?nearest[^.?!]*(?:least|greatest|smallest|largest|maximum|minimum)/i, /truncat/i],
    needsFirst: "Rounding to the nearest 10, whole number, decimal place and significant figure.",
    bigIdea:
      "A rounded number stands for a whole range of numbers. The range goes half a unit of the rounding below it and half a unit above it.",
    picture: {
      block: "number_line",
      draw:
        'Draw a number line centred on the rounded value, with a filled marker at the lower bound and an open marker at the upper bound, and the stretch between them shaded. Use "inequalityLabel" for the error interval, for example "3.45 \\leq x < 3.55".',
    },
    method: [
      "Find what the number was rounded to (the nearest 10, 0.1, and so on).",
      "Halve that amount.",
      "Take the half away to get the lower bound; add it on to get the upper bound.",
      "Write the error interval with $\\leq$ at the lower bound and $<$ at the upper bound.",
      "For a calculation, choose the bounds that make the answer biggest or smallest: to make a division as big as possible, divide the largest top by the smallest bottom.",
    ],
    mistake: {
      wrong: "Writing the upper bound of 3.5 (to 1 decimal place) as 3.54 or 3.549.",
      right: "The upper bound is 3.55. The number can be as close to 3.55 as you like without reaching it, which is why the sign there is $<$ and not $\\leq$.",
    },
    check: "Round both bounds the same way as the question: the lower bound must round to the original number, and the upper bound is the first number that does not.",
    ask: "What is half of the amount it was rounded to?",
    marks: "One mark for each correct bound, and one for the correct inequality signs in the error interval.",
    version: 1,
  },
  {
    id: "prime-factorisation",
    strand: "number",
    title: "Prime factorisation",
    subtopics: ["Prime factorisation"],
    match: [/product of (?:its )?(?:prime|primes)/i, /prime factor/i, /factor tree/i, /index form[^.?!]*prime|prime[^.?!]*index form/i],
    needsFirst: "The prime numbers up to 20 and dividing by 2, 3 and 5.",
    bigIdea:
      "Every whole number is built by multiplying prime numbers together, and there is only one set of primes that makes it. Breaking a number into its primes shows what it is made of.",
    method: [
      "Split the number into any two factors.",
      "Keep splitting each factor until every branch ends on a prime number. Circle the primes.",
      "Write the number as all the circled primes multiplied together, smallest first.",
      "Collect repeated primes as powers: $2 \\times 2 \\times 2 = 2^3$.",
    ],
    mistake: {
      wrong: "Stopping at a number that is not prime, such as leaving 9 or 15 at the end of a branch, or counting 1 as a prime.",
      right: "Every branch must end on a prime. 9 splits again into $3 \\times 3$. 1 is not a prime number.",
    },
    check: "Multiply the primes back together and confirm you get the number you started with.",
    ask: "Is every number at the end of a branch a prime number?",
    marks: "One mark for a correct method (a tree or repeated division reaching primes), one for the product of primes, one for writing it in index form if asked.",
    version: 1,
  },
  {
    id: "hcf-lcm",
    strand: "number",
    title: "HCF and LCM",
    subtopics: ["HCF and LCM", "HCF, LCM, primes"],
    match: [/\bHCF\b|\bLCM\b/i, /highest common factor|lowest common multiple|least common multiple/i, /(?:buses?|lights?|bells?|trains?)[^?]*\b(?:together|same time)\b[^?]*\bagain\b/i],
    needsFirst: "Listing the factors and the multiples of a number.",
    bigIdea:
      "The highest common factor is the biggest number that divides into both. The lowest common multiple is the smallest number that both divide into. The HCF is never bigger than the smaller number; the LCM is never smaller than the bigger number.",
    method: [
      "Write each number as a product of primes.",
      "HCF: multiply together the primes the two lists share.",
      "LCM: multiply together every prime, using each one the greatest number of times it appears in either list.",
      "In a worded question decide which you need: sharing or cutting into equal groups is HCF; things happening together again is LCM.",
    ],
    mistake: {
      wrong: "Mixing the two up: giving the smallest shared multiple when the question asks for a factor.",
      right: "A factor divides in, so the HCF is small. A multiple is in the times table, so the LCM is big. Check which way round the answer is.",
    },
    check: "The HCF must divide exactly into both numbers. Both numbers must divide exactly into the LCM.",
    ask: "Which primes appear in both lists?",
    marks: "One mark for the prime factors of each number (or lists of factors or multiples), one for the HCF, one for the LCM.",
    version: 1,
  },
  {
    id: "indices",
    strand: "number",
    title: "Indices and powers",
    subtopics: ["Indices and powers", "Indices and powers of 10", "Indices"],
    match: [/\bindex laws?\b|\blaws of indices\b|\bindices\b/i, /\b(?:negative|fractional|zero) (?:power|index|indices)/i, /(?:simplify|evaluate|work out|write)[^.?!]*\^\s*\{?\s*(?:-|\d+\s*\/)/i, /as a (?:single )?power/i, /[a-z0-9]\s*\^\s*\{?-?\d+\}?\s*(?:×|\\times|\*|÷|\\div)\s*[a-z0-9]\s*\^/i],
    needsFirst: "That $a^3$ means $a \\times a \\times a$.",
    bigIdea:
      "A power counts how many times a number is multiplied by itself. Every index law comes from counting those multiplications: multiplying adds to the count, dividing takes away from it.",
    method: [
      "Check the bases are the same. The laws only work on the same base.",
      "Multiplying: add the powers. Dividing: subtract the powers. A power of a power: multiply the powers.",
      "A power of 0 is 1. A negative power means 'one over': $a^{-2} = \\frac{1}{a^2}$.",
      "A fractional power is a root: the bottom of the fraction is the root, the top is the power. $8^{\\frac{2}{3}}$ is the cube root of 8, squared.",
    ],
    mistake: {
      wrong: "Multiplying the powers when multiplying the terms: $a^3 \\times a^4 = a^{12}$. Or reading $5^{-2}$ as a negative number.",
      right: "$a^3 \\times a^4 = a^{7}$: three lots of $a$ and four more is seven. $5^{-2} = \\frac{1}{25}$, which is small, not negative.",
    },
    check: "Write the powers out in full, or put a small number such as 2 in place of the letter, and confirm both sides agree.",
    ask: "Are we multiplying, dividing, or raising to a power, and what does that do to the powers?",
    marks: "One mark for using the correct law, one for the simplified answer. With a fractional power, one mark for the root and one for the power.",
    version: 1,
  },
  {
    id: "rounding-estimation",
    strand: "number",
    title: "Rounding and estimation",
    subtopics: ["Rounding and estimation", "Rounding, truncation and estimation", "Rounding, estimation and accuracy"],
    // Rounding has to be the task itself. "Give your answer to 2 decimal
    // places" ends questions on every topic, and must not bring them here.
    match: [/\bestimate\b[^.?!]*(?:value|answer|cost|total|\d)/i, /\bround\b[^.?!]*(?:significant figure|decimal place|nearest|s\.?f|d\.?p)/i, /\bwrite\b[^.?!]*\b(?:correct )?to \d+ (?:significant figures?|decimal places?)/i],
    not: [/estimate[^.?!]*(?:mean|median|probab|gradient|area under|quartile)/i, /bound|error interval|\bsolve\b/i],
    needsFirst: "Place value: which digit is the tens, the units, the tenths and so on.",
    bigIdea:
      "Rounding swaps a number for a nearby one that is easier to use. To estimate, round every number to one significant figure first, so the sum can be done in your head.",
    method: [
      "Find the digit you are rounding to. For significant figures, start counting at the first digit that is not zero.",
      "Look at the next digit along. 5 or more: round up. 4 or less: leave it.",
      "Keep the size of the number: fill with zeros up to the decimal point so 3478 becomes 3500, not 35.",
      "To estimate a calculation: round each number to 1 significant figure, then work it out.",
    ],
    mistake: {
      wrong: "Dropping the place value: rounding 3478 to 2 significant figures as 35. Or working the calculation out exactly and then rounding the answer when the question said 'estimate'.",
      right: "3478 to 2 significant figures is 3500. In an estimate the rounding comes first and must be shown.",
    },
    check: "The rounded number must be close in size to the original. Compare your estimate with the size of the exact numbers: is it sensible?",
    ask: "Which digit decides whether we round up?",
    marks: "For an estimate: one mark for rounding at least two numbers to 1 significant figure, one for the working, one for the answer. No marks for an exact calculation.",
    version: 1,
  },
  {
    id: "fractions-decimals-percentages",
    strand: "number",
    title: "Fractions, decimals and percentages",
    subtopics: ["Fractions, decimals and percentages"],
    match: [
      /\d\s*\/\s*\d+\s*(?:[+\-×*÷]|\\times|\\div)\s*\d+\s*\/\s*\d/,
      /\\frac\{\d+\}\{\d+\}\s*(?:[+\-×*÷]|\\times|\\div)\s*\d*\s*\\frac/,
      /(?:fraction|decimal|percentage)[^.?!]*\bas an? (?:fraction|decimal|percentage)/i,
      /\bas an? (?:fraction|decimal|percentage)\b/i,
      /\d+\s*%\s*of\s*[£$]?\d/i,
      /\d+\s*\/\s*\d+\s*of\s*[£$]?\d/i,
      /(?:convert|change|write)[^.?!]*(?:to|as|into) an? (?:fraction|decimal|percentage)/i,
      /order[^.?!]*(?:fractions?|decimals?|percentages?)/i,
      /mixed number|improper fraction|recurring decimal/i,
    ],
    not: [/probab|ratio|increase|decrease|reduced|interest|profit|loss|\bsale\b|x\s*[+\-]|\balgebraic/i],
    needsFirst: "Times tables, and that the bottom of a fraction says how many equal parts make one whole.",
    bigIdea:
      "A fraction, a decimal and a percentage are three ways of writing the same amount. Percent means 'out of 100'. Fractions can only be added when the parts are the same size.",
    method: [
      "Adding or subtracting fractions: change them to the same bottom number, then add or subtract the tops only.",
      "Multiplying fractions: multiply the tops, multiply the bottoms. Dividing: flip the second fraction, then multiply.",
      "Mixed numbers: turn them into top-heavy fractions first.",
      "Fraction to decimal: divide the top by the bottom. Decimal to percentage: multiply by 100. Percentage to fraction: write it over 100 and simplify.",
      "A percentage of an amount: find 10% or 1% first and build up, or multiply by the decimal.",
    ],
    mistake: {
      wrong: "Adding the tops and the bottoms: $\\frac{1}{2} + \\frac{1}{3} = \\frac{2}{5}$.",
      right: "The parts must be the same size first: $\\frac{3}{6} + \\frac{2}{6} = \\frac{5}{6}$. The bottom number stays as it is.",
    },
    check: "Compare the answer with a half or with one whole: $\\frac{2}{3} + \\frac{3}{4}$ must be more than 1, because both are more than a half.",
    ask: "What bottom number can both fractions be changed to?",
    marks: "One mark for a common denominator (or the correct conversion), one for the correct top numbers, one for the answer in its simplest form.",
    version: 1,
  },
  {
    id: "proportion-unitary",
    strand: "number",
    title: "Ratio and proportion (number)",
    subtopics: ["Ratio and proportion"],
    match: [/\brecipe\b/i, /best (?:buy|value)|better value/i, /\b\d+\s+\w+\s+costs?\s+[£$]?\d+(?:\.\d+)?p?\s*\.\s*(?:how much|work out|find)[^?]*\b\d+\b/i, /exchange rate|£1\s*=|\bcurrency\b/i, /\bunitary\b/i],
    needsFirst: "Dividing to find one, and multiplying to scale up.",
    bigIdea:
      "When two amounts are in proportion they grow together: double one and the other doubles. Find the value of one, and any other amount is a multiplication away.",
    picture: {
      block: "table",
      draw:
        'Draw a two-row table with the two quantities as headers (for example "Pens" and "Cost"). Put the given pair in the first row, the value for one in the second row, and the amount asked for in the third.',
    },
    method: [
      "Write down the pair you are given: 5 pens cost £3.50.",
      "Divide to find what one is worth.",
      "Multiply by the number you want.",
      "For a best buy, find the cost of the same amount (one, or 100 g) for each offer, then compare.",
    ],
    mistake: {
      wrong: "Adding the same amount to both quantities instead of multiplying, or comparing prices for different sizes directly.",
      right: "Proportion is multiplying, not adding: 3 times as many costs 3 times as much. Compare offers only after working out the price of the same amount.",
    },
    check: "More items must cost more, fewer must cost less. Check the answer has moved in the right direction and by a sensible amount.",
    ask: "What is one of them worth?",
    marks: "One mark for finding the value of one (or a correct multiplier), one for scaling up, one for the answer with its units. For a best buy, one more for a clear comparison.",
    version: 1,
  },
  {
    id: "integers-place-value",
    strand: "number",
    title: "Integers and place value",
    subtopics: ["Integers and place value"],
    match: [/place value/i, /negative numbers?/i, /\border of operations\b|\bBIDMAS\b|\bBODMAS\b/i, /value of the (?:digit )?\d|digit \d (?:in|represents?)/i, /(?:work out|calculate)\s+-?\d+\s*[+\-×*÷]\s*\(?-\d/i, /(?:ascending|descending) order/i, /temperature[^.?!]*(?:rise|fall|drop|difference)/i],
    needsFirst: "Counting on a number line, and the four operations with whole numbers.",
    bigIdea:
      "Where a digit sits decides what it is worth: each place is ten times the one to its right. Negative numbers carry on the number line below zero, and adding or taking away is a move right or left along it.",
    picture: {
      block: "number_line",
      draw:
        "Draw a number line that includes zero and every number in the question, with a marker on the start number and on the answer. For place value questions use a \"table\" block instead, one column for each place.",
    },
    method: [
      "Negative numbers: mark the start on a number line. Adding moves right; subtracting moves left.",
      "Subtracting a negative is the same as adding: two minus signs next to each other make a plus.",
      "Multiplying or dividing: same signs give a positive answer, different signs give a negative answer.",
      "With several operations, follow the order: brackets, powers, then multiply and divide, then add and subtract.",
    ],
    mistake: {
      wrong: "Treating $5 - (-3)$ as $5 - 3$, or working a sum strictly left to right: $2 + 3 \\times 4 = 20$.",
      right: "$5 - (-3) = 5 + 3 = 8$. Multiplication comes before addition: $2 + 3 \\times 4 = 2 + 12 = 14$.",
    },
    check: "Place the answer on the number line and confirm it has moved the right way from the start number.",
    ask: "Which way along the number line does this move take us?",
    marks: "One mark for a correct method (the right order of operations or direction on the number line), one for the answer.",
    version: 1,
  },
];
