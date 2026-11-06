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
  search: { engine: 'google', show: true, newTab: false, focus: false },
  notes: { show: true, open: false, done: 'bottom', items: [
    { t: 'Ideas for the onboarding tab', d: false }, { t: 'Export the v0.9 screens', d: false, k: true }, { t: 'Check Unsplash guidelines', d: true, k: true }, { t: '', d: false },
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

const ENGINES = {
  google: ['Google', 'https://www.google.com/search?q='],
  duckduckgo: ['DuckDuckGo', 'https://duckduckgo.com/?q='],
  bing: ['Bing', 'https://www.bing.com/search?q='],
  kagi: ['Kagi', 'https://kagi.com/search?q='],
  perplexity: ['Perplexity', 'https://www.perplexity.ai/search?q='],
};
const CITIES = [
  ['Kolkata', 'Asia/Kolkata'], ['Sydney', 'Australia/Sydney'], ['London', 'Europe/London'], ['Berlin', 'Europe/Berlin'],
  ['New York', 'America/New_York'], ['Toronto', 'America/Toronto'], ['San Francisco', 'America/Los_Angeles'],
  ['São Paulo', 'America/Sao_Paulo'], ['Dubai', 'Asia/Dubai'], ['Singapore', 'Asia/Singapore'],
  ['Tokyo', 'Asia/Tokyo'], ['Auckland', 'Pacific/Auckland'],
];
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
  Search: lucide('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'),
  Notes: lucide('<path d="M8 2v4"/><path d="M12 2v4"/><path d="M16 2v4"/><rect width="16" height="18" x="4" y="4" rx="2"/><path d="M8 10h6"/><path d="M8 14h8"/><path d="M8 18h5"/>'),
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
function icon(f) {
  const dom = domain(f.url);
  return `<span class="ico" style="background:hsl(${hue(dom)} 42% 42%)"><b>${esc((f.name || dom)[0].toUpperCase())}</b><img data-fav alt="" src="${window.LUMEN_FAVICON ? window.LUMEN_FAVICON(dom) : `https://www.google.com/s2/favicons?domain=${encodeURIComponent(dom)}&sz=64`}"></span>`;
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
  const per = 42, fit = Math.max(0, Math.floor((avail + 2) / per));
  if (fit >= tiles.length) return;
  const shown = Math.max(0, fit - 1);
  tiles.forEach((t, k) => (t.hidden = k >= shown));
  more.hidden = false; more.querySelector('.n').textContent = shown ? `+${tiles.length - shown}` : '★';
  more.setAttribute('aria-label', `${tiles.length - shown} more favorites`);
  pop.innerHTML = s.favs.slice(shown).map((f, k) => `<a class="mrow" href="${esc(f.url)}"${target()} data-i="${shown + k}">${icon(f)}<span>${esc(f.name)}</span></a>`).join('');
}
let fitT; addEventListener('resize', () => { clearTimeout(fitT); fitT = setTimeout(fitStrip, 60); });

/* ---------- Main render ---------- */
function searchForm() {
  if (!s.search.show) return '';
  return `<form class="search" data-search role="search"><span aria-hidden="true">${ICON.search}</span><input name="q" type="search" placeholder="Search with ${ENGINES[s.search.engine][0]}" autocomplete="off" aria-label="Search"><span class="bar" aria-hidden="true"></span></form>`;
}
function mast() {
  // Small clock: the time moves up next to the date and the big clock goes away.
  const small = s.clock.show === 'small' && s.layout !== 'strip';
  return `<header class="mast"><div class="date">${small ? '<span class="mtime"><span data-clock></span> <span data-ampm></span></span>' : ''}<span data-date></span></div><div class="mast-r">
    ${s.clock.zone2 ? `<div class="pill"><i class="dot" data-dot aria-hidden="true"></i><span>${esc(CITIES.find((c) => c[1] === s.clock.tz)?.[0] || s.clock.tz)}</span><span data-z2></span><span class="mute" data-diff></span></div>` : ''}
    ${s.notes.show ? `<button class="ibtn${s.notes.open ? ' on' : ''}" data-act="notes" aria-expanded="${s.notes.open}" aria-label="Notes" title="Notes">${ICON.notes}</button>` : ''}
    <button class="ibtn" data-act="settings" aria-label="Settings" title="Settings  ( , )">${ICON.sliders}</button></div></header>`;
}
const bigClock = () => (s.clock.show === 'large' ? `<div class="time ff-${s.clock.font}"><span data-clock></span><span class="ampm" data-ampm></span></div>` : '');
function mainView() {
  if (s.layout === 'dock') {
    return `<main class="dk">${bigClock()}${searchForm()}</main>
      <div class="dock-zone"><nav class="dock${s.dock.rows === 2 && s.favs.length >= 4 ? ' two' : ''}" aria-label="Favorites" style="--n:${Math.max(1, s.favs.length)};--c:${Math.ceil(Math.max(1, s.favs.length) / (s.dock.rows === 2 && s.favs.length >= 4 ? 2 : 1))}">${s.favs.map(tile).join('')}${addTile()}${gapTile()}</nav></div>`;
  }
  if (s.layout === 'strip') {
    return `<main class="st"><div class="sclock">${s.clock.show === 'off' ? '' : '<span class="stime"><span data-clock></span><span class="ampm" data-ampm></span></span>'}<span class="mute" data-date></span></div>
      ${searchForm() || '<div style="flex:1"></div>'}<nav class="favs" aria-label="Favorites">${s.favs.map(tile).join('')}${addTile()}${s.favs.length ? '<button class="tile more" data-act="more" aria-expanded="false" aria-label="More favorites" hidden><span class="n"></span></button><div class="more-pop" hidden></div>' : ''}</nav></main>`;
  }
  return `<main class="ed"><section class="hero">${bigClock()}</section>
    <section class="side">${searchForm()}
      <div class="fgrid">${s.favs.map((f, i) => `<div class="fav"><a href="${esc(f.url)}"${target()} data-i="${i}" title="${esc(f.name)}">${icon(f)}<span>${esc(f.name)}</span></a><button class="edit" data-act="edit" data-i="${i}" aria-label="Edit ${esc(f.name)}">Edit</button></div>`).join('')}${s.favs.length < MAX_FAVS ? `<div class="fav ghost${s.favs.length % 2 ? '' : ' below'}${s.favs.length ? '' : ' show'}"><button data-act="add" aria-label="Add a favorite">${addMark()}<span>Add</span></button></div>` : ''}</div>
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
/* Notes: one writing surface. Each line is a note; typing [ ] at the start makes it a task, and
   Backspace at the start of a task turns it back. Lines wrap. The line you're editing shows its raw
   text; the others render Discord-style formatting: **bold**, *italic*, __underline__, ~~strike~~,
   `code`. Done tasks can sink to the bottom or hide; notes never move. */
function md(t) {
  const code = [];
  let h = esc(t).replace(/`([^`\n]+)`/g, (_, c) => `\u0000${code.push(c) - 1}\u0000`);
  h = h.replace(/\*\*(\S(?:.*?\S)?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(\S(?:.*?\S)?)__/g, '<u>$1</u>')
    .replace(/~~(\S(?:.*?\S)?)~~/g, '<s>$1</s>')
    .replace(/(^|[^*\w])\*(\S(?:.*?\S)?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/(^|[^_\w])_(\S(?:.*?\S)?)_(?!\w)/g, '$1<em>$2</em>');
  return h.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${code[i]}</code>`);
}
const grow = (ta) => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };
function notesView() {
  const n = s.notes;
  if (!n.show || !n.open) return '';
  let idx = n.items.map((_, i) => i);
  const doneT = (i) => n.items[i].k && n.items[i].d;
  if (n.done === 'bottom') idx = [...idx.filter((i) => !doneT(i)), ...idx.filter(doneT)];
  if (n.done === 'hide') idx = idx.filter((i) => !doneT(i));
  const doneCount = n.items.filter((x) => x.k && x.d).length;
  const line = (i) => {
    const it = n.items[i];
    const box = it.k ? `<input type="checkbox" class="chk" data-note-chk="${i}"${it.d ? ' checked' : ''} aria-label="${esc(it.t ? `Mark “${it.t}” as done` : 'Mark as done')}">` : '';
    // Only the first line of an empty notepad explains the shortcut; other empty lines stay blank.
    const ph = it.k ? 'Task' : n.items.length === 1 ? 'Write a note. Type [ ] for a task.' : '';
    return `<div class="note${it.k ? ' task' : ''}${it.k && it.d ? ' done' : ''}">${box}<div class="ntx"><div class="nmd" aria-hidden="true">${it.t ? md(it.t) : `<span class="nph">${ph}</span>`}</div><textarea rows="1" data-note="${i}" placeholder="${ph}" aria-label="${it.k ? 'Task' : 'Note'}">${esc(it.t)}</textarea></div></div>`;
  };
  return `<aside class="notes${ui.notesEnter ? ' pop-in' : ''}" aria-label="Notes"><div class="notes-h"><span>Notes</span><button class="link mute" data-act="notes">Close</button></div>
    ${idx.map(line).join('')}
    ${doneCount ? `<div class="notes-f"><span>${doneCount} done${n.done === 'hide' ? ' (hidden)' : ''}</span><button class="link" data-act="clear-done">Clear completed</button></div>` : ''}</aside>`;
}
function focusNote(i, at) { const el = $(`[data-note="${i}"]`); if (el) { el.focus(); const p = at === true ? el.value.length : at || 0; el.setSelectionRange(p, p); } }
function render() {
  html.dataset.layout = s.layout;
  html.dataset.dock = s.dock.pos;
  html.toggleAttribute('data-autohide', !!s.dock.autohide);
  $('#app').innerHTML = mast() + mainView() + notesView() + creditView();
  fitStrip();
  tick();
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
  return (lazyP = Promise.all([load('config.local.js')]));
}
async function searchUnsplash(q) {
  const key = window.LUMEN_UNSPLASH_KEY;
  if (key) {
    const r = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(q || 'wallpaper')}&per_page=18&orientation=landscape&content_filter=high`, { headers: { Authorization: 'Client-ID ' + key, 'Accept-Version': 'v1' } });
    if (r.status === 429 || r.headers.get('X-Ratelimit-Remaining') === '0') throw Object.assign(new Error('Unsplash limit'), { limited: true });
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

/* ---------- Settings window ---------- */
const ui = { sec: 'Layout', bgTab: 'mine', uq: '', wq: 'landscape', results: null, drag: null };
// Wallhaven is off until Unsplash approves the production key: a second, user-uploaded source could
// count against the application. The code stays; flip this to bring the tab back.
const WALLHAVEN = false;
const CLOCK_FONTS = [['serif', 'Serif'], ['sans', 'Sans'], ['pixel', 'Pixel'], ['dot', 'Dot']];
// Clock lives inside Layout (v0.9.11): its options depend on the layout, and alone it was a thin tab.
const SECTIONS = ['Layout', 'Background', 'Favorites', 'Search', 'Notes'];
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
  return `<div class="row stack${off ? ' off' : ''}"${off ? ' inert' : ''}><div class="sld" style="--v:${(v - min) / (max - min)}"><div class="sld-fill"></div><span class="sld-lbl" aria-hidden="true">${label}</span><span class="sld-val" aria-hidden="true" title="Click to type a value">${pct(v)}</span><input class="sld-in" type="range" min="${min}" max="${max}" step="${step}" value="${v}" data-range="${path}" aria-label="${label}" aria-valuetext="${pct(v)}" aria-describedby="${id}d"></div><div class="desc" id="${id}d">${desc}</div>${extra}</div>`;
}
/* Frost preview: a small dock made of real glass over two of the user's wallpapers. It reads the
   same --frost variable as the real surfaces, so it updates live while the slider moves. */
function frostPreview() {
  const b = s.bg, mine = b.photos.map((p) => p.thumb).filter(Boolean);
  const pics = [...new Set([mine[b.cur], mine[(b.cur + 1) % (mine.length || 1)], 'assets/1015-t.jpg', 'assets/1036-t.jpg'].filter(Boolean))].slice(0, 2);
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

const SECTION = {
  Layout: () => `<div class="cards">${[['dock', 'Dock'], ['editorial', 'Editorial'], ['strip', 'Strip']].map(([v, l]) => `<button class="lcard${s.layout === v ? ' on' : ''}" data-set="layout" data-val='"${v}"'>${mini(MINIS[v])}${l}</button>`).join('')}</div>
    ${s.layout === 'dock'
      ? row('Dock position', 'Which edge of the screen the dock sits on.', seg('dock.pos', [['left', 'Left'], ['bottom', 'Bottom'], ['right', 'Right']]))
        + row(s.dock.pos === 'bottom' ? 'Rows' : 'Columns', s.dock.pos === 'bottom' ? 'Two rows keep a long dock narrow.' : 'Two columns keep a long dock short.', pick('dock.rows', [[1, '1'], [2, '2']]), s.favs.length < 4)
        + row('Auto-hide dock', 'Tucks the dock into its edge until you point at it.', tog('dock.autohide'))
      : ''}
    <div class="sub">Clock</div>${SECTION.Clock()}`,
  Background: () => {
    const b = s.bg;
    let body = colorPane();
    if (b.mode === 'photo') {
      if (!PANE[ui.bgTab] || (ui.bgTab === 'wallhaven' && !WALLHAVEN)) ui.bgTab = 'mine';
      const tabs = [['mine', `My photos&nbsp;&nbsp;${b.photos.length}/${MAX_PHOTOS}`], ['unsplash', 'Unsplash'], ...(WALLHAVEN ? [['wallhaven', 'Wallhaven']] : [])];
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
    const view = (f, i) => `<div class="frow" draggable="true" data-drag="${i}"><span class="grip" aria-hidden="true">⋮⋮</span>${icon(f)}<span class="nm" title="${esc(f.name)}">${esc(f.name)}</span><span class="u">${esc(domain(f.url))}</span><span class="acts"><button class="link" data-act="move" data-i="${i}" data-dir="-1" aria-label="Move ${esc(f.name)} up"${i === 0 ? ' disabled' : ''}>↑</button><button class="link" data-act="move" data-i="${i}" data-dir="1" aria-label="Move ${esc(f.name)} down"${i === n - 1 ? ' disabled' : ''}>↓</button><button class="link" data-act="edit" data-i="${i}" aria-label="Edit ${esc(f.name)}">Edit</button><button class="link" data-act="remove" data-i="${i}" aria-label="Remove ${esc(f.name)}">Remove</button></span></div>`;
    const rows = s.favs.map((f, i) => (ui.fedit === i ? favRow(i) : view(f, i))).join('') + (ui.fedit === -1 ? favRow(-1) : '');
    const empty = !n && ui.fedit !== -1 ? '<div class="noresults"><span>No favorites yet</span><span class="desc">Add the sites you open every day. They show up on every new tab.</span></div>' : '';
    const adding = ui.fedit === -1;
    return `<div class="flist">${rows}</div>${empty}
    <div class="ffoot"><span>${full ? `${n} of ${MAX_FAVS}, the most a new tab can hold. Remove one to add another.` : `${n} of ${MAX_FAVS}${n > 1 ? ' · drag or use the arrows to reorder' : ''}`}</span>${full || adding ? '' : '<button class="btn primary" data-act="add">+ Add favorite</button>'}</div>`;
  },
  Search: () => row('Search engine', null, `<select class="sel" data-sel="search.engine" data-lbl>${Object.entries(ENGINES).map(([k, [n]]) => `<option value="${k}"${k === s.search.engine ? ' selected' : ''}>${n}</option>`).join('')}</select>`)
    + row('Show search bar', null, tog('search.show'))
    + row('Open links in a new tab', 'Applies to searches and favorites.', tog('search.newTab'))
    + row('Focus search on new tab', 'Start typing right away. Off keeps focus in the address bar.', tog('search.focus')),
  Notes: () => row('Show notes', 'Adds a Notes button to the top bar.', tog('notes.show'))
    + row('Completed tasks', 'Type [ ] at the start of a line to make it a task.', pick('notes.done', [['keep', 'Keep in place'], ['bottom', 'Move to bottom'], ['hide', 'Hide']]), !s.notes.show)
    + row('Clear completed', 'Removes every ticked task. Notes stay.', '<button class="btn" data-act="clear-done" data-lbl>Clear</button>', !s.notes.show || !s.notes.items.some((x) => x.k && x.d)),
};
function colorPane() {
  const b = s.bg, cur = b.color, preset = PRESETS.find((p) => p[1] === cur), isSaved = b.saved.includes(cur), full = b.saved.length >= MAX_SAVED;
  const sw = (c, name, removable) => `<span class="swc"><button class="sw${c === cur ? ' on' : ''}" style="--c:${c}" data-color="${c}" aria-pressed="${c === cur}" aria-label="${name || c.toUpperCase()}" title="${name ? name + '  ' : ''}${c.toUpperCase()}"></button>${removable ? `<button class="x" data-unsave="${c}" aria-label="Remove saved color ${c.toUpperCase()}">×</button>` : ''}</span>`;
  return `<div class="sub" id="lbl-presets">Presets</div><div class="swatches" role="group" aria-labelledby="lbl-presets">${PRESETS.map(([n, c]) => sw(c, n)).join('')}</div>
    <div class="sub">Custom</div>
    <div class="custom">
      <label class="sw big" style="--c:${cur}" title="Open the color picker"><input type="color" value="${cur}" data-picker aria-label="Pick a color"></label>
      <div class="hexbox"><span>#</span><input class="hex" data-hex value="${cur.slice(1).toUpperCase()}" maxlength="7" spellcheck="false" autocomplete="off" aria-label="Hex code"></div>
      <button class="btn" data-act="save-color" title="${saveState(cur).why || 'Save this color'}" ${saveState(cur).disabled ? 'disabled' : ''}>${isSaved ? 'Saved' : 'Save'}</button>
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
  if (btn) { btn.disabled = st.disabled; btn.title = st.why || 'Save this color'; btn.textContent = s.bg.saved.includes(hex) ? 'Saved' : 'Save'; }
  const hint = $('[data-hint]'); if (hint) { hint.textContent = st.hint; hint.classList.remove('bad'); }
}
/* Add or edit a favorite in place: the row itself becomes the form. URL first, because the
   name fills itself in from the address (shown live as the placeholder). */
const autoName = (url) => { const d = domain(/^[a-z]+:\/\//i.test(url) ? url : 'https://' + url).split('.'); const w = d.length > 1 ? d.at(-2) : d[0]; return w ? w[0].toUpperCase() + w.slice(1) : ''; };
function favRow(i) {
  const f = s.favs[i] || { name: '', url: '' }, err = ui.ferr || '';
  return `<form class="frow editing" data-favrow="${i}" novalidate>
    <span class="fico">${f.url ? icon(f) : `<span class="ico ghosted" aria-hidden="true">${ICON.globe}</span>`}</span>
    <input class="field" name="url" value="${esc(f.url ? domain(f.url) : '')}" placeholder="Web address, like youtube.com" aria-label="Web address" autocomplete="off" spellcheck="false" inputmode="url"${err ? ' aria-invalid="true" aria-describedby="ferr"' : ''}>
    <input class="field" name="name" value="${esc(f.name)}" placeholder="${esc(f.url ? autoName(f.url) : 'Name')}" aria-label="Name (optional)" autocomplete="off">
    <button class="btn primary">${i < 0 ? 'Add' : 'Save'}</button><button type="button" class="btn quiet" data-act="fcancel">Cancel</button>
  </form>${err ? `<p class="ferr" id="ferr" role="alert">${esc(err)}</p>` : ''}`;
}
const grid = (list) => list.map((p) => {
  const inSet = s.bg.photos.some((x) => x.id === p.id);
  return `<button class="ph" style="background-image:url('${esc(p.thumb)}')" data-pick='${esc(JSON.stringify(p))}' aria-pressed="${inSet}">${inSet ? '<span class="ok">✓</span>' : ''}${p.credit ? `<span class="by">${esc(p.credit.name)}</span>` : ''}</button>`;
}).join('');
const PANE = {
  mine: () => {
    const b = s.bg, cells = [];
    for (let i = 0; i < MAX_PHOTOS; i++) {
      const p = b.photos[i];
      cells.push(p ? `<div class="cell"><button class="ph${i === b.cur ? ' cur' : ''}" style="background-image:url('${esc(p.thumb)}')" data-show="${i}" aria-label="Show photo ${i + 1} now" aria-pressed="${i === b.cur}"></button><button class="x" data-rm="${i}" aria-label="Remove photo ${i + 1} from your set">×</button></div>` : '<button class="ph empty" data-act="upload" aria-label="Upload a photo from your computer" title="Upload a photo">+</button>');
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
  // Search runs on Enter, not on every keystroke: the Unsplash demo key allows 50 requests an hour.
  unsplash: () => `${searchBox('data-usearch', ui.uq, 'Search Unsplash')}
    <div class="chips">${['Nature', 'Minimal', 'Architecture', 'Ocean', 'Mountains', 'Night'].map((c) => `<button class="chip${ui.uq === c ? ' on' : ''}" data-uchip="${c}">${c}</button>`).join('')}</div>
    <div class="rgrid" id="results" aria-live="polite"><span class="desc">Loading…</span></div>
    <p class="note-line">${window.LUMEN_UNSPLASH_KEY ? 'Live Unsplash search.' : 'No Unsplash key found in config.local.js, so this shows a random page of Unsplash photos via Picsum (search is ignored).'}</p>`,
  wallhaven: () => `${searchBox('data-wsearch', ui.wq, 'Search Wallhaven')}
    <div class="chips">${['landscape', 'minimal', 'space', 'city'].map((c) => `<button class="chip${ui.wq === c ? ' on' : ''}" data-wchip="${c}">${c[0].toUpperCase() + c.slice(1)}</button>`).join('')}</div>
    <div class="rgrid" id="wresults" aria-live="polite"><span class="desc">Searching…</span></div>
    <p class="note-line" id="wnote">Safe-for-work only, 1920×1080 or larger.</p>`,
};
const searchBox = (attr, val, label) => `<form class="sbox" ${attr} role="search"><input class="field" name="q" value="${esc(val)}" placeholder="${label}" aria-label="${label}" enterkeyhint="search" autocomplete="off"><button class="sbox-go" aria-label="Search" title="Search (Enter)">${ENTER_ICON}</button></form>`;
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
      <div class="sfoot"><a href="https://x.com/feat_ashish" target="_blank" rel="noopener" aria-label="Follow @feat_ashish on X"><svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M12.2 1.5h2.2L9.6 7l5.6 7.5h-4.4L7.4 9.9 3.4 14.5H1.2l5.1-5.9L.9 1.5h4.5l3.1 4.1zm-.8 11.7h1.2L4.7 2.7H3.4z"/></svg>Follow @feat_ashish</a></div></nav>
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
}
async function fillUnsplash(fresh) {
  const box = $('#results'); if (!box) return;
  if (ui.results && !fresh) { box.innerHTML = results(ui.results, ui.uq); return; }
  box.innerHTML = '<span class="desc">Searching…</span>';
  try { ui.results = await searchUnsplash(ui.uq); if ($('#results')) $('#results').innerHTML = results(ui.results, ui.uq); }
  catch (e) { if ($('#results')) $('#results').innerHTML = e.limited ? '<div class="noresults"><span>Unsplash search is paused for now</span><span class="desc">Lumen can search Unsplash 50 times an hour, and that limit is used up. Try again in a little while. Your photos are not affected.</span></div>' : `<div class="err"><span class="desc">Unable to load photos. Check your connection and try again.</span><button class="btn" data-act="retry-unsplash">Try again</button></div>`; }
}
async function fillWallhaven(fresh) {
  const box = $('#wresults'); if (!box) return;
  if (ui.wres && !fresh) { box.innerHTML = results(ui.wres, ui.wq); return; }
  box.innerHTML = '<span class="desc">Searching…</span>';
  try {
    ui.wres = await searchWallhaven(ui.wq);
    if ($('#wresults')) $('#wresults').innerHTML = results(ui.wres, ui.wq);
    if (ui.wcanned && $('#wnote')) $('#wnote').textContent = 'Saved results only (Landscape, Minimal, Space, City). Run python3 serve.py for live search.';
  } catch (e) {
    if (!$('#wresults')) return;
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
function editFav(i) {
  if (i < 0 && s.favs.length >= MAX_FAVS) return toast(`You have ${MAX_FAVS} favorites, the most a new tab can hold. Remove one to add another.`);
  ui.fedit = i; ui.ferr = '';
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
  t.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button class="link">Undo</button>' : ''}<button class="link x-toast" aria-label="Dismiss">×</button>`;
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

/* ---------- Events ---------- */
document.addEventListener('click', (e) => {
  const mp = $('.more-pop:not([hidden])'); if (mp && !e.target.closest('.more, .more-pop')) { mp.hidden = true; $('.more')?.setAttribute('aria-expanded', 'false'); }
  const sf = e.target.closest('[data-search]');
  if (sf && e.target.tagName !== 'INPUT') sf.q.focus();
  const el = e.target.closest('[data-act],[data-sec],[data-set],[data-tog],[data-bgtab],[data-pick],[data-show],[data-rm],[data-uchip],[data-wchip],[data-scrim],[data-color],[data-unsave]');
  if (!el) return;
  if (el.dataset.unsave) { e.stopPropagation(); s.bg.saved = s.bg.saved.filter((c) => c !== el.dataset.unsave); save(); return renderSection(); }
  if (el.dataset.color) { setColor(el.dataset.color); return save(); }
  if (el.dataset.scrim) { if (e.target === el) el.dataset.scrim === 'dialog' ? closeDialog() : closeLayer(); return; }
  const d = el.dataset;
  if (d.rm != null) { e.stopPropagation(); removePhoto(+d.rm); return renderSection(); }
  if (d.show != null) { s.bg.cur = +d.show; s.bg.at = Date.now(); photoSetChanged(); return renderSection(); }
  if (d.pick) { togglePhoto(JSON.parse(d.pick)); return renderSection(); }
  if (d.bgtab) { ui.bgTab = d.bgtab; return renderSection(); }
  if (d.uchip) { ui.uq = d.uchip; ui.results = null; const f = $('[data-usearch] input'); if (f) f.value = d.uchip; syncChips('data-uchip', ui.uq); return fillUnsplash(true); }
  if (d.wchip) { ui.wq = d.wchip; ui.wres = null; const f = $('[data-wsearch] input'); if (f) f.value = d.wchip; syncChips('data-wchip', ui.wq); return fillWallhaven(true); }
  if (d.sec) { ui.sec = d.sec; ui.fedit = null; ui.ferr = ''; return renderSection(); }
  if (d.set) {
    set(d.set, JSON.parse(d.val));
    if (d.set === 'bg.mode' && d.val === '"photo"' && !s.bg.photos.length) ui.bgTab = 'unsplash';
    if (d.set === 'bg.mode') prepareNext();
    const sg = el.closest('.seg'); if (sg) moveSeg(sg, el);
    save(); render(); applyBg(); return settle();
  }
  if (d.tog) {
    set(d.tog, !get(d.tog)); el.classList.toggle('on', !!get(d.tog)); el.setAttribute('aria-checked', !!get(d.tog));
    save(); render(); applyBg(); return settle();
  }
  const i = +d.i;
  switch (d.act) {
    case 'settings': return openSettings();
    case 'close': return $('[data-scrim=dialog]') ? closeDialog() : closeLayer();
    case 'notes': s.notes.open = !s.notes.open; save(); ui.notesEnter = s.notes.open; render(); ui.notesEnter = false; if (s.notes.open) { const all = $$('.notes textarea'); if (all.length) focusNote(+all.at(-1).dataset.note, true); } else $('[data-act=notes]')?.focus(); return;
    case 'add': e.preventDefault(); return editFav(-1);
    case 'fcancel': ui.fedit = null; ui.ferr = ''; renderSection(); return $('.win [data-act=add]')?.focus();
    case 'upload': return $('#upfile')?.click();
    case 'more': { const pop = el.nextElementSibling, open = pop.hidden; pop.hidden = !open; el.setAttribute('aria-expanded', open); if (open) pop.querySelector('a')?.focus(); return; }
    case 'retry-wallhaven': return fillWallhaven(true);
    case 'edit': e.preventDefault(); return editFav(i);
    case 'remove': if ($('[data-scrim=dialog]')) closeDialog(); return removeFav(i);
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
document.addEventListener('focusout', (e) => { if (e.target.dataset?.note != null) e.target.style.height = ''; });
document.addEventListener('contextmenu', (e) => {
  const a = e.target.closest('a[data-i]');
  if (a) { e.preventDefault(); editFav(+a.dataset.i); }
});
document.addEventListener('submit', (e) => {
  e.preventDefault();
  const f = e.target;
  if (f.matches('[data-search]')) {
    const q = f.q.value.trim(); if (!q) return;
    const url = ENGINES[s.search.engine][1] + encodeURIComponent(q);
    s.search.newTab ? window.open(url, '_blank', 'noopener') : (location.href = url);
  } else if (f.matches('[data-favrow]')) { saveFav(f);
  } else if (f.matches('[data-usearch]')) { ui.uq = f.q.value.trim(); ui.results = null; syncChips('data-uchip', ui.uq); fillUnsplash(true); }
  else if (f.matches('[data-wsearch]')) { ui.wq = f.q.value.trim(); ui.wres = null; syncChips('data-wchip', ui.wq); fillWallhaven(true); }
});
document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.sel) { set(t.dataset.sel, typeof get(t.dataset.sel) === 'number' ? +t.value : t.value); changed(); }
  if (t.dataset.noteChk != null) { s.notes.items[+t.dataset.noteChk].d = t.checked; save(); setTimeout(render, 180); }
  if (t.dataset.file != null) handleFiles(t.files);
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
  if (t.dataset.note != null) {
    const it = s.notes.items[+t.dataset.note], m = !it.k && t.value.match(/^\s*(?:-\s*)?\[\s?[xX]?\]\s/);
    if (m) { it.k = true; it.d = /x/i.test(m[0]); it.t = t.value.slice(m[0].length); save(); render(); return focusNote(+t.dataset.note); }
    it.t = t.value; save(false); grow(t);
    t.previousElementSibling.innerHTML = md(it.t); // keeps the rendered copy current for when you leave the line
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
    if (e.key === 'Enter' && !e.shiftKey) { // Shift+Enter is a line break inside the same note
      e.preventDefault();
      if (it.k && !it.t) { it.k = false; save(); render(); return focusNote(i); } // Enter on an empty task leaves the list
      const tail = t.value.slice(t.selectionEnd); it.t = t.value.slice(0, t.selectionStart); // Enter splits at the caret
      items.splice(i + 1, 0, { t: tail, d: false, k: !!it.k }); save(); render(); return focusNote(i + 1);
    }
    if (e.key === 'Backspace' && atStart && it.k) { e.preventDefault(); it.k = false; it.d = false; save(); render(); return focusNote(i); }
    if (e.key === 'Backspace' && atStart && prev) { // join this line onto the one above
      e.preventDefault(); const j = +prev.dataset.note, p = items[j].t.length;
      items[j].t += it.t; items.splice(i, 1); save(); render(); return focusNote(j < i ? j : j - 1, p);
    }
    if (e.key === 'ArrowUp' && atStart && prev) { e.preventDefault(); return focusNote(+prev.dataset.note, true); }
    if (e.key === 'ArrowDown' && atEnd && next) { e.preventDefault(); return focusNote(+next.dataset.note, 0); }
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

/* Tooltips: the first one waits 400ms so they don't flicker while passing over; once one has shown,
   the rest of the group open instantly until the pointer leaves the dock. */
let tipTimer;
document.addEventListener('mouseover', (e) => {
  const g = e.target.closest?.('.dock, .favs');
  if (!g || g.classList.contains('warm') || !e.target.closest('.tile')) return;
  clearTimeout(tipTimer); tipTimer = setTimeout(() => g.classList.add('warm'), 400);
});
document.addEventListener('mouseout', (e) => {
  const g = e.target.closest?.('.dock, .favs');
  if (g && !g.contains(e.relatedTarget)) { clearTimeout(tipTimer); g.classList.remove('warm'); }
});

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
(window.requestIdleCallback || setTimeout)(() => prepareNext());
