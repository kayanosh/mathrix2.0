import type { MetadataRoute } from "next";

/**
 * There was no robots.txt at all, so crawling was entirely undirected.
 *
 * For a B2C revision product organic search is the acquisition channel, and the
 * revision notes, syllabus and question bank are the rankable assets. Everything
 * that is per-user, staff-facing, or a different product (the KS2 schools
 * surface, the tuition portal, teacher tools, admin) is excluded — those pages
 * have no search value and would dilute the crawl.
 */
const BASE = process.env.NEXT_PUBLIC_APP_URL || "https://mathrix.co.uk";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/account",
          "/progress",
          "/admin",
          "/portal",
          "/teacher",
          "/ks2",
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
