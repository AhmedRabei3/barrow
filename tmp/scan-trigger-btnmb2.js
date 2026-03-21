const { loadEnvConfig } = require('@next/env');
const { chromium } = require('playwright');
const fs = require('fs');
loadEnvConfig(process.cwd());

const read = (k) => String(process.env[k] || '').trim();
const readAny = (keys) => keys.map(read).find(Boolean) || '';

(async () => {
  const payoutUrl = readAny(['SHAMCASH_WEB_PAYOUT_URL', 'SHAMCASH_TRANSFER_PAGE_URL']);
  const profileDir = readAny(['SHAMCASH_WEB_PROFILE_DIR', 'SHAMCASH_PROFILE_PATH', 'SHAMCASH_PLAYWRIGHT_PROFILE_DIR']);
  const channel = read('SHAMCASH_BROWSER_CHANNEL') || undefined;
  const executablePath = read('SHAMCASH_BROWSER_EXECUTABLE_PATH') || undefined;
  const selector = 'button.mb-2.hover\\:text-primary';

  const context = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    channel,
    executablePath,
  });
  const page = await context.newPage();
  await page.goto(payoutUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(()=>null);

  const count = await page.locator(selector).count();
  console.log('COUNT', count);

  if (count > 0) {
    try {
      await page.locator(selector).first().click({ timeout: 10000 });
      console.log('CLICK_OK');
    } catch (e) {
      console.log('CLICK_ERR', String(e && e.message ? e.message : e));
    }
  }

  await page.waitForTimeout(1000);
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(()=>null);

  const stats = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input,textarea,select')).map((el) => ({tag:el.tagName.toLowerCase(), type:el.getAttribute('type')||'', name:el.getAttribute('name')||'', id:el.getAttribute('id')||'', placeholder:el.getAttribute('placeholder')||''}));
    const buttons = Array.from(document.querySelectorAll('button,[role="button"]')).map((el) => (el.textContent||'').replace(/\s+/g,' ').trim()).filter(Boolean);
    return { inputs, buttons: buttons.slice(0,40) };
  });

  console.log('INPUT_COUNT', stats.inputs.length);
  for (const inp of stats.inputs.slice(0,50)) {
    console.log(`INP ${inp.tag} type=${inp.type||'-'} name=${inp.name||'-'} id=${inp.id||'-'} placeholder=${inp.placeholder||'-'}`);
  }
  console.log('BUTTONS', JSON.stringify(stats.buttons));

  fs.writeFileSync('tmp/shamcash-autofit/post-trigger-btnmb2.html', await page.content(), 'utf8');
  await page.screenshot({ path: 'tmp/shamcash-autofit/post-trigger-btnmb2.png', fullPage: true }).catch(()=>null);
  console.log('ARTIFACT tmp/shamcash-autofit/post-trigger-btnmb2.html');

  await context.close();
})().catch((e) => {
  console.error('BTN_TRIGGER_ERR', e && e.message ? e.message : e);
  process.exit(1);
});
