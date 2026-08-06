/**
 * DEF-004 live check: is the teacher cursor pointing at the RIGHT thing?
 *
 * This supersedes audit-cursor-sync.ts, which asked only whether the cursor
 * was inside *some* teaching target. That question is nearly always answered
 * yes — every cell of a column method is a target — so it passed while the
 * cursor was demonstrably on the wrong digit. It is the exact gap the reported
 * defect lived in.
 *
 * Two independent assertions here, and BOTH are needed:
 *
 *   1. BRANCH. Did the authored `focusTargetIds` path actually supply the
 *      anchors (`data-teacher-path="authored"`), or did it silently fall back
 *      to inference? Without this, a passing semantic check cannot distinguish
 *      "the fix works" from "the fix is dormant and inference happened to
 *      agree" — the same false-confidence error in a new form.
 *
 *   2. SEMANTICS. When the tutor speaks a digit, does the element under the
 *      cursor render that digit? This is independent of the pointer's own
 *      target selection: it compares the spoken word against the DOM text at
 *      the cursor's coordinates via elementFromPoint.
 *
 * Run with: npx tsx scripts/audit-cursor-semantics.ts [topicId] [skillName]
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const EMAIL = process.env.STUDENT1_EMAIL!;
const PASSWORD = process.env.STUDENT1_PASSWORD!;
const TOPIC_ID = process.argv[2] || "y5m-add-subtract";
const SAMPLE_MS = Number(process.env.SAMPLE_MS ?? 45000);
const SETTLE_MS = 800;

interface Sample {
  t: number;
  path: string | null;
  resolved: string | null;
  visible: boolean;
  spokenWord: string | null;
  spokenIndex: string | null;
  anchors: string | null;
  anchorLabels: string | null;
  narration: string | null;
  cursorId: string | null;
  cursorLabel: string | null;
}

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.log("BLOCKED: STUDENT1_EMAIL / STUDENT1_PASSWORD not set.");
    process.exit(2);
  }
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
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

  await page.goto(`${BASE}/ks2`, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(1000);
  const continueBtn = page.getByRole("button", { name: /continue/i }).first();
  if (await continueBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await continueBtn.click();
    await page.waitForTimeout(1500);
  }

  await page.goto(`${BASE}/ks2/topic/${TOPIC_ID}`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await page.waitForTimeout(1500);

  const skillName = process.argv[3];
  if (skillName) {
    await page.getByText(skillName, { exact: false }).first().click();
    await page.waitForTimeout(500);
  }
  const guidedRow = page.getByText(/^guided$/i).first();
  if (await guidedRow.isVisible({ timeout: 5000 }).catch(() => false)) {
    await guidedRow.click();
    await page.waitForTimeout(2000);
  }

  const watchBtn = page.getByText(/watch me solve it/i).first();
  console.log("Waiting for lesson generation (up to 60s)...");
  if (!(await watchBtn.isVisible({ timeout: 60000 }).catch(() => false))) {
    console.log("BLOCKED: 'Watch me solve it' never appeared.");
    await page.screenshot({ path: "/tmp/cursor-semantics-blocked.png", fullPage: true });
    await browser.close();
    process.exit(2);
  }
  await watchBtn.click();
  console.log(`Sampling for ${SAMPLE_MS / 1000}s...\n`);

  const samples: Sample[] = [];
  const start = Date.now();
  while (Date.now() - start < SAMPLE_MS) {
    const s = await page.evaluate(() => {
      const pointerEl = document.querySelector<HTMLElement>(
        '[aria-hidden].pointer-events-none.fixed.z-\\[60\\]',
      );
      const focusEl = document.querySelector<HTMLElement>("[data-teacher-path]");
      const activeWordEl = document.querySelector<HTMLElement>(
        '[data-speech-active="true"]',
      );
      const anchorIds = (focusEl?.dataset.teacherAnchors ?? "")
        .split("|")
        .filter(Boolean);
      const out = {
        path: focusEl?.dataset.teacherPath ?? null,
        resolved: focusEl?.dataset.teacherResolved ?? null,
        anchors: anchorIds.join("|") || null,
        anchorLabels:
          anchorIds
            .map(
              (id) =>
                document.querySelector<HTMLElement>(
                  `[data-teacher-id="${CSS.escape(id)}"]`,
                )?.dataset.teacherLabel ?? "",
            )
            .join("|") || null,
        narration:
          document
            .querySelector<HTMLElement>("[data-speech-word]")
            ?.parentElement?.textContent?.trim() ?? null,
        visible: false,
        spokenWord: activeWordEl?.textContent?.trim() ?? null,
        spokenIndex: activeWordEl?.dataset.speechWord ?? null,
        cursorId: null as string | null,
        cursorLabel: null as string | null,
      };
      if (!pointerEl) return out;
      const style = getComputedStyle(pointerEl);
      out.visible = parseFloat(style.opacity) > 0.5;
      const m = style.transform.match(/matrix\(([^)]+)\)/);
      if (!m) return out;
      const parts = m[1].split(",").map((v) => parseFloat(v.trim()));
      const x = parts[4] ?? 0;
      const y = parts[5] ?? 0;
      // What is ACTUALLY under the cursor — independent of how the pointer
      // chose its target. The pointer itself is pointer-events:none, so
      // elementFromPoint sees through it to the board.
      const hit = document.elementFromPoint(x, y) as HTMLElement | null;
      const anchor = hit?.closest<HTMLElement>("[data-teacher-id]") ?? null;
      out.cursorId = anchor?.dataset.teacherId ?? null;
      out.cursorLabel = anchor?.dataset.teacherLabel ?? null;
      return out;
    });
    samples.push({ t: Date.now() - start, ...s });
    await page.waitForTimeout(100);
  }

  const live = samples.filter((s) => s.visible && s.cursorId);
  const authored = live.filter((s) => s.path === "authored");

  // Judge only what has an objective answer: the tutor speaks a digit that is
  // one of THIS step's anchors, and that digit is unambiguous among them. A
  // digit written in an earlier step is not a miss (the cursor is meant to rest
  // on what it is about to write), and a repeated digit has no unique answer.
  const judgeable = live.filter((s) => {
    const word = s.spokenWord?.replace(/[^0-9]/g, "");
    if (!word || !s.anchorLabels) return false;
    const labels = s.anchorLabels.split("|");
    return labels.filter((l) => l === word).length === 1;
  });

  // The cursor TWEENS between anchors; it does not teleport, and it should not
  // (a teacher's hand moves). So the question is not "was it there the instant
  // the word was spoken" but "did it arrive". For each spoken anchor digit,
  // allow SETTLE_MS for the cursor to land, and report the latency so a
  // regression to genuinely-wrong targeting cannot hide behind this tolerance.
  const byWord = new Map<string, Sample[]>();
  for (const s of judgeable) {
    const k = `${s.anchors}#${s.spokenIndex}`;
    byWord.set(k, [...(byWord.get(k) ?? []), s]);
  }
  const verdicts = [...byWord.values()].map((group) => {
    const first = group[0];
    const word = first.spokenWord!.replace(/[^0-9]/g, "");
    const arrival = samples.find(
      (s) =>
        s.t >= first.t &&
        s.t <= first.t + SETTLE_MS &&
        s.anchors === first.anchors &&
        s.cursorLabel === word,
    );
    return { s: first, ok: Boolean(arrival), latency: arrival ? arrival.t - first.t : null };
  });
  const hits = verdicts.filter((v) => v.ok);
  const latencies = hits.map((v) => v.latency!).sort((a, b) => a - b);

  for (const s of samples) {
    if (!s.visible) continue;
    console.log(
      `t=${String(s.t).padStart(5)}ms path=${s.path ?? "-"} anchors=${s.anchorLabels ?? "-"} ` +
        `word=${JSON.stringify(s.spokenWord)} cursor=${s.cursorId ?? "-"} label=${JSON.stringify(s.cursorLabel)}`,
    );
  }

  const pct = (n: number, d: number) => (d ? `${((n / d) * 100).toFixed(0)}%` : "n/a");
  console.log("\n--- DEF-004 verdict ---");
  console.log(`Samples with cursor on an anchor : ${live.length}`);
  console.log(
    `  1. authored path supplied anchors : ${authored.length}/${live.length} (${pct(authored.length, live.length)})`,
  );
  console.log(
    `  2. cursor on the spoken anchor    : ${hits.length}/${verdicts.length} (${pct(hits.length, verdicts.length)})`,
  );
  if (latencies.length > 0) {
    console.log(
      `     arrival latency: median ${latencies[Math.floor(latencies.length / 2)]}ms, max ${latencies[latencies.length - 1]}ms (tolerance ${SETTLE_MS}ms)`,
    );
  }
  if (verdicts.length === 0) {
    console.log("  NOTE: no unambiguous anchor digit was spoken — check 2 is UNVERIFIED, not passed.");
  }
  for (const v of verdicts) {
    if (v.ok) continue;
    console.log(
      `  MISS t=${v.s.t}ms said ${JSON.stringify(v.s.spokenWord)} anchors=[${v.s.anchorLabels}] ` +
        `cursor was ${JSON.stringify(v.s.cursorLabel)} (${v.s.cursorId}) and never arrived within ${SETTLE_MS}ms\n` +
        `       narration: ${JSON.stringify(v.s.narration)}`,
    );
  }

  await page.screenshot({ path: "/tmp/cursor-semantics-final.png" });
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
