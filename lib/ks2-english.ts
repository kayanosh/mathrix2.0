/**
 * English-specific prompt helpers for KS2 lesson, quiz, and explain generation.
 * Ensures Reading topics use the class texts and Writing topics use the genres listed.
 * GPS / SATs topic names are also covered.
 */

export function isEnglishReadingTopic(topicName: string): boolean {
  return (
    /reading(\s*[—–-]|\s+paper|\b)/i.test(topicName) ||
    /\bcomprehension\b/i.test(topicName)
  );
}

export function isEnglishWritingTopic(topicName: string): boolean {
  return /writing(\s*[—–-]|\b)/i.test(topicName);
}

export function isEnglishGpsTopic(topicName: string): boolean {
  return /\b(grammar|punctuation|spelling|gps|spag)\b/i.test(topicName);
}

/** Extra system-prompt block for English GPS lessons. */
export function englishGpsLessonPrompt(subtopics: string[]): string {
  const focus = subtopics.length
    ? subtopics.join(", ")
    : "grammar, punctuation and spelling";
  return `This is an English Grammar, Punctuation & Spelling (GPS) unit covering: ${focus}.
Teach one clear rule at a time. Show correct vs incorrect examples in a small table. Include a "fix the mistake" worked example with 4–6 micro-steps.
Keep language Year 5/6 friendly — never GCSE terminology unless the pupil already uses it.`;
}

/** Extra system-prompt block for English Reading lessons/guided practice. */
export function englishReadingLessonPrompt(subtopics: string[]): string {
  const books = subtopics.length ? subtopics.join(", ") : "the class text";
  return `This is an English READING unit. The class text(s) being studied are: ${books}.
Base the entire lesson on these novel(s). Teach comprehension skills: retrieval, inference, vocabulary in context, summarising, and authorial choices.
Use short scenario-style examples ("In the story, when…") grounded in the plot, characters and themes of ${books}. Do not require the pupil to have the physical book open.
Spread questions and examples across the listed texts where more than one book is named.
Worked example pattern: find key words → locate evidence → infer/explain → write the answer. Prefer key_info or table visuals.`;
}

/** Extra system-prompt block for English Reading quiz questions. */
export function englishReadingQuizPrompt(subtopics: string[]): string {
  const books = subtopics.length ? subtopics.join(", ") : "the class text";
  return `This is an English READING quiz. The class text(s) are: ${books}.
Every question MUST name which book it refers to. Mix retrieval ("What happened when…?"), inference ("Why do you think…?"), and vocabulary-in-context.
Answers must include evidence from the text (a quote or paraphrase). Use your knowledge of these well-known UK children's novels at Year 5/6 level.
Distribute questions across the listed books where more than one is named.`;
}

/** Extra system-prompt block for English Reading "Ask AI" explanations. */
export function englishReadingExplainPrompt(subtopics: string[]): string {
  const books = subtopics.length ? subtopics.join(", ") : "the class text";
  return `The pupil is answering a comprehension question about the class text(s): ${books}.
Explain step-by-step how to find or work out the answer. Reference the named book, show how to use evidence from the text, and teach the comprehension skill (retrieval, inference, or vocabulary).`;
}

/** Extra system-prompt block for English Writing lessons/guided practice. */
export function englishWritingLessonPrompt(subtopics: string[]): string {
  const genres = subtopics.length
    ? subtopics.join(", ")
    : "the writing genres for this term";
  return `This is an English WRITING unit covering: ${genres}.
Teach the purpose, audience, structure and language features of each genre. Include a worked example showing how to plan and write, with clear success criteria.
Worked example pattern: plan → opening → develop → ending. Include a success-criteria checklist (table or teachingBlocks).`;
}

/** Extra system-prompt block for English Writing quiz questions. */
export function englishWritingQuizPrompt(subtopics: string[]): string {
  const genres = subtopics.length
    ? subtopics.join(", ")
    : "the writing genres for this term";
  return `This is an English WRITING quiz covering: ${genres}.
Ask questions about structure, features, audience and purpose. Include short writing tasks or "identify the feature" questions. For writing tasks, give 2-3 success criteria in the answer.`;
}

/**
 * Returns an extra prompt block for lesson/guided generation, or empty string.
 */
export function englishLessonExtra(
  subject: string,
  topic: string,
  subtopics: string[],
): string {
  if (!/english/i.test(subject)) return "";
  if (isEnglishReadingTopic(topic)) return englishReadingLessonPrompt(subtopics);
  if (isEnglishWritingTopic(topic)) return englishWritingLessonPrompt(subtopics);
  if (isEnglishGpsTopic(topic)) return englishGpsLessonPrompt(subtopics);
  return `This is a KS2 English lesson on "${topic}". Teach patiently with clear examples, success criteria, and a common mistake to avoid. Prefer table or key_info visuals when helpful.`;
}

/**
 * Returns an extra prompt block for quiz generation, or empty string.
 */
export function englishQuizExtra(
  subject: string,
  topic: string,
  subtopics: string[],
): string {
  if (!/english/i.test(subject)) return "";
  if (isEnglishReadingTopic(topic)) return englishReadingQuizPrompt(subtopics);
  if (isEnglishWritingTopic(topic)) return englishWritingQuizPrompt(subtopics);
  if (isEnglishGpsTopic(topic)) {
    return `This is an English GPS quiz covering: ${subtopics.join(", ") || "grammar and punctuation"}.
Ask short rule-application questions and "fix the mistake" items at Year 5/6 level.`;
  }
  return "";
}

/**
 * Returns an extra prompt block for explain (Ask AI), or empty string.
 */
export function englishExplainExtra(
  subject: string,
  topic: string,
  subtopics: string[],
): string {
  if (!/english/i.test(subject)) return "";
  if (isEnglishReadingTopic(topic)) return englishReadingExplainPrompt(subtopics);
  if (isEnglishWritingTopic(topic)) {
    return `Explain how to improve or plan this writing task step by step. Refer to purpose, audience, and success criteria for: ${subtopics.join(", ") || "the genre"}.`;
  }
  if (isEnglishGpsTopic(topic)) {
    return `Explain the grammar or punctuation rule clearly, show a correct example, then apply it to the pupil's sentence.`;
  }
  return "";
}
