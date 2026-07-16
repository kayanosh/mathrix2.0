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
VISUAL ACCURACY IS MANDATORY:
- Never use labeled_shape in science. It is a geometry diagram and must not stand in for an object, circuit, planet, plant, or animal.
- Every visual label must name something from this exact topic or worked question.
- For forces, use force_diagram with this shape:
  { "type": "force_diagram", "objectLabel": "apple", "objectEmoji": "🍎", "forces": [{ "label": "gravity", "direction": "down", "detail": "towards Earth's centre" }], "groundLabel": "Earth" }
- The force arrows must act on the named object and point in the scientifically correct direction.
- For other science topics, prefer table, key_info, or chart. Omit a diagram when no supported visual accurately represents the idea.
Never invent GCSE content or complex equations.
Ban vague filler ("simply", "obviously"). Always include a common scientific misconception and the correct idea.`;
}
