/**
 * Drive the real app through sign-in and onboarding, then capture every
 * screen it can reach. With no EXPO_PUBLIC_SUPABASE_* configured the app
 * runs on fixtures, so entering an email signs you straight in.
 */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, 'shots');
fs.mkdirSync(OUT, { recursive: true });
const B = 'http://localhost:8099';

async function shot(page, name) {
  await page.waitForTimeout(700);
  const f = name.replace(/[\/\[\]]/g, '_');
  await page.screenshot({ path: path.join(OUT, `${f}.png`) });
  fs.writeFileSync(path.join(OUT, `${f}.html`), await page.content());
  console.log(`  shot ${name}`);
}

async function tap(page, label) {
  const el = page.locator(`[aria-label="${label}"]`).first();
  if (await el.count()) { await el.click({ timeout: 5000 }); await page.waitForTimeout(500); return true; }
  console.log(`  (no control "${label}")`);
  return false;
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({
    viewport: { width: 402, height: 874 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  });
  const page = await ctx.newPage();
  page.on('pageerror', () => {});

  await page.goto(`${B}/signin`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await shot(page, '01-signin');

  // fixture mode: an email signs you straight in
  const email = page.locator('input').first();
  await email.fill('piyush@example.com');
  await page.waitForTimeout(300);
  await shot(page, '02-signin-filled');
  await tap(page, 'create account');
  await page.waitForTimeout(1500);
  await shot(page, '03-after-signin');

  // onboarding, step by step
  const steps = [
    ['04-ob-name', async () => { const i = page.locator('input').first();
        if (await i.count()) await i.fill('Piyush'); }],
    ['05-ob-home', null], ['06-ob-areas', null],
    ['07-ob-interests', null], ['08-ob-push', null],
  ];
  for (const [name, prep] of steps) {
    if (prep) await prep();
    await shot(page, name);
    if (!(await tap(page, 'next'))) {
      if (!(await tap(page, 'looks good'))) await tap(page, 'not now');
    }
    await page.waitForTimeout(900);
  }
  await shot(page, '09-home-feed');

  // the pager's four pages, then the rest of the routes
  for (const label of ['chats', 'alerts', 'you']) {
    if (await tap(page, label)) await shot(page, `10-home-${label}`);
  }

  const ROUTES = ['compose','circles','receipts','recap','filter','areas','profile-edit',
                  'name','blocked','delete-account','legal/terms','legal/privacy',
                  'legal/guidelines','pick-location','media-send'];
  for (const r of ROUTES) {
    try {
      await page.goto(`${B}/${r}`, { waitUntil: 'networkidle', timeout: 15000 });
      await shot(page, `20-${r}`);
    } catch (e) { console.log(`  FAIL ${r}`); }
  }
  await browser.close();
})();
