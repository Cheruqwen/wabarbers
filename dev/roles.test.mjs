import { makeDb, rerunSchema, as, newUser } from './db.mjs';

let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) { pass++; } else { fail++; console.log('FAIL:', msg); } };
const throws = async (fn, re, msg) => {
  try { await fn(); fail++; console.log('FAIL (no error):', msg); }
  catch (e) { if (re && !re.test(e.message)) { fail++; console.log('FAIL (wrong error):', msg, '->', e.message); } else pass++; }
};
const today = new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
const tomorrow = new Date(Date.now() + 27 * 3600e3).toISOString().slice(0, 10);

const db = await makeDb();
const anon = as(db, null);

// ---------- staff joining
const uOwner = await newUser(db, '254700000001');
const owner = as(db, uOwner);
let me = await owner('staff_join', { name: 'Lynn K', phone: '0700000001' });
ok(me.me.role === 'superadmin', 'first joiner becomes superadmin');
ok(Array.isArray(me.settings.services) && me.settings.services.length > 20, 'owner gets full settings');

const mk = async (phone, name) => { const id = await newUser(db, phone); const c = as(db, id); const r = await c('staff_join', { name, phone }); return { id, c, r }; };
const washAdmin = await mk('254700000002', 'Kamau Supervisor');
const barber = await mk('254700000003', 'Baraka Barber');
const washer = await mk('254700000004', 'Otieno Washer');
const rider = await mk('254700000005', 'Juma Rider');
const fin = await mk('254700000006', 'Funder');
const stranger = await mk('254700000007', 'Random');
ok(washAdmin.r.me.role === 'pending', 'later joiners are pending');
await throws(() => stranger.c('staff_board', {}), /waiting for the owner/, 'pending cannot see board');
await throws(() => washAdmin.c('staff_team_save', { id: washAdmin.id, role: 'superadmin' }), /doesn't have access|waiting/, 'pending cannot promote self');

// owner approves
await owner('staff_team_save', { id: washAdmin.id, role: 'dept_admin', depts: ['wash'] });
await owner('staff_team_save', { id: barber.id, role: 'attendant', depts: ['kinyozi'], commission: 40 });
await owner('staff_team_save', { id: washer.id, role: 'attendant', depts: ['wash'], commission: 10 });
await owner('staff_team_save', { id: rider.id, role: 'rider', depts: [] });
await owner('staff_team_save', { id: fin.id, role: 'financier' });
await throws(() => owner('staff_team_save', { id: barber.id, role: 'attendant', depts: [] }), /at least one department/, 'attendant needs dept');
await throws(() => owner('staff_team_save', { id: uOwner, role: 'attendant', depts: ['wash'] }), /own owner access/, 'owner cannot demote self');
await throws(() => washAdmin.c('staff_team_save', { id: washer.id, role: 'superadmin' }), /doesn't have access/, 'dept admin cannot change roles');
await throws(() => washer.c('staff_settings_save', { business: 'Hacked' }), /doesn't have access/, 'attendant cannot change settings');

// ---------- anon can't call staff functions at all
await throws(() => anon('staff_board', {}), /permission denied/, 'anon blocked from staff_board');
await throws(() => anon('_book', {}), /permission denied|does not exist/, 'anon blocked from internal');
await throws(() => db.transaction(async tx => { await tx.exec('set local role anon'); await tx.query('select * from public.customers'); }), /permission denied/, 'anon cannot read tables');
await throws(() => db.transaction(async tx => { await tx.exec('set local role authenticated'); await tx.query('select * from public.jobs'); }), /permission denied/, 'authenticated cannot read tables');

// ---------- public catalog + booking (logged-out visitor)
const cat = await anon('catalog', {});
ok(cat.services.every(s => !['gas', 'water', 'laundry'].includes(s.dept)), 'catalog hides switched-off lines');
ok(cat.plans.length === 7, 'catalog has plans');
ok(cat.services.some(s => s.id === 'c6' && s.unit === 'sqft' && s.price === 15) && !cat.services.some(s => ['c1', 'c2', 'c3'].includes(s.id)), 'carpets priced per sq ft');
await throws(() => anon('book', { name: 'Wanjiru', phone: '12345', day: tomorrow, slot: '09:00', groups: [{ dept: 'wash', lines: [{ sid: 'w3' }] }] }), /valid phone/, 'bad phone rejected');
await throws(() => anon('book', { name: 'Wanjiru', phone: '0712345678', day: tomorrow, slot: '09:00', groups: [{ dept: 'gas', lines: [{ sid: 'ga1' }] }] }), /isn't taking bookings/, 'off dept rejected');
await throws(() => anon('book', { name: 'Wanjiru', phone: '0712345678', day: tomorrow, slot: '09:00', groups: [{ dept: 'wash', flow: 'valet', lines: [{ sid: 'w3' }] }] }), /area/, 'valet needs area');
{ // carpets: 15 per sq ft, area from the customer's sizes
  const bc = await anon('book', { name: 'Achieng', phone: '0722 000 111', day: tomorrow, slot: '10:00', area: 'Kinoo', groups: [{ dept: 'carpet', lines: [{ sid: 'c6', qty: 115, sizes: '5×7, 8×10' }] }] });
  const tc = await anon('track', { token: bc.track_token });
  ok(tc.jobs[0].total === 1725 && tc.jobs[0].lines[0].qty === 115 && tc.jobs[0].lines[0].sizes === '5×7, 8×10', 'carpet booked by area: ' + tc.jobs[0].total);
  await anon('track_cancel', { token: bc.track_token }).catch(() => {});
}
const b1 = await anon('book', {
  name: 'Wanjiru Kamau', phone: '0712 345 678', day: today, slot: '09:00', drop_slot: '13:00', area: 'Kinoo', landmark: 'Shell second gate',
  plate: 'kda412m', make: 'Mazda CX-5', colour: 'Red',
  groups: [{ dept: 'wash', flow: 'valet', lines: [{ sid: 'w4', price: 1 }] }, { dept: 'kinyozi', flow: 'chair', lines: [{ sid: 'k1' }] }]
});
ok(/^PS-/.test(b1.code) && b1.codes.length === 2, 'public booking creates two jobs');
let tr = await anon('track', { token: b1.track_token });
ok(tr.jobs.length === 2 && tr.jobs[0].confirmed === false, 'tracker shows both jobs, unconfirmed');
ok(tr.jobs.find(j => j.dept === 'wash').total === 400, 'public cannot override price');
ok(tr.jobs.find(j => j.dept === 'wash').items[0].startsWith('KDA 412M'), 'plate normalised');
ok(tr.can_cancel === true, 'can cancel before start');
await throws(() => anon('track', { token: 'nope' }), /couldn't find/, 'bad token');

// ---------- visibility by role
const bOwner = await owner('staff_board', { day: today });
const bWashAdmin = await washAdmin.c('staff_board', { day: today });
const bBarber = await barber.c('staff_board', { day: today });
const bWasher = await washer.c('staff_board', { day: today });
const bRider = await rider.c('staff_board', { day: today });
ok(bOwner.jobs.length === 2, 'owner sees both');
ok(bWashAdmin.jobs.length === 1 && bWashAdmin.jobs[0].dept === 'wash', 'wash admin sees wash only');
ok(bBarber.jobs.length === 1 && bBarber.jobs[0].dept === 'kinyozi', 'barber sees kinyozi (unassigned)');
ok(bWasher.jobs.length === 1 && bWasher.jobs[0].dept === 'wash', 'washer sees unassigned wash');
ok(bRider.jobs.length === 1 && bRider.jobs[0].flow === 'valet', 'rider sees valet run only');
ok(bOwner.unconfirmed.length === 2, 'owner sees 2 unconfirmed');
await throws(() => fin.c('staff_board', {}), /doesn't have access/, 'financier cannot see board');
const washJob = bOwner.jobs.find(j => j.dept === 'wash').id;
const cutJob = bOwner.jobs.find(j => j.dept === 'kinyozi').id;
await throws(() => barber.c('staff_job', { id: washJob }), /don't have access/, 'barber cannot open wash job');
await throws(() => rider.c('staff_job', { id: cutJob }), /don't have access/, 'rider cannot open haircut');
await throws(() => washer.c('staff_customers', {}).then(() => rider.c('staff_customers', {})), /doesn't have access/, 'rider cannot list customers');

// ---------- valet run flow
let j = await rider.c('staff_job_step', { id: washJob });
ok(j.status === 'enroute' && j.valet_id === rider.id && j.confirmed, 'rider goes en route, auto-assigned, confirmed');
await throws(() => rider.c('staff_job_step', { id: washJob, to: 'service' }), /isn't next|Riders/, 'rider cannot skip ahead');
j = await rider.c('staff_job_check', { id: washJob, collect: true, checkin: { fuel: '½', mileage: '84,210 km', damage: ['Rear bumper'], keys: true }, photos: ['a.jpg'] });
ok(j.status === 'collected' && j.checkin.mileage === '84210' && j.photos.length === 1, 'pickup check + collected');
await throws(() => rider.c('staff_job_step', { id: washJob }), /Riders/, 'rider cannot start wash');
j = await washer.c('staff_job_step', { id: washJob });
ok(j.status === 'service' && j.staff_id === washer.id, 'washer starts wash, auto-assigned');
j = await washer.c('staff_job_step', { id: washJob, to: 'collected' });
ok(j.status === 'collected', 'undo one step');
j = await washer.c('staff_job_step', { id: washJob });
j = await washer.c('staff_job_step', { id: washJob });
ok(j.status === 'ready', 'ready');
j = await rider.c('staff_job_step', { id: washJob });
j = await rider.c('staff_job_step', { id: washJob });
ok(j.status === 'done', 'rider delivers');

// ---------- payments
await throws(() => rider.c('staff_job_pay', { id: washJob, method: 'mpesa', amount: 400 }), /M-Pesa code/, 'mpesa needs code');
j = await rider.c('staff_job_pay', { id: washJob, method: 'mpesa', amount: 300, ref: 'sjm4k2p8qx', day: today });
ok(j.paid === 300 && j.balance === 100, 'part payment');
await throws(() => washer.c('staff_job_pay', { id: washJob, method: 'mpesa', amount: 100, ref: 'SJM4K2P8QX' }), /already recorded/, 'duplicate code blocked');
ok((await owner('staff_board', { day: today })).owed.some(x => x.id === washJob), 'owed list shows part-paid done job');
j = await owner('staff_job_pay', { id: washJob, method: 'cash', amount: 100, day: today, group: true });
ok(j.paid === 400, 'paid in full');

// ---------- barber chair flow + attendant limits
j = await barber.c('staff_job_step', { id: cutJob });
ok(j.status === 'arrived' && j.staff_id === barber.id, 'barber takes cut by starting');
j = await barber.c('staff_job_save', { id: cutJob, lines: [{ sid: 'k1', price: 10 }, { sid: 'k4' }], discount: 300 });
ok(j.total === 350 && j.discount === 0, 'attendant cannot change list price or discount');
j = await washAdmin.c('staff_job', { id: washJob });
ok(j.can_manage === true, 'wash admin manages wash');
await throws(() => washAdmin.c('staff_job_save', { id: cutJob, discount: 100 }), /can't change/, 'wash admin cannot edit kinyozi job');
j = await owner('staff_job_save', { id: cutJob, discount: 50, lines: [{ sid: 'k1', price: 300 }, { sid: 'k4' }] });
ok(j.total === 450, 'owner overrides price and discount');
j = await barber.c('staff_job_step', { id: cutJob }); j = await barber.c('staff_job_step', { id: cutJob });
ok(j.status === 'done', 'cut done');
j = await barber.c('staff_job_pay', { id: cutJob, method: 'cash', amount: 450, day: today });

// ---------- staff booking + membership
await throws(() => washer.c('staff_member_start', { customer_id: j.customer.id, plan_id: 'p1' }), /doesn't have access/, 'attendant cannot sell plans');
await throws(() => washAdmin.c('staff_member_start', { customer_id: j.customer.id, plan_id: 'p3' }), /own department/, 'wash admin cannot sell kinyozi plan');
let cu = await washAdmin.c('staff_member_start', { customer_id: j.customer.id, plan_id: 'p2', method: 'mpesa', amount: 1400, ref: 'MEMB123456', day: today });
ok(cu.memberships[0].remaining === 4 && cu.memberships[0].active, 'membership active with 4 left');
const sb = await washer.c('staff_book', {
  customer: { id: j.customer.id }, day: today, slot: '15:00', area: 'Kinoo', landmark: 'Shell',
  groups: [{ dept: 'wash', flow: 'valet', lines: [{ sid: 'w4' }, { sid: 'w5' }] }]
});
let mj = await washer.c('staff_job', { id: sb.jobs[0].id });
ok(mj.lines[0].price === 0 && mj.lines[0].member_id && mj.lines[1].price === 500, 'membership covers Land Cruiser wash, not engine wash');
ok(mj.valet_fee === 0 && mj.total === 500 && mj.staff_id === washer.id, 'free pickup, attendant self-assigned');
await throws(() => washer.c('staff_book', { customer: { name: 'X', phone: '0711111111' }, day: today, slot: '10:00', groups: [{ dept: 'kinyozi', lines: [{ sid: 'k1' }] }] }), /own department/, 'attendant cannot book other dept');
cu = await owner('staff_customer', { id: j.customer.id });
ok(cu.memberships[0].remaining === 3, 'membership remaining decrements');
mj = await owner('staff_job_save', { id: sb.jobs[0].id, lines: [{ sid: 'w4', use_member: false }, { sid: 'w5' }] });
ok(mj.lines[0].price === 400 && !mj.lines[0].member_id, 'owner can switch membership off for a line');
cu = await owner('staff_customer', { id: j.customer.id });
ok(cu.memberships[0].remaining === 4, 'remaining restored');

// ---------- customer personal link
const portal = await anon('portal', { token: j.customer.token });
ok(portal.memberships.length === 1 && portal.items.length === 1 && portal.stats.visits === 2, 'portal shows membership, car, visits');
const pb = await anon('portal_book', { token: j.customer.token, day: tomorrow, slot: '08:00', groups: [{ dept: 'wash', flow: 'valet', lines: [{ sid: 'w4' }] }] });
tr = await anon('track', { token: pb.track_token });
ok(tr.jobs[0].total === 0 && tr.jobs[0].lines[0].member && tr.jobs[0].area === 'Kinoo', 'portal booking uses membership + saved area');
const pub2 = await anon('book', { name: 'Someone Else', phone: '0712345678', day: tomorrow, slot: '08:00', groups: [{ dept: 'wash', flow: 'walkin', lines: [{ sid: 'w4' }] }] });
tr = await anon('track', { token: pub2.track_token });
ok(tr.jobs[0].total === 400, 'public booking with same phone does NOT use membership');
ok(tr.name === 'Wanjiru', 'existing customer name kept');
tr = await anon('track_cancel', { token: pub2.track_token });
ok(tr.jobs[0].status === 'cancelled' && tr.can_cancel === false, 'customer cancels');

// ---------- reports by role
const rOwner = await owner('staff_report', { from: today, to: today });
ok(rOwner.sales === 850 && rOwner.collected === 400 + 450 + 1400, 'owner: sales and collected include membership sale: ' + rOwner.sales + '/' + rOwner.collected);
ok(rOwner.profit === rOwner.collected - rOwner.expenses, 'owner gets profit');
const rWash = await washAdmin.c('staff_report', { from: today, to: today });
ok(rWash.sales === 400 && rWash.collected === 400 + 1400 && rWash.profit === undefined, 'wash admin scoped, no profit');
ok(rWash.team.every(t => t.name !== 'Baraka Barber'), 'wash admin team excludes barber');
const rFin = await fin.c('staff_report', { from: today, to: today });
ok(rFin.profit !== undefined && JSON.stringify(rFin).indexOf('0712') === -1 && JSON.stringify(rFin).indexOf('Wanjiru') === -1, 'financier: profit, no customer details');
const rBarber = await barber.c('staff_report', { from: today, to: today });
ok(rBarber.scope === 'mine' && rBarber.mine.commission === 180 && rBarber.sales === undefined, 'barber sees own commission only: ' + JSON.stringify(rBarber.mine));
await throws(() => fin.c('staff_customers', {}), /doesn't have access/, 'financier cannot list customers');

// ---------- expenses
await owner('staff_expense_add', { day: today, cat: 'Supplies', amount: 1800, note: 'Shampoo' });
await washAdmin.c('staff_expense_add', { day: today, cat: 'Water', amount: 500 });
await throws(() => washAdmin.c('staff_expense_add', { day: today, cat: 'Water', amount: 500, dept: 'nails' }), /department/, 'dept admin expense limited to own dept');
await throws(() => washer.c('staff_expense_add', { amount: 5 }), /doesn't have access/, 'attendant cannot add expense');
const r2 = await owner('staff_report', { from: today, to: today });
ok(r2.expenses === 2300 && r2.profit === r2.collected - 2300, 'expenses in profit');
const r3 = await washAdmin.c('staff_report', { from: today, to: today });
ok(r3.expenses === 500, 'wash admin sees only wash expenses');

// ---------- customers, items, search
let list = await washer.c('staff_customers', { q: 'kda 412' });
ok(list.length === 1 && list[0].plates[0] === 'KDA 412M' && list[0].member, 'search by plate finds member');
list = await washer.c('staff_customers', { q: '0712345' });
ok(list.length === 1, 'search by phone');
cu = await washer.c('staff_customer_save', { id: j.customer.id, notes: 'Gate code 4321', items: [{ kind: 'carpet', label: 'Living room rug', details: '8×10 grey' }] });
ok(cu.items.length === 2 && cu.customer.notes === 'Gate code 4321', 'add carpet item + notes');
await throws(() => washer.c('staff_customer_save', { id: j.customer.id, phone: '0700000002' }).then(() => owner('staff_book', { customer: { name: 'Dup', phone: '0711222333' }, day: today, slot: '10:00', groups: [{ dept: 'nails', lines: [{ sid: 'n1' }] }] })).then(() => washer.c('staff_customer_save', { id: j.customer.id, phone: '0711222333' })), /already has this phone/, 'duplicate phone blocked');

// carpet job with tags
const cb = await owner('staff_book', { customer: { id: j.customer.id }, day: today, slot: '11:00', area: 'Kinoo', groups: [{ dept: 'carpet', flow: 'valet', lines: [{ sid: 'c3' }, { sid: 'c1', qty: 2 }] }] });
let cj = await owner('staff_job_check', { id: cb.jobs[0].id, collect: true, pieces: [{ desc: 'Living room rug', item_id: cu.items.find(i => i.kind === 'carpet').id }, { desc: 'Bedroom mat', save: true }, { desc: 'Door mat' }] });
ok(cj.tags.length === 3 && /^T\d{4}$/.test(cj.tags[0].tag) && cj.item_ids.length === 2 && cj.status === 'collected', 'carpet tags + saved items: ' + JSON.stringify(cj.tags.map(t => t.tag)));
cu = await owner('staff_customer', { id: j.customer.id });
ok(cu.items.find(i => i.label === 'Living room rug').history.length === 1, 'item history');

// ---------- settings + pin
let s2 = await owner('staff_settings_save', { business: 'PitStop 87', whatsapp: '0712000000', zones: [{ name: 'Kinoo', fee: 200 }, { name: 'Regen', fee: 300 }], depts: [{ key: 'gas', on: true, name: 'Gas refills' }] });
ok(s2.settings.zones.length === 2 && s2.settings.depts.find(d => d.key === 'gas').on && s2.settings.depts.find(d => d.key === 'gas').name === 'Gas refills', 'settings saved');
const cat2 = await anon('catalog', {});
ok(cat2.services.some(s => s.dept === 'gas') && cat2.whatsapp === '0712000000', 'catalog reflects settings');
const b3 = await anon('book', { name: 'Peter', phone: '0722000111', day: tomorrow, slot: '10:00', area: 'Regen', groups: [{ dept: 'gas', flow: 'delivery', lines: [{ sid: 'ga2' }] }, { dept: 'wash', flow: 'valet', lines: [{ sid: 'w1' }] }] });
tr = await anon('track', { token: b3.track_token });
ok(tr.jobs[0].valet_fee === 300 && tr.jobs[1].valet_fee === 0, 'trip fee charged once per booking');
await owner('staff_team_pin', { id: washer.id, pin: '123456' });
const pw = await db.query('select encrypted_password from auth.users where id = $1', [washer.id]);
ok(pw.rows[0].encrypted_password.startsWith('$2'), 'pin reset hashed with bcrypt');
await throws(() => owner('staff_team_pin', { id: washer.id, pin: '12' }), /6 digits/, 'pin must be 6 digits');

// ---------- cancel + restore, re-run schema keeps data
let cc = await washAdmin.c('staff_job_cancel', { id: sb.jobs[0].id });
ok(cc.status === 'cancelled', 'admin cancels');
cc = await washAdmin.c('staff_job_cancel', { id: sb.jobs[0].id, restore: true });
ok(cc.status === 'booked', 'admin restores to previous step');
await throws(() => washer.c('staff_job_cancel', { id: sb.jobs[0].id }), /doesn't have access/, 'attendant cannot cancel');
const before = (await db.query('select count(*)::int n from public.jobs')).rows[0].n;
await rerunSchema(db);
const after = (await db.query('select count(*)::int n from public.jobs')).rows[0].n;
ok(before === after && (await db.query('select count(*)::int n from public.services')).rows[0].n > 20, 're-running schema keeps data');
ok((await anon('catalog', {})).zones.length === 2, 'settings survive re-run');

// switched-off staff
await owner('staff_team_save', { id: rider.id, active: false });
await throws(() => rider.c('staff_board', {}), /switched off/, 'switched-off staff blocked');
const team = await owner('staff_team', {});
ok(team.length === 7, 'owner sees whole team');


// ---------- null-logic edge cases
const doneJob = washJob;
await throws(() => washer.c('staff_job_step', { id: doneJob, to: 'booked' }), /isn't next|already finished/, 'attendant cannot rewind a finished job to start');
await throws(() => washer.c('staff_job_step', { id: doneJob, to: 'nonsense' }), /isn't next/, 'unknown step rejected');
await owner('staff_expense_add', { day: today, cat: 'Rent-free', amount: 10 });
const exps = (await owner('staff_report', { from: today, to: today })).expense_list;
const noDept = exps.find(e => e.dept === null);
await throws(() => washAdmin.c('staff_expense_del', { id: noDept.id }), /can't delete/, 'dept admin cannot delete owner expense');
await throws(() => owner('staff_book', { customer: { name: 'Z' }, day: today, slot: '10:00', groups: [{ lines: [{ sid: 'k1' }] }] }), /Choose a service/, 'missing dept rejected');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
