import type { TopicPlan } from "./types";

/**
 * Ratio, proportion and rates of change. Ordered so that the topics with their
 * own vocabulary ("compound interest", "inversely proportional") come before
 * the two ratio plans, which would match anything written with a colon.
 */
export const RATIO_PLANS: TopicPlan[] = [
  {
    id: "compound-interest",
    strand: "ratio",
    title: "Compound interest and depreciation",
    subtopics: ["Compound interest and depreciation"],
    match: [/compound interest/i, /depreciat/i, /\binterest\b[^.?!]*(?:per (?:year|annum)|each year|a year)/i, /(?:per (?:year|annum)|each year)[^.?!]*\binterest\b/i, /simple interest/i],
    needsFirst: "Finding a percentage of an amount, and writing a percentage as a decimal.",
    bigIdea:
      "With compound interest, each year's interest is worked out on the new, bigger amount, so the money grows faster every year. Increasing by 5% is the same as multiplying by 1.05, and doing that every year means multiplying by 1.05 again and again.",
    picture: {
      block: "table",
      draw: 'Draw a table with headers "Year", "Start of year", "Multiplier" and "End of year", one row per year, so the amount can be seen growing (or falling) each year.',
    },
    method: [
      "Turn the percentage change into a multiplier: an increase of 5% is 1.05, a decrease of 12% is 0.88.",
      "Multiply the starting amount by the multiplier once for each year.",
      "Write this as a power: amount $\\times$ multiplier$^{\\text{years}}$.",
      "Round money to 2 decimal places at the end.",
      "If the question asks for the interest only, take the starting amount away from the final amount.",
    ],
    mistake: {
      wrong: "Working out one year's interest and multiplying it by the number of years. That is simple interest.",
      right: "Compound interest multiplies by the multiplier each year: £2000 at 5% for 3 years is $2000 \\times 1.05^3$, not $2000 + 3 \\times 100$.",
    },
    check: "The compound answer must be a little more than the simple interest answer for growth, and the amount must have moved the right way: up for interest, down for depreciation.",
    ask: "What number do we multiply by to go up, or down, by this percentage?",
    marks: "One mark for the correct multiplier, one for raising it to the number of years, one for the final amount to the nearest penny.",
    version: 1,
  },
  {
    id: "growth-and-decay",
    strand: "ratio",
    title: "Growth and decay",
    subtopics: ["Growth and decay", "Exponential growth and decay"],
    match: [/exponential/i, /\b(?:growth|decay)\b/i, /(?:increases?|decreases?|grows?|falls?|doubles?|halves?)[^.?!]*\bevery\b[^.?!]*(?:hour|day|week|month|year|minute)/i, /population[^.?!]*(?:%|percent)[^.?!]*(?:each|per|every)/i, /half-life/i],
    needsFirst: "Percentage multipliers and using the power button on a calculator.",
    bigIdea:
      "Something grows or decays exponentially when it is multiplied by the same number in each equal step of time. The amount of change is not fixed: it gets bigger as the quantity grows, and smaller as it decays.",
    picture: {
      block: "table",
      draw: 'Draw a table with headers "Time" and "Amount", one row for each step of time, showing the amount multiplied by the same number each time.',
    },
    method: [
      "Find the multiplier for one step of time: up 20% is 1.2, down 15% is 0.85, doubling is 2, halving is 0.5.",
      "Count how many steps of time there are.",
      "Amount after $n$ steps $=$ starting amount $\\times$ multiplier$^n$.",
      "To find how long it takes to reach a value, try values of $n$ in turn until it is passed.",
    ],
    mistake: {
      wrong: "Adding the same amount each time, as if the growth were a straight line.",
      right: "Multiply each time. 100 growing by 20% a year goes 100, 120, 144: the increase is 20, then 24.",
    },
    check: "A multiplier above 1 must give a bigger amount each step, and one below 1 a smaller amount. Check the first two steps by hand.",
    ask: "What is the amount multiplied by in each step?",
    marks: "One mark for the multiplier, one for using it as a power, one for the answer. For 'how long' questions, one mark for the value either side of the target.",
    version: 1,
  },
  {
    id: "percentage-change",
    strand: "ratio",
    title: "Percentage change",
    subtopics: ["Percentage change", "Percentage change and reverse percentages"],
    match: [
      /percentage (?:change|increase|decrease|profit|loss)/i,
      /(?:increase[sd]?|decrease[sd]?|reduced|reduction|discount|rise[sn]?|rose|fall[sn]?|fell|\bsale\b|\bVAT\b|profit|loss)[^.?!]*\d+\s*(?:%|percent)/i,
      /\d+\s*(?:%|percent)[^.?!]*(?:increase|decrease|reduction|discount|off\b|more|less|\bsale\b)/i,
      /original (?:price|cost|value|amount)|before the (?:sale|increase|reduction)/i,
      /reverse percentage/i,
    ],
    needsFirst: "Finding a percentage of an amount, and that 100% is the whole of the original.",
    bigIdea:
      "The original amount is always 100%. An increase of 15% leaves you with 115% of the original; a decrease of 15% leaves you with 85%. One multiplier does the whole change in a single step.",
    picture: {
      block: "bar_model",
      draw:
        'Draw one bar for the original amount, labelled "100%", in this shape: {"type":"bar_model","parts":[{"label":"85% left","value":68,"weight":85},{"label":"15% off","value":12,"weight":15}],"totalLabel":"100% = £80"}. Two parts: what is left (or the original) and the change, with "weight" set to their percentages.',
    },
    method: [
      "Decide what 100% is. It is the original amount, before the change.",
      "Find the multiplier: 100% plus the increase, or 100% minus the decrease, written as a decimal.",
      "Multiply the original by the multiplier to get the new amount.",
      "To find the percentage change: change divided by the original, times 100.",
      "To go back to the original (a reverse percentage): divide the new amount by the multiplier.",
    ],
    mistake: {
      wrong: "In a reverse percentage, taking the percentage off the new price: a coat costs £68 after 15% off, so working out 15% of £68.",
      right: "£68 is 85% of the original. Divide: $68 \\div 0.85 = 80$. The 15% was taken from the original price, not the sale price.",
    },
    check: "Apply the percentage change to your answer and confirm it gives the number in the question. A decrease must leave less than the original; an increase must leave more.",
    ask: "What percentage of the original do we have after the change?",
    marks: "One mark for the correct multiplier (or the percentage found correctly), one for the calculation, one for the answer with its units.",
    version: 1,
  },
  {
    id: "direct-inverse-proportion",
    strand: "ratio",
    title: "Direct and inverse proportion",
    subtopics: ["Direct and inverse proportion"],
    match: [/(?:directly|inversely) proportional/i, /\b(?:direct|inverse) proportion/i, /varies (?:directly|inversely)/i, /\\propto|∝/, /\b\d+\s+(?:workers?|men|people|machines?|builders?|painters?|taps?|pumps?)\b[^.?!]*\b(?:days?|hours?|minutes?)\b[^?]*how long/i],
    needsFirst: "Substituting into a formula and solving a one-step equation.",
    bigIdea:
      "In direct proportion two things grow together: double one and the other doubles, so one divided by the other never changes. In inverse proportion one grows as the other shrinks: double one and the other halves, so the two multiplied together never change.",
    picture: {
      block: "table",
      draw: 'Draw a table of the two quantities, one column each, with the given pair in the first row and the pair to find in the second. Add a third column for the thing that stays the same: "y ÷ x" for direct, "x × y" for inverse.',
    },
    method: [
      "Write the relationship as a formula with a constant $k$: direct is $y = kx$, inverse is $y = \\frac{k}{x}$.",
      "Put in the pair of values you are given and solve for $k$.",
      "Rewrite the formula with the value of $k$ in it.",
      "Use the formula to find the value asked for.",
      "If the question says 'proportional to the square', use $x^2$ in the formula.",
    ],
    mistake: {
      wrong: "Treating inverse proportion as direct: 4 workers take 6 days, so 8 workers take 12 days.",
      right: "More workers means less time. Workers times days stays the same: $4 \\times 6 = 24$, so 8 workers take $24 \\div 8 = 3$ days.",
    },
    check: "Ask whether the answer has moved the right way. In direct proportion both go up together. In inverse proportion one goes up as the other comes down.",
    ask: "If one of these doubles, does the other double or halve?",
    marks: "One mark for the formula with $k$, one for finding $k$, one for the answer.",
    version: 1,
  },
  {
    id: "speed-distance-time",
    strand: "ratio",
    title: "Speed, distance, time",
    subtopics: ["Speed, distance, time"],
    match: [/\bspeed\b/i, /\b(?:km\/h|mph|m\/s|miles per hour|kilometres per hour|metres per second)\b/i, /\bdensity\b|\bpressure\b/i, /how long does[^?]*(?:journey|travel|take to (?:drive|walk|cycle|run|fly))/i],
    not: [/gradient|acceleration|velocity-time|speed-time graph/i],
    needsFirst: "Multiplying and dividing decimals, and changing minutes into hours.",
    bigIdea:
      "Speed says how far something goes in each unit of time. 60 miles per hour means 60 miles for every hour, so distance is speed times time. Density and pressure work the same way: 'per' means divide.",
    method: [
      "Write down what you know and what you want, with units.",
      "Make the units match: change minutes to hours (divide by 60) if the speed is per hour.",
      "Choose the formula: speed $=$ distance $\\div$ time; distance $=$ speed $\\times$ time; time $=$ distance $\\div$ speed.",
      "Substitute and work it out.",
      "Give the units. For a time, change a decimal of an hour back into minutes by multiplying by 60.",
    ],
    mistake: {
      wrong: "Using minutes as if they were a decimal of an hour: writing 1 hour 30 minutes as 1.3 hours, or 2.25 hours as 2 hours 25 minutes.",
      right: "30 minutes is half an hour, so 1 hour 30 minutes is 1.5 hours. 0.25 of an hour is $0.25 \\times 60 = 15$ minutes.",
    },
    check: "Ask if the size is sensible: a car does tens of miles per hour, a person walks about 3. Check the units of the answer match what was asked.",
    ask: "Are the units of time the same as the units in the speed?",
    marks: "One mark for a correct formula or substitution, one for dealing with the units, one for the answer with its units.",
    version: 1,
  },
  {
    id: "rates-of-change",
    strand: "ratio",
    title: "Gradients and rates of change",
    subtopics: ["Gradients and rates of change", "Rates of change and area under curves", "Rates of change"],
    match: [/\bgradient\b/i, /rate of change/i, /area under (?:the |a )?(?:curve|graph)/i, /(?:velocity|speed|distance)[- ]time graph/i, /\bacceleration\b/i, /\btangent\b[^.?!]*(?:curve|graph|estimate)/i, /equation of (?:the |a )?(?:straight )?line/i],
    not: [/circle|\btan\s*\(|trigonometr/i],
    needsFirst: "Reading coordinates from a graph and dividing.",
    bigIdea:
      "The gradient of a graph says how much the up-and-down quantity changes for each one unit across. On a distance-time graph that is the speed. On a speed-time graph it is the acceleration, and the area underneath is the distance.",
    picture: {
      block: "coordinate_graph",
      draw: "Draw the graph with the two points used for the gradient marked and labelled with their coordinates, and a dashed triangle (two segments) showing the change across and the change up.",
    },
    method: [
      "Pick two points on the line that are easy to read and far apart.",
      "Change in $y$: the second $y$ take away the first $y$.",
      "Change in $x$: the second $x$ take away the first $x$, in the same order.",
      "Gradient $=$ change in $y$ $\\div$ change in $x$. Say what it means, with units.",
      "For a curve, draw a tangent at the point and find the gradient of that straight line.",
      "For the area under a graph, split it into triangles, rectangles and trapeziums and add their areas.",
    ],
    mistake: {
      wrong: "Dividing the wrong way round (change in $x$ over change in $y$), or subtracting the two points in different orders.",
      right: "Up divided by across: change in $y$ over change in $x$. Take the points in the same order on the top and the bottom. A line that slopes down has a negative gradient.",
    },
    check: "Look at the line. If it slopes up from left to right the gradient must be positive; if it slopes down, negative. A steep line has a gradient bigger than 1.",
    ask: "How far does the line go up for every 1 it goes across?",
    marks: "One mark for a correct change in $y$ and change in $x$, one for the gradient, one for interpreting it with units when asked.",
    version: 1,
  },
  {
    id: "sharing-in-a-ratio",
    strand: "ratio",
    title: "Sharing in a ratio",
    subtopics: ["Sharing in a ratio", "Dividing in a ratio"],
    match: [/\bshar(?:e|ed|es|ing)\b[^.?!]*\bratio\b/i, /\bratio\b[^.?!]*\bshar(?:e|ed|es|ing)\b/i, /\b(?:divide|divided|split)\b[^.?!]*\bin the ratio\b/i, /in the ratio[^.?!]*\.\s*[^.?!]*(?:how (?:much|many)|work out)[^.?!]*(?:get|receive|have|more)/i],
    needsFirst: "Dividing by a whole number, and multiplying to scale an amount up.",
    bigIdea:
      "A ratio says how many equal parts each person gets. Find what one part is worth first. After that, every share is a multiplication.",
    picture: {
      block: "bar_model",
      draw:
        'Draw one bar cut into the total number of equal parts, in this shape: {"type":"bar_model","parts":[{"label":"Amy","value":12,"weight":1},{"label":"Amy","value":12,"weight":1},{"label":"Ben","value":12,"weight":1}],"totalLabel":"£36"}. One entry in "parts" for every part of the ratio, each labelled with whose it is and what one part is worth. "totalLabel" is the amount being shared.',
    },
    method: [
      "Add the numbers in the ratio to find how many parts there are altogether.",
      "Divide the amount by the number of parts. That is what one part is worth.",
      "Multiply one part by each person's number of parts.",
      "Add the shares together to check they make the amount you started with.",
    ],
    mistake: {
      wrong: "Dividing the amount by each number in the ratio: $60 \\div 2$ and $60 \\div 3$.",
      right: "The 2 and the 3 are numbers of parts. There are $2 + 3 = 5$ parts, so one part is $60 \\div 5$.",
    },
    check: "Add the shares: they must make the amount that was shared.",
    ask: "How many parts are there altogether?",
    marks: "One mark for dividing by the total number of parts, one for one correct share, one for all the shares.",
    version: 1,
  },
  {
    id: "simplifying-ratios",
    strand: "ratio",
    title: "Simplifying ratios",
    subtopics: ["Simplifying ratios", "Simplifying and using ratios", "Ratio (simplify, share, combine)"],
    match: [/\bratio\b/i, /\d+\s*:\s*\d+/],
    not: [/probab|trigonometr|\bscale factor\b|similar/i],
    needsFirst: "Finding common factors and dividing.",
    bigIdea:
      "A ratio compares amounts by saying how many of one there are for each of the other. It works like a fraction: multiply or divide every part by the same number and the comparison stays the same.",
    method: [
      "Put both amounts in the same units first.",
      "Find the biggest number that divides into every part of the ratio.",
      "Divide every part by it.",
      "For the form $1 : n$, divide both parts by the first number.",
      "To use a ratio: find what one part is worth from the amount you know, then multiply for the amount you want.",
    ],
    mistake: {
      wrong: "Dividing only one side, or simplifying a ratio whose parts are in different units: 50p : £2 written as 50 : 2.",
      right: "Change to the same units first: 50p : 200p, which is $1 : 4$. Then divide both sides by the same number.",
    },
    check: "The simplified ratio must compare the same way round as the original, and no number other than 1 should divide into every part.",
    ask: "What is the biggest number that divides into every part?",
    marks: "One mark for dividing both parts by a common factor (or matching the units), one for the ratio in its simplest form.",
    version: 1,
  },
];
