const { loadEnvConfig } = require('@next/env');
const { chromium } = require('playwright');
const fs = require('fs');
loadEnvConfig(process.cwd());

const read = (k) => String(process.env[k] || '').trim();
const readAny = (keys) => keys.map(read).find(Boolean) || '';
const parseBool = (v, d=false) => {
  const n = String(v || '').toLowerCase();
  if (['1','true','yes','on'].includes(n)) return true;
  if (['0','false','no','off'].includes(n)) return false;
  return d;
};

(async () => {
  const payoutUrl = readAny(['SHAMCASH_WEB_PAYOUT_URL', 'SHAMCASH_TRANSFER_PAGE_URL']);
  const profileDir = readAny(['SHAMCASH_WEB_PROFILE_DIR', 'SHAMCASH_PROFILE_PATH', 'SHAMCASH_PLAYWRIGHT_PROFILE_DIR']);
  const channel = read('SHAMCASH_BROWSER_CHANNEL') || undefined;
  const executablePath = read('SHAMCASH_BROWSER_EXECUTABLE_PATH') || undefined;
  const headless = parseBool(readAny(['SHAMCASH_WEB_HEADLESS','SHAMCASH_HEADLESS']), false);
  const selector = readAny(['SHAMCASH_ADD_RECIPIENT_TRIGGER_SELECTOR']) || 'nav div.cursor-pointer.rounded-full:has(> svg)';

  const context = await chromium.launchPersistentContext(profileDir, { headless, channel, executablePath });
  const page = await context.newPage();
  await page.goto(payoutUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(()=>null);

  const count = await page.locator(selector).count();
  console.log('COUNT', count);
  const i = 1;
  if (count <= i) {
    console.log('NO_INDEX_1');
    await context.close();
    return;
  }

  const loc = page.locator(selector).nth(i);
  try {
    await loc.click({ timeout: 10000 });
    console.log('CLICK_OK');
  } catch (e) {
    console.log('CLICK_ERR', String(e && e.message ? e.message : e));
  }

  await page.waitForTimeout(1200);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => null);

  const inputs = await page.evaluate(() => Array.from(document.querySelectorAll('input,textarea,select')).map(el => ({tag:el.tagName.toLowerCase(), type:el.getAttribute('type')||'', name:el.getAttribute('name')||'', id:el.getAttribute('id')||'', placeholder:el.getAttribute('placeholder')||'' })));
  console.log('INPUT_COUNT', inputs.length);
  for (const inp of inputs.slice(0,50)) {
    console.log(`INP ${inp.tag} type=${inp.type||'-'} name=${inp.name||'-'} id=${inp.id||'-'} placeholder=${inp.placeholder||'-'}`);
  }

  const htmlPath = 'tmp/shamcash-autofit/post-trigger-index1.html';
  fs.writeFileSync(htmlPath, await page.content(), 'utf8');
  console.log('HTML', htmlPath);

  await context.close();
})().catch((e) => {
  console.error('INDEX1_ERR', e && e.message ? e.message : e);
  process.exit(1);
});
