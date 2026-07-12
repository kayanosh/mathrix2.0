/**
 * Science-specific prompt helpers for KS2 lesson generation.
 */

export function scienceLessonExtra(
  subject: string,
  topic: string,
  subtopics: string[],
): string {
  if (!/science/i.test(subject)) return "";
  const focus = subtopics.length ? subtopics.join("; ") : topic;
  return `This is a KS2 SCIENCE lesson on "${topic}". Cover: ${focus}.
Teach like a patient science teacher: clear vocabulary, everyday examples, and evidence.
If the topic is an investigation or Working Scientifically, structure the worked example as:
1) question/hypothesis 2) what to change/measure/keep the same 3) method 4) results table idea 5) conclusion.
Prefer table or key_info visuals when helpful. Never invent GCSE content or complex equations.
Ban vague filler ("simply", "obviously"). Always include a common scientific misconception and the correct idea.`;
}
