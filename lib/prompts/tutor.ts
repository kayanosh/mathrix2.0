export interface TutorPromptContext {
  stageLabel: string;
  subjectId: string;
  subjectName: string;
  topicName: string;
  subtopics: string[];
  examBoard?: string | null;
  level?: string | null;
  scienceTrack?: string | null;
}

function mathsRule(subjectId: string, subjectName: string): string {
  const isMaths = /math/i.test(subjectName) || subjectId === "maths";
  return isMaths
    ? "Wrap every number, calculation, fraction, equation, or symbol in $...$ so it renders (for example $\\frac{3}{4}$, $2x + 5 = 11$). Use double backslashes for LaTeX commands. Include at least one column-method or step-by-step arithmetic example where appropriate."
    : "Do not use LaTeX or $ symbols; write formulae and terms in plain words.";
}

function subjectGuidance(subjectId: string): string {
  switch (subjectId) {
    case "english":
      return "Use model answers, PEEL paragraph structure for GCSE+, and quote analysis where relevant. Include a short exemplar paragraph in worked examples.";
    case "science":
      return "Mention required practicals or demonstrations where relevant. Use correct command words (describe, explain, evaluate). Include scientific equations in words and recall key definitions.";
    default:
      return "Include clear worked examples with numbered steps. Build from concrete to abstract.";
  }
}

export function buildTutorLessonPrompt(ctx: TutorPromptContext): string {
  const boardLine = ctx.examBoard
    ? `This lesson is for the ${ctx.examBoard} specification — use its terminology and question style.`
    : "";
  const trackLine = ctx.scienceTrack
    ? `This is ${ctx.scienceTrack === "triple" ? "Triple Science (separate Biology, Chemistry, Physics GCSE)" : "Combined Science (Trilogy-style)"}.`
    : "";
  const subtopicLine = ctx.subtopics.length
    ? `You MUST explicitly cover every objective: ${ctx.subtopics.join("; ")}.`
    : "";
  const levelLine = ctx.level ? `Pitch the difficulty at: ${ctx.level}.` : "";

  return `You are Mathrix, an outstanding UK tutor preparing a ${ctx.stageLabel} ${ctx.subjectName} lesson on "${ctx.topicName}" for a private tuition session.
${boardLine}
${trackLine}
${subtopicLine}
${levelLine}
${subjectGuidance(ctx.subjectId)}
Write a clear, well-structured lesson the tutor can teach from and print. Be precise and correct. ${mathsRule(ctx.subjectId, ctx.subjectName)}

Return ONLY valid JSON in exactly this shape (no markdown fences):
{
  "intro": "1-2 sentence introduction to the topic and why it matters",
  "objectives": ["what the student will be able to do", "..."],
  "sections": [{ "heading": "short heading", "body": "1-4 sentences of clear teaching" }],
  "workedExamples": [{ "question": "an example question", "steps": ["step 1", "step 2"], "answer": "final answer" }],
  "keyPoints": ["a fact/rule to remember", "..."],
  "commonMistakes": ["a common error and how to avoid it", "..."],
  "examTip": "one exam-technique tip"
}
Use 3-5 sections, 2-3 worked examples (each with 3-6 steps), 3-5 key points, and 2-3 common mistakes.`;
}

export function buildTutorWorksheetPrompt(ctx: TutorPromptContext & { count: number }): string {
  const boardLine = ctx.examBoard
    ? `Write questions in the style of ${ctx.examBoard} ${ctx.stageLabel} ${ctx.subjectName}.`
    : "";
  const trackLine = ctx.scienceTrack
    ? `Route: ${ctx.scienceTrack === "triple" ? "Triple Science" : "Combined Science"}.`
    : "";
  const subtopicLine = ctx.subtopics.length
    ? `Focus on these objectives: ${ctx.subtopics.join("; ")}.`
    : "";
  const levelLine = ctx.level ? `Difficulty: ${ctx.level}.` : "";

  const solutionStyle =
    ctx.subjectId === "english"
      ? "For English, provide a model answer paragraph with clear criteria."
      : ctx.subjectId === "science"
        ? "For Science, show reasoning and use correct scientific vocabulary in solutions."
        : "For Maths, show every step in solutionSteps with clear arithmetic or algebra.";

  return `You are a UK ${ctx.stageLabel} ${ctx.subjectName} question writer creating a printable worksheet on "${ctx.topicName}".
${boardLine}
${trackLine}
${subtopicLine}
${levelLine}
Create exactly ${ctx.count} questions with a mix: about 25% easy, 25% medium, 25% hard, 25% exam-style.
${solutionStyle}
${mathsRule(ctx.subjectId, ctx.subjectName)}

Return ONLY valid JSON:
{
  "questions": [{
    "question": "the question text",
    "marks": 2,
    "difficulty": "easy|medium|hard|exam",
    "solutionSteps": ["step 1", "step 2"],
    "answer": "final answer"
  }]
}`;
}
