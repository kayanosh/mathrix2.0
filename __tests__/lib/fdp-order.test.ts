import { parseFdpOrder, buildFdpOrder } from "@/lib/methods/fdp-equivalence";
import { buildMethodForQuestion } from "@/lib/methods";
import { satisfiesSkillVisuals } from "@/lib/ks2-skill-visuals";

describe("FDP ordering", () => {
  it("parses ordering questions with mixed notations", () => {
    const p = parseFdpOrder("Order 1/4, 0.3 and 40% from smallest to largest.");
    expect(p).not.toBeNull();
    expect(p!.values).toHaveLength(3);
    expect(p!.ascending).toBe(true);
  });

  it("parses descending order", () => {
    const p = parseFdpOrder("Write 0.6, 1/2 and 55% in descending order.");
    expect(p!.ascending).toBe(false);
  });

  it("rejects non-ordering questions", () => {
    expect(parseFdpOrder("Convert 1/4 to a decimal.")).toBeNull();
    expect(parseFdpOrder("What is 40% of 50?")).toBeNull();
  });

  it("builds a number line with correct answer order", () => {
    const p = parseFdpOrder("Order 1/4, 0.3 and 40% from smallest to largest.")!;
    const built = buildFdpOrder(p);
    expect(built.block.type).toBe("number_line");
    expect(built.answer).toBe("1/4, 0.3, 40%");
    const line = built.block as { markers: { label: string }[] };
    expect(line.markers.map((m) => m.label)).toEqual(["1/4", "0.3", "40%"]);
  });

  it("routes through the method registry and satisfies fraction_compare visuals", () => {
    const built = buildMethodForQuestion("Order 1/4, 0.3 and 40% from smallest to largest.");
    expect(built).not.toBeNull();
    const types = [built!.block.type, ...(built!.extraBlocks || []).map((b) => b.type)];
    expect(satisfiesSkillVisuals(types, "fraction_compare")).toBe(true);
  });

  it("orders descending correctly", () => {
    const p = parseFdpOrder("Write 0.6, 1/2 and 55% in descending order.")!;
    expect(buildFdpOrder(p).answer).toBe("0.6, 55%, 1/2");
  });
});
