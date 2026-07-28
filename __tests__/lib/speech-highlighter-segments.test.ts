import {
  wordIndexAtProgressWithSegments,
  wordIndexAtProgress,
} from "@/components/whiteboard/tutor/SpeechHighlighter";

// Fixture segments captured from a real Whisper transcription of real TTS
// audio for this exact text (see DEF-002 in MATHRIX_DEFECT_REGISTER.csv).
const TWO_SENTENCE_TEXT =
  "In the ones, 8 is bigger than the top digit, so we borrow. Now 13 take away 8 is 5.";
const TWO_SENTENCE_SEGMENTS = [
  { text: "In the ones, 8 is bigger than the top digit, so we borrow.", start: 0, end: 2.96 },
  { text: "Now 13 take away 8 is 5.", start: 3.42, end: 5.42 },
];

describe("wordIndexAtProgressWithSegments (DEF-002)", () => {
  it("stays within the first sentence's word range while its segment is active", () => {
    // First sentence is 13 words (indices 0-12); its segment spans 0-2.96s.
    const idx = wordIndexAtProgressWithSegments(
      TWO_SENTENCE_TEXT,
      1480, // ~halfway through the first segment
      5420,
      TWO_SENTENCE_SEGMENTS,
    );
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(13);
  });

  it("jumps to the second sentence's word range once its segment starts, not a whole-clip linear guess", () => {
    // Whole-clip linear estimate at t=3.5s/5.42s would land ~index 12-13
    // (end of sentence one). The real segment starts sentence two at 3.42s,
    // so the correct behaviour is index >= 13 (first word of sentence two).
    const idx = wordIndexAtProgressWithSegments(
      TWO_SENTENCE_TEXT,
      3500,
      5420,
      TWO_SENTENCE_SEGMENTS,
    );
    expect(idx).toBeGreaterThanOrEqual(13);

    const wholeClipEstimate = wordIndexAtProgress(TWO_SENTENCE_TEXT, 3500, 5420);
    expect(wholeClipEstimate).toBeLessThan(13);
  });

  it("falls back to the whole-clip linear estimate when segment count doesn't match sentence count", () => {
    const mismatched = [{ text: "wrong", start: 0, end: 1 }];
    expect(
      wordIndexAtProgressWithSegments(TWO_SENTENCE_TEXT, 1000, 5420, mismatched),
    ).toBe(wordIndexAtProgress(TWO_SENTENCE_TEXT, 1000, 5420));
  });

  it("falls back to the whole-clip linear estimate when segments are missing", () => {
    expect(
      wordIndexAtProgressWithSegments(TWO_SENTENCE_TEXT, 1000, 5420, null),
    ).toBe(wordIndexAtProgress(TWO_SENTENCE_TEXT, 1000, 5420));
  });

  it("handles a single-sentence clip", () => {
    const text = "Let's subtract 62,403 minus 27,568 using the column method.";
    const segments = [{ text, start: 0, end: 5.44 }];
    const idx = wordIndexAtProgressWithSegments(text, 2700, 5440, segments);
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(9);
  });
});
