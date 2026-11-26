-- Stand-ins for the parts of Supabase that the demo (and the test suite) don't have.
-- Not needed on a real Supabase project: do NOT run this there.
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin; exception when duplicate_object then null; end $$;
create schema if not exists auth;
create schema if not exists extensions;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  encrypted_password text,
  raw_user_meta_data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create or replace function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant usage on schema public to anon, authenticated;
grant usage on schema extensions to anon, authenticated;
do $$ begin
  create extension if not exists pgcrypto with schema extensions;
exception when others then
  create or replace function extensions.crypt(text, text) returns text language sql immutable as 'select md5($1 || $2)';
  create or replace function extensions.gen_salt(text) returns text language sql volatile as 'select md5(random()::text)';
end $$;
