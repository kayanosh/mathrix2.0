/**
 * One question for every topic plan, with something its answer must contain.
 *
 * Used twice: by the tests, to check that each question is given its own
 * topic's plan and no neighbour's; and by the live check, which asks each
 * question through the running app and compares the answer.
 */
export interface PlanSample {
  plan: string;
  question: string;
  /** Every pattern must be found somewhere in the answer shown to the pupil. */
  answer: RegExp[];
}

const times = "(?:\\\\times|×|x|\\*|\\\\cdot)";

export const PLAN_SAMPLES: PlanSample[] = [
  // ── Number ────────────────────────────────────────────────────────────────
  { plan: "standard-form", question: "Work out (3 × 10^4) × (2 × 10^5). Give your answer in standard form.", answer: [new RegExp(`6\\s*${times}\\s*10\\s*\\^\\s*\\{?9`)] },
  { plan: "surds", question: "Simplify √72", answer: [/6\s*(?:\\sqrt\s*\{?\s*2|√\s*2)/] },
  { plan: "bounds", question: "A length is 3.5 cm correct to 1 decimal place. Write down the error interval for the length.", answer: [/3\.45/, /3\.55/] },
  { plan: "prime-factorisation", question: "Write 60 as a product of its prime factors.", answer: [new RegExp(`2\\s*\\^\\s*\\{?2\\}?\\s*${times}\\s*3\\s*${times}\\s*5`)] },
  { plan: "hcf-lcm", question: "Find the highest common factor of 36 and 60.", answer: [/\b12\b/] },
  { plan: "indices", question: "Simplify a^3 × a^4", answer: [/a\s*\^\s*\{?7/] },
  { plan: "rounding-estimation", question: "Estimate the value of (4.8 × 31.2) ÷ 0.49", answer: [/\b300\b/] },
  { plan: "fractions-decimals-percentages", question: "Work out 2/3 + 3/4", answer: [/17\}?\s*(?:\/|\{)\s*12|1\s*\\frac\{5\}\{12\}/] },
  { plan: "proportion-unitary", question: "5 pens cost £3.50. How much do 8 pens cost?", answer: [/5\.60?\b/] },
  { plan: "integers-place-value", question: "Work out -7 - (-3)", answer: [/(?:-|−)\s*4\b/] },

  // ── Algebra ───────────────────────────────────────────────────────────────
  { plan: "algebraic-proof", question: "Prove that the sum of two consecutive odd numbers is always a multiple of 4.", answer: [/4\s*\(|multiple of 4/i] },
  { plan: "iteration", question: "Use the iteration x_{n+1} = (x_n + 5) / 2 with x_0 = 1 to find x_1, x_2 and x_3.", answer: [/\b3\b/, /\b4\b/, /4\.5/] },
  { plan: "inverse-composite-functions", question: "f(x) = 2x + 3 and g(x) = x^2. Find fg(x).", answer: [/2\s*x\s*\^\s*\{?2\}?\s*\+\s*3/] },
  { plan: "function-notation", question: "f(x) = 3x - 5. Find f(4).", answer: [/\b7\b/] },
  { plan: "completing-the-square", question: "Write x^2 + 6x + 2 in the form (x + a)^2 + b.", answer: [/\(\s*x\s*\+\s*3\s*\)\s*\^\s*\{?2\}?\s*(?:-|−)\s*7/] },
  { plan: "quadratic-formula", question: "Solve x^2 + 3x - 5 = 0. Give your answers to 2 decimal places.", answer: [/1\.19/, /4\.19/] },
  { plan: "simultaneous-equations", question: "Solve the simultaneous equations 3x + 2y = 16 and x - y = 2", answer: [/x\s*=\s*4/, /y\s*=\s*2/] },
  { plan: "inequalities", question: "Solve 3x - 5 < 10", answer: [/x\s*(?:<|\\lt)\s*5/] },
  { plan: "sequences", question: "Find the nth term of the sequence 5, 8, 11, 14", answer: [/3\s*n\s*\+\s*2/] },
  { plan: "algebraic-fractions", question: "Simplify (x^2 + 3x) / (x + 3)", answer: [/(?:=|is|to)\s*\$?\s*x\b/] },
  { plan: "rearranging-formulae", question: "Make x the subject of y = 3x + 2", answer: [/y\s*(?:-|−)\s*2/, /3/] },
  { plan: "quadratic-equations", question: "Solve x^2 - 5x + 6 = 0", answer: [/x\s*=\s*2/, /x\s*=\s*3|\b3\b/] },
  { plan: "factorising", question: "Factorise x^2 + 7x + 12", answer: [/\(\s*x\s*\+\s*3\s*\)\s*\(\s*x\s*\+\s*4\s*\)|\(\s*x\s*\+\s*4\s*\)\s*\(\s*x\s*\+\s*3\s*\)/] },
  { plan: "expanding-brackets", question: "Expand and simplify (x + 3)(x - 4)", answer: [/x\s*\^\s*\{?2\}?\s*(?:-|−)\s*x\s*(?:-|−)\s*12/] },
  { plan: "linear-equations", question: "Solve 4x + 7 = 2x + 19", answer: [/x\s*=\s*6/] },
  { plan: "simplifying-expressions", question: "Simplify 5x - 2y + 3x + 7y", answer: [/8\s*x\s*\+\s*5\s*y|5\s*y\s*\+\s*8\s*x/] },

  // ── Ratio, proportion and rates of change ────────────────────────────────
  { plan: "compound-interest", question: "£2000 is invested at 5% compound interest per year. Work out the value of the investment after 3 years.", answer: [/2,?315\.25/] },
  { plan: "growth-and-decay", question: "A population of 800 bacteria doubles every hour. How many bacteria are there after 5 hours?", answer: [/25,?600/] },
  { plan: "percentage-change", question: "A coat costs £80. It is reduced by 15% in a sale. Work out the sale price.", answer: [/68/] },
  { plan: "direct-inverse-proportion", question: "y is directly proportional to x. When x = 4, y = 20. Find y when x = 7.", answer: [/\b35\b/] },
  { plan: "speed-distance-time", question: "A car travels 150 miles in 2 hours 30 minutes. Work out its average speed.", answer: [/\b60\b/] },
  { plan: "rates-of-change", question: "Work out the gradient of the straight line through (1, 2) and (5, 14).", answer: [/\b3\b/] },
  { plan: "sharing-in-a-ratio", question: "Share £60 between Amy and Ben in the ratio 2 : 3.", answer: [/24/, /36/] },
  { plan: "simplifying-ratios", question: "Simplify the ratio 18 : 24", answer: [/3\s*:\s*4/] },

  // ── Geometry and measures ────────────────────────────────────────────────
  { plan: "circle-theorems", question: "A, B and C are points on a circle with centre O. Angle AOB is 110°. Use a circle theorem to work out angle ACB.", answer: [/\b55\b/] },
  { plan: "sine-cosine-rules", question: "In triangle ABC, AB = 7 cm, AC = 9 cm and angle A = 60°. Use the cosine rule to work out the length of BC.", answer: [/8\.(?:2|19)/] },
  { plan: "trigonometry", question: "In a right-angled triangle, one angle is 35° and the hypotenuse is 12 cm. Work out the length of the side opposite the 35° angle. Give your answer to 1 decimal place.", answer: [/6\.9/] },
  { plan: "pythagoras", question: "A right-angled triangle has shorter sides of 9 cm and 12 cm. Work out the length of the longest side.", answer: [/\b15\b/] },
  { plan: "bearings", question: "The bearing of B from A is 070°. Work out the bearing of A from B.", answer: [/\b250\b/] },
  { plan: "vectors", question: "a = (3, -2) and b = (1, 5) are column vectors. Work out a + 2b.", answer: [/\b5\b/, /\b8\b/] },
  { plan: "transformations", question: "Triangle A has vertices (1, 1), (3, 1) and (1, 4). Reflect triangle A in the y-axis. Write down the vertices of the image.", answer: [/(?:-|−)\s*1\s*,\s*1/, /(?:-|−)\s*3\s*,\s*1/, /(?:-|−)\s*1\s*,\s*4/] },
  { plan: "constructions-loci", question: "Describe how to construct the perpendicular bisector of a line AB using compasses.", answer: [/\barcs?\b/i] },
  { plan: "congruence-similarity", question: "Two similar triangles have corresponding sides of 4 cm and 10 cm. Another side of the smaller triangle is 6 cm. Work out the corresponding side of the larger triangle.", answer: [/\b15\b/] },
  { plan: "arcs-sectors", question: "A sector of a circle has radius 6 cm and angle 60°. Work out the arc length. Give your answer in terms of π.", answer: [/2\s*(?:\\pi|π)/] },
  { plan: "circles", question: "Work out the area of a circle with radius 5 cm. Give your answer in terms of π.", answer: [/25\s*(?:\\pi|π)/] },
  { plan: "volume-surface-area", question: "A cylinder has radius 3 cm and height 10 cm. Work out its volume. Give your answer in terms of π.", answer: [/90\s*(?:\\text\{\s*)?(?:\\pi|π)/] },
  { plan: "angles", question: "Work out the size of each interior angle of a regular hexagon.", answer: [/\b120\b/] },
  { plan: "area-perimeter", question: "A triangle has a base of 10 cm and a perpendicular height of 6 cm. Work out its area.", answer: [/\b30\b/] },
  { plan: "properties-3d-shapes", question: "How many faces, edges and vertices does a triangular prism have?", answer: [/\b5\b/, /\b9\b/, /\b6\b/] },
  { plan: "properties-2d-shapes", question: "How many lines of symmetry does a rectangle have?", answer: [/\b(?:2|two)\b/i] },

  // ── Statistics ────────────────────────────────────────────────────────────
  { plan: "histograms", question: "In a histogram, the class 10 to 30 has a frequency of 40. Work out the frequency density of this class.", answer: [/\b2\b/] },
  { plan: "cumulative-frequency-box-plots", question: "From a cumulative frequency graph, the lower quartile is 12 and the upper quartile is 27. Work out the interquartile range.", answer: [/\b15\b/] },
  { plan: "scatter-graphs", question: "A scatter graph shows that as the temperature rises, ice cream sales rise. Describe the correlation.", answer: [/positive/i] },
  { plan: "frequency-tables-grouped-data", question: "A frequency table shows: score 1 with frequency 3, score 2 with frequency 5, score 3 with frequency 8, score 4 with frequency 4. Work out the mean score.", answer: [/2\.65/] },
  { plan: "sampling", question: "A school has 300 boys and 200 girls. A stratified sample of 50 students is taken. How many boys should be in the sample?", answer: [/\b30\b/] },
  { plan: "charts-diagrams", question: "In a survey of 60 people, 15 chose red. Work out the angle for red on a pie chart.", answer: [/\b90\b/] },
  { plan: "averages", question: "Work out the mean, median, mode and range of 4, 9, 9, 11, 17.", answer: [/\b10\b/, /\b9\b/, /\b13\b/] },

  // ── Probability ───────────────────────────────────────────────────────────
  { plan: "conditional-probability", question: "In a class of 30 students, 18 study French, 12 study Spanish and 5 study both. A student is chosen at random. Given that the student studies French, find the probability that they also study Spanish.", answer: [/5\}?\s*(?:\/|\{)\s*18/] },
  { plan: "set-notation", question: "ξ = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10}. A = {even numbers} and B = {multiples of 3}. List the members of A ∩ B.", answer: [/\b6\b/] },
  { plan: "venn-diagrams", question: "In a class of 30 students, 18 study French, 12 study Spanish and 5 study both. Draw a Venn diagram and work out how many students study neither language.", answer: [/\b5\b/] },
  { plan: "probability-trees", question: "A bag has 4 red counters and 6 blue counters. One counter is taken out, put back, and then another is taken out. Work out the probability of getting one of each colour.", answer: [/12\}?\s*(?:\/|\{)\s*25|0\.48/] },
  { plan: "combined-events", question: "Two fair dice are rolled. Work out the probability that the total is 7.", answer: [/1\}?\s*(?:\/|\{)\s*6/] },
  { plan: "relative-frequency", question: "A spinner is spun 200 times and lands on red 46 times. Work out the relative frequency of red.", answer: [/0\.23|23\}?\s*(?:\/|\{)\s*100/] },
  { plan: "basic-probability", question: "A bag contains 3 red, 5 blue and 2 green counters. One counter is chosen at random. Work out the probability that it is blue.", answer: [/1\}?\s*(?:\/|\{)\s*2|5\}?\s*(?:\/|\{)\s*10|0\.5/] },
];
