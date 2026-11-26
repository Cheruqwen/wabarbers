// Two-tone line icons for the public site and the staff app.
// 24px grid, 1.7 stroke, round ends, currentColor; the soft fill (D) is the same colour at low strength.
// Drawn for this site (no icon library), so they can be restyled freely.
const D = ' fill="currentColor" fill-opacity=".2" stroke="none"';
const wheels = (a, b, y) => '<circle cx="' + a + '" cy="' + y + '" r="2.1"/><circle cx="' + b + '" cy="' + y + '" r="2.1"/><circle cx="' + a + '" cy="' + y + '" r=".5" fill="currentColor"/><circle cx="' + b + '" cy="' + y + '" r=".5" fill="currentColor"/>';
const P = {
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  check: '<rect x="3" y="3" width="18" height="18" rx="5"' + D + '/><rect x="3" y="3" width="18" height="18" rx="5"/><path d="M7.8 12.4l2.9 2.9 5.6-6.1"/>',
  tick: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  // vehicles: side views, so a small car, a normal car and a 4x4 look different
  car: '<path d="M4.2 11.4 6.9 8a2 2 0 0 1 1.6-.8h6.4a2 2 0 0 1 1.5.7l3 3.5z"' + D + '/><path d="M3.4 16.5H2.6v-3.4a1.6 1.6 0 0 1 1.2-1.6l2.5-.7 2.7-3.3a2 2 0 0 1 1.5-.8h4.7a2 2 0 0 1 1.5.7l2.9 3.4 2.1.5a1.6 1.6 0 0 1 1.2 1.6v3.6h-.8"/><path d="M9.2 16.5h5.6M6.6 10.9h12.8M13.6 7.4v3.5"/>' + wheels(7, 17, 16.5),
  hatch: '<path d="M5.5 11.2 8.4 7.6a2 2 0 0 1 1.5-.7h4a2 2 0 0 1 1.6.8l2.7 3.5z"' + D + '/><path d="M3.6 16.5h-.8v-3.5a1.5 1.5 0 0 1 1-1.4l1.8-.6 2.8-3.4a2 2 0 0 1 1.5-.7H14a2 2 0 0 1 1.6.8l2.9 3.7 1.8.5a1.5 1.5 0 0 1 1.1 1.4v3.2h-.8"/><path d="M9.2 16.5h5.6M6.4 11h12M12.3 6.9V11"/>' + wheels(7, 17, 16.5),
  suv: '<path d="M3.6 11 5 6.9a1 1 0 0 1 1-.7h10.4a1 1 0 0 1 .8.4l3.3 4.4z"' + D + '/><path d="M3.4 16.5h-.9v-4.2l1.6-5.6a1.4 1.4 0 0 1 1.3-1h11.3a1.4 1.4 0 0 1 1.1.6l3.2 4.4.9.4a1 1 0 0 1 .6.9v4.5h-.9"/><path d="M9.2 16.5h5.6M3.3 11h17.4M9 5.7V11M14.3 5.7V11M6.5 3.8h9"/>' + wheels(7, 17, 16.5),
  moto: '<circle cx="12.2" cy="13.4" r="2"' + D + '/><circle cx="5.5" cy="16.3" r="3.2"/><circle cx="18.5" cy="16.3" r="3.2"/><path d="M5.5 16.3 8.8 11h4.8l2.8 5.3H9.6M9.2 9h4M18.5 16.3l-2.3-8.6h-2.4M15 7.7h3"/>',
  spray: '<path d="M3 8.8h8.7a1.3 1.3 0 0 1 1.3 1.3v1.8H3z"' + D + '/><path d="M3 8.8h8.7a1.3 1.3 0 0 1 1.3 1.3v1.8H3z"/><path d="M5.2 11.9 4 18.6h3.3l1.4-6.7M13 10h2.6"/><path d="M18.2 6.8l2.6-1.4M18.2 10h3.3M18.2 13.2l2.6 1.4"/><circle cx="19.3" cy="18.3" r="1.1"/>',
  seat: '<path d="M8.3 3.5h3.5a1.5 1.5 0 0 1 1.5 1.7l-1.1 7.3H8.8L6.9 5.3a1.5 1.5 0 0 1 1.4-1.8z"' + D + '/><path d="M8.3 3.5h3.5a1.5 1.5 0 0 1 1.5 1.7l-1.1 7.3H8.8L6.9 5.3a1.5 1.5 0 0 1 1.4-1.8z"/><path d="M7.3 12.5h9.4a2 2 0 0 1 2 2V16H7.8zM9.3 16v4.5M16.5 16v4.5"/>',
  engine: '<path d="M6 8.5h3V6.6h5v1.9h2.6l2 2.5h2v5.6h-2l-2 2.4H9.1L6 16.2z"' + D + '/><path d="M6 8.5h3V6.6h5v1.9h2.6l2 2.5h2v5.6h-2l-2 2.4H9.1L6 16.2zM2.6 10.6v5.2M2.6 13.2H6M10 4.4h3M11.5 4.4v2.2"/><path d="M11.5 10.5l-1.5 2.6h3l-1.5 2.6"/>',
  sparkle: '<path d="M10.5 3.2l1.9 5.4 5.4 1.9-5.4 1.9-1.9 5.4-1.9-5.4-5.4-1.9 5.4-1.9z"' + D + '/><path d="M10.5 3.2l1.9 5.4 5.4 1.9-5.4 1.9-1.9 5.4-1.9-5.4-5.4-1.9 5.4-1.9zM18.5 14.8l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
  drop: '<path d="M12 3.3s6.2 6.3 6.2 10.8a6.2 6.2 0 0 1-12.4 0C5.8 9.6 12 3.3 12 3.3z"' + D + '/><path d="M12 3.3s6.2 6.3 6.2 10.8a6.2 6.2 0 0 1-12.4 0C5.8 9.6 12 3.3 12 3.3z"/><path d="M9.2 14.4a2.8 2.8 0 0 0 2.8 2.8"/>',
  rug: '<rect x="5" y="4.5" width="14" height="15" rx="1.2"' + D + '/><rect x="5" y="4.5" width="14" height="15" rx="1.2"/><path d="M8 4.5V2.3M12 4.5V2.3M16 4.5V2.3M8 21.7v-2.2M12 21.7v-2.2M16 21.7v-2.2"/><path d="M12 7.8 16 12l-4 4.2L8 12z"/>',
  sofa: '<path d="M7 11V8a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3"' + D + '/><path d="M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3"/><path d="M3 13a2 2 0 0 1 4 0v2h10v-2a2 2 0 0 1 4 0v4.2H3zM5 17.2v2.3M19 17.2v2.3"/>',
  bed: '<path d="M3 13h18v4H3z"' + D + '/><path d="M3 18.5V6M3 13h18v5.5M3 16.5h18"/><path d="M5.5 13v-2a1.5 1.5 0 0 1 1.5-1.5h3.5V13"/>',
  wrench: '<path d="M14.6 3.4a5 5 0 0 0-5.3 6.7L3.7 15.7a2.1 2.1 0 0 0 3 3l5.6-5.6a5 5 0 0 0 6.7-5.3l-3 3-2.8-.8-.8-2.8z"' + D + '/><path d="M14.6 3.4a5 5 0 0 0-5.3 6.7L3.7 15.7a2.1 2.1 0 0 0 3 3l5.6-5.6a5 5 0 0 0 6.7-5.3l-3 3-2.8-.8-.8-2.8z"/><circle cx="5.2" cy="17.2" r=".6" fill="currentColor"/>',
  gauge: '<path d="M3.5 17a8.5 8.5 0 0 1 17 0z"' + D + '/><path d="M3.5 17a8.5 8.5 0 1 1 17 0"/><path d="M12 17l4.2-5.2M6.6 12.4l1.1.8M12 8.4v1.3M17.4 12.4l-1.1.8M3.5 17h17"/><circle cx="12" cy="17" r="1.4" fill="currentColor"/>',
  truck: '<path d="M13.5 9.6h4.1l3.4 3.8v3.2h-7.5z"' + D + '/><path d="M2.5 6h11v10.6h-11zM13.5 9.6h4.1l3.4 3.8v3.2h-7.5M16 9.6v3.8h5"/><circle cx="6.5" cy="17.4" r="2"/><circle cx="17" cy="17.4" r="2"/>',
  // grooming
  scissors: '<circle cx="6.3" cy="6.6" r="2.9"' + D + '/><circle cx="6.3" cy="17.4" r="2.9"' + D + '/><circle cx="6.3" cy="6.6" r="2.9"/><circle cx="6.3" cy="17.4" r="2.9"/><path d="M8.7 8.3 20.5 17.6M8.7 15.7 20.5 6.4"/><circle cx="13.4" cy="12" r=".7" fill="currentColor"/>',
  razor: '<path d="M13.3 9.3 3.6 19a1 1 0 0 0 .7 1.7h4.4l7.8-8.5z"' + D + '/><path d="M13.3 9.3 3.6 19a1 1 0 0 0 .7 1.7h4.4l7.8-8.5z"/><path d="M13.3 9.3l5.8-5.8a1.5 1.5 0 0 1 2.1 2.1l-5.7 5.6"/>',
  beard: '<path d="M6 11.6c1.6 1.4 3.4 2.4 6 2.4s4.4-1 6-2.4c0 4.4-2.7 8.6-6 8.6s-6-4.2-6-8.6z"' + D + '/><path d="M6 8.5a6 6 0 0 1 12 0v3.4c0 4.4-2.7 8.4-6 8.4s-6-4-6-8.4z"/><path d="M6 11.6c1.6 1.4 3.4 2.4 6 2.4s4.4-1 6-2.4M9.6 15.4c1.5-.9 3.3-.9 4.8 0"/><path d="M9.5 9.2h.01M14.5 9.2h.01" stroke-width="2.4"/>',
  child: '<circle cx="12" cy="6.4" r="3.2"' + D + '/><circle cx="12" cy="6.4" r="3.2"/><path d="M7.5 21v-5.3L5.6 13l2.3-3h8.2l2.3 3-1.9 2.7V21M12 15.6V21"/>',
  polish: '<path d="M8 11.6A3 3 0 0 1 10.6 8h2.8A3 3 0 0 1 16 11.6V19a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2z"' + D + '/><path d="M10 2.6h4V8h-4zM8 11.6A3 3 0 0 1 10.6 8h2.8A3 3 0 0 1 16 11.6V19a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2zM8 14h8"/>',
  chair: '<path d="M8 3.5h8v7H8z"' + D + '/><path d="M8 3.5h8v7H8zM5.5 10.5h13v3h-13zM5.5 10.5v-2M18.5 10.5v-2M12 13.5v5M8 20.5h8M12 18.5v2"/>',
  flame: '<path d="M12 3c1 3.2 5.5 5.2 5.5 10.5a5.5 5.5 0 0 1-11 0c0-2.6 1.5-4.2 2.6-5.2 0 2 1 3.2 2.1 3.2 0-3.2-.2-5.7.8-8.5z"' + D + '/><path d="M12 3c1 3.2 5.5 5.2 5.5 10.5a5.5 5.5 0 0 1-11 0c0-2.6 1.5-4.2 2.6-5.2 0 2 1 3.2 2.1 3.2 0-3.2-.2-5.7.8-8.5z"/>',
  shirt: '<path d="M8.5 3 3 6.2l2 4 2-1V21h10V9.2l2 1 2-4L15.5 3a3.5 3.5 0 0 1-7 0z"' + D + '/><path d="M8.5 3 3 6.2l2 4 2-1V21h10V9.2l2 1 2-4L15.5 3a3.5 3.5 0 0 1-7 0z"/>',
  // places, time and people
  shop: '<path d="M5 12.6V21h14v-8.4"' + D + '/><path d="M3.5 10 5 4h14l1.5 6"/><path d="M3.5 10a2.8 2.8 0 0 0 5.7 0 2.8 2.8 0 0 0 5.6 0 2.8 2.8 0 0 0 5.7 0"/><path d="M5 12.6V21h14v-8.4M10 21v-5h4v5"/>',
  home: '<path d="M5.5 9.6V21h13V9.6L12 4.2z"' + D + '/><path d="M3 11l9-7.5 9 7.5M5.5 9.5V21h13V9.5M10 21v-6h4v6"/>',
  clock: '<circle cx="12" cy="12" r="9"' + D + '/><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  calendar: '<path d="M3 10h18v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"' + D + '/><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4M7.5 14h2M11 14h2M14.5 14h2M7.5 17.5h2M11 17.5h2"/>',
  pin: '<path d="M12 21.5s-7-6.3-7-12a7 7 0 0 1 14 0c0 5.7-7 12-7 12z"' + D + '/><path d="M12 21.5s-7-6.3-7-12a7 7 0 0 1 14 0c0 5.7-7 12-7 12z"/><circle cx="12" cy="9.5" r="2.6"/>',
  user: '<circle cx="12" cy="8" r="4"' + D + '/><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  phone: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"' + D + '/><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>',
  key: '<circle cx="8" cy="15" r="4.5"' + D + '/><circle cx="8" cy="15" r="4.5"/><path d="M11.2 11.8 20 3M16 7l3 3M13.5 9.5l2 2"/><circle cx="8" cy="15" r="1.2"/>',
  note: '<path d="M5 3h10l4 4v14H5z"' + D + '/><path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4M8.5 12h7M8.5 16h4.5"/>',
  live: '<circle cx="12" cy="12" r="2.2" fill="currentColor"/><path d="M8.3 8.3a5.3 5.3 0 0 0 0 7.4M15.7 8.3a5.3 5.3 0 0 1 0 7.4M5.3 5.3a9.5 9.5 0 0 0 0 13.4M18.7 5.3a9.5 9.5 0 0 1 0 13.4"/>',
  pay: '<rect x="2.5" y="6" width="19" height="12" rx="2"' + D + '/><rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/>',
  chat: '<path d="M4 20.5l1.4-4A8.5 8.5 0 1 1 8.6 19.4z"' + D + '/><path d="M4 20.5l1.4-4A8.5 8.5 0 1 1 8.6 19.4z"/><path d="M9 9.2c.3 3 2.6 5.4 5.6 5.7l1-1.6-2-1.1-1 .8a3.7 3.7 0 0 1-1.8-1.8l.8-1-1.1-2z"/>',
  camera: '<path d="M3 8.5h4l2-3h6l2 3h4V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"' + D + '/><path d="M3 8.5h4l2-3h6l2 3h4V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><circle cx="12" cy="13.5" r="3.6"/>',
  crown: '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"' + D + '/><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5zM5.6 16h12.8"/>',
  plate: '<rect x="2.5" y="7" width="19" height="10" rx="2"' + D + '/><rect x="2.5" y="7" width="19" height="10" rx="2"/><path d="M6 12h4M13 12h5"/>',
  tag: '<path d="M3 12.5V4h8.5l9 9-8.5 8.5z"' + D + '/><path d="M3 12.5V4h8.5l9 9-8.5 8.5z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
  team: '<circle cx="9" cy="8" r="3.5"' + D + '/><circle cx="9" cy="8" r="3.5"/><circle cx="17" cy="9" r="2.6"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M15 14.5a5 5 0 0 1 6.5 4.5"/>',
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"' + D + '/><rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"' + D + '/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
};
export function ic(name, cls) {
  const p = P[name] || P.check;
  return '<svg class="ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + p + '</svg>';
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
