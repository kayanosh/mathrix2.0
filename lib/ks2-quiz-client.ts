export interface KS2QuizQuestion {
  question: string;
  answer: string;
}

interface QuizRequest {
  subject: string;
  topic: string;
  subtopics: string[];
  target: string;
  tier: string;
  count: number;
}

const inFlight = new Map<string, Promise<KS2QuizQuestion[]>>();

export function fetchKS2Questions(
  request: QuizRequest,
  force = false,
): Promise<KS2QuizQuestion[]> {
  const key = JSON.stringify(request);
  if (!force) {
    const existing = inFlight.get(key);
    if (existing) return existing;
  }
  const promise = fetch("/api/ks2-quiz", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  }).then(async (response) => {
    if (!response.ok) throw new Error("quiz failed");
    const data = (await response.json()) as { questions: KS2QuizQuestion[] };
    return data.questions;
  });
  inFlight.set(key, promise);
  void promise.then(
    () => inFlight.delete(key),
    () => inFlight.delete(key),
  );
  return promise;
}
