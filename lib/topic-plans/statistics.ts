import type { TopicPlan } from "./types";

/**
 * Statistics. Ordered so the named diagrams and "grouped" come before the
 * averages plan, which would otherwise claim every question that says "mean".
 */
export const STATISTICS_PLANS: TopicPlan[] = [
  {
    id: "histograms",
    strand: "statistics",
    title: "Histograms",
    subtopics: ["Histograms", "Histograms (frequency density)"],
    match: [/histogram/i, /frequency density/i],
    needsFirst: "Reading a grouped frequency table and finding the width of a class.",
    bigIdea:
      "In a histogram it is the area of each bar, not its height, that shows the frequency. The height is the frequency density, which is the frequency shared out across the width of the class, so wide classes are not made to look bigger than they are.",
    picture: {
      block: "chart",
      draw: 'Draw the histogram with "chartType": "histogram" and one entry in "classIntervals" for each class, with its "from", "to" and "frequency". Label the vertical axis "Frequency density".',
    },
    method: [
      "Find the width of each class: the upper end take away the lower end.",
      "Frequency density $=$ frequency $\\div$ class width. Work this out for every class.",
      "Draw each bar as wide as its class and as tall as its frequency density, with no gaps.",
      "To read a frequency off a histogram, go the other way: frequency $=$ frequency density $\\times$ class width.",
      "For part of a bar, use the width of just that part.",
    ],
    mistake: {
      wrong: "Plotting the frequency as the height of each bar when the classes have different widths.",
      right: "The height is frequency density. Divide each frequency by its class width first. The area of the bar then equals the frequency.",
    },
    check: "Multiply each bar's height by its width: you must get back the frequency in the table, and the frequencies must add to the total.",
    ask: "How wide is this class, and what is its frequency divided by that width?",
    marks: "One mark for finding a frequency density correctly, one for the rest, and one for bars of the right width and height. Reading off: one for area, one for the frequency.",
    version: 1,
  },
  {
    id: "cumulative-frequency-box-plots",
    strand: "statistics",
    title: "Cumulative frequency and box plots",
    subtopics: ["Cumulative frequency and box plots"],
    match: [/cumulative frequency/i, /box plot|box-and-whisker/i, /interquartile range|\bquartiles?\b|\bIQR\b/i],
    needsFirst: "Adding a running total and finding the median of a list.",
    bigIdea:
      "Cumulative frequency is a running total: how many values there are up to each point. Reading across from a quarter, a half and three-quarters of the total gives the quartiles, and a box plot is those five key values drawn on a scale.",
    picture: {
      block: "chart",
      draw: 'Draw a cumulative frequency graph with "chartType": "cumulative_frequency" and one "cumulativePoints" entry per class (its upper bound and the running total). For a box plot use "chartType": "box_plot" with "boxPlot": {"min","q1","median","q3","max"}.',
    },
    method: [
      "Add the frequencies as you go down the table to get the cumulative frequency.",
      "Plot each cumulative frequency against the upper end of its class, and join with a smooth curve.",
      "Median: read across from half the total. Lower quartile: a quarter of the total. Upper quartile: three-quarters.",
      "Interquartile range $=$ upper quartile $-$ lower quartile.",
      "A box plot shows the smallest value, lower quartile, median, upper quartile and largest value.",
      "To compare two sets, compare an average (the medians) and a spread (the interquartile ranges), in the context of the question.",
    ],
    mistake: {
      wrong: "Plotting at the middle of each class instead of the upper end, or comparing two box plots without mentioning the context.",
      right: "Cumulative frequency is 'up to here', so it is plotted at the top of the class. A comparison needs a sentence about what the numbers mean, such as 'the boys were faster on average'.",
    },
    check: "The curve can only go up or stay level, and it must finish at the total frequency. The median must lie between the quartiles.",
    ask: "What is half of the total, and what value do we read across to from there?",
    marks: "One mark for correct cumulative frequencies, one for plotting at the upper ends, one for each value read correctly. Comparisons: one for an average, one for a spread, both in context.",
    version: 1,
  },
  {
    id: "scatter-graphs",
    strand: "statistics",
    title: "Scatter graphs and correlation",
    subtopics: ["Scatter graphs and correlation", "Scatter graphs and lines of best fit"],
    match: [/scatter (?:graph|diagram|plot)/i, /correlation/i, /line of best fit/i, /\boutlier\b/i],
    needsFirst: "Plotting points on a grid and reading values from a graph.",
    bigIdea:
      "A scatter graph shows whether two things go together. If the points climb from left to right, one goes up as the other goes up: positive correlation. A line of best fit follows the trend and lets you estimate, but only inside the range of the data.",
    picture: {
      block: "coordinate_graph",
      draw: 'Draw the data as "points" on labelled axes, with the line of best fit as one "segments" entry running through the middle of the points.',
    },
    method: [
      "Plot each pair of values as a cross.",
      "Describe the correlation: positive (both go up), negative (one goes up as the other goes down), or none. Say how strong it is.",
      "Say what that means in the context: 'the taller the person, the bigger the shoe size'.",
      "Draw one straight line of best fit with about the same number of points on each side. It need not go through the origin.",
      "To estimate, read from the line, up and across, and say so.",
    ],
    mistake: {
      wrong: "Joining the points dot to dot, forcing the line through the origin, or estimating beyond the last point.",
      right: "One straight ruled line through the middle of the points. An estimate outside the range of the data cannot be trusted, because the pattern may not continue.",
    },
    check: "About half the points should be above your line and half below. An estimate must sit close to the points near it.",
    ask: "As one of these goes up, what happens to the other?",
    marks: "One mark for the type of correlation, one for what it means in context, one for a suitable line of best fit, one for an estimate read from the line.",
    version: 1,
  },
  {
    id: "frequency-tables-grouped-data",
    strand: "statistics",
    title: "Frequency tables and grouped data",
    subtopics: ["Frequency tables and grouped data"],
    match: [/frequency table/i, /grouped (?:data|frequency)/i, /estimate[^.?!]*\bmean\b/i, /modal class|class interval|\bmidpoints?\b/i, /table shows[^?]*(?:frequency|number of)[^?]*\b(?:mean|median|mode)\b/i],
    needsFirst: "Finding the mean of a list of numbers.",
    bigIdea:
      "A frequency table is a list written in shorthand: '3 with frequency 5' means five 3s. So to total the data you multiply each value by how often it appears. With grouped data you do not know the exact values, so you use the middle of each group and the mean is an estimate.",
    picture: {
      block: "table",
      draw: 'Draw the table with an extra column for the products: headers such as ["Score x", "Frequency f", "f × x"], one row per value, and a final row of totals. For grouped data add a "Midpoint" column before the products.',
    },
    method: [
      "Add a column: value $\\times$ frequency. For grouped data use the midpoint of each class as the value.",
      "Add up that column to get the total of all the data.",
      "Add up the frequency column to get how many values there are.",
      "Mean $=$ total of the products $\\div$ total frequency.",
      "The modal class is the one with the highest frequency. The median is in the class that contains the middle value.",
    ],
    mistake: {
      wrong: "Dividing by the number of rows in the table instead of the total frequency, or adding the frequencies and dividing by the number of rows.",
      right: "Divide by how many pieces of data there are, which is the total of the frequency column.",
    },
    check: "The mean must lie between the smallest and largest value in the table. With grouped data, say the answer is an estimate because the midpoints were used.",
    ask: "How many pieces of data are there altogether?",
    marks: "One mark for the products (midpoint times frequency), one for their total, one for dividing by the total frequency, one for the answer.",
    version: 1,
  },
  {
    id: "sampling",
    strand: "statistics",
    title: "Sampling methods",
    subtopics: ["Sampling methods", "Sampling"],
    match: [/\bsampl(?:e|es|ing)\b/i, /stratified/i, /\bbias(?:ed)?\b/i, /capture[- ]recapture/i, /questionnaire|survey question/i],
    not: [/sample space/i],
    needsFirst: "Fractions of an amount and simple proportion.",
    bigIdea:
      "A sample is a small part of a group used to find out about the whole group. It only works if it is fair: every member must have the same chance of being chosen, and the sample must be big enough and made up like the whole group.",
    method: [
      "Name the population: the whole group you want to know about.",
      "Random sample: every member has an equal chance, for example names from a hat or random numbers.",
      "Stratified sample: take the same fraction from each group. Number from a group $=$ group size $\\div$ population $\\times$ sample size.",
      "To judge a sample, ask: is it big enough, and does it leave anyone out or favour anyone?",
      "Capture-recapture: marked in second sample $\\div$ second sample size $=$ first sample size $\\div$ population.",
    ],
    mistake: {
      wrong: "Saying a sample is biased without saying why, or taking the same number from each group in a stratified sample.",
      right: "Give the reason in the context: 'only people at the gym were asked, so people who do not exercise are left out'. A stratified sample takes the same fraction of each group, not the same number.",
    },
    check: "In a stratified sample the numbers from each group must add up to the sample size.",
    ask: "Does everyone in the population have the same chance of being picked?",
    marks: "One mark for a correct fraction or method, one for the answer. For criticising a sample, one mark for each reason given in context.",
    version: 1,
  },
  {
    id: "charts-diagrams",
    strand: "statistics",
    title: "Charts and diagrams",
    subtopics: ["Charts and diagrams (bar, pie, pictogram)", "Charts and graphs (bar, pie, line)", "Charts and diagrams"],
    match: [/pie chart/i, /bar chart|bar graph/i, /pictogram/i, /stem[- ]and[- ]leaf/i, /frequency polygon|line graph|time series/i, /two-way table/i],
    not: [/probab/i],
    needsFirst: "Reading scales, and finding a fraction of an amount.",
    bigIdea:
      "A chart turns a table of numbers into a picture so that sizes can be compared at a glance. In a pie chart the whole circle is everything, so each slice is that group's share of $360°$.",
    picture: {
      block: "chart",
      draw: 'Draw the chart the question is about: "chartType": "pie" with a "slices" entry for each group, or "chartType": "bar" with a "bars" entry for each group. Give the chart a title and label both axes of a bar chart.',
    },
    method: [
      "Find the total of all the frequencies.",
      "Pie chart: degrees for one item $= 360 \\div$ total. Multiply by each frequency to get the angle of its slice.",
      "To read a pie chart, go the other way: frequency $=$ angle $\\div 360 \\times$ total.",
      "Bar chart: bars the same width with equal gaps, and a scale that goes up in equal steps from zero.",
      "Pictogram: read the key first. Part of a symbol stands for part of the amount.",
    ],
    mistake: {
      wrong: "Using the frequencies as the angles in a pie chart, or comparing two pie charts by slice size when their totals are different.",
      right: "The angles must add to $360°$: scale the frequencies first. A bigger slice in one pie chart can stand for fewer people than a smaller slice in another, if the totals differ.",
    },
    check: "The angles of a pie chart must add up to $360°$, and the frequencies read from any chart must add up to the total.",
    ask: "What is the total, and how many degrees does one item get?",
    marks: "One mark for the total or the degrees per item, one for the angles, one for an accurate, labelled chart.",
    version: 1,
  },
  {
    id: "averages",
    strand: "statistics",
    title: "Mean, median, mode and range",
    subtopics: ["Mean, median, mode, range", "Averages and range", "Averages and measures of spread"],
    match: [/\b(?:mean|median|mode|modal|range|averages?)\b/i],
    // "Average speed" is a ratio topic, tables and grouped data are their own
    // topic, and "what does this mean" is not about the mean.
    not: [
      /frequency table|grouped|estimate[^.?!]*mean|cumulative|box plot|histogram|class interval|gradient|range of values|domain/i,
      /average speed|\bspeed\b|what does|mean by|means? that|meaning/i,
    ],
    needsFirst: "Putting numbers in order, adding a list accurately and dividing.",
    bigIdea:
      "An average is one number that stands for the whole set. The mean shares the total out equally, the median is the middle one, the mode is the most common. The range is not an average: it says how spread out the numbers are.",
    method: [
      "Write the numbers out in order, smallest first. Use this ordered list for everything that follows.",
      "Mean: add them all up, then divide by how many numbers there are.",
      "Median: the middle number of the ordered list. With two middle numbers, it is halfway between them.",
      "Mode: the number that appears most often.",
      "Range: the largest take away the smallest. It is one number.",
    ],
    mistake: {
      wrong: "Finding the median before putting the numbers in order, or writing the range as two numbers ('4 to 17').",
      right: "Order first. The range is a single number: $17 - 4 = 13$.",
    },
    check:
      "The mean and the median must both lie between the smallest and the largest number. Multiply the mean by how many numbers there are and you should get the total back.",
    ask: "Which number is in the middle once they are in order?",
    marks: "One method mark for total divided by how many, then one mark for each value the question asks for.",
    version: 1,
  },
];
