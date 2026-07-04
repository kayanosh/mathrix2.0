import type { SubjectSeeds } from "./index";

/**
 * Maths curriculum skeleton, Year 3 → A-Level.
 * KS2/KS3 follow the UK National Curriculum; GCSE/A-Level follow the common
 * content shared across AQA / Edexcel / OCR / WJEC (the selected board is passed
 * to the AI generator so questions are phrased to that board's style).
 */
export const MATHS_SEEDS: SubjectSeeds = {
  "year-3": [
    { strand: "Number", name: "Place Value", subtopics: ["Hundreds, tens and ones", "Represent numbers to 1000", "Compare and order numbers to 1000", "Count in 4s, 8s, 50s and 100s"] },
    { strand: "Number", name: "Addition and Subtraction", subtopics: ["Add and subtract 3-digit numbers", "Column addition with carrying", "Column subtraction with borrowing", "Estimate and check answers"] },
    { strand: "Number", name: "Multiplication and Division", subtopics: ["3, 4 and 8 times tables", "Multiply 2-digit by 1-digit", "Divide with remainders", "Scaling problems"] },
    { strand: "Number", name: "Fractions", subtopics: ["Tenths", "Unit and non-unit fractions", "Equivalent fractions", "Add and subtract fractions with the same denominator"] },
    { strand: "Measurement", name: "Measurement", subtopics: ["Length (m, cm, mm)", "Mass and capacity", "Money and giving change", "Telling the time to the minute"] },
    { strand: "Geometry", name: "Shape", subtopics: ["2D and 3D shapes", "Right angles and turns", "Horizontal, vertical, perpendicular and parallel lines"] },
    { strand: "Statistics", name: "Statistics", subtopics: ["Pictograms and bar charts", "Tables", "One- and two-step questions"] },
  ],
  "year-4": [
    { strand: "Number", name: "Place Value", subtopics: ["Numbers to 10,000", "Roman numerals to 100", "Rounding to nearest 10, 100, 1000", "Negative numbers"] },
    { strand: "Number", name: "Addition and Subtraction", subtopics: ["Add and subtract 4-digit numbers", "Estimating and inverse checks", "Two-step word problems"] },
    { strand: "Number", name: "Multiplication and Division", subtopics: ["Times tables to 12×12", "Multiply 3-digit by 1-digit", "Factor pairs", "Divide by 10 and 100"] },
    { strand: "Number", name: "Fractions and Decimals", subtopics: ["Hundredths", "Equivalent fractions", "Add and subtract fractions", "Decimals to 2 places", "Fraction–decimal equivalents"] },
    { strand: "Measurement", name: "Measurement", subtopics: ["Area by counting squares", "Perimeter of rectangles", "Convert units", "Time (12/24 hour)", "Money problems"] },
    { strand: "Geometry", name: "Geometry", subtopics: ["Classify triangles and quadrilaterals", "Angles (acute, obtuse)", "Lines of symmetry", "Coordinates in the first quadrant", "Translations"] },
    { strand: "Statistics", name: "Statistics", subtopics: ["Discrete and continuous data", "Bar charts", "Time graphs"] },
  ],
  "year-5": [
    { strand: "Number", name: "Place Value", subtopics: ["Numbers to 1,000,000", "Rounding", "Negative numbers in context", "Roman numerals to 1000"] },
    { strand: "Number", name: "Addition and Subtraction", subtopics: ["Add and subtract large numbers", "Mental strategies", "Multi-step problems"] },
    { strand: "Number", name: "Multiplication and Division", subtopics: ["Multiples, factors and primes", "Square and cube numbers", "Long multiplication", "Short division", "Powers of 10"] },
    { strand: "Number", name: "Fractions", subtopics: ["Compare and order fractions", "Mixed numbers and improper fractions", "Add and subtract fractions", "Multiply fractions by whole numbers"] },
    { strand: "Number", name: "Decimals and Percentages", subtopics: ["Decimals to 3 places", "Round decimals", "Percentage as 'per hundred'", "Fraction, decimal, percentage equivalents"] },
    { strand: "Measurement", name: "Measurement", subtopics: ["Convert metric units", "Area and perimeter", "Volume of cubes/cuboids", "Time and timetables"] },
    { strand: "Geometry", name: "Geometry", subtopics: ["Measure and draw angles", "Angles on a line and around a point", "Regular and irregular polygons", "Reflection and translation"] },
    { strand: "Statistics", name: "Statistics", subtopics: ["Line graphs", "Two-way tables", "Timetables"] },
  ],
  "year-6": [
    { strand: "Number", name: "Place Value", subtopics: ["Numbers to 10,000,000", "Rounding to a required accuracy", "Negative numbers and intervals"] },
    { strand: "Number", name: "Four Operations", subtopics: ["Long multiplication", "Long division", "Order of operations (BIDMAS)", "Multi-step word problems"] },
    { strand: "Number", name: "Fractions", subtopics: ["Add, subtract, multiply and divide fractions", "Simplify fractions", "Fractions of amounts"] },
    { strand: "Number", name: "Decimals and Percentages", subtopics: ["Multiply and divide by 10, 100, 1000", "Percentage of amounts", "FDP equivalence and problems"] },
    { strand: "Ratio and Proportion", name: "Ratio and Proportion", subtopics: ["Ratio notation", "Scale factors", "Unequal sharing", "Percentage change"] },
    { strand: "Algebra", name: "Introduction to Algebra", subtopics: ["Use simple formulae", "Linear number sequences", "Missing number problems", "Enumerate possibilities"] },
    { strand: "Measurement", name: "Measurement", subtopics: ["Convert units (including miles/km)", "Area of triangles and parallelograms", "Volume", "Formula for area/volume"] },
    { strand: "Geometry", name: "Geometry", subtopics: ["Draw and classify shapes", "Find missing angles", "Circles (radius, diameter, circumference)", "Coordinates in four quadrants", "Translations and reflections"] },
    { strand: "Statistics", name: "Statistics", subtopics: ["Pie charts", "Line graphs", "Calculate the mean", "Interpret data"] },
  ],
  "year-7": [
    { strand: "Number", name: "Number Skills", subtopics: ["Place value and rounding", "Order of operations", "Factors, multiples and primes", "Prime factorisation, HCF and LCM"] },
    { strand: "Number", name: "Fractions, Decimals and Percentages", subtopics: ["Equivalence and conversion", "Four operations with fractions", "Percentages of amounts", "Percentage change"] },
    { strand: "Number", name: "Negative Numbers", subtopics: ["Ordering integers", "Adding and subtracting", "Multiplying and dividing"] },
    { strand: "Algebra", name: "Algebraic Thinking", subtopics: ["Using and simplifying expressions", "Substitution", "Solving one-step equations", "Sequences and the nth term (linear)"] },
    { strand: "Ratio and Proportion", name: "Ratio and Proportion", subtopics: ["Simplifying ratios", "Sharing in a ratio", "Direct proportion", "Scale drawings"] },
    { strand: "Geometry", name: "Geometry and Measures", subtopics: ["Angles on lines and at a point", "Angles in triangles", "Area and perimeter", "Coordinates and transformations"] },
    { strand: "Statistics", name: "Statistics and Probability", subtopics: ["Averages and range", "Bar charts and pictograms", "Introduction to probability"] },
  ],
  "year-8": [
    { strand: "Number", name: "Number", subtopics: ["Standard form (introduction)", "Powers and roots", "Rounding and estimation", "Working with fractions and decimals"] },
    { strand: "Algebra", name: "Algebra", subtopics: ["Expanding brackets", "Factorising", "Solving two-step equations", "Forming equations", "nth term of linear sequences"] },
    { strand: "Algebra", name: "Graphs", subtopics: ["Plotting straight-line graphs", "Gradient and intercept", "Real-life graphs"] },
    { strand: "Ratio and Proportion", name: "Proportional Reasoning", subtopics: ["Direct and inverse proportion", "Percentage increase/decrease", "Ratio problems", "Speed, distance and time"] },
    { strand: "Geometry", name: "Geometry and Measures", subtopics: ["Angles in parallel lines", "Interior and exterior angles of polygons", "Area of trapezia and circles", "Volume of prisms", "Transformations and congruence"] },
    { strand: "Statistics", name: "Statistics and Probability", subtopics: ["Grouped data and averages", "Scatter graphs", "Probability of combined events", "Sample space diagrams"] },
  ],
  "year-9": [
    { strand: "Number", name: "Number", subtopics: ["Standard form calculations", "Surds (introduction)", "Bounds and accuracy", "Index laws"] },
    { strand: "Algebra", name: "Algebra", subtopics: ["Expanding double brackets", "Factorising quadratics", "Rearranging formulae", "Solving linear equations and inequalities", "Simultaneous equations (introduction)"] },
    { strand: "Algebra", name: "Graphs", subtopics: ["Equation of a straight line (y = mx + c)", "Parallel and perpendicular lines", "Quadratic graphs", "Distance–time and speed–time graphs"] },
    { strand: "Ratio and Proportion", name: "Ratio, Proportion and Rates", subtopics: ["Compound measures", "Direct and inverse proportion", "Growth and decay", "Percentage problems"] },
    { strand: "Geometry", name: "Geometry and Measures", subtopics: ["Pythagoras' theorem", "Trigonometry (introduction)", "Circle vocabulary", "Vectors (introduction)", "Similar shapes"] },
    { strand: "Statistics", name: "Statistics and Probability", subtopics: ["Cumulative frequency (introduction)", "Tree diagrams", "Venn diagrams", "Comparing distributions"] },
  ],
  gcse: [
    { strand: "Number", name: "Number", subtopics: ["Standard form", "Surds and rationalising denominators", "Bounds and error intervals", "Fractions, decimals and percentages", "Index laws"] },
    { strand: "Algebra", name: "Algebra Basics", subtopics: ["Expanding and factorising", "Rearranging formulae", "Algebraic fractions", "Linear equations and inequalities"] },
    { strand: "Algebra", name: "Quadratics", subtopics: ["Factorising quadratics", "The quadratic formula", "Completing the square", "Quadratic graphs and roots"] },
    { strand: "Algebra", name: "Simultaneous Equations", subtopics: ["Linear simultaneous equations", "Linear and quadratic simultaneous equations", "Graphical solutions"] },
    { strand: "Algebra", name: "Graphs and Functions", subtopics: ["Straight-line graphs", "Gradient, parallel and perpendicular", "Cubic and reciprocal graphs", "Function notation", "Graph transformations"] },
    { strand: "Algebra", name: "Sequences", subtopics: ["nth term of linear sequences", "Quadratic sequences", "Geometric and special sequences"] },
    { strand: "Ratio and Proportion", name: "Ratio, Proportion and Rates of Change", subtopics: ["Ratio problems", "Direct and inverse proportion", "Compound measures", "Percentage change and reverse percentages", "Growth and decay"] },
    { strand: "Geometry", name: "Geometry and Measures", subtopics: ["Angles and polygons", "Pythagoras' theorem", "Trigonometry (SOH CAH TOA)", "Sine and cosine rules", "Area, surface area and volume", "Circle theorems", "Vectors", "Transformations", "Constructions and loci"] },
    { strand: "Probability", name: "Probability", subtopics: ["Probability scale and relative frequency", "Sample space and tables", "Tree diagrams", "Venn diagrams and set notation", "Conditional probability"] },
    { strand: "Statistics", name: "Statistics", subtopics: ["Averages and range from tables", "Cumulative frequency and box plots", "Histograms", "Scatter graphs and correlation", "Sampling"] },
  ],
  "a-level": [
    { strand: "Pure", name: "Algebra and Functions", subtopics: ["Indices and surds", "Quadratics and the discriminant", "Polynomials and the factor theorem", "Partial fractions", "Modulus function", "Composite and inverse functions"] },
    { strand: "Pure", name: "Coordinate Geometry", subtopics: ["Straight lines", "Circles", "Parametric equations"] },
    { strand: "Pure", name: "Sequences and Series", subtopics: ["Arithmetic series", "Geometric series", "Binomial expansion", "Sigma notation"] },
    { strand: "Pure", name: "Trigonometry", subtopics: ["Radians and arc length", "Trigonometric identities", "Compound and double angle formulae", "Solving trigonometric equations", "Rsin/Rcos form"] },
    { strand: "Pure", name: "Exponentials and Logarithms", subtopics: ["The number e", "Laws of logarithms", "Exponential models", "Solving equations with logs"] },
    { strand: "Pure", name: "Differentiation", subtopics: ["Differentiation from first principles", "Chain, product and quotient rules", "Implicit and parametric differentiation", "Stationary points and optimisation", "Connected rates of change"] },
    { strand: "Pure", name: "Integration", subtopics: ["Integration as reverse of differentiation", "Definite integrals and area", "Integration by substitution", "Integration by parts", "Differential equations"] },
    { strand: "Pure", name: "Numerical Methods", subtopics: ["Location of roots", "Iteration", "Newton–Raphson", "The trapezium rule"] },
    { strand: "Pure", name: "Vectors", subtopics: ["Vectors in 2D and 3D", "Magnitude and direction", "Position vectors and geometry problems"] },
    { strand: "Statistics", name: "Statistics", subtopics: ["Sampling and data presentation", "Measures of location and spread", "Correlation and regression", "Probability", "The binomial distribution", "The normal distribution", "Hypothesis testing"] },
    { strand: "Mechanics", name: "Mechanics", subtopics: ["Kinematics and constant acceleration", "Variable acceleration (calculus)", "Forces and Newton's laws", "Projectiles", "Moments"] },
  ],
};
