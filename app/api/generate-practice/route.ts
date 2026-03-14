import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { topic, tier } = await req.json() as { topic?: string; tier?: string };

    const resolvedTopic = topic?.trim() || "mixed maths";
    const resolvedTier = tier || "GCSE";

    const systemPrompt = `You are a UK maths teacher creating practice questions.
Generate ONE practice question suitable for a ${resolvedTier} student.
The question should be on the topic: "${resolvedTopic}".
It must be self-contained — include all necessary numbers and context.
Return ONLY the question text — no answer, no explanation, no preamble.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate a ${resolvedTier} maths practice question on: ${resolvedTopic}` },
      ],
      max_tokens: 120,
      temperature: 0.9,
    });

    const question = completion.choices[0]?.message?.content?.trim() || "";

    return NextResponse.json({ question });
  } catch (err) {
    console.error("generate-practice error:", err);
    return NextResponse.json({ error: "Failed to generate question" }, { status: 500 });
  }
}
