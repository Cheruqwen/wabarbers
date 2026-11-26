// PitStop 87 · shared code for the public site and the staff app
export const CFG = Object.assign({
  supabaseUrl: '', supabaseAnonKey: '', loginDomain: 'staff.pitstop-app.com', siteUrl: ''
}, window.PITSTOP_CONFIG || {});
const QS = new URLSearchParams(location.search);
export const DEMO = !CFG.supabaseUrl || QS.has('demo');
const SUPABASE_JS = CFG.supabaseJs || 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/dist/umd/supabase.js';

/* ---------- small helpers ---------- */
export const $ = (s, r = document) => r.querySelector(s);
export const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const clone = o => JSON.parse(JSON.stringify(o));
export const pad = n => String(n).padStart(2, '0');
export const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
export const hm = d => pad(d.getHours()) + ':' + pad(d.getMinutes());
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const fromYmd = s => { const p = String(s).split('-').map(Number); return new Date(p[0], (p[1] || 1) - 1, p[2] || 1); };
export const today = () => ymd(new Date());
export const num = n => Math.round(+n || 0).toLocaleString('en-KE');
export const kes = n => 'KES ' + num(n);
export const t5 = s => String(s || '').slice(0, 5);
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const longDay = s => { const d = fromYmd(s); return DOW[d.getDay()] + ' ' + d.getDate() + ' ' + MON[d.getMonth()]; };
export function dayName(s) {
  if (s === today()) return 'Today';
  if (s === ymd(addDays(new Date(), 1))) return 'Tomorrow';
  if (s === ymd(addDays(new Date(), -1))) return 'Yesterday';
  return longDay(s);
}
export function stamp(iso) { if (!iso) return ''; const d = new Date(iso); const s = ymd(d); return (s === today() ? '' : dayName(s) + ' ') + hm(d); }
export function ago(s) {
  if (!s) return 'never';
  const n = Math.round((fromYmd(today()) - fromYmd(s)) / 864e5);
  if (n < 0) return 'booked ' + dayName(s).toLowerCase();
  if (n === 0) return 'today'; if (n === 1) return 'yesterday';
  if (n < 14) return n + ' days ago'; if (n < 60) return Math.round(n / 7) + ' weeks ago';
  return Math.round(n / 30) + ' months ago';
}
export function normPhone(p) {
  let d = String(p || '').replace(/\D/g, ''); if (!d) return '';
  if (d.startsWith('254')) return d; if (d.startsWith('0')) return '254' + d.slice(1); if (d.length === 9) return '254' + d; return d;
}
export function showPhone(p) { const d = normPhone(p); if (d.length === 12 && d.startsWith('254')) return '0' + d.slice(3, 6) + ' ' + d.slice(6, 9) + ' ' + d.slice(9); return p || ''; }
export const validPhone = p => /^254[17]\d{8}$/.test(normPhone(p));
export function wa(phone, text) { const d = normPhone(phone); return d ? 'https://wa.me/' + d + '?text=' + encodeURIComponent(text) : ''; }
export function mapsUrl(o) {
  if (o.maps && /^https?:\/\//i.test(o.maps)) return o.maps;
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent([o.landmark, o.area, 'Kenya'].filter(Boolean).join(', '));
}
export const initials = n => { const p = String(n || '?').trim().split(/\s+/); return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase(); };
export const first = n => String(n || '').trim().split(/\s+/)[0] || 'there';
export function plate(p) { const s = String(p || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); const m = s.match(/^([A-Z]{2,4})(\d{1,4}[A-Z]?)$/); return m ? m[1] + ' ' + m[2] : s; }

/* ---------- where links point ---------- */
const BASE = (CFG.siteUrl ? CFG.siteUrl.replace(/\/?$/, '/') : location.origin + location.pathname.replace(/staff\/(index\.html)?$/, '').replace(/index\.html$/, ''));
const DQ = QS.has('demo') ? '?demo' : '';
export const links = {
  home: BASE + DQ,
  staff: BASE + 'staff/' + DQ,
  track: t => BASE + DQ + '#t/' + t,
  me: t => BASE + DQ + '#me/' + t,
};

/* ---------- business model ---------- */
export const DEPT = {
  wash:    { code: 'WSH', vehicle: true, noun: 'Washing', verb: 'Start wash', what: 'car' },
  carpet:  { code: 'CPT', pieces: true, noun: 'Cleaning', verb: 'Start cleaning', what: 'items' },
  garage:  { code: 'SRV', vehicle: true, noun: 'At the garage', verb: 'Sent to garage', what: 'car' },
  kinyozi: { code: 'KNY', noun: 'In the chair', verb: 'Start cut', what: 'visit' },
  nails:   { code: 'NLS', noun: 'In the chair', verb: 'Start', what: 'visit' },
  gas:     { code: 'GAS', noun: 'Preparing', verb: 'Start', what: 'gas' },
  water:   { code: 'H2O', noun: 'Preparing', verb: 'Start', what: 'water' },
  laundry: { code: 'LDY', pieces: true, noun: 'Washing', verb: 'Start washing', what: 'laundry' },
};
/* ---------- brands ----------
   PitStop 87 is the umbrella; each department wears its own brand and the page follows it:
   Whale Wash (ocean) for the car wash and carpets, WaBarbers (noir & gold) for the kinyozi,
   PitStop 87 Car Service (dark garage) for the garage, Pearl Her (baby pink) for nails.
   Anything without a brand uses the Whale Wash ocean look, which is the site default. */
export const BRAND = { wash: 'ww', carpet: 'ww', kinyozi: 'wab', garage: 'cs', nails: 'ph' };
export const BRANDS = {
  ww: { name: 'Whale Wash', line: 'Car wash & carpet cleaning', mark: 'brand/ww-mark-dark.png', theme: '#041B34' },
  wab: { name: 'WaBarbers', line: 'Classic grooming for modern men', mark: 'brand/wb-mark-dark.png', word: 'brand/wb-wordmark-dark.png', theme: '#0B0A08' },
  cs: { name: 'PitStop 87', line: 'Car service & repairs', mark: 'brand/cs-mark.svg', theme: '#0B0C0E' },
  ph: { name: 'Pearl Her', line: 'Nail studio', mark: 'brand/ph-mark.svg', theme: '#F8D3E0' },
};
export function setBrand(b) {
  const r = document.documentElement;
  if (b && BRANDS[b]) r.dataset.brand = b; else delete r.dataset.brand;
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.content = BRANDS[b] ? BRANDS[b].theme : '#121417';
  // the browser-tab icon follows the brand too (paths resolve next to the default icon in assets/)
  const ic = document.querySelector('link[rel="icon"]');
  if (ic) {
    if (!ic.dataset.def) ic.dataset.def = ic.href;
    const href = b && BRANDS[b] ? new URL(BRANDS[b].mark, ic.dataset.def).href : ic.dataset.def;
    if (ic.href !== href) { ic.href = href; ic.type = href.endsWith('.svg') ? 'image/svg+xml' : 'image/png'; }
  }
}
export const DEPT_FLOWS = { wash: ['walkin', 'valet'], carpet: ['valet', 'walkin'], garage: ['valet', 'walkin'], kinyozi: ['chair', 'home'], nails: ['chair', 'home'], gas: ['delivery', 'walkin'], water: ['delivery', 'walkin'], laundry: ['valet', 'walkin'] };
export const STEPS = {
  valet: ['booked', 'enroute', 'collected', 'service', 'ready', 'returning', 'done'],
  walkin: ['waiting', 'service', 'ready', 'done'],
  chair: ['booked', 'arrived', 'service', 'done'],
  home: ['booked', 'enroute', 'service', 'done'],
  delivery: ['booked', 'returning', 'done'],
};
export const TRIP = f => f === 'valet' || f === 'delivery' || f === 'home';
export function flowLabel(flow, dept, who) {
  const goods = dept === 'gas' || dept === 'water';
  const map = who === 'customer' ? {
    valet: 'We pick up & drop off', walkin: goods ? "I'll collect it" : "I'll bring it in",
    chair: 'At the shop', home: 'Come to my home', delivery: 'Deliver to me'
  } : {
    valet: 'Valet pickup & drop-off', walkin: goods ? 'Counter / collect' : 'Drive-in / drop-off',
    chair: 'In the shop', home: 'Home visit', delivery: 'Delivery'
  };
  return map[flow] || flow;
}
export const flowShort = f => ({ valet: 'Valet', walkin: 'Drive-in', chair: 'In shop', home: 'Home visit', delivery: 'Delivery' }[f] || f);
export function statusLabel(s, j, who) {
  const f = j && j.flow, d = j && j.dept;
  if (who === 'customer' && j && !j.confirmed && STEPS[f] && s === STEPS[f][0]) return 'Waiting for confirmation';
  switch (s) {
    case 'booked': return who === 'customer' ? 'Confirmed' : 'Booked';
    case 'waiting': return who === 'customer' ? 'In the queue' : 'Waiting';
    case 'enroute': return f === 'home' ? 'On the way' : who === 'customer' ? 'Valet on the way' : 'Valet on the way';
    case 'collected': return who === 'customer' ? 'Picked up' : 'Collected';
    case 'arrived': return 'Arrived';
    case 'service': return (DEPT[d] || {}).noun || 'In service';
    case 'ready': return 'Ready';
    case 'returning': return f === 'delivery' ? 'Out for delivery' : 'On the way back';
    case 'done': return (f === 'valet' || f === 'delivery') ? 'Delivered' : f === 'walkin' ? 'Picked up' : 'Done';
    case 'cancelled': return 'Cancelled';
  }
  return s;
}
export function actionLabel(s, j) {
  switch (s) {
    case 'enroute': return 'On my way'; case 'collected': return 'Collected'; case 'arrived': return 'Arrived';
    case 'service': return (DEPT[j.dept] || {}).verb || 'Start'; case 'ready': return 'Mark ready';
    case 'returning': return j.flow === 'delivery' ? 'Out for delivery' : 'Out for drop-off';
    case 'done': return (j.flow === 'valet' || j.flow === 'delivery') ? 'Delivered' : j.flow === 'walkin' ? 'Picked up' : 'Done';
  }
  return s;
}
export function groupOf(s) { if (s === 'booked' || s === 'waiting') return 'queued'; if (s === 'ready') return 'ready'; if (s === 'done') return 'done'; if (s === 'cancelled') return 'cancelled'; return 'active'; }
export function nextStatus(j) { const f = STEPS[j.flow]; if (!f || j.status === 'cancelled') return null; const i = f.indexOf(j.status); return i >= 0 && i < f.length - 1 ? f[i + 1] : null; }
export function prevStatus(j) { const f = STEPS[j.flow]; if (!f) return null; const i = f.indexOf(j.status); return i > 0 ? f[i - 1] : null; }
export const METHODS = { mpesa: 'M-Pesa', cash: 'Cash', card: 'Card', bank: 'Bank' };
export const ROLES = {
  superadmin: { name: 'Owner', desc: 'Everything: every department, money, prices, team.' },
  dept_admin: { name: 'Department manager', desc: 'Runs their departments: all their jobs, team, sales and expenses.' },
  attendant: { name: 'Attendant', desc: 'Washer, barber, nail tech. Their own jobs and commission.' },
  rider: { name: 'Rider / valet', desc: 'Pickups, drop-offs and deliveries assigned to them.' },
  financier: { name: 'Financier', desc: 'Read-only reports. No customer names or numbers.' },
  pending: { name: 'Waiting for approval', desc: 'Joined but not approved yet.' },
};

/* ---------- backend ---------- */
export class AppError extends Error {}
function friendly(e) {
  const m = (e && (e.message || e.error_description)) || String(e);
  if (/Failed to fetch|NetworkError|Load failed|network/i.test(m)) return new AppError("Can't reach the server. Check your internet connection and try again.");
  if ((e && e.code === 'PGRST202') || /Could not find the function/i.test(m)) return new AppError("The database isn't set up yet. Run supabase/schema.sql in Supabase (see the setup guide).");
  if (/JWT expired|invalid JWT/i.test(m)) return new AppError('Your session expired. Sign in again.');
  if (/permission denied/i.test(m)) return new AppError('Please sign in to do that.');
  return new AppError(m);
}
function friendlyAuth(e) {
  const m = (e && e.message) || String(e);
  if (/Invalid login credentials/i.test(m)) return new AppError('Wrong phone number or PIN.');
  if (/already registered|already been registered/i.test(m)) return new AppError('That phone number has already joined. Sign in instead.');
  if (/at least 6|Password should/i.test(m)) return new AppError('The PIN must be 6 digits.');
  if (/Signups not allowed|signup.*disabled/i.test(m)) return new AppError('New staff sign-ups are switched off in Supabase (Authentication → Sign In / Providers).');
  if (/invalid/i.test(m) && /email/i.test(m)) return new AppError('Supabase rejected the login name. Set loginDomain in config.js to your own domain.');
  if (/rate limit/i.test(m)) return new AppError('Too many attempts. Wait a minute and try again.');
  return friendly(e);
}
function loadScript(src) {
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new AppError("Couldn't load the app. Check your internet connection.")); document.head.appendChild(s); });
}
const loginEmail = phone => 'p' + normPhone(phone) + '@' + CFG.loginDomain;
async function createLive() {
  await loadScript(SUPABASE_JS);
  const sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true } });
  return {
    mode: 'live',
    async rpc(name, p = {}) {
      let r;
      try { r = await sb.rpc(name, { p }); } catch (e) { throw friendly(e); }
      if (r.error) throw friendly(r.error);
      return r.data;
    },
    auth: {
      async uid() { const { data } = await sb.auth.getSession(); return data.session ? data.session.user.id : null; },
      async signIn(phone, pin) {
        const { data, error } = await sb.auth.signInWithPassword({ email: loginEmail(phone), password: pin });
        if (error) throw friendlyAuth(error); return data.user.id;
      },
      async signUp(name, phone, pin) {
        const { data, error } = await sb.auth.signUp({ email: loginEmail(phone), password: pin, options: { data: { name, phone: normPhone(phone) } } });
        if (error) throw friendlyAuth(error);
        if (!data.session) throw new AppError('Almost there: in Supabase, turn off "Confirm email" (Authentication → Sign In / Providers → Email), then sign in.');
        return data.user.id;
      },
      async signOut() { await sb.auth.signOut(); },
      onChange(cb) { sb.auth.onAuthStateChange((ev, s) => cb(s ? s.user.id : null, ev)); },
    },
    async upload(blob) {
      const d = new Date();
      const path = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '/' + (crypto.randomUUID ? crypto.randomUUID() : Date.now() + '' + Math.random()).replace(/-/g, '') + '.jpg';
      const { error } = await sb.storage.from('photos').upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: false });
      if (error) throw new AppError("A photo didn't upload: " + error.message);
      return path;
    },
    async photoUrls(paths) {
      if (!paths || !paths.length) return {};
      const { data, error } = await sb.storage.from('photos').createSignedUrls(paths, 3600);
      if (error || !data) return {};
      const m = {}; data.forEach(d => { if (d.signedUrl) m[d.path] = d.signedUrl; }); return m;
    },
  };
}
let _api = null;
export function api() {
  if (!_api) _api = (DEMO ? import('./demo.js').then(m => m.createDemo()) : createLive());
  return _api;
}

/* ---------- UI bits ---------- */
let toastT = null;
export function toast(msg, extra, ms) {
  const t = $('#toast'); if (!t) return;
  t.innerHTML = '<span>' + esc(msg) + '</span>' + (extra || ''); t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, ms || 4000);
}
export function copyText(text, el) {
  const done = () => toast('Copied');
  try { navigator.clipboard.writeText(text).then(done, () => selectEl(el)); } catch (e) { selectEl(el); }
}
function selectEl(el) { if (!el) return; try { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast('Selected. Copy it from the menu.'); } catch (e) { } }
export function frame(title, body, foot) {
  return '<div class="sheet-back" data-act="close-sheet"></div><div class="sheet-panel" role="dialog" aria-modal="true" aria-label="' + esc(title) + '">'
    + '<div class="sheet-head gut"><h2>' + esc(title) + '</h2><button class="icon-btn" data-act="close-sheet" aria-label="Close">×</button></div>'
    + '<div class="sheet-body gut" id="sheet-body">' + body + '</div>' + (foot ? '<div class="sheet-foot gut">' + foot + '</div>' : '') + '</div>';
}
export function busy(el) { const a = document.activeElement; return !!(a && el && el.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)); }
export function tracker(j, who) {
  const f = STEPS[j.flow]; if (!f) return '';
  const idx = f.indexOf(j.status);
  return '<ol class="track" aria-label="Progress">' + f.map((s, i) => {
    const h = (j.history || []).filter(x => x.s === s).pop();
    const c = j.status === 'cancelled' ? '' : i < idx ? 'done' : i === idx ? (i === f.length - 1 ? 'done' : 'now') : '';
    const lab = (who === 'customer' && i === 0 && !j.confirmed) ? 'Requested' : statusLabel(s, Object.assign({}, j, { confirmed: true }), who);
    return '<li class="' + c + '"><span class="dot"></span><span class="tl">' + esc(lab) + '</span><span class="tt">' + (h ? esc(hm(new Date(h.at))) : '') + '</span></li>';
  }).join('') + '</ol>';
}
export async function compressImage(file) {
  try {
    const bmp = await createImageBitmap(file); const max = 1280, sc = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const cv = document.createElement('canvas'); cv.width = Math.round(bmp.width * sc); cv.height = Math.round(bmp.height * sc);
    cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
    return await new Promise(r => cv.toBlob(b => r(b || file), 'image/jpeg', .8));
  } catch (e) { return file; }
}
export function demoBanner(extra) {
  return '<span>Demo mode. Everything you do stays on this device.</span>' + (extra || '');
}
