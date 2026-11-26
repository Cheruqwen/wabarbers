-- =====================================================================
--  PITIA PITSTOP · database
--  Paste this whole file into Supabase → SQL Editor → New query → Run.
--  Safe to run again after an update: it keeps all your data.
--
--  How it is locked down:
--  · Browsers can't read or write any table directly.
--  · Every action goes through a function below, and each function checks
--    who is signed in and what their role allows before doing anything.
-- =====================================================================

do $$ begin
  create extension if not exists pgcrypto with schema extensions;
exception when others then null;
end $$;

-- ---------------------------------------------------------------------
--  TABLES
-- ---------------------------------------------------------------------
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  business text not null default 'PitStop 87',
  tagline text not null default 'Car wash, carpets, car service, kinyozi and nails. We pick up and drop off.',
  whatsapp text not null default '',
  mpesa text not null default '',
  depts jsonb not null default '[]',
  zones jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id text primary key,
  dept text not null,
  name text not null,
  price int not null default 0,
  kind text,
  active boolean not null default true,
  sort int not null default 0
);
-- 'sqft': priced per square foot; a line's qty is the total area and 'sizes' lists each piece (e.g. "5×7, 8×10")
alter table public.services add column if not exists unit text;

create table if not exists public.plans (
  id text primary key,
  name text not null,
  dept text not null,
  price int not null default 0,
  days int not null default 30,
  allowance int not null default 4,
  service_ids text[] not null default '{}',
  free_pickup boolean not null default false,
  perks text not null default '',
  active boolean not null default true,
  sort int not null default 0
);

create table if not exists public.staff (
  id uuid primary key,
  name text not null,
  phone text not null default '',
  role text not null default 'pending'
    check (role in ('pending','superadmin','dept_admin','attendant','rider','financier')),
  depts text[] not null default '{}',
  commission numeric not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  phone text unique,
  area text not null default '',
  landmark text not null default '',
  maps text not null default '',
  notes text not null default '',
  token text unique not null default replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now(),
  last_visit date
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  kind text not null default 'vehicle',
  label text not null,
  details text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists items_customer on public.items(customer_id);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  plan_id text references public.plans(id) on delete set null,
  plan_name text not null,
  dept text not null,
  allowance int not null,
  service_ids text[] not null default '{}',
  free_pickup boolean not null default false,
  starts date not null,
  ends date not null,
  price int not null default 0,
  sold_day date not null,
  cancelled boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid
);
create index if not exists memberships_customer on public.memberships(customer_id);

create table if not exists public.jobs (
  id text primary key,
  group_id text not null,
  customer_id uuid not null references public.customers(id),
  dept text not null,
  flow text not null,
  status text not null,
  day date not null,
  slot time not null,
  drop_slot time,
  lines jsonb not null default '[]',
  item_ids uuid[] not null default '{}',
  tags jsonb not null default '[]',
  subtotal int not null default 0,
  valet_fee int not null default 0,
  discount int not null default 0,
  total int not null default 0,
  paid int not null default 0,
  area text not null default '',
  landmark text not null default '',
  maps text not null default '',
  staff_id uuid references public.staff(id) on delete set null,
  valet_id uuid references public.staff(id) on delete set null,
  source text not null default '',
  notes text not null default '',
  confirmed boolean not null default true,
  checkin jsonb,
  photos text[] not null default '{}',
  history jsonb not null default '[]',
  track_token text unique not null default replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now()
);
create index if not exists jobs_day on public.jobs(day);
create index if not exists jobs_customer on public.jobs(customer_id);
create index if not exists jobs_group on public.jobs(group_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  job_id text references public.jobs(id) on delete cascade,
  membership_id uuid references public.memberships(id) on delete cascade,
  customer_id uuid,
  method text not null,
  amount int not null,
  ref text not null default '',
  day date not null,
  at timestamptz not null default now(),
  by_id uuid
);
create index if not exists payments_day on public.payments(day);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  cat text not null,
  dept text,
  amount int not null,
  note text not null default '',
  at timestamptz not null default now(),
  by_id uuid
);
create index if not exists expenses_day on public.expenses(day);

create sequence if not exists public.tag_seq;

-- Nobody reaches the tables from a browser. Functions below do the work.
alter table public.settings enable row level security;
alter table public.services enable row level security;
alter table public.plans enable row level security;
alter table public.staff enable row level security;
alter table public.customers enable row level security;
alter table public.items enable row level security;
alter table public.memberships enable row level security;
alter table public.jobs enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- ---------------------------------------------------------------------
--  STARTER DATA (only added when the tables are empty)
-- ---------------------------------------------------------------------
insert into public.settings (id, depts, zones) values (1,
  '[{"key":"wash","code":"WSH","name":"Car wash","on":true},
    {"key":"carpet","code":"CPT","name":"Carpets","on":true},
    {"key":"garage","code":"SRV","name":"Car service","on":true},
    {"key":"kinyozi","code":"KNY","name":"Kinyozi","on":true},
    {"key":"nails","code":"NLS","name":"Nails","on":true},
    {"key":"gas","code":"GAS","name":"Gas","on":false},
    {"key":"water","code":"H2O","name":"Water","on":false},
    {"key":"laundry","code":"LDY","name":"Laundry","on":false}]',
  '[{"name":"Uthiru","fee":0},{"name":"Kinoo","fee":0},{"name":"Regen","fee":0},{"name":"Muthiga","fee":0},
    {"name":"Kabete","fee":0},{"name":"Kangemi","fee":0},{"name":"Gitaru","fee":0}]')
on conflict (id) do nothing;
-- the business was renamed PitStop 87; only replaces the old default, never a name you typed yourself
update public.settings set business = 'PitStop 87' where business = 'Pitia Pitstop';

do $$ begin
  if not exists (select 1 from public.services) then
    insert into public.services (id, dept, name, price, kind, sort) values
      -- "Group · item": the booking page shows each group under its own heading
      ('w3','wash','Full wash · Small car',200,'vehicle',1),
      ('w1','wash','Full wash · Normal car',250,'vehicle',2),
      ('w4','wash','Full wash · Land Cruiser',400,'vehicle',3),
      ('w2','wash','Half wash · Exterior only',150,'vehicle',4),
      ('w9','wash','Half wash · Interior only',150,'vehicle',5),
      ('w8','wash','Boda boda · Full wash',100,'vehicle',6),
      ('w10','wash','Boda boda · Water splash',50,'vehicle',7),
      ('w5','wash','Add-on · Engine wash',500,'vehicle',8),
      ('w6','wash','Add-on · Seat shampoo',2500,'vehicle',9),
      ('w7','wash','Add-on · Wax & polish',1500,'vehicle',10),
      -- carpets are KSh 15 per square foot (c6); the old fixed sizes stay switched off below
      ('c6','carpet','Carpet · Per square foot',15,'carpet',1),
      ('c1','carpet','Carpet · Small (up to 5×7)',525,'carpet',2),
      ('c2','carpet','Carpet · Medium (6×9)',810,'carpet',3),
      ('c3','carpet','Carpet · Large (8×10 and up)',1200,'carpet',4),
      ('g1','garage','Garage run · we take it in and back',500,'vehicle',1),
      ('g2','garage','Minor service · parts extra',0,'vehicle',2),
      ('g3','garage','Diagnostics',0,'vehicle',3),
      ('k1','kinyozi','Haircut · Simple cut',150,null,1),
      ('k6','kinyozi','Haircut · Fade',200,null,2),
      ('k7','kinyozi','Haircut · Executive',400,null,3),
      ('k2','kinyozi','Haircut + beard',450,null,4),
      ('k4','kinyozi','Shave',200,null,5),
      ('k3','kinyozi','Kids'' cut',100,null,6),
      ('k5','kinyozi','Hair dye',200,null,7),
      ('n1','nails','Manicure',600,null,1),
      ('n2','nails','Pedicure',900,null,2),
      ('n3','nails','Gel polish · hands',1000,null,3),
      ('n4','nails','Mani + pedi',1400,null,4),
      ('n5','nails','Acrylic set',2000,null,5),
      ('ga1','gas','Gas refill · 6 kg',1300,'cylinder',1),
      ('ga2','gas','Gas refill · 13 kg',3000,'cylinder',2),
      ('wa1','water','Water refill · 20 L',150,null,1),
      ('l1','laundry','Laundry · per kg',200,'bag',1),
      ('l2','laundry','Duvet',600,'bag',2);
    -- coming soon: kept switched off until sofa and mattress cleaning starts (tick "On" in Prices & settings)
    insert into public.services (id, dept, name, price, kind, active, sort) values
      ('c4','carpet','Sofa · per seat',400,'sofa',false,4),
      ('c5','carpet','Mattress',1000,'mattress',false,5);
    update public.services set unit = 'sqft' where id = 'c6';
    update public.services set active = false where id in ('c1','c2','c3');
  end if;
  if not exists (select 1 from public.plans) then
    insert into public.plans (id, name, dept, price, days, allowance, service_ids, free_pickup, perks, sort) values
      ('p1','Wash Club · Small car','wash',700,30,4,'{w3}',true,'4 full washes a month (save 100). Free pickup and drop-off.',1),
      ('p4','Wash Club · Normal car','wash',900,30,4,'{w1}',true,'4 full washes a month (save 100). Free pickup and drop-off.',2),
      ('p2','Wash Club · Land Cruiser','wash',1400,30,4,'{w4}',true,'4 full washes a month (save 200). Free pickup and drop-off.',3),
      ('p5','Boda Club','wash',350,30,4,'{w8}',false,'4 boda boda washes a month (save 50).',4),
      ('p3','Kinyozi Club · Simple cut','kinyozi',500,30,4,'{k1}',false,'4 simple cuts a month (save 100), any barber.',5),
      ('p6','Kinyozi Club · Fade','kinyozi',700,30,4,'{k6}',false,'4 fades a month (save 100), any barber.',6),
      ('p7','Kinyozi Club · Executive','kinyozi',1400,30,4,'{k7}',false,'4 executive cuts a month (save 200), any barber.',7);
  end if;
end $$;

-- 2026-11 price list: move a business still on the original example menu to the new one.
-- Only runs while the first example service is untouched, so prices the owner set are never overwritten.
do $$ begin
  if exists (select 1 from public.services where id = 'w1' and name = 'Exterior wash · Saloon' and price = 300) then
    insert into public.services (id, dept, name, price, kind, active, sort) values
      ('w3','wash','Full wash · Small car',200,'vehicle',true,1),
      ('w1','wash','Full wash · Normal car',250,'vehicle',true,2),
      ('w4','wash','Full wash · Land Cruiser',400,'vehicle',true,3),
      ('w2','wash','Half wash · Exterior only',150,'vehicle',true,4),
      ('w9','wash','Half wash · Interior only',150,'vehicle',true,5),
      ('w8','wash','Boda boda · Full wash',100,'vehicle',true,6),
      ('w10','wash','Boda boda · Water splash',50,'vehicle',true,7),
      ('w5','wash','Add-on · Engine wash',500,'vehicle',true,8),
      ('w6','wash','Add-on · Seat shampoo',2500,'vehicle',true,9),
      ('w7','wash','Add-on · Wax & polish',1500,'vehicle',true,10),
      ('k4','kinyozi','Shave',200,null,true,3),
      ('k3','kinyozi','Kids'' cut',100,null,true,4),
      ('k5','kinyozi','Hair dye',300,null,true,5)
    on conflict (id) do update set dept = excluded.dept, name = excluded.name, price = excluded.price,
      kind = excluded.kind, active = excluded.active, sort = excluded.sort;
    insert into public.plans (id, name, dept, price, days, allowance, service_ids, free_pickup, perks, active, sort) values
      ('p1','Wash Club · Small car','wash',700,30,4,'{w3}',true,'4 full washes a month (save 100). Free pickup and drop-off.',true,1),
      ('p4','Wash Club · Normal car','wash',900,30,4,'{w1}',true,'4 full washes a month (save 100). Free pickup and drop-off.',true,2),
      ('p2','Wash Club · Land Cruiser','wash',1400,30,4,'{w4}',true,'4 full washes a month (save 200). Free pickup and drop-off.',true,3),
      ('p5','Boda Club','wash',350,30,4,'{w8}',false,'4 boda boda washes a month (save 50).',true,4)
    on conflict (id) do update set name = excluded.name, dept = excluded.dept, price = excluded.price, days = excluded.days,
      allowance = excluded.allowance, service_ids = excluded.service_ids, free_pickup = excluded.free_pickup,
      perks = excluded.perks, active = excluded.active, sort = excluded.sort;
    update public.plans set sort = 5 where id = 'p3';
  end if;
end $$;

-- 2026-11: sofa and mattress cleaning are "coming soon"; the department is just carpets for now.
-- Switched off (not deleted) so they can be turned back on and past bookings keep their history;
-- only touches the original example services and the original department names.
update public.services set active = false where id = 'c4' and name = 'Sofa · per seat' and active;
update public.services set active = false where id = 'c5' and name = 'Mattress' and active;
update public.settings set depts = (
    select jsonb_agg(case when d->>'key' = 'carpet' and d->>'name' in ('Carpets & sofas', 'Carpets & mattresses')
                          then jsonb_set(d, '{name}', '"Carpets"') else d end order by n)
    from jsonb_array_elements(depts) with ordinality as t(d, n))
  where depts @> '[{"key":"carpet","name":"Carpets & sofas"}]'
     or depts @> '[{"key":"carpet","name":"Carpets & mattresses"}]';

-- 2026-11 kinyozi prices: simple cut 150, fade 200, executive 400, hair dye 200.
-- Only runs while the original example haircut / hair dye are untouched, so prices the owner set are never overwritten.
do $$ begin
  if exists (select 1 from public.services where id = 'k1' and name = 'Haircut' and price = 350) then
    update public.services set name = 'Haircut · Simple cut', price = 150, sort = 1 where id = 'k1';
    insert into public.services (id, dept, name, price, kind, active, sort) values
      ('k6','kinyozi','Haircut · Fade',200,null,true,2),
      ('k7','kinyozi','Haircut · Executive',400,null,true,3)
    on conflict (id) do nothing;
    update public.services set sort = 4 where id = 'k2';
    update public.services set sort = 5 where id = 'k4';
    update public.services set sort = 6 where id = 'k3';
    update public.services set sort = 7 where id = 'k5';
  end if;
  update public.services set price = 200 where id = 'k5' and name = 'Hair dye' and price = 300;
end $$;

-- 2026-11 carpets: KSh 15 per square foot. Adds the per-sq-ft service and switches off the old fixed sizes
-- (kept so past bookings keep their history). Only runs while the original example sizes are still on.
do $$ begin
  if exists (select 1 from public.services where id = 'c1' and name = 'Carpet · Small (up to 5×7)' and active) then
    insert into public.services (id, dept, name, price, kind, active, sort, unit) values
      ('c6','carpet','Carpet · Per square foot',15,'carpet',true,1,'sqft')
    on conflict (id) do update set unit = 'sqft', active = true;
    update public.services set active = false, sort = sort + 1 where id in ('c1','c2','c3');
  end if;
end $$;

-- 2026-11 kinyozi plans follow the new cut prices: one club per cut, 4 a month, about 12% off
-- (the same saving as the Wash Club). Only replaces the original example plan; members keep what they paid for.
do $$ begin
  if exists (select 1 from public.plans where id = 'p3' and name = 'Kinyozi Monthly' and price = 1200) then
    update public.plans set name = 'Kinyozi Club · Simple cut', price = 500, service_ids = '{k1}',
      perks = '4 simple cuts a month (save 100), any barber.', sort = 5 where id = 'p3';
    insert into public.plans (id, name, dept, price, days, allowance, service_ids, free_pickup, perks, active, sort) values
      ('p6','Kinyozi Club · Fade','kinyozi',700,30,4,'{k6}',false,'4 fades a month (save 100), any barber.',true,6),
      ('p7','Kinyozi Club · Executive','kinyozi',1400,30,4,'{k7}',false,'4 executive cuts a month (save 200), any barber.',true,7)
    on conflict (id) do nothing;
  end if;
end $$;

-- ---------------------------------------------------------------------
--  HELPERS (internal)
-- ---------------------------------------------------------------------
create or replace function public._today() returns date
language sql stable as $$ select (now() at time zone 'Africa/Nairobi')::date $$;

create or replace function public._token() returns text
language sql volatile as $$ select replace(gen_random_uuid()::text, '-', '') $$;

create or replace function public._phone(t text) returns text
language sql immutable as $$
  select case
    when d = '' then null
    when d like '254%' then d
    when d like '0%' then '254' || substr(d, 2)
    when length(d) = 9 then '254' || d
    else d end
  from (select regexp_replace(coalesce(t, ''), '\D', '', 'g') as d) x
$$;

create or replace function public._steps(flow text) returns text[]
language sql immutable as $$
  select case flow
    when 'valet'    then array['booked','enroute','collected','service','ready','returning','done']
    when 'walkin'   then array['waiting','service','ready','done']
    when 'chair'    then array['booked','arrived','service','done']
    when 'home'     then array['booked','enroute','service','done']
    when 'delivery' then array['booked','returning','done']
    else array['waiting','done'] end
$$;

create or replace function public._dept_flows(d text) returns text[]
language sql immutable as $$
  select case d
    when 'wash'    then array['walkin','valet']
    when 'carpet'  then array['valet','walkin']
    when 'garage'  then array['valet','walkin']
    when 'kinyozi' then array['chair','home']
    when 'nails'   then array['chair','home']
    when 'gas'     then array['delivery','walkin']
    when 'water'   then array['delivery','walkin']
    when 'laundry' then array['valet','walkin']
    else array['walkin'] end
$$;

create or replace function public._dept_on(d text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.settings s, jsonb_array_elements(s.depts) x
                 where x->>'key' = d and coalesce((x->>'on')::boolean, false))
$$;

create or replace function public._code() returns text
language plpgsql volatile as $$
declare a text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; c text;
begin
  loop
    c := 'PS-';
    for i in 1..5 loop c := c || substr(a, 1 + floor(random() * length(a))::int, 1); end loop;
    exit when not exists (select 1 from public.jobs where id = c);
  end loop;
  return c;
end $$;

-- Who is signed in, and are they allowed? Raises a plain-English error if not.
create or replace function public._need(roles text[] default null) returns public.staff
language plpgsql stable security definer set search_path = public as $$
declare s public.staff;
begin
  if auth.uid() is null then raise exception 'Please sign in again.'; end if;
  select * into s from public.staff where id = auth.uid();
  if s.id is null then raise exception 'Finish joining the team first.'; end if;
  if not s.active then raise exception 'Your account is switched off. Ask the owner to turn it back on.'; end if;
  if s.role = 'pending' then raise exception 'Your account is waiting for the owner to approve it.'; end if;
  if roles is not null and not (s.role = any(roles)) then raise exception 'Your role doesn''t have access to this.'; end if;
  return s;
end $$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff where id = auth.uid() and active and role <> 'pending')
$$;

-- Which jobs each role can see
create or replace function public._sees(s public.staff, j public.jobs) returns boolean
language sql immutable as $$
  select coalesce(case s.role
    when 'superadmin' then true
    when 'dept_admin' then j.dept = any(s.depts)
    when 'attendant'  then coalesce(j.staff_id = s.id, false) or coalesce(j.valet_id = s.id, false)
                           or (j.staff_id is null and j.dept = any(s.depts))
    when 'rider'      then coalesce(j.valet_id = s.id, false)
                           or (j.valet_id is null and j.flow in ('valet','delivery')
                               and (cardinality(s.depts) = 0 or j.dept = any(s.depts)))
    else false end, false)
$$;

create or replace function public._manages(s public.staff, d text) returns boolean
language sql immutable as $$
  select coalesce(s.role = 'superadmin' or (s.role = 'dept_admin' and d = any(s.depts)), false)
$$;

create or replace function public._can_edit(s public.staff, j public.jobs) returns boolean
language sql immutable as $$
  select coalesce(public._manages(s, j.dept)
      or (s.role = 'attendant' and j.dept = any(s.depts) and (j.staff_id is null or j.staff_id = s.id)
          and j.status not in ('done','cancelled')), false)
$$;

create or replace function public._biz() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('business', business, 'tagline', tagline, 'whatsapp', whatsapp, 'mpesa', mpesa)
  from public.settings where id = 1
$$;

create or replace function public._settings(all_rows boolean) returns jsonb
language sql stable security definer set search_path = public as $$
  select public._biz() || jsonb_build_object(
    'depts', st.depts,
    'zones', st.zones,
    'services', coalesce((select jsonb_agg(to_jsonb(v) order by v.dept, v.sort, v.name) from public.services v
                          where all_rows or (v.active and public._dept_on(v.dept))), '[]'::jsonb),
    'plans', coalesce((select jsonb_agg(to_jsonb(p) order by p.sort, p.name) from public.plans p
                       where all_rows or (p.active and public._dept_on(p.dept))), '[]'::jsonb))
  from public.settings st where st.id = 1
$$;

create or replace function public._m_used(mid uuid, excl text default null) returns int
language sql stable security definer set search_path = public as $$
  select coalesce(sum((l->>'qty')::int), 0)::int
  from public.jobs j, jsonb_array_elements(j.lines) l
  where j.status <> 'cancelled' and (excl is null or j.id <> excl) and l->>'member_id' = mid::text
$$;

create or replace function public._memberships(cid uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', m.id, 'plan_id', m.plan_id, 'plan_name', m.plan_name, 'dept', m.dept,
      'allowance', m.allowance, 'used', public._m_used(m.id),
      'remaining', greatest(m.allowance - public._m_used(m.id), 0),
      'service_ids', m.service_ids, 'free_pickup', m.free_pickup,
      'starts', m.starts, 'ends', m.ends, 'price', m.price, 'cancelled', m.cancelled,
      'active', (not m.cancelled and public._today() between m.starts and m.ends))
    order by m.ends desc), '[]'::jsonb)
  from public.memberships m where m.customer_id = cid
$$;

create or replace function public._plate(t text) returns text
language sql immutable as $$
  select regexp_replace(upper(regexp_replace(coalesce(t, ''), '[^A-Za-z0-9]', '', 'g')),
                        '^([A-Z]{2,4})([0-9]{1,4}[A-Z]?)$', '\1 \2')
$$;

create or replace function public._vehicle(cid uuid, plate text, make text, colour text) returns uuid
language plpgsql security definer set search_path = public as $$
declare pl text := public._plate(plate); vid uuid; det text;
begin
  if pl = '' then return null; end if;
  det := left(trim(concat_ws(' · ', nullif(trim(make), ''), nullif(trim(colour), ''))), 120);
  select i.id into vid from public.items i
    where i.customer_id = cid and i.kind = 'vehicle' and replace(i.label, ' ', '') = replace(pl, ' ', '');
  if vid is null then
    insert into public.items (customer_id, kind, label, details) values (cid, 'vehicle', pl, det) returning id into vid;
  elsif det <> '' then
    update public.items set details = det where id = vid;
  end if;
  return vid;
end $$;

-- Price a job's lines from the price list. Applies a membership when one covers the service.
create or replace function public._price_lines(cid uuid, dpt text, d date, lines jsonb, s public.staff,
                                               allow_member boolean, excl text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  l jsonb; v public.services; q int; pr int; acc jsonb := '[]'::jsonb; m record;
  used jsonb := '{}'::jsonb; mid uuid; rem int;
  is_staff boolean := s.id is not null;
  admin boolean := s.id is not null and s.role in ('superadmin','dept_admin');
begin
  if jsonb_typeof(lines) is distinct from 'array' or jsonb_array_length(lines) = 0 then
    raise exception 'Add at least one service.'; end if;
  if jsonb_array_length(lines) > 20 then raise exception 'That''s too many services for one booking.'; end if;
  for l in select value from jsonb_array_elements(lines) loop
    select * into v from public.services where id = l->>'sid';
    if v.id is null or v.dept <> dpt then raise exception 'One of the services isn''t available. Refresh and try again.'; end if;
    if not v.active and not is_staff then raise exception '% isn''t available right now.', v.name; end if;
    -- per-sq-ft lines carry the total area as qty
    q := least(greatest(coalesce((l->>'qty')::int, 1), 1), case when v.unit = 'sqft' then 5000 else 50 end);
    pr := v.price;
    if is_staff and l ? 'price' and (admin or v.price = 0) then
      pr := greatest(coalesce((l->>'price')::int, v.price), 0);
    end if;
    mid := null;
    if allow_member and coalesce((l->>'use_member')::boolean, true) then
      for m in select * from public.memberships
               where customer_id = cid and not cancelled and d between starts and ends and v.id = any(service_ids)
               order by ends loop
        rem := m.allowance - public._m_used(m.id, excl) - coalesce((used->>(m.id::text))::int, 0);
        if rem >= q then
          mid := m.id;
          used := used || jsonb_build_object(m.id::text, coalesce((used->>(m.id::text))::int, 0) + q);
          exit;
        end if;
      end loop;
    end if;
    acc := acc || jsonb_build_array(jsonb_build_object(
      'sid', v.id, 'name', v.name, 'dept', v.dept, 'kind', v.kind, 'qty', q,
      'list_price', v.price, 'price', case when mid is null then pr else 0 end, 'member_id', mid)
      || case when v.unit = 'sqft' then jsonb_build_object('unit', 'sqft', 'sizes', left(trim(coalesce(l->>'sizes', '')), 200))
              else '{}'::jsonb end);
  end loop;
  return acc;
end $$;

create or replace function public._zone_fee(area text) returns int
language sql stable security definer set search_path = public as $$
  select coalesce((select (z->>'fee')::int from public.settings st, jsonb_array_elements(st.zones) z
                   where z->>'name' = area limit 1), 0)
$$;

create or replace function public._free_trip(cid uuid, dpt text, d date) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.memberships m where m.customer_id = cid and not m.cancelled
                 and m.free_pickup and m.dept = dpt and d between m.starts and m.ends)
$$;

-- Create the jobs for one booking (one job per department)
create or replace function public._book(cid uuid, p jsonb, src text, s public.staff, allow_member boolean)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  d date; sl time; dsl time; g jsonb; dpt text; fl text; lns jsonb; sub int; fee int; disc int;
  trip_done boolean := false; vid uuid; gid text := public._token(); jid text; tok text; first_tok text;
  res jsonb := '[]'::jsonb; is_staff boolean := s.id is not null; st_id uuid; va_id uuid; itm uuid[];
  ar text := left(trim(coalesce(p->>'area', '')), 60);
  lm text := left(trim(coalesce(p->>'landmark', '')), 240);
  mp text := left(trim(coalesce(p->>'maps', '')), 400);
  st0 text;
begin
  begin
    d := (p->>'day')::date; sl := (p->>'slot')::time; dsl := nullif(p->>'drop_slot', '')::time;
  exception when others then raise exception 'Check the date and time.';
  end;
  if d is null or sl is null then raise exception 'Choose a date and time.'; end if;
  if not is_staff and d < public._today() then raise exception 'That date has passed. Pick today or later.'; end if;
  if d > public._today() + 90 then raise exception 'You can book up to 90 days ahead.'; end if;
  if jsonb_typeof(p->'groups') is distinct from 'array' or jsonb_array_length(p->'groups') = 0 then
    raise exception 'Add at least one service.'; end if;
  if jsonb_array_length(p->'groups') > 8 then raise exception 'Too many services in one booking.'; end if;
  if coalesce(trim(p->>'plate'), '') <> '' then vid := public._vehicle(cid, p->>'plate', p->>'make', p->>'colour'); end if;

  for g in select value from jsonb_array_elements(p->'groups') loop
    dpt := g->>'dept';
    if dpt is null or not (dpt = any(array['wash','carpet','garage','kinyozi','nails','gas','water','laundry'])) then
      raise exception 'Choose a service.'; end if;
    if not public._dept_on(dpt) and not is_staff then raise exception 'That service isn''t taking bookings yet.'; end if;
    if is_staff and s.role <> 'superadmin' and not coalesce(dpt = any(s.depts), false) then
      raise exception 'You can only book for your own department.'; end if;
    fl := g->>'flow';
    if fl is null or not (fl = any(public._dept_flows(dpt))) then fl := (public._dept_flows(dpt))[1]; end if;
    if fl in ('valet','delivery','home') and ar = '' then raise exception 'Choose the area for the pickup or visit.'; end if;
    lns := public._price_lines(cid, dpt, d, g->'lines', s, allow_member, null);
    sub := (select coalesce(sum((x->>'price')::int * (x->>'qty')::int), 0) from jsonb_array_elements(lns) x);
    fee := 0;
    if fl in ('valet','delivery','home') and not trip_done then
      fee := case when allow_member and public._free_trip(cid, dpt, d) then 0 else public._zone_fee(ar) end;
      trip_done := true;
    end if;
    disc := 0;
    if is_staff and s.role in ('superadmin','dept_admin') then
      disc := least(greatest(coalesce((g->>'discount')::int, 0), 0), sub + fee);
    end if;
    st_id := null; va_id := null;
    if is_staff then
      st_id := nullif(g->>'staff_id', '')::uuid;
      va_id := nullif(g->>'valet_id', '')::uuid;
      if s.role = 'attendant' then st_id := s.id; end if;
      if st_id is not null and not exists (select 1 from public.staff where id = st_id and active and role <> 'pending') then st_id := null; end if;
      if va_id is not null and not exists (select 1 from public.staff where id = va_id and active and role <> 'pending') then va_id := null; end if;
    end if;
    itm := '{}';
    if dpt in ('wash','garage') and vid is not null then itm := array[vid]; end if;
    if jsonb_typeof(g->'item_ids') = 'array' then
      itm := itm || array(select x::uuid from jsonb_array_elements_text(g->'item_ids') x
                          where exists (select 1 from public.items i where i.id = x::uuid and i.customer_id = cid)
                            and not (x::uuid = any(itm)));
    end if;
    jid := public._code(); tok := public._token(); first_tok := coalesce(first_tok, tok);
    st0 := (public._steps(fl))[1];
    insert into public.jobs (id, group_id, customer_id, dept, flow, status, day, slot, drop_slot, lines, item_ids,
      subtotal, valet_fee, discount, total, paid, area, landmark, maps, staff_id, valet_id, source, notes,
      confirmed, history, track_token, created_by)
    values (jid, gid, cid, dpt, fl, st0, d, sl, case when fl = 'valet' then dsl end, lns, itm,
      sub, fee, disc, greatest(sub + fee - disc, 0), 0,
      case when fl in ('valet','delivery','home') then ar else '' end,
      case when fl in ('valet','delivery','home') then lm else '' end,
      case when fl in ('valet','delivery','home') then mp else '' end,
      st_id, va_id, left(coalesce(src, ''), 30),
      left(trim(concat_ws(E'\n', nullif(trim(g->>'notes'), ''), nullif(trim(p->>'notes'), ''))), 1000),
      is_staff,
      jsonb_build_array(jsonb_build_object('s', st0, 'at', now(), 'by', s.id)),
      tok, s.id);
    res := res || jsonb_build_array(jsonb_build_object('id', jid, 'dept', dpt, 'track_token', tok));
  end loop;

  update public.customers set last_visit = greatest(coalesce(last_visit, d), d) where id = cid;
  return jsonb_build_object('group_id', gid, 'jobs', res, 'track_token', first_tok);
end $$;

-- What staff see for one job
create or replace function public._job(j public.jobs, s public.staff) returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(j) || jsonb_build_object(
    'balance', case when j.status = 'cancelled' then 0 else greatest(j.total - j.paid, 0) end,
    'customer', (select jsonb_build_object('id', c.id, 'name', c.name, 'phone', c.phone, 'token', c.token, 'notes', c.notes)
                 from public.customers c where c.id = j.customer_id),
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'kind', i.kind, 'label', i.label, 'details', i.details))
                       from public.items i where i.id = any(j.item_ids)), '[]'::jsonb),
    'staff_name', (select st.name from public.staff st where st.id = j.staff_id),
    'valet_name', (select st.name from public.staff st where st.id = j.valet_id),
    'siblings', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'dept', x.dept, 'status', x.status,
                            'balance', case when x.status = 'cancelled' then 0 else greatest(x.total - x.paid, 0) end,
                            'visible', public._sees(s, x)) order by x.created_at)
                          from public.jobs x where x.group_id = j.group_id and x.id <> j.id), '[]'::jsonb),
    'can_edit', public._can_edit(s, j),
    'can_manage', public._manages(s, j.dept))
$$;

-- What customers see for one job
create or replace function public._pub_job(j public.jobs) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'code', j.id, 'dept', j.dept, 'flow', j.flow, 'status', j.status, 'confirmed', j.confirmed,
    'day', j.day, 'slot', j.slot, 'drop_slot', j.drop_slot,
    'lines', coalesce((select jsonb_agg(jsonb_build_object('name', l->>'name', 'qty', (l->>'qty')::int,
                         'price', (l->>'price')::int, 'member', (l->>'member_id') is not null,
                         'unit', l->>'unit', 'sizes', l->>'sizes'))
                       from jsonb_array_elements(j.lines) l), '[]'::jsonb),
    'valet_fee', j.valet_fee, 'discount', j.discount, 'total', j.total, 'paid', j.paid,
    'balance', case when j.status = 'cancelled' then 0 else greatest(j.total - j.paid, 0) end,
    'area', j.area, 'landmark', j.landmark, 'track_token', j.track_token,
    'items', coalesce((select jsonb_agg(i.label || case when i.details <> '' then ' · ' || i.details else '' end)
                       from public.items i where i.id = any(j.item_ids)), '[]'::jsonb),
    'tags', coalesce((select jsonb_agg(t->>'tag') from jsonb_array_elements(j.tags) t), '[]'::jsonb),
    'history', coalesce((select jsonb_agg(jsonb_build_object('s', h->>'s', 'at', h->>'at'))
                         from jsonb_array_elements(j.history) h where h ? 's'), '[]'::jsonb),
    'staff', nullif(split_part(coalesce((select name from public.staff where id = j.staff_id), ''), ' ', 1), ''),
    'valet', nullif(split_part(coalesce((select name from public.staff where id = j.valet_id), ''), ' ', 1), ''))
$$;

create or replace function public._cust_upsert(c jsonb, s public.staff) returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid := nullif(c->>'id', '')::uuid; ph text := public._phone(c->>'phone'); other uuid;
        nm text := left(trim(coalesce(c->>'name', '')), 80);
begin
  if ph is not null and length(ph) not between 11 and 13 then raise exception 'Check the phone number.'; end if;
  if cid is not null then
    if not exists (select 1 from public.customers where id = cid) then raise exception 'That customer no longer exists.'; end if;
    if ph is not null then
      select id into other from public.customers where phone = ph and id <> cid;
      if other is not null then raise exception 'Another customer already has this phone number.'; end if;
    end if;
    update public.customers set
      name = case when nm <> '' then nm else name end,
      phone = coalesce(ph, phone),
      area = case when c ? 'area' and coalesce(c->>'area', '') <> '' then left(c->>'area', 60) else area end,
      landmark = case when c ? 'landmark' and coalesce(c->>'landmark', '') <> '' then left(c->>'landmark', 240) else landmark end,
      maps = case when c ? 'maps' and coalesce(c->>'maps', '') <> '' then left(c->>'maps', 400) else maps end
    where id = cid;
    return cid;
  end if;
  if ph is not null then select id into cid from public.customers where phone = ph; end if;
  if cid is not null then
    return public._cust_upsert(c || jsonb_build_object('id', cid), s);
  end if;
  insert into public.customers (name, phone, area, landmark, maps)
  values (coalesce(nullif(nm, ''), 'Walk-in'), ph, left(coalesce(c->>'area', ''), 60),
          left(coalesce(c->>'landmark', ''), 240), left(coalesce(c->>'maps', ''), 400))
  returning id into cid;
  return cid;
end $$;

-- =====================================================================
--  PUBLIC: anyone can call these (logged-out visitors and customers)
-- =====================================================================
create or replace function public.catalog(p jsonb default '{}') returns jsonb
language sql stable security definer set search_path = public as $$
  select public._settings(false)
$$;

create or replace function public.book(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare ph text := public._phone(p->>'phone'); cid uuid; nm text := left(trim(coalesce(p->>'name', '')), 80);
        n int; r jsonb; known boolean := false;
begin
  if nm = '' then raise exception 'Add your name.'; end if;
  if ph is null or length(ph) <> 12 or ph !~ '^254[17][0-9]{8}$' then
    raise exception 'Add a valid phone number, like 0712 345 678.'; end if;
  select id into cid from public.customers where phone = ph;
  if cid is null then
    insert into public.customers (name, phone, area, landmark, maps)
    values (nm, ph, left(coalesce(p->>'area', ''), 60), left(coalesce(p->>'landmark', ''), 240), left(coalesce(p->>'maps', ''), 400))
    returning id into cid;
  else
    known := true;
    select count(*) into n from public.jobs where customer_id = cid and not confirmed and status <> 'cancelled';
    if n >= 6 then raise exception 'You already have bookings waiting for confirmation. Message us on WhatsApp to change them.'; end if;
  end if;
  r := public._book(cid,
         p || jsonb_build_object('notes', trim(concat_ws(E'\n', nullif(trim(p->>'notes'), ''),
               case when known and lower(nm) <> lower((select name from public.customers where id = cid)) then 'Booked as: ' || nm end))),
         'Website', null::public.staff, false);
  return jsonb_build_object('code', r->'jobs'->0->>'id', 'track_token', r->>'track_token',
                            'codes', (select jsonb_agg(x->>'id') from jsonb_array_elements(r->'jobs') x));
end $$;

create or replace function public.track(p jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare j public.jobs; nm text;
begin
  select * into j from public.jobs where track_token = coalesce(p->>'token', '');
  if j.id is null then raise exception 'We couldn''t find that booking. Check the link, or message us on WhatsApp.'; end if;
  select split_part(name, ' ', 1) into nm from public.customers where id = j.customer_id;
  return jsonb_build_object(
    'biz', public._biz(), 'name', nm,
    'jobs', (select jsonb_agg(public._pub_job(x) order by x.created_at) from public.jobs x where x.group_id = j.group_id),
    'can_cancel', exists (select 1 from public.jobs x where x.group_id = j.group_id and x.status <> 'cancelled')
                  and not exists (select 1 from public.jobs x where x.group_id = j.group_id and x.status <> 'cancelled'
                                  and x.status <> (public._steps(x.flow))[1]));
end $$;

create or replace function public.track_cancel(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare j public.jobs;
begin
  select * into j from public.jobs where track_token = coalesce(p->>'token', '');
  if j.id is null then raise exception 'We couldn''t find that booking.'; end if;
  if exists (select 1 from public.jobs x where x.group_id = j.group_id and x.status <> 'cancelled'
             and x.status <> (public._steps(x.flow))[1]) then
    raise exception 'We''ve already started on this booking. Message us on WhatsApp to change it.'; end if;
  update public.jobs set status = 'cancelled', updated_at = now(),
         history = history || jsonb_build_array(jsonb_build_object('s', 'cancelled', 'at', now(), 'by', null, 'note', 'Cancelled by customer'))
   where group_id = j.group_id and status <> 'cancelled';
  return public.track(p);
end $$;

create or replace function public.portal(p jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c public.customers;
begin
  select * into c from public.customers where token = coalesce(p->>'token', '');
  if c.id is null then raise exception 'This link doesn''t work any more. Ask us on WhatsApp for a new one.'; end if;
  return jsonb_build_object(
    'biz', public._biz(),
    'customer', jsonb_build_object('name', c.name, 'phone', c.phone, 'area', c.area, 'landmark', c.landmark, 'maps', c.maps),
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'kind', i.kind, 'label', i.label, 'details', i.details,
                          'last', (select max(j.day) from public.jobs j where i.id = any(j.item_ids) and j.status = 'done'))
                        order by i.created_at) from public.items i where i.customer_id = c.id), '[]'::jsonb),
    'memberships', public._memberships(c.id),
    'upcoming', coalesce((select jsonb_agg(public._pub_job(j) order by j.day, j.slot) from public.jobs j
                          where j.customer_id = c.id and j.status not in ('done','cancelled')), '[]'::jsonb),
    'history', coalesce((select jsonb_agg(x.v order by x.day desc) from (
                          select public._pub_job(j) - 'track_token' as v, j.day from public.jobs j
                          where j.customer_id = c.id and j.status = 'done' order by j.day desc limit 30) x), '[]'::jsonb),
    'stats', (select jsonb_build_object('visits', count(*),
                     'spent', (select coalesce(sum(py.amount), 0) from public.payments py where py.customer_id = c.id))
              from public.jobs j where j.customer_id = c.id and j.status = 'done'));
end $$;

create or replace function public.portal_book(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c public.customers; r jsonb;
begin
  select * into c from public.customers where token = coalesce(p->>'token', '');
  if c.id is null then raise exception 'This link doesn''t work any more. Ask us on WhatsApp for a new one.'; end if;
  r := public._book(c.id, (p - 'token') || jsonb_build_object(
          'area', coalesce(nullif(p->>'area', ''), c.area),
          'landmark', coalesce(nullif(p->>'landmark', ''), c.landmark),
          'maps', coalesce(nullif(p->>'maps', ''), c.maps)),
        'Customer link', null::public.staff, true);
  return jsonb_build_object('code', r->'jobs'->0->>'id', 'track_token', r->>'track_token',
                            'codes', (select jsonb_agg(x->>'id') from jsonb_array_elements(r->'jobs') x));
end $$;

-- =====================================================================
--  STAFF: signed-in team members only. Each checks the role first.
-- =====================================================================
create or replace function public.staff_join(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r text;
begin
  if uid is null then raise exception 'Please sign in again.'; end if;
  if not exists (select 1 from public.staff where id = uid) then
    if coalesce(trim(p->>'name'), '') = '' then raise exception 'Add your name.'; end if;
    r := case when exists (select 1 from public.staff where role = 'superadmin' and active) then 'pending' else 'superadmin' end;
    insert into public.staff (id, name, phone, role) values (uid, left(trim(p->>'name'), 60), coalesce(public._phone(p->>'phone'), ''), r);
  end if;
  return public.staff_me('{}');
end $$;

create or replace function public.staff_me(p jsonb default '{}') returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s public.staff;
begin
  if auth.uid() is null then raise exception 'Please sign in again.'; end if;
  select * into s from public.staff where id = auth.uid();
  if s.id is null then return jsonb_build_object('me', null); end if;
  if s.role = 'pending' or not s.active then
    return jsonb_build_object('me', jsonb_build_object('id', s.id, 'name', s.name, 'role', s.role, 'active', s.active),
                              'settings', public._biz());
  end if;
  return jsonb_build_object(
    'me', to_jsonb(s),
    'settings', public._settings(true),
    'team', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'role', t.role, 'depts', t.depts) order by t.name)
                      from public.staff t where t.active and t.role not in ('pending','financier')), '[]'::jsonb));
end $$;

create or replace function public.staff_board(p jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s public.staff := public._need(array['superadmin','dept_admin','attendant','rider']);
        d date := coalesce(nullif(p->>'day', '')::date, public._today());
begin
  return jsonb_build_object(
    'day', d,
    'jobs', coalesce((select jsonb_agg(public._job(j, s) order by j.slot, j.created_at) from public.jobs j
                      where j.day = d and public._sees(s, j)), '[]'::jsonb),
    'owed', coalesce((select jsonb_agg(public._job(j, s) order by j.day desc, j.slot) from public.jobs j
                      where j.status = 'done' and j.paid < j.total and j.day >= d - 120 and public._sees(s, j)), '[]'::jsonb),
    'unconfirmed', coalesce((select jsonb_agg(public._job(j, s) order by j.day, j.slot) from public.jobs j
                             where not j.confirmed and j.status <> 'cancelled' and j.day >= public._today() - 1
                               and public._sees(s, j)), '[]'::jsonb));
end $$;

create or replace function public.staff_job(p jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s public.staff := public._need(array['superadmin','dept_admin','attendant','rider']); j public.jobs;
begin
  select * into j from public.jobs where id = p->>'id';
  if j.id is null or not public._sees(s, j) then raise exception 'You don''t have access to this job.'; end if;
  return public._job(j, s) || jsonb_build_object(
    'payments', coalesce((select jsonb_agg(to_jsonb(x) order by x.at) from public.payments x where x.job_id = j.id), '[]'::jsonb),
    'memberships', case when s.role = 'rider' then '[]'::jsonb else public._memberships(j.customer_id) end,
    'customer_items', case when s.role = 'rider' then '[]'::jsonb else
       coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'kind', i.kind, 'label', i.label, 'details', i.details) order by i.created_at)
                 from public.items i where i.customer_id = j.customer_id), '[]'::jsonb) end);
end $$;

create or replace function public.staff_book(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.staff := public._need(array['superadmin','dept_admin','attendant']); cid uuid; r jsonb;
begin
  cid := public._cust_upsert(coalesce(p->'customer', '{}'::jsonb), s);
  r := public._book(cid, p, coalesce(nullif(p->>'source', ''), 'Walk-in'), s, true);
  return r || jsonb_build_object('customer_id', cid);
end $$;

create or replace function public.staff_job_save(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s public.staff := public._need(array['superadmin','dept_admin','attendant']); j public.jobs;
  fl text; st text; d date; sl time; dsl time; lns jsonb; sub int; fee int; disc int; vid uuid; itm uuid[];
  admin boolean; ar text; trip boolean;
begin
  select * into j from public.jobs where id = p->>'id' for update;
  if j.id is null or not public._can_edit(s, j) then raise exception 'You can''t change this job.'; end if;
  admin := public._manages(s, j.dept);
  fl := coalesce(nullif(p->>'flow', ''), j.flow);
  if not (fl = any(public._dept_flows(j.dept))) then fl := j.flow; end if;
  st := case when j.status = 'cancelled' or j.status = any(public._steps(fl)) then j.status else (public._steps(fl))[1] end;
  begin
    d := coalesce(nullif(p->>'day', '')::date, j.day);
    sl := coalesce(nullif(p->>'slot', '')::time, j.slot);
    dsl := case when p ? 'drop_slot' then nullif(p->>'drop_slot', '')::time else j.drop_slot end;
  exception when others then raise exception 'Check the date and time.';
  end;
  trip := fl in ('valet','delivery','home');
  ar := case when trip then left(trim(coalesce(p->>'area', j.area)), 60) else '' end;
  if trip and ar = '' then raise exception 'Choose the area for the pickup or visit.'; end if;
  lns := public._price_lines(j.customer_id, j.dept, d, coalesce(p->'lines', j.lines), s, true, j.id);
  sub := (select coalesce(sum((x->>'price')::int * (x->>'qty')::int), 0) from jsonb_array_elements(lns) x);
  if not trip then fee := 0;
  elsif admin and p ? 'valet_fee' then fee := greatest(coalesce((p->>'valet_fee')::int, 0), 0);
  elsif fl = j.flow and ar = j.area then fee := j.valet_fee;
  else fee := case when public._free_trip(j.customer_id, j.dept, d) then 0 else public._zone_fee(ar) end;
  end if;
  disc := case when admin and p ? 'discount' then greatest(coalesce((p->>'discount')::int, 0), 0) else j.discount end;
  disc := least(disc, sub + fee);
  itm := j.item_ids;
  if coalesce(trim(p->>'plate'), '') <> '' and j.dept in ('wash','garage') then
    vid := public._vehicle(j.customer_id, p->>'plate', p->>'make', p->>'colour');
    itm := array[vid] || array(select x from unnest(j.item_ids) x join public.items i on i.id = x where i.kind <> 'vehicle');
  end if;
  update public.jobs set
    flow = fl, status = st, day = d, slot = sl, drop_slot = case when fl = 'valet' then dsl end,
    lines = lns, item_ids = itm, subtotal = sub, valet_fee = fee, discount = disc,
    total = greatest(sub + fee - disc, 0),
    area = ar,
    landmark = case when trip then left(trim(coalesce(p->>'landmark', j.landmark)), 240) else '' end,
    maps = case when trip then left(trim(coalesce(p->>'maps', j.maps)), 400) else '' end,
    notes = left(coalesce(p->>'notes', j.notes), 1000),
    staff_id = case when admin and p ? 'staff_id' then nullif(p->>'staff_id', '')::uuid else staff_id end,
    valet_id = case when admin and p ? 'valet_id' then nullif(p->>'valet_id', '')::uuid else valet_id end,
    history = history || jsonb_build_array(jsonb_build_object('e', 'edited', 'at', now(), 'by', s.id)),
    updated_at = now()
  where id = j.id;
  return public.staff_job(jsonb_build_object('id', j.id));
end $$;

create or replace function public.staff_job_step(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s public.staff := public._need(array['superadmin','dept_admin','attendant','rider']); j public.jobs;
  steps text[]; i int; nx text; ok boolean;
begin
  select * into j from public.jobs where id = p->>'id' for update;
  if j.id is null or not public._sees(s, j) then raise exception 'You don''t have access to this job.'; end if;
  if j.status = 'cancelled' then raise exception 'This job was cancelled.'; end if;
  steps := public._steps(j.flow);
  i := array_position(steps, j.status);
  nx := coalesce(nullif(p->>'to', ''), steps[i + 1]);
  if nx is null then raise exception 'This job is already finished.'; end if;
  if i is null or not (nx = any(steps)) then raise exception 'That step isn''t next for this job.'; end if;
  ok := coalesce(nx = steps[i + 1], false) or coalesce(i > 1 and nx = steps[i - 1], false)
        or (public._manages(s, j.dept) and nx = any(steps));
  if not ok then raise exception 'That step isn''t next for this job.'; end if;
  if s.role = 'rider' and not (nx in ('enroute','collected','returning','done') or coalesce(i > 1 and nx = steps[i - 1], false)) then
    raise exception 'Riders update pickups and drop-offs only.'; end if;
  if s.role = 'rider' and nx = 'done' and j.flow = 'walkin' then raise exception 'Riders update pickups and drop-offs only.'; end if;
  update public.jobs set
    status = nx, confirmed = true, updated_at = now(),
    staff_id = case when staff_id is null and s.role = 'attendant' and nx in ('service','arrived','enroute','ready') then s.id else staff_id end,
    valet_id = case when valet_id is null and s.role = 'rider' then s.id
                    when valet_id is null and s.role = 'attendant' and j.flow in ('valet','delivery') and nx in ('enroute','collected','returning') then s.id
                    else valet_id end,
    history = history || jsonb_build_array(jsonb_build_object('s', nx, 'at', now(), 'by', s.id))
  where id = j.id;
  return public.staff_job(jsonb_build_object('id', j.id));
end $$;

create or replace function public.staff_job_take(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.staff := public._need(array['attendant','rider','dept_admin','superadmin']); j public.jobs;
        as_valet boolean := coalesce(p->>'as', '') = 'valet' or s.role = 'rider';
begin
  select * into j from public.jobs where id = p->>'id' for update;
  if j.id is null or not public._sees(s, j) then raise exception 'You don''t have access to this job.'; end if;
  if as_valet then
    if j.valet_id is not null and j.valet_id <> s.id then raise exception 'Someone else already took this run.'; end if;
    update public.jobs set valet_id = s.id, updated_at = now() where id = j.id;
  else
    if j.staff_id is not null and j.staff_id <> s.id then raise exception 'Someone else already took this job.'; end if;
    update public.jobs set staff_id = s.id, updated_at = now() where id = j.id;
  end if;
  return public.staff_job(jsonb_build_object('id', j.id));
end $$;

create or replace function public.staff_job_assign(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.staff := public._need(array['superadmin','dept_admin']); j public.jobs;
        sid uuid := nullif(p->>'staff_id', '')::uuid; vid uuid := nullif(p->>'valet_id', '')::uuid;
begin
  select * into j from public.jobs where id = p->>'id' for update;
  if j.id is null or not public._manages(s, j.dept) then raise exception 'You can''t assign this job.'; end if;
  if sid is not null and not exists (select 1 from public.staff where id = sid and active and role <> 'pending') then raise exception 'Pick someone from your team.'; end if;
  if vid is not null and not exists (select 1 from public.staff where id = vid and active and role <> 'pending') then raise exception 'Pick someone from your team.'; end if;
  update public.jobs set
    staff_id = case when p ? 'staff_id' then sid else staff_id end,
    valet_id = case when p ? 'valet_id' then vid else valet_id end,
    updated_at = now()
  where id = j.id;
  return public.staff_job(jsonb_build_object('id', j.id));
end $$;

create or replace function public.staff_job_confirm(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.staff := public._need(array['superadmin','dept_admin','attendant']); j public.jobs;
begin
  select * into j from public.jobs where id = p->>'id';
  if j.id is null or not public._sees(s, j) then raise exception 'You don''t have access to this job.'; end if;
  update public.jobs x set confirmed = true, updated_at = now()
   where x.group_id = j.group_id and public._sees(s, x);
  return public.staff_job(jsonb_build_object('id', j.id));
end $$;

create or replace function public.staff_job_cancel(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.staff := public._need(array['superadmin','dept_admin']); j public.jobs; prev text;
begin
  select * into j from public.jobs where id = p->>'id' for update;
  if j.id is null or not public._manages(s, j.dept) then raise exception 'Only a manager can cancel this job.'; end if;
  if coalesce((p->>'restore')::boolean, false) then
    if j.status <> 'cancelled' then return public.staff_job(p); end if;
    select h->>'s' into prev from jsonb_array_elements(j.history) with ordinality as x(h, n)
      where h ? 's' and h->>'s' <> 'cancelled' order by n desc limit 1;
    prev := coalesce(prev, (public._steps(j.flow))[1]);
    update public.jobs set status = prev, updated_at = now(),
      history = history || jsonb_build_array(jsonb_build_object('s', prev, 'at', now(), 'by', s.id, 'note', 'Restored'))
    where id = j.id;
  else
    if j.status = 'done' then raise exception 'Finished jobs can''t be cancelled.'; end if;
    update public.jobs set status = 'cancelled', updated_at = now(),
      history = history || jsonb_build_array(jsonb_build_object('s', 'cancelled', 'at', now(), 'by', s.id))
    where id = j.id;
  end if;
  return public.staff_job(jsonb_build_object('id', j.id));
end $$;

create or replace function public.staff_job_pay(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s public.staff := public._need(array['superadmin','dept_admin','attendant','rider']); j public.jobs; x public.jobs;
  amt int; left_amt int; take int; mth text := coalesce(p->>'method', ''); rf text := upper(trim(coalesce(p->>'ref', '')));
  d date := coalesce(nullif(p->>'day', '')::date, public._today()); dup text;
begin
  select * into j from public.jobs where id = p->>'id' for update;
  if j.id is null or not public._sees(s, j) then raise exception 'You don''t have access to this job.'; end if;
  if j.status = 'cancelled' then raise exception 'This job was cancelled.'; end if;
  if mth not in ('mpesa','cash','card','bank') then raise exception 'Choose how they paid.'; end if;
  begin amt := round((p->>'amount')::numeric)::int; exception when others then amt := 0; end;
  if amt is null or amt <= 0 then raise exception 'Enter the amount received.'; end if;
  if amt > 1000000 then raise exception 'Check the amount.'; end if;
  if mth = 'mpesa' and rf = '' then raise exception 'Add the M-Pesa code from the confirmation message.'; end if;
  if rf <> '' then
    select coalesce(job_id, 'a membership') into dup from public.payments where ref = rf limit 1;
    if dup is not null then raise exception 'Code % is already recorded on %.', rf, dup; end if;
  end if;
  left_amt := amt;
  if coalesce((p->>'group')::boolean, false) then
    for x in select * from public.jobs where group_id = j.group_id and status <> 'cancelled' and paid < total
             order by (id = j.id) desc, created_at loop
      exit when left_amt <= 0;
      if not public._sees(s, x) then continue; end if;
      take := least(left_amt, x.total - x.paid);
      insert into public.payments (job_id, customer_id, method, amount, ref, day, by_id) values (x.id, x.customer_id, mth, take, rf, d, s.id);
      update public.jobs set paid = paid + take, updated_at = now() where id = x.id;
      left_amt := left_amt - take;
    end loop;
  end if;
  if left_amt > 0 then
    insert into public.payments (job_id, customer_id, method, amount, ref, day, by_id) values (j.id, j.customer_id, mth, left_amt, rf, d, s.id);
    update public.jobs set paid = paid + left_amt, updated_at = now() where id = j.id;
  end if;
  return public.staff_job(jsonb_build_object('id', j.id));
end $$;

create or replace function public.staff_job_check(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s public.staff := public._need(array['superadmin','dept_admin','attendant','rider']); j public.jobs;
  pc jsonb; v_tags jsonb := '[]'::jsonb; tg text; iid uuid; new_items uuid[] := '{}'; c jsonb := coalesce(p->'checkin', '{}'::jsonb);
  steps text[]; nx text;
begin
  select * into j from public.jobs where id = p->>'id' for update;
  if j.id is null or not public._sees(s, j) then raise exception 'You don''t have access to this job.'; end if;
  if jsonb_typeof(p->'pieces') = 'array' then
    if jsonb_array_length(p->'pieces') > 60 then raise exception 'That''s a lot of pieces. Split them into two bookings.'; end if;
    for pc in select value from jsonb_array_elements(p->'pieces') loop
      tg := nullif(trim(coalesce(pc->>'tag', '')), '');
      if tg is null then tg := 'T' || lpad(nextval('public.tag_seq')::text, 4, '0'); end if;
      iid := nullif(pc->>'item_id', '')::uuid;
      if iid is not null and not exists (select 1 from public.items where id = iid and customer_id = j.customer_id) then iid := null; end if;
      if iid is null and coalesce((pc->>'save')::boolean, false) and coalesce(trim(pc->>'desc'), '') <> '' then
        insert into public.items (customer_id, kind, label)
        values (j.customer_id, case j.dept when 'carpet' then 'carpet' when 'laundry' then 'laundry' else 'other' end,
                left(trim(pc->>'desc'), 80))
        returning id into iid;
      end if;
      if iid is not null then new_items := new_items || iid; end if;
      v_tags := v_tags || jsonb_build_array(jsonb_build_object('tag', left(tg, 20), 'desc', left(coalesce(pc->>'desc', ''), 120), 'item_id', iid));
    end loop;
  else
    v_tags := j.tags;
  end if;
  steps := public._steps(j.flow);
  nx := case when coalesce((p->>'collect')::boolean, false) and j.flow = 'valet' and j.status in ('booked','enroute')
             then 'collected' else steps[array_position(steps, j.status) + 1] end;
  update public.jobs set
    checkin = jsonb_build_object(
      'fuel', left(coalesce(c->>'fuel', ''), 4),
      'mileage', nullif(regexp_replace(coalesce(c->>'mileage', ''), '\D', '', 'g'), ''),
      'damage', coalesce(c->'damage', '[]'::jsonb),
      'valuables', left(coalesce(c->>'valuables', ''), 300),
      'keys', coalesce((c->>'keys')::boolean, false),
      'notes', left(coalesce(c->>'notes', ''), 600),
      'at', now(), 'by', s.id),
    photos = coalesce((select array_agg(x) from (select x from jsonb_array_elements_text(coalesce(p->'photos', '[]'::jsonb)) x limit 16) y), '{}'),
    tags = v_tags,
    item_ids = array(select distinct unnest(item_ids || new_items)),
    status = case when coalesce((p->>'collect')::boolean, false) and nx = 'collected' then 'collected' else status end,
    valet_id = case when coalesce((p->>'collect')::boolean, false) and valet_id is null and s.role in ('rider','attendant') then s.id else valet_id end,
    confirmed = true,
    history = history || case when coalesce((p->>'collect')::boolean, false) and nx = 'collected'
                              then jsonb_build_array(jsonb_build_object('s', 'collected', 'at', now(), 'by', s.id))
                              else '[]'::jsonb end,
    updated_at = now()
  where id = j.id;
  return public.staff_job(jsonb_build_object('id', j.id));
end $$;

-- ---------- customers
create or replace function public.staff_customers(p jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s public.staff := public._need(array['superadmin','dept_admin','attendant']);
        q text := lower(trim(coalesce(p->>'q', ''))); f text := coalesce(p->>'filter', 'all');
        dg text := regexp_replace(coalesce(p->>'q', ''), '\D', '', 'g'); pl text := replace(public._plate(p->>'q'), ' ', '');
begin
  if dg like '0%' then dg := substr(dg, 2); end if;
  if dg like '254%' then dg := substr(dg, 4); end if;
  return coalesce((select jsonb_agg(x.v order by x.lv desc nulls last, x.nm) from (
    select c.last_visit as lv, c.name as nm, jsonb_build_object(
      'id', c.id, 'name', c.name, 'phone', c.phone, 'area', c.area, 'last_visit', c.last_visit,
      'plates', coalesce((select jsonb_agg(i.label) from public.items i where i.customer_id = c.id and i.kind = 'vehicle'), '[]'::jsonb),
      'owing', coalesce((select sum(greatest(j.total - j.paid, 0)) from public.jobs j where j.customer_id = c.id and j.status = 'done'), 0),
      'member', (select m.plan_name from public.memberships m where m.customer_id = c.id and not m.cancelled
                 and public._today() between m.starts and m.ends order by m.ends desc limit 1)) as v
    from public.customers c
    where (q = '' or lower(c.name) like '%' || q || '%'
           or (length(dg) >= 3 and c.phone like '%' || dg || '%')
           or (length(pl) >= 3 and exists (select 1 from public.items i where i.customer_id = c.id and replace(upper(i.label), ' ', '') like '%' || pl || '%')))
      and (f <> 'due' or (c.last_visit < public._today() - 14 and exists (select 1 from public.items i where i.customer_id = c.id and i.kind = 'vehicle')))
      and (f <> 'owing' or exists (select 1 from public.jobs j where j.customer_id = c.id and j.status = 'done' and j.paid < j.total))
      and (f <> 'members' or exists (select 1 from public.memberships m where m.customer_id = c.id and not m.cancelled and public._today() between m.starts and m.ends))
    order by c.last_visit desc nulls last limit 200) x), '[]'::jsonb);
end $$;

create or replace function public.staff_customer(p jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s public.staff := public._need(array['superadmin','dept_admin','attendant']); c public.customers;
begin
  select * into c from public.customers where id = nullif(p->>'id', '')::uuid;
  if c.id is null then raise exception 'That customer no longer exists.'; end if;
  return jsonb_build_object(
    'customer', to_jsonb(c),
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'kind', i.kind, 'label', i.label, 'details', i.details,
                 'history', coalesce((select jsonb_agg(jsonb_build_object('id', j.id, 'day', j.day, 'dept', j.dept, 'status', j.status,
                               'services', (select string_agg(l->>'name', ', ') from jsonb_array_elements(j.lines) l)) order by j.day desc)
                             from public.jobs j where i.id = any(j.item_ids)), '[]'::jsonb))
               order by i.kind, i.created_at) from public.items i where i.customer_id = c.id), '[]'::jsonb),
    'memberships', public._memberships(c.id),
    'jobs', coalesce((select jsonb_agg(public._job(j, s) order by j.day desc, j.slot desc) from (
                select * from public.jobs j where j.customer_id = c.id
                  and (s.role = 'superadmin' or j.dept = any(s.depts)) order by j.day desc limit 60) j), '[]'::jsonb),
    'stats', (select jsonb_build_object('visits', count(*) filter (where j.status = 'done'),
                     'paid', (select coalesce(sum(py.amount), 0) from public.payments py where py.customer_id = c.id),
                     'owing', coalesce(sum(greatest(j.total - j.paid, 0)) filter (where j.status = 'done'), 0))
              from public.jobs j where j.customer_id = c.id));
end $$;

create or replace function public.staff_customer_save(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.staff := public._need(array['superadmin','dept_admin','attendant']); cid uuid; it jsonb; iid uuid;
begin
  cid := public._cust_upsert(p, s);
  if p ? 'notes' then update public.customers set notes = left(p->>'notes', 2000) where id = cid; end if;
  if p ? 'name' and trim(coalesce(p->>'name', '')) = '' then raise exception 'Add a name.'; end if;
  if jsonb_typeof(p->'items') = 'array' then
    for it in select value from jsonb_array_elements(p->'items') loop
      iid := nullif(it->>'id', '')::uuid;
      if coalesce((it->>'remove')::boolean, false) then
        delete from public.items where id = iid and customer_id = cid;
      elsif iid is not null then
        update public.items set label = case when kind = 'vehicle' then public._plate(it->>'label') else left(trim(it->>'label'), 80) end,
               details = left(coalesce(it->>'details', ''), 120)
         where id = iid and customer_id = cid and coalesce(trim(it->>'label'), '') <> '';
      elsif coalesce(trim(it->>'label'), '') <> '' then
        if coalesce(it->>'kind', 'vehicle') = 'vehicle' then
          perform public._vehicle(cid, it->>'label', it->>'details', null);
        else
          insert into public.items (customer_id, kind, label, details)
          values (cid, left(it->>'kind', 20), left(trim(it->>'label'), 80), left(coalesce(it->>'details', ''), 120));
        end if;
      end if;
    end loop;
  end if;
  return public.staff_customer(jsonb_build_object('id', cid));
end $$;

create or replace function public.staff_customer_newlink(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.staff := public._need(array['superadmin','dept_admin']);
begin
  update public.customers set token = public._token() where id = nullif(p->>'id', '')::uuid;
  return public.staff_customer(p);
end $$;

-- ---------- memberships
create or replace function public.staff_member_start(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.staff := public._need(array['superadmin','dept_admin']); pl public.plans; c uuid := nullif(p->>'customer_id', '')::uuid;
        st date := coalesce(nullif(p->>'starts', '')::date, public._today()); mid uuid; amt int; rf text := upper(trim(coalesce(p->>'ref', '')));
        mth text := coalesce(p->>'method', ''); dup text;
begin
  select * into pl from public.plans where id = p->>'plan_id';
  if pl.id is null then raise exception 'Choose a plan.'; end if;
  if not public._manages(s, pl.dept) then raise exception 'You can only sell plans for your own department.'; end if;
  if not exists (select 1 from public.customers where id = c) then raise exception 'That customer no longer exists.'; end if;
  begin amt := round(coalesce(nullif(p->>'amount', ''), '0')::numeric)::int; exception when others then amt := 0; end;
  if amt > 0 and mth not in ('mpesa','cash','card','bank') then raise exception 'Choose how they paid.'; end if;
  if amt > 0 and mth = 'mpesa' and rf = '' then raise exception 'Add the M-Pesa code from the confirmation message.'; end if;
  if rf <> '' then
    select coalesce(job_id, 'a membership') into dup from public.payments where ref = rf limit 1;
    if dup is not null then raise exception 'Code % is already recorded on %.', rf, dup; end if;
  end if;
  insert into public.memberships (customer_id, plan_id, plan_name, dept, allowance, service_ids, free_pickup, starts, ends, price, sold_day, created_by)
  values (c, pl.id, pl.name, pl.dept, pl.allowance, pl.service_ids, pl.free_pickup, st, st + pl.days - 1, pl.price,
          coalesce(nullif(p->>'day', '')::date, public._today()), s.id)
  returning id into mid;
  if amt > 0 then
    insert into public.payments (membership_id, customer_id, method, amount, ref, day, by_id)
    values (mid, c, mth, amt, rf, coalesce(nullif(p->>'day', '')::date, public._today()), s.id);
  end if;
  return public.staff_customer(jsonb_build_object('id', c));
end $$;

create or replace function public.staff_member_cancel(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.staff := public._need(array['superadmin','dept_admin']); m public.memberships;
begin
  select * into m from public.memberships where id = nullif(p->>'id', '')::uuid;
  if m.id is null or not public._manages(s, m.dept) then raise exception 'You can''t change this membership.'; end if;
  update public.memberships set cancelled = true where id = m.id;
  return public.staff_customer(jsonb_build_object('id', m.customer_id));
end $$;

-- ---------- reports
create or replace function public.staff_report(p jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  s public.staff := public._need(null);
  f date := coalesce(nullif(p->>'from', '')::date, public._today());
  t date := coalesce(nullif(p->>'to', '')::date, coalesce(nullif(p->>'from', '')::date, public._today()));
  full_view boolean; sc text[]; mine jsonb; r jsonb;
begin
  if t < f then raise exception 'The end date is before the start date.'; end if;
  if t - f > 400 then raise exception 'Pick a shorter period, up to about a year.'; end if;
  full_view := s.role in ('superadmin','financier');
  sc := case when full_view then null else s.depts end;

  select jsonb_build_object(
      'jobs', count(*) filter (where j.staff_id = s.id),
      'runs', count(*) filter (where j.valet_id = s.id and j.flow in ('valet','delivery')),
      'sales', coalesce(sum(j.total - j.valet_fee) filter (where j.staff_id = s.id), 0),
      'commission', round(coalesce(sum(j.total - j.valet_fee) filter (where j.staff_id = s.id), 0) * s.commission / 100.0),
      'rate', s.commission)
    into mine
  from public.jobs j where j.day between f and t and j.status = 'done';

  if s.role in ('attendant','rider') then
    return jsonb_build_object('from', f, 'to', t, 'scope', 'mine', 'mine', mine);
  end if;

  with
  jj as (select * from public.jobs j where j.day between f and t and j.status = 'done' and (sc is null or j.dept = any(sc))),
  oo as (select * from public.jobs j where j.day between f and t and j.status not in ('done','cancelled') and (sc is null or j.dept = any(sc))),
  pp as (select py.* from public.payments py
           left join public.jobs pj on pj.id = py.job_id
           left join public.memberships pm on pm.id = py.membership_id
          where py.day between f and t and (sc is null or coalesce(pj.dept, pm.dept) = any(sc))),
  mm as (select * from public.memberships m where m.sold_day between f and t and not m.cancelled and (sc is null or m.dept = any(sc))),
  ee as (select * from public.expenses e where e.day between f and t and (sc is null or e.dept = any(sc)))
  select jsonb_build_object(
    'from', f, 'to', t, 'scope', case when sc is null then 'all' else 'depts' end, 'depts', to_jsonb(sc),
    'sales', (select coalesce(sum(total), 0) from jj),
    'jobs', (select count(*) from jj),
    'open', (select count(*) from oo),
    'fees', (select coalesce(sum(valet_fee), 0) from jj),
    'discounts', (select coalesce(sum(discount), 0) from jj),
    'owed', (select coalesce(sum(greatest(total - paid, 0)), 0) from jj),
    'member_uses', (select coalesce(sum((l->>'qty')::int), 0) from jj, jsonb_array_elements(jj.lines) l where l->>'member_id' is not null),
    'by_dept', (select coalesce(jsonb_agg(jsonb_build_object('dept', dept, 'amount', amount, 'jobs', n) order by amount desc), '[]'::jsonb)
                from (select dept, sum(total - valet_fee) as amount, count(*) as n from jj group by dept) x),
    'memberships', (select jsonb_build_object('count', count(*), 'amount', coalesce(sum(price), 0)) from mm),
    'collected', (select coalesce(sum(amount), 0) from pp),
    'methods', (select coalesce(jsonb_agg(jsonb_build_object('method', method, 'amount', amount) order by amount desc), '[]'::jsonb)
                from (select method, sum(amount) as amount from pp group by method) x),
    'expenses', (select coalesce(sum(amount), 0) from ee),
    'expense_list', (select coalesce(jsonb_agg(to_jsonb(e) order by e.day desc, e.at desc), '[]'::jsonb) from ee e),
    'expense_cats', (select coalesce(jsonb_agg(jsonb_build_object('cat', cat, 'amount', amount) order by amount desc), '[]'::jsonb)
                     from (select cat, sum(amount) as amount from ee group by cat) x),
    'hours', (select jsonb_agg(coalesce((select count(*) from jj where extract(hour from jj.slot) = h), 0) order by h)
              from generate_series(6, 21) h),
    'areas', (select coalesce(jsonb_agg(jsonb_build_object('area', area, 'jobs', n) order by n desc), '[]'::jsonb)
              from (select coalesce(nullif(area, ''), 'No area') as area, count(*) as n from jj
                    where flow in ('valet','delivery','home') group by 1) x),
    'team', (select coalesce(jsonb_agg(jsonb_build_object('id', st.id, 'name', st.name, 'role', st.role,
                    'jobs', x.jobs, 'runs', x.runs, 'sales', x.sales,
                    'commission', round(x.sales * st.commission / 100.0)) order by x.sales desc), '[]'::jsonb)
             from (select pid, sum(jobs)::int as jobs, sum(runs)::int as runs, sum(sales)::int as sales from (
                     select staff_id as pid, 1 as jobs, 0 as runs, total - valet_fee as sales from jj where staff_id is not null
                     union all
                     select valet_id, 0, 1, 0 from jj where valet_id is not null and flow in ('valet','delivery')) u
                   group by pid) x join public.staff st on st.id = x.pid),
    'new_customers', case when sc is null then (select count(*) from public.customers c
                        where (c.created_at at time zone 'Africa/Nairobi')::date between f and t) end,
    'active_members', (select count(*) from public.memberships m where not m.cancelled and t between m.starts and m.ends
                         and (sc is null or m.dept = any(sc))),
    'mine', mine)
  into r;

  if full_view then
    r := r || jsonb_build_object('profit', (r->>'collected')::int - (r->>'expenses')::int);
  end if;
  return r;
end $$;

-- ---------- expenses
create or replace function public.staff_expense_add(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.staff := public._need(array['superadmin','dept_admin']); amt int; dp text := nullif(p->>'dept', '');
begin
  begin amt := round((p->>'amount')::numeric)::int; exception when others then amt := 0; end;
  if amt is null or amt <= 0 then raise exception 'Enter the amount spent.'; end if;
  if s.role = 'dept_admin' then
    if dp is null and cardinality(s.depts) = 1 then dp := s.depts[1]; end if;
    if dp is null or not (dp = any(s.depts)) then raise exception 'Choose your department for this expense.'; end if;
  end if;
  insert into public.expenses (day, cat, dept, amount, note, by_id)
  values (coalesce(nullif(p->>'day', '')::date, public._today()), left(coalesce(nullif(p->>'cat', ''), 'Other'), 40), dp, amt,
          left(coalesce(p->>'note', ''), 200), s.id);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.staff_expense_del(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.staff := public._need(array['superadmin','dept_admin']); e public.expenses;
begin
  select * into e from public.expenses where id = nullif(p->>'id', '')::uuid;
  if e.id is null then return jsonb_build_object('ok', true); end if;
  if s.role <> 'superadmin' and not coalesce(e.dept = any(s.depts), false) then raise exception 'You can''t delete this expense.'; end if;
  delete from public.expenses where id = e.id;
  return jsonb_build_object('ok', true);
end $$;

-- ---------- settings (owner only)
create or replace function public.staff_settings_save(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.staff := public._need(array['superadmin']); v jsonb; keep text[] := '{}'; keepp text[] := '{}'; nid text;
begin
  update public.settings set
    business = coalesce(nullif(trim(p->>'business'), ''), business),
    tagline = coalesce(p->>'tagline', tagline),
    whatsapp = coalesce(p->>'whatsapp', whatsapp),
    mpesa = coalesce(p->>'mpesa', mpesa),
    depts = case when jsonb_typeof(p->'depts') = 'array' then (
              select jsonb_agg(d0 || coalesce((select jsonb_build_object('name', coalesce(nullif(trim(x->>'name'), ''), d0->>'name'),
                                                                         'on', coalesce((x->>'on')::boolean, (d0->>'on')::boolean))
                                               from jsonb_array_elements(p->'depts') x where x->>'key' = d0->>'key'), '{}'::jsonb))
              from jsonb_array_elements(depts) d0) else depts end,
    zones = case when jsonb_typeof(p->'zones') = 'array' then coalesce((
              select jsonb_agg(jsonb_build_object('name', left(trim(z->>'name'), 40), 'fee', greatest(coalesce((z->>'fee')::int, 0), 0)))
              from jsonb_array_elements(p->'zones') z where coalesce(trim(z->>'name'), '') <> ''), '[]'::jsonb) else zones end,
    updated_at = now()
  where id = 1;

  if jsonb_typeof(p->'services') = 'array' then
    for v in select value from jsonb_array_elements(p->'services') loop
      continue when coalesce(trim(v->>'name'), '') = '';
      nid := coalesce(nullif(v->>'id', ''), 's' || substr(public._token(), 1, 8));
      insert into public.services (id, dept, name, price, kind, active, sort)
      values (nid, v->>'dept', left(trim(v->>'name'), 80), greatest(coalesce((v->>'price')::int, 0), 0), nullif(v->>'kind', ''),
              coalesce((v->>'active')::boolean, true), coalesce((v->>'sort')::int, 0))
      on conflict (id) do update set dept = excluded.dept, name = excluded.name, price = excluded.price,
              kind = excluded.kind, active = excluded.active, sort = excluded.sort;
      keep := keep || nid;
    end loop;
    delete from public.services where not (id = any(keep));
  end if;

  if jsonb_typeof(p->'plans') = 'array' then
    for v in select value from jsonb_array_elements(p->'plans') loop
      continue when coalesce(trim(v->>'name'), '') = '';
      nid := coalesce(nullif(v->>'id', ''), 'p' || substr(public._token(), 1, 8));
      insert into public.plans (id, name, dept, price, days, allowance, service_ids, free_pickup, perks, active, sort)
      values (nid, left(trim(v->>'name'), 60), v->>'dept', greatest(coalesce((v->>'price')::int, 0), 0),
              greatest(coalesce((v->>'days')::int, 30), 1), greatest(coalesce((v->>'allowance')::int, 1), 1),
              coalesce(array(select jsonb_array_elements_text(v->'service_ids')), '{}'),
              coalesce((v->>'free_pickup')::boolean, false), left(coalesce(v->>'perks', ''), 200),
              coalesce((v->>'active')::boolean, true), coalesce((v->>'sort')::int, 0))
      on conflict (id) do update set name = excluded.name, dept = excluded.dept, price = excluded.price, days = excluded.days,
              allowance = excluded.allowance, service_ids = excluded.service_ids, free_pickup = excluded.free_pickup,
              perks = excluded.perks, active = excluded.active, sort = excluded.sort;
      keepp := keepp || nid;
    end loop;
    delete from public.plans where not (id = any(keepp));
  end if;
  return public.staff_me('{}');
end $$;

-- ---------- team (owner only)
create or replace function public.staff_team(p jsonb) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s public.staff := public._need(array['superadmin','dept_admin']);
begin
  return coalesce((select jsonb_agg(to_jsonb(t) order by (t.role = 'pending') desc, t.active desc, t.name) from public.staff t
                   where s.role = 'superadmin' or (t.depts && s.depts and t.role <> 'pending')), '[]'::jsonb);
end $$;

create or replace function public.staff_team_save(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s public.staff := public._need(array['superadmin']); t public.staff; nr text; act boolean;
begin
  select * into t from public.staff where id = nullif(p->>'id', '')::uuid;
  if t.id is null then raise exception 'That person isn''t on the team.'; end if;
  nr := coalesce(nullif(p->>'role', ''), t.role);
  if nr not in ('pending','superadmin','dept_admin','attendant','rider','financier') then raise exception 'Choose a role.'; end if;
  act := coalesce((p->>'active')::boolean, t.active);
  if t.id = s.id and (nr <> 'superadmin' or not act) then
    raise exception 'You can''t remove your own owner access. Make someone else an owner first, then ask them.'; end if;
  if nr in ('dept_admin','attendant') and cardinality(coalesce(array(select jsonb_array_elements_text(p->'depts')), t.depts)) = 0 then
    raise exception 'Choose at least one department.'; end if;
  update public.staff set
    name = coalesce(nullif(trim(p->>'name'), ''), name),
    role = nr,
    depts = case when jsonb_typeof(p->'depts') = 'array' then array(select jsonb_array_elements_text(p->'depts')) else depts end,
    commission = case when p ? 'commission' then least(greatest(coalesce((p->>'commission')::numeric, 0), 0), 100) else commission end,
    active = act
  where id = t.id;
  return public.staff_team('{}');
end $$;

create or replace function public.staff_team_pin(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare s public.staff := public._need(array['superadmin']); pin text := coalesce(p->>'pin', '');
begin
  if pin !~ '^[0-9]{6}$' then raise exception 'The PIN must be 6 digits.'; end if;
  if not exists (select 1 from public.staff where id = nullif(p->>'id', '')::uuid) then raise exception 'That person isn''t on the team.'; end if;
  update auth.users set encrypted_password = extensions.crypt(pin, extensions.gen_salt('bf')), updated_at = now()
   where id = nullif(p->>'id', '')::uuid;
  return jsonb_build_object('ok', true);
end $$;

-- =====================================================================
--  PHOTOS (Supabase Storage). Skipped automatically where storage isn't available.
-- =====================================================================
do $$ begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public) values ('photos', 'photos', false) on conflict (id) do nothing;
    execute 'drop policy if exists "pitstop staff upload photos" on storage.objects';
    execute 'create policy "pitstop staff upload photos" on storage.objects for insert to authenticated with check (bucket_id = ''photos'' and public.is_staff())';
    execute 'drop policy if exists "pitstop staff view photos" on storage.objects';
    execute 'create policy "pitstop staff view photos" on storage.objects for select to authenticated using (bucket_id = ''photos'' and public.is_staff())';
  end if;
end $$;

-- =====================================================================
--  WHO CAN CALL WHAT
-- =====================================================================
revoke execute on all functions in schema public from public;
do $$ begin
  execute 'revoke execute on all functions in schema public from anon, authenticated';
exception when others then null;
end $$;

grant execute on function public.catalog(jsonb), public.book(jsonb), public.track(jsonb), public.track_cancel(jsonb),
  public.portal(jsonb), public.portal_book(jsonb) to anon, authenticated;

grant execute on function public.is_staff(), public.staff_join(jsonb), public.staff_me(jsonb), public.staff_board(jsonb),
  public.staff_job(jsonb), public.staff_book(jsonb), public.staff_job_save(jsonb), public.staff_job_step(jsonb),
  public.staff_job_take(jsonb), public.staff_job_assign(jsonb), public.staff_job_confirm(jsonb), public.staff_job_cancel(jsonb),
  public.staff_job_pay(jsonb), public.staff_job_check(jsonb), public.staff_customers(jsonb), public.staff_customer(jsonb),
  public.staff_customer_save(jsonb), public.staff_customer_newlink(jsonb), public.staff_member_start(jsonb),
  public.staff_member_cancel(jsonb), public.staff_report(jsonb), public.staff_expense_add(jsonb), public.staff_expense_del(jsonb),
  public.staff_settings_save(jsonb), public.staff_team(jsonb), public.staff_team_save(jsonb), public.staff_team_pin(jsonb)
  to authenticated;

notify pgrst, 'reload schema';
