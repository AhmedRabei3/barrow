const fs = require('fs');
const html = fs.readFileSync('tmp/shamcash-autofit/payout-1773258668903.html', 'utf8');

const decode = (s) => s
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&#39;/g, "'")
  .replace(/&quot;/g, '"');

const clean = (s) => decode(String(s || '')).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const btns = [];
for (const m of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)) {
  const attrs = m[1] || '';
  const text = clean(m[2]);
  const type = (/type="([^"]+)"/i.exec(attrs) || [,''])[1];
  const cls = (/class="([^"]+)"/i.exec(attrs) || [,''])[1];
  btns.push({ type, text, cls: cls.slice(0, 120) });
}

const uniq = [];
const seen = new Set();
for (const b of btns) {
  const key = `${b.type}|${b.text}|${b.cls}`;
  if (!seen.has(key)) {
    seen.add(key);
    uniq.push(b);
  }
}

console.log('BUTTONS_TOTAL', btns.length, 'UNIQ', uniq.length);
for (const b of uniq.slice(0, 200)) {
  console.log(`type=${b.type || '-'} text=${b.text || '-'} class=${b.cls || '-'}`);
}

const inputs = [];
for (const m of html.matchAll(/<input\b([^>]*)>/gi)) {
  const attrs = m[1] || '';
  const g = (k) => ((new RegExp(k + '="([^"]+)"', 'i')).exec(attrs) || [,''])[1];
  inputs.push({ type: g('type'), name: g('name'), placeholder: g('placeholder'), id: g('id'), cls: g('class').slice(0, 120) });
}
const uniqInputs = [];
const seenI = new Set();
for (const i of inputs) {
  const key = `${i.type}|${i.name}|${i.placeholder}|${i.id}|${i.cls}`;
  if (!seenI.has(key)) { seenI.add(key); uniqInputs.push(i); }
}
console.log('INPUTS_TOTAL', inputs.length, 'UNIQ', uniqInputs.length);
for (const i of uniqInputs.slice(0, 200)) {
  console.log(`type=${i.type||'-'} name=${i.name||'-'} placeholder=${i.placeholder||'-'} id=${i.id||'-'} class=${i.cls||'-'}`);
}
