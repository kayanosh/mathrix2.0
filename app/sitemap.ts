import type { MetadataRoute } from "next";
import { REVISION_TOPICS } from "@/lib/revision-data";
import { GCSE_SYLLABUS } from "@/lib/syllabus";

/**
 * There was no sitemap, and the content pages are client-only with no metadata,
 * so almost nothing was discoverable.
 *
 * This ships now, ahead of the server-rendered subtopic pages, because
 * discovery-to-ranking lag is measured in weeks — the crawl budget should start
 * warming before the pages land.
 *
 * DELIBERATELY LIMITED FOR NOW: it lists only routes that genuinely exist and
 * render content today. Per-subtopic URLs are NOT listed yet, because their slugs
 * are not frozen — the three topic taxonomies (lib/syllabus.ts, lib/subjects.ts,
 * lib/revision-data.ts) still use different strings for the same concept, and
 * publishing URLs before that is settled would mean changing indexed URLs later
 * and forfeiting the rankings. Add them once the canonical registry exists.
 */
const BASE = (process.env.NEXT_PUBLIC_APP_URL || "https://mathrix.co.uk").replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const core: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/revision`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/subjects`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/syllabus`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/exam-papers`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  // Counted, not listed: a sanity signal that the content datasets are wired in
  // and a reminder of how many pages become available once slugs are frozen.
  const subtopicCount = REVISION_TOPICS.reduce((n, t) => n + t.subtopics.length, 0);
  const boardCount = Object.keys(GCSE_SYLLABUS).length;
  if (process.env.NODE_ENV !== "production") {
    console.log(
      `[sitemap] ${core.length} static routes; ${subtopicCount} revision subtopics and ` +
        `${boardCount} exam boards are ready to publish once canonical slugs are frozen.`,
    );
  }

  return core;
}
