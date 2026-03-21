const { loadEnvConfig } = require('@next/env');
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
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
  const headless = parseBool(readAny(['SHAMCASH_WEB_HEADLESS', 'SHAMCASH_HEADLESS']), false);
  const triggerSelector = readAny(['SHAMCASH_ADD_RECIPIENT_TRIGGER_SELECTOR']) || 'nav div.cursor-pointer.rounded-full:has(> svg)';

  if (!payoutUrl) throw new Error('missing payout url');

  const outDir = path.resolve(process.cwd(), 'tmp/shamcash-autofit');
  fs.mkdirSync(outDir, { recursive: true });

  const context = await chromium.launchPersistentContext(profileDir, { headless, channel, executablePath });
  const page = await context.newPage();
  await page.goto(payoutUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => null);

  const triggerCount = await page.locator(triggerSelector).count().catch(() => 0);
  console.log('TRIGGER_SELECTOR', triggerSelector);
  console.log('TRIGGER_COUNT', triggerCount);

  for (let i = 0; i < Math.min(triggerCount, 6); i++) {
    await page.goto(payoutUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => null);

    const loc = page.locator(triggerSelector).nth(i);
    const text = (await loc.textContent().catch(() => '') || '').replace(/\s+/g,' ').trim();
    console.log(`\nTRY_INDEX ${i} TEXT=${text || '-'}`);

    try {
      await loc.click({ timeout: 10000 });
    } catch (e) {
      console.log('CLICK_FAIL', String(e && e.message ? e.message : e));
      continue;
    }

    await page.waitForTimeout(900);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => null);

    const html = await page.content();
    const htmlPath = path.join(outDir, `post-trigger-${Date.now()}-${i}.html`);
    const pngPath = path.join(outDir, `post-trigger-${Date.now()}-${i}.png`);
    fs.writeFileSync(htmlPath, html, 'utf8');
    await page.screenshot({ path: pngPath, fullPage: true }).catch(() => null);

    const stats = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input,textarea,select')).map((el) => ({
        tag: el.tagName.toLowerCase(),
        type: el.getAttribute('type') || '',
        name: el.getAttribute('name') || '',
        id: el.getAttribute('id') || '',
        placeholder: el.getAttribute('placeholder') || '',
      }));
      const buttons = Array.from(document.querySelectorAll('button,[role="button"]')).map((el) => (el.textContent || '').replace(/\s+/g,' ').trim()).filter(Boolean);
      return { inputCount: inputs.length, inputs: inputs.slice(0,40), buttonSamples: buttons.slice(0,40) };
    });

    console.log('ARTIFACT_HTML', htmlPath);
    console.log('ARTIFACT_PNG', pngPath);
    console.log('INPUT_COUNT', stats.inputCount);
    for (const inp of stats.inputs) {
      console.log(`- INPUT tag=${inp.tag} type=${inp.type || '-'} name=${inp.name || '-'} id=${inp.id || '-'} placeholder=${inp.placeholder || '-'}`);
    }
    console.log('BUTTON_SAMPLES', JSON.stringify(stats.buttonSamples.slice(0, 20)));
  }

  await context.close();
})().catch((e) => {
  console.error('TRIGGER_SCAN_ERROR', e && e.message ? e.message : e);
  process.exit(1);
});
