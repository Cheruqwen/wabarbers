// Public site: logged-out booking, booking tracker (#t/TOKEN), customer page (#me/TOKEN)
import {
  CFG, DEMO, api, $, esc, num, kes, t5, today, ymd, addDays, fromYmd, longDay, dayName, hm, stamp,
  normPhone, showPhone, validPhone, wa, first, plate, links, DEPT, DEPT_FLOWS, TRIP, flowLabel, statusLabel,
  groupOf, tracker, toast, demoBanner, MON, BRAND, BRANDS, setBrand
} from './core.js';
import { ic, svcIcon, DEPT_IC, FLOW_IC } from './icons.js';

const img = p => 'assets/' + p;
/* Photo slots: until real photos are shot, each spot shows what the ideal picture is.
   To use a real photo later, pass its path as the third argument (e.g. 'brand/foam.jpg'). */
const ph = (desc, cls, src) => src
  ? '<figure class="shot has ' + (cls || '') + '"><img src="' + img(src) + '" alt="' + esc(desc) + '" loading="lazy"></figure>'
  : '<figure class="shot ' + (cls || '') + '"><span class="shot-tag">' + ic('camera') + 'Photo to come</span><figcaption>' + esc(desc) + '</figcaption></figure>';
const PHOTOS = {
  wash: ['Foam cannon covering a white saloon in the bay at dusk, blue lights on the wet floor, washer in a Whale Wash tee.', 'Close-up: a microfibre towel drying a shiny bonnet, water beading.', 'A clean boda boda parked beside a muddy one.'],
  carpet: ['A large carpet hanging in the sun after washing, colours bright and fresh.', 'Close-up: a brush working foam into a carpet.', 'Rolled carpets with numbered tags, ready to go home.'],
  kinyozi: ['A barber shaping a fade, side profile, warm gold light, mirrors behind.', 'Hot towel shave, client relaxed in the leather chair.', 'Clippers, comb and razor laid out on the black counter.'],
  garage: ['Mechanic under an open bonnet, work light on, tools laid out.', 'A diagnostic reader plugged in, screen clearly visible.', 'A car up on the ramp in a clean workshop.'],
  nails: ['Close-up of a fresh gel manicure in soft pink, hands resting on a white towel.', 'Nail tech at work with polish colours lined up.', 'The pedicure chair, calm and bright.'],
};
// a field label with its picture
const lb = (forId, icon, text) => '<label for="' + forId + '">' + ic(icon, 'lb-ic') + esc(text) + '</label>';
// a step heading: picture badge with the step number on its corner
const stH = (n, icon, text) => '<h2><i class="st">' + ic(icon) + (n ? '<span>' + n + '</span>' : '') + '</i>' + esc(text) + '</h2>';
function brandCard(b) {
  if (b === 'ww') return '<div class="bcard ww"><img src="' + img(BRANDS.ww.mark) + '" alt=""><div class="bt"><b>Whale <span>Wash</span></b><small>' + esc(BRANDS.ww.line) + '</small></div></div>';
  if (b === 'wab') return '<div class="bcard wab"><img class="mk" src="' + img(BRANDS.wab.mark) + '" alt=""><div class="bt"><img class="wm" src="' + img(BRANDS.wab.word) + '" alt="WaBarbers Kinyozi"><small>' + esc(BRANDS.wab.line) + '</small></div></div>';
  if (b === 'cs') return '<div class="bcard cs"><img src="' + img(BRANDS.cs.mark) + '" alt=""><div class="bt"><b>PitStop <span>87</span></b><small>' + esc(BRANDS.cs.line) + '</small></div></div>';
  if (b === 'ph') return '<div class="bcard ph"><img src="' + img(BRANDS.ph.mark) + '" alt=""><div class="bt"><b>Pearl Her</b><small>' + esc(BRANDS.ph.line) + '</small></div></div>';
  return '';
}
// the page takes on the brand of what's on screen: the open service tab, or the booking being tracked
function pageBrand() {
  if (S.view === 'book' && !S.done && S.form) return BRAND[S.form.tab] || '';
  if (S.view === 'track' && S.track) { const bs = [...new Set(S.track.jobs.map(j => BRAND[j.dept] || 'ww'))]; return bs.length === 1 ? bs[0] : ''; }
  return '';
}

const S = { A: null, cat: null, view: 'book', token: null, portal: null, track: null, form: null, err: '', sending: false, done: null, loadErr: '' };
let pollT = null;

const depts = () => (S.cat.depts || []).filter(d => d.on && S.cat.services.some(s => s.dept === d.key));
const deptName = k => ((S.cat.depts || []).find(d => d.key === k) || {}).name || k;
const svc = id => S.cat.services.find(s => s.id === id);
// per-square-foot services (carpets): a line keeps each piece's size in feet, and qty is the total area
const isSqft = s => !!s && s.unit === 'sqft';
const areaOf = sz => sz.reduce((a, p) => a + Math.ceil((+p[0] || 0) * (+p[1] || 0)), 0);
const sizesText = sz => sz.filter(p => +p[0] && +p[1]).map(p => p[0] + '×' + p[1]).join(', ');
const pieceCount = l => isSqft(svc(l.sid)) ? (l.sizes || []).length : l.qty; // what "N services" counts
const qtyNote = l => l.unit === 'sqft' || isSqft(svc(l.sid)) ? ' · ' + l.qty + ' sq ft' : l.qty > 1 ? ' ×' + l.qty : '';
const bizWa = () => S.cat && S.cat.whatsapp;

/* ---------- boot + routing ---------- */
async function boot() {
  try {
    S.A = await api();
    S.cat = await S.A.rpc('catalog');
  } catch (e) {
    $('#app').innerHTML = '<div class="empty"><h2>We couldn\'t load bookings</h2><p>' + esc(e.message) + '</p><button class="btn ghost" onclick="location.reload()">Try again</button></div>';
    return;
  }
  document.title = S.cat.business || 'PitStop 87';
  $('#home-link').href = links.home;
  $('#biz').textContent = S.cat.business || 'PitStop 87';
  const w = $('#hd-wa');
  if (bizWa()) { w.href = wa(bizWa(), 'Hi ' + S.cat.business + ', '); w.innerHTML = ic('chat') + '<span>WhatsApp us</span>'; w.hidden = false; }
  if (DEMO) { $('#banner-in').innerHTML = demoBanner(' <a href="' + esc(links.staff) + '">Open the staff app</a>'); $('#banner').hidden = false; }
  else if (CFG.local) { $('#banner-in').innerHTML = '<span>Test version running on a laptop. Bookings here are real for testing only.</span> <a href="' + esc(links.staff) + '">Open the staff app</a>'; $('#banner').hidden = false; }
  // footer: one card per brand that's open for booking; tapping one jumps to its services
  const fbs = []; depts().forEach(d => { const b = BRAND[d.key]; if (b && !fbs.some(x => x.b === b)) fbs.push({ b, dept: d.key }); });
  $('#foot').innerHTML = (fbs.length ? '<div class="fb-row">' + fbs.map(x => '<button class="fb" data-act="brandgo" data-v="' + x.dept + '"><img class="' + x.b + '" src="' + img(BRANDS[x.b].mark) + '" alt=""><span><b>' + esc(x.b === 'cs' ? 'PitStop 87 Car Service' : BRANDS[x.b].name) + '</b><small>' + esc(BRANDS[x.b].line) + '</small></span></button>').join('') + '</div>' : '')
    + '<div class="foot-row"><span class="cr">© ' + new Date().getFullYear() + ' ' + esc(S.cat.business) + '</span>' + (bizWa() ? '<span>WhatsApp ' + esc(showPhone(bizWa())) + '</span>' : '') + '<a href="' + esc(links.staff) + '">Staff sign-in</a></div>';
  $('#app').removeAttribute('aria-busy');
  const hd = $('#top'); const onScroll = () => hd.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  window.addEventListener('hashchange', route);
  route();
}
function route() {
  clearInterval(pollT);
  const h = location.hash.slice(1);
  let m;
  if ((m = h.match(/^t\/([a-z0-9]+)$/i))) { S.view = 'track'; S.token = m[1]; S.track = null; loadTrack(); }
  else if ((m = h.match(/^me\/([a-z0-9]+)$/i))) { S.view = 'me'; S.token = m[1]; S.portal = null; loadPortal(); }
  else if ((m = h.match(/^book\/([a-z0-9]+)$/i))) { S.view = 'book'; S.token = m[1]; ensurePortal().then(() => { S.form = newForm(); render(); }); }
  else {
    // "" is the department picker, "#s/wash" is one department's prices and the rest of the booking
    m = h.match(/^s\/([a-z]+)$/);
    S.view = 'book'; S.token = null; S.portal = null; if (!S.form || S.form.portal) S.form = newForm(); S.done = null;
    S.form.tab = m && depts().some(d => d.key === m[1]) ? m[1] : null; render();
  }
  window.scrollTo(0, 0);
}
async function ensurePortal() { if (!S.portal) { try { S.portal = await S.A.rpc('portal', { token: S.token }); } catch (e) { S.loadErr = e.message; } } }
function render() {
  const app = $('#app');
  if (S.view === 'track') app.innerHTML = viewTrack();
  else if (S.view === 'me') app.innerHTML = viewMe();
  else app.innerHTML = S.done ? viewDone() : viewBook();
  const b = pageBrand(); setBrand(b);
  // header follows the brand: "Whale Wash / by PitStop 87"; the umbrella name when no brand is in view
  const biz = S.cat.business || 'PitStop 87';
  const name = b && b !== 'cs' ? BRANDS[b].name : biz;
  if ($('#biz').textContent !== name) { const t = $('#brand-txt'); t.classList.remove('swap'); void t.offsetWidth; t.classList.add('swap'); }
  $('#biz').textContent = name;
  const sub = b === 'cs' ? 'Car service' : b ? 'by ' + biz : '';
  $('#hd-sub').textContent = sub; $('#hd-sub').hidden = !sub;
  document.title = b === 'cs' ? 'Car service · ' + biz : b ? BRANDS[b].name + ' · ' + biz : biz;
  $('#paybar').hidden = !(S.view === 'book' && !S.done && !(S.token && !S.portal) && S.form && S.form.tab);
  document.body.classList.toggle('at-pick', S.view === 'book' && !S.done && !!S.form && !S.form.tab);
  document.body.classList.toggle('at-home', isHome());
  if (!$('#paybar').hidden) renderPaybar();
  S.pop = null; if (S.form) S.lastTab = S.form.tab;
  reveal();
}

/* ---------- reveal on scroll ----------
   Each section fades up the first time it scrolls into view. The page re-renders on every tap,
   so sections are remembered by their heading and only ever animate once. */
const seen = new Set(); let io = null;
const calm = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
function reveal() {
  if (calm() || !('IntersectionObserver' in window)) return;
  if (io) io.disconnect();
  io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('rv-in'); seen.add(e.target.dataset.rk); io.unobserve(e.target);
  }), { rootMargin: '0px 0px -6% 0px' });
  let n = 0;
  [...$('#app').children].forEach((el, i) => {
    const h = el.querySelector('h1,h2,h3');
    const k = S.view + ':' + (h ? (h.lastChild || h).textContent.trim() : el.className.split(' ')[0] + i);
    el.dataset.rk = k;
    if (seen.has(k)) return;
    el.classList.add('rv'); el.style.setProperty('--d', Math.min(n++, 3) * 80 + 'ms');
    io.observe(el);
  });
}

/* ---------- booking form ---------- */
function slotsFor(day) {
  const out = []; const now = new Date(); const isToday = day === today();
  for (let m = 7 * 60; m <= 19 * 60; m += 30) {
    const s = String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
    if (isToday) { const d = new Date(); d.setHours(Math.floor(m / 60), m % 60, 0, 0); if (d.getTime() < now.getTime() + 30 * 60e3) continue; }
    out.push(s);
  }
  return out;
}
function newForm() {
  const p = S.portal; const c = p ? p.customer : {};
  let day = today(); if (!slotsFor(day).length) day = ymd(addDays(new Date(), 1));
  const veh = p ? (p.items || []).filter(i => i.kind === 'vehicle') : [];
  return {
    portal: !!p, lines: [], tab: null, flows: {}, day, slot: '', drop: '',
    area: c.area && S.cat.zones.some(z => z.name === c.area) ? c.area : (c.area ? '__other' : ''), areaOther: c.area && !S.cat.zones.some(z => z.name === c.area) ? c.area : '',
    landmark: c.landmark || '', maps: c.maps || '', plate: veh[0] ? veh[0].label : '', make: veh[0] ? veh[0].details : '', colour: '',
    items: '', name: c.name || '', phone: c.phone ? showPhone(c.phone) : '', notes: '', err: ''
  };
}
const F = () => S.form;
const fDepts = () => [...new Set(F().lines.map(l => (svc(l.sid) || {}).dept).filter(Boolean))];
const flowOf = d => { const fl = F().flows[d]; return DEPT_FLOWS[d].includes(fl) ? fl : DEPT_FLOWS[d][0]; };
const anyTrip = () => fDepts().some(d => TRIP(flowOf(d)));
const areaVal = () => F().area === '__other' ? F().areaOther.trim() : F().area;
function memberCover() {
  // preview which lines a membership covers (the server decides for real)
  const cover = {}; if (!S.portal) return cover;
  const used = {};
  F().lines.forEach((l, i) => {
    const m = (S.portal.memberships || []).find(m => m.active && m.service_ids.includes(l.sid) && (m.remaining - (used[m.id] || 0)) >= l.qty);
    if (m) { used[m.id] = (used[m.id] || 0) + l.qty; cover[i] = m; }
  });
  return cover;
}
function estimate() {
  const cover = memberCover();
  let sub = 0; F().lines.forEach((l, i) => { const s = svc(l.sid); if (s && !cover[i]) sub += s.price * l.qty; });
  let fee = 0;
  const trips = fDepts().filter(d => TRIP(flowOf(d)));
  if (trips.length) {
    const z = S.cat.zones.find(z => z.name === areaVal());
    const free = S.portal && (S.portal.memberships || []).some(m => m.active && m.free_pickup && m.dept === trips[0]);
    fee = free ? 0 : (z ? +z.fee || 0 : 0);
  }
  const quote = F().lines.some(l => (svc(l.sid) || {}).price === 0);
  return { sub, fee, total: sub + fee, quote, cover };
}
/* A service named "Group · Item" is shown under a "Group" heading as "Item".
   The hints are only shown when a group or item has one of these names. */
const GROUP_HINT = { 'Full wash': 'Inside and outside', 'Half wash': 'Any car, one side only', 'Boda boda': 'Motorbikes', 'Add-on': 'Extras for your car' };
const ITEM_HINT = { 'Small car': 'Vitz, Fit, Demio, Axio', 'Normal car': 'Premio, Fielder, Probox, X-Trail', 'Land Cruiser': 'Land Cruiser, Prado and big 4x4s' };
const splitName = n => { const i = n.indexOf(' · '); return i < 0 ? ['', n] : [n.slice(0, i), n.slice(i + 3)]; };
function svcGroups(dept) {
  const out = [];
  S.cat.services.filter(s => s.dept === dept).forEach(s => {
    const [g, item] = splitName(s.name);
    let grp = out.find(x => x.name === g); if (!grp) out.push(grp = { name: g, items: [] });
    grp.items.push({ s, item });
  });
  return out;
}
const MAIN_DEPTS = ['wash', 'kinyozi']; // the two big doors on the first screen
const PICK_HEAD = { wash: 'What needs washing?', kinyozi: 'What would you like?', carpet: 'What needs cleaning?', garage: 'What does the car need?', nails: 'What would you like?' };
const pickHref = k => S.token ? '#' : '#s/' + k;
const DEPT_BLURB = { wash: 'Cars and boda bodas. Come in, or we pick up and drop off.', kinyozi: 'Cuts, shaves and dye. In the chair or at home.',
  carpet: 'KSh 15 per sq ft, final price after measuring. Sofas and mattresses coming soon.', garage: 'Service, repairs and diagnostics', nails: 'Manicure, pedicure and gel' };
const PICK_CTA = { wash: 'Book a wash', kinyozi: 'Book a cut' };
// the first screen's tile: a few rows of prices (one per group, or the first services when there are no groups)
function deptSummary(k) {
  const ss = S.cat.services.filter(s => s.dept === k);
  const gs = svcGroups(k).filter(g => g.name && g.name !== 'Add-on');
  const what = (gs.length ? gs.map(g => g.name) : ss.map(s => s.name)).slice(0, 3).join(' · ');
  const ps = ss.map(s => s.price).filter(Boolean);
  // both front-door panels show three rows, so they stand level: groups first, then single services
  const loose = svcGroups(k).filter(g => !g.name).flatMap(g => g.items.map(({ s, item }) => ({ name: item, price: s.price, from: false })));
  const rows = gs.length
    ? gs.map(g => { const p = g.items.map(i => i.s.price).filter(Boolean); const lo = p.length ? Math.min(...p) : 0; return { name: g.name, price: lo, from: p.some(v => v !== lo) }; }).concat(loose)
    : ss.map(s => ({ name: s.name, price: s.price, from: false }));
  return { what, from: ps.length ? Math.min(...ps) : 0, rows: rows.slice(0, 3) };
}
function viewPick() {
  // the first screen is only the doors: two big tiles, then round buttons for everything else
  const f = F(); const ds = depts(); const fd = fDepts();
  const main = ds.filter(d => MAIN_DEPTS.includes(d.key)).sort((a, b) => MAIN_DEPTS.indexOf(a.key) - MAIN_DEPTS.indexOf(b.key));
  const more = ds.filter(d => !MAIN_DEPTS.includes(d.key));
  const mark = (d, cls) => { const b = BRAND[d.key]; return b ? '<img class="' + cls + ' ' + b + '" src="' + img(BRANDS[b].mark) + '" alt="">' : '<span class="' + cls + ' dc">' + ic(DEPT_IC[d.key] || 'check') + '</span>'; };
  const price = (p, from) => p ? (from ? '<small>from</small> ' : '') + num(p) : 'Quote';
  const big = d => {
    const x = deptSummary(d.key); const b = BRAND[d.key] || '';
    return '<a class="pk ' + b + '" href="' + pickHref(d.key) + '" data-act="pick" data-v="' + d.key + '">'
      + '<span class="pk-top">' + mark(d, 'pk-mk') + '<span class="pk-t"><b>' + esc(d.name) + '</b>' + (b ? '<small>' + esc(BRANDS[b].name) + '</small>' : '') + '</span></span>'
      + '<span class="pk-list">' + x.rows.map(r => '<span><span>' + ic(svcIcon(d.key, r.name), 'pk-li') + esc(r.name) + '</span><b>' + price(r.price, r.from) + '</b></span>').join('') + '</span>'
      + '<span class="pk-cta">' + esc(PICK_CTA[d.key] || 'See prices') + ' <span aria-hidden="true">→</span></span></a>';
  };
  const small = d => { const x = deptSummary(d.key);
    return '<a class="pk-row" href="' + pickHref(d.key) + '" data-act="pick" data-v="' + d.key + '">' + mark(d, 'pk-ic')
      + '<span class="pk-t"><b>' + esc(d.name) + '</b><small>' + esc(DEPT_BLURB[d.key] || x.what) + '</small></span>'
      + (x.from ? '<span class="pk-from"><small>from</small>KES ' + num(x.from) + '</span>' : '') + '<span class="pk-chev" aria-hidden="true">›</span></a>'; };
  const n = f.lines.reduce((a, l) => a + pieceCount(l), 0);
  const back = fd.includes(S.lastTab) ? S.lastTab : fd[0];
  const cont = n ? '<div class="pk-cont"><span><b>' + n + (n === 1 ? ' service' : ' services') + '</b> in your booking</span><a class="btn primary" href="' + pickHref(back) + '" data-act="pick" data-v="' + back + '">Continue booking</a></div>' : '';
  const hi = f.portal ? 'Welcome back, ' + first(S.portal.customer.name) + '. ' : '';
  if (isHome()) return viewHome(main, more, big, small);
  return '<section class="pick"><div class="pk-head"><h1>' + esc(n ? 'Add another service' : hi + 'What do you need today?') + '</h1></div>' + cont
    + (main.length ? '<div class="pk-main">' + main.map(big).join('') + '</div>' : '')
    + (more.length ? (main.length ? '<h2 class="pk-sub">More services</h2>' : '') + '<div class="pk-more">' + more.map(small).join('') + '</div>' : '')
    + (f.portal ? '<a class="link pk-back" href="#me/' + esc(S.token) + '">Back to your page</a>' : '') + '</section>';
}
/* ---------- home: the editorial front page ----------
   Shown only to a first-time visitor on the plain front door (no services picked yet, not a customer link).
   Everything on it comes from the catalogue, so prices, plans and pickup areas stay true. */
const isHome = () => S.view === 'book' && !S.done && !S.token && !!S.form && !S.form.tab && !S.form.lines.length;
function viewHome(main, more, big, small) {
  const has = k => main.some(d => d.key === k);
  const cta = (k, label) => has(k) ? '<a class="hm-btn ' + BRAND[k] + '" href="#s/' + k + '" data-act="pick" data-v="' + k + '">' + label + ' <span aria-hidden="true">→</span></a>' : '';
  // the ticker: every group and single service on the menu, once each
  const names = []; depts().forEach(d => svcGroups(d.key).forEach(g => { if (g.name === 'Add-on') return; (g.name ? [g.name] : g.items.map(x => x.item)).forEach(n => { if (!names.includes(n)) names.push(n); }); }));
  const tick = names.map(n => '<span>' + esc(n) + '</span>').join('');
  const zones = (S.cat.zones || []).map(z => z.name).filter(Boolean);
  const where = zones.length ? 'our valet collects from ' + (zones.length > 3 ? zones.slice(0, 3).join(', ') + ' and nearby' : zones.length > 1 ? zones.slice(0, -1).join(', ') + ' and ' + zones[zones.length - 1] : zones[0]) : 'our valet collects it and brings it back clean';
  const plans = (S.cat.plans || []).filter(p => depts().some(d => d.key === p.dept));
  const club = p => { const b = BRAND[p.dept] || '';
    return '<article class="hm-club"' + (b === 'ww' || b === 'wab' ? ' data-brand="' + b + '"' : '') + '><span class="hm-club-k">' + esc(b ? BRANDS[b].name : deptName(p.dept)) + '</span><h3>' + esc(p.name) + '</h3>'
      + '<p class="hm-club-p"><b>' + num(p.price) + '</b><small>KES / ' + (p.days === 30 ? 'month' : p.days + ' days') + '</small></p><p class="hm-club-d">' + esc(p.perks || (p.allowance + ' visits')) + '</p>'
      + (bizWa() ? '<a class="hm-club-a" target="_blank" rel="noopener" href="' + esc(wa(bizWa(), 'Hi, I\'d like to join the ' + p.name + ' membership.')) + '">Ask to join <span aria-hidden="true">→</span></a>' : '') + '</article>'; };
  const steps = [
    ['calendar', 'Pick a service and a time', 'See the price first. Choose a time from 07:00 to 19:00, any day.'],
    ['truck', 'Come in, or we come to you', 'Drive into the bay, or ' + where + '.'],
    ['phone', 'Follow it live, then pay', 'Get a booking code and a live link. Pay by M-Pesa, cash or card when it is done.'],
  ];
  const gallery = ['The whole team in branded tees, standing in front of both shopfronts at dusk, smiling.', 'A freshly washed car rolling out of the bay, water still dripping, low angle.',
    'The WaBarbers chair from the side: black leather, gold light, mirror glow.', 'A valet handing car keys back to a customer at their gate.'];
  return '<section class="hm-hero hm-bleed" aria-labelledby="hm-h1"><div class="hm-photo" aria-hidden="true"></div><div class="hm-in hm-hero-in">'
      + '<p class="hm-eye"><i></i>' + esc(S.cat.business || 'PitStop 87') + ' · Car wash · Kinyozi</p>'
      + '<h1 id="hm-h1"><span>Drop the keys<em>.</em></span> <span>Take a seat<em>.</em></span></h1>'
      + '<p class="hm-lede">Whale Wash and WaBarbers share one bay. Book a wash and a cut in one go, or let the valet take the car while you sit back.</p>'
      + '<div class="hm-ctas">' + cta('wash', 'Book a wash') + cta('kinyozi', 'Book a cut') + (main.length ? '' : '<a class="hm-btn" href="#" data-act="jump" data-v="hm-doors">See services <span aria-hidden="true">→</span></a>') + '</div>'
      + '<dl class="hm-facts"><div>' + ic('clock') + '<dt>07–19</dt><dd>Every day</dd></div><div>' + ic('truck') + '<dt>Valet</dt><dd>Pickup and drop-off</dd></div><div>' + ic('live') + '<dt>Live</dt><dd>Track every step</dd></div></dl>'
    + '</div><a class="hm-cue" href="#" data-act="jump" data-v="hm-doors" aria-label="Scroll to services"><span></span></a></section>'
    + (tick ? '<div class="hm-tick hm-bleed" aria-hidden="true"><div class="hm-tick-r"><div>' + tick + '</div><div>' + tick + '</div></div></div>' : '')
    + (main.length ? '<section class="hm-sec" id="hm-doors"><header class="hm-h"><p class="hm-k">' + ic('shop') + ' The bay</p><h2>Two houses. One stop.</h2><p>A car wash in blue and white, a kinyozi in black and gold. Choose your door, or book both together.</p></header>'
      + '<div class="pk-main hm-doors">' + main.map(d => big(d).replace('<span class="pk-top">', '<span class="pk-ph" aria-hidden="true"></span><span class="pk-top">')).join('') + '</div></section>' : '')
    + '<section class="hm-sec hm-how"><header class="hm-h"><p class="hm-k">' + ic('key') + ' How it works</p><h2>Booked in a minute.<br>Followed to the finish.</h2></header><ol class="hm-steps">'
      + steps.map((s, i) => '<li><span class="hm-si">' + ic(s[0]) + '</span><span class="hm-n">0' + (i + 1) + '</span><h3>' + esc(s[1]) + '</h3><p>' + esc(s[2]) + '</p>' + (i < 2 ? '<span class="hm-next" aria-hidden="true">' + ic('arrow') + '</span>' : '') + '</li>').join('') + '</ol></section>'
    + '<section class="hm-sec hm-gal-s"><header class="hm-h"><p class="hm-k">' + ic('camera') + ' Inside the bay</p><h2>Come and see.</h2></header><div class="hm-gal">' + gallery.map((g, i) => ph(g, i === 0 ? 'big' : '')).join('') + '</div></section>'
    + (more.length ? '<section class="hm-sec"><header class="hm-h"><p class="hm-k">' + ic('sparkle') + ' Also in the bay</p><h2>More services</h2></header><div class="pk-more">' + more.map(small).join('') + '</div></section>' : '')
    + (plans.length ? '<section class="hm-sec hm-clubs-s"><header class="hm-h"><p class="hm-k">' + ic('crown') + ' Memberships</p><h2>Regulars pay less.</h2><p>Monthly packages for the car and the chair. Pay once a month and save on every visit.</p></header><div class="hm-clubs">' + plans.map(club).join('') + '</div></section>' : '')
    + '<section class="hm-end hm-bleed"><div class="hm-in"><p class="hm-k">Open for bookings</p><h2>Ready when you are<em>.</em></h2><div class="hm-ctas">' + cta('wash', 'Book a wash') + cta('kinyozi', 'Book a cut')
      + (bizWa() ? '<a class="hm-btn ghost" target="_blank" rel="noopener" href="' + esc(wa(bizWa(), 'Hi ' + (S.cat.business || '') + ', ')) + '">' + ic('chat') + 'WhatsApp us</a>' : '') + '</div></div></section>';
}
function viewBook() {
  if (S.token && !S.portal) return '<div class="empty"><h2>This link doesn\'t work any more</h2><p>' + esc(S.loadErr || '') + '</p>' + (bizWa() ? '<a class="btn wa" target="_blank" rel="noopener" href="' + esc(wa(bizWa(), 'Hi, my booking link isn\'t working.')) + '">Ask us on WhatsApp</a>' : '') + '</div>';
  const f = F(); if (!f.tab) return viewPick();
  const fd = fDepts(); const est = estimate();
  const hero = '<div class="crumb"><a href="#" data-act="pick" data-v="">← All services</a>' + (f.portal ? '<a class="link" href="#me/' + esc(S.token) + '">Your page</a>' : '') + '</div>';
  const swap = S.lastTab && S.lastTab !== f.tab ? ' swap' : ''; // only animate when the department actually changed
  let i = 0;
  const grid = svcGroups(f.tab).map(g => '<div class="sgroup">' + (g.name ? '<h3>' + ic(svcIcon(f.tab, g.name), 'sg-ic') + esc(g.name) + (GROUP_HINT[g.name] ? ' <small>' + esc(GROUP_HINT[g.name]) + '</small>' : '') + '</h3>' : '')
    + '<div class="svc-grid big' + swap + '">' + g.items.map(({ s, item }) => {
      const l = f.lines.find(x => x.sid === s.id); const h = ITEM_HINT[item];
      return '<button class="svc" style="--i:' + (i++) + '" data-act="add" data-sid="' + esc(s.id) + '" aria-pressed="' + !!l + '"><span class="svc-ic">' + ic(svcIcon(f.tab, s.name)) + '</span><span class="sn">' + esc(item) + '</span>' + (h ? '<small class="sh">' + esc(h) + '</small>' : '') + '<b>' + (s.price ? 'KES ' + num(s.price) + (isSqft(s) ? ' per sq ft' : '') : 'Quote on inspection') + '</b>' + (l ? '<span class="q' + (S.pop === s.id ? ' pop' : '') + '">' + pieceCount(l) + '</span>' : '') + '</button>';
    }).join('') + '</div></div>').join('');
  const lines = f.lines.length ? '<div class="lines">' + f.lines.map((l, i) => {
    const s = svc(l.sid); if (!s) return '';
    const m = est.cover[i];
    if (isSqft(s)) return '<div class="line sqft"><span class="ln"><span>' + esc(s.name) + '</span><small class="muted">Length × width of each piece, in feet. KES ' + num(s.price) + ' per sq ft.</small></span>'
      + '<b class="sq-a" id="sq-a-' + i + '">' + l.qty + ' sq ft</b><span class="pfix" id="sq-p-' + i + '">' + num(s.price * l.qty) + '</span><button class="icon-btn" data-act="del" data-i="' + i + '" aria-label="Remove ' + esc(s.name) + '">×</button>'
      + '<div class="sizes">' + l.sizes.map((p, k) => '<div class="size"><span class="muted small">Piece ' + (k + 1) + '</span>'
        + '<input id="sq-' + i + '-' + k + '-0" data-sz="' + i + ':' + k + ':0" inputmode="decimal" value="' + esc(p[0]) + '" placeholder="Length" aria-label="Piece ' + (k + 1) + ' length in feet"><span aria-hidden="true">×</span>'
        + '<input id="sq-' + i + '-' + k + '-1" data-sz="' + i + ':' + k + ':1" inputmode="decimal" value="' + esc(p[1]) + '" placeholder="Width" aria-label="Piece ' + (k + 1) + ' width in feet"><span class="muted small">ft</span>'
        + (l.sizes.length > 1 ? '<button class="icon-btn" data-act="sz-del" data-i="' + i + '" data-k="' + k + '" aria-label="Remove piece ' + (k + 1) + '">×</button>' : '') + '</div>').join('')
      + '<button class="btn ghost sm" data-act="sz-add" data-i="' + i + '">+ Add another piece</button></div></div>';
    return '<div class="line"><span class="ln"><span>' + esc(s.name) + '</span>' + (m ? '<span class="pill p-member">Covered by ' + esc(m.plan_name) + '</span>' : '') + '</span><div class="qty"><button class="icon-btn" data-act="qty" data-i="' + i + '" data-d="-1" aria-label="One less">−</button><span>' + l.qty + '</span><button class="icon-btn" data-act="qty" data-i="' + i + '" data-d="1" aria-label="One more">+</button></div><span class="pfix">' + (m ? '0' : s.price ? num(s.price * l.qty) : 'Quote') + '</span><button class="icon-btn" data-act="del" data-i="' + i + '" aria-label="Remove ' + esc(s.name) + '">×</button></div>';
  }).join('') + '</div>' : '<p class="muted" style="margin:0">Tap what you need. Tap again to add one more.</p>';
  const addMore = f.lines.length && depts().length > 1 ? '<a class="add-more" href="#" data-act="pick" data-v="">+ Add another service, like ' + esc(f.tab === 'kinyozi' ? 'a car wash' : 'a haircut') + '</a>' : '';
  const pics = PHOTOS[f.tab] ? '<div class="mini-gal' + swap + '">' + PHOTOS[f.tab].map((p, k) => ph(p, k === 0 ? 'big' : '')).join('') + '</div>' : '';
  const step1 = brandCard(BRAND[f.tab]).replace('class="bcard ', 'class="bcard' + swap + ' ') + pics + '<section class="step">' + stH(1, 'check', PICK_HEAD[f.tab] || 'What do you need?') + grid + lines + addMore + '</section>';
  const step2 = fd.length ? '<section class="step">' + stH(2, 'key', 'How?') + fd.map(d => '<div class="how"><span class="lbl"><span class="dc">' + ic(DEPT_IC[d] || 'check') + '</span>' + esc(deptName(d)) + '</span><div class="seg big pics">' + DEPT_FLOWS[d].map(fl => '<button data-act="flow" data-d="' + d + '" data-v="' + fl + '" aria-pressed="' + (flowOf(d) === fl) + '">' + ic(FLOW_IC[fl] || 'check') + '<span>' + esc(flowLabel(fl, d, 'customer')) + '</span></button>').join('') + '</div></div>').join('') + '</section>' : '';
  const days = []; for (let i = 0; i < 10; i++) { const d = ymd(addDays(new Date(), i)); if (slotsFor(d).length) days.push(d); }
  const slots = slotsFor(f.day);
  const valet = fd.some(d => flowOf(d) === 'valet');
  const dropOpts = f.slot ? slotsFor(f.day).filter(s => s > f.slot).concat(['20:00', '21:00']).filter((v, i, a) => a.indexOf(v) === i && v >= addH(f.slot, 2)) : [];
  const step3 = fd.length ? '<section class="step">' + stH(3, 'clock', 'When?') + '<div class="lbl">' + ic('calendar', 'lb-ic') + 'Day</div><div class="days">' + days.map(d => { const x = fromYmd(d); return '<button class="chip" data-act="day" data-v="' + d + '" aria-pressed="' + (f.day === d) + '"><b>' + esc(d === today() ? 'Today' : d === ymd(addDays(new Date(), 1)) ? 'Tomorrow' : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][x.getDay()]) + '</b><small>' + x.getDate() + ' ' + MON[x.getMonth()] + '</small></button>'; }).join('') + '</div>'
    + '<div class="lbl">' + ic('clock', 'lb-ic') + (valet ? 'Pickup time' : 'Time') + '</div><div class="slots">' + slots.map(s => '<button class="chip" data-act="slot" data-v="' + s + '" aria-pressed="' + (f.slot === s) + '">' + s + '</button>').join('') + '</div>'
    + (valet && f.slot ? '<div class="field">' + lb('b-drop', 'truck', 'Bring it back by') + '<select id="b-drop" data-f="drop"><option value="">Whenever it\'s ready</option>' + dropOpts.map(s => '<option' + (f.drop === s ? ' selected' : '') + '>' + s + '</option>').join('') + '</select></div>' : '') + '</section>' : '';
  const step4 = anyTrip() ? '<section class="step">' + stH(4, 'pin', 'Where?') + '<div class="grid2"><div class="field">' + lb('b-area', 'pin', 'Area') + '<select id="b-area" data-f="area" data-rerender><option value="">Choose your area</option>' + S.cat.zones.map(z => '<option value="' + esc(z.name) + '"' + (f.area === z.name ? ' selected' : '') + '>' + esc(z.name) + (+z.fee ? ' · KES ' + num(z.fee) + ' pickup' : ' · free pickup') + '</option>').join('') + '<option value="__other"' + (f.area === '__other' ? ' selected' : '') + '>Somewhere else</option></select></div>'
    + (f.area === '__other' ? '<div class="field">' + lb('b-areao', 'pin', 'Area name') + '<input id="b-areao" data-f="areaOther" value="' + esc(f.areaOther) + '" autocomplete="address-level2"></div>' : '<div></div>') + '</div>'
    + '<div class="field">' + lb('b-lm', 'home', 'Directions for the valet') + '<input id="b-lm" data-f="landmark" value="' + esc(f.landmark) + '" placeholder="Estate, building, gate colour, house number" autocomplete="street-address"></div>'
    + '<div class="row-btns"><button class="btn ghost sm" data-act="locate">' + ic('pin') + (f.maps ? 'Update my location' : 'Share my location') + '</button>' + (f.maps ? '<span class="loc-ok">Location added</span>' : '<span class="muted small">Helps the valet find you</span>') + '</div></section>' : '';
  let n = anyTrip() ? 5 : 4;
  const veh = fd.some(d => DEPT[d].vehicle); const pcs = fd.some(d => DEPT[d].pieces);
  const myCars = S.portal ? (S.portal.items || []).filter(i => i.kind === 'vehicle') : [];
  const step5 = (veh || pcs) ? '<section class="step">' + stH(n++, veh ? 'car' : 'rug', veh ? 'Your car' : 'Your items')
    + (veh && myCars.length ? '<div class="vchips">' + myCars.map((v, i) => '<button class="vchip" data-act="car" data-i="' + i + '" aria-pressed="' + (plate(f.plate) === v.label) + '"><span class="plate">' + esc(v.label) + '</span>' + esc(v.details || '') + '</button>').join('') + '</div>' : '')
    + (veh ? '<div class="grid3"><div class="field">' + lb('b-plate', 'plate', 'Number plate') + '<input id="b-plate" data-f="plate" value="' + esc(f.plate) + '" placeholder="KDA 123B" autocapitalize="characters"></div><div class="field">' + lb('b-make', 'car', 'Make and model') + '<input id="b-make" data-f="make" value="' + esc(f.make) + '" placeholder="Toyota Axio"></div><div class="field">' + lb('b-colour', 'drop', 'Colour') + '<input id="b-colour" data-f="colour" value="' + esc(f.colour) + '" placeholder="Silver"></div></div>' : '')
    + (pcs ? '<div class="field">' + lb('b-items', 'note', 'Describe the items') + '<textarea id="b-items" data-f="items" rows="2" placeholder="2 carpets, one 8×10 grey and one 5×7 red.">' + esc(f.items) + '</textarea></div>' : '') + '</section>' : '';
  const step6 = fd.length ? '<section class="step">' + stH(n++, f.portal ? 'note' : 'user', f.portal ? 'Anything else?' : 'Your details')
    + (f.portal ? '' : '<div class="grid2"><div class="field">' + lb('b-name', 'user', 'Your name') + '<input id="b-name" data-f="name" value="' + esc(f.name) + '" autocomplete="name"></div><div class="field">' + lb('b-phone', 'phone', 'Phone (WhatsApp)') + '<input id="b-phone" data-f="phone" value="' + esc(f.phone) + '" inputmode="tel" autocomplete="tel" placeholder="0712 345 678"></div></div>')
    + '<div class="field">' + lb('b-notes', 'note', 'Notes (optional)') + '<textarea id="b-notes" data-f="notes" rows="2" placeholder="Anything we should know">' + esc(f.notes) + '</textarea></div>'
    + (f.err ? '<div class="err" role="alert">' + esc(f.err) + '</div>' : '') + '</section>' : '';
  const myPlans = (S.cat.plans || []).filter(p => p.dept === f.tab);
  const plans = !f.portal && myPlans.length ? '<section class="step" id="plans">' + stH(0, 'crown', 'Monthly packages') + '<p class="muted" style="margin:0">Pay once a month and save. Ask us on WhatsApp to join.</p><div class="plans">' + myPlans.map(p => '<div class="plan"><h3>' + esc(p.name) + '</h3><b class="pr">KES ' + num(p.price) + ' <small>/ ' + (p.days === 30 ? 'month' : p.days + ' days') + '</small></b><p>' + esc(p.perks || (p.allowance + ' visits')) + '</p>' + (bizWa() ? '<a class="btn ghost sm" target="_blank" rel="noopener" href="' + esc(wa(bizWa(), 'Hi, I\'d like to join the ' + p.name + ' membership.')) + '">Ask to join</a>' : '') + '</div>').join('') + '</div></section>' : '';
  return hero + step1 + step2 + step3 + step4 + step5 + step6 + plans;
}
function addH(t, h) { const [a, b] = t.split(':').map(Number); return String(Math.min(23, a + h)).padStart(2, '0') + ':' + String(b).padStart(2, '0'); }
// Phones show the total and the button; on desktop the same box becomes a summary card that
// also lists each line (the extra parts are hidden by CSS on small screens).
function renderPaybar() {
  const f = F(); if (!f) return; const e = estimate();
  const n = f.lines.reduce((a, l) => a + pieceCount(l), 0);
  const w = $('#paybar .pb-in');
  if (!w.querySelector('[data-act=submit]')) w.innerHTML = '<div class="pb-head"><span class="mark" aria-hidden="true"></span>Your booking</div><div class="pb-list"></div><div class="sum"><b></b><span></span></div><button class="btn accent lg" data-act="submit">Book now</button><div class="pb-trust"><span>Pay by M-Pesa</span><span>Track it live</span></div>';
  const key = JSON.stringify(f.lines) + '|' + e.fee + '|' + Object.keys(e.cover).join();
  if (w.dataset.k !== key) {
    w.dataset.k = key;
    w.querySelector('.pb-list').innerHTML = n ? '<ul class="pb-lines">' + f.lines.map((l, i) => { const s = svc(l.sid); if (!s) return ''; return '<li><span>' + esc(s.name) + (qtyNote(l) ? ' <small>' + esc(qtyNote(l).replace(/^ · | ×/, '')) + '</small>' : '') + '</span><b>' + (e.cover[i] ? 'Member' : s.price ? num(s.price * l.qty) : 'Quote') + '</b></li>'; }).join('')
      + (e.fee ? '<li><span>Pickup & drop-off</span><b>' + num(e.fee) + '</b></li>' : '') + '</ul>' : '<p class="pb-empty">Pick a service to start. You can mix brands in one booking.</p>';
  }
  countTo(w.querySelector('.sum b'), n ? e.total : 0, n && e.quote ? '+' : '');
  w.querySelector('.sum span').textContent = n ? n + (n === 1 ? ' service' : ' services') + (e.fee ? ' · incl. KES ' + num(e.fee) + ' pickup' : '') + (e.quote ? ' · some priced on inspection' : '') : 'Pick a service to start';
  const b = w.querySelector('[data-act=submit]'); b.disabled = !(n && !S.sending); b.textContent = S.sending ? 'Booking…' : 'Book now';
}
// the total rolls up or down to its new value instead of jumping
function countTo(el, to, suffix) {
  const from = +(el.dataset.v || 0); el.dataset.v = to;
  cancelAnimationFrame(+el.dataset.raf || 0);
  if (from === to || calm()) { el.textContent = kes(to) + suffix; return; }
  const t0 = performance.now(), dur = 520;
  const step = t => { const p = Math.min(1, (t - t0) / dur), k = 1 - Math.pow(1 - p, 3);
    el.textContent = kes(Math.round(from + (to - from) * k)) + suffix;
    if (p < 1) el.dataset.raf = requestAnimationFrame(step); };
  el.dataset.raf = requestAnimationFrame(step);
}
async function submit() {
  const f = F(); f.err = '';
  const fd = fDepts();
  if (!f.lines.length) f.err = 'Pick at least one service.';
  else if (f.lines.some(l => isSqft(svc(l.sid)) && !l.qty)) f.err = 'Add the length and width of each carpet in feet.';
  else if (!f.slot) f.err = 'Choose a time.';
  else if (anyTrip() && !areaVal()) f.err = 'Choose your area so the valet knows where to go.';
  else if (!f.portal && !f.name.trim()) f.err = 'Add your name.';
  else if (!f.portal && !validPhone(f.phone)) f.err = 'Add a valid phone number, like 0712 345 678.';
  if (f.err) { render(); const el = document.querySelector('.err'); if (el) el.scrollIntoView({ block: 'center' }); return; }
  const p = {
    day: f.day, slot: f.slot, drop_slot: f.drop || '', area: anyTrip() ? areaVal() : '', landmark: f.landmark.trim(), maps: f.maps,
    plate: fd.some(d => DEPT[d].vehicle) ? f.plate.trim() : '', make: f.make.trim(), colour: f.colour.trim(),
    notes: [f.notes.trim(), f.items.trim() && fd.some(d => DEPT[d].pieces) ? 'Items: ' + f.items.trim() : ''].filter(Boolean).join('\n'),
    groups: fd.map(d => ({ dept: d, flow: flowOf(d), lines: f.lines.filter(l => (svc(l.sid) || {}).dept === d).map(l => isSqft(svc(l.sid)) ? { sid: l.sid, qty: l.qty, sizes: sizesText(l.sizes) } : { sid: l.sid, qty: l.qty }) }))
  };
  S.sending = true; renderPaybar();
  try {
    const r = f.portal ? await S.A.rpc('portal_book', Object.assign({ token: S.token }, p)) : await S.A.rpc('book', Object.assign({ name: f.name.trim(), phone: f.phone }, p));
    S.done = Object.assign({}, r, { day: f.day, slot: f.slot, total: estimate().total, depts: fd, name: f.portal ? S.portal.customer.name : f.name });
    S.form = null; if (S.portal) S.portal = null;
    render(); window.scrollTo(0, 0);
  } catch (e) { f.err = e.message; render(); }
  S.sending = false; if (!$('#paybar').hidden) renderPaybar();
}
function viewDone() {
  const d = S.done; const tl = links.track(d.track_token);
  const msg = 'Hi ' + S.cat.business + ', I just booked ' + (d.codes || [d.code]).join(' + ') + ' for ' + dayName(d.day).toLowerCase() + ' at ' + d.slot + '. ' + tl;
  return '<div class="done-card"><svg class="okmark" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-16"/></svg><span class="pill s-done">Booking received</span><h1>Thanks, ' + esc(first(d.name)) + '!</h1>'
    + '<div class="bigcode">' + esc(d.code) + '</div>'
    + '<p style="margin:0">' + esc(dayName(d.day)) + ' at ' + esc(d.slot) + '. We\'ll confirm on WhatsApp shortly.</p>'
    + (bizWa() ? '<a class="btn wa lg" target="_blank" rel="noopener" href="' + esc(wa(bizWa(), msg)) + '">' + ic('chat') + 'Send it to us on WhatsApp</a><p class="muted small" style="margin:0">This gets you a faster confirmation.</p>' : '')
    + '<div class="row-btns"><a class="btn primary" href="#t/' + esc(d.track_token) + '">' + ic('live') + 'Track your booking</a><button class="btn ghost" data-act="again">' + ic('calendar') + 'Book something else</button></div>'
    + '<p class="muted small" style="margin:0">Save the tracking link to check on your booking any time.</p></div>';
}

/* ---------- track ---------- */
async function loadTrack(silent) {
  if (!silent) $('#app').innerHTML = '<p class="loading">Finding your booking…</p>';
  try { S.track = await S.A.rpc('track', { token: S.token }); S.loadErr = ''; }
  catch (e) { S.track = null; S.loadErr = e.message; }
  if (S.view === 'track') { render(); clearInterval(pollT); pollT = setInterval(() => { if (document.visibilityState === 'visible') loadTrack(true); }, 30000); }
}
function jobCard(j) {
  const g = groupOf(j.status);
  const lines = '<table class="t"><tbody>' + j.lines.map(l => '<tr><td class="wrap-cell">' + esc(l.name) + esc(qtyNote(l)) + (l.sizes ? ' <small class="muted">(' + esc(l.sizes) + ')</small>' : '') + (l.member ? ' <span class="pill p-member">Membership</span>' : '') + '</td><td class="num">' + (l.price ? num(l.price * l.qty) : l.member ? '0' : 'Quote') + '</td></tr>').join('')
    + (j.valet_fee ? '<tr><td>Pickup & drop-off</td><td class="num">' + num(j.valet_fee) + '</td></tr>' : '')
    + (j.discount ? '<tr><td>Discount</td><td class="num">−' + num(j.discount) + '</td></tr>' : '')
    + '<tr><td><b>Total</b></td><td class="num"><b>' + kes(j.total) + '</b></td></tr>'
    + (j.paid ? '<tr><td>Paid</td><td class="num">' + kes(j.paid) + '</td></tr>' : '') + '</tbody></table>';
  const who = j.flow === 'valet' && j.valet ? 'Your valet: ' + j.valet : j.staff ? 'With ' + j.staff : '';
  const b = BRAND[j.dept];
  return '<article class="jcard"' + (b ? ' data-brand="' + b + '"' : '') + '><header>' + (b ? '<img class="bimg ' + b + '" src="' + img(BRANDS[b].mark) + '" alt="">' : '<span class="dc">' + esc(DEPT[j.dept].code) + '</span>') + '<b style="margin-right:auto">' + (b ? esc(BRANDS[b].name) + ' · ' : '') + esc(deptName(j.dept)) + '</b><span class="muted small">' + esc(j.code) + '</span></header>'
    + '<div class="status-big">' + esc(statusLabel(j.status, j, 'customer')) + '</div>'
    + (j.status !== 'cancelled' ? tracker(j, 'customer') : '')
    + '<div class="jmeta"><span>' + ic('calendar') + esc(dayName(j.day)) + ' · ' + esc(t5(j.slot)) + '</span><span>' + ic(FLOW_IC[j.flow] || 'check') + esc(flowLabel(j.flow, j.dept, 'customer')) + '</span>' + (j.drop_slot ? '<span>' + ic('clock') + 'Back by ' + esc(t5(j.drop_slot)) + '</span>' : '') + (who ? '<span>' + ic('user') + esc(who) + '</span>' : '') + '</div>'
    + (j.items.length ? '<div class="vchips">' + j.items.map(i => '<span class="vchip" style="cursor:default">' + esc(i) + '</span>').join('') + '</div>' : '')
    + (j.tags.length ? '<div class="jmeta">Tags: ' + j.tags.map(t => '<span class="tagno">' + esc(t) + '</span>').join(' ') + '</div>' : '')
    + lines
    + (j.balance > 0 && j.status !== 'cancelled' ? '<div class="note"><b>Balance: ' + kes(j.balance) + '.</b> ' + (S.track.biz.mpesa ? 'Pay by M-Pesa to ' + esc(S.track.biz.mpesa) + ', or pay when we\'re done.' : 'Pay when we\'re done.') + '</div>' : '')
    + '</article>';
}
function viewTrack() {
  if (!S.track) return '<div class="empty"><h2>Booking not found</h2><p>' + esc(S.loadErr) + '</p><a class="btn ghost" href="' + esc(links.home) + '">Make a new booking</a></div>';
  const t = S.track; const codes = t.jobs.map(j => j.code).join(' + ');
  return '<div class="vh"><h1>Hi ' + esc(t.name || 'there') + '</h1><span class="sub">Booking ' + esc(codes) + '</span></div>'
    + t.jobs.map(jobCard).join('')
    + '<div class="row-btns">' + (t.biz.whatsapp ? '<a class="btn wa" target="_blank" rel="noopener" href="' + esc(wa(t.biz.whatsapp, 'Hi, about my booking ' + codes + ': ')) + '">' + ic('chat') + 'Message us on WhatsApp</a>' : '')
    + (t.can_cancel ? '<button class="btn danger" data-act="cancel" data-confirm="Tap again to cancel">Cancel booking</button>' : '') + '<a class="btn ghost" href="' + esc(links.home) + '">Book something else</a></div>'
    + '<p class="muted small" style="margin:0">This page updates on its own. Last checked ' + esc(hm(new Date())) + '.</p>';
}

/* ---------- customer page ---------- */
async function loadPortal() {
  $('#app').innerHTML = '<p class="loading">Opening your page…</p>';
  try { S.portal = await S.A.rpc('portal', { token: S.token }); S.loadErr = ''; } catch (e) { S.portal = null; S.loadErr = e.message; }
  if (S.view === 'me') render();
}
function memberCard(m) {
  const pips = Array.from({ length: Math.min(m.allowance, 12) }, (_, i) => '<i class="' + (i < m.remaining ? 'on' : '') + '"></i>').join('');
  return '<div class="mcard' + (m.active ? '' : ' off') + '"><span class="sec-h" style="color:inherit;opacity:.8;margin:0">' + (m.active ? 'Membership' : 'Ended ' + esc(longDay(m.ends))) + '</span><h3>' + esc(m.plan_name) + '</h3>'
    + (m.active ? '<div><span class="left">' + m.remaining + '</span> <span>of ' + m.allowance + ' left</span></div><div class="pips">' + pips + '</div><span>Valid until ' + esc(longDay(m.ends)) + (m.free_pickup ? ' · free pickup' : '') + '</span>' : '<span>' + m.used + ' of ' + m.allowance + ' used</span>') + '</div>';
}
function viewMe() {
  const p = S.portal;
  if (!p) return '<div class="empty"><h2>This link doesn\'t work</h2><p>' + esc(S.loadErr) + '</p></div>';
  const c = p.customer; const act = p.memberships.filter(m => m.active); const old = p.memberships.filter(m => !m.active).slice(0, 2);
  return '<div class="vh"><h1>Hi ' + esc(first(c.name)) + '</h1><span class="sub">' + p.stats.visits + (p.stats.visits === 1 ? ' visit' : ' visits') + '</span></div>'
    + act.map(memberCard).join('')
    + '<div class="row-btns"><a class="btn accent lg" href="#book/' + esc(S.token) + '">' + ic('calendar') + 'Book again</a>' + (p.biz.whatsapp ? '<a class="btn wa" target="_blank" rel="noopener" href="' + esc(wa(p.biz.whatsapp, 'Hi, it\'s ' + c.name + '. ')) + '">' + ic('chat') + 'WhatsApp us</a>' : '') + '</div>'
    + (p.upcoming.length ? '<section class="card"><h3>Coming up</h3><div class="list">' + p.upcoming.map(j => '<a class="crow" style="grid-template-columns:auto minmax(0,1fr) auto;text-decoration:none;color:inherit" href="#t/' + esc(j.track_token) + '"><span class="dc">' + esc(DEPT[j.dept].code) + '</span><span class="cinfo"><b>' + esc(dayName(j.day)) + ' · ' + esc(t5(j.slot)) + '</b><span class="js">' + esc(j.lines.map(l => l.name).join(', ')) + '</span></span><span class="pill s-' + groupOf(j.status) + '">' + esc(statusLabel(j.status, j, 'customer')) + '</span></a>').join('') + '</div></section>' : '')
    + (p.items.length ? '<section class="card"><h3>Your cars and items</h3><div class="vchips">' + p.items.map(i => '<span class="vchip" style="cursor:default">' + (i.kind === 'vehicle' ? '<span class="plate">' + esc(i.label) + '</span>' + esc(i.details || '') : esc(i.label)) + (i.last ? ' · last ' + esc(dayName(i.last).toLowerCase()) : '') + '</span>').join('') + '</div></section>' : '')
    + '<section class="card"><h3>History</h3>' + (p.history.length ? '<table class="t"><tbody>' + p.history.map(j => '<tr><td>' + esc(longDay(j.day)) + '</td><td class="wrap-cell">' + esc(j.lines.map(l => l.name).join(', ')) + '</td><td class="num">' + num(j.total) + '</td></tr>').join('') + '</tbody></table>' : '<p class="muted" style="margin:0">Your finished visits will show here.</p>') + '</section>'
    + old.map(memberCard).join('')
    + '<p class="muted small" style="margin:0">This page is private to you. Keep the link to yourself.</p>';
}

/* ---------- events ---------- */
const H = {
  pick: a => {
    // open a department (or the picker when v is empty); public pages use the address so the phone's back button works
    const v = a.dataset.v || null;
    if (S.view === 'book' && S.token) { F().tab = v; render(); window.scrollTo(0, 0); return; }
    const want = v ? '#s/' + v : '';
    if (location.hash === want || (!want && !location.hash)) { S.form = S.form || newForm(); S.done = null; F().tab = v; render(); window.scrollTo(0, 0); }
    else location.hash = want;
  },
  add: a => {
    const f = F(); const sid = a.dataset.sid; const l = f.lines.find(x => x.sid === sid);
    if (isSqft(svc(sid))) { if (l) l.sizes.push(['', '']); else f.lines.push({ sid, qty: 0, sizes: [['', '']] }); }
    else if (l) l.qty++; else f.lines.push({ sid, qty: 1 });
    f.err = ''; S.pop = sid; render();
  },
  'sz-add': a => { const l = F().lines[+a.dataset.i]; if (l) { l.sizes.push(['', '']); render(); } },
  'sz-del': a => { const l = F().lines[+a.dataset.i]; if (l) { l.sizes.splice(+a.dataset.k, 1); l.qty = areaOf(l.sizes); render(); } },
  brandgo: a => H.pick(a), // footer brand cards open that department from anywhere on the site
  jump: a => { const t = document.getElementById(a.dataset.v); if (t) t.scrollIntoView({ behavior: calm() ? 'auto' : 'smooth', block: 'start' }); },
  qty: a => { const l = F().lines[+a.dataset.i]; if (!l) return; l.qty = Math.max(1, Math.min(50, l.qty + (+a.dataset.d))); render(); },
  del: a => { F().lines.splice(+a.dataset.i, 1); render(); },
  flow: a => { F().flows[a.dataset.d] = a.dataset.v; render(); },
  day: a => { const f = F(); f.day = a.dataset.v; if (!slotsFor(f.day).includes(f.slot)) f.slot = ''; f.drop = ''; render(); },
  slot: a => { F().slot = a.dataset.v; F().drop = ''; render(); },
  car: a => { const v = (S.portal.items || []).filter(i => i.kind === 'vehicle')[+a.dataset.i]; if (v) { F().plate = v.label; F().make = v.details || ''; render(); } },
  locate: () => {
    if (!navigator.geolocation) { toast('Your phone didn\'t share a location. Add directions instead.'); return; }
    toast('Getting your location…');
    navigator.geolocation.getCurrentPosition(pos => { F().maps = 'https://maps.google.com/?q=' + pos.coords.latitude.toFixed(6) + ',' + pos.coords.longitude.toFixed(6); toast('Location added'); render(); },
      () => toast('Location is off for this site. Add directions instead.'), { enableHighAccuracy: true, timeout: 12000 });
  },
  submit: () => submit(),
  again: () => { S.done = null; S.form = newForm(); location.hash = ''; render(); },
  cancel: async () => { try { S.track = await S.A.rpc('track_cancel', { token: S.token }); toast('Booking cancelled'); render(); } catch (e) { toast(e.message); } },
};
document.addEventListener('click', e => {
  const a = e.target.closest('[data-act]'); if (!a || a.disabled) return;
  if (a.dataset.confirm && !a.dataset.armed) { e.preventDefault(); a.dataset.armed = '1'; a.dataset.label = a.textContent; a.textContent = a.dataset.confirm; setTimeout(() => { if (a.isConnected) { delete a.dataset.armed; a.textContent = a.dataset.label; } }, 3500); return; }
  const h = H[a.dataset.act]; if (h) { e.preventDefault(); h(a, e); }
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.sz && S.form) {
    // carpet size typed: update the area and price in place so the keyboard stays open
    const [i, k, d] = t.dataset.sz.split(':').map(Number); const l = F().lines[i]; if (!l) return;
    l.sizes[k][d] = t.value.replace(/[^\d.]/g, ''); l.qty = areaOf(l.sizes);
    const s = svc(l.sid); const a = $('#sq-a-' + i), p = $('#sq-p-' + i);
    if (a) a.textContent = l.qty + ' sq ft'; if (p) p.textContent = num(s.price * l.qty);
    renderPaybar(); return;
  }
  if (!t.dataset.f || !S.form) return;
  S.form[t.dataset.f] = t.value;
  if (t.dataset.f === 'phone' || t.dataset.f === 'name') S.form.err = '';
});
document.addEventListener('change', e => {
  const t = e.target; if (!t.dataset.f || !S.form) return;
  S.form[t.dataset.f] = t.value;
  if ('rerender' in t.dataset) render(); else renderPaybar();
});
boot();
