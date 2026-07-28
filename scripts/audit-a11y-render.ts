/**
 * Phase 5/6 (rendering) + Phase 9 (WCAG 2.2 AA) evidence sweep.
 * Loads each public, no-auth-required route at two viewports, runs axe-core,
 * and screenshots each. Writes JSON results to audit/evidence/a11y-render-results.json.
 *
 * Run with: npx tsx scripts/audit-a11y-render.ts   (dev server must be running on :3000)
 */
import { chromium, type Page } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import fs from "fs";
import path from "path";

const BASE = "http://localhost:3000";
const ROUTES = [
  "/",
  "/ks2",
  "/ks2/curriculum",
  "/ks2/sats",
  "/ks2/eleven-plus",
  "/ks2/school",
  "/subjects",
  "/syllabus",
  "/revision",
  "/algebra",
  "/privacy",
  "/terms",
  "/contact",
];

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet-ipad", width: 768, height: 1024 },
];

const SHOT_DIR = path.join(__dirname, "..", "audit", "evidence", "screenshots");
fs.mkdirSync(SHOT_DIR, { recursive: true });

type RouteResult = {
  route: string;
  viewport: string;
  httpStatus: number | null;
  consoleErrors: string[];
  pageErrors: string[];
  axeViolations: {
    id: string;
    impact: string | null;
    description: string;
    help: string;
    nodes: number;
    targets: string[][];
  }[];
  screenshot: string;
  loadTimeMs: number;
};

async function testRoute(page: Page, route: string, viewportName: string): Promise<RouteResult> {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.removeAllListeners("console");
  page.removeAllListeners("pageerror");
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => {
    pageErrors.push(err.message);
  });

  const start = Date.now();
  let httpStatus: number | null = null;
  try {
    const resp = await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 20000 });
    httpStatus = resp ? resp.status() : null;
  } catch (e) {
    pageErrors.push(`navigation failed: ${(e as Error).message}`);
  }
  const loadTimeMs = Date.now() - start;

  await page.waitForTimeout(500);

  const shotName = `${route.replace(/\//g, "_") || "_root"}__${viewportName}.png`;
  const shotPath = path.join(SHOT_DIR, shotName);
  try {
    await page.screenshot({ path: shotPath, fullPage: true });
  } catch (e) {
    pageErrors.push(`screenshot failed: ${(e as Error).message}`);
  }

  let axeViolations: RouteResult["axeViolations"] = [];
  try {
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    axeViolations = results.violations.map((v) => ({
      id: v.id,
      impact: v.impact ?? null,
      description: v.description,
      help: v.help,
      nodes: v.nodes.length,
      targets: v.nodes.map((n) => n.target as string[]),
    }));
  } catch (e) {
    pageErrors.push(`axe scan failed: ${(e as Error).message}`);
  }

  return {
    route,
    viewport: viewportName,
    httpStatus,
    consoleErrors,
    pageErrors,
    axeViolations,
    screenshot: shotName,
    loadTimeMs,
  };
}

async function main() {
  const browser = await chromium.launch();
  const results: RouteResult[] = [];

  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
    });
    const page = await context.newPage();
    for (const route of ROUTES) {
      // eslint-disable-next-line no-console
      console.log(`Testing ${route} @ ${viewport.name}...`);
      const result = await testRoute(page, route, viewport.name);
      results.push(result);
    }
    await context.close();
  }

  await browser.close();

  const outPath = path.join(__dirname, "..", "audit", "evidence", "a11y-render-results.json");
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\nWrote ${results.length} results to ${outPath}`);

  const totalViolations = results.reduce((sum, r) => sum + r.axeViolations.length, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.consoleErrors.length + r.pageErrors.length, 0);
  console.log(`Total axe violations: ${totalViolations}, total console/page errors: ${totalErrors}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
