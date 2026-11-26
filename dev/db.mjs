// Test helper: runs supabase/schema.sql inside PGlite (Postgres in Node) and calls functions as different users.
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readFileSync } from 'node:fs';

const ROOT = new URL('../supabase/', import.meta.url);
const sql = f => readFileSync(new URL(f, ROOT), 'utf8');
export async function makeDb() {
  const db = await PGlite.create({ extensions: { pgcrypto } });
  await db.exec(sql('demo-shim.sql'));
  await db.exec(sql('schema.sql'));
  return db;
}
export async function rerunSchema(db) { await db.exec(sql('schema.sql')); }
export function as(db, uid) {
  return async function rpc(name, p = {}) {
    if (!/^[a-z_]+$/.test(name)) throw new Error('bad name');
    return db.transaction(async (tx) => {
      await tx.exec('set local role ' + (uid ? 'authenticated' : 'anon'));
      await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [uid || '']);
      const r = await tx.query(`select public.${name}($1::jsonb) as r`, [JSON.stringify(p)]);
      return r.rows[0].r;
    });
  };
}
export async function newUser(db, phone) {
  const r = await db.query("insert into auth.users(email, encrypted_password) values ($1, 'x') returning id", ['p' + phone + '@staff.test-pitstop.com']);
  return r.rows[0].id;
}
