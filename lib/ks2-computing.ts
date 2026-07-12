/**
 * Computing-specific prompt helpers for KS2 lesson generation.
 */

export function computingLessonExtra(
  subject: string,
  topic: string,
  subtopics: string[],
): string {
  if (!/comput/i.test(subject)) return "";
  const focus = subtopics.length ? subtopics.join("; ") : topic;
  return `This is a KS2 COMPUTING lesson on "${topic}". Cover: ${focus}.
Teach algorithms as clear numbered steps a 9–11 year old can follow. For programming topics, include a tiny debug tip.
For online safety, use short realistic scenarios and safer choices.
Prefer table or key_info blocks (not maths diagrams). No GCSE computer-science jargon.
Include a common mistake (e.g. changing too many things when debugging) and the fix.`;
}
