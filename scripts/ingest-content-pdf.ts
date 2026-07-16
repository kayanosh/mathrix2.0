/**
 * PDF Content Ingestion Script
 *
 * Extracts text from a GCSE Maths content PDF, chunks it, classifies by topic,
 * generates embeddings, and stores in the content_chunks table.
 *
 * Usage:
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/ingest-content-pdf.ts path/to/gcse-maths.pdf
 *
 * Requires: pdf-parse, openai, @supabase/supabase-js
 * Environment: OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import * as fs from "fs";
import * as path from "path";

// ── Topic classification (mirrors lib/prompts/classify.ts keywords) ──────────

const TOPIC_PATTERNS: Array<{ topic: string; pattern: RegExp }> = [
  {
    topic: "probability",
    pattern:
      /tree diagram|venn|probability|dice|cards|random|mutually exclusive|independent event|sample space|expected|outcome|relative frequency/i,
  },
  {
    topic: "statistics",
    pattern:
      /histogram|box plot|mean|median|mode|range|frequency|cumulative|scatter|correlation|sampling|quartile|interquartile/i,
  },
  {
    topic: "geometry",
    pattern:
      /triangle|circle|area|perimeter|pythagoras|angle|polygon|congruent|similar|bearing|locus|loci|construction|volume|surface area|shape|sector|arc|tangent|chord|diameter|radius/i,
  },
  {
    topic: "trigonometry",
    pattern: /sin|cos|tan|trig|soh cah toa|sine rule|cosine rule|hypotenuse/i,
  },
  {
    topic: "ratio",
    pattern:
      /ratio|proportion|speed|distance|time|compound interest|depreciation|percentage change|growth|decay|rate of change/i,
  },
  {
    topic: "algebra",
    pattern:
      /solve|equation|expand|factoris|quadratic|simultaneous|inequalit|sequence|nth term|algebraic|completing the square|iteration|function|proof|rearrang|formula/i,
  },
  {
    topic: "number",
    pattern:
      /fraction|decimal|percentage|integer|prime|factor|hcf|lcm|index|indices|surd|standard form|bound|rounding|estimation/i,
  },
];

function classifyChunk(text: string): string {
  for (const { topic, pattern } of TOPIC_PATTERNS) {
    if (pattern.test(text)) return topic;
  }
  return "algebra"; // fallback
}

/** Detect tier from text context */
function detectTier(text: string): "foundation" | "higher" | "both" {
  const lc = text.toLowerCase();
  const higherKeywords =
    /higher only|higher tier|completing the square|algebraic fraction|circle theorem|vector|sine rule|cosine rule|conditional probability|histogram.*frequency density|iteration|proof|function notation|composite function|inverse function/;
  const foundationKeywords = /foundation only|foundation tier/;

  if (foundationKeywords.test(lc)) return "foundation";
  if (higherKeywords.test(lc)) return "higher";
  return "both";
}

// ── Chunking ─────────────────────────────────────────────────────────────────

interface TextChunk {
  text: string;
  pageNumber: number;
  topic: string;
  tier: "foundation" | "higher" | "both";
}

function chunkText(pages: string[]): TextChunk[] {
  const chunks: TextChunk[] = [];
  const MAX_CHUNK_SIZE = 900;

  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    const pageText = pages[pageIdx].trim();
    if (!pageText || pageText.length < 50) continue;

    // Split by double newlines (paragraph boundaries)
    const paragraphs = pageText.split(/\n\s*\n/).filter((p) => p.trim().length > 20);

    let buffer = "";
    for (const para of paragraphs) {
      if (buffer.length + para.length > MAX_CHUNK_SIZE && buffer.length > 100) {
        chunks.push({
          text: buffer.trim(),
          pageNumber: pageIdx + 1,
          topic: classifyChunk(buffer),
          tier: detectTier(buffer),
        });
        buffer = "";
      }
      buffer += (buffer ? "\n\n" : "") + para;
    }

    // Flush remaining buffer
    if (buffer.trim().length > 50) {
      chunks.push({
        text: buffer.trim(),
        pageNumber: pageIdx + 1,
        topic: classifyChunk(buffer),
        tier: detectTier(buffer),
      });
    }
  }

  return chunks;
}

// ── Main ingestion pipeline ──────────────────────────────────────────────────

async function main() {
  const pdfPath = process.argv[2];
  if (!pdfPath) {
    console.error("Usage: npx ts-node scripts/ingest-content-pdf.ts <path-to-pdf>");
    process.exit(1);
  }

  const resolvedPath = path.resolve(pdfPath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`File not found: ${resolvedPath}`);
    process.exit(1);
  }

  // Validate environment
  const requiredEnvVars = [
    "OPENAI_API_KEY",
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];
  for (const v of requiredEnvVars) {
    if (!process.env[v]) {
      console.error(`Missing environment variable: ${v}`);
      process.exit(1);
    }
  }

  console.log(`📄 Reading PDF: ${resolvedPath}`);
  const dataBuffer = fs.readFileSync(resolvedPath);

  const pdfParseModule = await import("pdf-parse");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfParse = (pdfParseModule as any).default ?? pdfParseModule;
  const pdfData = await pdfParse(dataBuffer);

  console.log(`📝 Extracted ${pdfData.numpages} pages, ${pdfData.text.length} chars`);

  // Split by page (pdf-parse joins all pages; we'll split by page markers if possible)
  // pdf-parse doesn't give per-page text easily, so we split by form-feed or large gaps
  const pages = pdfData.text.split(/\f/).filter((p: string) => p.trim().length > 0);

  // If form-feed splitting didn't work, treat as single page
  const resolvedPages = pages.length > 1 ? pages : [pdfData.text];

  console.log(`📦 Chunking ${resolvedPages.length} page(s)...`);
  const chunks = chunkText(resolvedPages);
  console.log(`📦 Created ${chunks.length} chunks`);

  // Show topic distribution
  const topicCounts: Record<string, number> = {};
  for (const c of chunks) {
    topicCounts[c.topic] = (topicCounts[c.topic] || 0) + 1;
  }
  console.log("📊 Topic distribution:", topicCounts);

  // ── Generate embeddings ──────────────────────────────────────────────────
  const OpenAI = (await import("openai")).default;
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  console.log("🧠 Generating embeddings (this may take a while)...");

  const BATCH_SIZE = 20;
  const embeddings: number[][] = [];

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: batch.map((c) => c.text),
    });

    for (const item of response.data) {
      embeddings.push(item.embedding);
    }

    console.log(
      `  Embedded ${Math.min(i + BATCH_SIZE, chunks.length)}/${chunks.length} chunks`
    );
  }

  // ── Store in Supabase ──────────────────────────────────────────────────
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const sourceFile = path.basename(resolvedPath);

  console.log("💾 Storing chunks in Supabase...");

  // Insert in batches
  const INSERT_BATCH = 50;
  let inserted = 0;

  for (let i = 0; i < chunks.length; i += INSERT_BATCH) {
    const batch = chunks.slice(i, i + INSERT_BATCH).map((chunk, idx) => ({
      source_file: sourceFile,
      topic: chunk.topic,
      subtopic: null,
      tier: chunk.tier,
      chunk_text: chunk.text,
      page_number: chunk.pageNumber,
      embedding: JSON.stringify(embeddings[i + idx]),
    }));

    const { error } = await supabase.from("content_chunks").insert(batch);
    if (error) {
      console.error(`  Error inserting batch at ${i}:`, error.message);
    } else {
      inserted += batch.length;
      console.log(`  Inserted ${inserted}/${chunks.length} chunks`);
    }
  }

  console.log(`\n✅ Done! Ingested ${inserted} chunks from ${sourceFile}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
