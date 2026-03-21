const { loadEnvConfig } = require('@next/env');
const { chromium } = require('playwright');
loadEnvConfig(process.cwd());

const read = (k) => String(process.env[k] || '').trim();
const readAny = (keys) => keys.map(read).find(Boolean) || '';
const parseBool = (v, d=false) => {
  const n = String(v || '').toLowerCase();
  if (['1','true','yes','on'].includes(n)) return true;
  if (['0','false','no','off'].includes(n)) return false;
  return d;
};

const urls = [
  readAny(['SHAMCASH_BASE_URL']),
  readAny(['SHAMCASH_TRANSACTIONS_PAGE_URL']),
  readAny(['SHAMCASH_TRANSFER_PAGE_URL']),
  'https://shamcash.sy/ar/application/home',
  'https://shamcash.sy/ar/application/transaction',
  'https://shamcash.sy/ar/application/favorite',
  'https://shamcash.sy/ar/application/report',
  'https://shamcash.sy/ar/application/accountStatement',
].filter(Boolean);
const uniqUrls = [...new Set(urls)];

(async () => {
  const profileDir = readAny(['SHAMCASH_WEB_PROFILE_DIR', 'SHAMCASH_PROFILE_PATH', 'SHAMCASH_PLAYWRIGHT_PROFILE_DIR']);
  const headless = parseBool(readAny(['SHAMCASH_WEB_HEADLESS','SHAMCASH_HEADLESS']), true);
  const channel = read('SHAMCASH_BROWSER_CHANNEL') || undefined;
  const executablePath = read('SHAMCASH_BROWSER_EXECUTABLE_PATH') || undefined;

  const context = await chromium.launchPersistentContext(profileDir || '.pw-temp-profile', {
    headless,
    channel,
    executablePath,
  });
  const page = await context.newPage();

  const candidates = {
    wallet: ["input[name*='wallet' i]", "textarea[name*='wallet' i]", "input[placeholder*='محفظ' i]"],
    amount: ["input[name*='amount' i]", "input[inputmode='decimal']", "input[type='number']", "input[placeholder*='المبلغ' i]"],
    submit: ["button:has-text('تحويل')", "button:has-text('إرسال')", "button:has-text('ارسال')", "button:has-text('Transfer')", "button:has-text('Send')"],
    dialog: ["[role='dialog']", "[role='alertdialog']", "div[data-state='open'][role='dialog']"],
  };

  for (const url of uniqUrls) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => null);
      await page.waitForTimeout(1200);

      const counts = {};
      for (const [key, sels] of Object.entries(candidates)) {
        let total = 0;
        for (const sel of sels) total += await page.locator(sel).count().catch(() => 0);
        counts[key] = total;
      }

      console.log('\nURL', url);
      console.log('ACTUAL', page.url());
      console.log('TITLE', await page.title().catch(() => ''));
      console.log('COUNTS', JSON.stringify(counts));

      const hitButtons = await page.locator('button,[role="button"],a').allTextContents().catch(() => []);
      const filtered = hitButtons.map((t) => String(t || '').replace(/\s+/g, ' ').trim()).filter((t) => /تحويل|إرسال|ارسال|Transfer|Send|محفظ|المبلغ/i.test(t));
      console.log('BUTTON_TEXT_HITS', JSON.stringify(filtered.slice(0, 30)));
    } catch (e) {
      console.log('\nURL', url);
      console.log('ERROR', String(e && e.message ? e.message : e));
    }
  }

  await context.close();
})().catch((e) => {
  console.error('SCAN_ERROR', e && e.message ? e.message : e);
  process.exit(1);
});
