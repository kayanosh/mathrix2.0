/**
 * What a pupil's second message is, and what the solver should be shown.
 *
 * A pupil asks a question, gets an answer, then types something else. It is
 * one of two things: a NEW question to solve, or a question ABOUT the answer
 * they were just given ("why did you subtract 7?"). The chat used to get this
 * wrong in three ways, and the pupil saw all three as "it didn't solve it":
 *
 *   1. One photo anywhere in the conversation made every later message a
 *      "photo question". The old photo was sent again and the checks that
 *      verify a typed question were switched off, so the tutor could answer
 *      the photo a second time instead of what was just typed.
 *   2. Earlier answers were handed back to the model as its own previous
 *      replies, in an older JSON shape than the one it is asked to write.
 *      Models copy the shape of their previous turn, so the second answer
 *      could come back in a shape the board cannot draw.
 *   3. Any message containing "explain", "why" or "not sure" was treated as a
 *      follow-up and given a short text reply — including "Explain how to add
 *      fractions", which is a new question — while a real follow-up was
 *      answered without the working it was asking about, which had been
 *      stripped out.
 *
 * So the conversation is read here, once, into a plain description of the
 * turn, and every model call is built from that:
 *
 *   - a new question is solved on its own, exactly like a first question;
 *   - if it leans on what came before ("now do it with 5 instead"), the
 *     earlier questions and answers go along as a clearly labelled note, never
 *     as model turns to imitate;
 *   - a follow-up is given the question and the full working it refers to.
 */

export interface ChatTurnMessage {
  role: string;
  content: string;
  imageUrl?: string;
  imageUrls?: string[];
}

/** One question the pupil asked earlier, with the answer they were given. */
export interface Exchange {
  question: string;
  /** The answer as plain text: opening line, each step, closing line. */
  answer: string;
  /** The final line alone ("So x = 6."), for a short reminder. */
  conclusion: string;
  hadImage: boolean;
  /** The photos sent with that question, for a follow-up about it. */
  images: string[];
}

export interface Turn {
  /** What the pupil just typed. */
  question: string;
  /** Photos attached to THIS message only. */
  images: string[];
  /** Earlier questions in this conversation, oldest first. */
  earlier: Exchange[];
  kind: "new_question" | "follow_up";
  /**
   * True when the question can be understood with nothing before it. Only
   * these are safe to answer from, or save to, the shared answer cache.
   */
  standalone: boolean;
}

const MAX_NOTE_EXCHANGES = 3;
const MAX_NOTE_CHARS = 600;

export function imagesOf(message: ChatTurnMessage | undefined): string[] {
  if (!message) return [];
  if (Array.isArray(message.imageUrls) && message.imageUrls.length > 0) return message.imageUrls;
  return message.imageUrl ? [message.imageUrl] : [];
}

function clip(text: string, max: number): string {
  const tidy = text.replace(/\s+/g, " ").trim();
  return tidy.length > max ? `${tidy.slice(0, max - 1).trimEnd()}…` : tidy;
}

/**
 * An earlier answer as the pupil saw it. The page keeps answers as JSON (in
 * either of two shapes); anything else is passed through as text.
 */
export function readAnswer(content: string): { answer: string; conclusion: string } {
  const raw = (content || "").trim();
  if (!raw.startsWith("{")) return { answer: raw, conclusion: "" };
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
    const lines: string[] = [];
    if (text(data.intro)) lines.push(text(data.intro));

    const steps = Array.isArray(data.steps) ? data.steps : [];
    steps.forEach((step, index) => {
      if (!step || typeof step !== "object") return;
      const s = step as Record<string, unknown>;
      const label = text(s.operation_label) || text(s.operationLabel);
      const working = text(s.latex_after) || text(s.latexAfter);
      const parts = [
        label,
        text(s.explanation) || text(s.content),
        working ? `→ ${working.replace(/\\htmlId\{[^}]*\}\{([^}]*)\}/g, "$1")}` : "",
      ].filter(Boolean);
      if (parts.length) lines.push(`Step ${index + 1}: ${parts.join(" — ")}`);
    });

    const blocks = Array.isArray(data.blocks) ? data.blocks : [];
    for (const block of blocks) {
      if (block && typeof block === "object") {
        const body = text((block as Record<string, unknown>).content);
        if (body) lines.push(body);
      }
    }

    const conclusion = text(data.conclusion);
    if (conclusion) lines.push(conclusion);
    return { answer: lines.join("\n"), conclusion };
  } catch {
    return { answer: raw, conclusion: "" };
  }
}

/** Each earlier question paired with the answer that followed it. */
export function earlierExchanges(messages: ChatTurnMessage[]): Exchange[] {
  const lastUser = messages.map((m) => m.role).lastIndexOf("user");
  const exchanges: Exchange[] = [];
  for (let i = 0; i < lastUser; i++) {
    const message = messages[i];
    if (message.role !== "user") continue;
    const reply = messages.slice(i + 1, lastUser).find((m) => m.role !== "user");
    const next = messages[i + 1];
    const { answer, conclusion } =
      reply && next === reply ? readAnswer(reply.content) : { answer: "", conclusion: "" };
    exchanges.push({
      question: (message.content || "").trim(),
      answer,
      conclusion,
      hadImage: imagesOf(message).length > 0,
      images: imagesOf(message),
    });
  }
  return exchanges;
}

/** The message has maths of its own to be worked out. */
const NEW_PROBLEM =
  /\d\s*[=+*\/^×÷]\s*[\d(a-z]|[a-z)\d]\s*=\s*[-\d(a-z]|\d\s*-\s*\d|[√∫]|\^\s*\d|\b(?:solve|calculate|work\s+out|factori[sz]e|expand|simplify|prove|sketch|differentiate|integrate|convert|estimate|evaluate|rearrange|round\s+\d|find\s+(?:the|x|y|a|an|\d)|what\s+is\s+\d|how\s+(?:many|much|far|long|fast|old))\b/i;

/** The message points back at the answer just given. */
const REFERS_BACK =
  /\b(?:step\s*\d+|(?:that|this|the|last|first|second|third|next|previous)\s+(?:step|line|bit|part|one|answer|method|working|example|question)|again|the answer|your answer|above|didn'?t|don'?t (?:understand|get)|do not (?:understand|get)|confus\w+|i'?m (?:lost|stuck)|still|more detail|simpler|slower|another way|different way|re-?explain|(?:explain|show|tell)(?: me)? (?:it|that|this|more|(?:why|how) (?:you|that|this|it|we|did))|(?:why|how|where|what) (?:did|do|does|is|are|was|were|would|should|can|could) (?:you|we|it|that|this|the \d+)|(?:did|do|have|were|are|can|could) you (?!solve|find|work|calculate|help|teach|explain (?!it|that|this|again|step))|you (?:did|got|get|used|mean|meant|moved|wrote|divided|subtracted|added|multiplied|changed|said|put))\b/i;

/** A reply too short to be anything but a reaction to the answer: "why?", "how". */
const BARE_REACTION =
  /^\s*(?:why|how|what|huh|eh|really|explain|explain please|please explain|i don'?t (?:get|understand)(?: it)?|what do you mean|how come|show me|more|ok(?:ay)? but (?:why|how))\s*[?.!]*\s*$/i;

/** The message only makes sense with the earlier conversation in view. */
const LEANS_ON_EARLIER =
  /\b(?:instead|same (?:thing|way|method|question|but)|this time|what if|what about|how about|now (?:do|try|with|make|use|change|what)|change (?:it|the)|another (?:one|example|question) like|similar (?:one|question)|like (?:that|this|the last) (?:one)?|the (?:last|previous|other|first|second) (?:one|question|answer)|that (?:one|question|answer)|use that|from (?:before|earlier|that))\b/i;

export function hasItsOwnMaths(text: string): boolean {
  return NEW_PROBLEM.test(text);
}

/**
 * A question about the answer just given, rather than a new question.
 *
 * Deliberately strict. A new question mistaken for a follow-up gets a short
 * text reply and no worked solution — the fault this replaces. A follow-up
 * mistaken for a new question still gets a full, checked answer, with the
 * earlier working supplied as context. So in doubt it is a new question.
 */
export function isFollowUp(question: string, earlier: Exchange[], images: string[] = []): boolean {
  if (images.length > 0) return false;
  if (!earlier.some((e) => e.answer)) return false;
  const text = (question || "").trim();
  if (!text) return false;
  if (BARE_REACTION.test(text)) return true;
  if (hasItsOwnMaths(text)) return false;
  if (text.split(/\s+/).length > 40) return false;
  return REFERS_BACK.test(text);
}

/** Read the whole conversation into a description of the turn to answer. */
export function readTurn(messages: ChatTurnMessage[]): Turn {
  const last = [...messages].reverse().find((m) => m.role === "user");
  const question = (last?.content || "").trim();
  const images = imagesOf(last);
  const earlier = earlierExchanges(messages);
  const followUp = isFollowUp(question, earlier, images);
  const leans =
    earlier.length > 0 && !hasItsOwnMaths(question)
      ? REFERS_BACK.test(question) || LEANS_ON_EARLIER.test(question)
      : earlier.length > 0 && LEANS_ON_EARLIER.test(question);
  return {
    question,
    images,
    earlier,
    kind: followUp ? "follow_up" : "new_question",
    standalone: !followUp && !leans,
  };
}

/**
 * The earlier conversation as a note for the solver. Labelled as already
 * answered so it is used to understand the new question, not solved again.
 */
export function earlierNote(earlier: Exchange[]): string {
  const recent = earlier.slice(-MAX_NOTE_EXCHANGES);
  if (recent.length === 0) return "";
  const lines = recent.map((exchange, index) => {
    const asked = exchange.question
      ? `"${clip(exchange.question, 300)}"${exchange.hadImage ? " (with a photo, not shown again)" : ""}`
      : "(a question in a photo, not shown again)";
    const told = exchange.conclusion || exchange.answer;
    return `${index + 1}. The student asked: ${asked}\n   They were told: ${told ? clip(told, MAX_NOTE_CHARS) : "(no answer was given)"}`;
  });
  return [
    "EARLIER IN THIS CONVERSATION — already answered. This is background only, so you can understand what the student means. Do NOT solve these again.",
    ...lines,
    "(end of earlier conversation)",
  ].join("\n");
}

type TextPart = { type: "text"; text: string };
type ImagePart = { type: "image_url"; image_url: { url: string; detail: "high" } };
export interface ModelMessage {
  role: "user";
  content: string | Array<TextPart | ImagePart>;
}

function withImages(images: string[], text: string): ModelMessage {
  if (images.length === 0) return { role: "user", content: text };
  return {
    role: "user",
    content: [
      ...images.map((url) => ({ type: "image_url" as const, image_url: { url, detail: "high" as const } })),
      { type: "text" as const, text },
    ],
  };
}

/**
 * The messages for solving a new question: always one user message. A question
 * that stands alone is sent alone, exactly as a first question would be.
 */
export function solverMessages(turn: Turn, contextPrefix = ""): ModelMessage[] {
  const question =
    turn.question ||
    (turn.images.length > 1
      ? "These images are the pages of one maths question sheet. Read them in order, then solve the question(s) step by step showing all working out."
      : turn.images.length === 1
        ? "Look at this maths question in the image. Read it carefully, then solve it step by step showing all working out."
        : "");
  if (turn.standalone || turn.earlier.length === 0) {
    return [withImages(turn.images, `${contextPrefix}${question}`)];
  }
  return [
    withImages(
      turn.images,
      `${contextPrefix}${earlierNote(turn.earlier)}\n\nTHE QUESTION TO ANSWER NOW (solve this one in full):\n${question}`,
    ),
  ];
}

/**
 * The messages for a follow-up: the question it is about, the full working the
 * pupil was shown, and what they have now asked.
 */
export function followUpMessages(turn: Turn): ModelMessage[] {
  const about = [...turn.earlier].reverse().find((e) => e.answer) ?? turn.earlier[turn.earlier.length - 1];
  const before = turn.earlier.slice(0, Math.max(0, turn.earlier.indexOf(about)));
  const parts = [
    before.length > 0 ? earlierNote(before) : "",
    "THE QUESTION THE STUDENT ASKED:",
    about?.question ? clip(about.question, 1200) : "(a question in a photo)",
    "",
    "THE ANSWER YOU GAVE THEM (this is what they are asking about):",
    about?.answer ? about.answer.slice(0, 6000) : "(not available)",
    "",
    "WHAT THE STUDENT HAS NOW ASKED:",
    turn.question,
  ].filter((line, index, all) => !(line === "" && all[index - 1] === ""));
  // A question that was a photo is shown again: "why did you do that?" cannot
  // be answered without seeing what "that" was done to.
  return [withImages(about?.images ?? [], parts.join("\n").trim())];
}

/** An answer to a follow-up, as the three parts the chat page shows. */
export interface FollowUpText {
  intro: string;
  blocks: Array<{ type: "text"; content: string }>;
  conclusion: string;
}

/**
 * What to show when a follow-up reply did not pass as a whiteboard answer.
 *
 * The reply used to be put on the page whole. When it was JSON that had failed
 * a check, the pupil was shown the JSON: braces, "blocks", "content" and all.
 * A reply is now read for its sentences, and code is never shown.
 */
export function followUpFallback(raw: string): FollowUpText {
  const cleaned = (raw || "").replace(/```(?:json)?/gi, "").trim();
  const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

  if (/^[{[]/.test(cleaned)) {
    try {
      const data = JSON.parse(cleaned) as Record<string, unknown>;
      const blocks = (Array.isArray(data.blocks) ? data.blocks : [])
        .map((block) => (block && typeof block === "object" ? text((block as Record<string, unknown>).content) : ""))
        .filter(Boolean);
      const intro = text(data.intro);
      const conclusion = text(data.conclusion);
      if (blocks.length > 0 || intro) {
        return {
          intro: blocks.length > 0 ? intro || "Good question!" : "Good question!",
          blocks: (blocks.length > 0 ? blocks : [intro]).map((content) => ({ type: "text" as const, content })),
          conclusion,
        };
      }
    } catch {
      // Not readable: fall through to the apology, never to the raw reply.
    }
    return {
      intro: "Sorry, I could not put that answer together.",
      blocks: [{ type: "text", content: "Please ask again, or ask it in a different way." }],
      conclusion: "",
    };
  }

  if (!cleaned) {
    return {
      intro: "Sorry, I could not put that answer together.",
      blocks: [{ type: "text", content: "Please ask again, or ask it in a different way." }],
      conclusion: "",
    };
  }
  return { intro: "Good question!", blocks: [{ type: "text", content: cleaned }], conclusion: "" };
}
