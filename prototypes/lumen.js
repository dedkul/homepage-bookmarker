'use strict';
/* Lumen v0.9 prototype. State lives in localStorage ("lumen.v09"); uploaded photos in IndexedDB.
   The <head> boot script already applied layout, mode and wallpaper before first paint. */

const KEY = 'lumen.v09';
const html = document.documentElement;
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const DEF = {
  layout: 'editorial',
  dock: { pos: 'bottom', autohide: false, rows: 1 },
  bg: { mode: 'color', color: '#111113', saved: [], glass: 'frost', surface: 'black', frost: 0.5, photos: [], freq: 'tab', dim: 0.3, cur: 0, at: 0, next: null },
  clock: { show: 'large', h24: false, zone2: true, tz: 'Asia/Kolkata', font: 'serif' },
  favs: [
    ['YouTube', 'https://youtube.com'], ['Gmail', 'https://mail.google.com'], ['GitHub', 'https://github.com'],
    ['Figma', 'https://figma.com'], ['Instagram', 'https://instagram.com'], ['Notion', 'https://notion.so'],
  ].map(([name, url]) => ({ name, url })),
  favSize: 'm', // s / m / l: favorite icon size in every layout
  search: { show: true, online: null, remember: true, newTab: false, focus: false }, // online: null until asked
  weather: { show: false, place: null, unit: 'c', pos: 'date' }, // place: { name, lat, lon } from Open-Meteo geocoding
  notes: { show: true, open: false, done: 'bottom', items: [
    // What a new user sees. Every line states k, or the v0.9.8 migration below would make it a task.
    { t: 'Add your first note here', d: false, k: true },
    { t: 'Paste a link to save it for later', d: false, k: true },
    { t: 'Design files', d: false, k: false, g: true, o: true },
    { t: '[Figma Community](https://www.figma.com/community)', d: false, k: false, c: true },
    { t: '[Lucide icons](https://lucide.dev/icons)', d: false, k: false, c: true },
    { t: '[Follow Ashish on X](https://x.com/feat_ashish)', d: false, k: false },
    { t: '', d: false, k: false },
  ] },
};
const saved = window.__lumen || {};
const s = {};
for (const k of Object.keys(DEF)) {
  const v = DEF[k];
  s[k] = v && typeof v === 'object' && !Array.isArray(v) ? { ...v, ...(saved[k] || {}) } : (saved[k] ?? v);
}
// v0.9.8: each line is a note unless it is a task (k). Before, one "checks" setting made every line a task.
for (const it of s.notes.items) if (it.k == null) it.k = s.notes.checks !== false && !!it.t;
delete s.notes.checks;
// v0.9 had Dark / Light; they are now just two solid colors.
// v0.9.11: glass was on/off; it is now Solid / Frosted / Liquid.
if (typeof s.bg.glass === 'boolean') s.bg.glass = s.bg.glass ? 'frost' : 'solid';
if (s.bg.mode === 'dark' || s.bg.mode === 'light') { s.bg.color = s.bg.mode === 'light' ? '#f7f7f5' : '#111113'; s.bg.mode = 'color'; }

// v0.9.14: searches use the browser's default engine; Wallpaper of the day is gone.
delete s.search.engine; delete s.search.suggest; delete s.bg.potd;
try { localStorage.removeItem('lumen.potd'); } catch (e) { /* storage blocked */ }

/* Solid colors */
const PRESETS = [['Ink', '#111113'], ['Graphite', '#2b2b2f'], ['Navy', '#1c2533'], ['Forest', '#1d2a23'], ['Plum', '#2a2130'],
  ['Paper', '#f7f7f5'], ['White', '#ffffff'], ['Sand', '#ece5d8'], ['Sage', '#d3dbcc'], ['Mist', '#d8dee7']];
const MAX_SAVED = 8;
function normHex(v) {
  let h = String(v).trim().replace(/^#/, '').toLowerCase();
  if (/^[0-9a-f]{3}$/.test(h)) h = h.split('').map((c) => c + c).join('');
  return /^[0-9a-f]{6}$/.test(h) ? '#' + h : null;
}
function toneOf(hex) {
  // Pick whichever text color (light #EDEDEC or dark #1A1A1A) has more contrast on this background.
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return (L + 0.05) / 0.0603 > 0.896 / (L + 0.05) ? 'light' : 'dark';
}
const DEMO = !!window.__lumenPreset;
let saveTimer;
function save(now) {
  if (DEMO) return;
  clearTimeout(saveTimer);
  const write = () => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { toast('Unable to save. Browser storage is full; remove an uploaded photo to free space.'); } };
  now === false ? (saveTimer = setTimeout(write, 300)) : write();
}

/* Bangs search one site, which the Web Store allows as "vertical search". Never add a general web
   engine here (!g, !ddg, !b): web searches must go to the browser's default engine. */
const BANGS = [
  ['yt', 'YouTube', 'https://www.youtube.com/results?search_query=%s'],
  ['w', 'Wikipedia', 'https://en.wikipedia.org/w/index.php?search=%s'],
  ['r', 'Reddit', 'https://www.reddit.com/search/?q=%s'],
  ['gh', 'GitHub', 'https://github.com/search?q=%s'],
  ['a', 'Amazon', 'https://www.amazon.com/s?k=%s'],
  ['ain', 'Amazon India', 'https://www.amazon.in/s?k=%s'],
  ['fk', 'Flipkart', 'https://www.flipkart.com/search?q=%s'],
  ['maps', 'Google Maps', 'https://www.google.com/maps/search/%s'],
  ['spot', 'Spotify', 'https://open.spotify.com/search/%s'],
  ['ytm', 'YouTube Music', 'https://music.youtube.com/search?q=%s'],
  ['x', 'X', 'https://x.com/search?q=%s'],
  ['ig', 'Instagram', 'https://www.instagram.com/explore/search/keyword/?q=%s'],
  ['li', 'LinkedIn', 'https://www.linkedin.com/search/results/all/?keywords=%s'],
  ['pin', 'Pinterest', 'https://www.pinterest.com/search/pins/?q=%s'],
  ['gm', 'Gmail', 'https://mail.google.com/mail/u/0/#search/%s'],
  ['gd', 'Google Drive', 'https://drive.google.com/drive/search?q=%s'],
  ['fig', 'Figma Community', 'https://www.figma.com/community/search?query=%s'],
  ['dr', 'Dribbble', 'https://dribbble.com/search/%s'],
  ['un', 'Unsplash', 'https://unsplash.com/s/photos/%s'],
  ['nf', 'Netflix', 'https://www.netflix.com/search?q=%s'],
  ['tw', 'Twitch', 'https://www.twitch.tv/search?term=%s'],
  ['imdb', 'IMDb', 'https://www.imdb.com/find/?q=%s'],
  ['so', 'Stack Overflow', 'https://stackoverflow.com/search?q=%s'],
  ['mdn', 'MDN', 'https://developer.mozilla.org/en-US/search?q=%s'],
  ['npm', 'npm', 'https://www.npmjs.com/search?q=%s'],
  ['ph', 'Product Hunt', 'https://www.producthunt.com/search?q=%s'],
  ['gt', 'Google Translate', 'https://translate.google.com/?sl=auto&text=%s'],
  ['gpt', 'ChatGPT', 'https://chatgpt.com/?q=%s'],
  ['claude', 'Claude', 'https://claude.ai/new?q=%s'],
].map(([k, name, tpl]) => ({ k, name, tpl, url: new URL(tpl).origin }));
const CITIES = [
  ['Kolkata', 'Asia/Kolkata'], ['Sydney', 'Australia/Sydney'], ['London', 'Europe/London'], ['Berlin', 'Europe/Berlin'],
  ['New York', 'America/New_York'], ['Toronto', 'America/Toronto'], ['San Francisco', 'America/Los_Angeles'],
  ['São Paulo', 'America/Sao_Paulo'], ['Dubai', 'Asia/Dubai'], ['Singapore', 'Asia/Singapore'],
  ['Tokyo', 'Asia/Tokyo'], ['Auckland', 'Pacific/Auckland'],
];
const SEARCH_HINT = 'Search, or type ! for a site';
const MAX_FAVS = 12, MAX_PHOTOS = 10;
const plural = new Intl.PluralRules('en');
const count = (n, one, other) => `${n} ${plural.select(n) === 'one' ? one : other}`;
const ICON = {
  search: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="7" cy="7" r="4.5"/><path d="m10.5 10.5 3 3" stroke-linecap="round"/></svg>',
  // Lucide "notepad-text": a spiral pad reads as "notes" at 16px; the folded sticky note read as "file".
  notes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M12 2v4"/><path d="M16 2v4"/><rect width="16" height="18" x="4" y="4" rx="2"/><path d="M8 10h6"/><path d="M8 14h8"/><path d="M8 18h5"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>',
  // Lucide "settings" (gear): the panel holds search, favorites and notes too, not only looks.
  sliders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
};
// Settings icons: Lucide (lucide.dev, ISC license), 24px grid drawn at 16px.
const lucide = (body) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const NAV_ICON = {
  Layout: lucide('<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>'),
  Background: lucide('<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>'),
  Clock: lucide('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'),
  Favorites: lucide('<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>'),
  Weather: lucide('<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>'),
  Search: lucide('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'),
  Notes: lucide('<path d="M8 2v4"/><path d="M12 2v4"/><path d="M16 2v4"/><rect width="16" height="18" x="4" y="4" rx="2"/><path d="M8 10h6"/><path d="M8 14h8"/><path d="M8 18h5"/>'),
};
const MARK = {
  x: lucide('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
  plus: lucide('<path d="M5 12h14"/><path d="M12 5v14"/>'),
  check: lucide('<path d="M20 6 9 17l-5-5"/>'),
  up: lucide('<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>'),
  down: lucide('<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>'),
  left: lucide('<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>'),
  grip: lucide('<circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>'),
  more: lucide('<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>'),
  clock: lucide('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'),
};
const ENTER_ICON = lucide('<polyline points="9 10 4 15 9 20"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/>');

/* ---------- Time ---------- */
const pad2 = (n) => String(n).padStart(2, '0');
function hm(tz, d) {
  if (!tz) return [d.getHours(), d.getMinutes()];
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
    .formatToParts(d).map((x) => [x.type, x.value]));
  return [+p.hour % 24, +p.minute];
}
function offsetMin(tz, d) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })
    .formatToParts(d).map((x) => [x.type, x.value]));
  return Math.round((Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute) - Math.floor(d / 6e4) * 6e4) / 6e4);
}
function fmt([h, m]) {
  return s.clock.h24 ? [pad2(h) + ':' + pad2(m), ''] : [((h % 12) || 12) + ':' + pad2(m), h < 12 ? 'AM' : 'PM'];
}
let tickTimer;
function tick() {
  clearTimeout(tickTimer);
  const d = new Date(), [t, ap] = fmt(hm(null, d));
  document.querySelectorAll('[data-clock]').forEach((n) => (n.textContent = t));
  document.querySelectorAll('[data-ampm]').forEach((n) => (n.textContent = ap));
  const shortDate = `${d.toLocaleDateString('en-GB', { weekday: 'short' })} ${d.getDate()} ${d.toLocaleDateString('en-GB', { month: 'short' })}`.toUpperCase();
  document.querySelectorAll('[data-date]').forEach((n) => (n.textContent = shortDate));
  const z = $('[data-z2]');
  if (z) {
    const tz = s.clock.tz, h2 = hm(tz, d), [t2, ap2] = fmt(h2);
    z.textContent = t2 + (ap2 ? ' ' + ap2.toLowerCase() : '');
    $('[data-dot]').classList.toggle('night', h2[0] < 6 || h2[0] >= 18);
    const diff = offsetMin(tz, d) + d.getTimezoneOffset(), a = Math.abs(diff);
    $('[data-diff]').textContent = diff === 0 ? 'same time' : `${Math.floor(a / 60)}h${a % 60 ? ' ' + (a % 60) + 'm' : ''} ${diff > 0 ? 'ahead' : 'behind'}`;
  }
  tickTimer = setTimeout(tick, 60000 - (Date.now() % 60000) + 20);
}

/* ---------- Favorites ---------- */
const domain = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } };
function hue(str) { let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) % 360; return h; }
/* Apps whose favicon is wrong: Google's service returns the plain G for its apps, and GitHub's mark
   on a white square. These load from each brand's own CDN; `round` backs the mark with a white disc. */
const GAPP = (n) => `https://www.gstatic.com/images/branding/product/2x/${n}_48dp.png`;
const APP_ICONS = {
  'mail.google.com': GAPP('gmail_2020q4'), 'gmail.com': GAPP('gmail_2020q4'), 'drive.google.com': GAPP('drive_2020q4'),
  'calendar.google.com': GAPP('calendar_2020q4'), 'docs.google.com': GAPP('docs_2020q4'), 'docs.google.com/spreadsheets': GAPP('sheets_2020q4'),
  'docs.google.com/presentation': GAPP('slides_2020q4'), 'sheets.google.com': GAPP('sheets_2020q4'), 'slides.google.com': GAPP('slides_2020q4'),
  'meet.google.com': GAPP('meet_2020q4'), 'maps.google.com': GAPP('maps'), 'google.com/maps': GAPP('maps'), 'keep.google.com': GAPP('keep_2020q4'),
  'chat.google.com': GAPP('chat_2020q4'), 'photos.google.com': GAPP('photos'), 'gemini.google.com': GAPP('gemini'),
  'github.com': 'https://github.githubassets.com/favicons/favicon.svg',
};
// Local and private addresses keep their letter tile, so their names are never sent to a favicon service.
const privateHost = (h) => !h.includes('.') || /^[\d.]+$/.test(h) || /\.(local|localhost|internal|test|lan|home\.arpa)$/.test(h);
function icon(f) {
  const dom = domain(f.url);
  let path = ''; try { path = new URL(f.url).pathname.split('/')[1]; } catch (e) { /* not an address yet */ }
  const known = APP_ICONS[`${dom}/${path}`] || APP_ICONS[dom];
  const src = f.icon || known || (privateHost(dom) ? '' : window.LUMEN_FAVICON ? window.LUMEN_FAVICON(dom) : `https://www.google.com/s2/favicons?domain=${encodeURIComponent(dom)}&sz=64`);
  const round = !f.icon && dom === 'github.com';
  return `<span class="ico${round ? ' round' : ''}" style="background:hsl(${hue(dom)} 42% 42%)"><b>${esc((f.name || dom)[0].toUpperCase())}</b>${src ? `<img data-fav alt="" referrerpolicy="no-referrer" src="${esc(src)}">` : ''}</span>`;
}
const target = () => (s.search.newTab ? ' target="_blank" rel="noopener"' : '');
const tile = (f, i) => `<a class="tile" href="${esc(f.url)}"${target()} data-i="${i}" aria-label="${esc(f.name)}">${icon(f)}<span class="tip">${esc(f.name)}</span></a>`;
// The dock and strip only show favorites. Adding lives in Settings › Favorites; the + appears
// only when there is nothing yet, so an empty dock is never a dead end.
// One "add" mark everywhere a favorite can be added: Lucide plus in a dashed square, sized by its container.
const addMark = () => `<span class="addmark" aria-hidden="true">${lucide('<path d="M5 12h14"/><path d="M12 5v14"/>')}</span>`;
const addTile = () => (s.favs.length ? '' : `<button class="tile add" data-act="add" aria-label="Add a favorite">${addMark()}<span class="tip">Add a favorite</span></button>`);
// Two-row dock with an odd count leaves one empty grid cell. It becomes an add slot that only
// shows on dock hover; the cell exists either way, so nothing moves under the pointer.
const gapTile = () => (s.dock.rows === 2 && s.favs.length >= 4 && s.favs.length % 2 && s.favs.length < MAX_FAVS
  ? `<button class="tile slot" data-act="add" aria-label="Add a favorite">${addMark()}<span class="tip">Add a favorite</span></button>` : '');
// Favicons: show the letter tile instantly, swap in the real icon only once it has loaded.
document.addEventListener('load', (e) => { if (e.target.dataset && 'fav' in e.target.dataset) e.target.parentNode.classList.add('has'); }, true);
document.addEventListener('error', (e) => { if (e.target.dataset && 'fav' in e.target.dataset) e.target.remove(); }, true);

/* Strip overflow. The strip shares one row with the clock and the search field, so on narrow
   windows not every favorite fits. Keep the search usable (at least 240px), show the favorites
   that fit, and fold the rest into a "+N" tile that opens them in a small panel. */
function fitStrip() {
  const st = $('.st'), nav = st?.querySelector('.favs'); if (!nav || !s.favs.length) return;
  const tiles = [...nav.querySelectorAll('a.tile')], more = nav.querySelector('.more'), pop = nav.querySelector('.more-pop');
  tiles.forEach((t) => (t.hidden = false)); more.hidden = true; pop.hidden = true; more.setAttribute('aria-expanded', 'false');
  const cs = getComputedStyle(st), gap = parseFloat(cs.columnGap) || 24;
  const avail = st.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - st.querySelector('.sclock').offsetWidth - (s.search.show ? 240 : 0) - gap * 2;
  const per = (tiles[0]?.offsetWidth || 40) + 2, fit = Math.max(0, Math.floor((avail + 2) / per));
  if (fit >= tiles.length) return;
  const shown = Math.max(0, fit - 1);
  tiles.forEach((t, k) => (t.hidden = k >= shown));
  more.hidden = false; more.querySelector('.n').innerHTML = shown ? `+${tiles.length - shown}` : MARK.more;
  more.setAttribute('aria-label', `${tiles.length - shown} more favorites`);
  pop.innerHTML = s.favs.slice(shown).map((f, k) => `<a class="mrow" href="${esc(f.url)}"${target()} data-i="${shown + k}">${icon(f)}<span>${esc(f.name)}</span></a>`).join('');
}
let fitT; addEventListener('resize', () => { clearTimeout(fitT); fitT = setTimeout(fitStrip, 60); });

/* ---------- Main render ---------- */
function searchForm() {
  if (!s.search.show) return '';
  return `<form class="search" data-search role="search"><span aria-hidden="true">${ICON.search}</span><button type="button" class="bang" data-act="bang-off" hidden></button><input name="q" type="search" placeholder="${SEARCH_HINT}" autocomplete="off" spellcheck="false" aria-label="Search" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="sugg"><span class="bar" aria-hidden="true"></span><div class="sugg" hidden><div id="sugg" role="listbox" aria-label="Suggestions"></div><div class="sg-ask" hidden></div></div></form>`;
}
function wxSlot() {
  const w = s.weather;
  if (!w.show || !w.place) return '';
  if (w.pos === 'clock' && (s.layout === 'strip' || s.clock.show === 'large')) return 'clock';
  return w.pos === 'right' ? 'right' : 'date'; // no big clock to sit under: use the date
}
function mast() {
  // Small clock: the time moves up next to the date and the big clock goes away.
  const small = s.clock.show === 'small' && s.layout !== 'strip';
  return `<header class="mast"><div class="date">${small ? '<span class="mtime"><span data-clock></span> <span data-ampm></span></span>' : ''}<span data-date></span>${wxSlot() === 'date' ? '<span class="wx" data-wx></span>' : ''}</div><div class="mast-r">
    ${wxSlot() === 'right' ? '<span class="pill wx-pill" data-wx></span>' : ''}
    ${s.clock.zone2 ? `<div class="pill"><i class="dot" data-dot aria-hidden="true"></i><span>${esc(CITIES.find((c) => c[1] === s.clock.tz)?.[0] || s.clock.tz)}</span><span data-z2></span><span class="mute" data-diff></span></div>` : ''}
    ${s.notes.show ? `<button class="ibtn${s.notes.open ? ' on' : ''}" data-act="notes" aria-expanded="${s.notes.open}" aria-label="Notes">${ICON.notes}</button>` : ''}
    <button class="ibtn" data-act="settings" aria-label="Settings" aria-keyshortcuts=",">${ICON.sliders}</button></div></header>`;
}
const wxUnder = () => (wxSlot() === 'clock' ? '<div class="wx-clock" data-wx></div>' : '');
const bigClock = () => (s.clock.show === 'large' ? `<div class="time ff-${s.clock.font}"><span data-clock></span><span class="ampm" data-ampm></span></div>${wxUnder()}` : '');
function mainView() {
  if (s.layout === 'dock') {
    const two = s.dock.rows === 2 && s.favs.length >= 4, n = Math.max(1, s.favs.length);
    const dock = `<div class="dock-zone"><nav class="dock${two ? ' two' : ''}" aria-label="Favorites" style="--n:${n};--c:${Math.ceil(n / (two ? 2 : 1))}">${s.favs.map(tile).join('')}${addTile()}${gapTile()}</nav></div>`;
    // Center: the dock joins the clock and search as one group, centered on the page.
    if (s.dock.pos === 'center') return `<main class="dk">${bigClock()}${searchForm()}${dock}</main>`;
    return `<main class="dk">${bigClock()}${searchForm()}</main>
      <div class="dock-zone"><nav class="dock${s.dock.rows === 2 && s.favs.length >= 4 ? ' two' : ''}" aria-label="Favorites" style="--n:${Math.max(1, s.favs.length)};--c:${Math.ceil(Math.max(1, s.favs.length) / (s.dock.rows === 2 && s.favs.length >= 4 ? 2 : 1))}">${s.favs.map(tile).join('')}${addTile()}${gapTile()}</nav></div>`;
  }
  if (s.layout === 'strip') {
    return `<main class="st"><div class="sclock">${s.clock.show === 'off' ? '' : '<span class="stime"><span data-clock></span><span class="ampm" data-ampm></span></span>'}<span class="mute"><span data-date></span>${wxSlot() === 'clock' ? '<span class="wx" data-wx></span>' : ''}</span></div>
      ${searchForm() || '<div style="flex:1"></div>'}<nav class="favs" aria-label="Favorites">${s.favs.map(tile).join('')}${addTile()}${s.favs.length ? '<button class="tile more" data-act="more" aria-expanded="false" aria-label="More favorites" hidden><span class="n"></span></button><div class="more-pop" hidden></div>' : ''}</nav></main>`;
  }
  return `<main class="ed"><section class="hero">${bigClock()}</section>
    <section class="side">${searchForm()}
      <div class="fgrid">${s.favs.map((f, i) => `<div class="fav"><a href="${esc(f.url)}"${target()} data-i="${i}" data-tip="${esc(f.name)}">${icon(f)}<span>${esc(f.name)}</span></a><button class="edit" data-act="edit" data-i="${i}" aria-label="Edit ${esc(f.name)}">Edit</button></div>`).join('')}${s.favs.length < MAX_FAVS ? `<div class="fav ghost${s.favs.length % 2 ? '' : ' below'}${s.favs.length ? '' : ' show'}"><button data-act="add" aria-label="Add a favorite">${addMark()}<span>Add</span></button></div>` : ''}</div>
    </section></main>`;
}
function creditView() {
  const b = s.bg;
  if (html.dataset.mode !== 'photo') return '';
  const p = b.photos[b.cur];
  if (!p) return '';
  if (p.source === 'unsplash') return `<div class="credit">Photo by <a href="${esc(utm(p.credit.link))}" target="_blank" rel="noopener">${esc(p.credit.name)}</a> on <a href="https://unsplash.com/?utm_source=lumen&utm_medium=referral" target="_blank" rel="noopener">Unsplash</a></div>`;
  if (p.source === 'wallhaven') return `<div class="credit">Wallpaper from <a href="${esc(p.page)}" target="_blank" rel="noopener">Wallhaven</a></div>`;
  return '';
}
/* Notes: one writing surface. Each line is a note, a task (k, typed as [ ]), a heading (h, typed as #)
   or a toggle (g, typed as >). Lines inside a toggle carry c and always follow it directly; there is
   one level of nesting. Backspace at the start of a line undoes its type. The line you're editing shows
   its raw text; the others render formatting and turn web addresses into link chips. */
const LINK_RE = /\[([^\]\n\u0000]+)\]\((https?:\/\/[^\s)\u0000]+)\)|(https?:\/\/[^\s<>"`\u0000]+)/gi;
function linkAt(label, wrapped, bare) {
  let url = wrapped || bare, tail = '';
  if (bare) while (/[.,;:!?\])}]$/.test(url)) {
    if (url.endsWith(')') && url.split('(').length >= url.split(')').length) break; // a bracket that is part of the address
    tail = url.slice(-1) + tail; url = url.slice(0, -1);
  }
  try {
    const u = new URL(url); if (!u.hostname) return null;
    let slug = u.pathname.split('/').filter(Boolean).pop() || '';
    try { slug = decodeURIComponent(slug); } catch (e) { /* keep it encoded */ }
    slug = slug.replace(/\.(html?|php|aspx?)$/i, '').replace(/[-_]+/g, ' ').trim();
    // Long unbroken ids and view names say nothing, so those chips show just the site.
    if (slug.length > 48 || /\S{25,}/.test(slug) || /^(edit|view|index|\d+)$/i.test(slug)) slug = '';
    const dom = domain(url);
    return { url, tail, name: label || (slug ? `${dom} › ${slug}` : dom) };
  } catch (e) { return null; }
}
function allLinks() {
  const out = new Map();
  for (const it of s.notes.items) for (const m of it.t.replace(/`[^`\n]+`/g, '').matchAll(LINK_RE)) {
    const l = linkAt(m[1], m[2], m[3]); if (l && !out.has(l.url)) out.set(l.url, l);
  }
  return [...out.values()];
}
const X_LOGO = '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M12.2 1.5h2.2L9.6 7l5.6 7.5h-4.4L7.4 9.9 3.4 14.5H1.2l5.1-5.9L.9 1.5h4.5l3.1 4.1zm-.8 11.7h1.2L4.7 2.7H3.4z"/></svg>';
// An X profile alone on a line shows as a card. The mark is drawn here, so showing it sends nothing to X or an icon service.
const X_PROFILE = /^https?:\/\/(?:www\.)?(?:x|twitter)\.com\/(?!(?:home|explore|search|intent|share|settings|messages|notifications|i)\/?$)(\w{1,15})\/?$/i;
function xCard(t) {
  const line = t.trim(), m = line.match(/^\[([^\]\n]+)\]\((\S+)\)$/), url = m ? m[2] : line, who = url.match(X_PROFILE);
  return who && `<a class="chip xcard" href="${esc(url)}" target="_blank" rel="noopener noreferrer"><span class="xmark" aria-hidden="true">${X_LOGO}</span><span class="chip-t"><b>${esc(m ? m[1] : '@' + who[1])}</b><span>${m ? '@' + who[1] : 'X profile'}</span></span></a>`;
}
function md(t) {
  const card = xCard(t); if (card) return card;
  const held = [], hold = (x) => `\u0000${held.push(x) - 1}\u0000`;
  const raw = t.replace(/`([^`\n]+)`/g, (_, c) => hold(`<code>${esc(c)}</code>`))
    .replace(LINK_RE, (all, label, wrapped, bare) => {
      const l = linkAt(label, wrapped, bare); if (!l) return all;
      return hold(`<a class="chip" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer" data-tip="${esc(l.url)}">${icon(l)}<span class="chip-t">${esc(l.name)}</span></a>`) + l.tail;
    });
  const h = esc(raw).replace(/\*\*(\S(?:.*?\S)?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(\S(?:.*?\S)?)__/g, '<u>$1</u>')
    .replace(/~~(\S(?:.*?\S)?)~~/g, '<s>$1</s>')
    .replace(/(^|[^*\w])\*(\S(?:.*?\S)?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/(^|[^_\w])_(\S(?:.*?\S)?)_(?!\w)/g, '$1<em>$2</em>');
  return h.replace(/\u0000(\d+)\u0000/g, (_, i) => held[i] ?? '');
}
function groupEnd(i) { let e = i + 1; while (s.notes.items[e]?.c) e++; return e; }
// Leaving a toggle moves the line below the group, so the lines after it keep their parent.
function outdent(i) {
  const items = s.notes.items, to = groupEnd(i) - 1, [it] = items.splice(i, 1);
  it.c = false; items.splice(to, 0, it);
  return to;
}
const grow = (ta) => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };
function notesView() {
  const n = s.notes;
  if (!n.show || !n.open) return '';
  const doneT = (i) => !!(n.items[i].k && n.items[i].d);
  const order = (list, at = (x) => x) => n.done === 'hide' ? list.filter((x) => !doneT(at(x)))
    : n.done === 'bottom' ? [...list.filter((x) => !doneT(at(x))), ...list.filter((x) => doneT(at(x)))] : list;
  const blocks = [];
  n.items.forEach((it, i) => {
    if (it.c && blocks.length && n.items[blocks.at(-1).i].g) blocks.at(-1).kids.push(i);
    else { if (it.c) it.c = false; blocks.push({ i, kids: [] }); }
  });
  const doneCount = n.items.filter((x) => x.k && x.d).length;
  const line = (i, kids = []) => {
    const it = n.items[i];
    const lead = it.k ? `<input type="checkbox" class="chk" data-note-chk="${i}"${it.d ? ' checked' : ''} aria-label="${esc(it.t ? `Mark “${it.t}” as done` : 'Mark as done')}">`
      : it.g ? `<button class="twist" data-act="twist" data-i="${i}" aria-expanded="${!!it.o}" aria-label="${esc(`${it.o ? 'Collapse' : 'Expand'} ${it.t || 'toggle'}`)}">${lucide('<path d="m9 18 6-6-6-6"/>')}</button>` : '';
    // Only the first line of an empty notepad explains the shortcuts; other empty lines stay blank.
    const ph = it.k ? 'Task' : it.g ? 'Toggle' : it.h ? 'Heading' : n.items.length === 1 ? 'Write, or paste a link. [ ] task, > toggle, # heading' : '';
    const label = it.k ? 'Task' : it.g ? 'Toggle title' : it.h ? 'Heading' : 'Note';
    const shown = it.t ? md(it.t) : `<span class="nph">${ph}</span>`;
    const hint = ph || (it.c ? '' : 'Type > for a toggle, [ ] for a task'); // seen only on the line being written
    return `<div class="note${it.k ? ' task' : ''}${it.k && it.d ? ' done' : ''}${it.h ? ' head' : ''}${it.c ? ' child' : ''}">${lead}<div class="ntx"><div class="nmd"${shown.includes('class="chip') ? '' : ' aria-hidden="true"'}>${shown}</div><textarea rows="1" data-note="${i}" placeholder="${hint}" aria-label="${label}">${esc(it.t)}</textarea></div>${it.g && !it.o && kids.length ? `<span class="kids">${kids.length}</span>` : ''}</div>`;
  };
  const body = order(blocks, (b) => b.i).map((b) => {
    const it = n.items[b.i];
    if (!it.g || !it.o) return line(b.i, b.kids);
    return line(b.i) + (b.kids.length ? order(b.kids).map((i) => line(i)).join('') : `<button class="tempty" data-act="tfill" data-i="${b.i}">Empty. Click to write inside.</button>`);
  }).join('');
  const links = allLinks(), onLinks = ui.notesTab === 'links';
  const linkList = links.length ? links.map((l) => `<a class="nlink" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${icon(l)}<span class="chip-t">${esc(l.name)}</span></a>`).join('')
    : '<p class="nempty">Paste a link into a note and it’s saved here too.</p>';
  return `<aside class="notes${ui.notesEnter ? ' pop-in' : ''}" aria-label="Notes"><div class="notes-h"><div class="ntabs">
      <button class="ntab" data-act="ntab" data-val="notes" aria-pressed="${!onLinks}">Notes</button>
      <button class="ntab" data-act="ntab" data-val="links" aria-pressed="${onLinks}">Links${links.length ? ` ${links.length}` : ''}</button></div>
    <button class="link mute" data-act="notes">Close</button></div>
    ${onLinks ? linkList : body}
    ${!onLinks && doneCount ? `<div class="notes-f"><span>${doneCount} done${n.done === 'hide' ? ' (hidden)' : ''}</span><button class="link" data-act="clear-done">Clear completed</button></div>` : ''}</aside>`;
}
function focusNote(i, at) { const el = $(`[data-note="${i}"]`); if (el) { el.focus(); const p = at === true ? el.value.length : at || 0; el.setSelectionRange(p, p); } }
function render() {
  html.dataset.layout = s.layout;
  html.dataset.dock = s.dock.pos;
  html.dataset.fsize = s.favSize;
  // A centered dock sits in the page, not on an edge, so there is nothing to tuck it into.
  html.toggleAttribute('data-autohide', !!s.dock.autohide && s.dock.pos !== 'center');
  closeSugg(); setBang(null); hideTip();
  $('#app').innerHTML = mast() + mainView() + notesView() + creditView();
  fitStrip();
  tick();
  paintWeather();
  liquify();
}

/* ---------- Background ---------- */
const utm = (link) => link + (link.includes('?') ? '&' : '?') + 'utm_source=lumen&utm_medium=referral';
function readCache(slot) { try { return JSON.parse(localStorage.getItem('lumen.img.' + slot) || 'null'); } catch (e) { return null; } }
async function writeCache(slot, id, blob) {
  if (DEMO) return;
  // A downscaled copy in localStorage lets the boot script paint an upload synchronously.
  try {
    const bmp = await createImageBitmap(blob), k = Math.min(1, 1920 / bmp.width);
    const c = document.createElement('canvas'); c.width = bmp.width * k; c.height = bmp.height * k;
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    localStorage.setItem('lumen.img.' + slot, JSON.stringify({ id, data: c.toDataURL('image/jpeg', 0.8) }));
  } catch (e) { /* quota or decode error: falls back to IndexedDB on that tab */ }
}
let shownPhoto = getComputedStyle(html).getPropertyValue('--photo').trim(), booted = false;
async function setPhoto(src) {
  const next = `url("${src}")`;
  if (next === shownPhoto) return;
  const prev = shownPhoto; shownPhoto = next;
  if (!booted || !prev || prev === 'none' || matchMedia('(prefers-reduced-motion: reduce)').matches) { html.style.setProperty('--photo', next); return; }
  // Crossfade: decode the new photo first so the swap never flashes the base color.
  const img = new Image(); img.src = src; await img.decode().catch(() => {});
  if (shownPhoto !== next) return;
  const old = document.createElement('div'); old.className = 'bg-old'; old.style.backgroundImage = prev;
  document.body.prepend(old); html.style.setProperty('--photo', next);
  requestAnimationFrame(() => requestAnimationFrame(() => old.classList.add('out')));
  setTimeout(() => old.remove(), 450);
}
/* Liquid glass. Each glass surface gets an SVG filter in its backdrop-filter; the filter's
   displacement map bends the wallpaper near the edges like a thick rounded lens. The map depends on
   the surface's size and corner radius, so maps are built per size and reused (Chromium only; other
   browsers keep the CSS fallback blur). No library, no images: a few KB of generated data. */
const LG = { svg: null, ids: new Map(), ro: new ResizeObserver((es) => es.forEach((e) => lens(e.target))) };
const LG_SEL = '.dock, .st, .notes, .pill, .ibtn, .more-pop';
function lensMap(w, h, r) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'), img = ctx.createImageData(w, h), px = img.data, bez = Math.min(16, Math.min(w, h) / 4); // narrow rim, clear middle
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = x + 0.5 - w / 2, dy = y + 0.5 - h / 2, qx = Math.abs(dx) - (w / 2 - r), qy = Math.abs(dy) - (h / 2 - r);
    const ox = Math.max(qx, 0), oy = Math.max(qy, 0), len = Math.hypot(ox, oy);
    const inside = -(len + Math.min(Math.max(qx, qy), 0) - r); // distance in from the edge
    const t = Math.max(0, 1 - inside / bez), m = t * t;        // strongest at the rim, zero past the bezel
    let nx = 0, ny = 0;
    if (len > 0) { nx = (ox / len) * Math.sign(dx); ny = (oy / len) * Math.sign(dy); } else if (qx > qy) nx = Math.sign(dx); else ny = Math.sign(dy);
    const i = (y * w + x) * 4; // sample inward, so the rim magnifies what is just inside it
    px[i] = 128 - nx * m * 127; px[i + 1] = 128 - ny * m * 127; px[i + 2] = 128; px[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0); return [c.toDataURL(), Math.round(bez * 1.5)];
}
function lens(el) {
  if (html.dataset.glass !== 'liquid' || !el.isConnected) return;
  const w = el.offsetWidth, h = el.offsetHeight; if (!w || !h) return;
  const r = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, w / 2, h / 2), key = `${w}x${h}r${Math.round(r)}`;
  let id = LG.ids.get(key);
  if (!id) {
    if (!LG.svg) { LG.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); LG.svg.setAttribute('aria-hidden', 'true'); LG.svg.style.cssText = 'position:absolute;width:0;height:0'; document.body.append(LG.svg); }
    const [map, scale] = lensMap(w, h, r); id = 'lg' + LG.ids.size; LG.ids.set(key, id);
    LG.svg.insertAdjacentHTML('beforeend', `<filter id="${id}" x="0" y="0" width="${w}" height="${h}" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feImage href="${map}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="m"/><feDisplacementMap in="SourceGraphic" in2="m" scale="${scale}" xChannelSelector="R" yChannelSelector="G"/></filter>`);
  }
  const f = `blur(${el.matches('.notes, .more-pop') ? 10 : 2}px) url(#${id}) saturate(1.6) brightness(1.05)`;
  el.style.backdropFilter = f; el.style.webkitBackdropFilter = f; el.dataset.lg = '';
}
function liquify() {
  LG.ro.disconnect(); // render() replaces the surfaces, so start from the current ones
  if (html.dataset.glass !== 'liquid') { $$('[data-lg]').forEach((el) => { el.style.backdropFilter = el.style.webkitBackdropFilter = ''; delete el.dataset.lg; }); return; }
  $$(LG_SEL).forEach((el) => { LG.ro.observe(el); lens(el); });
}
async function applyBg() {
  const b = s.bg, has = b.mode === 'photo' && b.photos.length > 0;
  html.dataset.mode = has ? 'photo' : 'color';
  html.dataset.tone = has ? 'dark' : toneOf(b.color);
  html.style.setProperty('--solid', b.color);
  html.dataset.glass = b.glass;
  html.dataset.surface = b.surface;
  liquify();
  html.style.setProperty('--frost', b.frost);
  if (has) {
    if (!(b.cur < b.photos.length)) b.cur = 0;
    const p = b.photos[b.cur];
    html.style.setProperty('--pc', p.color || '#111113');
    html.style.setProperty('--dim', b.dim);
    if (p.source === 'upload') {
      const c = readCache('cur');
      if (c && c.id === p.id) setPhoto(c.data);
      else { const blob = await idb('get', p.id); if (blob) { setPhoto(URL.createObjectURL(blob)); writeCache('cur', p.id, blob); } }
    } else setPhoto(p.src);
  }
  const old = $('.credit'); if (old) old.remove();
  $('#app').insertAdjacentHTML('beforeend', creditView());
}
async function prepareNext() {
  // Pick the next tab's wallpaper now and warm it, so the next new tab paints it instantly.
  const b = s.bg, n = b.photos.length;
  if (!n) { b.next = null; save(); return; }
  let i = 0;
  if (n > 1) do i = Math.floor(Math.random() * n); while (i === b.cur);
  b.next = i; save();
  const p = b.photos[i];
  if (p.source === 'upload') { const blob = await idb('get', p.id); if (blob) await writeCache('next', p.id, blob); }
  else new Image().src = p.src;
}
function idb(op, key, val) {
  return new Promise((res, rej) => {
    const r = indexedDB.open('lumen', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('img');
    r.onerror = () => rej(r.error);
    r.onsuccess = () => {
      const t = r.result.transaction('img', op === 'get' ? 'readonly' : 'readwrite'), st = t.objectStore('img');
      const q = op === 'get' ? st.get(key) : op === 'put' ? st.put(val, key) : st.delete(key);
      q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error);
    };
  });
}
async function fromUpload(file) {
  const bmp = await createImageBitmap(file);
  const draw = (w) => { const k = Math.min(1, w / bmp.width), c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); return c; };
  const full = draw(2560), blob = await new Promise((r) => full.toBlob(r, 'image/jpeg', 0.86));
  const one = draw(1).getContext('2d').getImageData(0, 0, 1, 1).data;
  const id = 'up_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  await idb('put', id, blob);
  return { id, source: 'upload', thumb: draw(320).toDataURL('image/jpeg', 0.7), color: `rgb(${one[0]},${one[1]},${one[2]})` };
}
function photoSetChanged() { save(); applyBg(); prepareNext(); }
function togglePhoto(p) {
  const b = s.bg, i = b.photos.findIndex((x) => x.id === p.id);
  if (i >= 0) return removePhoto(i);
  if (b.photos.length >= MAX_PHOTOS) return toast(`Your set has ${MAX_PHOTOS} photos. Remove one to add another.`);
  b.photos.push(p);
  if (b.photos.length === 1) { b.cur = 0; b.at = Date.now(); }
  if (p.dl && window.LUMEN_UNSPLASH_KEY) fetch(p.dl, { headers: { Authorization: 'Client-ID ' + window.LUMEN_UNSPLASH_KEY } }).catch(() => {});
  photoSetChanged();
}
function removePhoto(i) {
  const b = s.bg, [p] = b.photos.splice(i, 1);
  if (p.source === 'upload') idb('del', p.id).catch(() => {});
  if (i < b.cur) b.cur--;
  if (!(b.cur < b.photos.length)) b.cur = 0;
  photoSetChanged();
}
function showNext() {
  const b = s.bg; if (b.photos.length < 2) return;
  b.cur = b.next != null && b.next !== b.cur ? b.next : (b.cur + 1) % b.photos.length; b.at = Date.now();
  const n = readCache('next'); if (n) try { localStorage.setItem('lumen.img.cur', JSON.stringify(n)); } catch (e) {}
  photoSetChanged();
}

/* Photo sources */
let lazyLoaded = false, lazyP = null;
function loadLazyScripts() {
  // Only the settings window needs these, so they never cost the new tab anything.
  if (lazyP) return lazyP; if (lazyLoaded) return Promise.resolve(); lazyLoaded = true;
  const load = (src) => new Promise((r) => { const el = document.createElement('script'); el.src = src; el.onload = el.onerror = r; document.head.append(el); });
  return (lazyP = Promise.all([load('config.local.js'), load('wallhaven-sample.js')]));
}
async function searchUnsplash(q) {
  const key = window.LUMEN_UNSPLASH_KEY;
  if (key) {
    const r = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(q || 'wallpaper')}&per_page=18&orientation=landscape&content_filter=high`, { headers: { Authorization: 'Client-ID ' + key, 'Accept-Version': 'v1' } });
    if (!r.ok) throw new Error('Unsplash ' + r.status);
    return (await r.json()).results.map((p) => ({ id: 'us_' + p.id, source: 'unsplash', thumb: p.urls.small, src: p.urls.raw + '&w=2560&q=80&fm=jpg&fit=max', color: p.color, credit: { name: p.user.name, link: p.user.links.html }, dl: p.links.download_location }));
  }
  // No key: Picsum's list serves real Unsplash photos with credits (no search).
  const r = await fetch(`https://picsum.photos/v2/list?page=${1 + Math.floor(Math.random() * 30)}&limit=18`);
  return (await r.json()).map((p) => ({ id: 'ps_' + p.id, source: 'unsplash', thumb: `https://picsum.photos/id/${p.id}/400/250`, src: `https://picsum.photos/id/${p.id}/2560/1600`, color: '#222', credit: { name: p.author, link: p.url } }));
}
// Live search goes through serve.py (Wallhaven sends no CORS headers; the extension uses
// host_permissions instead). Without serve.py, and in Figma capture states, saved results are used.
async function searchWallhaven(q) {
  const key = (q || 'landscape').toLowerCase().trim();
  if (!window.__lumenPreset) {
    const r = await fetch('/api/wallhaven?q=' + encodeURIComponent(key)).catch(() => null);
    if (r && r.ok) {
      ui.wcanned = false;
      return (await r.json()).data.map((w) => ({ id: 'wh_' + w.id, source: 'wallhaven', thumb: w.thumbs.large, src: w.path, color: w.colors[0] || '#222', page: w.url }));
    }
    if (r && r.status === 502) throw new Error('Wallhaven unreachable');
  }
  ui.wcanned = true;
  const saved = (window.LUMEN_WALLHAVEN || {})[key];
  if (!saved && !window.__lumenPreset) throw Object.assign(new Error('no server'), { noServer: true });
  return (saved || []).map((w) => ({ id: 'wh_' + w.id, source: 'wallhaven', thumb: w.thumb, src: w.src, color: w.color, page: w.link }));
}

/* ---------- Weather ----------
   Open-Meteo: free, no key, CORS. Only runs when the user turns it on and picks a place, and at most
   every 30 minutes; the cached reading shows immediately so the top bar never waits for it. */
const WX_KEY = 'lumen.wx';
const WX_WORDS = [[0, 'Clear'], [2, 'Partly cloudy'], [3, 'Cloudy'], [48, 'Fog'], [57, 'Drizzle'], [67, 'Rain'], [77, 'Snow'], [82, 'Showers'], [86, 'Snow showers'], [99, 'Thunderstorm']];
const wxWord = (c) => (WX_WORDS.find(([max]) => c <= max) || [0, ''])[1];
const wxCache = () => { try { return JSON.parse(localStorage.getItem(WX_KEY) || 'null'); } catch (e) { return null; } };
function paintWeather() {
  const el = $('[data-wx]'), w = wxCache(), pl = s.weather.place; if (!el) return;
  if (!w || !pl || w.lat !== pl.lat || w.lon !== pl.lon) { el.textContent = ''; return; }
  const t = s.weather.unit === 'f' ? w.temp * 9 / 5 + 32 : w.temp;
  el.textContent = `${Math.round(t)}° ${wxWord(w.code)}`;
  el.dataset.tip = `${pl.name}, updated ${new Date(w.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}
async function refreshWeather(force) {
  const pl = s.weather.place, w = wxCache();
  if (!s.weather.show || !pl) return;
  if (!force && w && w.lat === pl.lat && w.lon === pl.lon && Date.now() - w.at < 30 * 60e3) return paintWeather();
  const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${pl.lat}&longitude=${pl.lon}&current=temperature_2m,weather_code`).catch(() => null);
  if (!r || !r.ok) return paintWeather();
  const c = (await r.json()).current;
  try { localStorage.setItem(WX_KEY, JSON.stringify({ lat: pl.lat, lon: pl.lon, temp: c.temperature_2m, code: c.weather_code, at: Date.now() })); } catch (e) {}
  paintWeather();
}
async function findPlace(q) {
  const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5`).catch(() => null);
  return r && r.ok ? ((await r.json()).results || []).map((p) => ({ name: [p.name, p.admin1, p.country].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', '), lat: +p.latitude.toFixed(2), lon: +p.longitude.toFixed(2) })).filter((x, i, all) => all.findIndex((y) => y.name === x.name) === i) : null;
}

/* ---------- Collections ----------
   Curated searches shown as cards, so picking a mood doesn't start from an empty search box.
   Each card's cover is the first result of its own search, loaded when the pane opens. */
const COLLECTIONS = [
  ['cozy', 'Cozy anime scenery', 'wallhaven', 'anime scenery'],
  ['lofi', 'Lo-fi rooms', 'wallhaven', 'lofi room'],
  ['pixel', 'Pixel worlds', 'wallhaven', 'pixel art landscape'],
  ['rain', 'Rain on glass', 'unsplash', 'rain window'],
  ['tokyo', 'Tokyo after dark', 'unsplash', 'tokyo night street'],
  ['dawn', 'Mountains at dawn', 'unsplash', 'mountain sunrise'],
  ['space', 'Deep space', 'wallhaven', 'nebula'],
  ['quiet', 'Quiet and minimal', 'unsplash', 'minimal landscape'],
].map(([id, name, src, q]) => ({ id, name, src, q }));
const collRes = {};
const searchColl = (c) => (collRes[c.id] ||= (c.src === 'wallhaven' ? searchWallhaven(c.q) : searchUnsplash(c.q)).catch((e) => { delete collRes[c.id]; throw e; }));
function collectionsPane() {
  if (ui.coll) {
    const c = COLLECTIONS.find((x) => x.id === ui.coll);
    return `<div class="ctop"><button class="link mute with-mark" data-coll="">${MARK.left}All collections</button><button class="btn" data-act="coll-all">Add all</button></div>
      <div class="sub">${esc(c.name)} <span class="mute">· ${c.src === 'wallhaven' ? 'Wallhaven' : 'Unsplash'}</span></div>
      <div class="rgrid" id="cresults" aria-live="polite"><span class="desc">Loading…</span></div>`;
  }
  return `<div class="cgrid">${COLLECTIONS.map((c) => `<button class="ccard" data-coll="${c.id}"><span class="ccover" data-cover="${c.id}"></span><span class="cname">${esc(c.name)}</span><span class="desc">${c.src === 'wallhaven' ? 'Wallhaven' : 'Unsplash'}</span></button>`).join('')}</div>`;
}
async function fillCollections() {
  if (ui.coll) {
    const c = COLLECTIONS.find((x) => x.id === ui.coll), box = $('#cresults'); if (!box) return;
    try { const list = await searchColl(c); if ($('#cresults') && ui.coll === c.id) $('#cresults').innerHTML = results(list, c.q); }
    catch (e) { if ($('#cresults')) $('#cresults').innerHTML = `<div class="err"><span class="desc">${e.noServer ? 'Wallhaven collections need the prototype server (python3 serve.py).' : 'Unable to load this collection. Check your connection and try again.'}</span></div>`; }
    return;
  }
  for (const c of COLLECTIONS) searchColl(c).then((list) => { const el = $(`[data-cover="${c.id}"]`); if (el && list[0]) el.style.backgroundImage = `url('${list[0].thumb}')`; }).catch(() => {});
}

/* ---------- Settings window ---------- */
const ui = { sec: 'Layout', bgTab: 'mine', uq: '', wq: 'landscape', results: null, drag: null };
// Wallhaven was off until Unsplash approved the production key (2026-11-14). Flip to hide the tab again.
const WALLHAVEN = true;
const CLOCK_FONTS = [['serif', 'Serif'], ['sans', 'Sans'], ['pixel', 'Pixel'], ['dot', 'Dot']];
// Clock lives inside Layout (v0.9.11): its options depend on the layout, and alone it was a thin tab.
const SECTIONS = ['Layout', 'Background', 'Favorites', 'Search', 'Weather', 'Notes'];
const get = (path) => path.split('.').reduce((o, k) => o[k], s);
function set(path, val) { const ks = path.split('.'), last = ks.pop(); ks.reduce((o, k) => o[k], s)[last] = val; }
const seg = (path, opts, full) => `<div class="seg${full ? ' full' : ''}" role="radiogroup" data-lbl><i class="seg-ind" aria-hidden="true"></i>${opts.map(([v, l]) => `<button role="radio" aria-checked="${get(path) === v}" class="${get(path) === v ? 'on' : ''}" data-set="${path}" data-val='${JSON.stringify(v)}'>${l}</button>`).join('')}</div>`;
// Compact dropdown for short option lists that don't fit a segmented control.
const pick = (path, opts) => `<select class="sel fit" data-sel="${path}" data-lbl>${opts.map(([v, l]) => `<option value="${v}"${get(path) === v ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
const tog = (path) => `<button class="tog${get(path) ? ' on' : ''}" role="switch" aria-checked="${!!get(path)}" data-tog="${path}" data-lbl></button>`;
const pct = (v) => Math.round(v * 100) + '%';
// Slider: the native range input stays (keyboard, screen readers) but is invisible; pointer drag is ours (see slideTo).
function sliderRow(label, desc, path, min, max, step, off, extra = '') {
  const v = get(path), id = 'r' + (++rid);
  return `<div class="row stack${off ? ' off' : ''}"${off ? ' inert' : ''}><div class="sld" style="--v:${(v - min) / (max - min)}"><div class="sld-fill"></div><span class="sld-lbl" aria-hidden="true">${label}</span><span class="sld-val" aria-hidden="true" data-tip="Click to type a value">${pct(v)}</span><input class="sld-in" type="range" min="${min}" max="${max}" step="${step}" value="${v}" data-range="${path}" aria-label="${label}" aria-valuetext="${pct(v)}" aria-describedby="${id}d"></div><div class="desc" id="${id}d">${desc}</div>${extra}</div>`;
}
/* Frost preview: a small dock made of real glass over two of the user's wallpapers. It reads the
   same --frost variable as the real surfaces, so it updates live while the slider moves. */
function frostPreview() {
  const b = s.bg, mine = b.photos.map((p) => p.thumb).filter(Boolean);
  const pics = [...new Set([mine[b.cur], mine[(b.cur + 1) % (mine.length || 1)], 'figma-assets/1015-t.jpg', 'figma-assets/1036-t.jpg'].filter(Boolean))].slice(0, 2);
  const dock = `<div class="fp-dock">${s.favs.slice(0, 5).map(icon).join('')}</div>`;
  return `<div class="fprev" aria-hidden="true">${pics.map((u) => `<div class="fp" style="background-image:url('${esc(u)}')">${dock}</div>`).join('')}</div>`;
}
let rid = 0;
function row(label, desc, ctrl, off) {
  const id = 'r' + (++rid);
  const named = ctrl.replace(/ data-lbl/g, ` aria-labelledby="${id}"${desc ? ` aria-describedby="${id}d"` : ''}`);
  return `<div class="row${off ? ' off' : ''}"${off ? ' inert' : ''}><div><div id="${id}">${label}</div>${desc ? `<div class="desc" id="${id}d">${desc}</div>` : ''}</div>${named}</div>`;
}
const mini = (bars) => `<span class="mini">${bars.map(([x, y, w, h, o]) => `<i style="left:${x}px;top:${y}px;width:${w}px;height:${h}px${o ? ';opacity:' + o : ''}"></i>`).join('')}</span>`;
const MINIS = {
  dock: [[62, 30, 52, 22, 2], [58, 58, 60, 4], [44, 92, 88, 10, 1.3]],
  editorial: [[10, 8, 156, 2, .6], [12, 62, 56, 26, 2], [100, 62, 64, 3], [100, 72, 28, 3, .7], [136, 72, 28, 3, .7], [100, 81, 28, 3, .7], [136, 81, 28, 3, .7], [100, 90, 28, 3, .7], [136, 90, 28, 3, .7]],
  strip: [[10, 76, 156, 24, .5], [18, 83, 26, 10, 2], [52, 85, 66, 6], [126, 85, 34, 6]],
};

function weatherRows() {
  const w = s.weather, p = ui.places;
  const list = p === 'loading' ? '<span class="desc">Searching…</span>' : p === 'error' ? '<span class="desc">Unable to search places. Check your connection.</span>'
    : Array.isArray(p) ? (p.length ? p.map((x) => `<button class="place" data-place='${esc(JSON.stringify(x))}'>${esc(x.name)}</button>`).join('') : '<span class="desc">No place by that name.</span>') : '';
  return row('Show weather', 'Temperature and sky from <a class="link ul" href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a>, which receives the town you search for and its rough coordinates.', tog('weather.show'))
    + row('Position', w.pos === 'clock' && s.layout !== 'strip' && s.clock.show !== 'large' ? 'Needs the large clock. Showing by the date until then.' : 'Where it sits on the new tab.', seg('weather.pos', [['date', 'By date'], ['clock', 'Under clock'], ['right', 'Top right']]), !w.show)
    + `<div class="row stack${w.show ? '' : ' off'}"${w.show ? '' : ' inert'}><div><div>Place</div><div class="desc">${w.place ? esc(w.place.name) : 'Search for your town or city.'}</div></div>
      <form class="sbox" data-place-q role="search"><input class="field" name="q" placeholder="Town or city" aria-label="Weather place" autocomplete="off"><button class="sbox-go" aria-label="Find place">${ENTER_ICON}</button></form>
      ${list ? `<div class="places">${list}</div>` : ''}</div>`
    + row('Units', null, seg('weather.unit', [['c', '°C'], ['f', '°F']]), !w.show);
}
const SECTION = {
  Layout: () => `<div class="cards">${[['dock', 'Dock'], ['editorial', 'Editorial'], ['strip', 'Strip']].map(([v, l]) => `<button class="lcard${s.layout === v ? ' on' : ''}" data-set="layout" data-val='"${v}"'>${mini(MINIS[v])}${l}</button>`).join('')}</div>
    ${s.layout === 'dock'
      ? row('Dock position', 'On an edge, or centered under the search.', seg('dock.pos', [['left', 'Left'], ['center', 'Center'], ['bottom', 'Bottom'], ['right', 'Right']]))
        + (s.dock.pos === 'bottom' || s.dock.pos === 'center'
          ? row('Rows', 'Two rows keep a long dock narrow.', pick('dock.rows', [[1, '1'], [2, '2']]), s.favs.length < 4)
          : row('Columns', 'Two columns keep a long dock short.', pick('dock.rows', [[1, '1'], [2, '2']]), s.favs.length < 4))
        + row('Auto-hide dock', s.dock.pos === 'center' ? 'Only for a dock on an edge.' : 'Tucks the dock into its edge until you point at it.', tog('dock.autohide'), s.dock.pos === 'center')
      : ''}
    <div class="sub">Clock</div>${SECTION.Clock()}`,
  Background: () => {
    const b = s.bg;
    let body = colorPane();
    if (b.mode === 'photo') {
      if (!PANE[ui.bgTab] || (ui.bgTab === 'wallhaven' && !WALLHAVEN)) ui.bgTab = 'mine';
      const tabs = [['collections', 'Collections'], ['mine', `My photos&nbsp;&nbsp;${b.photos.length}/${MAX_PHOTOS}`], ['unsplash', 'Unsplash'], ...(WALLHAVEN ? [['wallhaven', 'Wallhaven']] : [])];
      body = `<div class="tabs" role="tablist">${tabs.map(([v, l]) => `<button role="tab" class="${ui.bgTab === v ? 'on' : ''}" data-bgtab="${v}">${l}</button>`).join('')}</div><div id="bgpane">${PANE[ui.bgTab]()}</div>`;
    }
    return `${seg('bg.mode', [['color', 'Color'], ['photo', 'Photo']], true)}${body}
      <div class="sub">Surfaces</div>
      ${row('Style', 'How the dock, strip, notes and top bar sit on your background.', pick('bg.glass', [['frost', 'Frosted glass'], ['liquid', 'Liquid glass'], ['solid', 'Solid']]))}
      ${b.glass === 'frost' ? sliderRow('Frost', 'How strong the frosting is. The preview uses your own wallpapers.', 'bg.frost', 0, 1, 0.05, false, frostPreview()) : ''}
      ${b.glass === 'liquid' ? `<p class="note-line warn">${lucide('<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>')}<span>Liquid glass bends the wallpaper at the edges and needs more graphics power. If new tabs open slowly or scrolling stutters, switch back to Frosted glass.</span></p>` : ''}
      ${b.glass === 'solid' ? row('Color', 'Solid surfaces hide the background behind them.', seg('bg.surface', [['black', 'Black'], ['white', 'White']])) : ''}
      <p class="note-line">Video backgrounds are coming soon.</p>`;
  },
  Clock: () => row('Show clock', s.layout === 'strip' ? 'Strip always uses its small clock; Off hides it.' : 'Small moves the time to the top bar, next to the date.', seg('clock.show', [['large', 'Large'], ['small', 'Small'], ['off', 'Off']]))
    + `<div class="fwrap${s.clock.show !== 'large' || s.layout === 'strip' ? ' off' : ''}"${s.clock.show !== 'large' || s.layout === 'strip' ? ' inert' : ''}><div class="fcards" role="radiogroup" aria-label="Clock font">${CLOCK_FONTS.map(([v, l]) => `<button class="fcard${s.clock.font === v ? ' on' : ''}" role="radio" aria-checked="${s.clock.font === v}" data-set="clock.font" data-val='"${v}"'><span class="fsample ff-${v}" aria-hidden="true">${fmt(hm(null, new Date()))[0]}</span>${l}</button>`).join('')}</div>
    <p class="note-line">Font for the large clock.</p></div>`
    + row('Time format', null, seg('clock.h24', [[false, '12-hour'], [true, '24-hour']]), s.clock.show === 'off')
    + row('Show a second time zone', 'A small clock in the top bar.', tog('clock.zone2'))
    + row('City', 'Shows its time and the difference from yours.', `<select class="sel" data-sel="clock.tz" data-lbl>${CITIES.map(([n, tz]) => `<option value="${tz}"${tz === s.clock.tz ? ' selected' : ''}>${n}</option>`).join('')}</select>`, !s.clock.zone2),
  Favorites: () => {
    const n = s.favs.length, full = n >= MAX_FAVS;
    const view = (f, i) => `<div class="frow" draggable="true" data-drag="${i}"><span class="grip" aria-hidden="true">${MARK.grip}</span>${icon(f)}<span class="nm" data-tip="${esc(f.name)}">${esc(f.name)}</span><span class="u">${esc(domain(f.url))}</span><span class="acts"><button class="link" data-act="move" data-i="${i}" data-dir="-1" aria-label="Move ${esc(f.name)} up"${i === 0 ? ' disabled' : ''}>${MARK.up}</button><button class="link" data-act="move" data-i="${i}" data-dir="1" aria-label="Move ${esc(f.name)} down"${i === n - 1 ? ' disabled' : ''}>${MARK.down}</button><button class="link" data-act="edit" data-i="${i}" aria-label="Edit ${esc(f.name)}">Edit</button><button class="link" data-act="remove" data-i="${i}" aria-label="Remove ${esc(f.name)}">Remove</button></span></div>`;
    const rows = s.favs.map((f, i) => (ui.fedit === i ? favRow(i) : view(f, i))).join('') + (ui.fedit === -1 ? favRow(-1) : '');
    const empty = !n && ui.fedit !== -1 ? '<div class="noresults"><span>No favorites yet</span><span class="desc">Add the sites you open every day. They show up on every new tab.</span></div>' : '';
    const adding = ui.fedit === -1;
    return `${row('Size', 'How big favorites are on the new tab.', seg('favSize', [['s', 'Small'], ['m', 'Medium'], ['l', 'Large']]))}<div class="flist">${rows}</div>${empty}
    <div class="ffoot"><span>${full ? `${n} of ${MAX_FAVS}, the most a new tab can hold. Remove one to add another.` : `${n} of ${MAX_FAVS}${n > 1 ? ' · drag or use the arrows to reorder' : ''}`}</span>${full || adding ? '' : `<button class="btn primary with-mark" data-act="add">${MARK.plus}Add favorite</button>`}</div>
    <p class="note-line">To show icons, site names (like youtube.com) are sent to Google’s icon service. Links in Notes do the same.</p>`;
  },
  Search: () => row('Show search bar', 'Searches with your browser’s default search engine.', tog('search.show'))
    + row('Suggestions as you type', 'Sends what you type to DuckDuckGo. Searches still use your default engine.', tog('search.online'), !s.search.show)
    + row('Remember searches', 'Kept only in this browser. Turning this off erases them.', `<span class="ctl-pair">${recent().length ? '<button class="btn" data-act="clear-recent">Clear</button>' : ''}${tog('search.remember')}</span>`, !s.search.show)
    + row('Open links in a new tab', 'Applies to searches and favorites.', tog('search.newTab'))
    + row('Focus search on new tab', 'Start typing right away. Off keeps focus in the address bar.', tog('search.focus'))
    + `<div class="sub">Bangs</div><p class="desc">Type one before or after your words to search that site, like <code>!yt lofi</code>.</p><div class="bangs">${BANGS.map((b) => `<span><code>!${b.k}</code>${esc(b.name)}</span>`).join('')}</div>`,
  Weather: () => weatherRows(),
  Notes: () => row('Show notes', 'Adds a Notes button to the top bar.', tog('notes.show'))
    + row('Completed tasks', 'Start a line with [ ] for a task, > for a toggle, # for a heading.', pick('notes.done', [['keep', 'Keep in place'], ['bottom', 'Move to bottom'], ['hide', 'Hide']]), !s.notes.show)
    + row('Clear completed', 'Removes every ticked task. Notes stay.', '<button class="btn" data-act="clear-done" data-lbl>Clear</button>', !s.notes.show || !s.notes.items.some((x) => x.k && x.d)),
};
function colorPane() {
  const b = s.bg, cur = b.color, preset = PRESETS.find((p) => p[1] === cur), isSaved = b.saved.includes(cur), full = b.saved.length >= MAX_SAVED;
  const sw = (c, name, removable) => `<span class="swc"><button class="sw${c === cur ? ' on' : ''}" style="--c:${c}" data-color="${c}" aria-pressed="${c === cur}" aria-label="${name || c.toUpperCase()}" data-tip="${name ? name + ' ' : ''}${c.toUpperCase()}"></button>${removable ? `<button class="x" data-unsave="${c}" aria-label="Remove saved color ${c.toUpperCase()}">${MARK.x}</button>` : ''}</span>`;
  return `<div class="sub" id="lbl-presets">Presets</div><div class="swatches" role="group" aria-labelledby="lbl-presets">${PRESETS.map(([n, c]) => sw(c, n)).join('')}</div>
    <div class="sub">Custom</div>
    <div class="custom">
      <label class="sw big" style="--c:${cur}" data-tip="Open the color picker"><input type="color" value="${cur}" data-picker aria-label="Pick a color"></label>
      <div class="hexbox"><span>#</span><input class="hex" data-hex value="${cur.slice(1).toUpperCase()}" maxlength="7" spellcheck="false" autocomplete="off" aria-label="Hex code"></div>
      <button class="btn" data-act="save-color" data-tip="${saveState(cur).why || 'Save this color'}" ${saveState(cur).disabled ? 'disabled' : ''}>${isSaved ? 'Saved' : 'Save'}</button>
    </div>
    <div class="hint" data-hint>${saveState(cur).hint}</div>
    ${b.saved.length ? `<div class="sub" id="lbl-saved">Saved</div><div class="swatches" role="group" aria-labelledby="lbl-saved">${b.saved.map((c) => sw(c, null, true)).join('')}</div>` : ''}`;
}
function saveState(c) {
  const b = s.bg, preset = PRESETS.find((p) => p[1] === c);
  if (preset) return { disabled: true, hint: '', why: `${preset[0]} is already a preset` };
  if (b.saved.includes(c)) return { disabled: true, hint: '' };
  if (b.saved.length >= MAX_SAVED) return { disabled: true, hint: `You have ${MAX_SAVED} saved colors. Remove one to save another.` };
  return { disabled: false, hint: '' };
}
let colorSave;
function setColor(hex, from) {
  // Live preview while typing or dragging in the picker; no re-render, so focus and the picker stay put.
  s.bg.color = hex; applyBg(); clearTimeout(colorSave); colorSave = setTimeout(save, 250);
  document.querySelectorAll('.sw[data-color]').forEach((el) => { const on = el.dataset.color === hex; el.classList.toggle('on', on); el.setAttribute('aria-pressed', on); });
  const big = $('.sw.big'); if (big) big.style.setProperty('--c', hex);
  const pk = $('[data-picker]'); if (pk && from !== 'picker') pk.value = hex;
  const hx = $('[data-hex]'); if (hx && from !== 'hex') hx.value = hex.slice(1).toUpperCase();
  $('.hexbox')?.classList.remove('bad');
  const st = saveState(hex), btn = $('[data-act=save-color]');
  if (btn) { btn.disabled = st.disabled; btn.dataset.tip = st.why || 'Save this color'; btn.textContent = s.bg.saved.includes(hex) ? 'Saved' : 'Save'; }
  const hint = $('[data-hint]'); if (hint) { hint.textContent = st.hint; hint.classList.remove('bad'); }
}
/* Add or edit a favorite in place: the row itself becomes the form. URL first, because the
   name fills itself in from the address (shown live as the placeholder). */
const autoName = (url) => { const d = domain(/^[a-z]+:\/\//i.test(url) ? url : 'https://' + url).split('.'); const w = d.length > 1 ? d.at(-2) : d[0]; return w ? w[0].toUpperCase() + w.slice(1) : ''; };
function favRow(i) {
  const f = s.favs[i] || { name: '', url: '' }, err = ui.ferr || '';
  return `<form class="frow editing" data-favrow="${i}" novalidate>
    <label class="fico pickable" data-tip="Choose an image"><span data-fpreview>${f.url || ui.ficon ? icon({ name: f.name || 'New', url: f.url, icon: ui.ficon === undefined ? f.icon : ui.ficon }) : `<span class="ico ghosted" aria-hidden="true">${ICON.globe}</span>`}</span><input type="file" accept="image/*" data-ficon aria-label="Choose an icon image"></label>
    <input class="field" name="url" value="${esc(f.url.replace(/^https:\/\//, '').replace(/^([^/]+)\/$/, '$1'))}" placeholder="Web address, like youtube.com" aria-label="Web address" autocomplete="off" spellcheck="false" inputmode="url"${err ? ' aria-invalid="true" aria-describedby="ferr"' : ''}>
    <input class="field" name="name" value="${esc(f.name)}" placeholder="${esc(f.url ? autoName(f.url) : 'Name')}" aria-label="Name (optional)" autocomplete="off">
    <button class="btn primary">${i < 0 ? 'Add' : 'Save'}</button><button type="button" class="btn quiet" data-act="fcancel">Cancel</button>
  </form><p class="fhint"><span>Click the icon to use your own image.</span><button type="button" class="link" data-act="icon-reset"${(ui.ficon === undefined ? f.icon : ui.ficon) ? '' : ' hidden'}>Use the site’s icon</button></p>${err ? `<p class="ferr" id="ferr" role="alert">${esc(err)}</p>` : ''}`;
}
const grid = (list) => list.map((p) => {
  const inSet = s.bg.photos.some((x) => x.id === p.id);
  return `<button class="ph" style="background-image:url('${esc(p.thumb)}')" data-pick='${esc(JSON.stringify(p))}' aria-pressed="${inSet}">${inSet ? '<span class="ok">' + MARK.check + '</span>' : ''}${p.credit ? `<span class="by">${esc(p.credit.name)}</span>` : ''}</button>`;
}).join('');
const PANE = {
  collections: collectionsPane,
  mine: () => {
    const b = s.bg, cells = [];
    for (let i = 0; i < MAX_PHOTOS; i++) {
      const p = b.photos[i];
      cells.push(p ? `<div class="cell"><button class="ph${i === b.cur ? ' cur' : ''}" style="background-image:url('${esc(p.thumb)}')" data-show="${i}" aria-label="Show photo ${i + 1} now" aria-pressed="${i === b.cur}"></button><button class="x" data-rm="${i}" aria-label="Remove photo ${i + 1} from your set">${MARK.x}</button></div>` : `<button class="ph empty" data-act="upload" aria-label="Upload a photo from your computer" data-tip="Upload a photo">${MARK.plus}</button>`);
    }
    // One place to manage the set: + opens the file picker (or drop files on the grid);
    // Unsplash and Wallhaven are one click away in the tabs.
    const full = b.photos.length >= MAX_PHOTOS;
    return `<div class="pgrid" data-drop>${cells.join('')}</div><input type="file" accept="image/*" multiple hidden data-file id="upfile">
      <p class="gridnote">${full ? 'Your set is full. Remove a photo to add another.' : 'Press + or drop images here to upload your own. They stay on this computer. Or pick some from <button class="link" data-bgtab="unsplash">Unsplash</button>' + (WALLHAVEN ? ' or <button class="link" data-bgtab="wallhaven">Wallhaven</button>.' : '.')}</p>
      ${row('Change photo', 'How often your photo changes.', `<div class="ctl">${seg('bg.freq', [['tab', 'Every tab'], ['hour', 'Hourly'], ['day', 'Daily']], true)}</div>`)}
      ${sliderRow('Dim', 'Keeps text readable on bright photos.', 'bg.dim', 0, 0.7, 0.05)}
      ${b.photos.length > 1 ? row('Shuffle now', 'Skips to the next photo in your set.', '<div class="ctl"><button class="btn" data-act="next-photo">Next photo</button></div>') : ''}`;
  },
  // Search runs as you type (500 ms after the last key, 3+ characters) or on Enter. All Lumen users share
  // one Unsplash allowance (1,000 an hour), so the pause keeps searches few.
  unsplash: () => `${searchBox('data-usearch', ui.uq, 'Search Unsplash')}
    <div class="chips">${['Nature', 'Minimal', 'Architecture', 'Ocean', 'Mountains', 'Night'].map((c) => `<button class="chip${ui.uq === c ? ' on' : ''}" data-uchip="${c}">${c}</button>`).join('')}</div>
    <div class="rgrid" id="results" aria-live="polite"><span class="desc">Loading…</span></div>
    <p class="note-line">${window.LUMEN_UNSPLASH_KEY ? 'Live Unsplash search.' : 'No Unsplash key found in config.local.js, so this shows a random page of Unsplash photos via Picsum (search is ignored).'}</p>`,
  wallhaven: () => `${searchBox('data-wsearch', ui.wq, 'Search Wallhaven')}
    <div class="chips">${['landscape', 'minimal', 'space', 'city'].map((c) => `<button class="chip${ui.wq === c ? ' on' : ''}" data-wchip="${c}">${c[0].toUpperCase() + c.slice(1)}</button>`).join('')}</div>
    <div class="rgrid" id="wresults" aria-live="polite"><span class="desc">Searching…</span></div>
    <p class="note-line" id="wnote">Safe-for-work only, 1920×1080 or larger.</p>`,
};
const searchBox = (attr, val, label) => `<form class="sbox" ${attr} role="search"><input class="field" name="q" value="${esc(val)}" placeholder="${label}" aria-label="${label}" enterkeyhint="search" autocomplete="off"><button class="sbox-go" aria-label="Search" data-tip="Search">${ENTER_ICON}</button></form>`;
const results = (list, q) => list.length ? grid(list)
  : `<div class="noresults"><span>Nothing found for “${esc(q)}”</span><span class="desc">Try a broader word, like forest or city.</span></div>`;
const syncChips = (attr, val) => document.querySelectorAll(`[${attr}]`).forEach((c) => c.classList.toggle('on', c.getAttribute(attr) === val));

function trapOpen() {
  if (!ui.opener) ui.opener = document.activeElement;
  $('#app').inert = true;
}
function openSettings(sec, instant) {
  if (sec) ui.sec = sec;
  trapOpen();
  const first = !lazyLoaded; loadLazyScripts().then(() => { if (first && $('.win')) renderSection(); });
  // Opened from the keyboard: no animation (a shortcut should feel instant).
  $('#layer').innerHTML = `<div class="scrim${instant ? ' instant' : ''}" data-scrim="settings"><div class="win" role="dialog" aria-modal="true" aria-label="Settings">
    <nav class="sbar"><i class="nav-ind" aria-hidden="true"></i>${SECTIONS.map((n) => `<button class="nav" data-sec="${n}">${NAV_ICON[n]}${n}</button>`).join('')}
      <div class="sfoot"><a href="https://x.com/feat_ashish" target="_blank" rel="noopener" aria-label="Follow @feat_ashish on X">${X_LOGO}Follow @feat_ashish</a></div></nav>
    <section class="content"></section></div></div>`;
  renderSection();
  $('.nav.on')?.focus();
}
function renderSection() {
  document.querySelectorAll('.nav').forEach((n) => { const on = n.dataset.sec === ui.sec; n.classList.toggle('on', on); on ? n.setAttribute('aria-current', 'page') : n.removeAttribute('aria-current'); });
  const on = $('.nav.on'), ind = $('.nav-ind');
  if (on && ind) { const first = !ind.style.height; if (first) ind.style.transition = 'none'; ind.style.height = on.offsetHeight + 'px'; ind.style.transform = `translateY(${on.offsetTop}px)`; if (first) { ind.offsetWidth; ind.style.transition = ''; } }
  const c = $('.content'); if (!c) return;
  const top = c.scrollTop;
  if (!SECTIONS.includes(ui.sec)) ui.sec = 'Layout';
  c.innerHTML = `<div class="h"><span>${ui.sec}</span></div>${SECTION[ui.sec]()}`;
  c.scrollTop = top;
  placeSegs();
  if (ui.sec === 'Background' && s.bg.mode === 'photo' && ui.bgTab === 'unsplash') fillUnsplash();
  if (ui.sec === 'Background' && s.bg.mode === 'photo' && ui.bgTab === 'wallhaven') fillWallhaven();
  if (ui.sec === 'Background' && s.bg.mode === 'photo' && ui.bgTab === 'collections') fillCollections();
}
async function fillUnsplash(fresh) {
  const box = $('#results'); if (!box) return;
  if (ui.results && !fresh) { box.innerHTML = results(ui.results, ui.uq); return; }
  box.innerHTML = '<span class="desc">Searching…</span>';
  const q = ui.uq; // while typing, a slower earlier search must not overwrite a newer one
  try { const list = await searchUnsplash(q); if (q !== ui.uq) return; ui.results = list; if ($('#results')) $('#results').innerHTML = results(list, q); }
  catch (e) { if (q !== ui.uq) return; if ($('#results')) $('#results').innerHTML = `<div class="err"><span class="desc">Unable to load photos. Check your connection and try again.</span><button class="btn" data-act="retry-unsplash">Try again</button></div>`; }
}
async function fillWallhaven(fresh) {
  const box = $('#wresults'); if (!box) return;
  if (ui.wres && !fresh) { box.innerHTML = results(ui.wres, ui.wq); return; }
  box.innerHTML = '<span class="desc">Searching…</span>';
  const q = ui.wq;
  try {
    const list = await searchWallhaven(q); if (q !== ui.wq) return; ui.wres = list;
    if ($('#wresults')) $('#wresults').innerHTML = results(list, q);
    if (ui.wcanned && $('#wnote')) $('#wnote').textContent = 'Saved results only (Landscape, Minimal, Space, City). Run python3 serve.py for live search.';
  } catch (e) {
    if (q !== ui.wq || !$('#wresults')) return;
    $('#wresults').innerHTML = e.noServer
      ? `<div class="noresults"><span>Live Wallhaven search needs the prototype server</span><span class="desc">This tab isn’t running on it, so only Landscape, Minimal, Space and City work. Run <code>python3 serve.py</code> in the prototypes folder and open <a class="link" href="http://localhost:5173/">localhost:5173</a>. The extension won’t need this.</span></div>`
      : `<div class="err"><span class="desc">Wallhaven didn’t answer. Check your connection and try again.</span><button class="btn" data-act="retry-wallhaven">Try again</button></div>`;
  }
}
/* Segmented control: one raised pill slides between options instead of jumping. */
function placeSegs() {
  document.querySelectorAll('.seg').forEach((sg) => {
    const on = sg.querySelector('button.on'), ind = sg.querySelector('.seg-ind'); if (!ind) return;
    ind.style.transition = 'none';
    ind.style.opacity = on ? 1 : 0;
    if (on) { ind.style.width = on.offsetWidth + 'px'; ind.style.transform = `translateX(${on.offsetLeft - 3}px)`; }
    ind.offsetWidth; ind.style.transition = '';
  });
}
function moveSeg(sg, btn) {
  sg.querySelectorAll('button').forEach((b) => { const on = b === btn; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
  const ind = sg.querySelector('.seg-ind');
  if (ind) { ind.style.width = btn.offsetWidth + 'px'; ind.style.transform = `translateX(${btn.offsetLeft - 3}px)`; }
}
// Toggles and tabs animate in place first; the section re-renders once the motion has finished.
function settle() { clearTimeout(ui.settleT); ui.settleT = setTimeout(() => $('.win') && renderSection(), still() ? 0 : 260); }
function closeLayer() {
  ui.fedit = null; ui.ferr = '';
  $('#layer').innerHTML = ''; $('#app').inert = false;
  const o = ui.opener; ui.opener = null;
  if (o && o.isConnected) o.focus(); else $('[data-act=settings]')?.focus();
}
function changed() { save(); render(); applyBg(); if ($('.win')) renderSection(); }

/* ---------- Favorite dialog ---------- */
async function pickIcon(file) {
  if (!file) return;
  const at = ui.fedit, url = URL.createObjectURL(file);
  try {
    const img = new Image(); img.src = url; await img.decode(); // <img>, not createImageBitmap, so SVG works too
    const c = document.createElement('canvas'), w = img.naturalWidth || 128, h = img.naturalHeight || 128, k = 128 / Math.max(w, h);
    c.width = c.height = 128;
    c.getContext('2d').drawImage(img, (128 - w * k) / 2, (128 - h * k) / 2, w * k, h * k);
    if (ui.fedit !== at) return; // moved on to another favorite while this decoded
    ui.ficon = c.toDataURL('image/webp', 0.9); previewIcon();
  } catch (e) { toast(`Unable to read ${file.name}. Use a PNG, SVG, JPG or WebP image.`); }
  finally { URL.revokeObjectURL(url); }
}
function previewIcon() {
  const form = $('[data-favrow]'); if (!form) return;
  const f = s.favs[+form.dataset.favrow] || { name: '', url: '' }, own = ui.ficon === undefined ? f.icon : ui.ficon;
  form.querySelector('[data-fpreview]').innerHTML = own || f.url ? icon({ name: f.name || 'New', url: f.url, icon: own }) : `<span class="ico ghosted" aria-hidden="true">${ICON.globe}</span>`;
  $('[data-act=icon-reset]').hidden = !own;
}
function editFav(i) {
  if (i < 0 && s.favs.length >= MAX_FAVS) return toast(`You have ${MAX_FAVS} favorites, the most a new tab can hold. Remove one to add another.`);
  ui.fedit = i; ui.ferr = ''; ui.ficon = undefined;
  if ($('.win')) { ui.sec = 'Favorites'; renderSection(); } else openSettings('Favorites');
  // openSettings re-renders once its lazy scripts are in, so focus after that.
  loadLazyScripts().then(() => { const f = $('[data-favrow] input[name=url]'); if (f) { f.focus(); f.select(); f.closest('form').scrollIntoView({ block: 'nearest' }); } });
}
function saveFav(form) {
  const i = +form.dataset.favrow, raw = form.url.value.trim();
  let url = /^[a-z]+:\/\//i.test(raw) ? raw : 'https://' + raw, host = '';
  try { host = new URL(url).hostname; } catch (e) {}
  const fail = (msg) => { ui.ferr = msg; renderSection(); const u = $('[data-favrow] input[name=url]'); if (u) { u.value = raw; u.focus(); } };
  if (!raw || !host || !host.includes('.')) return fail('Enter a web address, like youtube.com');
  const dupe = s.favs.findIndex((f, j) => j !== i && domain(f.url) === domain(url) && new URL(f.url).pathname.replace(/\/$/, '') === new URL(url).pathname.replace(/\/$/, ''));
  if (dupe >= 0) return fail(`That’s already in your favorites as ${s.favs[dupe].name}.`);
  const fav = { url, name: form.name.value.trim() || autoName(url) };
  const own = ui.ficon === undefined ? s.favs[i]?.icon : ui.ficon;
  if (own) fav.icon = own;
  ui.ficon = undefined;
  i < 0 ? s.favs.push(fav) : (s.favs[i] = fav);
  ui.fedit = null; ui.ferr = ''; changed();
  $(i < 0 ? '.win [data-act=add]' : `.win [data-act=edit][data-i="${i}"]`)?.focus();
}
function closeDialog() {
  const back = $('[data-scrim=dialog]')?.dataset.back;
  if (back) { const o = ui.opener; $('#layer').innerHTML = ''; openSettings(back); ui.opener = o; } else closeLayer();
}
function removeFav(i) {
  const [f] = s.favs.splice(i, 1); changed();
  toast(`${f.name} removed`, () => { s.favs.splice(i, 0, f); changed(); });
}

/* ---------- Toast ---------- */
let toastTimer;
function toast(msg, undo) {
  const region = $('#toasts'); clearTimeout(toastTimer); region.textContent = '';
  const t = document.createElement('div'); t.className = 'toast';
  t.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button class="link">Undo</button>' : ''}<button class="link x-toast" aria-label="Dismiss">${MARK.x}</button>`;
  if (undo) t.querySelector('.link').onclick = () => { undo(); region.textContent = ''; };
  t.querySelector('.x-toast').onclick = () => { region.textContent = ''; };
  region.append(t);
  // Plain messages leave after 5s (paused while pointed at or focused); ones with Undo stay until dismissed.
  if (!undo) {
    const arm = () => { toastTimer = setTimeout(() => { if (region.contains(t)) region.textContent = ''; }, 5000); };
    t.addEventListener('pointerenter', () => clearTimeout(toastTimer)); t.addEventListener('pointerleave', arm);
    t.addEventListener('focusin', () => clearTimeout(toastTimer)); t.addEventListener('focusout', arm); arm();
  }
}

/* ---------- Platform ----------
   The only search code that differs in extension/. A web page can't read the browser's default
   engine, so the prototype stands in Google and fetches suggestions through serve.py. */
function defaultSearch(q) { go('https://www.google.com/search?q=' + encodeURIComponent(q)); }
async function allowOnline() { return true; }
async function hasOnline() { return true; }
function dropOnline() {}
const suggestUrl = (q) => '/api/suggest?engine=duckduckgo&q=' + encodeURIComponent(q);

/* ---------- Search ----------
   Order: your past searches, your own sites, then DuckDuckGo's suggestions if you turned them on.
   Picking a suggestion still searches with the default engine. Text meant for a bang, or that looks
   like an address or email, is never sent for suggestions. */
const RECENT_KEY = 'lumen.recent', MAX_RECENT = 30;
const sg = { opts: [], on: -1, seq: 0, timer: 0, ctl: null, typed: '', words: [], bang: null };
function recent() {
  if (!s.search.remember) return [];
  try { const r = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); return Array.isArray(r) ? r : []; } catch (e) { return []; }
}
function writeRecent(list) { if (!DEMO) try { localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT))); } catch (e) { /* storage full: searching still works */ } }
function remember(q) { if (s.search.remember) writeRecent([q, ...recent().filter((x) => x.toLowerCase() !== q.toLowerCase())]); }
function forget(q) { writeRecent(recent().filter((x) => x !== q)); suggest($('[data-search] input').value); }
const findBang = (k) => BANGS.find((b) => b.k === k.toLowerCase());
function parseBang(q) {
  const first = q.match(/^!(\w+)(?:\s+(.*))?$/), last = q.match(/^(.+?)\s+!(\w+)$/);
  let b = first && findBang(first[1]);
  if (b) return { b, rest: first[2] || '' };
  b = last && findBang(last[2]);
  return b ? { b, rest: last[1] } : null;
}
function setBang(b) {
  sg.bang = b;
  const el = $('.search .bang'); if (!el) return;
  el.hidden = !b;
  el.innerHTML = b ? `${icon(b)}<span>${esc(b.name)}</span>` : '';
  if (b) el.setAttribute('aria-label', `Searching ${b.name}. Remove`);
  el.parentNode.q.placeholder = b ? 'Type, then press Enter' : SEARCH_HINT;
}
function useBang(b, rest = '') {
  const input = $('[data-search] input');
  closeSugg(); setBang(b); input.value = rest; input.focus();
}
function runSearch(text) {
  const q = text.trim(), hit = sg.bang ? { b: sg.bang, rest: q } : parseBang(q);
  if (!q && !hit) return;
  if (hit) {
    if (hit.rest) remember(`!${hit.b.k} ${hit.rest}`);
    go(hit.rest ? hit.b.tpl.replace('%s', () => encodeURIComponent(hit.rest)) : hit.b.url);
  } else { remember(q); defaultSearch(q); }
  if (s.search.newTab) { const input = $('[data-search] input'); setBang(null); if (input) input.value = ''; }
}
function go(url) {
  if (!/^https?:\/\//i.test(url)) return;
  s.search.newTab ? window.open(url, '_blank', 'noopener') : (location.href = url);
}
function closeSugg() {
  clearTimeout(sg.timer); sg.ctl?.abort(); sg.seq++; sg.opts = []; sg.on = -1; sg.words = [];
  const box = $('.sugg'); if (!box) return;
  box.hidden = true;
  const input = box.parentNode.q; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant');
}
function openOption(i) {
  const o = sg.opts[i]; if (!o) return;
  if (o.bang) return useBang(o.bang);
  closeSugg();
  if (o.url) return go(o.url);
  $('[data-search] input').value = o.q; runSearch(o.q);
}
function siteMatches(q) {
  const seen = new Set();
  return [...s.favs, ...allLinks()].filter((x) => {
    if (seen.has(x.url)) return false; seen.add(x.url);
    return [...x.name.toLowerCase().split(/[\s›·/]+/), domain(x.url).toLowerCase(), ...domain(x.url).toLowerCase().split('.').slice(0, -1)].some((w) => w.startsWith(q));
  }).slice(0, 2);
}
function optionsFor(q) {
  if (sg.bang) return [];
  if (/^!\w*$/.test(q)) {
    const k = q.slice(1), starts = (b) => b.k.startsWith(k) || b.name.toLowerCase().startsWith(k);
    return BANGS.filter(starts).sort((a, b) => (b.k === k) - (a.k === k)).map((bang) => ({ bang }));
  }
  if (!q) return recent().slice(0, 5).map((r) => ({ q: r, past: true }));
  const past = recent().filter((r) => r.toLowerCase() !== q && r.toLowerCase().includes(q)).slice(0, 2), used = new Set([q, ...past.map((r) => r.toLowerCase())]);
  return [...past.map((r) => ({ q: r, past: true })), ...siteMatches(q), ...sg.words.filter((w) => !used.has(w.toLowerCase())).map((w) => ({ q: w }))];
}
function optionBody(o, q) {
  if (o.bang) return `${icon(o.bang)}<span class="sg-t">${esc(o.bang.name)}</span><code class="sg-u">!${o.bang.k}</code>`;
  if (o.url) return `${icon(o)}<span class="sg-t">${esc(o.name)}</span><span class="sg-u">${esc(domain(o.url))}</span>`;
  const text = q && o.q.toLowerCase().startsWith(q) ? `<span class="typed">${esc(o.q.slice(0, q.length))}</span>${esc(o.q.slice(q.length))}` : esc(o.q);
  return `${o.past ? MARK.clock : ICON.search}<span class="sg-t">${text}</span>${o.past ? `<span class="forget" data-forget="${esc(o.q)}" aria-hidden="true">${MARK.x}</span>` : ''}`;
}
function drawSugg() {
  const box = $('.sugg'); if (!box) return;
  const q = sg.typed.toLowerCase(), keep = sg.opts[sg.on], all = optionsFor(q);
  // The first time you type, ask before anything you type leaves the browser.
  const ask = s.search.online == null && !!q && !sg.bang && !q.startsWith('!'), askH = ask ? 78 : 0;
  // Open toward the side with more room, and only as many rows as fit in it.
  const r = box.parentNode.getBoundingClientRect(), below = innerHeight - r.bottom - 22, above = r.top - 22;
  const up = below < Math.min(all.length, 6) * 34 + 12 + askH && above > below;
  sg.opts = all.slice(0, Math.max(1, Math.min(7, Math.floor(((up ? above : below) - 12 - askH) / 34))));
  sg.on = keep ? sg.opts.findIndex((o) => (keep.url ? o.url === keep.url : keep.bang ? o.bang === keep.bang : o.q === keep.q)) : -1;
  box.classList.toggle('up', up);
  box.firstElementChild.innerHTML = sg.opts.map((o, i) => `<div class="opt" id="opt${i}" role="option" data-opt="${i}" aria-selected="${i === sg.on}">${optionBody(o, q)}</div>`).join('');
  const askBox = box.lastElementChild;
  askBox.hidden = !ask;
  askBox.innerHTML = ask ? '<p>Show suggestions as you type? This sends what you type to DuckDuckGo.</p><button type="button" class="link" data-act="online-yes">Turn on</button><button type="button" class="link mute" data-act="online-no">No thanks</button>' : '';
  box.hidden = !sg.opts.length && !ask;
  box.parentNode.q.setAttribute('aria-expanded', !!sg.opts.length);
  markOption();
}
function markOption() {
  $$('.opt').forEach((el, i) => el.setAttribute('aria-selected', i === sg.on));
  const input = $('[data-search] input'); if (!input) return;
  sg.on >= 0 ? input.setAttribute('aria-activedescendant', 'opt' + sg.on) : input.removeAttribute('aria-activedescendant');
}
function suggest(value) {
  const q = value.trim(), seq = ++sg.seq;
  clearTimeout(sg.timer); sg.ctl?.abort();
  sg.typed = q; sg.on = -1; sg.words = q ? sg.words.filter((w) => w.toLowerCase().startsWith(q.toLowerCase())) : [];
  drawSugg();
  if (s.search.online !== true || DEMO || sg.bang || q.length < 2 || /^!|\s!\w*$|:\/\/|@/.test(q)) return;
  sg.timer = setTimeout(async () => {
    sg.ctl = new AbortController();
    try {
      if (!(await hasOnline()) || seq !== sg.seq) return;
      const r = await fetch(suggestUrl(q), { signal: sg.ctl.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
      if (!r.ok) throw new Error(r.status);
      const data = await r.json();
      if (seq !== sg.seq) return; // a newer keystroke owns the list
      sg.words = (data[1] || []).filter((w) => typeof w === 'string').slice(0, 7); drawSugg();
    } catch (e) { if (e.name !== 'AbortError') console.warn('Search suggestions unavailable', e); }
  }, 150);
}
async function setOnline(on) {
  // allowOnline must run straight from the click: Chrome only asks for permission during a user gesture.
  const ok = on ? await allowOnline() : false;
  if (!on) dropOnline();
  s.search.online = ok; save();
  if ($('.win')) return renderSection();
  const input = $('[data-search] input'); if (!input) return;
  input.focus(); suggest(input.value);
}
document.addEventListener('focusin', (e) => { if (e.target.matches?.('[data-search] input') && e.target.value) suggest(e.target.value); });
document.addEventListener('focusout', (e) => { if (e.target.closest?.('[data-search]') && !e.relatedTarget?.closest?.('[data-search]')) closeSugg(); });
// Keep focus in the field while an option is clicked.
document.addEventListener('mousedown', (e) => { if (e.target.closest?.('.sugg')) e.preventDefault(); });

/* ---------- Tooltips ----------
   Dock and strip tiles carry their own .tip. Anything with data-tip shares this one; the browser's
   own title tooltips can't be styled, so they aren't used. */
let tipFor = null;
function hideTip() { tipFor = null; const t = $('#tip'); if (t) t.hidden = true; }
function showTip(el) {
  if (el === tipFor) return;
  if (!el?.dataset.tip) return hideTip();
  // Editorial already prints each name; a tooltip there only helps when the name is cut off.
  const name = el.closest('.fgrid') && el.querySelector(':scope > span:last-child');
  if (name && name.scrollWidth <= name.clientWidth) return hideTip();
  let t = $('#tip');
  if (!t) { t = document.createElement('div'); t.id = 'tip'; t.setAttribute('aria-hidden', 'true'); document.body.append(t); }
  tipFor = el; t.textContent = el.dataset.tip; t.hidden = false;
  const r = el.getBoundingClientRect(), w = t.offsetWidth, h = t.offsetHeight;
  t.style.left = Math.max(6, Math.min(innerWidth - w - 6, r.left + r.width / 2 - w / 2)) + 'px';
  t.style.top = (r.bottom + 6 + h < innerHeight ? r.bottom + 6 : r.top - 6 - h) + 'px';
}
document.addEventListener('pointerover', (e) => showTip(e.target.closest?.('[data-tip]')));
document.addEventListener('pointerdown', hideTip);
document.addEventListener('scroll', hideTip, true);
document.addEventListener('focusin', (e) => showTip(e.target.matches?.(':focus-visible') ? e.target.closest('[data-tip]') : null));
document.addEventListener('pointerout', (e) => { if (!e.relatedTarget) hideTip(); });

/* ---------- Events ---------- */
document.addEventListener('click', (e) => {
  const mp = $('.more-pop:not([hidden])'); if (mp && !e.target.closest('.more, .more-pop')) { mp.hidden = true; $('.more')?.setAttribute('aria-expanded', 'false'); }
  const sf = e.target.closest('[data-search]');
  const fg = e.target.closest('[data-forget]');
  if (fg) return forget(fg.dataset.forget);
  const op = e.target.closest('[data-opt]');
  if (op) return openOption(+op.dataset.opt);
  if (sf && !e.target.closest('.sugg, .bang')) {
    if (e.target.tagName !== 'INPUT') sf.q.focus();
    if (!sf.q.value) suggest(''); // click, not focus: an auto-focused new tab shouldn't open a list
  }
  const el = e.target.closest('[data-act],[data-sec],[data-set],[data-tog],[data-bgtab],[data-pick],[data-show],[data-rm],[data-uchip],[data-wchip],[data-scrim],[data-color],[data-unsave],[data-coll],[data-place]');
  if (!el) return;
  if (el.dataset.unsave) { e.stopPropagation(); s.bg.saved = s.bg.saved.filter((c) => c !== el.dataset.unsave); save(); return renderSection(); }
  if (el.dataset.color) { setColor(el.dataset.color); return save(); }
  if (el.dataset.scrim) { if (e.target === el) el.dataset.scrim === 'dialog' ? closeDialog() : closeLayer(); return; }
  const d = el.dataset;
  if (d.rm != null) { e.stopPropagation(); removePhoto(+d.rm); return renderSection(); }
  if (d.show != null) { s.bg.cur = +d.show; s.bg.at = Date.now(); photoSetChanged(); return renderSection(); }
  if (d.pick) { togglePhoto(JSON.parse(d.pick)); return renderSection(); }
  if (d.bgtab) { ui.bgTab = d.bgtab; ui.coll = null; return renderSection(); }
  if (d.coll != null) { ui.coll = d.coll || null; return renderSection(); }
  if (d.place) { s.weather.place = JSON.parse(d.place); ui.places = null; save(); render(); renderSection(); return refreshWeather(true); }
  if (d.uchip) { ui.uq = d.uchip; ui.results = null; const f = $('[data-usearch] input'); if (f) f.value = d.uchip; syncChips('data-uchip', ui.uq); return fillUnsplash(true); }
  if (d.wchip) { ui.wq = d.wchip; ui.wres = null; const f = $('[data-wsearch] input'); if (f) f.value = d.wchip; syncChips('data-wchip', ui.wq); return fillWallhaven(true); }
  if (d.sec) { ui.sec = d.sec; ui.fedit = null; ui.ferr = ''; return renderSection(); }
  if (d.set) {
    set(d.set, JSON.parse(d.val));
    if (d.set === 'bg.mode' && d.val === '"photo"' && !s.bg.photos.length) ui.bgTab = 'collections';
    if (d.set === 'bg.mode') prepareNext();
    const sg = el.closest('.seg'); if (sg) moveSeg(sg, el);
    save(); render(); applyBg(); return settle();
  }
  if (d.tog) {
    if (d.tog === 'search.online') return setOnline(s.search.online !== true);
    if (d.tog === 'search.remember' && s.search.remember) try { localStorage.removeItem(RECENT_KEY); } catch (err) { /* storage blocked */ }
    set(d.tog, !get(d.tog)); el.classList.toggle('on', !!get(d.tog)); el.setAttribute('aria-checked', !!get(d.tog));
    if (d.tog === 'weather.show') refreshWeather();
    save(); render(); applyBg(); return settle();
  }
  const i = +d.i;
  switch (d.act) {
    case 'settings': return openSettings();
    case 'online-yes': return setOnline(true);
    case 'online-no': return setOnline(false);
    case 'bang-off': setBang(null); return $('[data-search] input').focus();
    case 'clear-recent': writeRecent([]); return renderSection();
    case 'coll-all': {
      const c = COLLECTIONS.find((x) => x.id === ui.coll); if (!c) return;
      searchColl(c).then((list) => {
        const b = s.bg, room = MAX_PHOTOS - b.photos.length, add = list.filter((p) => !b.photos.some((x) => x.id === p.id)).slice(0, room);
        if (!add.length) return toast(room ? 'These are all in your set already.' : `Your set has ${MAX_PHOTOS} photos. Remove some to add more.`);
        b.photos.push(...add); if (b.photos.length === add.length) { b.cur = 0; b.at = Date.now(); }
        photoSetChanged(); renderSection(); toast(`Added ${add.length} from ${c.name}.`);
      }).catch(() => toast('Unable to load this collection.'));
      return;
    }
    case 'close': return $('[data-scrim=dialog]') ? closeDialog() : closeLayer();
    case 'notes': s.notes.open = !s.notes.open; save(); ui.notesEnter = s.notes.open; render(); ui.notesEnter = false; if (s.notes.open) { const all = $$('.notes textarea'); if (all.length) focusNote(+all.at(-1).dataset.note, true); } else $('[data-act=notes]')?.focus(); return;
    case 'add': e.preventDefault(); return editFav(-1);
    case 'fcancel': ui.fedit = null; ui.ferr = ''; renderSection(); return $('.win [data-act=add]')?.focus();
    case 'icon-reset': ui.ficon = null; return previewIcon();
    case 'upload': return $('#upfile')?.click();
    case 'more': { const pop = el.nextElementSibling, open = pop.hidden; pop.hidden = !open; el.setAttribute('aria-expanded', open); if (open) pop.querySelector('a')?.focus(); return; }
    case 'retry-wallhaven': return fillWallhaven(true);
    case 'edit': e.preventDefault(); return editFav(i);
    case 'remove': if ($('[data-scrim=dialog]')) closeDialog(); return removeFav(i);
    case 'ntab': ui.notesTab = d.val; render(); return $(`[data-act=ntab][data-val=${d.val}]`)?.focus();
    case 'twist': { const it = s.notes.items[i]; it.o = !it.o; save(); render(); return $(`[data-act=twist][data-i="${i}"]`)?.focus(); }
    case 'tfill': s.notes.items.splice(i + 1, 0, { t: '', d: false, k: false, c: true }); save(); render(); return focusNote(i + 1);
    case 'clear-done': {
      const kept = s.notes.items.filter((x) => !(x.k && x.d)), gone = s.notes.items.length - kept.length;
      if (!gone) return;
      const before = s.notes.items; s.notes.items = kept.length ? kept : [{ t: '', d: false, k: false }]; changed();
      return toast(`${count(gone, 'completed task', 'completed tasks')} cleared`, () => { s.notes.items = before; changed(); });
    }
    case 'next-photo': showNext(); return renderSection();
    case 'move': {
      const to = i + +d.dir; if (to < 0 || to >= s.favs.length) return;
      const [f] = s.favs.splice(i, 1); s.favs.splice(to, 0, f); changed();
      return $(`[data-act=move][data-i="${to}"][data-dir="${d.dir}"]`)?.focus() || $(`[data-act=move][data-i="${to}"]`)?.focus();
    }
    case 'retry-unsplash': return fillUnsplash(true);
    case 'save-color': {
      const c = s.bg.color; if (saveState(c).disabled) return;
      s.bg.saved = [c, ...s.bg.saved]; save(); return renderSection();
    }
  }
});
// A note line switches from its rendered copy to raw text while you edit it.
document.addEventListener('focusin', (e) => { if (e.target.dataset?.note != null) grow(e.target); });
document.addEventListener('focusout', (e) => {
  const t = e.target; if (t.dataset?.note == null) return;
  t.style.height = '';
  if (!t.isConnected || !t.value) return;
  // Chips are built when you leave the line, so half-typed addresses never go to a favicon service.
  const view = t.previousElementSibling, h = md(t.value);
  view.innerHTML = h; h.includes('class="chip') ? view.removeAttribute('aria-hidden') : view.setAttribute('aria-hidden', 'true');
  const tab = $('[data-act=ntab][data-val=links]'), n = allLinks().length;
  if (tab) tab.textContent = n ? `Links ${n}` : 'Links';
});
document.addEventListener('paste', (e) => {
  const t = e.target; if (t.dataset?.note == null) return;
  const url = e.clipboardData.getData('text/plain').trim();
  if (!/^https?:\/\/\S+$/i.test(url)) return;
  const i = +t.dataset.note, items = s.notes.items, it = items[i];
  const a = t.selectionStart, b = t.selectionEnd, picked = t.value.slice(a, b);
  if (picked && !/https?:|[\[\]\n]/i.test(picked)) { // paste over words to link them
    e.preventDefault(); t.setRangeText(`[${picked}](${url})`, a, b, 'end');
    return t.dispatchEvent(new Event('input', { bubbles: true }));
  }
  if (t.value.slice(0, a).trim() || t.value.slice(b).trim() || it.g) return;
  // A link alone on its line becomes a chip right away, with the caret on the next line.
  e.preventDefault(); it.t = url;
  const next = items[i + 1];
  if (!next || next.t || next.k || next.g || !!next.c !== !!it.c) items.splice(i + 1, 0, { t: '', d: false, k: false, c: !!it.c });
  save(); render(); focusNote(i + 1);
});
document.addEventListener('contextmenu', (e) => {
  const a = e.target.closest('a[data-i]');
  if (a) { e.preventDefault(); editFav(+a.dataset.i); }
});
document.addEventListener('submit', (e) => {
  e.preventDefault();
  const f = e.target;
  if (f.matches('[data-search]')) {
    if (sg.on >= 0) return openOption(sg.on);
    const q = f.q.value.trim();
    if (!sg.bang && /^!\w*$/.test(q) && sg.opts[0]?.bang) return useBang(sg.opts[0].bang);
    closeSugg(); runSearch(q);
  } else if (f.matches('[data-favrow]')) { saveFav(f);
  } else if (f.matches('[data-usearch]')) { clearTimeout(ui.typing); ui.uq = f.q.value.trim(); ui.results = null; syncChips('data-uchip', ui.uq); fillUnsplash(true); }
  else if (f.matches('[data-place-q]')) {
    const q = f.q.value.trim(); if (q.length < 2) return;
    ui.places = 'loading'; renderSection();
    findPlace(q).then((list) => { ui.places = list || 'error'; renderSection(); });
  }
  else if (f.matches('[data-wsearch]')) { clearTimeout(ui.typing); ui.wq = f.q.value.trim(); ui.wres = null; syncChips('data-wchip', ui.wq); fillWallhaven(true); }
});
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.sel) { set(t.dataset.sel, typeof get(t.dataset.sel) === 'number' ? +t.value : t.value); changed(); }
  if (t.dataset.noteChk != null) { s.notes.items[+t.dataset.noteChk].d = t.checked; save(); setTimeout(render, 180); }
  if (t.dataset.file != null) handleFiles(t.files);
  if (t.dataset.ficon != null) { pickIcon(t.files[0]); t.value = ''; }
  if (t.dataset.range) save();
  if (t.dataset.hex != null) {
    // Leaving the field with an invalid code restores the current color and says why.
    if (!normHex(t.value)) {
      t.value = s.bg.color.slice(1).toUpperCase(); $('.hexbox')?.classList.add('bad');
      const h = $('[data-hint]'); if (h) { h.textContent = 'Use a 3 or 6 digit hex code, like 1F2A24.'; h.classList.add('bad'); }
      setTimeout(() => { $('.hexbox')?.classList.remove('bad'); const h2 = $('[data-hint].bad'); if (h2) { h2.classList.remove('bad'); h2.textContent = saveState(s.bg.color).hint; } }, 2600);
    }
  }
});
document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.form?.matches('[data-search]') && !e.isComposing) {
    const m = !sg.bang && t.value.match(/^!(\w+)\s(.*)$/), b = m && findBang(m[1]);
    if (b) useBang(b, m[2]); else suggest(t.value);
  }
  if (t.dataset.note != null) {
    const it = s.notes.items[+t.dataset.note];
    let m = null;
    if (!it.k && !it.g) {
      if (!it.h && (m = t.value.match(/^\s*(?:-\s*)?\[\s?[xX]?\]\s/))) { it.k = true; it.d = /x/i.test(m[0]); }
      else if (!it.c && (m = t.value.match(/^>\s/))) { it.g = true; it.o = true; }
    }
    if (!m && !it.k && !it.h && (m = t.value.match(/^#{1,3}\s/))) it.h = true;
    if (m) { it.t = t.value.slice(m[0].length); save(); render(); return focusNote(+t.dataset.note); }
    it.t = t.value; save(false); grow(t);
  }
  if (t.form?.matches('[data-usearch], [data-wsearch]')) {
    // Search as you type: wait for a pause, and skip one- and two-letter words. Enter still searches at once.
    clearTimeout(ui.typing); const f = t.form, q = t.value.trim();
    if (q.length >= 3) ui.typing = setTimeout(() => { if (f.isConnected) f.requestSubmit(); }, 500);
  }
  if (t.name === 'url' && t.form?.dataset.favrow != null) { t.form.name.placeholder = autoName(t.value.trim()) || 'Name'; if ($('#ferr')) { $('#ferr').remove(); t.removeAttribute('aria-invalid'); } }
  if (t.dataset.range) {
    set(t.dataset.range, +t.value);
    t.parentNode.style.setProperty('--v', (t.value - t.min) / (t.max - t.min));
    t.setAttribute('aria-valuetext', pct(+t.value));
    const val = t.parentNode.querySelector('.sld-val'); if (val && !val.firstElementChild) val.textContent = pct(+t.value);
    html.style.setProperty(t.dataset.range === 'bg.frost' ? '--frost' : '--dim', t.value);
  }
  if (t.dataset.hex != null) { const h = normHex(t.value); if (h) setColor(h, 'hex'); }
  if (t.dataset.picker != null) setColor(t.value.toLowerCase(), 'picker');
});
document.addEventListener('keydown', (e) => {
  const t = e.target, typing = !!t.matches?.('input, textarea, select');
  if (t.dataset && t.dataset.hex != null && e.key === 'Enter') { t.blur(); return; }
  if (t.classList?.contains('sld-in') && e.key === 'Enter') { e.preventDefault(); editSlider(t.parentNode); return; }
  if (t.dataset && t.dataset.note != null) {
    const i = +t.dataset.note, items = s.notes.items, it = items[i];
    // Neighbours in on-screen order (done tasks may be sorted to the bottom).
    const lines = $$('.notes textarea'), pos = lines.indexOf(t), prev = lines[pos - 1], next = lines[pos + 1];
    const atStart = t.selectionStart === 0 && t.selectionEnd === 0, atEnd = t.selectionStart === t.value.length;
    const redo = (at, pos) => { save(); render(); return focusNote(at, pos); };
    if (e.key === 'Tab') { // only taken when the line can move in or out, so Tab still leaves the notepad
      if (e.shiftKey && it.c) { e.preventDefault(); return redo(outdent(i), true); }
      if (!e.shiftKey && !it.c && !it.g && (items[i - 1]?.g || items[i - 1]?.c)) {
        e.preventDefault(); it.c = true;
        let p = i - 1; while (items[p].c) p--;
        items[p].o = true; return redo(i, true);
      }
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { // Shift+Enter is a line break inside the same note
      e.preventDefault();
      if (!it.t && (it.k || (it.h && !it.g))) { it.k = it.h = false; return redo(i); } // Enter on an empty task or heading clears its type
      if (!it.t && it.c) return redo(outdent(i)); // Enter on an empty line leaves the toggle
      if (it.t && atStart && (it.g || it.h)) { items.splice(i, 0, { t: '', d: false, k: false, c: !!it.c }); return redo(i + 1); }
      const tail = t.value.slice(t.selectionEnd); it.t = t.value.slice(0, t.selectionStart); // Enter splits at the caret
      const at = it.g && !it.o ? groupEnd(i) : i + 1;
      items.splice(at, 0, { t: tail, d: false, k: !!it.k, c: it.g ? !!it.o : !!it.c }); return redo(at);
    }
    if (e.key === 'Backspace' && atStart && (it.k || it.g || it.h)) {
      e.preventDefault();
      if (it.g) for (let x = i + 1, end = groupEnd(i); x < end; x++) items[x].c = false;
      it.k = it.d = it.g = it.h = false; return redo(i);
    }
    if (e.key === 'Backspace' && atStart && prev) { // join this line onto the one above
      e.preventDefault(); const j = +prev.dataset.note, p = items[j].t.length;
      items[j].t += it.t; items.splice(i, 1); save(); render(); return focusNote(j < i ? j : j - 1, p);
    }
    if (e.key === 'ArrowUp' && atStart && prev) { e.preventDefault(); return focusNote(+prev.dataset.note, true); }
    if (e.key === 'ArrowDown' && atEnd && next) { e.preventDefault(); return focusNote(+next.dataset.note, 0); }
  }
  if (t.matches?.('[data-search] input') && !e.isComposing) {
    if (e.key === 'Backspace' && sg.bang && t.selectionStart === 0 && t.selectionEnd === 0) { e.preventDefault(); setBang(null); return; }
    if (e.key === 'Tab' && !e.shiftKey && sg.opts[0]?.bang) { e.preventDefault(); return useBang(sg.opts[Math.max(0, sg.on)].bang); }
    if (e.key === 'Delete' && e.shiftKey && sg.opts[sg.on]?.past) { e.preventDefault(); return forget(sg.opts[sg.on].q); }
    if (e.key === 'ArrowDown' && !sg.opts.length && !t.value) suggest('');
    if (e.key === 'Escape' && !$('.sugg').hidden) { e.preventDefault(); return closeSugg(); }
  }
  if (t.matches?.('[data-search] input') && sg.opts.length && !e.isComposing) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); const n = sg.opts.length + 1; // the extra stop is the typed text itself
      sg.on = (sg.on + 1 + (e.key === 'ArrowDown' ? 1 : -1) + n) % n - 1;
      return markOption();
    }
  }
  if (e.key === 'Escape') {
    if (t.closest?.('[data-favrow]')) { ui.fedit = null; ui.ferr = ''; renderSection(); return $('.win [data-act=add]')?.focus(); }
    if ($('[data-scrim=dialog]')) return closeDialog();
    if (!$('#layer').innerHTML && $('#toasts').textContent) { $('#toasts').textContent = ''; return; }
    if ($('#layer').innerHTML) return closeLayer();
    if (s.notes.open) { s.notes.open = false; save(); render(); }
    return;
  }
  if (e.key === 'Tab' && $('#layer').innerHTML) {
    const box = $('#layer .win, #layer .dlg'), f = [...box.querySelectorAll('button:not([disabled]), input, select, [href]')].filter((x) => !x.closest('[inert]') && x.offsetParent);
    if (f.length && e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
    else if (f.length && !e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
  }
  if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === ',') { e.preventDefault(); openSettings(null, true); }
  if (e.key === '/') { const q = $('[data-search] input'); if (q) { e.preventDefault(); q.focus(); } }
});

/* Drag to reorder favorites (settings) and drop to upload */
document.addEventListener('dragstart', (e) => { const r = e.target.closest?.('[data-drag]'); if (r) { ui.drag = +r.dataset.drag; r.classList.add('dragging'); } });
document.addEventListener('dragover', (e) => {
  if (e.target.closest('[data-drag]') && ui.drag != null) e.preventDefault();
  const drop = e.target.closest('[data-drop]'); if (drop) { e.preventDefault(); drop.classList.add('over'); }
});
document.addEventListener('dragleave', (e) => e.target.closest?.('[data-drop]')?.classList.remove('over'));
document.addEventListener('drop', (e) => {
  const r = e.target.closest('[data-drag]');
  if (r && ui.drag != null) {
    e.preventDefault(); const to = +r.dataset.drag, [f] = s.favs.splice(ui.drag, 1); s.favs.splice(to, 0, f); ui.drag = null; changed(); return;
  }
  if (e.target.closest('[data-drop]')) { e.preventDefault(); handleFiles(e.dataTransfer.files); }
});
document.addEventListener('dragend', () => { ui.drag = null; document.querySelector('.dragging')?.classList.remove('dragging'); });
async function handleFiles(files) {
  const free = MAX_PHOTOS - s.bg.photos.length, list = [...files].filter((f) => f.type.startsWith('image/')).slice(0, free);
  if (!list.length) return;
  toast(`Adding ${count(list.length, 'photo', 'photos')}…`);
  for (const file of list) { try { togglePhoto(await fromUpload(file)); } catch (e) { toast(`Unable to read ${file.name}. Use a JPG, PNG or WebP image.`); } }
  ui.bgTab = 'mine'; renderSection();
}

/* ---------- Start ---------- */
/* Slider drag. Press anywhere on the bar to jump there and drag. Press on the value and
   release without moving to type a number instead. Past either end the bar stretches up
   to ~10px (eased, so it resists more the further you pull) and springs back on release. */
let sl = null;
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
function slideTo(x) {
  const { el, inp, r } = sl, min = +inp.min, max = +inp.max, raw = (x - r.left) / r.width;
  const next = String(min + Math.min(1, Math.max(0, raw)) * (max - min));
  const before = inp.value; inp.value = next; // the input snaps to its step
  if (inp.value !== before) inp.dispatchEvent(new Event('input', { bubbles: true }));
  const over = raw < 0 ? -raw * r.width : raw > 1 ? (raw - 1) * r.width : 0;
  const d = 10 * (1 - Math.exp(-over / 60));
  el.style.transformOrigin = raw < 0 ? 'right center' : 'left center';
  el.style.transform = over && !still() ? `scaleX(${1 + d / r.width})` : '';
}
document.addEventListener('pointerdown', (e) => {
  const el = e.target.closest?.('.sld');
  if (!el || e.button !== 0 || e.target.closest('.sld-edit')) return;
  e.preventDefault();
  sl = { el, inp: el.querySelector('.sld-in'), r: el.getBoundingClientRect(), x0: e.clientX, moved: false, onVal: !!e.target.closest('.sld-val') };
  el.setPointerCapture(e.pointerId);
  sl.inp.focus({ preventScroll: true, focusVisible: false });
  if (!sl.onVal) slideTo(e.clientX);
});
document.addEventListener('pointermove', (e) => {
  if (!sl) return;
  if (!sl.moved) { if (Math.abs(e.clientX - sl.x0) < 3) return; sl.moved = true; sl.el.classList.add('drag'); }
  slideTo(e.clientX);
});
function slideEnd() {
  if (!sl) return;
  const { el, inp, moved, onVal } = sl; sl = null;
  el.classList.remove('drag'); el.style.transform = '';
  inp.dispatchEvent(new Event('change', { bubbles: true }));
  if (!moved && onVal) editSlider(el);
}
document.addEventListener('pointerup', slideEnd);
document.addEventListener('pointercancel', slideEnd);
function editSlider(el) {
  const inp = el.querySelector('.sld-in'), val = el.querySelector('.sld-val');
  if (val.firstElementChild) return;
  const box = document.createElement('input');
  box.className = 'sld-edit'; box.inputMode = 'numeric'; box.value = Math.round(inp.value * 100);
  box.setAttribute('aria-label', `${inp.getAttribute('aria-label')}, percent`);
  val.textContent = ''; val.append(box); box.focus(); box.select();
  let done = false;
  const finish = (keep, byKey) => {
    if (done) return; done = true;
    const n = parseFloat(box.value);
    if (keep && !isNaN(n)) inp.value = String(Math.min(+inp.max, Math.max(+inp.min, n / 100)));
    box.remove();
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    inp.dispatchEvent(new Event('change', { bubbles: true }));
    inp.focus({ preventScroll: true, focusVisible: !!byKey });
  };
  box.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); finish(true, true); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false, true); }
  });
  box.addEventListener('blur', () => finish(true));
}

render();
applyBg().then(() => { booted = true; });
if (window.__lumenAfter) setTimeout(window.__lumenAfter, 60);
if (s.search.focus) $('[data-search] input')?.focus();
(window.requestIdleCallback || setTimeout)(() => { prepareNext(); refreshWeather(); });
