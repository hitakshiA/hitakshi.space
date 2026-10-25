import { CITIES, G, W, fabric } from './skyline.mjs';

// The light each city fills with when it opens, top to bottom.
const LIGHT = {
  delhi:     [['0', '#F2A0B4'], ['0.55', '#F8C2B0'], ['1', '#FCE3C8']],
  mumbai:    [['0', '#8EA2F2'], ['0.5', '#C9C2EE'], ['1', '#F9B07A']],
  bangalore: [['0', '#9BD07A'], ['0.55', '#CBE6A2'], ['1', '#EEF5D2']],
};
const ORDER = ['delhi', 'mumbai', 'bangalore'];

// Desktop shows the whole drawing; phones use a tighter composition in this box
// (x, y, width, height), the same for every city so the three join up.
const DESKTOP_VIEW = [0, 20, W, 176];
const MOBILE_VIEW = [138, 36, 204, 160];
const TOP = DESKTOP_VIEW[1];
const EDGE = 0.56; // light level where two cities meet

// One city as an inline SVG. Each layer is drawn twice (an ink stroke, then a
// ground-coloured fill on top) so only the outer half of the stroke shows:
// overlapping solids read as one silhouette with a clean outline.
export function citySvg(key, { mobile = false } = {}) {
  const city = CITIES[key];
  const i = ORDER.indexOf(key);
  const left = ORDER[i - 1], right = ORDER[i + 1];
  const [vx, , vw] = mobile ? MOBILE_VIEW : DESKTOP_VIEW;
  const id = (mobile ? 'm' : 'd') + key.slice(0, 3);
  const H = G - TOP + 2;
  const between = mobile ? fabric(204, 138, i, 11, city.clearM) : fabric(W, 0, i, 7, city.clear);
  const layers = [between, ...(mobile ? city.mobile : city.layers)];

  // Light is soft where cities meet: a lit city eases off near a shared edge and
  // spills into its neighbour, fading out over nearly half of the neighbour's width.
  const gradient = (k) => `<linearGradient id="${id}-g-${k}" x1="0" y1="${TOP}" x2="0" y2="${G}" gradientUnits="userSpaceOnUse">` +
    LIGHT[k].map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('') + `</linearGradient>`;
  const fade = (fid, stops) => `<linearGradient id="${fid}-f" x1="${vx}" y1="0" x2="${vx + vw}" y2="0" gradientUnits="userSpaceOnUse">` +
    stops.map(([o, a]) => `<stop offset="${o}" stop-color="#fff" stop-opacity="${a}"/>`).join('') + `</linearGradient>` +
    `<mask id="${fid}" maskUnits="userSpaceOnUse" x="${vx - 1}" y="${TOP}" width="${vw + 2}" height="${H}">` +
    `<rect x="${vx - 1}" y="${TOP}" width="${vw + 2}" height="${H}" fill="url(#${fid}-f)"/></mask>`;
  // The light swells up as a soft-edged dome from the bottom centre of the lit city. A neighbour's
  // spill uses the same dome, centred on the lit city, so one curve carries across the join.
  // Each depth gets its own dome so the back layers can follow a beat behind.
  const rx = vw * 1.3, ry = H * 1.7, mid = vx + vw / 2;
  const domes = new Map();
  const dome = (from, cx, depth) => {
    const did = `${id}-dome-${from}${depth}`;
    if (!domes.has(did)) domes.set(did, `<mask id="${did}" maskUnits="userSpaceOnUse" x="0" y="${TOP}" width="${W}" height="${H}">` +
      `<rect class="dome dome-${from}" data-depth="${depth}" x="${cx - rx}" y="${G - ry}" width="${2 * rx}" height="${2 * ry}" fill="url(#${id}-dg)"/></mask>`);
    return did;
  };
  const light = (k, fadeId, from, cx, depth) => `<g mask="url(#${fadeId})"><rect class="lit" x="0" y="${TOP}" width="${W}" height="${H}" ` +
    `fill="url(#${id}-g-${k})" mask="url(#${dome(from, cx, depth)})"/></g>`;

  const defs = [
    `<radialGradient id="${id}-dg"><stop offset="0.7" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`,
    gradient(key), ...[left, right].filter(Boolean).map(gradient),
    fade(`${id}-own`, [[0, left ? EDGE : 1], [0.12, 1], [0.88, 1], [1, right ? EDGE : 1]]),
    left ? fade(`${id}-sl`, [[0, EDGE], [0.16, 0.3], [0.45, 0]]) : '',
    right ? fade(`${id}-sr`, [[0.55, 0], [0.84, 0.3], [1, EDGE]]) : '',
  ];
  const body = layers.map((layer, n) => {
    const pid = `${id}-${n}`;
    defs.push(`<path id="${pid}" d="${layer.d}"/><clipPath id="${pid}-c"><use href="#${pid}"/></clipPath>`);
    const between = n === 0;
    const depth = between ? 3 : layers.length - 1 - n; // 0 = front, 3 = the low city between landmarks
    const lit = `<g clip-path="url(#${pid}-c)">${light(key, `${id}-own`, 'own', mid, depth)}` +
      (left ? light(left, `${id}-sl`, 'l', mid - vw, depth) : '') +
      (right ? light(right, `${id}-sr`, 'r', mid + vw, depth) : '') + `</g>`;
    return `<g class="layer${between ? ' between' : ''}" data-depth="${depth}">` +
      `<use href="#${pid}" class="ol"/><use href="#${pid}" class="cv"/>${lit}` +
      (layer.l ? `<path class="dt" d="${layer.l}"/>` : '') + `</g>`;
  });
  body.push(`<path class="gl" d="M-40 ${G}H${W + 40}"/>`);
  defs.push(...domes.values());

  const viewBox = (mobile ? MOBILE_VIEW : DESKTOP_VIEW).join(' ');
  return `<svg class="scape-svg ${mobile ? 'is-m' : 'is-d'}" viewBox="${viewBox}" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">` +
    `<defs>${defs.join('')}</defs>${body.join('')}</svg>`;
}
