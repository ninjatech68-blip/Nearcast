/** Second pass: the pager's alerts page, and the [id] routes with real fixture ids. */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, 'shots2');
fs.mkdirSync(OUT, { recursive: true });
const B = 'http://localhost:8099';

async function shot(page, name) {
  await page.waitForTimeout(800);
  const f = name.replace(/[\/\[\]]/g, '_');
  await page.screenshot({ path: path.join(OUT, `${f}.png`) });
  fs.writeFileSync(path.join(OUT, `${f}.html`), await page.content());
  console.log(`  shot ${name}`);
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', () => {});

  // sign in on fixtures, then walk onboarding to the end
  await page.goto(`${B}/signin`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await (await page.locator('input').first()).fill('piyush@example.com');
  await page.locator('[aria-label="create account"]').first().click();
  await page.waitForTimeout(1500);
  for (let i = 0; i < 6; i++) {
    const input = page.locator('input').first();
    if (await input.count()) { try { await input.fill('Piyush'); } catch {} }
    for (const l of ['next', 'looks good', 'not now']) {
      const el = page.locator(`[aria-label="${l}"]`).first();
      if (await el.count()) { await el.click().catch(() => {}); break; }
    }
    await page.waitForTimeout(800);
  }
  await page.waitForTimeout(1000);

  // alerts: the label carries a count, so match by prefix
  const alerts = page.locator('[aria-label^="alerts"]').first();
  if (await alerts.count()) { await alerts.click().catch(() => {}); await shot(page, '11-home-alerts'); }

  const ROUTES = [
    'cast/badminton-after-work', 'cast/board-game-night', 'cast/ceramics-split',
    'caster/aarav', 'join/badminton-after-work', 'plan/chess-park-mine',
    'reflect/chess-park-mine', 'edit-cast/chess-park-mine', 'vouch/aarav',
    'invite/badminton-after-work__aarav', 'chat/c1', 'report/aarav', 'media-view',
  ];
  for (const r of ROUTES) {
    try {
      await page.goto(`${B}/${r}`, { waitUntil: 'networkidle', timeout: 15000 });
      await shot(page, `30-${r}`);
    } catch { console.log(`  FAIL ${r}`); }
  }
  await browser.close();
})();
