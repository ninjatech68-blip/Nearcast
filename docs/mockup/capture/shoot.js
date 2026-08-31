const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, 'shots');
fs.mkdirSync(OUT, { recursive: true });

const ROUTES = process.argv.slice(2);

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({
    viewport: { width: 402, height: 874 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  for (const r of ROUTES) {
    const url = `http://localhost:8099/${r}`;
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(1200);
      const name = r.replace(/\.html$/, '').replace(/[\/\[\]]/g, '_') || 'index';
      await page.screenshot({ path: path.join(OUT, `${name}.png`) });
      const html = await page.content();
      fs.writeFileSync(path.join(OUT, `${name}.html`), html);
      console.log(`ok   ${r}  (${(html.length/1024).toFixed(0)}kb)`);
    } catch (e) {
      console.log(`FAIL ${r}  ${String(e.message).slice(0, 120)}`);
    }
  }
  if (errs.length) console.log('page errors:', [...new Set(errs)].slice(0, 5));
  await browser.close();
})();
