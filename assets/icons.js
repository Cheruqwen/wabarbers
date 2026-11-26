// Line icons for the public site and the staff app: 24px grid, 1.8 stroke, round ends, currentColor.
// Drawn for this site (no icon library), so they can be restyled freely.
const P = {
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  check: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 12.5l2.8 2.8L16.5 9"/>',
  tick: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  car: '<path d="M5 17H3.5v-4.2l2-5A2 2 0 0 1 7.4 6.5h9.2a2 2 0 0 1 1.9 1.3l2 5V17H19"/><path d="M9 17h6M3.5 12.5h17"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
  hatch: '<path d="M5 17H3.5v-3.8L6 8h7.5l4 4.6 3 .7V17H19"/><path d="M9 17h6M10 8v4.6M3.5 12.6h14"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
  suv: '<path d="M5 17H2.5v-5.5l2-5h12.5l2.5 4.5 2 .8V17H19"/><path d="M9 17h6M2.5 11h17M11 6.5V11"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
  moto: '<circle cx="5.5" cy="16.5" r="3"/><circle cx="18.5" cy="16.5" r="3"/><path d="M5.5 16.5 9 11h5l2.5 5.5M14 11l-1.6-3.5H10M15.5 7H18l.5 9.5"/>',
  spray: '<path d="M4 10h7v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M11 12.5h2.5M6.5 10V6.5h3.5"/><path d="M16.5 9l3-1.8M16.5 12.5h4M16.5 16l3 1.8"/>',
  seat: '<path d="M8.5 3h5a2 2 0 0 1 2 2.3L14.5 13h-6L7 5.2A2 2 0 0 1 8.5 3z"/><path d="M6 13h11.5a1.5 1.5 0 0 1 1.5 1.5V16H6z"/><path d="M8 16v5M17 16v5"/>',
  engine: '<path d="M6 9h2.5V7h5v2H16l2 3h2v5h-2l-2 2H8.5L6 16.5z"/><path d="M3 11v5M6 13.5H3M11 4h3M12.5 4v3"/>',
  sparkle: '<path d="M11 3.5l1.9 5.1L18 10.5l-5.1 1.9L11 17.5l-1.9-5.1L4 10.5l5.1-1.9z"/><path d="M18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
  drop: '<path d="M12 3.5s6 6.2 6 10.5a6 6 0 0 1-12 0c0-4.3 6-10.5 6-10.5z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5"/>',
  rug: '<rect x="5" y="4.5" width="14" height="15" rx="1"/><path d="M8 4.5v-2M12 4.5v-2M16 4.5v-2M8 21.5v-2M12 21.5v-2M16 21.5v-2"/><path d="M12 8l4 4-4 4-4-4z"/>',
  sofa: '<path d="M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3"/><path d="M3 13a2 2 0 0 1 4 0v2h10v-2a2 2 0 0 1 4 0v4H3z"/><path d="M5 17v2.5M19 17v2.5"/>',
  bed: '<path d="M3 18V6M3 13h18v5M21 18v-3"/><path d="M3 13v-2.5A1.5 1.5 0 0 1 4.5 9H10v4"/><circle cx="6.5" cy="11" r="0"/>',
  wrench: '<path d="M14.5 3.6a5 5 0 0 0-4.3 6.8l-6.6 6.6a1.9 1.9 0 0 0 2.7 2.7l6.6-6.6a5 5 0 0 0 6.8-4.3l-3 3-2.9-.8-.8-2.9z"/>',
  gauge: '<path d="M3.5 17a8.5 8.5 0 1 1 17 0"/><path d="M12 17l4.2-5.2"/><circle cx="12" cy="17" r="1.3"/><path d="M6.5 12.5l1 .7M12 8.5v1.2M17.5 12.5l-1 .7"/>',
  truck: '<path d="M2.5 6h11v10.5h-11z"/><path d="M13.5 9.5h4l3.5 4v3h-7.5"/><circle cx="6.5" cy="17.5" r="1.9"/><circle cx="17" cy="17.5" r="1.9"/>',
  scissors: '<circle cx="6" cy="7" r="3"/><circle cx="6" cy="17" r="3"/><path d="M8.5 8.7 20 18.5M8.5 15.3 20 5.5"/>',
  razor: '<path d="M3.5 20.5l6.5-6.5"/><path d="M8.5 12.5l8-8a2 2 0 0 1 2.8 0l.7.7a2 2 0 0 1 0 2.8l-8 8z"/><path d="M12 9l3 3"/>',
  beard: '<path d="M6 8.5a6 6 0 0 1 12 0V12c0 4.5-3 8.5-6 8.5S6 16.5 6 12z"/><path d="M6 11.5c2 1.2 3 3 6 3s4-1.8 6-3M10 17.5h4"/>',
  child: '<circle cx="12" cy="6" r="3"/><path d="M8 21v-5.5L6 13l2-3h8l2 3-2 2.5V21M12 15.5V21"/>',
  polish: '<path d="M10 2.5h4V8h-4z"/><path d="M8 11.5A3 3 0 0 1 10.5 8h3A3 3 0 0 1 16 11.5V19a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2z"/><path d="M8 14h8"/>',
  flame: '<path d="M12 3c1 3.2 5.5 5.2 5.5 10.5a5.5 5.5 0 0 1-11 0c0-2.6 1.5-4.2 2.6-5.2 0 2 1 3.2 2.1 3.2 0-3.2-.2-5.7.8-8.5z"/>',
  shirt: '<path d="M8.5 3 3 6.2l2 4 2-1V21h10V9.2l2 1 2-4L15.5 3a3.5 3.5 0 0 1-7 0z"/>',
  shop: '<path d="M3.5 10 5 4h14l1.5 6"/><path d="M3.5 10a2.8 2.8 0 0 0 5.7 0 2.8 2.8 0 0 0 5.6 0 2.8 2.8 0 0 0 5.7 0"/><path d="M5 12.5V21h14v-8.5M10 21v-5h4v5"/>',
  home: '<path d="M3 11l9-7.5 9 7.5"/><path d="M5.5 9.5V21h13V9.5M10 21v-6h4v6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M7.5 14h2M11 14h2M14.5 14h2M7.5 17.5h2M11 17.5h2"/>',
  pin: '<path d="M12 21.5s-7-6.3-7-12a7 7 0 0 1 14 0c0 5.7-7 12-7 12z"/><circle cx="12" cy="9.5" r="2.5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  phone: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>',
  key: '<circle cx="8" cy="15" r="4.5"/><path d="M11.2 11.8 20 3M16 7l3 3M13.5 9.5l2 2"/>',
  note: '<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4M8.5 12h7M8.5 16h4.5"/>',
  live: '<circle cx="12" cy="12" r="2"/><path d="M8.3 8.3a5.3 5.3 0 0 0 0 7.4M15.7 8.3a5.3 5.3 0 0 1 0 7.4M5.3 5.3a9.5 9.5 0 0 0 0 13.4M18.7 5.3a9.5 9.5 0 0 1 0 13.4"/>',
  pay: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/>',
  chat: '<path d="M4 20.5l1.4-4A8.5 8.5 0 1 1 8.6 19.4z"/><path d="M9 9.2c.3 3 2.6 5.4 5.6 5.7l1-1.6-2-1.1-1 .8a3.7 3.7 0 0 1-1.8-1.8l.8-1-1.1-2z"/>',
  camera: '<path d="M3 8.5h4l2-3h6l2 3h4V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><circle cx="12" cy="13.5" r="3.6"/>',
  crown: '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/><path d="M5.5 16h13"/>',
  plate: '<rect x="2.5" y="7" width="19" height="10" rx="2"/><path d="M6 12h4M13 12h5"/>',
  tag: '<path d="M3 12.5V4h8.5l9 9-8.5 8.5z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
  bubbles: '<circle cx="8" cy="14" r="4.5"/><circle cx="16.5" cy="8" r="3"/><circle cx="17" cy="16.5" r="2"/>',
  chair: '<path d="M7 3h10v7H7z"/><path d="M5 10h14v3H5zM9 13v4h6v-4M12 17v3.5M7.5 20.5h9"/>',
  team: '<circle cx="9" cy="8" r="3.5"/><circle cx="17" cy="9" r="2.6"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M15 14.5a5 5 0 0 1 6.5 4.5"/>',
};
export function ic(name, cls) {
  const p = P[name] || P.check;
  return '<svg class="ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + p + '</svg>';
}
// a department's picture
export const DEPT_IC = { wash: 'car', carpet: 'rug', garage: 'wrench', kinyozi: 'scissors', nails: 'polish', gas: 'flame', water: 'drop', laundry: 'shirt' };
// a service's picture, from words in its name (falls back to its department's)
const RULES = [
  [/mani|pedi|nail|gel|acrylic/i, 'polish'], [/boda|moto/i, 'moto'], [/land cruiser|prado|4x4|suv/i, 'suv'], [/small car/i, 'hatch'], [/normal car|full wash/i, 'car'],
  [/exterior|outside|splash/i, 'spray'], [/interior|inside/i, 'seat'], [/engine/i, 'engine'], [/seat|shampoo/i, 'seat'],
  [/wax|polish/i, 'sparkle'], [/half wash/i, 'spray'], [/add-on|extra/i, 'sparkle'],
  [/sofa/i, 'sofa'], [/mattress/i, 'bed'], [/carpet|rug|sq ft|square/i, 'rug'],
  [/garage run|pick/i, 'truck'], [/diagnos/i, 'gauge'], [/service|repair/i, 'wrench'],
  [/beard/i, 'beard'], [/shave/i, 'razor'], [/kid|child/i, 'child'], [/dye|colour|color/i, 'drop'], [/cut|fade|executive|hair/i, 'scissors'],
  [/gas/i, 'flame'], [/water/i, 'drop'], [/laundry|duvet/i, 'shirt'],
];
export function svcIcon(dept, name) {
  for (const [re, n] of RULES) if (re.test(name || '')) return n;
  return DEPT_IC[dept] || 'check';
}
// how the service happens
export const FLOW_IC = { valet: 'truck', walkin: 'shop', chair: 'chair', home: 'home', delivery: 'truck' };
// a booking's progress steps
export const STATUS_IC = { booked: 'check', waiting: 'clock', enroute: 'truck', collected: 'key', arrived: 'shop', service: 'sparkle', ready: 'tick', returning: 'truck', done: 'tick' };
