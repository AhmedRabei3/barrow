const fs = require('fs');
const html = fs.readFileSync('tmp/shamcash-autofit/payout-1773258668903.html','utf8');
const clean = (s) => String(s||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
let idx=0;
for (const m of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)) {
  const attrs = m[1]||'';
  const inner = m[2]||'';
  const text = clean(inner);
  idx++;
  if (!text || text==='-' || text==='تصدير' || text==='الفلاتر' || text==='Toggle Sidebar' || text==='أ') {
    if (text==='أ') {
      console.log('BUTTON_A_INDEX', idx);
      console.log('ATTRS', attrs);
      console.log('INNER', inner.slice(0,500));
      const start = Math.max(0, m.index - 500);
      const end = Math.min(html.length, m.index + m[0].length + 500);
      console.log('CONTEXT', html.slice(start,end));
    }
  }
}
