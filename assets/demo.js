// Demo mode: runs the real database code inside the browser (PGlite), so the whole
// system can be tried before Supabase is connected. Data stays on this device.
import { AppError, normPhone } from './core.js';

const PGLITE = window.PITSTOP_PGLITE || 'https://cdn.jsdelivr.net/npm/@electric-sql/pglite@0.5.8/dist/index.js';
const KEY_DB = 'pitstop-demo-db', KEY_UID = 'pitstop-demo-uid';
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }, del(k) { try { localStorage.removeItem(k); } catch (e) { } } };

async function open(PGlite) {
  const ver = ls.get(KEY_DB) || '1';
  try { return await PGlite.create({ dataDir: 'idb://pitstop-demo-' + ver }); }
  catch (e) { return await PGlite.create(); }
}
async function seed(db) {
  const base = new URL('../supabase/', import.meta.url);
  for (const f of ['demo-shim.sql', 'schema.sql', 'demo-seed.sql']) {
    const r = await fetch(new URL(f, base));
    if (!r.ok) throw new AppError("Couldn't load the demo data (" + f + ').');
    await db.exec(await r.text());
  }
}
const listeners = [];

export async function createDemo() {
  let mod;
  try { mod = await import(PGLITE); } catch (e) { throw new AppError("Couldn't load the demo. Check your internet connection and reload."); }
  const db = await open(mod.PGlite);
  const ready = (await db.query("select to_regclass('public.demo_files') is not null as ok")).rows[0].ok;
  if (!ready) await seed(db);
  let uid = ls.get(KEY_UID) || null;

  async function rpc(name, p = {}) {
    if (!/^[a-z_]+$/.test(name)) throw new AppError('Unknown action.');
    try {
      return await db.transaction(async (tx) => {
        await tx.exec('set local role ' + (uid ? 'authenticated' : 'anon'));
        await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [uid || '']);
        const r = await tx.query('select public.' + name + '($1::jsonb) as r', [JSON.stringify(p)]);
        return r.rows[0].r;
      });
    } catch (e) {
      const m = (e && e.message) || String(e);
      throw new AppError(/permission denied/i.test(m) ? 'Please sign in to do that.' : m);
    }
  }
  const setUid = (v) => { uid = v; if (v) ls.set(KEY_UID, v); else ls.del(KEY_UID); listeners.forEach(cb => cb(uid)); };

  return {
    mode: 'demo',
    rpc,
    auth: {
      async uid() { return uid; },
      async signIn(phone) {
        const r = await db.query('select id from auth.users where email like $1', ['p' + normPhone(phone) + '@%']);
        if (!r.rows.length) throw new AppError('Wrong phone number or PIN.');
        setUid(r.rows[0].id); return uid;
      },
      async signUp(name, phone) {
        const email = 'p' + normPhone(phone) + '@demo';
        const ex = await db.query('select id from auth.users where email = $1', [email]);
        if (ex.rows.length) throw new AppError('That phone number has already joined. Sign in instead.');
        const r = await db.query('insert into auth.users (email, encrypted_password) values ($1, $2) returning id', [email, 'demo']);
        setUid(r.rows[0].id); return uid;
      },
      async signOut() { setUid(null); },
      onChange(cb) { listeners.push(cb); },
    },
    demo: {
      async people() {
        const r = await db.query("select id, name, role, depts, phone from public.staff where active order by case role when 'superadmin' then 0 when 'dept_admin' then 1 when 'attendant' then 2 when 'rider' then 3 when 'financier' then 4 else 5 end, name");
        return r.rows;
      },
      async signInAs(id) { setUid(id); },
      async reset() {
        const v = String((+(ls.get(KEY_DB) || 1)) + 1);
        ls.set(KEY_DB, v); ls.del(KEY_UID);
        try { indexedDB.deleteDatabase('/pglite/pitstop-demo-' + (+v - 1)); } catch (e) { }
        location.reload();
      },
    },
    async upload(blob) {
      const data = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(blob); });
      const path = 'demo/' + Date.now() + Math.random().toString(36).slice(2) + '.jpg';
      await db.query('insert into public.demo_files (path, data) values ($1, $2)', [path, data]);
      return path;
    },
    async photoUrls(paths) {
      if (!paths || !paths.length) return {};
      const r = await db.query('select path, data from public.demo_files where path = any($1)', [paths]);
      const m = {}; r.rows.forEach(x => { m[x.path] = x.data; }); return m;
    },
  };
}
