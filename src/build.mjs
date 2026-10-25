// Builds the site into dist/: one index.html (styles, script and drawings inlined)
// plus everything in public/. Run: npm run build
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { citySvg } from './render.mjs';
import { CITIES, LOGOS } from './content.mjs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const site = JSON.parse(read('../site.json'));
const css = read('./styles.css');
const js = read('./client.js');

// Where each peeking logo sits, from src/peeks.json: d = [x, y] on the desktop drawing
// (viewBox 0 20 480 176), m = on the phone drawing (viewBox 138 36 204 160).
const PEEKS = JSON.parse(read('./peeks.json'));

const logoSrc = (key) => `/assets/logos/${LOGOS[key].file}`;
const external = 'target="_blank" rel="noopener"';

const ICONS = {
  linkedin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
  github: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>',
  resume: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"><path d="M6 2.75h8.25L19 7.5v13.75H6z"/><path d="M14 2.75V7.75h5"/><path d="M9 12h7M9 15.25h7M9 18.5h4.5"/></svg>',
};
const LINKS = [['linkedin', 'LinkedIn'], ['github', 'GitHub'], ['resume', 'Résumé']];

const letters = (text) =>
  [...text].map((ch, i) => (ch === ' ' ? ' ' : `<span class="ch" style="--i:${i}">${ch}</span>`)).join('');

const mark = (key, attrs = '') =>
  `<span class="mark ${LOGOS[key].shape}"${attrs}><img src="${logoSrc(key)}" alt="" width="28" height="28" decoding="async"></span>`;

const yc = (batch) =>
  `<span class="yc"><img src="${logoSrc('yc')}" alt="Y Combinator" width="14" height="14" decoding="async" data-fly="yc"><span>${batch}</span></span>`;

const row = (r, i) => `
          <li style="--i:${i}">
            ${mark(r.logo, ` data-fly="${r.logo}"`)}
            <span class="what"><span class="org">${r.org}${r.yc ? ' ' + yc(r.yc) : ''}</span><span class="role">${r.role}</span>${
              r.points ? `<ul class="points">${r.points.map((p) => `<li>${p}</li>`).join('')}</ul>` : ''}</span>
            <span class="when">${r.when}</span>
          </li>`;

const panel = (c) => `
      <section class="panel" id="p-${c.key}" aria-labelledby="h-${c.key}">
        <h3 id="h-${c.key}">${c.title}${c.sub ? `, <span>${c.sub}</span>` : ''}</h3>
        <ol class="ledger">${c.rows.map(row).join('')}
        </ol>
      </section>`;

const pct = (v, lo, span) => `${(((v - lo) / span) * 100).toFixed(2)}%`;
const peeks = (c, ci) => `<span class="peeks" aria-hidden="true">${PEEKS[c.key].map((p, n) => {
  const k = ci * 2 + n; // spreads wiggle speeds and phases so no two logos move together
  const style = `--x:${pct(p.d[0], 0, 480)};--y:${pct(p.d[1], 20, 176)};--mx:${pct(p.m[0], 138, 204)};--my:${pct(p.m[1], 36, 160)};` +
    `--r:${p.r}deg;--wx:${p.wx};--wy:${p.wy};--t:${(5.2 + ((k * 7) % 5) * 0.7).toFixed(1)}s;--d:-${((k * 3) % 7) * 0.9}s;--n:${n}`;
  return `<span class="peek" data-fly="${p.fly}" style="${style}"><span class="fly"><span class="bob">${mark(p.fly)}</span></span></span>`;
}).join('')}</span>`;

const city = (c, i) => `
    <div class="city" data-city="${c.key}" style="--c:${i}">
      <div class="glow" aria-hidden="true"></div>${panel(c)}
      <button class="scape" type="button" aria-expanded="false" aria-controls="p-${c.key}">
        <span class="code" aria-hidden="true">${c.code}</span>${peeks(c, i)}
        <span class="art">${citySvg(c.key)}${citySvg(c.key, { mobile: true })}</span>
        <span class="sr">${c.title}: ${c.rows.map((r) => r.org).join(', ')}</span>
      </button>
    </div>`;

const url = (process.env.SITE_URL || site.url).replace(/\/$/, ''); // SITE_URL: build for another address

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${site.name}</title>
<meta name="description" content="${site.description}">
<meta name="theme-color" content="#FCFCFC">
<link rel="canonical" href="${url}/">
<meta property="og:type" content="website">
<meta property="og:url" content="${url}/">
<meta property="og:title" content="${site.name}">
<meta property="og:description" content="${site.description}">
<meta property="og:image" content="${url}/assets/og.jpg">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${site.name}, set in serif over a soft sunrise glow">
<meta property="og:video" content="${url}/assets/og.mp4">
<meta property="og:video:type" content="video/mp4">
<meta property="og:video:width" content="1200">
<meta property="og:video:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${url}/assets/og.jpg">
<link rel="icon" type="image/png" sizes="64x64" href="/assets/favicon.png">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500&family=Source+Serif+4:opsz,wght@8..60,400&display=swap">
<script>document.documentElement.classList.add('js')</script>
<style>${css.trim()}</style>
</head>
<body>
<main class="stage">
  <header class="intro">
    <h1 aria-label="${site.name}">${letters(site.name)}</h1>
    <ul class="links" aria-label="Elsewhere">${LINKS.map(([key, label], i) => `
      <li style="--i:${i}"><a class="tile" href="${site.links[key]}" ${external} aria-label="${label}">${ICONS[key]}</a></li>`).join('')}
    </ul>
  </header>
  <section class="cities" aria-labelledby="cities-h">
    <h2 id="cities-h" class="sr">Where I have worked, by city</h2>${CITIES.map(city).join('')}
    <span class="join" style="--j:1" aria-hidden="true"></span><span class="join" style="--j:2" aria-hidden="true"></span>
  </section>
</main>
<script>${js.trim()}</script>
</body>
</html>
`;

const dist = new URL('../dist/', import.meta.url);
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist);
cpSync(new URL('../public/', import.meta.url), dist, { recursive: true });
writeFileSync(new URL('index.html', dist), html);
console.log(`dist/index.html ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB`);
