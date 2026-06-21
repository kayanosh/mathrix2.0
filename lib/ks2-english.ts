/**
 * English-specific prompt helpers for KS2 lesson, quiz, and explain generation.
 * Ensures Reading topics use the class texts and Writing topics use the genres listed.
 */

export function isEnglishReadingTopic(topicName: string): boolean {
  return /reading\s*[—–-]/i.test(topicName);
}

export function isEnglishWritingTopic(topicName: string): boolean {
  return /writing\s*[—–-]/i.test(topicName);
}

/** Extra system-prompt block for English Reading lessons/guided practice. */
export function englishReadingLessonPrompt(subtopics: string[]): string {
  const books = subtopics.length ? subtopics.join(", ") : "the class text";
  return `This is an English READING unit. The class text(s) being studied are: ${books}.
Base the entire lesson on these novel(s). Teach comprehension skills: retrieval, inference, vocabulary in context, summarising, and authorial choices.
Use short scenario-style examples ("In the story, when…") grounded in the plot, characters and themes of ${books}. Do not require the pupil to have the physical book open.
Spread questions and examples across the listed texts where more than one book is named.`;
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
  const genres = subtopics.length ? subtopics.join(", ") : "the writing genres for this term";
  return `This is an English WRITING unit covering: ${genres}.
Teach the purpose, audience, structure and language features of each genre. Include a worked example showing how to plan and write, with clear success criteria.`;
}

/** Extra system-prompt block for English Writing quiz questions. */
export function englishWritingQuizPrompt(subtopics: string[]): string {
  const genres = subtopics.length ? subtopics.join(", ") : "the writing genres for this term";
  return `This is an English WRITING quiz covering: ${genres}.
Ask questions about structure, features, audience and purpose. Include short writing tasks or "identify the feature" questions. For writing tasks, give 2-3 success criteria in the answer.`;
}

/**
 * Returns an extra prompt block for lesson/guided generation, or empty string.
 */
export function englishLessonExtra(subject: string, topic: string, subtopics: string[]): string {
  if (!/english/i.test(subject)) return "";
  if (isEnglishReadingTopic(topic)) return englishReadingLessonPrompt(subtopics);
  if (isEnglishWritingTopic(topic)) return englishWritingLessonPrompt(subtopics);
  return "";
}

/**
 * Returns an extra prompt block for quiz generation, or empty string.
 */
export function englishQuizExtra(subject: string, topic: string, subtopics: string[]): string {
  if (!/english/i.test(subject)) return "";
  if (isEnglishReadingTopic(topic)) return englishReadingQuizPrompt(subtopics);
  if (isEnglishWritingTopic(topic)) return englishWritingQuizPrompt(subtopics);
  return "";
}

/**
 * Returns an extra prompt block for explain (Ask AI), or empty string.
 */
export function englishExplainExtra(subject: string, topic: string, subtopics: string[]): string {
  if (!/english/i.test(subject)) return "";
  if (isEnglishReadingTopic(topic)) return englishReadingExplainPrompt(subtopics);
  if (isEnglishWritingTopic(topic)) return "";
  return "";
}
