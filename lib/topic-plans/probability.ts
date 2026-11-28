import type { TopicPlan } from "./types";

/**
 * Probability. Ordered so that the named methods ("given that", Venn diagram,
 * tree) come before basic probability, which would match any question with the
 * word "probability" in it.
 */
export const PROBABILITY_PLANS: TopicPlan[] = [
  {
    id: "conditional-probability",
    strand: "probability",
    title: "Conditional probability",
    subtopics: ["Conditional probability"],
    match: [/conditional probability/i, /\bgiven that\b/i, /P\s*\(\s*[A-Z]\s*\|\s*[A-Z]\s*\)/, /probab[^.?!]*\bif (?:it is|they|the first|he|she) (?:is|was|are|were|has|have)\b/i],
    needsFirst: "Probability from a Venn diagram, a two-way table or a tree diagram.",
    bigIdea:
      "'Given that' shrinks the group you are choosing from. You no longer divide by everyone: you divide only by the ones the question has told you about.",
    method: [
      "Find the words 'given that'. What comes after them is what you already know.",
      "Count only that group: this is the new total, the bottom of the fraction.",
      "Inside that group, count the ones that also have what the question asks for: this is the top.",
      "Write the fraction and simplify.",
      "On a tree diagram: probability of both, divided by the probability of the thing you were given.",
    ],
    mistake: {
      wrong: "Dividing by the total of everyone instead of the total of the group you were told about.",
      right: "If the question says 'given that the student studies French', the bottom of the fraction is the number who study French, not the whole class.",
    },
    check: "The bottom of your fraction should be the size of the 'given' group, and the top cannot be bigger than the bottom.",
    ask: "Which group are we choosing from now that we have been told this?",
    marks: "One mark for the correct reduced total, one for the correct top number, one for the simplified answer.",
    version: 1,
  },
  {
    id: "set-notation",
    strand: "probability",
    title: "Set notation for probability",
    subtopics: ["Set notation for probability"],
    match: [/set notation/i, /[∩∪ξ∈]|\\cap|\\cup|\\xi/, /\bunion\b|\bintersection\b|\bcomplement\b/i, /P\s*\(\s*[A-Z]\s*'\s*\)|[A-Z]'/, /universal set/i],
    needsFirst: "Sorting numbers into groups and reading a Venn diagram.",
    bigIdea:
      "Set notation is shorthand for regions of a Venn diagram. $A \\cap B$ is 'in both', the overlap. $A \\cup B$ is 'in A or B or both', everything inside either circle. $A'$ is 'not in A', everything outside it.",
    picture: {
      block: "venn_diagram",
      draw: 'Draw the Venn diagram with every region filled in: "A_only", "A_and_B", "B_only" and "neither", and the universal set labelled with "universalLabel": "ξ" and its total.',
    },
    method: [
      "List the universal set $\\xi$: everything being sorted.",
      "Fill in the overlap $A \\cap B$ first.",
      "Fill in the rest of each circle, then what is outside both.",
      "Read the notation: $\\cap$ means 'and', $\\cup$ means 'or', a dash $'$ means 'not'.",
      "For a probability, count the members of the region and divide by the total in $\\xi$.",
    ],
    mistake: {
      wrong: "Mixing up $\\cap$ and $\\cup$, or leaving out the numbers that belong to neither set.",
      right: "$\\cap$ is the overlap only: 'and'. $\\cup$ is everything in either circle: 'or'. Numbers in neither set still go inside the rectangle.",
    },
    check: "Add every region of the diagram, including outside the circles: the total must be the size of the universal set.",
    ask: "Which members belong in the overlap, in both sets at once?",
    marks: "One mark for the overlap, one for the rest of the diagram, one for each probability read from the correct region.",
    version: 1,
  },
  {
    id: "venn-diagrams",
    strand: "probability",
    title: "Venn diagrams",
    subtopics: ["Venn diagrams", "Venn diagrams and set notation"],
    match: [/venn/i, /\b\d+\s+(?:students?|people|pupils?|children)\b[^?]*\bboth\b[^?]*\b(?:neither|only|how many)\b/i, /\bboth\b[^?]*\bneither\b/i],
    needsFirst: "Adding and subtracting whole numbers, and writing a probability as a fraction.",
    bigIdea:
      "A Venn diagram sorts everyone into regions so that nobody is counted twice. The overlap holds those who are in both groups, which is why you always start there and work outwards.",
    picture: {
      block: "venn_diagram",
      draw: 'Draw the two (or three) circles with a number in every region: "A_only", "A_and_B", "B_only" and "neither". Label each set with what it stands for and give the total in "universalTotal".',
    },
    method: [
      "Draw the circles and label them.",
      "Put the 'both' number in the overlap first.",
      "For each circle, take the overlap away from that group's total to get the 'only' region.",
      "Add up the three regions inside the circles and take this from the overall total to get 'neither'.",
      "For a probability, count the region asked for and divide by the overall total.",
    ],
    mistake: {
      wrong: "Writing a group's whole total in its 'only' region, so the people in both are counted twice.",
      right: "If 18 study French and 5 study both, then 13 study French only. The 18 includes the 5 in the overlap.",
    },
    check: "Add every region including 'neither': it must come to the total number of people.",
    ask: "How many are in both groups, and so go in the overlap?",
    marks: "One mark for the overlap, one for the other regions, one for a probability with the correct total on the bottom.",
    version: 1,
  },
  {
    id: "probability-trees",
    strand: "probability",
    title: "Probability trees",
    subtopics: ["Probability trees", "Tree diagrams"],
    match: [
      /tree diagram|probability tree/i,
      /probab[^.?!]*(?:without replacement|with replacement|put back|replaced|not replaced)/i,
      /(?:without replacement|with replacement|put back|replaced|not replaced)[^?!]*probab/i,
    ],
    needsFirst: "Multiplying and adding fractions.",
    bigIdea:
      "A tree diagram shows every way two things can happen. Go along the branches and multiply. Then add the routes you want. The branches from any one point always add up to 1.",
    picture: {
      block: "probability_tree",
      draw:
        "Draw the whole tree with the probability written as a fraction on every branch. If the first item is not put back, the second set of branches has one fewer of that colour and one fewer in total.",
    },
    method: [
      "Draw the tree and write the probability on each of the first branches.",
      "Decide whether the first item is put back. If it is, the second branches are the same. If it is not, there is one fewer of that kind and one fewer altogether.",
      "Multiply along each route that gives what the question asks for. Write each multiplication out with its numbers.",
      "Add those routes together.",
      "Simplify the fraction.",
    ],
    mistake: {
      wrong: "Adding along a route instead of multiplying, or counting 'one of each' as a single route.",
      right: "Multiply along, add between. 'One of each' is two routes: red then blue, and blue then red.",
    },
    check: "The probabilities at the ends of all the routes add up to 1.",
    ask: "How many routes through the tree give what the question asks for?",
    marks:
      "One mark for the probabilities on the branches, one for multiplying along a route, one for adding the right routes, one for the answer.",
    version: 1,
  },
  {
    id: "combined-events",
    strand: "probability",
    title: "Combined events",
    subtopics: ["Combined events (two-way tables)", "Combined events and two-way tables", "Combined events"],
    match: [/two-way table/i, /sample space/i, /\btwo (?:fair )?(?:dice|coins|spinners)\b/i, /(?:dice|die|coin|spinner)[^?]*\band\b[^?]*(?:dice|die|coin|spinner)/i, /list (?:all )?the (?:possible )?outcomes/i, /\bindependent events?\b|mutually exclusive/i],
    needsFirst: "Writing a probability as a fraction, and multiplying fractions.",
    bigIdea:
      "When two things happen together, list every possible pair of outcomes so none is missed. A sample space table does this: one thing along the top, the other down the side, and every cell is one equally likely outcome.",
    picture: {
      block: "table",
      draw: 'Draw the sample space as a table: the outcomes of the first event as the column headers, the outcomes of the second down the first column, and each cell filled with the combined result (for two dice, the total).',
    },
    method: [
      "Draw a table with one event along the top and the other down the side.",
      "Fill in every cell with the combined outcome.",
      "Count the total number of cells: this is the bottom of the fraction.",
      "Count the cells that give what the question asks for: this is the top.",
      "For independent events without a table, multiply the two probabilities for 'and'; add for 'or' when they cannot both happen.",
    ],
    mistake: {
      wrong: "Missing outcomes by listing them without a system, or treating a 3 then a 4 as the same outcome as a 4 then a 3.",
      right: "Use the table so that every pair appears once. With two dice there are 36 outcomes, and (3, 4) and (4, 3) are different cells.",
    },
    check: "The number of cells must be the number of outcomes of the first event times the number of outcomes of the second.",
    ask: "How many outcomes are there altogether?",
    marks: "One mark for a complete sample space or table, one for counting the favourable outcomes, one for the probability.",
    version: 1,
  },
  {
    id: "relative-frequency",
    strand: "probability",
    title: "Relative frequency",
    subtopics: ["Relative frequency", "Relative frequency and expected outcomes"],
    match: [/relative frequency/i, /\bexpected (?:number|frequency)\b|how many times would you expect|expect(?:ed)? to/i, /\bexperiment(?:al)?\b[^?]*probab|estimate[^?]*probab/i, /\bbiased\b[^?]*(?:dice|die|coin|spinner)/i],
    needsFirst: "Writing a fraction as a decimal, and finding a fraction of an amount.",
    bigIdea:
      "Relative frequency is a probability found by trying it: how often something happened, out of how many times it was tried. The more times you try, the closer it gets to the true probability.",
    picture: {
      block: "table",
      draw: 'Draw a table with headers "Outcome", "Frequency" and "Relative frequency", one row per outcome, with the relative frequency worked out as frequency divided by the total number of trials.',
    },
    method: [
      "Find the total number of trials.",
      "Relative frequency $=$ number of times it happened $\\div$ total number of trials.",
      "To find how many times to expect something: probability $\\times$ number of trials.",
      "To decide if a dice or coin is fair, compare the relative frequencies with what a fair one would give, and say whether there were enough trials to judge.",
    ],
    mistake: {
      wrong: "Saying a coin is biased after a handful of throws, or expecting the result to match the probability exactly.",
      right: "A small number of trials tells you very little. An expected number is an average over many trials, not a promise.",
    },
    check: "All the relative frequencies must add up to 1. An expected number cannot be more than the number of trials.",
    ask: "How many trials were there altogether?",
    marks: "One mark for the fraction (frequency over total), one for the answer. Expected number: one mark for probability times trials, one for the answer.",
    version: 1,
  },
  {
    id: "basic-probability",
    strand: "probability",
    title: "Basic probability",
    subtopics: ["Basic probability", "Basic probability and sample spaces"],
    match: [/probab/i, /\bat random\b/i, /\bchance of\b|\blikely\b|\blikelihood\b/i],
    needsFirst: "Writing and simplifying fractions.",
    bigIdea:
      "A probability is a fraction: the number of ways the thing you want can happen, out of the number of things that could happen, when each is equally likely. It is always between 0 (impossible) and 1 (certain), and the probabilities of everything that could happen add up to 1.",
    method: [
      "Count every possible outcome. This is the bottom of the fraction.",
      "Count the outcomes that give what the question asks for. This is the top.",
      "Write the fraction and simplify it.",
      "The probability of something not happening is 1 take away the probability that it does.",
      "If a table of probabilities has one missing, add the ones you know and take the total from 1.",
    ],
    mistake: {
      wrong: "Writing a probability as a ratio or in words ('3 in 10', '3 : 7'), or giving an answer bigger than 1.",
      right: "Write it as a fraction, a decimal or a percentage: $\\frac{3}{10}$. If your answer is more than 1, the top and bottom are the wrong way round.",
    },
    check: "The answer must be between 0 and 1. Add it to the probability of it not happening: together they must make 1.",
    ask: "How many possible outcomes are there altogether?",
    marks: "One mark for the correct total on the bottom, one for the correct top, and the fraction simplified if asked.",
    version: 1,
  },
];
