/**
 * The main idea of every revision topic, in two or three sentences.
 *
 * This is what a teacher says before the first question: not the method, and
 * not a list of facts, but the one idea the method comes from. It is shown at
 * the top of a topic's revision page, and it is given to the model that writes
 * the six questions, so the questions teach this idea and not a neighbouring
 * one.
 *
 * Written by hand, one for each subtopic in lib/revision-data.ts, so it opens
 * instantly and is the same for everyone. A first draft: it should be read by
 * a maths teacher.
 *
 * Keys are `topicId::subtopic name`, exactly as in lib/revision-data.ts.
 */
export const REVISION_IDEAS: Record<string, string> = {
  // ── Number ──────────────────────────────────────────────────────────────
  "number::Types of Number":
    "Numbers are sorted by what they can do. A prime has exactly two factors, a square is a number multiplied by itself, a factor divides in exactly and a multiple is in the times table.",
  "number::Prime Factors, HCF and LCM":
    "Every whole number is built by multiplying primes, and in only one way. Once two numbers are split into primes, the HCF is what they share, and the LCM is everything needed to make both.",
  "number::BODMAS":
    "A calculation has an agreed order, so that everyone gets the same answer: brackets first, then powers, then multiplying and dividing, then adding and subtracting. Multiplying and dividing rank the same, so work from left to right.",
  "number::Rounding and Approximations":
    "Rounding swaps a number for the nearest simpler one. Find the last digit you are keeping and look only at the digit after it: 5 or more rounds up, less than 5 stays as it is.",
  "number::Decimals":
    "A decimal is place value carried on to the right of the point: tenths, hundredths, thousandths. Line up the points and every calculation works just as it does with whole numbers.",
  "number::Fractions":
    "A fraction is a number of equal parts. The bottom says how many parts make one whole and the top says how many you have. You can only add or subtract parts of the same size, so make the bottoms the same first.",
  "number::Percentages":
    "Per cent means 'out of 100', so a percentage is a fraction with 100 on the bottom. Any percentage change can be done in one step by multiplying: up 15% is $\\times 1.15$ and down 15% is $\\times 0.85$.",
  "number::Negative Numbers":
    "Negative numbers sit to the left of zero on the number line. Adding moves right and subtracting moves left, and subtracting a negative turns round and moves right.",
  "number::Surds":
    "A surd is a root that does not come out as a whole number, like $\\sqrt{2}$. Leaving it as a root keeps it exact, and it is simplified by taking out square numbers: $\\sqrt{72} = \\sqrt{36 \\times 2} = 6\\sqrt{2}$.",
  "number::Standard Form":
    "Standard form writes very big and very small numbers as a number between 1 and 10, multiplied by a power of 10. The power says how many places the digits have moved.",
  "number::Upper and Lower Bounds":
    "A rounded measurement stands for a whole range of values, half a unit either side of it. The smallest it could have been is the lower bound and the top of the range is the upper bound.",
  "number::Recurring Decimals to Fractions":
    "A decimal that repeats for ever is still an exact fraction. Multiply it by 10, 100 or 1000 so the repeating part lines up, then subtract, and the repeat disappears.",
  "number::Growth and Decay":
    "When something changes by the same percentage again and again, you multiply by the same number each time. So after $n$ times you multiply by that number to the power $n$.",

  // ── Algebra ─────────────────────────────────────────────────────────────
  "algebra::Rules of Algebra":
    "A letter stands for a number you do not know yet, and it obeys the same rules as numbers. Only like terms can be added or subtracted: $3x + 2x = 5x$, but $3x + 2y$ stays as it is.",
  "algebra::Single Brackets":
    "A number outside a bracket multiplies everything inside it. $3(x + 4)$ means three lots of $x$ and three lots of 4, so it is $3x + 12$.",
  "algebra::Factorising":
    "Factorising is expanding in reverse: you put the brackets back. Find the biggest thing that divides into every term and write it outside the bracket.",
  "algebra::Solving Equations":
    "An equation is a balance: both sides are worth the same. Whatever you do to one side you do to the other, undoing what has been done to $x$ until $x$ is on its own.",
  "algebra::Double Brackets":
    "Every term in the first bracket multiplies every term in the second, which gives four products. Then collect the like terms.",
  "algebra::More Factorising — Quadratics":
    "To factorise $x^2 + bx + c$, find two numbers that multiply to make $c$ and add to make $b$. Those two numbers go in the brackets.",
  "algebra::Solving Quadratic Equations":
    "If two things multiply to make zero, one of them must be zero. So make the quadratic equal to zero, factorise it, and set each bracket equal to zero.",
  "algebra::Simultaneous Equations":
    "Two equations with two unknowns are both true at once. Make the amounts of one letter match, then add or subtract the equations so that letter disappears.",
  "algebra::Inequalities":
    "An inequality is solved like an equation, but the answer is a range of values and not one value. The one new rule: multiplying or dividing by a negative number turns the sign round.",
  "algebra::Indices":
    "A power is a short way to write repeated multiplying. Multiplying powers of the same base adds the powers, dividing subtracts them, and a power of a power multiplies them.",
  "algebra::Sequences":
    "A sequence follows a rule. If it goes up by the same amount each time, that amount is the number in front of $n$ in the nth term, and you then adjust it to make the first term fit.",
  "algebra::Straight Line Graphs":
    "Every straight line has an equation $y = mx + c$. $m$ is the gradient, how far the line goes up for every 1 it goes across, and $c$ is where it crosses the $y$-axis.",
  "algebra::Quadratic and Cubic Graphs":
    "A quadratic graph is a smooth U-shape, or an upside-down U, and a cubic has an S-shaped bend. Work out points in a table of values, plot them, and join them with a smooth curve.",
  "algebra::Shapes of Graphs":
    "Each kind of equation has its own shape: a straight line for $y = mx + c$, a U for $x^2$, an S-bend for $x^3$, and two separate curves for $\\frac{1}{x}$. Know the shape and you can match a graph to its equation.",
  "algebra::Travel Graphs and Story Graphs":
    "A graph tells the story of how one thing changes as another does. On a distance–time graph the steepness is the speed, and a flat line means stopped.",
  "algebra::Functions — Composite and Inverse":
    "A function is a rule that turns an input into an output. A composite function does one rule and then another, and an inverse function undoes the rule to get back to where you started.",
  "algebra::Iteration":
    "Iteration finds a solution by guessing and improving. Put a starting value into the formula, feed the answer back in, and repeat: the values close in on the solution.",
  "algebra::Algebraic Proof":
    "A proof shows something is true for every number, not just for a few examples. Write the numbers with letters ($2n$ is even, $2n + 1$ is odd), do the algebra, and show the result has the form asked for.",
  "algebra::Completing the Square":
    "Any quadratic can be rewritten as a squared bracket plus or minus a number. Halve the number in front of $x$ to get what goes in the bracket, then take off the extra square that this creates.",
  "algebra::Algebraic Fractions":
    "Algebraic fractions follow exactly the rules of number fractions. Factorise first, because you can only cancel something that is a factor of the whole top and the whole bottom.",
  "algebra::Equation of a Circle":
    "$x^2 + y^2 = r^2$ is a circle with its centre at the origin and radius $r$: it is Pythagoras' theorem for every point on the circle. A tangent meets the radius at a right angle.",

  // ── Ratio, proportion and rates of change ───────────────────────────────
  "ratio::Ratio":
    "A ratio compares amounts by saying how many equal parts each one gets. Find what one part is worth, and every other amount follows.",
  "ratio::Proportion":
    "Two amounts are in proportion when they grow together: double one and the other doubles. Find the value of one, then multiply up to what you need.",
  "ratio::Direct and Inverse Proportion":
    "In direct proportion $y = kx$: both go up together. In inverse proportion $y = \\frac{k}{x}$: as one goes up the other goes down. Use the pair of values you are given to find $k$ first.",
  "ratio::Speed, Distance and Time":
    "Speed is how far you go in each unit of time, so speed is distance divided by time. The same three quantities give distance = speed × time and time = distance ÷ speed.",
  "ratio::Density and Pressure":
    "Density is how much mass is packed into each unit of volume: mass divided by volume. Pressure is how much force presses on each unit of area: force divided by area.",
  "ratio::Compound Measures":
    "A compound measure is made from two others by dividing, like miles per hour or pounds per kilogram. The word 'per' tells you what to divide by.",
  "ratio::Scale Factors":
    "Enlarging a shape multiplies every length by the same number, the scale factor. Areas are multiplied by the scale factor squared, and volumes by the scale factor cubed.",

  // ── Geometry and measures ───────────────────────────────────────────────
  "geometry::Angle Facts":
    "A few facts are always true: angles on a straight line add up to 180°, angles round a point add up to 360°, and angles in a triangle add up to 180°. Find a missing angle by taking the ones you know away from the total.",
  "geometry::Polygons":
    "The exterior angles of any polygon add up to 360°: walk all the way round it and you make one full turn. In a regular polygon each exterior angle is $360^{\\circ} \\div n$, and each interior angle is 180° minus that.",
  "geometry::Circle Theorems":
    "Angles in a circle follow fixed rules. The angle at the centre is twice the angle at the edge that stands on the same arc, and most of the other theorems follow from that one.",
  "geometry::Loci":
    "A locus is every point that obeys a rule. A fixed distance from a point gives a circle, and the same distance from two points gives the perpendicular bisector of the line between them.",
  "geometry::Area":
    "Area is the amount of flat space inside a shape, measured in squares. A rectangle is base × height, and every other formula comes from cutting the shape into rectangles and triangles.",
  "geometry::Volume":
    "Volume is the space inside a solid, measured in cubes. For any prism it is the area of the end face multiplied by the length.",
  "geometry::Dimensions":
    "You can tell what a formula measures by counting the lengths that are multiplied together. One length is a length, two lengths multiplied make an area, and three make a volume.",
  "geometry::Constructions":
    "A construction is an exact drawing made with only compasses and a ruler. Compasses keep distances equal, and that is what makes a bisector exact.",
  "geometry::Vectors":
    "A vector is a journey with a size and a direction. To get from one point to another, add the vectors along any route that gets you there. Going backwards along a vector makes it negative.",
  "geometry::Transformations":
    "A transformation moves or changes a shape by a rule: a reflection flips it, a rotation turns it, a translation slides it and an enlargement changes its size. To describe one fully you must give every detail that fixes it.",
  "geometry::Similarity and Congruency":
    "Similar shapes are the same shape in different sizes: every length is multiplied by the same scale factor. Congruent shapes are identical in both shape and size.",
  "geometry::Pythagoras' Theorem":
    "In a right-angled triangle, the square of the longest side equals the squares of the other two sides added together: $a^2 + b^2 = c^2$. Add to find the longest side, subtract to find a shorter one.",
  "geometry::Sin, Cos, Tan":
    "In a right-angled triangle, the ratio of two sides depends only on the angle. Sine, cosine and tangent are those ratios: label the sides from the angle, then pick the ratio that uses the two sides in the question.",
  "geometry::3D Trigonometry":
    "A 3D problem is solved by finding right-angled triangles inside the solid. Draw each one flat, on its own, and use Pythagoras or trigonometry as usual.",
  "geometry::Sine and Cosine Rules":
    "These rules work in any triangle, not only right-angled ones. Use the sine rule when you have a side and the angle opposite it as a pair, and the cosine rule for two sides and the angle between them, or for three sides.",
  "geometry::Geometric Proof":
    "A geometric proof is a chain of statements, each with its reason. State one fact at a time, give the rule that makes it true, and finish at what you were asked to show.",
  "geometry::Bearings":
    "A bearing is a direction given as an angle: measured from north, turning clockwise, and written with three figures. Draw a north line at the point you are measuring from.",
  "geometry::Arc Length and Sector Area":
    "A sector is a fraction of a circle, and the fraction is its angle out of 360°. The arc is that fraction of the circumference, and the sector is that fraction of the area.",
  "geometry::Surface Area — Cones, Spheres and Frustums":
    "Surface area is the total area of the outside of a solid. For curved solids use the formulas you are given, and treat a frustum as a big cone with a small cone cut off the top.",

  // ── Probability ─────────────────────────────────────────────────────────
  "probability::Probability":
    "Probability measures how likely something is, from 0 (impossible) to 1 (certain). When the outcomes are equally likely, it is the number of ways you want divided by the number of ways altogether.",
  "probability::Tree Diagrams":
    "A tree diagram sets out every way two or more events can happen. Multiply along the branches to get the probability of one route, and add the routes that give what you want.",
  "probability::Venn Diagrams and Set Notation":
    "A Venn diagram sorts things into overlapping groups so that nothing is counted twice. Fill in the overlap first, then work outwards.",
  "probability::Conditional Probability":
    "'Given that' means you already know something has happened, so you only count those cases. The total you divide by shrinks to that smaller group.",
  "probability::Relative Frequency":
    "Relative frequency is a probability worked out from an experiment: the number of times it happened divided by the number of tries. The more tries, the more you can trust it.",

  // ── Statistics ──────────────────────────────────────────────────────────
  "statistics::Averages":
    "An average is one number that stands for a whole set. The mean shares the total out equally, the median is the middle value when they are in order, the mode is the most common, and the range measures the spread.",
  "statistics::Cumulative Frequency and Box Plots":
    "Cumulative frequency is a running total: it tells you how many values are at or below each point. Reading across at a half, a quarter and three quarters of the total gives the median and the quartiles.",
  "statistics::Pie Charts":
    "A pie chart shows how a whole is shared out. The whole is 360°, so each item gets the same fraction of 360° as its share of the total.",
  "statistics::Stem and Leaf Diagrams":
    "A stem and leaf diagram lists data in order while keeping every value. The stem is the first part of each number and the leaves are the last digits, with a key to say what they mean.",
  "statistics::Bar Charts and Histograms":
    "In a bar chart the height of a bar is the frequency. In a histogram the area of a bar is the frequency, so the height is the frequency density: frequency divided by class width.",
  "statistics::Scattergraphs":
    "A scatter graph shows whether two things are linked. If the points rise together the correlation is positive, if one falls as the other rises it is negative, and a line of best fit lets you estimate.",
  "statistics::Sampling Methods":
    "A sample is a small group chosen to stand for everyone. It is only fair if every person has the same chance of being picked, and a stratified sample takes the same fraction from each group.",
};

/** The main idea for a subtopic, or an empty string if none has been written. */
export function mainIdeaFor(topicId: string, subtopic: string): string {
  return REVISION_IDEAS[`${topicId}::${subtopic}`] ?? "";
}
