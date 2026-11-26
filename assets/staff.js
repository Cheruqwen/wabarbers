// Staff app: each role sees only its own work. The database enforces the same rules.
import {
  CFG, DEMO, api, $, esc, clone, num, kes, t5, today, ymd, addDays, fromYmd, longDay, dayName, hm, stamp, ago,
  normPhone, showPhone, validPhone, wa, mapsUrl, initials, first, plate, links, DEPT, DEPT_FLOWS, STEPS, TRIP,
  flowLabel, flowShort, statusLabel, actionLabel, groupOf, nextStatus, prevStatus, METHODS, ROLES, MON,
  toast, copyText, frame, busy, tracker, compressImage, demoBanner, BRAND, setBrand
} from './core.js';

const S = {
  A: null, uid: null, me: null, settings: null, team: [], boot: 'loading', bootErr: '',
  view: '', day: today(), dept: 'all', stf: 'open', runsWho: 'all',
  board: null, boardDay: '', boardErr: '',
  custQ: '', custF: 'all', custList: null, custT: null,
  period: 'today', report: null, reportKey: '', reportErr: '',
  expDraft: { day: today(), cat: 'Supplies & chemicals', amount: '', note: '', dept: '' },
  teamFull: null, setDraft: null, manageTab: 'team',
  sheet: null, form: null, photos: {}, auth: { mode: 'in', phone: '', pin: '', name: '', pin2: '', err: '', busy: false },
};
const EXP_CATS = ['Supplies & chemicals', 'Water & power', 'Fuel & transport', 'Wages & commissions', 'Equipment & repairs', 'Marketing', 'Airtime & data', 'Other'];
const SOURCES = ['Walk-in', 'WhatsApp', 'Call', 'Instagram', 'TikTok', 'Referral'];
const FUEL = ['E', '¼', '½', '¾', 'F'];
const PANELS = ['Front bumper', 'Rear bumper', 'Bonnet', 'Boot', 'Roof', 'Left side', 'Right side', 'Windscreen', 'Mirrors', 'Wheels & rims', 'Lights', 'Interior'];

/* ---------- role helpers ---------- */
const role = () => S.me ? S.me.role : '';
const isOwner = () => role() === 'superadmin';
const isMgr = () => role() === 'superadmin' || role() === 'dept_admin';
const manages = d => isOwner() || (role() === 'dept_admin' && (S.me.depts || []).includes(d));
const deptName = k => ((S.settings && S.settings.depts) || []).find(d => d.key === k)?.name || k;
const deptOn = k => !!((S.settings && S.settings.depts) || []).find(d => d.key === k && d.on);
const myDepts = () => isOwner() ? (S.settings.depts || []).filter(d => d.on).map(d => d.key) : (S.me.depts || []);
const bookDepts = () => isOwner() ? (S.settings.depts || []).filter(d => d.on).map(d => d.key) : (S.me.depts || []).filter(deptOn);
const svc = id => (S.settings.services || []).find(s => s.id === id);
// per-square-foot lines (carpets): qty is the total area; sizes lists each piece
const isSqft = l => l.unit === 'sqft' || (svc(l.sid) || {}).unit === 'sqft';
const qtyNote = l => isSqft(l) ? ' · ' + l.qty + ' sq ft' + (l.sizes ? ' (' + l.sizes + ')' : '') : l.qty > 1 ? ' ×' + l.qty : '';
const nameOf = id => { if (!id) return ''; if (S.me && id === S.me.id) return 'you'; const t = S.team.find(x => x.id === id); return t ? t.name : ''; };
const biz = () => (S.settings && S.settings.business) || 'PitStop 87';
function tabsFor() {
  switch (role()) {
    case 'superadmin': return [['board', 'Board'], ['runs', 'Runs'], ['customers', 'Customers'], ['reports', 'Reports'], ['manage', 'Manage']];
    case 'dept_admin': return [['board', 'Board'], ['runs', 'Runs'], ['customers', 'Customers'], ['reports', 'Reports'], ['manage', 'Team']];
    case 'attendant': return [['board', 'My jobs'], ['runs', 'Runs'], ['customers', 'Customers'], ['reports', 'My pay']];
    case 'rider': return [['runs', 'My runs'], ['reports', 'My pay']];
    case 'financier': return [['reports', 'Reports']];
  }
  return [];
}
const ICONS = {
  board: '<path d="M5 21V4M5 4h12l-2.5 4L17 12H5"/>',
  runs: '<circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8.2 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.8"/>',
  customers: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>',
  reports: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  manage: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
};
const icon = k => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[k] + '</svg>';

/* ---------- boot ---------- */
async function boot() {
  try { S.A = await api(); } catch (e) { S.boot = 'error'; S.bootErr = e.message; renderAll(); return; }
  S.A.auth.onChange(uid => { if (uid !== S.uid) { S.uid = uid; loadMe(); } });
  S.uid = await S.A.auth.uid();
  await loadMe();
  setInterval(() => { if (document.visibilityState === 'visible' && S.me && S.boot === 'ready' && ['board', 'runs'].includes(S.view) && !S.sheet) loadBoard(true); }, 20000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.boot === 'ready' && ['board', 'runs'].includes(S.view)) loadBoard(true); });
}
async function loadMe() {
  if (!S.uid) { S.me = null; S.boot = 'auth'; renderAll(); return; }
  try {
    const r = await S.A.rpc('staff_me');
    if (!r.me) { S.me = null; S.boot = 'join'; renderAll(); return; }
    S.me = r.me; S.settings = r.settings; S.team = r.team || [];
    if (S.me.role === 'pending' || !S.me.active) { S.boot = 'pending'; renderAll(); return; }
    S.boot = 'ready';
    if (!tabsFor().some(t => t[0] === S.view)) S.view = tabsFor()[0][0];
    if (S.view === 'board' || S.view === 'runs') loadBoard(); else renderAll();
  } catch (e) { S.boot = 'error'; S.bootErr = e.message; renderAll(); }
}
async function loadBoard(silent) {
  if (!silent) { S.boardDay !== S.day && (S.board = null); renderAll(); }
  try { S.board = await S.A.rpc('staff_board', { day: S.day }); S.boardDay = S.day; S.boardErr = ''; }
  catch (e) { S.boardErr = e.message; }
  renderMain();
  if (S.sheet && S.sheet.type === 'job') refreshJob(S.sheet.id);
}

/* ---------- shell ---------- */
function renderAll() { renderHeader(); renderMain(true); }
function renderHeader() {
  $('#biz').textContent = biz();
  $('#role').textContent = S.me && S.boot === 'ready' ? (ROLES[role()] || {}).name + ' · ' + S.me.name : 'Staff';
  // staff who work for one brand get its look (barbers → WaBarbers, nail techs → Pearl Her…);
  // the owner and anyone spanning brands get the Whale Wash ocean
  const mine = S.me && S.boot === 'ready' && !isOwner() ? [...new Set((S.me.depts || []).map(d => BRAND[d] || 'ww'))] : [];
  setBrand(mine.length === 1 ? mine[0] : '');
  const sy = $('#sync');
  sy.hidden = S.boot !== 'ready';
  sy.className = 'sync' + (S.boardErr ? '' : ' live'); sy.querySelector('span').textContent = DEMO ? 'Demo' : S.boardErr ? 'Offline' : CFG.local ? 'Local' : 'Live';
  $('#signout').hidden = !(S.uid && S.boot !== 'auth');
  const ban = $('#banner'), bi = $('#banner-in');
  let h = '';
  if (DEMO) h = demoBanner(S.uid ? ' <button class="link" data-act="demo-switch">Switch person</button> <button class="link" data-act="demo-reset" data-confirm="Tap again to reset">Reset demo</button>' : '') + ' <a href="' + esc(links.home) + '">Open the booking site</a>';
  else if (S.boardErr && S.boot === 'ready') h = '<span>' + esc(S.boardErr) + '</span>';
  ban.hidden = !h; bi.innerHTML = h;
  const tabs = S.boot === 'ready' ? tabsFor() : [];
  const nNew = S.board ? (S.board.unconfirmed || []).length : 0;
  $('#tabs').hidden = !tabs.length;
  $('#tabs .wrap').innerHTML = tabs.map(t => '<button class="tab" data-act="tab" data-v="' + t[0] + '"' + (S.view === t[0] ? ' aria-current="page"' : '') + '>' + icon(t[0]) + '<span>' + t[1] + '</span>' + (t[0] === 'board' && nNew ? '<span class="dot">' + nNew + '</span>' : '') + '</button>').join('');
  document.body.classList.toggle('has-tabs', !!tabs.length);
  $('#fab').hidden = !(S.boot === 'ready' && ['superadmin', 'dept_admin', 'attendant'].includes(role()) && ['board', 'customers'].includes(S.view));
}
let pendingMain = false, pendingSheet = false;
function renderMain(force) {
  renderHeader();
  const v = $('#view');
  if (!force && busy(v)) { pendingMain = true; return; }
  pendingMain = false;
  if (S.boot === 'loading') { v.innerHTML = '<p class="loading">Opening the pit wall…</p>'; return; }
  if (S.boot === 'error') { v.innerHTML = '<div class="empty"><h2>Something went wrong</h2><p>' + esc(S.bootErr) + '</p><button class="btn ghost" data-act="reload">Try again</button></div>'; return; }
  if (S.boot === 'auth' || S.boot === 'join') { v.innerHTML = viewAuth(); return; }
  if (S.boot === 'pending') { v.innerHTML = viewPending(); return; }
  const r = { board: viewBoard, runs: viewRuns, customers: viewCustomers, reports: viewReports, manage: viewManage }[S.view];
  v.innerHTML = r ? r() : '';
  if (S.view === 'customers') renderCustList();
}

/* ---------- auth ---------- */
function viewAuth() {
  const a = S.auth;
  if (DEMO && a.mode !== 'join') return '<div class="auth"><div class="auth-card"><h1>Who are you today?</h1><p class="muted" style="margin:0">Demo mode: pick a person to see the app the way they would. Each role sees different things.</p><div class="pick" id="pick"><p class="loading">Loading people…</p></div><button class="btn ghost" data-act="auth-mode" data-v="join">Join as new staff</button></div></div>';
  if (S.boot === 'join' || a.mode === 'join') return '<div class="auth"><form class="auth-card" id="auth-form" novalidate><h1>Join the team</h1><p class="muted" style="margin:0">' + (S.boot === 'join' ? 'One more step: add your name.' : 'Create your sign-in. The owner approves you and picks your role.') + '</p>'
    + (a.err ? '<div class="err" role="alert">' + esc(a.err) + '</div>' : '')
    + '<div class="field"><label for="a-name">Your name</label><input id="a-name" data-a="name" value="' + esc(a.name) + '" autocomplete="name"></div>'
    + (S.boot === 'join' ? '' : '<div class="field"><label for="a-phone">Phone number</label><input id="a-phone" data-a="phone" inputmode="tel" autocomplete="tel" value="' + esc(a.phone) + '" placeholder="0712 345 678"></div><div class="grid2"><div class="field"><label for="a-pin">Choose a 6-digit PIN</label><input id="a-pin" data-a="pin" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password" value="' + esc(a.pin) + '"></div><div class="field"><label for="a-pin2">PIN again</label><input id="a-pin2" data-a="pin2" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password" value="' + esc(a.pin2) + '"></div></div>')
    + '<button class="btn accent lg block" type="submit"' + (a.busy ? ' disabled' : '') + '>' + (a.busy ? 'Joining…' : 'Join') + '</button>'
    + (S.boot === 'join' ? '' : '<button class="link" type="button" data-act="auth-mode" data-v="in">I already have a PIN</button>') + '</form></div>';
  return '<div class="auth"><form class="auth-card" id="auth-form" novalidate><h1>Staff sign-in</h1>'
    + (a.err ? '<div class="err" role="alert">' + esc(a.err) + '</div>' : '')
    + '<div class="field"><label for="a-phone">Phone number</label><input id="a-phone" data-a="phone" inputmode="tel" autocomplete="username" value="' + esc(a.phone) + '" placeholder="0712 345 678"></div>'
    + '<div class="field"><label for="a-pin">PIN</label><input id="a-pin" data-a="pin" type="password" inputmode="numeric" maxlength="6" autocomplete="current-password" value="' + esc(a.pin) + '"></div>'
    + '<button class="btn accent lg block" type="submit"' + (a.busy ? ' disabled' : '') + '>' + (a.busy ? 'Signing in…' : 'Sign in') + '</button>'
    + '<p class="muted small" style="margin:0">Forgot your PIN? Ask the owner to reset it.</p>'
    + '<button class="link" type="button" data-act="auth-mode" data-v="join">New here? Join the team</button></form></div>';
}
async function fillPicker() {
  const el = $('#pick'); if (!el || !S.A.demo) return;
  const ppl = await S.A.demo.people();
  el.innerHTML = ppl.map(p => '<button data-act="demo-as" data-id="' + esc(p.id) + '"><span class="av">' + esc(initials(p.name)) + '</span><span><b>' + esc(p.name) + '</b><span class="muted">' + esc((ROLES[p.role] || {}).name || p.role) + (p.depts && p.depts.length ? ' · ' + esc(p.depts.map(deptNameRaw).join(', ')) : '') + '</span></span><span class="role-chip role-' + esc(p.role) + '">' + esc(p.role === 'superadmin' ? 'Owner' : p.role === 'dept_admin' ? 'Manager' : p.role === 'pending' ? 'Pending' : (ROLES[p.role] || {}).name || p.role) + '</span></button>').join('');
}
const deptNameRaw = k => ({ wash: 'Car wash', carpet: 'Carpets', garage: 'Car service', kinyozi: 'Kinyozi', nails: 'Nails', gas: 'Gas', water: 'Water', laundry: 'Laundry' }[k] || k);
async function submitAuth() {
  const a = S.auth; a.err = '';
  const join = S.boot === 'join' || a.mode === 'join';
  if (join && !a.name.trim()) a.err = 'Add your name.';
  else if (S.boot !== 'join' && !validPhone(a.phone)) a.err = 'Enter your phone number, like 0712 345 678.';
  else if (S.boot !== 'join' && !DEMO && !/^\d{6}$/.test(a.pin)) a.err = 'The PIN is 6 digits.';
  else if (join && S.boot !== 'join' && !DEMO && a.pin !== a.pin2) a.err = 'The two PINs don\'t match.';
  if (a.err) { renderMain(true); return; }
  a.busy = true; renderMain(true);
  try {
    if (S.boot === 'join') { await S.A.rpc('staff_join', { name: a.name.trim(), phone: a.phone }); }
    else if (join) { S.uid = await S.A.auth.signUp(a.name.trim(), a.phone, a.pin); await S.A.rpc('staff_join', { name: a.name.trim(), phone: a.phone }); }
    else { S.uid = await S.A.auth.signIn(a.phone, a.pin); }
    a.pin = ''; a.pin2 = ''; a.busy = false; a.mode = 'in';
    await loadMe();
  } catch (e) { a.err = e.message; a.busy = false; renderMain(true); }
}
function viewPending() {
  const off = S.me && !S.me.active;
  return '<div class="auth"><div class="auth-card"><span class="role-chip role-pending">' + (off ? 'Switched off' : 'Waiting for approval') + '</span><h1>' + (off ? 'Your account is switched off' : 'Thanks, ' + esc(first(S.me ? S.me.name : '')) + '. You\'re in the queue.') + '</h1>'
    + '<p class="muted" style="margin:0">' + (off ? 'Ask the owner to turn it back on.' : 'Ask the owner to approve you in Manage → Team. They\'ll pick your role and department.') + '</p>'
    + '<div class="row-btns"><button class="btn primary" data-act="reload-me">Check again</button><button class="btn ghost" data-act="signout">Sign out</button></div></div></div>';
}

/* ---------- board ---------- */
function payPill(j) {
  if (j.status === 'cancelled' || !(+j.total)) return (j.lines || []).some(l => l.member_id) ? '<span class="pill p-member">Membership</span>' : '';
  if (j.balance <= 0) return '<span class="pill p-paid">Paid</span>';
  if (j.paid > 0) return '<span class="pill p-part">' + kes(j.balance) + ' due</span>';
  return '<span class="pill p-unpaid">Unpaid</span>';
}
function isLate(j) {
  const now = Date.now(); const at = new Date(j.day + 'T' + t5(j.slot));
  if (['booked', 'waiting'].includes(j.status) && j.day <= today()) return at.getTime() < now - 30 * 60e3;
  if (['ready', 'returning'].includes(j.status) && j.flow === 'valet' && j.drop_slot) return new Date(j.day + 'T' + t5(j.drop_slot)).getTime() < now;
  return false;
}
function canStep(j, nx) { if (!nx) return false; if (role() === 'rider') return ['enroute', 'collected', 'returning', 'done'].includes(nx) && j.flow !== 'walkin'; return ['superadmin', 'dept_admin', 'attendant'].includes(role()); }
function jobRow(j, opts) {
  opts = opts || {};
  const g = groupOf(j.status), late = isLate(j), nx = nextStatus(j);
  const meta = [];
  (j.items || []).filter(i => i.kind === 'vehicle').forEach(i => meta.push('<span class="plate">' + esc(i.label) + '</span>'));
  meta.push('<span>' + esc(flowShort(j.flow)) + (j.area ? ' · ' + esc(j.area) : '') + '</span>');
  const team = [j.staff_name, j.valet_name && j.valet_name !== j.staff_name ? j.valet_name : ''].filter(Boolean).join(', ');
  meta.push('<span>' + (team ? esc(team) : '<i>Unassigned</i>') + '</span>');
  if (opts.showDay) meta.push('<span>' + esc(dayName(j.day)) + '</span>');
  const isNew = !j.confirmed && j.status !== 'cancelled';
  const tb = isNew ? 'g-new' : late ? 'late' : 'g-' + g;
  return '<article class="job" data-act="open-job" data-id="' + esc(j.id) + '" tabindex="0">'
    + '<div class="tbox ' + tb + '"><b>' + esc(t5(j.slot)) + '</b><span>' + (isNew ? 'NEW' : late ? 'LATE' : esc(String(j.id).replace('PS-', ''))) + '</span></div>'
    + '<div class="jm"><div class="j1"><span class="jn">' + esc(j.customer ? j.customer.name : 'Customer') + '</span><span class="dc">' + esc(DEPT[j.dept].code) + '</span>' + ((j.siblings || []).length ? '<span class="muted small">+ ' + j.siblings.map(s => esc(DEPT[s.dept].code)).join(' ') + '</span>' : '') + '</div>'
    + '<div class="js">' + esc((j.lines || []).map(l => l.name + qtyNote(l)).join(', ')) + '</div><div class="jmeta">' + meta.join('') + '</div></div>'
    + '<div class="jside"><span class="pill ' + (isNew ? 's-new' : 's-' + g) + '">' + esc(isNew ? 'New · confirm' : statusLabel(j.status, j)) + '</span>' + payPill(j)
    + (isNew && role() !== 'rider' ? '<button class="btn sm accent" data-act="confirm" data-id="' + esc(j.id) + '">Confirm</button>' : canStep(j, nx) ? '<button class="btn sm primary" data-act="advance" data-id="' + esc(j.id) + '">' + esc(actionLabel(nx, j)) + '</button>' : '') + '</div></article>';
}
function viewBoard() {
  const B = S.board;
  const head = '<div class="vh"><div class="day"><button class="icon-btn" data-act="day" data-v="-1" aria-label="Previous day">‹</button><h1>' + esc(role() === 'attendant' && S.day === today() ? 'My jobs today' : dayName(S.day)) + '</h1><button class="icon-btn" data-act="day" data-v="1" aria-label="Next day">›</button></div><span class="sub">' + esc(longDay(S.day)) + '</span>' + (S.day !== today() ? '<button class="link" data-act="day" data-v="0">Back to today</button>' : '') + '</div>';
  if (!B) return head + (S.boardErr ? '<div class="err">' + esc(S.boardErr) + '</div>' : '<p class="loading">Loading the board…</p>');
  const inDept = j => S.dept === 'all' || j.dept === S.dept;
  const jobs = B.jobs.filter(inDept);
  const cnt = g => jobs.filter(j => groupOf(j.status) === g).length;
  const toCollect = jobs.reduce((a, j) => a + (j.balance || 0), 0);
  const owed = (B.owed || []).filter(inDept);
  const unconf = (B.unconfirmed || []).filter(inDept);
  let list;
  if (S.stf === 'owed') list = owed;
  else list = jobs.filter(j => S.stf === 'open' ? !['done', 'cancelled'].includes(j.status) && (j.confirmed || !unconf.some(u => u.id === j.id)) : S.stf === 'done' ? ['done', 'cancelled'].includes(j.status) : true);
  const ds = role() === 'attendant' ? (S.me.depts || []) : myDepts();
  const chips = ds.length > 1 ? '<div class="chips" aria-label="Department">' + ['all'].concat(ds).map(k => {
    const n = k === 'all' ? B.jobs.length : B.jobs.filter(j => j.dept === k).length;
    return '<button class="chip" data-act="dept" data-v="' + k + '" aria-pressed="' + (S.dept === k) + '">' + (k === 'all' ? 'All' : '<span class="dc">' + DEPT[k].code + '</span>' + esc(deptName(k))) + ' <span class="n">' + n + '</span></button>';
  }).join('') + '</div>' : '';
  const seg = '<div class="seg" aria-label="Show">' + [['open', 'Open'], ['done', 'Done'], ['owed', 'Owed · ' + owed.length], ['all', 'All']].map(s => '<button data-act="stf" data-v="' + s[0] + '" aria-pressed="' + (S.stf === s[0]) + '">' + s[1] + '</button>').join('') + '</div>';
  const newBox = unconf.length ? '<section class="group"><div class="sec-h">New bookings to confirm · ' + unconf.length + '</div><div class="list">' + unconf.map(j => jobRow(j, { showDay: j.day !== S.day })).join('') + '</div></section>' : '';
  let body;
  if (list.length) body = '<div class="list">' + list.map(j => jobRow(j, { showDay: S.stf === 'owed' })).join('') + '</div>';
  else if (S.stf === 'owed') body = '<div class="empty"><h2>Nobody owes you</h2><p>Finished jobs with a balance show up here until they\'re paid.</p></div>';
  else body = '<div class="empty"><h2>' + (S.stf === 'done' ? 'Nothing finished yet' : jobs.length && S.stf === 'open' ? 'All done for ' + esc(dayName(S.day).toLowerCase()) : 'Nothing booked for ' + esc(dayName(S.day).toLowerCase())) + '</h2><p>' + (role() === 'attendant' ? 'Jobs assigned to you, and unassigned jobs in your department, show up here.' : 'New bookings from the website, WhatsApp and walk-ins appear here.') + '</p>' + (role() !== 'rider' ? '<button class="btn accent" data-act="new">New booking</button>' : '') + '</div>';
  return head
    + '<div class="kpis"><div class="kpi"><b>' + cnt('queued') + '</b><span>Waiting</span></div><div class="kpi k-active"><b>' + cnt('active') + '</b><span>In progress</span></div><div class="kpi k-ready"><b>' + cnt('ready') + '</b><span>Ready</span></div><div class="kpi k-done"><b>' + cnt('done') + '</b><span>Done</span></div><div class="kpi k-owe wide"><b>' + num(toCollect) + '</b><span>KES to collect</span></div></div>'
    + newBox + chips + '<div class="bar">' + seg + '</div>' + body;
}

/* ---------- runs ---------- */
function viewRuns() {
  const B = S.board;
  const head = '<div class="vh"><div class="day"><button class="icon-btn" data-act="day" data-v="-1" aria-label="Previous day">‹</button><h1>' + esc(role() === 'rider' && S.day === today() ? 'My runs today' : 'Runs · ' + dayName(S.day)) + '</h1><button class="icon-btn" data-act="day" data-v="1" aria-label="Next day">›</button></div>' + (S.day !== today() ? '<button class="link" data-act="day" data-v="0">Back to today</button>' : '') + '</div>';
  if (!B) return head + '<p class="loading">Loading runs…</p>';
  const who = S.runsWho;
  const stops = [];
  for (const j of B.jobs) {
    if (j.status === 'cancelled') continue;
    if (who !== 'all' && who !== 'free' && j.valet_id !== who && !(j.flow === 'home' && j.staff_id === who)) continue;
    if (who === 'free' && (j.flow === 'home' ? j.staff_id : j.valet_id)) continue;
    if (j.flow === 'valet') { if (['booked', 'enroute'].includes(j.status)) stops.push({ j, kind: 'Pickup', t: j.slot }); if (['ready', 'returning'].includes(j.status)) stops.push({ j, kind: 'Drop-off', t: j.drop_slot || j.slot }); }
    else if (j.flow === 'home' && ['booked', 'enroute'].includes(j.status)) stops.push({ j, kind: 'Home visit', t: j.slot });
    else if (j.flow === 'delivery' && ['booked', 'returning'].includes(j.status)) stops.push({ j, kind: 'Delivery', t: j.slot });
  }
  const later = B.jobs.filter(j => j.flow === 'valet' && ['collected', 'service'].includes(j.status) && (who === 'all' || j.valet_id === who));
  const groups = {}; stops.forEach(s => { const a = s.j.area || 'No area set'; (groups[a] = groups[a] || []).push(s); });
  const order = Object.keys(groups).sort((a, b) => String(groups[a].map(s => s.t).sort()[0]).localeCompare(String(groups[b].map(s => s.t).sort()[0])));
  const n = k => stops.filter(s => s.kind === k).length;
  const people = S.team.filter(t => ['rider', 'attendant', 'dept_admin', 'superadmin'].includes(t.role));
  const sel = role() === 'rider' ? '' : '<div class="field" style="max-width:260px"><label for="runs-who">Show runs for</label><select id="runs-who" data-change="runs-who"><option value="all">Everyone</option><option value="free"' + (who === 'free' ? ' selected' : '') + '>Not assigned yet</option>' + people.map(s => '<option value="' + esc(s.id) + '"' + (who === s.id ? ' selected' : '') + '>' + esc(s.name) + '</option>').join('') + '</select></div>';
  const stopHtml = s => {
    const j = s.j, late = isLate(j), nx = nextStatus(j);
    const c = j.customer || {};
    const what = DEPT[j.dept].vehicle ? 'car' : DEPT[j.dept].pieces ? 'items' : 'order';
    const msg = s.kind === 'Drop-off' ? 'Hi ' + first(c.name) + ', your ' + what + ' is ready and on its way back to you. — ' + biz() : 'Hi ' + first(c.name) + ', this is ' + biz() + '. We\'re on our way to you for booking ' + j.id + '.';
    const free = j.flow === 'home' ? !j.staff_id : !j.valet_id;
    return '<div class="stop"><div class="tbox ' + (late ? 'late' : 'g-' + groupOf(j.status)) + '"><b>' + esc(t5(s.t)) + '</b><span>' + (late ? 'LATE' : esc(String(j.id).replace('PS-', ''))) + '</span></div>'
      + '<div class="info"><span class="kind">' + esc(s.kind) + ' · ' + esc(DEPT[j.dept].code) + (j.valet_name ? ' · ' + esc(j.valet_name) : '') + '</span><b data-act="open-job" data-id="' + esc(j.id) + '" style="cursor:pointer">' + esc(c.name || 'Customer') + '</b>'
      + '<span class="where">' + esc(j.landmark || 'No directions yet') + '</span><span class="js">' + esc((j.lines || []).map(l => l.name).join(', ')) + ' ' + (j.items || []).filter(i => i.kind === 'vehicle').map(i => '<span class="plate">' + esc(i.label) + '</span>').join(' ') + '</span></div>'
      + '<div class="acts">' + (c.phone ? '<a class="btn sm wa" href="' + esc(wa(c.phone, msg)) + '" target="_blank" rel="noopener">WhatsApp</a>' : '') + '<a class="btn sm ghost" href="' + esc(mapsUrl(j)) + '" target="_blank" rel="noopener">Directions</a>'
      + (free && ['rider', 'attendant'].includes(role()) ? '<button class="btn sm ghost" data-act="take" data-id="' + esc(j.id) + '" data-as="' + (j.flow === 'home' ? 'staff' : 'valet') + '">Take this run</button>' : '')
      + (canStep(j, nx) ? '<button class="btn sm primary" data-act="advance" data-id="' + esc(j.id) + '">' + esc(actionLabel(nx, j)) + '</button>' : '') + '</div></div>';
  };
  const body = stops.length ? order.map(a => '<div class="group"><div class="sec-h">' + esc(a) + ' · ' + groups[a].length + (groups[a].length === 1 ? ' stop' : ' stops') + '</div><div class="list">' + groups[a].sort((x, y) => String(x.t).localeCompare(String(y.t))).map(stopHtml).join('') + '</div></div>').join('')
    : '<div class="empty"><h2>No runs waiting</h2><p>Pickups, drop-offs, home visits and deliveries for ' + esc(dayName(S.day).toLowerCase()) + ' appear here, grouped by area so one trip can cover several homes.</p></div>';
  const laterHtml = later.length ? '<div class="group"><div class="sec-h">At the shop · back to customers later</div><div class="list">' + later.map(j => '<div class="stop"><div class="tbox g-active"><b>' + esc(t5(j.drop_slot) || '—') + '</b><span>DROP</span></div><div class="info"><b data-act="open-job" data-id="' + esc(j.id) + '" style="cursor:pointer">' + esc(j.customer.name) + '</b><span class="js">' + esc(statusLabel(j.status, j)) + ' · ' + esc(j.area || '') + '</span></div></div>').join('') + '</div></div>' : '';
  return head + '<div class="kpis"><div class="kpi"><b>' + n('Pickup') + '</b><span>Pickups</span></div><div class="kpi k-ready"><b>' + n('Drop-off') + '</b><span>Drop-offs</span></div><div class="kpi"><b>' + n('Home visit') + '</b><span>Home visits</span></div><div class="kpi"><b>' + n('Delivery') + '</b><span>Deliveries</span></div><div class="kpi k-active"><b>' + later.length + '</b><span>Back later</span></div></div>' + sel + body + laterHtml;
}

/* ---------- customers ---------- */
function viewCustomers() {
  const chips = [['all', 'Everyone'], ['members', 'Members'], ['due', 'Due for a wash'], ['owing', 'Owing']].map(c => '<button class="chip" data-act="custf" data-v="' + c[0] + '" aria-pressed="' + (S.custF === c[0]) + '">' + c[1] + '</button>').join('');
  return '<div class="vh"><h1>Customers</h1></div>'
    + '<div class="field"><label for="cust-q">Search by name, phone or plate</label><input id="cust-q" type="search" autocomplete="off" value="' + esc(S.custQ) + '" placeholder="Wanjiru, 0712…, KDA 412M"></div>'
    + '<div class="chips">' + chips + '</div>' + (S.custF === 'due' ? '<p class="muted small" style="margin:0">Customers with a car who haven\'t been in for two weeks. Send them a nudge.</p>' : '')
    + '<div id="cust-list"><p class="loading">Loading…</p></div>';
}
async function loadCustomers() {
  try { S.custList = await S.A.rpc('staff_customers', { q: S.custQ, filter: S.custF }); } catch (e) { S.custList = { err: e.message }; }
  renderCustList();
}
function renderCustList() {
  const el = $('#cust-list'); if (!el) return;
  if (S.custList === null) { loadCustomers(); return; }
  if (S.custList.err) { el.innerHTML = '<div class="err">' + esc(S.custList.err) + '</div>'; return; }
  const list = S.custList;
  if (!list.length) { el.innerHTML = '<div class="empty"><h2>' + (S.custQ ? 'No matches' : 'No customers here yet') + '</h2><p>' + (S.custQ ? 'Try a different name, phone number or plate.' : 'Customers are saved automatically when they book.') + '</p></div>'; return; }
  el.innerHTML = '<div class="list">' + list.map(c => '<div class="crow" data-act="open-cust" data-id="' + esc(c.id) + '" tabindex="0"><span class="av" aria-hidden="true">' + esc(initials(c.name)) + '</span>'
    + '<div class="cinfo"><b>' + esc(c.name || 'No name') + '</b><span class="jmeta">' + esc(showPhone(c.phone)) + (c.area ? ' · ' + esc(c.area) : '') + (c.plates || []).map(p => ' <span class="plate">' + esc(p) + '</span>').join('') + '</span></div>'
    + '<div class="cside"><span>' + esc(ago(c.last_visit)) + '</span>' + (c.member ? '<span class="pill p-member">' + esc(c.member) + '</span>' : '') + (c.owing ? '<span class="pill p-unpaid">' + kes(c.owing) + '</span>' : '') + '</div></div>').join('') + '</div>'
    + (list.length >= 200 ? '<p class="muted">Showing the 200 most recent. Search to find others.</p>' : '');
}

/* ---------- reports ---------- */
function periodRange(p) {
  const t = new Date();
  if (p === 'today') return { from: today(), to: today(), label: 'Today' };
  if (p === 'yesterday') { const y = ymd(addDays(t, -1)); return { from: y, to: y, label: 'Yesterday' }; }
  if (p === 'week') return { from: ymd(addDays(t, -6)), to: today(), label: 'Last 7 days' };
  if (p === 'month') return { from: ymd(new Date(t.getFullYear(), t.getMonth(), 1)), to: today(), label: MON[t.getMonth()] + ' so far' };
  const a = new Date(t.getFullYear(), t.getMonth() - 1, 1), b = new Date(t.getFullYear(), t.getMonth(), 0);
  return { from: ymd(a), to: ymd(b), label: MON[a.getMonth()] + ' ' + a.getFullYear() };
}
async function loadReport() {
  const r = periodRange(S.period); const key = S.period + r.from;
  S.reportKey = key; S.report = null; S.reportErr = '';
  try { const x = await S.A.rpc('staff_report', { from: r.from, to: r.to }); if (S.reportKey === key) S.report = x; }
  catch (e) { if (S.reportKey === key) S.reportErr = e.message; }
  if (S.view === 'reports') renderMain(true);
}
function bars(rows, fmt) { const max = Math.max(1, ...rows.map(r => r[1])); return rows.length ? '<div class="bars">' + rows.map(r => '<div class="barrow"><span class="lab" title="' + esc(r[0]) + '">' + esc(r[0]) + '</span><span class="tr"><i style="width:' + (r[1] / max * 100).toFixed(1) + '%"></i></span><b>' + fmt(r) + '</b></div>').join('') + '</div>' : '<p class="muted" style="margin:0">Nothing in this period.</p>'; }
function viewReports() {
  const r = periodRange(S.period); const key = S.period + r.from;
  if (S.reportKey !== key) loadReport();
  const chips = [['today', 'Today'], ['yesterday', 'Yesterday'], ['week', '7 days'], ['month', 'This month'], ['last', 'Last month']].map(c => '<button class="chip" data-act="period" data-v="' + c[0] + '" aria-pressed="' + (S.period === c[0]) + '">' + c[1] + '</button>').join('');
  const mine = ['attendant', 'rider'].includes(role());
  const head = '<div class="vh"><h1>' + (mine ? 'My pay' : 'Reports') + '</h1><span class="sub">' + esc(r.label) + (r.from !== r.to ? ' · ' + esc(longDay(r.from)) + ' to ' + esc(longDay(r.to)) : '') + '</span></div><div class="chips">' + chips + '</div>';
  const R = S.report;
  if (S.reportErr) return head + '<div class="err">' + esc(S.reportErr) + '</div>';
  if (!R) return head + '<p class="loading">Adding up the numbers…</p>';
  const M = R.mine || {};
  if (R.scope === 'mine') return head + '<div class="tiles" style="grid-template-columns:repeat(2,minmax(0,1fr))"><div class="tile"><span>Jobs done</span><b>' + num(M.jobs) + '</b></div><div class="tile"><span>Valet runs</span><b>' + num(M.runs) + '</b></div><div class="tile"><span>Your sales</span><b>' + num(M.sales) + '</b><small>KES, jobs you did</small></div><div class="tile t-hero"><span>Commission</span><b>' + num(M.commission) + '</b><small>KES at ' + num(M.rate) + '%</small></div></div><p class="muted small" style="margin:0">Counts finished jobs with your name on them. Ask your manager if something is missing.</p>';
  const full = R.profit !== undefined;
  const deptRows = (R.by_dept || []).map(x => [deptName(x.dept), x.amount, x.jobs]);
  if (R.fees) deptRows.push(['Pickup fees', R.fees, 0]);
  const hmax = Math.max(1, ...(R.hours || [0]));
  const hours = '<div class="hours" role="img" aria-label="Jobs by hour of day">' + (R.hours || []).map((c, i) => { const h = i + 6; return '<div class="h"><span class="c">' + (c || '') + '</span><span class="col"><i style="height:' + (c / hmax * 100).toFixed(1) + '%"></i></span><span class="hl">' + (h % 3 === 0 ? (h > 12 ? h - 12 : h) + (h < 12 ? 'a' : 'p') : '') + '</span></div>'; }).join('') + '</div>';
  const team = (R.team || []).length ? '<div class="tscroll"><table class="t"><thead><tr><th>Name</th><th class="num">Jobs</th><th class="num">Runs</th><th class="num">Sales KES</th><th class="num">Commission KES</th></tr></thead><tbody>' + R.team.map(t => '<tr><td>' + esc(t.name) + '</td><td class="num">' + t.jobs + '</td><td class="num">' + t.runs + '</td><td class="num">' + num(t.sales) + '</td><td class="num">' + num(t.commission) + '</td></tr>').join('') + '</tbody></table></div>' : '<p class="muted" style="margin:0">Assign jobs to people to see their numbers here.</p>';
  const ed = S.expDraft; const canExp = isMgr();
  const expForm = canExp ? '<div class="grid2"><div class="field"><label for="x-day">Date</label><input id="x-day" type="date" data-xf="day" value="' + esc(ed.day) + '"></div><div class="field"><label for="x-amount">Amount (KES)</label><input id="x-amount" inputmode="numeric" data-xf="amount" value="' + esc(ed.amount) + '" placeholder="0"></div></div>'
    + '<div class="grid2"><div class="field"><label for="x-cat">Category</label><select id="x-cat" data-xf="cat">' + EXP_CATS.map(c => '<option' + (ed.cat === c ? ' selected' : '') + '>' + esc(c) + '</option>').join('') + '</select></div><div class="field"><label for="x-dept">Department</label><select id="x-dept" data-xf="dept">' + (isOwner() ? '<option value="">Whole business</option>' : '') + myDepts().map(k => '<option value="' + k + '"' + (ed.dept === k ? ' selected' : '') + '>' + esc(deptName(k)) + '</option>').join('') + '</select></div></div>'
    + '<div class="field"><label for="x-note">Note</label><input id="x-note" data-xf="note" value="' + esc(ed.note) + '" placeholder="What was it for?"></div><div class="row-btns"><button class="btn primary sm" data-act="exp-add">Add expense</button></div>' : '';
  const expList = (R.expense_list || []).length ? '<div>' + R.expense_list.map(e => '<div class="exp-row"><span><b>' + esc(e.cat) + '</b><br><span class="muted">' + esc(dayName(e.day)) + (e.dept ? ' · ' + esc(deptName(e.dept)) : '') + (e.note ? ' · ' + esc(e.note) : '') + '</span></span><b>' + kes(e.amount) + '</b>' + (canExp && (isOwner() || (S.me.depts || []).includes(e.dept)) ? '<button class="btn sm danger" data-act="exp-del" data-id="' + esc(e.id) + '" data-confirm="Delete?">Delete</button>' : '<span></span>') + '</div>').join('') + '</div>' : '<p class="muted" style="margin:0">No expenses in this period.</p>';
  return head
    + (R.scope === 'depts' ? '<p class="muted small" style="margin:0">Showing ' + esc((R.depts || []).map(deptName).join(', ')) + ' only.</p>' : '')
    + '<div class="tiles"><div class="tile"><span>Sales</span><b>' + num(R.sales) + '</b><small>' + R.jobs + ' jobs done · ' + R.open + ' open</small></div>'
    + '<div class="tile"><span>Collected</span><b>' + num(R.collected) + '</b><small>KES received</small></div>'
    + '<div class="tile"><span>Still owed</span><b>' + num(R.owed) + '</b><small>KES on these jobs</small></div>'
    + '<div class="tile"><span>Expenses</span><b>' + num(R.expenses) + '</b><small>' + (R.expense_list || []).length + ' entries</small></div>'
    + (full ? '<div class="tile t-hero"><span>Profit (cash)</span><b>' + (R.profit < 0 ? '−' : '') + num(Math.abs(R.profit)) + '</b><small>Collected minus expenses</small></div>' : '<div class="tile t-hero"><span>Memberships sold</span><b>' + num(R.memberships.amount) + '</b><small>' + R.memberships.count + ' sold · ' + R.active_members + ' active</small></div>') + '</div>'
    + '<div class="cols2"><div class="card"><h3>Sales by service line</h3>' + bars(deptRows, x => num(x[1])) + (R.discounts ? '<p class="muted small" style="margin:0">Discounts given: ' + kes(R.discounts) + '</p>' : '') + '</div>'
    + '<div class="card"><h3>Memberships</h3><dl class="kv"><dt>Sold</dt><dd>' + R.memberships.count + ' · ' + kes(R.memberships.amount) + '</dd><dt>Active now</dt><dd>' + R.active_members + '</dd><dt>Visits used</dt><dd>' + R.member_uses + '</dd>' + (R.new_customers != null ? '<dt>New customers</dt><dd>' + R.new_customers + '</dd>' : '') + '</dl></div>'
    + '<div class="card"><h3>Busiest hours</h3>' + hours + '<p class="muted small" style="margin:0">Finished jobs by booking time, 6am to 9pm.</p></div>'
    + '<div class="card"><h3>How customers paid</h3>' + bars((R.methods || []).map(x => [METHODS[x.method] || x.method, x.amount]), x => num(x[1])) + '</div>'
    + '<div class="card"><h3>Pickups by area</h3>' + bars((R.areas || []).map(x => [x.area, x.jobs]), x => String(x[1])) + '</div>'
    + '<div class="card"><h3>Expenses by category</h3>' + bars((R.expense_cats || []).map(x => [x.cat, x.amount]), x => num(x[1])) + '</div></div>'
    + '<div class="card"><h3>Team</h3>' + team + '</div>'
    + '<div class="card"><h3>Expenses</h3>' + expForm + expList + '</div>'
    + '<div class="row-btns"><button class="btn ghost" data-act="export">Download this report (CSV)</button></div>';
}
function csv(rows) { return rows.map(r => r.map(v => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\n'); }
function downloadReport() {
  const R = S.report; if (!R) return; const p = periodRange(S.period);
  const rows = [['Report', biz(), p.from + ' to ' + p.to], [], ['Sales', R.sales], ['Collected', R.collected], ['Still owed', R.owed], ['Expenses', R.expenses]];
  if (R.profit !== undefined) rows.push(['Profit (cash)', R.profit]);
  rows.push([], ['Service line', 'Sales KES', 'Jobs']); (R.by_dept || []).forEach(x => rows.push([deptName(x.dept), x.amount, x.jobs]));
  rows.push([], ['Payment method', 'KES']); (R.methods || []).forEach(x => rows.push([METHODS[x.method] || x.method, x.amount]));
  rows.push([], ['Team', 'Jobs', 'Runs', 'Sales KES', 'Commission KES']); (R.team || []).forEach(x => rows.push([x.name, x.jobs, x.runs, x.sales, x.commission]));
  rows.push([], ['Expense date', 'Category', 'Department', 'KES', 'Note']); (R.expense_list || []).forEach(e => rows.push([e.day, e.cat, e.dept ? deptName(e.dept) : '', e.amount, e.note]));
  const blob = new Blob([csv(rows)], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'pitstop-report-' + p.from + '-to-' + p.to + '.csv'; document.body.appendChild(a); a.click(); a.remove();
}

/* ---------- manage: team + settings ---------- */
function viewManage() {
  const tabs = isOwner() ? '<div class="seg big" style="align-self:start">' + [['team', 'Team'], ['settings', 'Prices & settings'], ['links', 'Links']].map(t => '<button data-act="mtab" data-v="' + t[0] + '" aria-pressed="' + (S.manageTab === t[0]) + '">' + t[1] + '</button>').join('') + '</div>' : '';
  const tab = isOwner() ? S.manageTab : 'team';
  return '<div class="vh"><h1>' + (isOwner() ? 'Manage' : 'Team') + '</h1></div>' + tabs + (tab === 'team' ? viewTeam() : tab === 'links' ? viewLinks() : viewSettings());
}
async function loadTeam() { try { S.teamFull = await S.A.rpc('staff_team'); } catch (e) { S.teamFull = { err: e.message }; } if (S.view === 'manage') renderMain(true); }
function viewTeam() {
  if (!S.teamFull) { loadTeam(); return '<p class="loading">Loading the team…</p>'; }
  if (S.teamFull.err) return '<div class="err">' + esc(S.teamFull.err) + '</div>';
  const pend = S.teamFull.filter(t => t.role === 'pending' && t.active);
  const rest = S.teamFull.filter(t => !(t.role === 'pending' && t.active));
  const person = t => '<div class="person"><span><b>' + esc(t.name) + '</b> <span class="role-chip role-' + esc(t.role) + '">' + esc((ROLES[t.role] || {}).name || t.role) + '</span>' + (t.active ? '' : ' <span class="pill">Switched off</span>') + '<br><span class="muted small">' + esc(showPhone(t.phone)) + (t.depts && t.depts.length ? ' · ' + esc(t.depts.map(deptName).join(', ')) : '') + (+t.commission ? ' · ' + esc(t.commission) + '% commission' : '') + '</span></span>'
    + (isOwner() ? '<button class="btn ghost sm" data-act="person" data-id="' + esc(t.id) + '">' + (t.role === 'pending' ? 'Approve' : 'Edit') + '</button>' : '<span></span>') + '</div>';
  return (pend.length && isOwner() ? '<div class="card"><h3>Waiting for approval · ' + pend.length + '</h3><div>' + pend.map(person).join('') + '</div></div>' : '')
    + '<div class="card"><h3>' + (isOwner() ? 'Everyone' : 'Your departments') + '</h3><div>' + rest.map(person).join('') + '</div></div>'
    + (isOwner() ? '<div class="card"><h3>Adding someone</h3><p style="margin:0;font-size:13px">Send them the staff link from the Links tab. They join with their phone number and a PIN, then show up here for you to approve.</p><div class="row-btns"><span class="copyline"><code id="staff-link">' + esc(links.staff) + '</code><button class="link" data-act="copy" data-copy="staff-link">Copy</button></span></div></div>'
      + '<div class="card"><h3>What each role can do</h3><dl class="kv">' + ['superadmin', 'dept_admin', 'attendant', 'rider', 'financier'].map(k => '<dt>' + esc(ROLES[k].name) + '</dt><dd>' + esc(ROLES[k].desc) + '</dd>').join('') + '</dl></div>' : '');
}
function viewLinks() {
  const tpl = 'Book with ' + biz() + ' in a minute: ' + links.home + '\nWe pick up and drop off. Pay by M-Pesa.';
  return '<div class="card"><h3>Booking page for customers</h3><span class="copyline"><code id="lk-home">' + esc(links.home) + '</code><button class="link" data-act="copy" data-copy="lk-home">Copy</button></span><p class="muted small" style="margin:0">Put this in your Instagram and TikTok bio, WhatsApp Business profile and on your signs.</p></div>'
    + '<div class="card"><h3>Staff app</h3><span class="copyline"><code id="lk-staff">' + esc(links.staff) + '</code><button class="link" data-act="copy" data-copy="lk-staff">Copy</button></span><p class="muted small" style="margin:0">Team members open this on their phones and tap Add to Home Screen.</p></div>'
    + '<div class="card"><h3>WhatsApp reply for booking requests</h3><pre class="tpl" id="lk-tpl">' + esc(tpl) + '</pre><div class="row-btns"><button class="btn ghost sm" data-act="copy" data-copy="lk-tpl">Copy message</button></div><p class="muted small" style="margin:0">Save it as a quick reply in WhatsApp Business.</p></div>';
}
function settingsDirty() { return !!S.setDraft && JSON.stringify(S.setDraft) !== JSON.stringify(baseDraft()); }
function baseDraft() { const s = S.settings; return clone({ business: s.business, tagline: s.tagline, whatsapp: s.whatsapp, mpesa: s.mpesa, depts: s.depts, zones: s.zones, services: s.services, plans: s.plans }); }
function viewSettings() {
  if (!S.setDraft) S.setDraft = baseDraft();
  const d = S.setDraft;
  const bizCard = '<div class="card set"><h3>Business</h3><div class="grid2"><div class="field"><label for="s-biz">Business name</label><input id="s-biz" data-sf="business" value="' + esc(d.business) + '"></div><div class="field"><label for="s-wa">WhatsApp number</label><input id="s-wa" data-sf="whatsapp" inputmode="tel" value="' + esc(d.whatsapp) + '" placeholder="0712 345 678"></div></div>'
    + '<div class="field"><label for="s-tag">One line about you (shown on the booking page)</label><input id="s-tag" data-sf="tagline" value="' + esc(d.tagline) + '"></div>'
    + '<div class="field"><label for="s-mpesa">How customers pay by M-Pesa</label><input id="s-mpesa" data-sf="mpesa" value="' + esc(d.mpesa) + '" placeholder="Till 123456, or Paybill 123456 account your booking code"></div></div>';
  const svcCard = '<div class="card set"><h3>Service lines and prices (KES)</h3><p class="muted small" style="margin:0">Set a price to 0 for jobs you quote case by case. Switch a line to "Coming soon" to hide it from the booking page.</p>'
    + d.depts.map(x => {
      const rows = d.services.map((s, i) => [s, i]).filter(p => p[0].dept === x.key);
      return '<div class="set" style="padding-top:8px;border-top:1px solid var(--line)"><div class="dept-h"><b><span class="dc">' + DEPT[x.key].code + '</span> <input id="s-dn-' + x.key + '" data-dn="' + x.key + '" value="' + esc(x.name) + '" aria-label="Name for ' + esc(x.key) + '" style="width:auto;display:inline-block;padding:6px 8px;font-size:14px;font-weight:700"></b><button class="toggle" data-act="set-dept" data-k="' + x.key + '" aria-pressed="' + !!x.on + '"><i></i>' + (x.on ? 'Taking bookings' : 'Coming soon') + '</button></div>'
        + rows.map(p => { const s = p[0], i = p[1]; return '<div class="svc-edit"><input id="s-sv-n-' + i + '" data-svc="' + i + '" data-sk="name" value="' + esc(s.name) + '" aria-label="Service name"><input id="s-sv-p-' + i + '" data-svc="' + i + '" data-sk="price" inputmode="numeric" value="' + esc(s.price) + '" aria-label="Price"><label><input type="checkbox" id="s-sv-o-' + i + '" data-svc="' + i + '" data-sk="active"' + (s.active !== false ? ' checked' : '') + '> On</label><button class="icon-btn" data-act="set-svc-del" data-i="' + i + '" aria-label="Remove">×</button></div>'; }).join('')
        + '<div><button class="btn ghost sm" data-act="set-svc-add" data-k="' + x.key + '">Add a service</button></div></div>';
    }).join('') + '</div>';
  const planCard = '<div class="card set"><h3>Membership plans</h3><p class="muted small" style="margin:0">Customers pay once and get a number of visits for the period. Tick which services a visit covers.</p>'
    + d.plans.map((pl, i) => '<div class="planrow"><div class="grid2"><div class="field"><label for="s-pl-n-' + i + '">Plan name</label><input id="s-pl-n-' + i + '" data-plan="' + i + '" data-pk="name" value="' + esc(pl.name) + '"></div><div class="field"><label for="s-pl-d-' + i + '">Department</label><select id="s-pl-d-' + i + '" data-plan="' + i + '" data-pk="dept" data-rerender>' + d.depts.map(x => '<option value="' + x.key + '"' + (pl.dept === x.key ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select></div></div>'
      + '<div class="grid3"><div class="field"><label for="s-pl-p-' + i + '">Price KES</label><input id="s-pl-p-' + i + '" data-plan="' + i + '" data-pk="price" inputmode="numeric" value="' + esc(pl.price) + '"></div><div class="field"><label for="s-pl-a-' + i + '">Visits</label><input id="s-pl-a-' + i + '" data-plan="' + i + '" data-pk="allowance" inputmode="numeric" value="' + esc(pl.allowance) + '"></div><div class="field"><label for="s-pl-y-' + i + '">Days valid</label><input id="s-pl-y-' + i + '" data-plan="' + i + '" data-pk="days" inputmode="numeric" value="' + esc(pl.days) + '"></div></div>'
      + '<div class="lbl">Covers</div><div class="chips">' + d.services.filter(s => s.dept === pl.dept && s.id).map(s => '<button class="chip" data-act="plan-svc" data-i="' + i + '" data-sid="' + esc(s.id) + '" aria-pressed="' + (pl.service_ids || []).includes(s.id) + '">' + esc(s.name) + '</button>').join('') + '</div>'
      + '<div class="field"><label for="s-pl-k-' + i + '">What members get (shown to customers)</label><input id="s-pl-k-' + i + '" data-plan="' + i + '" data-pk="perks" value="' + esc(pl.perks) + '"></div>'
      + '<div class="row-btns"><label class="check" for="s-pl-f-' + i + '"><input type="checkbox" id="s-pl-f-' + i + '" data-plan="' + i + '" data-pk="free_pickup"' + (pl.free_pickup ? ' checked' : '') + '> Free pickup</label><label class="check" for="s-pl-o-' + i + '"><input type="checkbox" id="s-pl-o-' + i + '" data-plan="' + i + '" data-pk="active"' + (pl.active !== false ? ' checked' : '') + '> On sale</label><button class="btn danger sm" data-act="set-plan-del" data-i="' + i + '" data-confirm="Tap again">Remove plan</button></div></div>').join('')
    + '<div><button class="btn ghost sm" data-act="set-plan-add">Add a plan</button></div></div>';
  const zones = '<div class="card set"><h3>Pickup areas and fees (KES)</h3><p class="muted small" style="margin:0">Charged once per booking for pickups, deliveries and home visits. Leave 0 for free.</p>'
    + d.zones.map((z, i) => '<div class="zone-edit"><input id="s-z-n-' + i + '" data-zone="' + i + '" data-zk="name" value="' + esc(z.name) + '" aria-label="Area"><input id="s-z-f-' + i + '" data-zone="' + i + '" data-zk="fee" inputmode="numeric" value="' + esc(z.fee) + '" aria-label="Fee"><button class="icon-btn" data-act="set-zone-del" data-i="' + i + '" aria-label="Remove">×</button></div>').join('')
    + '<div><button class="btn ghost sm" data-act="set-zone-add">Add an area</button></div></div>';
  return bizCard + svcCard + planCard + zones
    + '<div class="savebar" id="savebar"' + (settingsDirty() ? '' : ' hidden') + '><span>Unsaved changes</span><button class="btn ghost sm" data-act="set-discard">Discard</button><button class="btn accent sm" data-act="set-save">Save</button></div>';
}

/* ---------- sheets ---------- */
function openSheet(s) { S.sheet = s; renderSheet(true); const b = $('#sheet-body'); if (b) b.scrollTop = 0; }
function closeSheet() { S.sheet = null; const el = $('#sheet'); el.hidden = true; el.innerHTML = ''; document.documentElement.style.overflow = ''; }
function renderSheet(force) {
  const el = $('#sheet'); const s = S.sheet; if (!s) { closeSheet(); return; }
  if (!force && busy(el)) { pendingSheet = true; return; }
  pendingSheet = false;
  const prev = $('#sheet-body'); const top = prev ? prev.scrollTop : 0;
  const html = ({ job: jobSheet, form: formSheet, pay: paySheet, check: checkSheet, cust: custSheet, custedit: custEditSheet, member: memberSheet, person: personSheet })[s.type]();
  if (!html) { closeSheet(); return; }
  el.innerHTML = html; el.hidden = false; document.documentElement.style.overflow = 'hidden';
  const b = $('#sheet-body'); if (b) b.scrollTop = top;
  loadPhotos();
}
async function loadPhotos() {
  const setAll = () => document.querySelectorAll('img[data-photo]').forEach(i => { const u = S.photos[i.dataset.photo]; if (u && i.src !== u) i.src = u; });
  setAll();
  const need = [...document.querySelectorAll('img[data-photo]')].map(i => i.dataset.photo).filter(p => !S.photos[p]);
  if (!need.length) return;
  const m = await S.A.photoUrls(need); Object.assign(S.photos, m);
  document.querySelectorAll('img[data-photo]').forEach(i => { if (S.photos[i.dataset.photo]) i.src = S.photos[i.dataset.photo]; });
}

/* job sheet */
async function openJob(id) { openSheet({ type: 'job', id, job: null }); refreshJob(id); }
async function refreshJob(id) {
  try { const j = await S.A.rpc('staff_job', { id }); if (S.sheet && S.sheet.type === 'job' && S.sheet.id === id) { S.sheet.job = j; S.sheet.err = ''; renderSheet(); } }
  catch (e) { if (S.sheet && S.sheet.id === id) { S.sheet.err = e.message; renderSheet(); } }
}
function msgTemplates(j) {
  const c = j.customer || {}; const f = first(c.name); const b = biz();
  const what = DEPT[j.dept].vehicle ? 'car' + ((j.items || []).find(i => i.kind === 'vehicle') ? ' (' + j.items.find(i => i.kind === 'vehicle').label + ')' : '') : DEPT[j.dept].pieces ? 'items' : 'order';
  const when = dayName(j.day) === 'Today' ? 'today' : dayName(j.day) === 'Tomorrow' ? 'tomorrow' : 'on ' + longDay(j.day);
  const lines = (j.lines || []).map(l => '• ' + l.name + qtyNote(l) + (l.member_id ? ' · membership' : l.price ? ' · KES ' + num(l.price * l.qty) : '')).join('\n');
  const tl = links.track(j.track_token);
  const out = [];
  out.push(['Confirm booking', 'Hi ' + f + ', your booking ' + j.id + ' with ' + b + ' is confirmed for ' + when + ' at ' + t5(j.slot) + '.\n' + lines + (j.valet_fee ? '\n• Pickup & drop-off · KES ' + num(j.valet_fee) : '') + '\nTotal: KES ' + num(j.total) + (j.flow === 'valet' ? '\nOur valet will pick up from ' + (j.landmark || j.area) + '.' : j.flow === 'home' ? '\nWe\'ll come to you at ' + (j.landmark || j.area) + '.' : '') + '\nTrack it live: ' + tl]);
  if (TRIP(j.flow)) out.push(['On the way', 'Hi ' + f + ', this is ' + b + '. We\'re on our way to you for booking ' + j.id + '. Track it: ' + tl]);
  if (j.flow === 'valet' || j.flow === 'walkin') out.push(['Ready', 'Hi ' + f + ', your ' + what + ' is ready' + (j.flow === 'valet' ? ' and on its way back to you.' : '. Pick it up any time.') + (j.balance ? ' Balance: KES ' + num(j.balance) + (S.settings.mpesa ? ' (M-Pesa: ' + S.settings.mpesa + ')' : '') + '.' : '') + ' — ' + b]);
  const pays = (j.payments || []).map(p => (METHODS[p.method] || p.method) + (p.ref ? ' ' + p.ref : '')).join(', ');
  out.push(['Receipt', 'Receipt ' + j.id + ' · ' + b + '\n' + longDay(j.day) + '\n' + lines + (j.valet_fee ? '\n• Pickup & drop-off · KES ' + num(j.valet_fee) : '') + (j.discount ? '\n• Discount · −KES ' + num(j.discount) : '') + '\nTotal: KES ' + num(j.total) + '\nPaid: KES ' + num(j.paid) + (pays ? ' (' + pays + ')' : '') + '\nBalance: KES ' + num(j.balance) + '\nThank you for choosing ' + b + '!']);
  if (c.token && role() !== 'rider') out.push(['Their page', 'Hi ' + f + ', here\'s your ' + b + ' page. See your bookings, membership and history, and book again in one tap: ' + links.me(c.token) + '\nKeep this link to yourself.']);
  return out;
}
function jobSheet() {
  const s = S.sheet; const j = s.job;
  if (!j) return frame('Job', s.err ? '<div class="err">' + esc(s.err) + '</div>' : '<p class="loading">Loading…</p>', '');
  const g = groupOf(j.status), nx = nextStatus(j), pv = prevStatus(j);
  const c = j.customer || {}; const isNew = !j.confirmed && j.status !== 'cancelled';
  const stOpts = (sel, kinds) => '<option value="">Not assigned</option>' + S.team.filter(t => !kinds || kinds.includes(t.role)).map(t => '<option value="' + esc(t.id) + '"' + (sel === t.id ? ' selected' : '') + '>' + esc(t.name) + ' · ' + esc((ROLES[t.role] || {}).name) + '</option>').join('');
  const lines = '<div class="tscroll"><table class="t"><tbody>' + (j.lines || []).map(l => '<tr><td class="wrap-cell">' + esc(l.name + qtyNote(l)) + (l.member_id ? ' <span class="pill p-member">Membership</span>' : '') + '</td><td class="num">' + (l.price ? num(l.price * l.qty) : l.member_id ? '0' : 'Quote') + '</td></tr>').join('')
    + (j.valet_fee ? '<tr><td>Pickup fee' + (j.area ? ' · ' + esc(j.area) : '') + '</td><td class="num">' + num(j.valet_fee) + '</td></tr>' : '')
    + (j.discount ? '<tr><td>Discount</td><td class="num">−' + num(j.discount) + '</td></tr>' : '')
    + '<tr><td><b>Total</b></td><td class="num"><b>' + kes(j.total) + '</b></td></tr><tr><td>Paid</td><td class="num">' + kes(j.paid) + '</td></tr><tr><td><b>Balance</b></td><td class="num"><b>' + kes(j.balance) + '</b></td></tr></tbody></table></div>';
  const pays = (j.payments || []).length ? '<ul class="tl-list">' + j.payments.map(p => '<li><time>' + esc(stamp(p.at)) + '</time><span>' + esc(METHODS[p.method] || p.method) + ' · ' + kes(p.amount) + (p.ref ? ' · <b>' + esc(p.ref) + '</b>' : '') + (nameOf(p.by_id) ? ' · ' + esc(nameOf(p.by_id)) : '') + '</span></li>').join('') + '</ul>' : '';
  const ck = j.checkin;
  const needCheck = DEPT[j.dept].vehicle || DEPT[j.dept].pieces;
  const check = needCheck ? '<div class="card"><h3>' + (DEPT[j.dept].pieces ? 'Pickup check and tags' : 'Pickup check') + '</h3>'
    + (ck ? '<dl class="kv">' + (ck.fuel ? '<dt>Fuel</dt><dd>' + esc(ck.fuel) + '</dd>' : '') + (ck.mileage ? '<dt>Mileage</dt><dd>' + num(ck.mileage) + ' km</dd>' : '') + (DEPT[j.dept].vehicle ? '<dt>Existing marks</dt><dd>' + esc((ck.damage || []).join(', ') || 'None noted') + '</dd><dt>Keys</dt><dd>' + (ck.keys ? 'Received' : 'Not received') + '</dd>' : '') + (ck.valuables ? '<dt>Left inside</dt><dd>' + esc(ck.valuables) + '</dd>' : '') + (ck.notes ? '<dt>Notes</dt><dd>' + esc(ck.notes) + '</dd>' : '') + '<dt>Checked</dt><dd>' + esc(stamp(ck.at)) + (nameOf(ck.by) ? ' · ' + esc(nameOf(ck.by)) : '') + '</dd></dl>' : '<p class="muted" style="margin:0">' + (DEPT[j.dept].pieces ? 'Tag each piece when you collect it so nothing gets mixed up.' : 'Record fuel, mileage, existing marks and photos at pickup. It protects you if someone disputes damage.') + '</p>')
    + ((j.tags || []).length ? '<div class="vchips">' + j.tags.map(t => '<span class="vchip" style="cursor:default"><span class="tagno">' + esc(t.tag) + '</span>' + esc(t.desc || '') + '</span>').join('') + '</div>' : '')
    + ((j.photos || []).length ? '<div class="photos">' + j.photos.map(p => '<figure><img data-photo="' + esc(p) + '" alt="Pickup photo" loading="lazy"></figure>').join('') + '</div>' : '')
    + (j.status !== 'cancelled' ? '<div><button class="btn ghost sm" data-act="check" data-id="' + esc(j.id) + '">' + (ck ? 'Update check' : 'Do the pickup check') + '</button></div>' : '') + '</div>' : '';
  const hist = (j.history || []).slice().reverse().map(h => '<li><time>' + esc(stamp(h.at)) + '</time><span>' + esc(h.s ? statusLabel(h.s, j) : 'Edited') + (h.note ? ' · ' + esc(h.note) : '') + (nameOf(h.by) ? ' · ' + esc(nameOf(h.by)) : (h.s && !h.by ? ' · customer' : '')) + '</span></li>').join('');
  const msgs = c.phone ? '<div class="msgs">' + msgTemplates(j).map(m => '<a class="btn sm wa" target="_blank" rel="noopener" href="' + esc(wa(c.phone, m[1])) + '">' + esc(m[0]) + '</a>').join('') + '</div>' : '<p class="muted" style="margin:0">Add a phone number to message this customer.</p>';
  const sib = (j.siblings || []).filter(x => x.visible);
  const member = (j.memberships || []).filter(m => m.active && m.dept === j.dept);
  const body = (s.err ? '<div class="err">' + esc(s.err) + '</div>' : '')
    + '<div class="dhead"><div class="pills"><span class="pill ' + (isNew ? 's-new' : 's-' + g) + '">' + esc(isNew ? 'New · not confirmed' : statusLabel(j.status, j)) + '</span>' + payPill(j) + (isLate(j) ? '<span class="pill p-unpaid">Running late</span>' : '') + '<span class="dc">' + esc(DEPT[j.dept].code) + '</span><span class="muted small" style="font-weight:600">' + esc(flowLabel(j.flow, j.dept)) + '</span></div>'
    + '<div class="who">' + esc(c.name || 'Customer') + '</div><div class="muted" style="font-weight:600">' + esc(dayName(j.day)) + ' · ' + esc(t5(j.slot)) + (j.drop_slot ? ' · back by ' + esc(t5(j.drop_slot)) : '') + (j.source ? ' · via ' + esc(j.source) : '') + '</div></div>'
    + (j.status !== 'cancelled' ? tracker(j) : '')
    + (j.status !== 'cancelled' ? '<div class="row-btns">'
      + (isNew && role() !== 'rider' ? '<button class="btn accent grow" data-act="confirm" data-id="' + esc(j.id) + '">Confirm booking</button>' : '')
      + (canStep(j, nx) ? '<button class="btn primary grow" data-act="advance" data-id="' + esc(j.id) + '">' + esc(actionLabel(nx, j)) + '</button>' : '')
      + (j.balance > 0 ? '<button class="btn accent grow" data-act="pay" data-id="' + esc(j.id) + '">Record payment</button>' : '')
      + (!j.staff_id && role() === 'attendant' && j.flow !== 'delivery' ? '<button class="btn ghost" data-act="take" data-id="' + esc(j.id) + '" data-as="staff">Take this job</button>' : '')
      + (!j.valet_id && ['rider', 'attendant'].includes(role()) && ['valet', 'delivery'].includes(j.flow) ? '<button class="btn ghost" data-act="take" data-id="' + esc(j.id) + '" data-as="valet">Take this run</button>' : '')
      + '</div>' + (pv && canStep(j, j.status) ? '<button class="link" style="align-self:start" data-act="undo" data-id="' + esc(j.id) + '">Undo last step</button>' : '') : '')
    + (member.length ? '<div class="note">Member: ' + member.map(m => esc(m.plan_name) + ' · ' + m.remaining + ' of ' + m.allowance + ' left').join('; ') + '</div>' : '')
    + (j.notes ? '<div class="note">' + esc(j.notes).replace(/\n/g, '<br>') + '</div>' : '')
    + '<div class="card"><h3>Services</h3>' + lines + pays + '</div>'
    + (sib.length ? '<div class="card"><h3>Same booking</h3><div class="vchips">' + sib.map(x => '<button class="vchip" data-act="open-job" data-id="' + esc(x.id) + '"><span class="dc">' + esc(DEPT[x.dept].code) + '</span>' + esc(statusLabel(x.status, x)) + (x.balance ? ' · ' + kes(x.balance) + ' due' : '') + '</button>').join('') + '</div></div>' : '')
    + '<div class="card"><h3>Customer</h3><dl class="kv">' + (c.phone ? '<dt>Phone</dt><dd><span class="copyline"><code>' + esc(showPhone(c.phone)) + '</code><button class="link" data-act="copy" data-text="' + esc(showPhone(c.phone)) + '">Copy</button></span></dd>' : '')
      + (j.area ? '<dt>Area</dt><dd>' + esc(j.area) + '</dd>' : '') + (j.landmark ? '<dt>Directions</dt><dd>' + esc(j.landmark) + '</dd>' : '')
      + ((j.items || []).length ? '<dt>Working on</dt><dd>' + j.items.map(i => i.kind === 'vehicle' ? '<span class="plate">' + esc(i.label) + '</span> ' + esc(i.details || '') : esc(i.label)).join('<br>') + '</dd>' : '')
      + (c.notes ? '<dt>Notes</dt><dd>' + esc(c.notes) + '</dd>' : '') + '</dl>'
      + '<div class="row-btns">' + (TRIP(j.flow) ? '<a class="btn sm ghost" target="_blank" rel="noopener" href="' + esc(mapsUrl(j)) + '">Directions</a>' : '') + (role() !== 'rider' ? '<button class="btn sm ghost" data-act="open-cust" data-id="' + esc(c.id) + '">Customer history</button>' : '') + '</div></div>'
    + '<div class="card"><h3>Message on WhatsApp</h3>' + msgs + '</div>'
    + (j.can_manage ? '<div class="card"><h3>Team</h3><div class="grid2"><div class="field"><label for="d-staff">' + (DEPT[j.dept].vehicle || DEPT[j.dept].pieces ? 'Attendant' : 'Service by') + '</label><select id="d-staff" data-assign="staff_id" data-id="' + esc(j.id) + '">' + stOpts(j.staff_id, ['attendant', 'dept_admin', 'superadmin']) + '</select></div>'
      + (['valet', 'delivery'].includes(j.flow) ? '<div class="field"><label for="d-valet">Valet / rider</label><select id="d-valet" data-assign="valet_id" data-id="' + esc(j.id) + '">' + stOpts(j.valet_id, ['rider', 'attendant', 'dept_admin', 'superadmin']) + '</select></div>' : '') + '</div></div>'
      : '<div class="card"><h3>Team</h3><p style="margin:0">' + esc(j.staff_name || 'No attendant yet') + (j.valet_name ? ' · valet ' + esc(j.valet_name) : '') + '</p></div>')
    + check
    + '<div class="card"><h3>History</h3><ul class="tl-list">' + hist + '</ul><p class="muted small" style="margin:0">Booking ' + esc(j.id) + '</p></div>'
    + '<div class="row-btns">' + (j.can_edit ? '<button class="btn ghost" data-act="edit" data-id="' + esc(j.id) + '">Edit booking</button>' : '')
    + (j.can_manage && !['cancelled', 'done'].includes(j.status) ? '<button class="btn danger" data-act="cancel" data-id="' + esc(j.id) + '" data-confirm="Tap again to cancel">Cancel job</button>' : '')
    + (j.can_manage && j.status === 'cancelled' ? '<button class="btn ghost" data-act="restore" data-id="' + esc(j.id) + '">Restore job</button>' : '') + '</div>';
  return frame(j.id + ' · ' + (c.name || ''), body, '');
}

/* booking form (new + edit) */
function blankForm(prefill) {
  const n = new Date(); n.setMinutes(Math.ceil(n.getMinutes() / 15) * 15, 0, 0);
  const d = S.day >= today() ? S.day : today();
  return Object.assign({ editId: null, cust: null, phone: '', name: '', lines: [], tab: bookDepts()[0], flows: {}, day: d, slot: hm(n), drop: '', area: '', areaOther: '', landmark: '', maps: '', plate: '', make: '', colour: '', itemIds: [], assign: {}, source: 'Walk-in', notes: '', discount: '', err: '', saving: false }, prefill || {});
}
const FF = () => S.form;
const formDepts = f => { const s = [...new Set(f.lines.map(l => (svc(l.sid) || {}).dept).filter(Boolean))]; return s; };
const fFlow = (f, d) => DEPT_FLOWS[d].includes(f.flows[d]) ? f.flows[d] : DEPT_FLOWS[d][0];
const fArea = f => f.area === '__other' ? f.areaOther.trim() : f.area;
function zoneFee(a) { const z = (S.settings.zones || []).find(z => z.name === a); return z ? +z.fee || 0 : 0; }
function memberFor(f, sid, qty, used) {
  if (!f.cust || !f.cust.memberships) return null;
  return f.cust.memberships.find(m => m.active && m.service_ids.includes(sid) && (m.remaining + (f.editUsed && f.editUsed[m.id] || 0) - (used[m.id] || 0)) >= qty) || null;
}
function formCalc(f) {
  let sub = 0; const used = {}; const cover = {};
  f.lines.forEach((l, i) => {
    const s = svc(l.sid); if (!s) return;
    const m = l.use_member !== false ? memberFor(f, l.sid, l.qty, used) : null;
    if (m) { used[m.id] = (used[m.id] || 0) + l.qty; cover[i] = m; }
    else sub += (l.price != null && l.price !== '' ? +l.price : s.price) * l.qty;
  });
  const ds = formDepts(f); const trips = ds.filter(d => TRIP(fFlow(f, d)));
  let fee = 0;
  if (trips.length) { const free = f.cust && (f.cust.memberships || []).some(m => m.active && m.free_pickup && m.dept === trips[0]); fee = free ? 0 : zoneFee(fArea(f)); }
  if (f.editId && f.keepFee != null && fArea(f) === f.editArea && fFlow(f, ds[0]) === f.editFlow) fee = f.keepFee;
  const disc = Math.min(+f.discount || 0, sub + fee);
  return { sub, fee, disc, total: Math.max(0, sub + fee - disc), cover, trips };
}
function custMatches(f) {
  if (f.cust) return '<div class="matched">' + esc(f.cust.customer.name) + ' · last visit ' + esc(ago(f.cust.customer.last_visit)) + ((f.cust.memberships || []).some(m => m.active) ? ' · <span class="pill p-member">Member</span>' : '') + (f.editId ? '' : ' <button class="link" data-act="f-unlink">Not them?</button>') + '</div>';
  return '<div id="f-matches"></div>';
}
async function searchMatches() {
  const f = FF(); const el = $('#f-matches'); if (!f || !el || f.cust) return;
  const q = f.phone.replace(/\D/g, '').length >= 4 ? f.phone : (f.name.trim().length >= 2 ? f.name : '');
  if (!q) { el.innerHTML = ''; return; }
  try {
    const res = (await S.A.rpc('staff_customers', { q })).slice(0, 4);
    if (FF() !== f) return;
    el.innerHTML = res.length ? '<div class="match-list"><span class="lbl">Existing customers:</span>' + res.map(c => '<button class="match" data-act="f-pick" data-id="' + esc(c.id) + '"><b>' + esc(c.name || 'No name') + '</b><span>' + esc(showPhone(c.phone)) + (c.plates.length ? ' · ' + esc(c.plates.join(', ')) : '') + '</span></button>').join('') + '</div>' : '';
  } catch (e) { }
}
let matchT = null;
async function pickCustomer(id) {
  const f = FF();
  try {
    const c = await S.A.rpc('staff_customer', { id });
    f.cust = c; f.name = c.customer.name; f.phone = showPhone(c.customer.phone);
    const z = (S.settings.zones || []).some(z => z.name === c.customer.area);
    if (c.customer.area && !f.area) { f.area = z ? c.customer.area : '__other'; f.areaOther = z ? '' : c.customer.area; }
    if (!f.landmark) f.landmark = c.customer.landmark || ''; if (!f.maps) f.maps = c.customer.maps || '';
    const v = (c.items || []).find(i => i.kind === 'vehicle'); if (v && !f.plate) { f.plate = v.label; f.make = v.details || ''; }
    renderSheet(true);
  } catch (e) { toast(e.message); }
}
function formSheet() {
  const f = FF(); if (!f) return '';
  const ds = formDepts(f); const calc = formCalc(f); const trip = calc.trips.length > 0;
  const bd = f.editId ? [f.editDept] : bookDepts();
  const svcs = (S.settings.services || []).filter(s => s.dept === f.tab && s.active !== false);
  const veh = ds.some(d => DEPT[d].vehicle); const pcs = ds.some(d => DEPT[d].pieces);
  const people = kinds => '<option value="">Not assigned</option>' + S.team.filter(t => kinds.includes(t.role)).map(t => '<option value="' + esc(t.id) + '">' + esc(t.name) + '</option>').join('');
  const items = f.cust ? (f.cust.items || []) : [];
  const body = (f.err ? '<div class="err" role="alert">' + esc(f.err) + '</div>' : '')
    + '<fieldset><legend>Customer</legend><div class="grid2"><div class="field"><label for="f-phone">Phone</label><input id="f-phone" data-f="phone" inputmode="tel" autocomplete="off" value="' + esc(f.phone) + '" placeholder="0712 345 678"' + (f.editId ? ' disabled' : '') + '></div><div class="field"><label for="f-name">Name</label><input id="f-name" data-f="name" autocomplete="off" value="' + esc(f.name) + '" placeholder="Customer name"' + (f.editId ? ' disabled' : '') + '></div></div>' + custMatches(f) + '</fieldset>'
    + '<fieldset><legend>Services</legend>' + (bd.length > 1 ? '<div class="chips">' + bd.map(k => '<button class="chip" data-act="f-tab" data-v="' + k + '" aria-pressed="' + (f.tab === k) + '"><span class="dc">' + DEPT[k].code + '</span>' + esc(deptName(k)) + '</button>').join('') + '</div>' : '')
    + '<div class="svc-grid">' + (svcs.map(s => '<button class="svc" data-act="f-add" data-sid="' + esc(s.id) + '"><span>' + esc(s.name) + '</span><b>' + (s.price ? num(s.price) : 'Quote') + '</b></button>').join('') || '<p class="muted" style="margin:0">No services switched on here yet.</p>') + '</div>'
    + (f.lines.length ? '<div class="lines">' + f.lines.map((l, i) => {
      const s = svc(l.sid) || { name: l.name, price: l.price }; const m = calc.cover[i]; const canPrice = manages(s.dept) || !s.price;
      const eligible = f.cust && (f.cust.memberships || []).some(x => x.active && x.service_ids.includes(l.sid));
      return '<div class="line"><span class="ln"><span><span class="dc">' + esc((DEPT[s.dept] || {}).code || '') + '</span> ' + esc(s.name) + '</span>' + (eligible ? '<label class="mem"><input type="checkbox" id="f-mem-' + i + '" data-lm="' + i + '"' + (l.use_member !== false ? ' checked' : '') + '> ' + (m ? 'Covered by ' + esc(m.plan_name) + ' (' + Math.max(0, m.remaining + (f.editUsed && f.editUsed[m.id] || 0) - l.qty) + ' left after)' : 'Use membership') + '</label>' : '') + '</span>'
        + (isSqft(l) ? '<div class="qty"><input class="price" id="f-sq-' + i + '" data-lq="' + i + '" inputmode="numeric" value="' + esc(l.qty || '') + '" placeholder="0" aria-label="Area in square feet" style="width:5.5em"><small>sq ft</small></div>' : '<div class="qty"><button class="icon-btn" data-act="f-qty" data-i="' + i + '" data-d="-1" aria-label="One less">−</button><span>' + l.qty + '</span><button class="icon-btn" data-act="f-qty" data-i="' + i + '" data-d="1" aria-label="One more">+</button></div>')
        + (m ? '<span class="pfix">0</span>' : canPrice ? '<input class="price" id="f-price-' + i + '" data-lp="' + i + '" inputmode="numeric" value="' + esc(l.price != null ? l.price : s.price) + '" aria-label="Price">' : '<span class="pfix" id="f-lt-' + i + '">' + num(s.price * l.qty) + '</span>')
        + '<button class="icon-btn" data-act="f-del" data-i="' + i + '" aria-label="Remove">×</button></div>';
    }).join('') + '</div>' : '<p class="muted" style="margin:0">Tap a service to add it. Mix departments for one customer, like a wash and a haircut.</p>') + '</fieldset>'
    + (ds.length ? '<fieldset><legend>How</legend>' + ds.map(d => '<div class="how" style="display:grid;gap:6px"><span class="lbl"><span class="dc">' + DEPT[d].code + '</span> ' + esc(deptName(d)) + '</span><div class="seg">' + DEPT_FLOWS[d].map(x => '<button data-act="f-flow" data-d="' + d + '" data-v="' + x + '" aria-pressed="' + (fFlow(f, d) === x) + '">' + esc(flowLabel(x, d)) + '</button>').join('') + '</div></div>').join('') + '</fieldset>' : '')
    + '<fieldset><legend>When</legend><div class="grid3"><div class="field"><label for="f-day">Date</label><input id="f-day" type="date" data-f="day" value="' + esc(f.day) + '"></div><div class="field"><label for="f-slot">' + (ds.some(d => fFlow(f, d) === 'valet') ? 'Pickup time' : 'Time') + '</label><input id="f-slot" type="time" data-f="slot" value="' + esc(f.slot) + '"></div>'
    + (ds.some(d => fFlow(f, d) === 'valet') ? '<div class="field"><label for="f-drop">Back by</label><input id="f-drop" type="time" data-f="drop" value="' + esc(f.drop) + '"></div>' : '') + '</div></fieldset>'
    + (trip ? '<fieldset><legend>Where</legend><div class="grid2"><div class="field"><label for="f-area">Area</label><select id="f-area" data-f="area" data-rerender><option value="">Choose an area</option>' + (S.settings.zones || []).map(z => '<option value="' + esc(z.name) + '"' + (f.area === z.name ? ' selected' : '') + '>' + esc(z.name) + (+z.fee ? ' · KES ' + num(z.fee) : '') + '</option>').join('') + '<option value="__other"' + (f.area === '__other' ? ' selected' : '') + '>Somewhere else</option></select></div>'
      + (f.area === '__other' ? '<div class="field"><label for="f-areao">Area name</label><input id="f-areao" data-f="areaOther" value="' + esc(f.areaOther) + '"></div>' : '<div class="field"><label for="f-maps">Google Maps pin (optional)</label><input id="f-maps" data-f="maps" inputmode="url" value="' + esc(f.maps) + '" placeholder="Paste a shared location"></div>') + '</div>'
      + '<div class="field"><label for="f-lm">Directions</label><input id="f-lm" data-f="landmark" value="' + esc(f.landmark) + '" placeholder="Estate, gate colour, house number"></div></fieldset>' : '')
    + (veh ? '<fieldset><legend>Vehicle</legend>' + (items.filter(i => i.kind === 'vehicle').length ? '<div class="vchips">' + items.filter(i => i.kind === 'vehicle').map(v => '<button class="vchip" data-act="f-veh" data-id="' + esc(v.id) + '" aria-pressed="' + (plate(f.plate) === v.label) + '"><span class="plate">' + esc(v.label) + '</span>' + esc(v.details || '') + '</button>').join('') + '</div>' : '')
      + '<div class="grid3"><div class="field"><label for="f-plate">Plate</label><input id="f-plate" data-f="plate" autocapitalize="characters" value="' + esc(f.plate) + '" placeholder="KDA 123B"></div><div class="field"><label for="f-make">Make and model</label><input id="f-make" data-f="make" value="' + esc(f.make) + '" placeholder="Toyota Axio"></div><div class="field"><label for="f-colour">Colour</label><input id="f-colour" data-f="colour" value="' + esc(f.colour) + '" placeholder="Silver"></div></div></fieldset>' : '')
    + (pcs && items.filter(i => i.kind !== 'vehicle').length ? '<fieldset><legend>Their saved items</legend><div class="vchips">' + items.filter(i => i.kind !== 'vehicle').map(i => '<button class="vchip" data-act="f-item" data-id="' + esc(i.id) + '" aria-pressed="' + f.itemIds.includes(i.id) + '">' + esc(i.label) + (i.details ? ' · ' + esc(i.details) : '') + '</button>').join('') + '</div></fieldset>' : '')
    + (!f.editId && isMgr() && ds.length ? '<fieldset><legend>Team</legend>' + ds.map(d => '<div class="grid2"><div class="field"><label for="f-st-' + d + '">' + esc(deptName(d)) + ': attendant</label><select id="f-st-' + d + '" data-as="' + d + '" data-ak="staff_id">' + people(['attendant', 'dept_admin', 'superadmin']) + '</select></div>' + (['valet', 'delivery'].includes(fFlow(f, d)) ? '<div class="field"><label for="f-va-' + d + '">Valet / rider</label><select id="f-va-' + d + '" data-as="' + d + '" data-ak="valet_id">' + people(['rider', 'attendant', 'dept_admin', 'superadmin']) + '</select></div>' : '') + '</div>').join('') + '</fieldset>' : '')
    + (!f.editId ? '<fieldset><legend>Booked via</legend><div class="chips">' + SOURCES.map(s => '<button class="chip" data-act="f-src" data-v="' + esc(s) + '" aria-pressed="' + (f.source === s) + '">' + esc(s) + '</button>').join('') + '</div></fieldset>' : '')
    + '<div class="field"><label for="f-notes">Notes</label><textarea id="f-notes" data-f="notes" rows="2" placeholder="Anything the team should know">' + esc(f.notes) + '</textarea></div>'
    + '<div class="totals" id="f-totals">' + totalsHtml(f) + '</div>';
  const foot = '<span class="grand" id="f-grand">' + kes(calc.total) + '</span>' + (f.editId ? '<button class="btn ghost" data-act="f-back">Back</button>' : '') + '<button class="btn accent" data-act="f-save"' + (f.saving ? ' disabled' : '') + '>' + (f.saving ? 'Saving…' : f.editId ? 'Save changes' : 'Save booking') + '</button>';
  return frame(f.editId ? 'Edit ' + f.editId : 'New booking', body, foot);
}
function totalsHtml(f) {
  const c = formCalc(f); const mgr = f.editId ? manages(f.editDept) : isMgr();
  return '<div class="trow"><span>Services</span><span>' + kes(c.sub) + '</span></div>' + (c.trips.length ? '<div class="trow"><span>Pickup fee' + (fArea(f) ? ' · ' + esc(fArea(f)) : '') + '</span><span>' + kes(c.fee) + '</span></div>' : '')
    + (mgr && f.editId ? '<div class="trow"><label for="f-disc">Discount</label><input id="f-disc" data-f="discount" inputmode="numeric" value="' + esc(f.discount) + '" placeholder="0"></div>' : '')
    + '<div class="trow big"><span>Total</span><span>' + kes(c.total) + '</span></div>';
}
function editForm(j) {
  const z = (S.settings.zones || []).some(z => z.name === j.area);
  const veh = (j.items || []).find(i => i.kind === 'vehicle');
  const used = {}; (j.lines || []).forEach(l => { if (l.member_id) used[l.member_id] = (used[l.member_id] || 0) + l.qty; });
  return blankForm({
    editId: j.id, editDept: j.dept, editUsed: used, keepFee: j.valet_fee, editArea: j.area, editFlow: j.flow,
    cust: { customer: Object.assign({ last_visit: null }, j.customer), memberships: j.memberships || [], items: j.customer_items || [] },
    phone: showPhone(j.customer.phone), name: j.customer.name, tab: j.dept, flows: { [j.dept]: j.flow },
    lines: (j.lines || []).map(l => ({ sid: l.sid, qty: l.qty, price: l.member_id ? null : l.price, use_member: !!l.member_id, name: l.name, sizes: l.sizes || '' })),
    day: j.day, slot: t5(j.slot), drop: t5(j.drop_slot), area: j.area ? (z ? j.area : '__other') : '', areaOther: z ? '' : j.area, landmark: j.landmark, maps: j.maps,
    plate: veh ? veh.label : '', make: veh ? veh.details : '', notes: j.notes || '', discount: j.discount ? String(j.discount) : ''
  });
}
async function saveForm() {
  const f = FF(); const ds = formDepts(f); const calc = formCalc(f);
  f.err = '';
  if (!f.lines.length) f.err = 'Add at least one service.';
  else if (f.lines.some(l => isSqft(l) && !(l.qty > 0))) f.err = 'Add the carpet area in square feet.';
  else if (!f.editId && !f.cust && !f.name.trim() && !f.phone.trim()) f.err = 'Add the customer\'s name or phone number.';
  else if (!f.editId && f.phone.trim() && !validPhone(f.phone)) f.err = 'Check the phone number, like 0712 345 678.';
  else if (!f.day || !f.slot) f.err = 'Set the date and time.';
  else if (calc.trips.length && !fArea(f)) f.err = 'Choose the area for the pickup or visit.';
  if (f.err) { renderSheet(true); $('#sheet-body').scrollTop = 0; return; }
  f.saving = true; renderSheet(true);
  const lineOut = l => { const s = svc(l.sid) || {}; const o = { sid: l.sid, qty: l.qty, use_member: l.use_member !== false }; if (isSqft(l)) o.sizes = l.sizes || ''; if (l.price != null && l.price !== '' && (manages(s.dept) || !s.price)) o.price = +l.price; return o; };
  try {
    if (f.editId) {
      const p = { id: f.editId, flow: fFlow(f, f.editDept), day: f.day, slot: f.slot, drop_slot: f.drop || '', area: fArea(f), landmark: f.landmark, maps: f.maps, notes: f.notes, lines: f.lines.map(lineOut), plate: f.plate, make: f.make, colour: f.colour };
      if (manages(f.editDept)) p.discount = +f.discount || 0;
      await S.A.rpc('staff_job_save', p);
      const id = f.editId; S.form = null; toast('Booking updated'); openJob(id); loadBoard(true);
    } else {
      const p = {
        customer: f.cust ? { id: f.cust.customer.id } : { name: f.name.trim(), phone: f.phone },
        day: f.day, slot: f.slot, drop_slot: f.drop || '', area: fArea(f), landmark: f.landmark, maps: f.maps, plate: f.plate, make: f.make, colour: f.colour,
        source: f.source, notes: f.notes,
        groups: ds.map(d => Object.assign({ dept: d, flow: fFlow(f, d), lines: f.lines.filter(l => (svc(l.sid) || {}).dept === d).map(lineOut), item_ids: DEPT[d].pieces ? f.itemIds : [] }, f.assign[d] || {}))
      };
      const r = await S.A.rpc('staff_book', p);
      S.form = null; closeSheet();
      if (S.day !== f.day && S.view === 'board') S.day = f.day;
      S.custList = null;
      await loadBoard(true);
      const j = await S.A.rpc('staff_job', { id: r.jobs[0].id });
      const link = j.customer.phone ? wa(j.customer.phone, msgTemplates(j)[0][1]) : '';
      toast('Saved ' + r.jobs.map(x => x.id).join(', ') + '.', link ? '<a href="' + esc(link) + '" target="_blank" rel="noopener">Send confirmation</a>' : '', 9000);
    }
  } catch (e) { f.err = e.message; f.saving = false; renderSheet(true); const b = $('#sheet-body'); if (b) b.scrollTop = 0; }
}

/* payment */
function paySheet() {
  const s = S.sheet; const j = s.job;
  const sibDue = (j.siblings || []).filter(x => x.visible && x.balance > 0).reduce((a, x) => a + x.balance, 0);
  const body = (s.err ? '<div class="err" role="alert">' + esc(s.err) + '</div>' : '')
    + '<div class="dhead"><div class="who">' + esc(j.customer.name) + '</div><div class="muted" style="font-weight:600">' + esc(j.id) + ' · Total ' + kes(j.total) + ' · Balance ' + kes(j.balance) + '</div></div>'
    + '<fieldset><legend>Method</legend><div class="seg big">' + Object.keys(METHODS).map(k => '<button data-act="pay-m" data-v="' + k + '" aria-pressed="' + (s.method === k) + '">' + METHODS[k] + '</button>').join('') + '</div></fieldset>'
    + (sibDue ? '<label class="check" for="p-group"><input type="checkbox" id="p-group" data-pf="group"' + (s.group ? ' checked' : '') + '> Pay for the whole booking (' + kes(j.balance + sibDue) + ')</label>' : '')
    + '<div class="grid2"><div class="field"><label for="p-amt">Amount (KES)</label><input id="p-amt" data-pf="amount" inputmode="numeric" value="' + esc(s.amount) + '"></div>'
    + (s.method !== 'cash' ? '<div class="field"><label for="p-ref">' + (s.method === 'mpesa' ? 'M-Pesa code' : 'Reference') + '</label><input id="p-ref" data-pf="ref" autocapitalize="characters" value="' + esc(s.ref) + '" placeholder="' + (s.method === 'mpesa' ? 'SJM4K2P8QX' : '') + '"></div>' : '') + '</div>'
    + (s.method === 'mpesa' ? '<p class="muted small" style="margin:0">Copy the code from the M-Pesa message. The system blocks a code that has already been used.</p>' : '');
  return frame('Record payment', body, '<button class="btn ghost" data-act="back-job">Back</button><button class="btn accent" data-act="pay-save">Save payment</button>');
}
async function savePay() {
  const s = S.sheet; const amt = Math.round(+String(s.amount).replace(/[^\d.]/g, '') || 0);
  if (amt <= 0) { s.err = 'Enter the amount received.'; renderSheet(true); return; }
  if (s.method === 'mpesa' && !String(s.ref).trim()) { s.err = 'Add the M-Pesa code from the confirmation message.'; renderSheet(true); return; }
  try {
    const j = await S.A.rpc('staff_job_pay', { id: s.job.id, method: s.method, amount: amt, ref: s.ref, day: today(), group: !!s.group });
    toast(kes(amt) + ' recorded' + (j.balance ? '. ' + kes(j.balance) + ' still due.' : '. Fully paid.'));
    openSheet({ type: 'job', id: j.id, job: j }); loadBoard(true);
  } catch (e) { s.err = e.message; renderSheet(true); }
}

/* pickup check */
function checkSheet() {
  const s = S.sheet; const j = s.job; const veh = DEPT[j.dept].vehicle; const pcs = DEPT[j.dept].pieces;
  const saved = (j.customer_items || []).filter(i => i.kind !== 'vehicle');
  const body = (s.err ? '<div class="err" role="alert">' + esc(s.err) + '</div>' : '')
    + '<div class="note">' + (veh ? 'Do this with the customer before you drive off. Photograph all four sides and anything already damaged.' : 'Give every piece a tag number and write it on a tag you attach. Photograph stains and tears.') + '</div>'
    + (veh ? '<fieldset><legend>Fuel</legend><div class="seg big">' + FUEL.map(x => '<button data-act="ck-fuel" data-v="' + x + '" aria-pressed="' + (s.fuel === x) + '">' + x + '</button>').join('') + '</div></fieldset>'
      + '<div class="grid2"><div class="field"><label for="c-km">Mileage (km)</label><input id="c-km" data-cf="mileage" inputmode="numeric" value="' + esc(s.mileage) + '"></div><div class="field"><label for="c-val">Valuables left inside</label><input id="c-val" data-cf="valuables" value="' + esc(s.valuables) + '" placeholder="Charger, umbrella"></div></div>'
      + '<fieldset><legend>Existing marks</legend><div class="panels">' + PANELS.map(p => '<button class="chip" data-act="ck-panel" data-v="' + esc(p) + '" aria-pressed="' + s.damage.includes(p) + '">' + esc(p) + '</button>').join('') + '</div></fieldset>'
      + '<label class="check" for="c-keys"><input type="checkbox" id="c-keys" data-cf="keys"' + (s.keys ? ' checked' : '') + '> Keys received</label>' : '')
    + (pcs ? '<fieldset><legend>Pieces</legend>' + (saved.length ? '<div class="vchips"><span class="lbl">Their saved items:</span>' + saved.map(i => '<button class="vchip" data-act="ck-saved" data-id="' + esc(i.id) + '">' + esc(i.label) + '</button>').join('') + '</div>' : '')
      + '<div class="lines">' + s.pieces.map((p, i) => '<div class="piece"><span class="tagno">' + esc(p.tag || 'New tag') + '</span><input id="c-pc-' + i + '" data-pc="' + i + '" value="' + esc(p.desc) + '" placeholder="Grey rug 8×10" aria-label="Description">' + (p.item_id ? '<span class="pill p-member">Saved</span>' : '<label><input type="checkbox" id="c-pcs-' + i + '" data-pcs="' + i + '"' + (p.save ? ' checked' : '') + '> Save</label>') + '<button class="icon-btn" data-act="ck-pc-del" data-i="' + i + '" aria-label="Remove">×</button></div>').join('') + '</div>'
      + '<div><button class="btn ghost sm" data-act="ck-pc-add">Add a piece</button></div><p class="muted small" style="margin:0">Tag numbers are given when you save. Tick Save to keep an item on the customer\'s record for next time.</p></fieldset>' : '')
    + '<div class="field"><label for="c-notes">Notes</label><textarea id="c-notes" data-cf="notes" rows="2" placeholder="Stains, tears, scratches you pointed out">' + esc(s.notes) + '</textarea></div>'
    + '<fieldset><legend>Photos</legend><div class="photos">' + s.photos.map(p => '<figure><img data-photo="' + esc(p) + '" alt="Pickup photo"><button class="icon-btn x" data-act="ck-photo-del" data-v="' + esc(p) + '" aria-label="Remove photo">×</button></figure>').join('') + '</div>'
    + '<div class="field"><label for="c-photo">' + (s.uploading ? 'Uploading ' + s.uploading + '…' : 'Add photos') + '</label><input id="c-photo" type="file" accept="image/*" multiple></div></fieldset>';
  const collect = s.mode === 'collect';
  return frame((collect ? 'Collect · ' : 'Pickup check · ') + j.id, body, '<button class="btn ghost" data-act="back-job">Back</button><button class="btn accent" data-act="ck-save"' + (s.uploading ? ' disabled' : '') + '>' + (collect ? 'Save and mark collected' : 'Save check') + '</button>');
}
function openCheck(j, mode) {
  const c = j.checkin || {};
  openSheet({ type: 'check', job: j, mode, fuel: c.fuel || '', mileage: c.mileage || '', valuables: c.valuables || '', damage: (c.damage || []).slice(), keys: c.keys !== false, notes: c.notes || '', photos: (j.photos || []).slice(), pieces: (j.tags || []).map(t => ({ tag: t.tag, desc: t.desc, item_id: t.item_id })), uploading: 0, err: '' });
  const s = S.sheet; if (DEPT[j.dept].pieces && !s.pieces.length) {
    (j.items || []).filter(i => i.kind !== 'vehicle').forEach(i => s.pieces.push({ tag: '', desc: i.label, item_id: i.id }));
    const n = (j.lines || []).reduce((a, l) => a + (isSqft(l) ? (l.sizes ? l.sizes.split(',').length : 1) : l.qty), 0) - s.pieces.length;
    for (let i = 0; i < n; i++) s.pieces.push({ tag: '', desc: '', save: false });
    renderSheet(true);
  }
}
async function addPhotos(files) {
  const s = S.sheet; if (!s || s.type !== 'check') return;
  for (const file of files) {
    s.uploading++; renderSheet(true);
    try { const blob = await compressImage(file); const path = await S.A.upload(blob); s.photos.push(path); S.photos[path] = URL.createObjectURL(blob); }
    catch (e) { s.err = e.message || 'A photo didn\'t upload. Try again.'; }
    s.uploading--; if (S.sheet === s) renderSheet(true);
  }
}
async function saveCheck() {
  const s = S.sheet; const j = s.job;
  if (DEPT[j.dept].vehicle && s.mode === 'collect' && !s.fuel) { s.err = 'Pick the fuel level.'; renderSheet(true); return; }
  try {
    const r = await S.A.rpc('staff_job_check', { id: j.id, collect: s.mode === 'collect', checkin: { fuel: s.fuel, mileage: s.mileage, valuables: s.valuables, damage: s.damage, keys: s.keys, notes: s.notes }, photos: s.photos, pieces: DEPT[j.dept].pieces ? s.pieces.filter(p => p.desc.trim() || p.tag) : null });
    toast(s.mode === 'collect' ? r.id + ' · Collected' : 'Pickup check saved'); openSheet({ type: 'job', id: r.id, job: r }); loadBoard(true);
  } catch (e) { s.err = e.message; renderSheet(true); }
}

/* customer */
async function openCust(id) {
  openSheet({ type: 'cust', id, c: null });
  try { const c = await S.A.rpc('staff_customer', { id }); if (S.sheet && S.sheet.id === id && S.sheet.type === 'cust') { S.sheet.c = c; S.sheet.notes = c.customer.notes; renderSheet(true); } }
  catch (e) { if (S.sheet) { S.sheet.err = e.message; renderSheet(true); } }
}
function custSheet() {
  const s = S.sheet; const C = s.c;
  if (!C) return frame('Customer', s.err ? '<div class="err">' + esc(s.err) + '</div>' : '<p class="loading">Loading…</p>', '');
  const c = C.customer; const st = C.stats; const v = (C.items || []).find(i => i.kind === 'vehicle');
  const winback = 'Hi ' + first(c.name) + ', it\'s been a while since we saw ' + (v ? 'your ' + (v.details ? v.details.split(' · ')[0] : 'car') + ' (' + v.label + ')' : 'you') + ' at ' + biz() + '. Book a pickup this week and we\'ll have it shining: ' + links.me(c.token);
  const memb = C.memberships || [];
  const body = (s.err ? '<div class="err">' + esc(s.err) + '</div>' : '')
    + '<div class="dhead"><div class="who">' + esc(c.name || 'No name') + '</div><div class="muted" style="font-weight:600">' + esc(c.area || 'No area') + (c.landmark ? ' · ' + esc(c.landmark) : '') + ' · last visit ' + esc(ago(c.last_visit)) + '</div></div>'
    + '<div class="tiles" style="grid-template-columns:repeat(3,minmax(0,1fr))"><div class="tile"><span>Visits</span><b>' + st.visits + '</b></div><div class="tile"><span>Paid KES</span><b>' + num(st.paid) + '</b></div><div class="tile"><span>Owes KES</span><b>' + num(st.owing) + '</b></div></div>'
    + '<div class="card"><h3>Contact</h3>' + (c.phone ? '<span class="copyline"><code>' + esc(showPhone(c.phone)) + '</code><button class="link" data-act="copy" data-text="' + esc(showPhone(c.phone)) + '">Copy</button></span><div class="msgs"><a class="btn sm wa" target="_blank" rel="noopener" href="' + esc(wa(c.phone, 'Hi ' + first(c.name) + ', ')) + '">WhatsApp</a><a class="btn sm wa" target="_blank" rel="noopener" href="' + esc(wa(c.phone, 'Hi ' + first(c.name) + ', here\'s your ' + biz() + ' page. See your bookings, membership and history, and book again in one tap: ' + links.me(c.token) + '\nKeep this link to yourself.')) + '">Send their page</a><a class="btn sm wa" target="_blank" rel="noopener" href="' + esc(wa(c.phone, winback)) + '">Win-back message</a></div>' : '<p class="muted" style="margin:0">No phone number saved.</p>')
    + '<div class="row-btns"><button class="btn ghost sm" data-act="cust-edit">Edit details and items</button>' + (isMgr() ? '<button class="link" data-act="cust-newlink" data-confirm="Old link stops working. Tap again">Reset their private link</button>' : '') + '</div></div>'
    + '<div class="card"><h3>Memberships</h3>' + (memb.length ? memb.map(m => '<div class="person"><span><b>' + esc(m.plan_name) + '</b> ' + (m.active ? '<span class="pill p-member">Active</span>' : m.cancelled ? '<span class="pill">Cancelled</span>' : '<span class="pill">Ended</span>') + '<br><span class="muted small">' + m.remaining + ' of ' + m.allowance + ' left · ' + esc(longDay(m.starts)) + ' to ' + esc(longDay(m.ends)) + (m.free_pickup ? ' · free pickup' : '') + '</span></span>' + (m.active && manages(m.dept) ? '<button class="btn danger sm" data-act="member-cancel" data-id="' + esc(m.id) + '" data-confirm="Tap again">Cancel</button>' : '<span></span>') + '</div>').join('') : '<p class="muted" style="margin:0">No membership yet.</p>')
    + (isMgr() && (S.settings.plans || []).some(p => p.active && manages(p.dept)) ? '<div><button class="btn primary sm" data-act="member-new">Start a membership</button></div>' : '') + '</div>'
    + '<div class="card"><h3>Cars and items</h3>' + ((C.items || []).length ? C.items.map(i => '<div class="person"><span>' + (i.kind === 'vehicle' ? '<span class="plate">' + esc(i.label) + '</span> ' + esc(i.details || '') : '<b>' + esc(i.label) + '</b> <span class="muted small">' + esc(i.kind) + (i.details ? ' · ' + esc(i.details) : '') + '</span>') + '<br><span class="muted small">' + (i.history.length ? i.history.length + (i.history.length === 1 ? ' job' : ' jobs') + ' · last ' + esc(dayName(i.history[0].day).toLowerCase()) + ': ' + esc(i.history[0].services || '') : 'No jobs yet') + '</span></span><span></span></div>').join('') : '<p class="muted" style="margin:0">Cars are saved from bookings. Carpets are saved at the pickup check.</p>') + '</div>'
    + '<div class="card"><h3>Notes</h3><textarea id="cu-notes" data-cuf="notes" rows="3" placeholder="Preferences, gate codes, favourite barber">' + esc(s.notes != null ? s.notes : c.notes || '') + '</textarea><div><button class="btn ghost sm" data-act="cust-notes">Save notes</button></div></div>'
    + '<div class="card"><h3>History</h3>' + (C.jobs.length ? '<div class="list">' + C.jobs.map(j => jobRow(j, { showDay: true })).join('') + '</div>' : '<p class="muted" style="margin:0">No jobs in your departments yet.</p>') + '</div>';
  const foot = ['superadmin', 'dept_admin', 'attendant'].includes(role()) ? '<button class="btn accent" data-act="cust-book">New booking for ' + esc(first(c.name)) + '</button>' : '';
  return frame(c.name || 'Customer', body, foot);
}
function custEditSheet() {
  const s = S.sheet; const d = s.draft;
  const body = (s.err ? '<div class="err" role="alert">' + esc(s.err) + '</div>' : '')
    + '<div class="grid2"><div class="field"><label for="ce-name">Name</label><input id="ce-name" data-ce="name" value="' + esc(d.name) + '"></div><div class="field"><label for="ce-phone">Phone</label><input id="ce-phone" data-ce="phone" inputmode="tel" value="' + esc(d.phone) + '"></div></div>'
    + '<div class="grid2"><div class="field"><label for="ce-area">Area</label><input id="ce-area" data-ce="area" value="' + esc(d.area) + '"></div><div class="field"><label for="ce-maps">Google Maps pin</label><input id="ce-maps" data-ce="maps" value="' + esc(d.maps) + '"></div></div>'
    + '<div class="field"><label for="ce-lm">Directions</label><input id="ce-lm" data-ce="landmark" value="' + esc(d.landmark) + '"></div>'
    + '<fieldset><legend>Cars and items</legend><div class="lines">' + d.items.map((it, i) => it.remove ? '' : '<div class="zone-edit" style="grid-template-columns:110px minmax(0,1fr) minmax(0,1fr) 34px"><select id="ce-k-' + i + '" data-ci="' + i + '" data-ck="kind"' + (it.id ? ' disabled' : '') + '>' + [['vehicle', 'Car'], ['carpet', 'Carpet'], ['sofa', 'Sofa'], ['mattress', 'Mattress'], ['other', 'Other']].map(k => '<option value="' + k[0] + '"' + (it.kind === k[0] ? ' selected' : '') + '>' + k[1] + '</option>').join('') + '</select><input id="ce-l-' + i + '" data-ci="' + i + '" data-ck="label" value="' + esc(it.label) + '" placeholder="' + (it.kind === 'vehicle' ? 'KDA 123B' : 'Living room rug') + '" aria-label="Plate or name"><input id="ce-d-' + i + '" data-ci="' + i + '" data-ck="details" value="' + esc(it.details) + '" placeholder="' + (it.kind === 'vehicle' ? 'Toyota Axio · Silver' : '8×10, grey') + '" aria-label="Details"><button class="icon-btn" data-act="ce-del" data-i="' + i + '" aria-label="Remove">×</button></div>').join('') + '</div><div class="row-btns"><button class="btn ghost sm" data-act="ce-add" data-k="vehicle">Add a car</button><button class="btn ghost sm" data-act="ce-add" data-k="carpet">Add an item</button></div></fieldset>';
  return frame('Edit ' + (d.name || 'customer'), body, '<button class="btn ghost" data-act="ce-back">Back</button><button class="btn accent" data-act="ce-save">Save</button>');
}
function memberSheet() {
  const s = S.sheet; const plans = (S.settings.plans || []).filter(p => p.active && manages(p.dept));
  const pl = plans.find(p => p.id === s.plan_id);
  const body = (s.err ? '<div class="err" role="alert">' + esc(s.err) + '</div>' : '')
    + '<fieldset><legend>Plan</legend><div class="pick">' + plans.map(p => '<button data-act="mb-plan" data-v="' + esc(p.id) + '" style="' + (s.plan_id === p.id ? 'border-color:var(--primary);box-shadow:inset 0 0 0 1px var(--primary)' : '') + '"><span class="dc">' + DEPT[p.dept].code + '</span><span><b>' + esc(p.name) + '</b><span class="muted">' + p.allowance + ' visits · ' + p.days + ' days' + (p.free_pickup ? ' · free pickup' : '') + '</span></span><b>' + kes(p.price) + '</b></button>').join('') + '</div></fieldset>'
    + '<div class="field"><label for="m-start">Starts</label><input id="m-start" type="date" data-mf="starts" value="' + esc(s.starts) + '"></div>'
    + '<fieldset><legend>Payment</legend><div class="seg big">' + Object.keys(METHODS).map(k => '<button data-act="mb-m" data-v="' + k + '" aria-pressed="' + (s.method === k) + '">' + METHODS[k] + '</button>').join('') + '</div>'
    + '<div class="grid2"><div class="field"><label for="m-amt">Amount paid (KES)</label><input id="m-amt" data-mf="amount" inputmode="numeric" value="' + esc(s.amount) + '"></div>' + (s.method !== 'cash' ? '<div class="field"><label for="m-ref">' + (s.method === 'mpesa' ? 'M-Pesa code' : 'Reference') + '</label><input id="m-ref" data-mf="ref" value="' + esc(s.ref) + '"></div>' : '') + '</div></fieldset>';
  return frame('Start a membership', body, '<button class="btn ghost" data-act="back-cust">Back</button><button class="btn accent" data-act="mb-save"' + (pl ? '' : ' disabled') + '>Start membership</button>');
}
function personSheet() {
  const s = S.sheet; const d = s.draft;
  const needDepts = ['dept_admin', 'attendant', 'rider'].includes(d.role);
  const body = (s.err ? '<div class="err" role="alert">' + esc(s.err) + '</div>' : '')
    + '<div class="field"><label for="pe-name">Name</label><input id="pe-name" data-pe="name" value="' + esc(d.name) + '"></div>'
    + '<p class="muted small" style="margin:0">Signs in with ' + esc(showPhone(d.phone)) + '</p>'
    + '<fieldset><legend>Role</legend><div class="pick">' + ['dept_admin', 'attendant', 'rider', 'financier', 'superadmin'].map(r => '<button data-act="pe-role" data-v="' + r + '" style="' + (d.role === r ? 'border-color:var(--primary);box-shadow:inset 0 0 0 1px var(--primary)' : '') + '"><span class="role-chip role-' + r + '">' + esc(ROLES[r].name.split(' ')[0]) + '</span><span><b>' + esc(ROLES[r].name) + '</b><span class="muted">' + esc(ROLES[r].desc) + '</span></span><span></span></button>').join('') + '</div></fieldset>'
    + (needDepts ? '<fieldset><legend>' + (d.role === 'rider' ? 'Departments (leave empty for all runs)' : 'Departments') + '</legend><div class="chips">' + (S.settings.depts || []).map(x => '<button class="chip" data-act="pe-dept" data-v="' + x.key + '" aria-pressed="' + d.depts.includes(x.key) + '"><span class="dc">' + DEPT[x.key].code + '</span>' + esc(x.name) + '</button>').join('') + '</div></fieldset>' : '')
    + (['attendant', 'rider', 'dept_admin'].includes(d.role) ? '<div class="field" style="max-width:200px"><label for="pe-com">Commission (% of their sales)</label><input id="pe-com" data-pe="commission" inputmode="numeric" value="' + esc(d.commission) + '"></div>' : '')
    + (s.id !== S.me.id ? '<label class="check" for="pe-act"><input type="checkbox" id="pe-act" data-pe="active"' + (d.active ? ' checked' : '') + '> Can sign in</label>' : '')
    + (s.id !== S.me.id && d.origRole !== 'pending' ? '<fieldset><legend>Reset PIN</legend><div class="grid2"><div class="field"><label for="pe-pin">New 6-digit PIN</label><input id="pe-pin" data-pe="pin" inputmode="numeric" maxlength="6" value="' + esc(d.pin || '') + '"></div><div style="display:flex;align-items:end"><button class="btn ghost" data-act="pe-pin">Set PIN</button></div></div><p class="muted small" style="margin:0">Tell them the new PIN in person or on a call.</p></fieldset>' : '');
  return frame(d.origRole === 'pending' ? 'Approve ' + d.name : 'Edit ' + d.name, body, '<button class="btn ghost" data-act="close-sheet">Cancel</button><button class="btn accent" data-act="pe-save">' + (d.origRole === 'pending' ? 'Approve' : 'Save') + '</button>');
}

/* ---------- events ---------- */
async function act(fn, after) { try { const r = await fn(); if (after) after(r); return r; } catch (e) { toast(e.message); } }
const H = {
  tab: a => { S.view = a.dataset.v; if (S.view !== 'manage') S.setDraft = settingsDirty() ? S.setDraft : null; if (['board', 'runs'].includes(S.view)) loadBoard(); else { if (S.view === 'customers') S.custList = null; if (S.view === 'manage') S.teamFull = null; renderMain(true); } window.scrollTo(0, 0); },
  reload: () => location.reload(),
  'reload-me': () => loadMe(),
  signout: async () => { await S.A.auth.signOut(); S.uid = null; S.me = null; S.board = null; closeSheet(); S.boot = 'auth'; renderAll(); },
  'auth-mode': a => { S.auth.mode = a.dataset.v; S.auth.err = ''; renderMain(true); if (DEMO) fillPicker(); },
  'demo-as': async a => { await S.A.demo.signInAs(a.dataset.id); S.uid = a.dataset.id; S.view = ''; S.board = null; S.report = null; S.reportKey = ''; S.teamFull = null; S.custList = null; S.setDraft = null; await loadMe(); },
  'demo-switch': async () => { await S.A.auth.signOut(); S.uid = null; S.me = null; S.board = null; closeSheet(); S.boot = 'auth'; S.auth.mode = 'in'; renderAll(); fillPicker(); },
  'demo-reset': () => S.A.demo.reset(),
  new: () => { S.form = blankForm(); openSheet({ type: 'form' }); },
  'open-job': a => openJob(a.dataset.id),
  'open-cust': a => openCust(a.dataset.id),
  advance: async a => {
    const j = (S.sheet && S.sheet.job && S.sheet.job.id === a.dataset.id) ? S.sheet.job : (S.board ? [...S.board.jobs, ...(S.board.unconfirmed || []), ...(S.board.owed || [])].find(x => x.id === a.dataset.id) : null);
    if (!j) return; const nx = nextStatus(j);
    if (nx === 'collected' && (DEPT[j.dept].vehicle || DEPT[j.dept].pieces)) { const full = await act(() => S.A.rpc('staff_job', { id: j.id })); if (full) openCheck(full, 'collect'); return; }
    a.disabled = true;
    const r = await act(() => S.A.rpc('staff_job_step', { id: j.id }));
    if (!r) { a.disabled = false; return; }
    toast(r.id + ' · ' + statusLabel(r.status, r), '<button data-act="undo" data-id="' + esc(r.id) + '" data-to="' + esc(j.status) + '">Undo</button>', 6000);
    if (S.sheet && S.sheet.type === 'job' && S.sheet.id === r.id) { S.sheet.job = r; renderSheet(true); }
    if (r.status === 'done' && r.balance > 0) openSheet({ type: 'pay', job: r, method: 'mpesa', amount: String(r.balance), ref: '', err: '' });
    loadBoard(true);
  },
  undo: async a => {
    const cur = (S.sheet && S.sheet.job && S.sheet.job.id === a.dataset.id) ? S.sheet.job : null;
    const to = a.dataset.to || (cur ? prevStatus(cur) : null);
    if (!to) { toast('Nothing to undo.'); return; }
    const r = await act(() => S.A.rpc('staff_job_step', { id: a.dataset.id, to })); if (r) { toast('Back to ' + statusLabel(r.status, r)); if (S.sheet && S.sheet.id === r.id) { S.sheet.job = r; renderSheet(true); } loadBoard(true); } },
  confirm: async a => { const r = await act(() => S.A.rpc('staff_job_confirm', { id: a.dataset.id })); if (r) { const link = r.customer.phone ? wa(r.customer.phone, msgTemplates(r)[0][1]) : ''; toast('Confirmed.', link ? '<a href="' + esc(link) + '" target="_blank" rel="noopener">Send WhatsApp confirmation</a>' : '', 9000); if (S.sheet && S.sheet.id === r.id) { S.sheet.job = r; renderSheet(true); } loadBoard(true); } },
  take: async a => { const r = await act(() => S.A.rpc('staff_job_take', { id: a.dataset.id, as: a.dataset.as })); if (r) { toast('It\'s yours'); if (S.sheet && S.sheet.id === r.id) { S.sheet.job = r; renderSheet(true); } loadBoard(true); } },
  pay: a => { const j = S.sheet.job; openSheet({ type: 'pay', job: j, method: 'mpesa', amount: String(j.balance), ref: '', err: '', group: false }); },
  'pay-m': a => { S.sheet.method = a.dataset.v; S.sheet.err = ''; renderSheet(); },
  'pay-save': () => savePay(),
  'back-job': () => openJob(S.sheet.job.id),
  check: () => openCheck(S.sheet.job, 'edit'),
  'ck-fuel': a => { S.sheet.fuel = a.dataset.v; S.sheet.err = ''; renderSheet(); },
  'ck-panel': a => { const d = S.sheet.damage, v = a.dataset.v, i = d.indexOf(v); if (i >= 0) d.splice(i, 1); else d.push(v); renderSheet(); },
  'ck-pc-add': () => { S.sheet.pieces.push({ tag: '', desc: '', save: false }); renderSheet(); },
  'ck-pc-del': a => { S.sheet.pieces.splice(+a.dataset.i, 1); renderSheet(); },
  'ck-saved': a => { const it = (S.sheet.job.customer_items || []).find(i => i.id === a.dataset.id); if (it && !S.sheet.pieces.some(p => p.item_id === it.id)) { const empty = S.sheet.pieces.find(p => !p.desc && !p.tag); if (empty) Object.assign(empty, { desc: it.label, item_id: it.id }); else S.sheet.pieces.push({ tag: '', desc: it.label, item_id: it.id }); renderSheet(); } },
  'ck-photo-del': a => { S.sheet.photos = S.sheet.photos.filter(x => x !== a.dataset.v); renderSheet(); },
  'ck-save': () => saveCheck(),
  edit: () => { S.form = editForm(S.sheet.job); openSheet({ type: 'form' }); },
  cancel: async a => { const r = await act(() => S.A.rpc('staff_job_cancel', { id: a.dataset.id })); if (r) { toast('Job cancelled'); S.sheet.job = r; renderSheet(true); loadBoard(true); } },
  restore: async a => { const r = await act(() => S.A.rpc('staff_job_cancel', { id: a.dataset.id, restore: true })); if (r) { toast('Job restored'); S.sheet.job = r; renderSheet(true); loadBoard(true); } },
  'close-sheet': () => { if (S.sheet && S.sheet.type === 'form' && S.form && S.form.editId) { const id = S.form.editId; S.form = null; openJob(id); return; } if (S.sheet && ['pay', 'check'].includes(S.sheet.type)) { openJob(S.sheet.job.id); return; } if (S.sheet && ['custedit', 'member'].includes(S.sheet.type)) { openCust(S.sheet.id); return; } closeSheet(); },
  day: a => { const v = +a.dataset.v; S.day = v === 0 ? today() : ymd(addDays(fromYmd(S.day), v)); S.board = null; loadBoard(); },
  dept: a => { S.dept = a.dataset.v; renderMain(true); },
  stf: a => { S.stf = a.dataset.v; renderMain(true); },
  custf: a => { S.custF = a.dataset.v; S.custList = null; renderMain(true); },
  period: a => { S.period = a.dataset.v; S.reportKey = ''; renderMain(true); },
  export: () => downloadReport(),
  'exp-add': async () => { const e = S.expDraft; const amt = Math.round(+String(e.amount).replace(/[^\d.]/g, '') || 0); if (amt <= 0) { toast('Enter the amount spent.'); return; }
    const r = await act(() => S.A.rpc('staff_expense_add', { day: e.day, cat: e.cat, amount: amt, note: e.note, dept: e.dept || (isOwner() ? '' : (S.me.depts || [])[0]) })); if (r) { S.expDraft = Object.assign({}, e, { amount: '', note: '' }); toast(kes(amt) + ' expense added'); S.reportKey = ''; renderMain(true); } },
  'exp-del': async a => { const r = await act(() => S.A.rpc('staff_expense_del', { id: a.dataset.id })); if (r) { toast('Expense deleted'); S.reportKey = ''; renderMain(true); } },
  copy: a => { if (a.dataset.copy) { const el = document.getElementById(a.dataset.copy); copyText(el ? el.textContent : '', el); } else copyText(a.dataset.text || '', a.previousElementSibling); },
  mtab: a => { S.manageTab = a.dataset.v; renderMain(true); },
  person: a => { const t = S.teamFull.find(x => x.id === a.dataset.id); if (!t) return; openSheet({ type: 'person', id: t.id, draft: { name: t.name, phone: t.phone, role: t.role === 'pending' ? 'attendant' : t.role, origRole: t.role, depts: (t.depts || []).slice(), commission: String(t.commission || ''), active: t.active, pin: '' }, err: '' }); },
  'pe-role': a => { S.sheet.draft.role = a.dataset.v; renderSheet(); },
  'pe-dept': a => { const d = S.sheet.draft.depts, v = a.dataset.v, i = d.indexOf(v); if (i >= 0) d.splice(i, 1); else d.push(v); renderSheet(); },
  'pe-save': async () => { const s = S.sheet, d = s.draft; try { S.teamFull = await S.A.rpc('staff_team_save', { id: s.id, name: d.name, role: d.role, depts: ['dept_admin', 'attendant', 'rider'].includes(d.role) ? d.depts : [], commission: +d.commission || 0, active: d.active }); closeSheet(); toast(d.origRole === 'pending' ? d.name + ' approved' : 'Saved'); renderMain(true); const r = await S.A.rpc('staff_me'); S.team = r.team || []; } catch (e) { s.err = e.message; renderSheet(true); } },
  'pe-pin': async () => { const s = S.sheet; if (!/^\d{6}$/.test(s.draft.pin || '')) { s.err = 'The PIN must be 6 digits.'; renderSheet(true); return; } try { await S.A.rpc('staff_team_pin', { id: s.id, pin: s.draft.pin }); s.err = ''; s.draft.pin = ''; renderSheet(true); toast('New PIN set'); } catch (e) { s.err = e.message; renderSheet(true); } },
  'cust-edit': () => { const C = S.sheet.c.customer; openSheet({ type: 'custedit', id: C.id, c: S.sheet.c, draft: { name: C.name, phone: showPhone(C.phone), area: C.area, landmark: C.landmark, maps: C.maps, items: S.sheet.c.items.map(i => ({ id: i.id, kind: i.kind, label: i.label, details: i.details })) }, err: '' }); },
  'ce-add': a => { S.sheet.draft.items.push({ kind: a.dataset.k, label: '', details: '' }); renderSheet(); },
  'ce-del': a => { const it = S.sheet.draft.items[+a.dataset.i]; if (it.id) it.remove = true; else S.sheet.draft.items.splice(+a.dataset.i, 1); renderSheet(); },
  'ce-back': () => openCust(S.sheet.id),
  'ce-save': async () => { const s = S.sheet, d = s.draft; if (!d.name.trim()) { s.err = 'Add a name.'; renderSheet(true); return; } if (d.phone.trim() && !validPhone(d.phone)) { s.err = 'Check the phone number.'; renderSheet(true); return; }
    try { await S.A.rpc('staff_customer_save', { id: s.id, name: d.name, phone: d.phone, area: d.area, landmark: d.landmark, maps: d.maps, items: d.items }); toast('Customer saved'); S.custList = null; openCust(s.id); } catch (e) { s.err = e.message; renderSheet(true); } },
  'cust-notes': async () => { const s = S.sheet; const r = await act(() => S.A.rpc('staff_customer_save', { id: s.id, notes: s.notes || '' })); if (r) { s.c = r; toast('Notes saved'); renderSheet(true); } },
  'cust-newlink': async () => { const r = await act(() => S.A.rpc('staff_customer_newlink', { id: S.sheet.id })); if (r) { S.sheet.c = r; toast('New private link made. Send it to them.'); renderSheet(true); } },
  'cust-book': () => { const C = S.sheet.c; const f = blankForm(); f.cust = C; f.name = C.customer.name; f.phone = showPhone(C.customer.phone); const z = (S.settings.zones || []).some(z => z.name === C.customer.area); if (C.customer.area) { f.area = z ? C.customer.area : '__other'; f.areaOther = z ? '' : C.customer.area; } f.landmark = C.customer.landmark; f.maps = C.customer.maps; const v = C.items.find(i => i.kind === 'vehicle'); if (v) { f.plate = v.label; f.make = v.details; } f.source = 'WhatsApp'; S.form = f; openSheet({ type: 'form' }); },
  'member-new': () => { const plans = (S.settings.plans || []).filter(p => p.active && manages(p.dept)); const p = plans[0]; openSheet({ type: 'member', id: S.sheet.id, c: S.sheet.c, plan_id: p ? p.id : '', starts: today(), method: 'mpesa', amount: p ? String(p.price) : '', ref: '', err: '' }); },
  'mb-plan': a => { S.sheet.plan_id = a.dataset.v; const p = S.settings.plans.find(x => x.id === a.dataset.v); if (p) S.sheet.amount = String(p.price); renderSheet(); },
  'mb-m': a => { S.sheet.method = a.dataset.v; renderSheet(); },
  'back-cust': () => openCust(S.sheet.id),
  'mb-save': async () => { const s = S.sheet; try { await S.A.rpc('staff_member_start', { customer_id: s.id, plan_id: s.plan_id, starts: s.starts, method: s.method, amount: s.amount, ref: s.ref, day: today() }); toast('Membership started'); openCust(s.id); } catch (e) { s.err = e.message; renderSheet(true); } },
  'member-cancel': async a => { const r = await act(() => S.A.rpc('staff_member_cancel', { id: a.dataset.id })); if (r) { S.sheet.c = r; toast('Membership cancelled'); renderSheet(true); } },
  // booking form
  'f-tab': a => { FF().tab = a.dataset.v; renderSheet(); },
  'f-add': a => { const f = FF(); const s = svc(a.dataset.sid); if (!s) return; const l = f.lines.find(x => x.sid === s.id); if (s.unit === 'sqft') { if (!l) f.lines.push({ sid: s.id, qty: 0, price: null, sizes: '' }); } else if (l) l.qty++; else f.lines.push({ sid: s.id, qty: 1, price: null }); f.err = ''; renderSheet(); },
  'f-qty': a => { const l = FF().lines[+a.dataset.i]; if (l) { l.qty = Math.max(1, Math.min(50, l.qty + (+a.dataset.d))); renderSheet(); } },
  'f-del': a => { FF().lines.splice(+a.dataset.i, 1); renderSheet(); },
  'f-flow': a => { FF().flows[a.dataset.d] = a.dataset.v; renderSheet(); },
  'f-src': a => { FF().source = a.dataset.v; renderSheet(); },
  'f-pick': a => pickCustomer(a.dataset.id),
  'f-unlink': () => { FF().cust = null; renderSheet(true); searchMatches(); },
  'f-veh': a => { const f = FF(); const v = f.cust.items.find(i => i.id === a.dataset.id); if (v) { f.plate = v.label; f.make = v.details || ''; f.colour = ''; renderSheet(); } },
  'f-item': a => { const f = FF(); const i = f.itemIds.indexOf(a.dataset.id); if (i >= 0) f.itemIds.splice(i, 1); else f.itemIds.push(a.dataset.id); renderSheet(); },
  'f-back': () => { const id = FF().editId; S.form = null; openJob(id); },
  'f-save': () => saveForm(),
  // settings
  'set-dept': a => { const x = S.setDraft.depts.find(d => d.key === a.dataset.k); x.on = !x.on; renderMain(true); },
  'set-svc-add': a => { S.setDraft.services.push({ id: '', dept: a.dataset.k, name: '', price: 0, kind: null, active: true, sort: 99 }); renderMain(true); const el = document.getElementById('s-sv-n-' + (S.setDraft.services.length - 1)); if (el) el.focus(); },
  'set-svc-del': a => { S.setDraft.services.splice(+a.dataset.i, 1); renderMain(true); },
  'set-zone-add': () => { S.setDraft.zones.push({ name: '', fee: 0 }); renderMain(true); const el = document.getElementById('s-z-n-' + (S.setDraft.zones.length - 1)); if (el) el.focus(); },
  'set-zone-del': a => { S.setDraft.zones.splice(+a.dataset.i, 1); renderMain(true); },
  'set-plan-add': () => { S.setDraft.plans.push({ id: '', name: '', dept: 'wash', price: 0, days: 30, allowance: 4, service_ids: [], free_pickup: false, perks: '', active: true, sort: 99 }); renderMain(true); },
  'set-plan-del': a => { S.setDraft.plans.splice(+a.dataset.i, 1); renderMain(true); },
  'plan-svc': a => { const p = S.setDraft.plans[+a.dataset.i]; const i = p.service_ids.indexOf(a.dataset.sid); if (i >= 0) p.service_ids.splice(i, 1); else p.service_ids.push(a.dataset.sid); renderMain(true); },
  'set-discard': () => { S.setDraft = null; renderMain(true); },
  'set-save': async () => { const r = await act(() => S.A.rpc('staff_settings_save', S.setDraft)); if (r) { S.settings = r.settings; S.setDraft = null; toast('Settings saved'); renderMain(true); } },
};
document.addEventListener('click', e => {
  const a = e.target.closest('[data-act]'); if (!a || a.disabled) return;
  if (a.tagName === 'A') return;
  if (a.dataset.confirm && !a.dataset.armed) { e.preventDefault(); a.dataset.armed = '1'; a.dataset.label = a.textContent; a.textContent = a.dataset.confirm; setTimeout(() => { if (a.isConnected) { delete a.dataset.armed; a.textContent = a.dataset.label; } }, 3500); return; }
  const h = H[a.dataset.act]; if (h) { e.preventDefault(); e.stopPropagation(); h(a, e); }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && S.sheet) { H['close-sheet'](); return; }
  if (e.key === 'Enter' && e.target.matches && e.target.matches('article[data-act],div[data-act][tabindex]')) { e.preventDefault(); e.target.click(); }
});
document.addEventListener('submit', e => { if (e.target.id === 'auth-form') { e.preventDefault(); submitAuth(); } });
document.addEventListener('input', e => {
  const t = e.target, d = t.dataset; const val = t.type === 'checkbox' ? t.checked : t.value;
  if (d.a != null) { S.auth[d.a] = val; return; }
  if (d.f && S.form) {
    S.form[d.f] = val;
    if ((d.f === 'phone' || d.f === 'name') && !S.form.cust) { clearTimeout(matchT); matchT = setTimeout(searchMatches, 300); }
    if (d.f === 'discount') { const g = $('#f-grand'); if (g) g.textContent = kes(formCalc(S.form).total); }
    return;
  }
  if (d.lp != null && S.form) { const l = S.form.lines[+d.lp]; if (l) l.price = String(val).replace(/[^\d]/g, ''); const g = $('#f-grand'); if (g) g.textContent = kes(formCalc(S.form).total); return; }
  if (d.lq != null && S.form) { const l = S.form.lines[+d.lq]; if (l) { l.qty = Math.min(5000, +String(val).replace(/[^\d]/g, '') || 0); const s = svc(l.sid) || {}; const lt = $('#f-lt-' + d.lq); if (lt) lt.textContent = num(s.price * l.qty); } const g = $('#f-grand'); if (g) g.textContent = kes(formCalc(S.form).total); return; }
  if (d.lm != null && S.form) { const l = S.form.lines[+d.lm]; if (l) l.use_member = !!val; renderSheet(true); return; }
  if (d.pf && S.sheet) { S.sheet[d.pf] = val; if (d.pf === 'group') { const j = S.sheet.job; const sib = (j.siblings || []).filter(x => x.visible && x.balance > 0).reduce((a, x) => a + x.balance, 0); S.sheet.amount = String(val ? j.balance + sib : j.balance); renderSheet(true); } return; }
  if (d.cf && S.sheet) { S.sheet[d.cf] = val; return; }
  if (d.pc != null && S.sheet) { S.sheet.pieces[+d.pc].desc = val; return; }
  if (d.pcs != null && S.sheet) { S.sheet.pieces[+d.pcs].save = !!val; return; }
  if (d.cuf && S.sheet) { S.sheet[d.cuf] = val; return; }
  if (d.ce && S.sheet) { S.sheet.draft[d.ce] = val; return; }
  if (d.ci != null && S.sheet) { S.sheet.draft.items[+d.ci][d.ck] = val; return; }
  if (d.mf && S.sheet) { S.sheet[d.mf] = val; return; }
  if (d.pe && S.sheet) { S.sheet.draft[d.pe] = val; return; }
  if (d.xf) { S.expDraft[d.xf] = val; return; }
  if (t.id === 'cust-q') { S.custQ = val; clearTimeout(S.custT); S.custT = setTimeout(() => { S.custList = null; renderCustList(); }, 250); return; }
  if (S.setDraft) {
    const sd = S.setDraft;
    if (d.sf) sd[d.sf] = val;
    else if (d.dn) sd.depts.find(x => x.key === d.dn).name = val;
    else if (d.svc != null) { const s = sd.services[+d.svc]; if (s) s[d.sk] = d.sk === 'active' ? !!val : d.sk === 'price' ? (+String(val).replace(/\D/g, '') || 0) : val; }
    else if (d.zone != null) { const z = sd.zones[+d.zone]; if (z) z[d.zk] = d.zk === 'fee' ? (+String(val).replace(/\D/g, '') || 0) : val; }
    else if (d.plan != null) { const p = sd.plans[+d.plan]; if (p) p[d.pk] = ['free_pickup', 'active'].includes(d.pk) ? !!val : ['price', 'days', 'allowance'].includes(d.pk) ? (+String(val).replace(/\D/g, '') || 0) : val; if (d.pk === 'dept') p.service_ids = []; }
    const sb = $('#savebar'); if (sb) sb.hidden = !settingsDirty();
  }
});
document.addEventListener('change', async e => {
  const t = e.target, d = t.dataset;
  if (d.change === 'runs-who') { S.runsWho = t.value; renderMain(true); return; }
  if (d.f && S.form && 'rerender' in d) { S.form[d.f] = t.value; renderSheet(true); return; }
  if (d.f && S.form && t.tagName === 'SELECT') { S.form[d.f] = t.value; return; }
  if (d.f === 'day' && S.form) { S.form.day = t.value; return; }
  if (d.as && S.form) { S.form.assign[d.as] = Object.assign(S.form.assign[d.as] || {}, { [d.ak]: t.value }); return; }
  if (d.assign) { const p = { id: d.id }; p[d.assign] = t.value; const r = await act(() => S.A.rpc('staff_job_assign', p)); if (r) { S.sheet.job = r; toast('Assigned'); renderSheet(true); loadBoard(true); } return; }
  if (t.id === 'c-photo' && t.files && t.files.length) { const files = [...t.files]; t.value = ''; addPhotos(files); return; }
  if (d.plan != null && 'rerender' in d) { renderMain(true); return; }
});
document.addEventListener('focusout', () => { setTimeout(() => { if (pendingMain && !busy($('#view'))) renderMain(); if (pendingSheet && !busy($('#sheet'))) renderSheet(); }, 0); });
const mo = new MutationObserver(() => { if ($('#pick') && $('#pick').querySelector('.loading')) fillPicker(); });
mo.observe(document.getElementById('view'), { childList: true, subtree: false });
boot();
