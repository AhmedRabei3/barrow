const fs = require('fs');
const p = 'tmp/shamcash-autofit/payout-1773258124006.html';
const html = fs.readFileSync(p, 'utf8');

const wanted = /wallet|amount|currency|transfer|send|receive|confirm|otp|account|recipient|dialog|modal|combobox|listbox|transaction|balance|usd|syp|محفظة|مبلغ|عملة|تحويل|إرسال|ارسال|تأكيد|رصيد|حساب|التالي/i;
const out = [];
const tagRegex = /<(button|input|textarea|select|option|div|span)[^>]*>/gi;
let m;
while ((m = tagRegex.exec(html)) !== null) {
  const tag = m[1].toLowerCase();
  const raw = m[0];
  const attr = (name) => {
    const dq = new RegExp(name + '="([^"]+)"', 'i').exec(raw);
    if (dq) return dq[1];
    const sq = new RegExp(name + "='([^']+)'", 'i').exec(raw);
    return sq ? sq[1] : '';
  };
  const fields = ['id','name','placeholder','type','role','aria-label','data-testid','class']
    .map((a)=>[a, attr(a)])
    .filter(([,v])=>v);
  if (!fields.length) continue;
  const joined = fields.map(([k,v]) => `${k}=${v}`).join(' | ');
  if (wanted.test(raw + ' ' + joined)) out.push(`${tag}: ${joined}`);
}
const uniq = [...new Set(out)];
console.log('MATCH_COUNT', uniq.length);
for (const line of uniq.slice(0, 400)) console.log(line);
