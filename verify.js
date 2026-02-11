const fs = require('fs');
const path = require('path');

const base = 'http://localhost:3000';

async function main() {
  const dir = path.join(__dirname, 'public');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
  const bad = [];

  for (const f of files) {
    const raw = fs.readFileSync(path.join(dir, f), 'utf8');
    const hrefs = [...raw.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
    for (const h of hrefs) {
      if (h.startsWith('http') || h.startsWith('#')) continue;
      const u = h.startsWith('/') ? base + h : `${base}/${h}`;
      try {
        const r = await fetch(u, { redirect: 'follow' });
        if (r.status >= 400) bad.push(`${f}: ${h} -> ${r.status}`);
      } catch {
        bad.push(`${f}: ${h} -> ERR`);
      }
    }
  }

  let cookie = '';
  async function req(p, opt = {}) {
    opt.headers = opt.headers || {};
    if (cookie) opt.headers.cookie = cookie;
    const r = await fetch(base + p, opt);
    const sc = r.headers.get('set-cookie');
    if (sc) cookie = sc.split(';')[0];
    const t = await r.text();
    return { status: r.status, text: t };
  }

  const email = `satyam${Math.floor(Math.random() * 1e6)}@example.com`;
  const s1 = await req('/api/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Satyam', email, password: 'Pass@1234' })
  });
  const s2 = await req('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'Pass@1234' })
  });
  const s3 = await req('/api/auth/me');
  const s4 = await req('/api/dashboard');
  const s5 = await req('/api/subscribe', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ plan: 'pro' })
  });
  const s6 = await req('/api/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Satyam', email, message: 'Hello this is a valid message' })
  });

  console.log('LINK_ERRORS=' + bad.length);
  if (bad.length) console.log(bad.slice(0, 20).join('\n'));
  console.log('SIGNUP=' + s1.status);
  console.log('LOGIN=' + s2.status);
  console.log('ME=' + s3.status);
  console.log('DASH=' + s4.status);
  console.log('SUB=' + s5.status);
  console.log('CONTACT=' + s6.status);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
