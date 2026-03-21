const fs = require('fs');
const html = fs.readFileSync('tmp/shamcash-autofit/payout-1773258668903.html','utf8');
const clean = (s) => String(s||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
let idx=0;
for (const m of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)) {
  idx++;
  const attrs = (m[1]||'').replace(/\s+/g,' ').trim();
  const text = clean(m[2]).slice(0,120);
  const inner = (m[2]||'').replace(/\s+/g,' ').trim().slice(0,180);
  console.log(`IDX=${idx}`);
  console.log(`ATTRS=${attrs}`);
  console.log(`TEXT=${text || '-'}`);
  console.log(`INNER_SNIPPET=${inner || '-'}`);
}
