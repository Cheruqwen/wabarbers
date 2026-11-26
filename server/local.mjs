// =====================================================================
//  PitStop 87 · local server for testing on your laptop
//
//  npm install        (once)
//  npm run demo       start with a sample day and demo logins
//  npm start          start with an empty business (like a fresh launch)
//  npm run reset      delete all local data
//
//  It serves the website and stands in for Supabase (sign-in, database,
//  photos) using the same database code as supabase/schema.sql.
//  Phones on the same Wi-Fi can open it too, so the team can test together.
// =====================================================================
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DATA = path.join(ROOT, 'local-data');
const args = process.argv.slice(2);
const DEMO = args.includes('--demo');
const PORT = +(args.find(a => a.startsWith('--port=')) || '').split('=')[1] || +process.env.PORT || 8080;
const LOGIN_DOMAIN = 'staff.pitstop.local-test.com';
const require = createRequire(import.meta.url);

if (args.includes('--reset')) {
  fs.rmSync(DATA, { recursive: true, force: true });
  console.log('Local data deleted. Run "npm run demo" or "npm start" to begin again.');
  process.exit(0);
}

/* ---------- database ---------- */
fs.mkdirSync(path.join(DATA, 'photos'), { recursive: true });
const sql = f => fs.readFileSync(path.join(ROOT, 'supabase', f), 'utf8');
const db = await PGlite.create({ dataDir: path.join(DATA, 'db'), extensions: { pgcrypto } });
const ready = (await db.query("select to_regclass('public.jobs') is not null as ok")).rows[0].ok;
if (!ready) {
  console.log('Setting up a new local database…');
  await db.exec(sql('demo-shim.sql'));
  await db.exec(sql('schema.sql'));
  if (DEMO) {
    await db.exec(sql('demo-seed.sql'));
    await db.query("update auth.users set email = regexp_replace(email, '@.*$', '@' || $1), encrypted_password = extensions.crypt('123456', extensions.gen_salt('bf'))", [LOGIN_DOMAIN]);
    console.log('Loaded the sample day.');
  }
} else {
  await db.exec(sql('schema.sql')); // apply any updates; keeps data
  if (DEMO) console.log('Using your existing local data. Run "npm run reset" first for a fresh sample day.');
}

/* ---------- secrets & tokens ---------- */
const secretFile = path.join(DATA, 'secret');
if (!fs.existsSync(secretFile)) fs.writeFileSync(secretFile, crypto.randomBytes(32).toString('hex'));
const SECRET = fs.readFileSync(secretFile, 'utf8').trim();
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const hmac = s => crypto.createHmac('sha256', SECRET).update(s).digest('base64url');
const now = () => Math.floor(Date.now() / 1000);
function sign(payload) { const h = b64({ alg: 'HS256', typ: 'JWT' }) + '.' + b64(payload); return h + '.' + hmac(h); }
function verify(tok) {
  try {
    const [h, p, s] = String(tok || '').split('.'); if (!s) return null;
    const exp = Buffer.from(hmac(h + '.' + p)); const got = Buffer.from(s);
    if (exp.length !== got.length || !crypto.timingSafeEqual(exp, got)) return null;
    const pl = JSON.parse(Buffer.from(p, 'base64url')); if (pl.exp && pl.exp < now()) return null; return pl;
  } catch { return null; }
}
const bearer = req => verify((req.headers.authorization || '').replace(/^Bearer /i, ''));
const userObj = (id, email, meta) => ({ id, aud: 'authenticated', role: 'authenticated', email, user_metadata: meta || {}, app_metadata: { provider: 'email' }, created_at: new Date().toISOString() });
function session(id, email, meta) {
  return {
    access_token: sign({ sub: id, email, role: 'authenticated', aud: 'authenticated', exp: now() + 3600 }), token_type: 'bearer',
    expires_in: 3600, expires_at: now() + 3600,
    refresh_token: sign({ sub: id, email, typ: 'refresh', exp: now() + 30 * 864e2, n: crypto.randomBytes(6).toString('hex') }),
    user: userObj(id, email, meta)
  };
}
async function isStaff(id) { const r = await db.query("select exists (select 1 from public.staff where id = $1 and active and role <> 'pending') as ok", [id]); return r.rows[0].ok; }

/* ---------- http helpers ---------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.sql': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon' };
const send = (res, code, body, type, extra) => { res.writeHead(code, Object.assign({ 'Content-Type': type || 'application/json', 'Cache-Control': 'no-store' }, extra || {})); res.end(body === undefined ? '' : (typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body))); };
const readBody = (req, limit) => new Promise((ok, bad) => { const c = []; let n = 0; req.on('data', d => { n += d.length; if (n > limit) { bad(new Error('too_large')); req.destroy(); } else c.push(d); }); req.on('end', () => ok(Buffer.concat(c))); req.on('error', bad); });
function fileFromMultipart(buf, ctype) {
  const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(ctype || ''); if (!m) return null;
  const b = Buffer.from('--' + (m[1] || m[2]));
  let start = buf.indexOf(b);
  while (start !== -1) {
    const next = buf.indexOf(b, start + b.length); if (next === -1) break;
    const part = buf.subarray(start + b.length + 2, next - 2);
    const he = part.indexOf('\r\n\r\n');
    if (he !== -1) {
      const head = part.subarray(0, he).toString();
      if (/filename=/i.test(head)) return { data: part.subarray(he + 4), type: (/content-type:\s*([^\r\n]+)/i.exec(head) || [])[1] || 'image/jpeg' };
    }
    start = next;
  }
  return null;
}
const safePath = p => { const s = decodeURIComponent(p); return /^[A-Za-z0-9/_.-]+$/.test(s) && !s.split('/').includes('..') ? s : null; };
const CONFIG = `window.PITSTOP_CONFIG = { supabaseUrl: location.origin, supabaseAnonKey: 'local', loginDomain: '${LOGIN_DOMAIN}', siteUrl: '', supabaseJs: '/vendor/supabase.js', local: true };`;
const SUPABASE_JS = (() => { try { return require.resolve('@supabase/supabase-js/dist/umd/supabase.js'); } catch { return path.join(ROOT, 'node_modules', '@supabase', 'supabase-js', 'dist', 'umd', 'supabase.js'); } })();
const PUBLIC_DIRS = ['assets', 'staff', 'supabase'];

/* ---------- server ---------- */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://local');
  const p = url.pathname;
  try {
    if (p === '/config.js') return send(res, 200, CONFIG, MIME['.js']);
    if (p === '/vendor/supabase.js') return send(res, 200, fs.readFileSync(SUPABASE_JS), MIME['.js'], { 'Cache-Control': 'max-age=86400' });

    // ---- sign-in (stands in for Supabase Auth)
    if (p.startsWith('/auth/v1/')) {
      const body = JSON.parse((await readBody(req, 1e5)).toString() || '{}');
      if (p === '/auth/v1/signup') {
        const ex = await db.query('select id from auth.users where email = $1', [body.email]);
        if (ex.rows.length) return send(res, 422, { code: 422, error_code: 'user_already_exists', msg: 'User already registered' });
        if (!body.password || String(body.password).length < 6) return send(res, 422, { code: 422, error_code: 'weak_password', msg: 'Password should be at least 6 characters.' });
        const r = await db.query("insert into auth.users (email, encrypted_password, raw_user_meta_data) values ($1, extensions.crypt($2, extensions.gen_salt('bf')), $3) returning id", [body.email, body.password, JSON.stringify(body.data || {})]);
        return send(res, 200, session(r.rows[0].id, body.email, body.data));
      }
      if (p === '/auth/v1/token') {
        if (url.searchParams.get('grant_type') === 'refresh_token') {
          const t = verify(body.refresh_token);
          if (!t || t.typ !== 'refresh') return send(res, 400, { code: 400, error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token: Refresh Token Not Found' });
          return send(res, 200, session(t.sub, t.email));
        }
        const r = await db.query('select id, raw_user_meta_data as m from auth.users where email = $1 and encrypted_password = extensions.crypt($2, encrypted_password)', [body.email, body.password || '']);
        if (!r.rows.length) return send(res, 400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
        return send(res, 200, session(r.rows[0].id, body.email, r.rows[0].m));
      }
      if (p === '/auth/v1/user') { const t = bearer(req); if (!t) return send(res, 401, { code: 401, msg: 'invalid JWT' }); return send(res, 200, userObj(t.sub, t.email)); }
      if (p === '/auth/v1/logout') return send(res, 204);
      return send(res, 404, { msg: 'Not found' });
    }

    // ---- database functions (stands in for Supabase's API)
    let m;
    if ((m = p.match(/^\/rest\/v1\/rpc\/([a-z_]+)$/)) && req.method === 'POST') {
      const body = JSON.parse((await readBody(req, 2e6)).toString() || '{}');
      const t = bearer(req); const uid = t ? t.sub : '';
      try {
        const out = await db.transaction(async tx => {
          await tx.exec('set local role ' + (uid ? 'authenticated' : 'anon'));
          await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [uid]);
          const r = await tx.query('select public.' + m[1] + '($1::jsonb) as r', [JSON.stringify(body.p || {})]);
          return r.rows[0].r;
        });
        return send(res, 200, JSON.stringify(out));
      } catch (e) {
        if (/function .* does not exist/.test(e.message)) return send(res, 404, { code: 'PGRST202', message: 'Could not find the function public.' + m[1] + '(p) in the schema cache', details: null, hint: null });
        return send(res, /permission denied/.test(e.message) ? 401 : 400, { code: e.code || 'P0001', message: e.message, details: null, hint: null });
      }
    }

    // ---- photos (stands in for Supabase Storage)
    if ((m = p.match(/^\/storage\/v1\/object\/photos\/(.+)$/)) && req.method === 'POST') {
      const t = bearer(req); if (!t || !(await isStaff(t.sub))) return send(res, 403, { statusCode: '403', error: 'Unauthorized', message: 'Only signed-in staff can upload photos.' });
      const rel = safePath(m[1]); if (!rel) return send(res, 400, { statusCode: '400', error: 'Bad path', message: 'Bad file name.' });
      const raw = await readBody(req, 15e6);
      const f = fileFromMultipart(raw, req.headers['content-type']) || { data: raw };
      const dest = path.join(DATA, 'photos', rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, f.data);
      return send(res, 200, { Key: 'photos/' + rel, Id: crypto.randomUUID() });
    }
    if (p === '/storage/v1/object/sign/photos' && req.method === 'POST') {
      const t = bearer(req); if (!t || !(await isStaff(t.sub))) return send(res, 403, { statusCode: '403', error: 'Unauthorized', message: 'Only signed-in staff can view photos.' });
      const body = JSON.parse((await readBody(req, 1e5)).toString() || '{}');
      const exp = now() + (+body.expiresIn || 3600);
      return send(res, 200, (body.paths || []).map(x => { const rel = safePath(x); return rel ? { error: null, path: x, signedURL: '/object/sign/photos/' + rel + '?exp=' + exp + '&token=' + hmac('photo:' + rel + ':' + exp) } : { error: 'Bad path', path: x, signedURL: null }; }));
    }
    if ((m = p.match(/^\/storage\/v1\/object\/sign\/photos\/(.+)$/))) {
      const rel = safePath(m[1]); const exp = +url.searchParams.get('exp');
      if (!rel || exp < now() || url.searchParams.get('token') !== hmac('photo:' + rel + ':' + exp)) return send(res, 403, { message: 'Link expired' });
      const file = path.join(DATA, 'photos', rel); if (!fs.existsSync(file)) return send(res, 404, { message: 'Not found' });
      return send(res, 200, fs.readFileSync(file), 'image/jpeg', { 'Cache-Control': 'private, max-age=3600' });
    }

    // ---- the website
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { message: 'Method not allowed' });
    if (p === '/staff') return send(res, 301, '', 'text/plain', { Location: '/staff/' + url.search });
    let rel = p === '/' ? 'index.html' : p.endsWith('/') ? p.slice(1) + 'index.html' : p.slice(1);
    rel = safePath(rel);
    const top = rel && rel.split('/')[0];
    if (!rel || (rel.includes('/') && !PUBLIC_DIRS.includes(top)) || (!rel.includes('/') && !['index.html', 'favicon.ico'].includes(rel))) return send(res, 404, 'Not found', 'text/plain');
    const file = path.join(ROOT, rel);
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return send(res, 404, 'Not found', 'text/plain');
    return send(res, 200, fs.readFileSync(file), MIME[path.extname(file)] || 'application/octet-stream');
  } catch (e) {
    console.error(e);
    return send(res, e.message === 'too_large' ? 413 : 500, { message: e.message === 'too_large' ? 'That file is too big.' : 'Something went wrong on the local server.' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  const lan = Object.values(os.networkInterfaces()).flat().filter(i => i && i.family === 'IPv4' && !i.internal).map(i => i.address);
  console.log('\n  PitStop 87 is running.\n');
  console.log('  On this laptop:   http://localhost:' + PORT + '          staff app: http://localhost:' + PORT + '/staff/');
  lan.forEach(ip => console.log('  On your Wi-Fi:    http://' + ip + ':' + PORT + '     staff app: http://' + ip + ':' + PORT + '/staff/'));
  if (DEMO) {
    console.log('\n  Demo sign-ins (PIN 123456 for everyone):');
    console.log('    0700 000 001 Owner       0700 000 002 Kamau (car wash, carpets, car service manager)');
    console.log('    0700 000 003 Baraka (barber)   0700 000 004 Naliaka (nails)   0700 000 005 Otieno (washer)');
    console.log('    0700 000 006 Juma (rider)      0700 000 007 Investor (reports only)');
  } else if (!ready) {
    console.log('\n  First time: open the staff app and tap "Join the team". The first person to join becomes the owner.');
  }
  console.log('\n  Data is saved in the local-data folder. Press Ctrl+C to stop.\n');
});
server.on('error', e => { if (e.code === 'EADDRINUSE') { console.error('\n  Port ' + PORT + ' is busy. Try: npm start -- --port=8081\n'); process.exit(1); } throw e; });
