/**
 * Phase 6 live check: does the teacher pointer's rendered position stay
 * within the bounding box of the currently-active teaching target during
 * real whiteboard playback? Logs in as a student, opens a KS2 topic lesson,
 * starts "Watch me solve it", and samples DOM state repeatedly.
 *
 * Run with: npx tsx scripts/audit-cursor-sync.ts
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const EMAIL = process.env.STUDENT1_EMAIL!;
const PASSWORD = process.env.STUDENT1_PASSWORD!;
const TOPIC_ID = process.argv[2] || "y5m-add-subtract";

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") console.log("[console error]", m.text().slice(0, 200));
  });

  await page.addInitScript(() => {
    window.localStorage.setItem("mathrix_intro_seen", "1");
  });

  await page.goto(`${BASE}/chat`, { waitUntil: "networkidle" });
  const openAuthBtn = page.getByRole("button", { name: /sign in/i }).first();
  if (await openAuthBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await openAuthBtn.click();
  }
  await page.locator('input[placeholder="Email address"]').waitFor({ timeout: 10000 });
  const signInTab = page.getByRole("button", { name: /^sign in$/i }).first();
  if (await signInTab.isVisible().catch(() => false)) await signInTab.click();
  await page.fill('input[placeholder="Email address"]', EMAIL);
  await page.fill('input[placeholder="Password"]', PASSWORD);
  await page.click('form button[type="submit"]');
  await page.waitForTimeout(2000);

  console.log(`Navigating to /ks2 to establish school context...`);
  await page.goto(`${BASE}/ks2`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1000);

  const continueBtn = page.getByRole("button", { name: /continue/i }).first();
  if (await continueBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log("School-selection gate found, clicking Continue...");
    await continueBtn.click();
    await page.waitForTimeout(1500);
  }

  console.log(`Navigating to /ks2/topic/${TOPIC_ID} ...`);
  await page.goto(`${BASE}/ks2/topic/${TOPIC_ID}`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1500);
  console.log("Landed at:", page.url());

  const skillName = process.argv[3];
  if (skillName) {
    console.log(`Selecting skill: ${skillName}`);
    await page.getByText(skillName, { exact: false }).first().click();
    await page.waitForTimeout(500);
  }

  const guidedRow = page.getByText(/^guided$/i).first();
  if (await guidedRow.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log("Expanding 'Guided' section...");
    await guidedRow.click();
    await page.waitForTimeout(2000);
  }

  // Find and click a "Watch me solve it" button. Lesson generation is a live
  // LLM call and can take up to ~45s, especially on a cold cache.
  const watchBtn = page.getByText(/watch me solve it/i).first();
  console.log("Waiting for lesson generation to finish (up to 45s)...");
  const found = await watchBtn.isVisible({ timeout: 45000 }).catch(() => false);
  if (!found) {
    console.log("BLOCKED: 'Watch me solve it' button not found/visible within 15s on this topic page.");
    await page.screenshot({ path: "/tmp/cursor-sync-blocked.png", fullPage: true });
    console.log("Screenshot saved to /tmp/cursor-sync-blocked.png for inspection.");
    await browser.close();
    return;
  }
  await watchBtn.click();
  console.log("Clicked 'Watch me solve it'. Sampling pointer position for 8s...");

  const samples: { t: number; pointer: { x: number; y: number; opacity: string } | null; targetRect: DOMRect | null; inside: boolean | null }[] = [];

  const start = Date.now();
  while (Date.now() - start < 8000) {
    const sample = await page.evaluate(() => {
      const pointerEl = document.querySelector('[aria-hidden].pointer-events-none.fixed.z-\\[60\\]') as HTMLElement | null;
      if (!pointerEl) return { pointer: null, allRects: [] as { left: number; top: number; right: number; bottom: number; width: number; height: number }[] };
      const style = getComputedStyle(pointerEl);
      const transform = style.transform;
      // Extract translate values from the matrix.
      let x = 0, y = 0;
      const match = transform.match(/matrix\(([^)]+)\)/);
      if (match) {
        const parts = match[1].split(",").map((s) => parseFloat(s.trim()));
        x = parts[4] ?? 0;
        y = parts[5] ?? 0;
      }
      // Find the currently visible teacher-target elements.
      const candidates = Array.from(
        document.querySelectorAll<HTMLElement>(
          '[data-teacher-target="primary"], [data-teacher-target="detail"], [data-teacher-target="visual"]'
        )
      ).filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
      const rects = candidates.map((el) => {
        const r = el.getBoundingClientRect();
        return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
      });
      return {
        pointer: { x, y, opacity: style.opacity },
        allRects: rects,
      };
    });

    let inside: boolean | null = null;
    if (sample.pointer && sample.allRects.length > 0) {
      const margin = 4; // small tolerance for sub-pixel rounding
      inside =
        sample.allRects.some(
          (rr) =>
            sample.pointer!.x >= rr.left - margin &&
            sample.pointer!.x <= rr.right + margin &&
            sample.pointer!.y >= rr.top - margin &&
            sample.pointer!.y <= rr.bottom + margin
        ) ?? null;
    }

    samples.push({
      t: Date.now() - start,
      pointer: sample.pointer,
      targetRect: sample.allRects[0] as any,
      inside,
    });
    await page.waitForTimeout(400);
  }

  console.log("\n--- Samples ---");
  let visibleSamples = 0;
  let insideCount = 0;
  let outsideCount = 0;
  for (const s of samples) {
    const opacity = s.pointer ? parseFloat(s.pointer.opacity) : 0;
    if (opacity > 0.5) {
      visibleSamples++;
      if (s.inside === true) insideCount++;
      if (s.inside === false) outsideCount++;
    }
    console.log(
      `t=${s.t}ms pointer=${s.pointer ? `(${s.pointer.x.toFixed(0)},${s.pointer.y.toFixed(0)}) opacity=${s.pointer.opacity}` : "null"} inside=${s.inside}`
    );
  }
  console.log(`\nVisible samples: ${visibleSamples}, inside target rect: ${insideCount}, outside: ${outsideCount}`);

  await page.screenshot({ path: "/tmp/cursor-sync-final.png", fullPage: false });
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
