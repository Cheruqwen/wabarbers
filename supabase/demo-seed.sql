-- Example data for DEMO MODE only. Never run this on your real Supabase project.
create table if not exists public.demo_files (path text primary key, data text not null);
grant all on public.demo_files to anon, authenticated;

do $$
declare
  o  uuid := '00000000-0000-4000-8000-000000000001';
  ka uuid := '00000000-0000-4000-8000-000000000002';
  ba uuid := '00000000-0000-4000-8000-000000000003';
  na uuid := '00000000-0000-4000-8000-000000000004';
  ot uuid := '00000000-0000-4000-8000-000000000005';
  ju uuid := '00000000-0000-4000-8000-000000000006';
  fi uuid := '00000000-0000-4000-8000-000000000007';
  ac uuid := '00000000-0000-4000-8000-000000000008';
  t date := public._today();
  r jsonb; c jsonb; cid uuid; j text;
begin
  insert into auth.users (id, email, encrypted_password) values
    (o, 'p254700000001@demo', 'demo'), (ka, 'p254700000002@demo', 'demo'), (ba, 'p254700000003@demo', 'demo'),
    (na, 'p254700000004@demo', 'demo'), (ot, 'p254700000005@demo', 'demo'), (ju, 'p254700000006@demo', 'demo'),
    (fi, 'p254700000007@demo', 'demo'), (ac, 'p254700000008@demo', 'demo');
  insert into public.staff (id, name, phone, role, depts, commission) values
    (o,  'Owner',    '254700000001', 'superadmin', '{}', 0),
    (ka, 'Kamau',    '254700000002', 'dept_admin', '{wash,carpet,garage}', 0),
    (ba, 'Baraka',   '254700000003', 'attendant',  '{kinyozi}', 40),
    (na, 'Naliaka',  '254700000004', 'attendant',  '{nails}', 40),
    (ot, 'Otieno',   '254700000005', 'attendant',  '{wash,carpet}', 10),
    (ju, 'Juma',     '254700000006', 'rider',      '{}', 0),
    (fi, 'Investor', '254700000007', 'financier',  '{}', 0),
    (ac, 'Achieng',  '254700000008', 'pending',    '{}', 0);
  update public.settings set whatsapp = '0700000000', mpesa = 'Till 000000 (demo)',
    zones = '[{"name":"Uthiru","fee":0},{"name":"Kinoo","fee":100},{"name":"Regen","fee":150},{"name":"Muthiga","fee":150},
              {"name":"Kabete","fee":200},{"name":"Kangemi","fee":200},{"name":"Gitaru","fee":200}]'
  where id = 1;

  perform set_config('request.jwt.claim.sub', o::text, true);

  -- A member with a car on the Wash Club
  c := public.staff_customer_save('{"name":"Wanjiru Kamau","phone":"0700000101","area":"Kinoo","landmark":"Kinoo Shell, second gate","notes":"Prefers WhatsApp. Child seat stays in the car.","items":[{"kind":"vehicle","label":"KDA 412M","details":"Mazda CX-5 · Red"}]}');
  cid := (c->'customer'->>'id')::uuid;
  perform public.staff_member_start(jsonb_build_object('customer_id', cid, 'plan_id', 'p2', 'starts', t - 5, 'day', t - 5, 'method', 'mpesa', 'amount', 1400, 'ref', 'DEMO1A2B3C'));
  r := public.staff_book(jsonb_build_object('customer', jsonb_build_object('id', cid), 'day', t, 'slot', '08:00', 'drop_slot', '12:00',
        'area', 'Kinoo', 'landmark', 'Kinoo Shell, second gate', 'plate', 'KDA 412M', 'source', 'WhatsApp',
        'groups', jsonb_build_array(jsonb_build_object('dept', 'wash', 'flow', 'valet', 'staff_id', ot, 'valet_id', ju,
                   'lines', jsonb_build_array(jsonb_build_object('sid', 'w4'))))));
  j := r->'jobs'->0->>'id';
  perform set_config('request.jwt.claim.sub', ju::text, true);
  perform public.staff_job_step(jsonb_build_object('id', j));
  perform public.staff_job_check(jsonb_build_object('id', j, 'collect', true, 'checkin', '{"fuel":"½","mileage":"84210","damage":["Rear bumper"],"keys":true,"valuables":"Child seat"}'));
  perform set_config('request.jwt.claim.sub', ot::text, true);
  perform public.staff_job_step(jsonb_build_object('id', j));

  -- Walk-in wash, done and paid
  perform set_config('request.jwt.claim.sub', o::text, true);
  r := public.staff_book(('{"customer":{"name":"Brian Otieno","phone":"0700000102"},"day":"' || t || '","slot":"07:30","plate":"KDE 155Q","make":"Toyota Fielder","colour":"Silver","source":"Walk-in","groups":[{"dept":"wash","flow":"walkin","lines":[{"sid":"w3"}],"staff_id":"' || ot || '"}]}')::jsonb);
  j := r->'jobs'->0->>'id';
  perform public.staff_job_step(jsonb_build_object('id', j)); perform public.staff_job_step(jsonb_build_object('id', j)); perform public.staff_job_step(jsonb_build_object('id', j));
  perform public.staff_job_pay(jsonb_build_object('id', j, 'method', 'mpesa', 'amount', 500, 'ref', 'DEMO4D5E6F', 'day', t));

  -- Haircut, done and paid; on the Kinyozi Monthly plan
  c := public.staff_customer_save('{"name":"Kevin Mwangi","phone":"0700000103","notes":"Likes a low fade."}');
  cid := (c->'customer'->>'id')::uuid;
  perform public.staff_member_start(jsonb_build_object('customer_id', cid, 'plan_id', 'p3', 'starts', t - 12, 'day', t - 12, 'method', 'cash', 'amount', 1200));
  r := public.staff_book(jsonb_build_object('customer', jsonb_build_object('id', cid), 'day', t, 'slot', '08:30', 'source', 'Walk-in',
        'groups', jsonb_build_array(jsonb_build_object('dept', 'kinyozi', 'flow', 'chair', 'staff_id', ba, 'lines', jsonb_build_array(jsonb_build_object('sid', 'k2'))))));
  j := r->'jobs'->0->>'id';
  perform set_config('request.jwt.claim.sub', ba::text, true);
  perform public.staff_job_step(jsonb_build_object('id', j)); perform public.staff_job_step(jsonb_build_object('id', j)); perform public.staff_job_step(jsonb_build_object('id', j));

  -- Nails in progress
  perform set_config('request.jwt.claim.sub', o::text, true);
  r := public.staff_book(('{"customer":{"name":"Achieng Odhiambo","phone":"0700000104"},"day":"' || t || '","slot":"09:15","source":"Instagram","groups":[{"dept":"nails","flow":"chair","lines":[{"sid":"n4"}],"staff_id":"' || na || '"}]}')::jsonb);
  j := r->'jobs'->0->>'id';
  perform set_config('request.jwt.claim.sub', na::text, true);
  perform public.staff_job_step(jsonb_build_object('id', j)); perform public.staff_job_step(jsonb_build_object('id', j));

  -- Drive-in, ready for pickup
  perform set_config('request.jwt.claim.sub', o::text, true);
  r := public.staff_book(('{"customer":{"name":"Dennis Kiprop","phone":"0700000105"},"day":"' || t || '","slot":"09:30","plate":"KCY 908T","make":"Toyota Probox","colour":"White","groups":[{"dept":"wash","flow":"walkin","lines":[{"sid":"w1"}],"staff_id":"' || ot || '"}]}')::jsonb);
  j := r->'jobs'->0->>'id';
  perform public.staff_job_step(jsonb_build_object('id', j)); perform public.staff_job_step(jsonb_build_object('id', j));

  -- Carpets: valet on the way
  r := public.staff_book(('{"customer":{"name":"Faith Njeri","phone":"0700000106","area":"Regen","landmark":"Regen Court, block C"},"day":"' || t || '","slot":"10:00","drop_slot":"17:00","area":"Regen","landmark":"Regen Court, block C","source":"WhatsApp","groups":[{"dept":"carpet","flow":"valet","lines":[{"sid":"c3"},{"sid":"c1","qty":2}],"valet_id":"' || ju || '"}]}')::jsonb);
  j := r->'jobs'->0->>'id';
  perform set_config('request.jwt.claim.sub', ju::text, true);
  perform public.staff_job_step(jsonb_build_object('id', j));

  -- Car service: collected, at the garage later
  perform set_config('request.jwt.claim.sub', ka::text, true);
  r := public.staff_book(('{"customer":{"name":"James Maina","phone":"0700000107","area":"Muthiga","landmark":"Opposite Muthiga stage"},"day":"' || t || '","slot":"11:00","drop_slot":"16:00","area":"Muthiga","landmark":"Opposite Muthiga stage","plate":"KBZ 671H","make":"Subaru Forester","colour":"Blue","source":"Call","groups":[{"dept":"garage","flow":"valet","lines":[{"sid":"g1"},{"sid":"g2","price":4500}],"valet_id":"' || ju || '"}]}')::jsonb);
  j := r->'jobs'->0->>'id';
  perform public.staff_job_check(jsonb_build_object('id', j, 'collect', true, 'checkin', '{"fuel":"¼","mileage":"152300","damage":[],"keys":true}'));

  -- Home visit haircut, booked
  perform set_config('request.jwt.claim.sub', o::text, true);
  perform public.staff_book(('{"customer":{"name":"Sharon Chebet","phone":"0700000108","area":"Uthiru","landmark":"Green gate after the chemist"},"day":"' || t || '","slot":"12:30","area":"Uthiru","landmark":"Green gate after the chemist","source":"Customer link","groups":[{"dept":"kinyozi","flow":"home","lines":[{"sid":"k1"},{"sid":"k3"}],"staff_id":"' || ba || '"}]}')::jsonb);

  -- Valet wash ready, part paid
  r := public.staff_book(('{"customer":{"name":"Mercy Wambui","phone":"0700000109","area":"Kinoo","landmark":"Kinoo 76, Mwimuto Road"},"day":"' || t || '","slot":"14:00","drop_slot":"18:30","area":"Kinoo","landmark":"Kinoo 76, Mwimuto Road","plate":"KDJ 230A","make":"Honda Fit","colour":"Grey","source":"WhatsApp","groups":[{"dept":"wash","flow":"valet","lines":[{"sid":"w3"},{"sid":"w5"}],"staff_id":"' || ot || '","valet_id":"' || ju || '"}]}')::jsonb);
  j := r->'jobs'->0->>'id';
  perform public.staff_job_check(jsonb_build_object('id', j, 'collect', true, 'checkin', '{"fuel":"¾","mileage":"61020","damage":["Left side"],"keys":true}'));
  perform public.staff_job_step(jsonb_build_object('id', j)); perform public.staff_job_step(jsonb_build_object('id', j));
  perform public.staff_job_pay(jsonb_build_object('id', j, 'method', 'mpesa', 'amount', 600, 'ref', 'DEMO7G8H9J', 'day', t));

  -- Motorbike waiting
  perform public.staff_book(('{"customer":{"name":"Peter Kariuki","phone":"0700000110"},"day":"' || t || '","slot":"16:30","plate":"KMFE 512L","make":"Bajaj Boxer","colour":"Black","groups":[{"dept":"wash","flow":"walkin","lines":[{"sid":"w8"}]}]}')::jsonb);

  -- Yesterday: finished but not paid
  r := public.staff_book(('{"customer":{"name":"Tom Kiplagat","phone":"0700000111","area":"Kabete","landmark":"Kabete Vet Lab gate"},"day":"' || (t - 1) || '","slot":"15:00","area":"Kabete","landmark":"Kabete Vet Lab gate","plate":"KCU 330J","make":"Toyota Vitz","colour":"Pink","groups":[{"dept":"wash","flow":"walkin","lines":[{"sid":"w3"},{"sid":"w7"}],"staff_id":"' || ot || '"}]}')::jsonb);
  j := r->'jobs'->0->>'id';
  perform public.staff_job_step(jsonb_build_object('id', j)); perform public.staff_job_step(jsonb_build_object('id', j)); perform public.staff_job_step(jsonb_build_object('id', j));
  update public.customers set last_visit = t - 23 where name = 'Tom Kiplagat';

  -- Tomorrow, booked by staff
  perform public.staff_book(('{"customer":{"name":"Joy Wairimu","phone":"0700000112","area":"Kabete","landmark":"Kabete Vet Lab gate"},"day":"' || (t + 1) || '","slot":"09:00","drop_slot":"13:00","area":"Kabete","landmark":"Kabete Vet Lab gate","plate":"KDB 118X","make":"Toyota Axio","source":"Referral","groups":[{"dept":"wash","flow":"valet","lines":[{"sid":"w3"}]}]}')::jsonb);

  -- Expenses
  perform public.staff_expense_add(jsonb_build_object('day', t, 'cat', 'Supplies & chemicals', 'amount', 650, 'note', 'Car shampoo and wax', 'dept', 'wash'));
  perform public.staff_expense_add(jsonb_build_object('day', t, 'cat', 'Fuel & transport', 'amount', 300, 'note', 'Valet runs'));

  -- A booking from the website (not confirmed yet)
  perform set_config('request.jwt.claim.sub', '', true);
  perform public.book(jsonb_build_object('name', 'Grace Atieno', 'phone', '0700000113', 'day', t, 'slot', '17:00', 'drop_slot', '20:00',
        'area', 'Uthiru', 'landmark', 'Uthiru Junction flats, B4', 'plate', 'KDG 884C', 'make', 'Nissan X-Trail', 'colour', 'White',
        'notes', 'Please call when outside.',
        'groups', jsonb_build_array(
           jsonb_build_object('dept', 'wash', 'flow', 'valet', 'lines', jsonb_build_array(jsonb_build_object('sid', 'w2'))),
           jsonb_build_object('dept', 'nails', 'flow', 'chair', 'lines', jsonb_build_array(jsonb_build_object('sid', 'n1'))))));
end $$;
