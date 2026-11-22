/**
 * "When the student asks a different question as a follow-up, it does not
 * solve it." These pin the three causes (see lib/conversation.ts) shut:
 * a second question is solved as a question, an old photo does not come back,
 * and a real follow-up is answered with the working it refers to in view.
 */
import {
  earlierNote,
  followUpMessages,
  isFollowUp,
  readAnswer,
  readTurn,
  solverMessages,
  type ChatTurnMessage,
} from "@/lib/conversation";
import { historyForRequest, parseConversation, serialiseConversation } from "@/lib/chat-memory";
import type { ChatMessage } from "@/types";
import type { WhiteboardResponse } from "@/types/whiteboard";

const PHOTO = "data:image/png;base64,AAAA";

/** An answer in the shape the page keeps and sends back. */
const answered = (conclusion: string) =>
  JSON.stringify({
    type: "steps",
    intro: "We need to get $x$ on its own.",
    steps: [
      { step_number: 1, operation_label: "Subtract 7 from both sides", explanation: "That 7 is in the way.", latex_after: "3x = 18" },
      { step_number: 2, operation_label: "Divide both sides by 3", explanation: "Undo the multiplying.", latex_after: "x = 6" },
    ],
    conclusion,
  });

const chat = (...turns: Array<string | ChatTurnMessage>): ChatTurnMessage[] =>
  turns.map((turn, i) =>
    typeof turn === "string" ? { role: i % 2 === 0 ? "user" : "assistant", content: turn } : turn,
  );

const text = (message: { content: unknown }) =>
  typeof message.content === "string"
    ? message.content
    : (message.content as Array<{ type: string; text?: string }>).find((p) => p.type === "text")?.text ?? "";

const images = (message: { content: unknown }) =>
  typeof message.content === "string"
    ? []
    : (message.content as Array<{ type: string }>).filter((p) => p.type === "image_url");

describe("a second question is a question", () => {
  it.each([
    "Solve 2x + 5 = 11",
    "what is 15% of 80",
    "Explain how to add fractions",
    "Explain Pythagoras' theorem",
    "why is the sum of the angles in a triangle 180 degrees?",
    "I'm not sure how to factorise x^2 + 5x + 6",
    "A train travels 120 miles in 2 hours. How fast is it going?",
    "Can you solve 4y - 3 = 9",
    "Can you help me with simultaneous equations",
    "find the area of a circle with radius 5",
  ])("%s", (second) => {
    const turn = readTurn(chat("Solve 3x + 7 = 25", answered("So $x = 6$."), second));
    expect(turn.kind).toBe("new_question");
    expect(turn.question).toBe(second);
  });

  it("is sent to the solver alone, exactly as a first question would be", () => {
    const first = solverMessages(readTurn(chat("Solve 2x + 5 = 11")), "[ctx] ");
    const second = solverMessages(
      readTurn(chat("Solve 3x + 7 = 25", answered("So $x = 6$."), "Solve 2x + 5 = 11")),
      "[ctx] ",
    );
    expect(second).toEqual(first);
    expect(second).toHaveLength(1);
    expect(second[0].role).toBe("user");
  });

  it("never hands the model its earlier answer as a turn to imitate", () => {
    const messages = solverMessages(
      readTurn(chat("Solve 3x + 7 = 25", answered("So $x = 6$."), "now do it with 5 instead of 7")),
    );
    expect(messages.map((m) => m.role)).toEqual(["user"]);
    expect(text(messages[0])).not.toContain('"operation_label"');
  });

  it("can be answered from the shared cache only when it stands alone", () => {
    const history = ["Solve 3x + 7 = 25", answered("So $x = 6$.")];
    expect(readTurn(chat(...history, "Solve 2x + 5 = 11")).standalone).toBe(true);
    expect(readTurn(chat(...history, "now do it with 5 instead of 7")).standalone).toBe(false);
    expect(readTurn(chat(...history, "what if x was negative?")).standalone).toBe(false);
    expect(readTurn(chat(...history, "why did you subtract 7?")).standalone).toBe(false);
  });
});

describe("a question that leans on the last one", () => {
  const turn = readTurn(chat("Solve 3x + 7 = 25", answered("So $x = 6$."), "now do it with 5 instead of 7"));
  const sent = text(solverMessages(turn, "[GCSE] ")[0]);

  it("is still a new question to solve", () => {
    expect(turn.kind).toBe("new_question");
  });

  it("takes the earlier question and answer along as a labelled note", () => {
    expect(sent).toContain("EARLIER IN THIS CONVERSATION");
    expect(sent).toContain("Do NOT solve these again");
    expect(sent).toContain('"Solve 3x + 7 = 25"');
    expect(sent).toContain("So $x = 6$.");
    expect(sent.indexOf("THE QUESTION TO ANSWER NOW")).toBeGreaterThan(sent.indexOf("Solve 3x + 7 = 25"));
    expect(sent.trim().endsWith("now do it with 5 instead of 7")).toBe(true);
  });

  it("keeps only the last few exchanges, and keeps them short", () => {
    const long = Array.from({ length: 10 }, (_, i) => ({
      question: `Question ${i} ${"x".repeat(900)}`,
      answer: "a".repeat(5000),
      conclusion: "",
      hadImage: false,
      images: [],
    }));
    const note = earlierNote(long);
    expect(note).not.toContain("Question 6");
    expect(note).toContain("Question 9");
    expect(note.length).toBeLessThan(3500);
  });
});

describe("an old photo does not come back", () => {
  const history = chat(
    { role: "user", content: "Solve this question from the photo", imageUrl: PHOTO },
    { role: "assistant", content: answered("So the area is $20$.") },
    "Solve 2x + 5 = 11",
  );
  const turn = readTurn(history);

  it("a typed question after a photo is not a photo question", () => {
    expect(turn.images).toEqual([]);
    expect(turn.standalone).toBe(true);
  });

  it("the photo is not sent to the solver again", () => {
    const [message] = solverMessages(turn);
    expect(images(message)).toHaveLength(0);
    expect(text(message)).toBe("Solve 2x + 5 = 11");
  });

  it("a new photo is sent, once", () => {
    const next = readTurn([...history, { role: "assistant", content: answered("So $x = 3$.") }, {
      role: "user", content: "", imageUrls: [PHOTO, PHOTO],
    }]);
    const [message] = solverMessages(next);
    expect(next.kind).toBe("new_question");
    expect(images(message)).toHaveLength(2);
    expect(text(message)).toMatch(/pages of one maths question sheet/);
  });

  it("the page stops re-sending photos from further back", () => {
    const sent = historyForRequest([
      { role: "user", content: "photo 1", imageUrl: PHOTO },
      { role: "assistant", content: "a" },
      { role: "user", content: "photo 2", imageUrl: PHOTO },
      { role: "assistant", content: "b" },
      { role: "user", content: "typed" },
    ]);
    expect(sent.map((m) => Boolean(m.imageUrl))).toEqual([false, false, true, false, false]);
    expect(sent.map((m) => m.content)).toEqual(["photo 1", "a", "photo 2", "b", "typed"]);
  });
});

describe("a real follow-up", () => {
  const history = ["Solve 3x + 7 = 25", answered("So $x = 6$.")];

  it.each([
    "why?",
    "why did you subtract 7?",
    "I don't understand step 2",
    "explain that again",
    "can you explain it a different way",
    "how did you get 18",
    "I'm confused",
    "what do you mean",
    "where did the 3 go in the last step?",
  ])("%s", (message) => {
    expect(readTurn(chat(...history, message)).kind).toBe("follow_up");
  });

  it("is not a follow-up when there is nothing to follow", () => {
    expect(isFollowUp("why?", [])).toBe(false);
    expect(readTurn(chat("why is the sky blue")).kind).toBe("new_question");
  });

  it("is not a follow-up when it comes with a photo", () => {
    const turn = readTurn(chat(...history, { role: "user", content: "why?", imageUrl: PHOTO }));
    expect(turn.kind).toBe("new_question");
  });

  it("shows the model the question and the full working it is about", () => {
    const [message] = followUpMessages(readTurn(chat(...history, "why did you subtract 7?")));
    const sent = text(message);
    expect(sent).toContain("Solve 3x + 7 = 25");
    // The steps — which used to be stripped, leaving only the first and last line.
    expect(sent).toContain("Step 1: Subtract 7 from both sides — That 7 is in the way. — → 3x = 18");
    expect(sent).toContain("Step 2: Divide both sides by 3");
    expect(sent).toContain("So $x = 6$.");
    expect(sent.trim().endsWith("why did you subtract 7?")).toBe(true);
  });

  it("shows the photo again when the question it is about was a photo", () => {
    const turn = readTurn(chat(
      { role: "user", content: "Solve this question from the photo", imageUrl: PHOTO },
      { role: "assistant", content: answered("So the area is $20$.") },
      "why did you multiply?",
    ));
    expect(turn.kind).toBe("follow_up");
    expect(images(followUpMessages(turn)[0])).toHaveLength(1);
  });

  it("is about the most recent answer", () => {
    const turn = readTurn(chat(...history, "Solve 2y = 10", answered("So $y = 5$."), "why?"));
    const sent = text(followUpMessages(turn)[0]);
    expect(sent.indexOf("THE QUESTION THE STUDENT ASKED:\nSolve 2y = 10")).toBeGreaterThan(-1);
    expect(sent).toContain("So $y = 5$.");
  });
});

describe("reading an earlier answer", () => {
  it("reads the explanation of a text answer", () => {
    const { answer } = readAnswer(
      JSON.stringify({ type: "explanation", intro: "Good question.", steps: [], blocks: [{ type: "text", content: "We subtract 7 to undo the adding." }], conclusion: "Does that help?" }),
    );
    expect(answer).toBe("Good question.\nWe subtract 7 to undo the adding.\nDoes that help?");
  });

  it("strips the board's internal tags from the working", () => {
    const { answer } = readAnswer(
      JSON.stringify({ steps: [{ operation_label: "Subtract", latex_after: "3x = 25 \\htmlId{arrow-1-to}{- 7}" }] }),
    );
    expect(answer).toBe("Step 1: Subtract — → 3x = 25 - 7");
  });

  it("copes with text that is not JSON, and with nothing", () => {
    expect(readAnswer("x is 6").answer).toBe("x is 6");
    expect(readAnswer("").answer).toBe("");
    expect(readAnswer("{not json").answer).toBe("{not json");
  });
});

describe("the conversation survives a reload", () => {
  const board = { intro: "Hi", blocks: [], conclusion: "So $x = 6$.", questionImageUrl: PHOTO } as unknown as WhiteboardResponse;
  const messages: ChatMessage[] = [
    { id: "u1", role: "user", content: "Solve 3x + 7 = 25", imageUrl: PHOTO, timestamp: new Date("2026-11-22T10:00:00Z") },
    { id: "a1", role: "assistant", content: answered("So $x = 6$."), timestamp: new Date("2026-11-22T10:00:05Z") },
  ];
  const boards = new Map([["a1", board]]);

  it("comes back with the same questions, answers and boards", () => {
    const back = parseConversation(serialiseConversation(messages, boards))!;
    expect(back.messages.map((m) => [m.id, m.role, m.content])).toEqual(
      messages.map((m) => [m.id, m.role, m.content]),
    );
    expect(back.messages[0].timestamp).toEqual(messages[0].timestamp);
    expect(back.whiteboards.get("a1")?.conclusion).toBe("So $x = 6$.");
  });

  it("does not keep photos", () => {
    const stored = serialiseConversation(messages, boards)!;
    expect(stored).not.toContain("base64");
    const back = parseConversation(stored)!;
    expect(back.messages[0].imageUrl).toBeUndefined();
  });

  it("drops the oldest questions rather than failing when it is too big", () => {
    const many: ChatMessage[] = Array.from({ length: 120 }, (_, i) => ({
      id: `m${i}`,
      role: i % 2 === 0 ? "user" : "assistant",
      content: `message ${i} ${"y".repeat(20_000)}`,
      timestamp: new Date(),
    }));
    const stored = serialiseConversation(many, new Map())!;
    expect(stored.length).toBeLessThanOrEqual(1_500_000);
    const back = parseConversation(stored)!;
    expect(back.messages[0].role).toBe("user");
    expect(back.messages.at(-1)?.id).toBe("m119");
  });

  it("stores nothing for an empty chat and ignores anything unreadable", () => {
    expect(serialiseConversation([], new Map())).toBeNull();
    expect(parseConversation(null)).toBeNull();
    expect(parseConversation("{")).toBeNull();
    expect(parseConversation(JSON.stringify({ v: 2, messages: [] }))).toBeNull();
    expect(parseConversation(JSON.stringify({ v: 1, messages: [{ id: 1 }] }))).toBeNull();
  });
});

/**
 * Found by asking the running app "Why did you subtract 5 first?". The model's
 * answer was good and in the right shape, but it was all words and mentioned
 * "3x + 5 = 20", so a check written for full solutions failed it, and the
 * pupil was shown the reply as raw JSON.
 */
describe("a follow-up answer never reaches the pupil as code", () => {
  const { followUpFallback } = jest.requireActual("@/lib/conversation") as typeof import("@/lib/conversation");
  const { validateResponse } = jest.requireActual("@/lib/validate") as typeof import("@/lib/validate");

  const reply = JSON.stringify({
    intro: "Great question! We subtracted 5 first to make it simpler to solve.",
    blocks: [
      {
        type: "text",
        content:
          "In the equation 3x + 5 = 20, the 5 is added to 3x. Subtracting 5 from both sides cancels out the +5. That leaves 3x = 15.",
      },
    ],
    conclusion: "That step sets us up to get x on its own.",
  });

  it("a words-only answer that mentions an equation fails the solution checks but keeps its data", () => {
    const result = validateResponse(reply, []);
    expect(result.ok).toBe(false);
    // The chat route shows result.data when there is any, so this is what the pupil sees.
    expect(result.data?.intro).toMatch(/^Great question/);
    expect(result.data?.blocks[0]).toMatchObject({ type: "text" });
  });

  it("reads the sentences out of a reply in the wrong shape", () => {
    const odd = JSON.stringify({ intro: "Good thinking.", blocks: [{ type: "note", content: "We take 5 away first." }], conclusion: "Done." });
    const shown = followUpFallback(odd);
    expect(shown).toEqual({
      intro: "Good thinking.",
      blocks: [{ type: "text", content: "We take 5 away first." }],
      conclusion: "Done.",
    });
  });

  it("shows no braces or field names, whatever comes back", () => {
    for (const raw of [reply, "```json\n" + reply + "\n```", '{"intro": "cut off mid', "[1, 2, 3]", "{}", ""]) {
      const shown = followUpFallback(raw);
      const all = [shown.intro, ...shown.blocks.map((b) => b.content), shown.conclusion].join(" ");
      expect(all).not.toMatch(/[{}]|"blocks"|"content"|"intro"/);
      expect(shown.blocks.length).toBeGreaterThan(0);
      expect(shown.blocks[0].content.length).toBeGreaterThan(0);
    }
  });

  it("keeps a plain-text reply as it is", () => {
    expect(followUpFallback("We take 5 away so that 3x is on its own.")).toEqual({
      intro: "Good question!",
      blocks: [{ type: "text", content: "We take 5 away so that 3x is on its own." }],
      conclusion: "",
    });
  });
});
