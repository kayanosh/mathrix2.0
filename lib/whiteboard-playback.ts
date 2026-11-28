import { isQuestionForPupil, type TutorStepModel } from "@/lib/tutor-steps";
import { sanitizeForTTS } from "@/lib/narration";

/** The teacher-like sequence used for every whiteboard cue. */
export type PlaybackPhase =
  | "focus"
  | "point"
  | "write"
  | "explain"
  | "check"
  | "pupil_pause"
  | "complete";

export interface TeacherSpeechParts {
  explanation: string;
  check?: string;
  /** The check is a question the pupil should stop and answer. */
  asksPupil?: boolean;
}

export const FOCUS_SETTLE_MS = 260;
export const POINTER_SETTLE_MS = 480;
/**
 * Thinking time after a question the pupil has been asked.
 *
 * It was 2.2 seconds: the question was still being read when the answer was
 * written. Eight seconds is long enough to work out "what is one part worth?",
 * and the pupil can end it early with the "Show me" button.
 */
export const PUPIL_PAUSE_MS = 8000;
/** The breath a teacher takes between two lines of working. */
export const STEP_BREATH_MS = 650;

const phaseOrder: PlaybackPhase[] = [
  "focus",
  "point",
  "write",
  "explain",
  "check",
  "pupil_pause",
  "complete",
];

function fingerprint(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function includesMeaningfully(text: string, detail: string): boolean {
  const haystack = fingerprint(text);
  const needle = fingerprint(detail).slice(0, 40);
  return needle.length > 8 && haystack.includes(needle);
}

/**
 * Split one display step into what the teacher explains and the separate
 * question the pupil should answer. Keeping the check separate is what lets
 * the player visibly pause instead of racing straight into the next step.
 */
/**
 * A rule's name as it is said mid-sentence: "inverse operations", but
 * "Pythagoras' theorem" and "SOHCAHTOA" keep their capitals.
 */
function spokenRuleName(rule: string): string {
  const name = rule.trim().replace(/\s+rule$/i, "");
  const first = name.split(/\s+/)[0] ?? "";
  const isName = /['’]s?$/.test(first) || first === first.toUpperCase() || /^(Pythagoras|Fibonacci|Venn|Euler)/.test(first);
  return isName ? name : name.charAt(0).toLowerCase() + name.slice(1);
}

/**
 * Whether a step's "rule" is the name of something a pupil should learn.
 *
 * The field is meant for "Pythagoras' theorem" or "the angle at the centre
 * theorem". It is often filled with what the step does, and the lesson then
 * said "This is called division", "This is called adding", "This is called
 * definition of mean", after a step that had just divided, added, or found a
 * mean. A teacher names a rule; they do not name arithmetic.
 */
export function isWorthNaming(rule: string): boolean {
  const name = rule.trim().toLowerCase().replace(/\s+rule$/, "");
  if (!name) return false;
  if (/^(?:the\s+)?(?:definition|meaning|formula|calculation|working)\b/.test(name)) return false;
  if (/\b(?:calculation|arithmetic|working out)$/.test(name)) return false;
  return !/^(?:(?:simple|basic)\s+)?(?:add(?:ing|ition)?|subtract(?:ing|ion)?|multipl(?:y|ying|ication)|divi(?:de|ding|sion)|halv(?:e|ing)|doubl(?:e|ing)|round(?:ing)?|simplif(?:y|ying|ication)|substitut(?:e|ing|ion)|product|sum|total|fractions?|counting|squar(?:e|ing)|square root(?:ing)?|order(?:ing)?|convert(?:ing)?|conversion|percentages?|decimals?|factoris(?:e|ing|ation)|expand(?:ing)?|collect(?:ing)?(?: like terms)?|combin(?:e|ing) like terms|rearrang(?:e|ing))$/.test(
    name,
  );
}

export function buildTeacherSpeechParts(
  step: TutorStepModel | undefined,
  /**
   * False when an earlier step of this lesson has already named the same rule.
   * A teacher names "inverse operations" once; the board was saying "We are
   * using the Inverse operations rule" on every step that used it, three times
   * in one linear equation.
   */
  nameTheRule = true,
): TeacherSpeechParts {
  if (!step) return { explanation: "" };

  let explanation = step.explanation?.trim() || step.narration.trim();

  // What is added next starts a new sentence, so the one before has to end.
  // "X: move 0.5 right Here is why." was being read out as one run.
  const closed = (text: string) => (/[.!?]["')\]]?\$?$/.test(text.trim()) ? text.trim() : `${text.trim()}.`);

  // The reason comes straight after the instruction, as a teacher gives it:
  // "Subtract 2x from both sides. That brings all the x terms to one side."
  // It used to be announced first with "Here is why.", on every step.
  if (step.why && !includesMeaningfully(explanation, step.why)) {
    explanation = `${closed(explanation)} ${step.why.trim()}`;
  }

  if (nameTheRule && step.rule && isWorthNaming(step.rule) && !includesMeaningfully(explanation, step.rule)) {
    explanation = `${closed(explanation)} This is called ${spokenRuleName(step.rule)}.`;
  }

  const check = step.check?.trim();
  let spokenCheck: string | undefined;
  if (check) {
    const plain = check.replace(/^check\s*[:.\-–]\s*/i, "").replace(/[✓✔]/g, "").trim();
    spokenCheck = isQuestionForPupil(check)
      ? `Your turn. ${check}`
      : // Something that only sounds like a question ("ready to collect like
        // terms?") is said as it is. A worked check is introduced as one.
        /\?\s*$/.test(plain) && !/^check\b/i.test(check)
        ? plain
        : `Let's check. ${plain}`;
  }
  return {
    explanation: sanitizeForTTS(explanation),
    check: spokenCheck ? sanitizeForTTS(spokenCheck) : undefined,
    asksPupil: check ? isQuestionForPupil(check) : false,
  };
}

export function nextPlaybackPhase(
  phase: PlaybackPhase,
  hasCheck: boolean,
): PlaybackPhase {
  switch (phase) {
    case "focus":
      return "point";
    case "point":
      return "write";
    case "write":
      return "explain";
    case "explain":
      return hasCheck ? "check" : "pupil_pause";
    case "check":
      return "pupil_pause";
    case "pupil_pause":
    case "complete":
      return "complete";
  }
}

export function phaseHasReached(
  current: PlaybackPhase,
  target: PlaybackPhase,
): boolean {
  return phaseOrder.indexOf(current) >= phaseOrder.indexOf(target);
}

export function playbackPhaseLabel(phase: PlaybackPhase): string {
  switch (phase) {
    case "focus":
      return "Finding the step";
    case "point":
      return "Look here";
    case "write":
      return "Writing it out";
    case "explain":
      return "Teacher explanation";
    case "check":
      return "Quick check";
    case "pupil_pause":
      return "Your turn: have a go";
    case "complete":
      return "Step complete";
  }
}

/**
 * How long the board waits before the next step.
 *
 * After a question the pupil was asked, real thinking time: never under 1.4
 * seconds, however fast the lesson is played. After any other step, a breath.
 * Every step used to get the long pause and a caption telling the pupil to
 * "say this step back in your own words", eleven times in one equation and
 * with two seconds to do it in. A teacher stops for questions, not for every
 * line.
 */
export function pupilPauseDurationMs(speed: number, askedSomething = true): number {
  const safeSpeed = Number.isFinite(speed) && speed > 0 ? speed : 1;
  if (!askedSomething) return Math.max(350, STEP_BREATH_MS / safeSpeed);
  // Thinking takes as long as it takes: playing the lesson at double speed
  // does not halve it. Only the slow setting changes it, and makes it longer.
  return Math.max(PUPIL_PAUSE_MS, PUPIL_PAUSE_MS / safeSpeed);
}
