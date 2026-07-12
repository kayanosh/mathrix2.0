/**
 * Arabic-specific prompt helpers for KS2 lesson generation.
 */

export function arabicLessonExtra(
  subject: string,
  topic: string,
  subtopics: string[],
): string {
  if (!/arabic/i.test(subject)) return "";
  const focus = subtopics.length ? subtopics.join("; ") : topic;
  return `This is a KS2 ARABIC lesson on "${topic}". Cover: ${focus}.
Teach patiently with bilingual support: include Arabic script AND English meaning in tables where possible.
Keep sentences short. Model pronunciation with simple romanisation in brackets when helpful (RTL polish can come later).
Worked example pattern: hear/say → match meanings → use in a short sentence or dialogue line.
Never use GCSE language. Include a common learner mistake and the correction.`;
}
