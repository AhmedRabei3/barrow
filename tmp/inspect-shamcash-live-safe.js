const { loadEnvConfig } = require('@next/env');
const { chromium } = require('playwright');
loadEnvConfig(process.cwd());

const read = (k) => String(process.env[k] || '').trim();
const readAny = (keys) => keys.map(read).find(Boolean) || '';

(async () => {
  const payoutUrl = readAny(['SHAMCASH_WEB_PAYOUT_URL', 'SHAMCASH_TRANSFER_PAGE_URL', 'SHAMCASH_WEB_LOGIN_URL']);
  const profileDir = readAny(['SHAMCASH_WEB_PROFILE_DIR', 'SHAMCASH_PROFILE_PATH', 'SHAMCASH_PLAYWRIGHT_PROFILE_DIR']);
  const headless = ['1','true','yes','on'].includes(readAny(['SHAMCASH_WEB_HEADLESS','SHAMCASH_HEADLESS']).toLowerCase());
  if (!payoutUrl) throw new Error('missing payout URL');

  const context = await chromium.launchPersistentContext(profileDir || '.pw-tmp-profile', { headless });
  const page = await context.newPage();
  await page.goto(payoutUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => null);
  await page.waitForTimeout(1200);

  console.log('URL', page.url());
  console.log('FRAME_COUNT', page.frames().length);

  for (const [i, frame] of page.frames().entries()) {
    try {
      const data = await frame.evaluate(() => {
        const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
        const rows = Array.from(document.querySelectorAll('button,[role="button"],a,input,textarea,select')).map((el) => ({
          tag: el.tagName.toLowerCase(),
          text: clean(el.textContent).slice(0, 80),
          placeholder: el.getAttribute('placeholder') || '',
          name: el.getAttribute('name') || '',
          type: el.getAttribute('type') || '',
          role: el.getAttribute('role') || '',
          aria: el.getAttribute('aria-label') || '',
        }));
        const interesting = rows.filter((r) => /send|transfer|wallet|amount|currency|confirm|submit|next|receive|account|balance|otp/i.test([r.text,r.placeholder,r.name,r.type,r.role,r.aria].join(' ')));
        return { total: rows.length, interesting: interesting.slice(0, 120) };
      });
      console.log(`Frame #${i} ${frame.url()}`);
      console.log(`TOTAL=${data.total} INTERESTING=${data.interesting.length}`);
      for (const row of data.interesting) {
        console.log(`- ${row.tag} text=${row.text||'-'} placeholder=${row.placeholder||'-'} name=${row.name||'-'} type=${row.type||'-'} role=${row.role||'-'} aria=${row.aria||'-'}`);
      }
    } catch (e) {
      console.log(`Frame #${i} inaccessible`);
    }
  }

  await context.close();
})().catch((e) => {
  console.error('INSPECT_ERROR', e && e.message ? e.message : e);
  process.exit(1);
});
