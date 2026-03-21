const { loadEnvConfig } = require('@next/env');
const { chromium } = require('playwright');
loadEnvConfig(process.cwd());

const read = (k) => String(process.env[k] || '').trim();
const readAny = (keys) => {
  for (const k of keys) {
    const v = read(k);
    if (v) return v;
  }
  return '';
};

(async () => {
  const payoutUrl = readAny(['SHAMCASH_WEB_PAYOUT_URL', 'SHAMCASH_TRANSFER_PAGE_URL', 'SHAMCASH_WEB_LOGIN_URL']);
  const profileDir = readAny(['SHAMCASH_WEB_PROFILE_DIR', 'SHAMCASH_PROFILE_PATH', 'SHAMCASH_PLAYWRIGHT_PROFILE_DIR']);
  const headless = ['1','true','yes','on'].includes(readAny(['SHAMCASH_WEB_HEADLESS','SHAMCASH_HEADLESS']).toLowerCase());
  if (!payoutUrl) throw new Error('missing payout URL');

  const context = profileDir
    ? await chromium.launchPersistentContext(profileDir, { headless })
    : await chromium.launchPersistentContext('.pw-tmp-profile', { headless });

  const page = await context.newPage();
  await page.goto(payoutUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => null);
  await page.waitForTimeout(1500);

  console.log('URL', page.url());
  console.log('FRAME_COUNT', page.frames().length);

  const inspect = async (label) => {
    console.log(`\n=== ${label} ===`);
    for (const [i, frame] of page.frames().entries()) {
      try {
        const data = await frame.evaluate(() => {
          const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
          const controls = Array.from(document.querySelectorAll('button, a[role="button"], [role="button"], a, input, textarea, select'));
          const rows = controls.map((el) => {
            const tag = el.tagName.toLowerCase();
            const text = clean(el.textContent).slice(0, 80);
            const placeholder = el.getAttribute('placeholder') || '';
            const type = el.getAttribute('type') || '';
            const name = el.getAttribute('name') || '';
            const role = el.getAttribute('role') || '';
            const aria = el.getAttribute('aria-label') || '';
            const cls = (el.getAttribute('class') || '').slice(0, 120);
            return { tag, text, placeholder, type, name, role, aria, cls };
          });

          const interesting = rows.filter((r) => /إرسال|ارسال|تحويل|تحويل الأموال|send|transfer|wallet|amount|currency|محفظ|مبلغ|عملة|تأكيد|confirm|submit|next|التالي|receive|استقبال/i.test([r.text, r.placeholder, r.name, r.aria, r.cls].join(' ')));
          return {
            total: rows.length,
            interesting: interesting.slice(0, 150),
            firstRows: rows.slice(0, 80),
          };
        });

        console.log(`Frame #${i}: ${frame.url()}`);
        console.log(`controls_total=${data.total} interesting=${data.interesting.length}`);
        for (const r of data.interesting) {
          console.log(`- ${r.tag} text=${r.text || '-'} placeholder=${r.placeholder || '-'} name=${r.name || '-'} type=${r.type || '-'} role=${r.role || '-'} aria=${r.aria || '-'} class=${r.cls || '-'}`);
        }
      } catch (e) {
        console.log(`Frame #${i}: inaccessible (${String(e.message || e)})`);
      }
    }
  };

  await inspect('BEFORE_CLICK');

  const triggers = [
    'button:has-text("إرسال")',
    'button:has-text("ارسال")',
    'button:has-text("تحويل")',
    'button:has-text("تحويل الأموال")',
    'button:has-text("Send")',
    'button:has-text("Transfer")',
    '[role="button"]:has-text("إرسال")',
    '[role="button"]:has-text("تحويل")',
  ];

  let clicked = false;
  for (const sel of triggers) {
    const loc = page.locator(sel).first();
    const c = await loc.count().catch(() => 0);
    if (!c) continue;
    try {
      await loc.click({ timeout: 3000 });
      clicked = true;
      console.log('CLICKED_TRIGGER', sel);
      await page.waitForTimeout(1500);
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => null);
      break;
    } catch (e) {
      console.log('CLICK_FAILED', sel, String(e.message || e));
    }
  }

  if (!clicked) console.log('NO_TRIGGER_CLICKED');

  await inspect('AFTER_CLICK');

  await context.close();
})().catch((e) => {
  console.error('INSPECT_ERROR', e && e.message ? e.message : e);
  process.exit(1);
});
