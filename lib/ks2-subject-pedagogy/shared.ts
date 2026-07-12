/**
 * Shared subject pedagogy helpers for non-maths KS2 teaching engine.
 */

export interface SubjectPedagogyHint {
  strand: string;
  method: string;
  commonMistakes: { mistake: string; correction: string }[];
  prerequisites: string[];
  preferredBlocks: string[];
  guidance: string;
}

export function defaultPrerequisites(subjectId: string): string[] {
  switch (subjectId) {
    case "english":
      return [
        "How to find evidence in a text",
        "Basic sentence punctuation",
      ];
    case "science":
      return [
        "How to observe carefully",
        "What a fair test means",
      ];
    case "computing":
      return [
        "Following step-by-step instructions",
        "Safe use of devices",
      ];
    case "arabic":
      return [
        "Basic classroom Arabic greetings",
        "Listening carefully to new words",
      ];
    case "maths":
    default:
      return [
        "Place value and times tables",
        "Reading number lines and tables",
      ];
  }
}

export function usesTeachingEngine(subjectId: string): boolean {
  return ["maths", "english", "science", "computing", "arabic"].includes(
    subjectId,
  );
}
