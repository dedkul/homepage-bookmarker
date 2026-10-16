// Lumen prototype runtime, shared by dock.html, editorial.html and bento.html.
// Placeholder data; the real extension swaps localStorage for chrome.storage.
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const root = document.documentElement, STYLE = root.dataset.style;
const load = (k, d) => { try { return JSON.parse(localStorage[k]) ?? d; } catch { return d; } };

const FAVS = [
  ["YouTube", "youtube.com", "#ff0033"], ["Gmail", "mail.google.com", "#ea4335"], ["GitHub", "github.com", "#24292f"],
  ["Figma", "figma.com", "#a259ff"], ["Instagram", "instagram.com", "#e1306c"], ["Notion", "notion.so", "#191919"],
  ["Linear", "linear.app", "#5e6ad2"], ["Reddit", "reddit.com", "#ff4500"], ["Dribbble", "dribbble.com", "#ea4c89"],
  ["X", "x.com", "#000000"], ["Spotify", "open.spotify.com", "#1db954"], ["ChatGPT", "chatgpt.com", "#10a37f"],
  ["Behance", "behance.net", "#1769ff"], ["Amazon", "amazon.com", "#ff9900"], ["Maps", "maps.google.com", "#34a853"],
];
const VARIANTS = { dock: ["Still", "Horizon"], editorial: ["Broadsheet", "Gallery"], bento: ["Soft", "Mono"] };

const S = Object.assign({ rows: 1, per: 6, bg: "dusk", theme: "dark", h24: false, newtab: false,
  ov: "#000000", ovo: 0, blur: 0, v_dock: 1, v_editorial: 1, v_bento: 1 }, load("lumen", {}));
// The main clock is local time (Sydney for the user); one optional second clock. null = removed.
let Z = "lumenZone" in localStorage ? load("lumenZone", null) : { n: "India", tz: "Asia/Kolkata" };
const ALL_TZ = Intl.supportedValuesOf("timeZone");

// ---- time ----
function clock(tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: S.h24 ? "2-digit" : "numeric",
    minute: "2-digit", ...(S.h24 ? { hourCycle: "h23" } : { hour12: true }) }).formatToParts().map(x => [x.type, x.value]));
  return { t: `${p.hour}:${p.minute}`, ap: S.h24 ? "" : p.dayPeriod };
}
const wall = tz => new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
function diff(tz) {
  const m = Math.round((wall(tz) - wall()) / 60000), a = Math.abs(m);
  if (!m) return "Same time";
  return `${Math.floor(a / 60)}h${a % 60 ? ` ${a % 60}m` : ""} ${m > 0 ? "ahead" : "behind"}`;
}
function tick() {
  const c = clock(), h = new Date().getHours();
  $$("[data-time]").forEach(e => e.textContent = c.t);
  $$("[data-ap]").forEach(e => e.textContent = c.ap);
  $$("[data-date]").forEach(e => e.textContent = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(new Date()));
  $$("[data-greet]").forEach(e => e.textContent = h < 5 ? "Good night" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");
  if (Z) {
    const zc = clock(Z.tz), zh = wall(Z.tz).getHours();
    $$("[data-ztime]").forEach(e => e.textContent = zc.t + (zc.ap ? " " + zc.ap.toLowerCase() : ""));
    $$("[data-zdiff]").forEach(e => e.textContent = diff(Z.tz));
    $$(".z-dot").forEach(e => { e.classList.toggle("night", zh < 6 || zh >= 19); e.title = zh < 6 || zh >= 19 ? "Night there" : "Day there"; });
  }
}

// ---- second time zone: add / edit / remove inline ----
const storeZone = () => { localStorage.lumenZone = JSON.stringify(Z); renderZone(); };
function renderZone() {
  $$("[data-zone]").forEach(el => {
    el.innerHTML = Z ? `<div class="zone"><span class="z-dot" aria-hidden="true"></span><span class="z-name">${esc(Z.n)}</span>
        <span class="z-time" data-ztime></span><span class="z-diff" data-zdiff></span>
        <button class="z-edit press" type="button" data-act="edit" aria-label="Edit second clock">Edit</button></div>`
      : `<button class="z-add press" type="button" data-act="edit">+ Add a second clock</button>`;
    el.onclick = e => { if (e.target.dataset.act === "edit") editZone(el); };
  });
  tick();
}
function editZone(el) {
  el.innerHTML = `<form class="zform"><input name="n" placeholder="Label, e.g. India" aria-label="Label" required value="${Z ? esc(Z.n) : ""}">
    <input name="tz" list="tzs" placeholder="Time zone, e.g. Asia/Kolkata" aria-label="Time zone" required value="${Z ? Z.tz : ""}">
    <datalist id="tzs">${ALL_TZ.map(t => `<option value="${t}">`).join("")}</datalist>
    <div><button class="btn primary press">Save</button>${Z ? '<button class="btn press" type="button" data-act="del">Remove</button>' : ""}
    <button class="btn ghost press" type="button" data-act="cancel">Cancel</button></div></form>`;
  const f = $("form", el);
  f.n.focus();
  f.tz.oninput = () => f.tz.setCustomValidity("");
  f.onkeydown = e => { if (e.key === "Escape") renderZone(); };
  el.onclick = e => { const a = e.target.dataset.act; if (a === "del") Z = null; if (a) storeZone(); };
  f.onsubmit = e => {
    e.preventDefault();
    if (!ALL_TZ.includes(f.tz.value)) { f.tz.setCustomValidity("Pick a time zone from the list"); f.tz.reportValidity(); return; }
    Z = { n: f.n.value.trim(), tz: f.tz.value }; storeZone();
  };
}

// ---- favorites ----
function renderFavs() {
  $$("[data-favs]").forEach(el => {
    const n = S.rows * S.per;
    el.innerHTML = FAVS.slice(0, n - 1).map(([t, h, c], i) =>
      `<a class="fav" href="https://${h}" ${S.newtab ? 'target="_blank" rel="noopener"' : ""} title="${t}" style="--i:${i}">
        <span class="num" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span>
        <span class="ico"><img src="https://www.google.com/s2/favicons?domain=${h}&sz=128" alt="" loading="lazy"
          onerror="this.nextElementSibling.hidden=false;this.remove()"><i hidden style="--c:${c}">${t[0]}</i></span>
        <span class="lbl">${t}</span></a>`).join("") +
      `<button class="fav add" type="button" title="Add favorite" style="--i:${n - 1}"><span class="num" aria-hidden="true">+</span>
        <span class="ico">+</span><span class="lbl">Add</span></button>`;
  });
}

// ---- tasks & notes (Bento only) ----
let T = load("lumenTodos", null) || [{ t: "Review Lumen styles", d: false }, { t: "Update the case study", d: false }, { t: "Call home", d: true }];
function renderTodos() {
  const s = () => { localStorage.lumenTodos = JSON.stringify(T); renderTodos(); };
  $$("[data-todo]").forEach(el => {
    el.innerHTML = `<ul>${T.map((x, i) => `<li class="${x.d ? "done" : ""}"><label class="check"><input type="checkbox" data-i="${i}" ${x.d ? "checked" : ""}>
      <span class="box" aria-hidden="true"></span><span class="txt">${esc(x.t)}</span></label></li>`).join("")}</ul>
      <form><input placeholder="Add a task" aria-label="Add a task"></form>`;
    el.onchange = e => { const i = e.target.dataset.i; if (i != null) { T[i].d = e.target.checked; s(); } };
    $("form", el).onsubmit = e => { e.preventDefault(); const v = e.target[0].value.trim(); if (v) { T.push({ t: v, d: false }); s(); $("form input", el).focus(); } };
  });
}
function renderNotes() {
  $$("[data-notes]").forEach(el => {
    el.innerHTML = `<textarea aria-label="Notes" placeholder="Write something…"></textarea>`;
    const ta = $("textarea", el);
    ta.value = localStorage.lumenNotes ?? "Sydney ↔ India call: Thursday, 4 pm my time.";
    ta.oninput = () => localStorage.lumenNotes = ta.value;
  });
}

// ---- customize sheet ----
const seg = (k, opts) => `<div class="seg" role="radiogroup">${opts.map(([v, l]) =>
  `<label><input type="radio" name="${k}" value="${v}"><span>${l}</span></label>`).join("")}</div>`;
const sw = (k, l) => `<label class="row">${l}<input class="switch" type="checkbox" role="switch" name="${k}"></label>`;
const sheet = document.createElement("div");
sheet.innerHTML = `<button class="fab press" type="button" aria-label="Customize" aria-expanded="false" aria-controls="sheet">
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></svg></button>
  <aside class="sheet" id="sheet" aria-label="Customize" inert>
    <header><h2>Customize</h2><button class="btn ghost press" type="button" data-close aria-label="Close">Done</button></header>
    <section><h3>Style</h3><nav class="seg">${["dock", "editorial", "bento"].map(s =>
      `<a href="${s}.html" ${s === STYLE ? 'aria-current="page"' : ""}><span>${s[0].toUpperCase() + s.slice(1)}</span></a>`).join("")}</nav>
      ${seg("v_" + STYLE, VARIANTS[STYLE].map((n, i) => [i + 1, n]))}</section>
    <section><h3>Favorites</h3><div class="row">Rows ${seg("rows", [[1, "1"], [2, "2"]])}</div>
      <div class="row">Per row ${seg("per", [[4, "4"], [5, "5"], [6, "6"], [8, "8"]])}</div>${sw("newtab", "Open in a new tab")}</section>
    <section><h3>Background</h3><div class="swatches">${["dusk", "sea", "sand", "photo"].map(b =>
      `<label title="${b}"><input type="radio" name="bg" value="${b}"><span class="sw" data-sw="${b}"></span><small>${b}</small></label>`).join("")}</div>
      <div class="row">Overlay <input type="color" name="ov" aria-label="Overlay colour"></div>
      <label class="row">Opacity <input type="range" name="ovo" min="0" max="90"></label>
      <label class="row">Blur <input type="range" name="blur" min="0" max="30"></label>
      <div class="row soon">Video background <span class="badge">Coming soon</span></div></section>
    <section><h3>Appearance</h3><div class="row">Theme ${seg("theme", [["dark", "Dark"], ["light", "Light"]])}</div>${sw("h24", "24-hour clock")}</section>
    <p class="foot"><a href="v0.1/index.html">v0.1 explorations</a> · Prototype</p>
  </aside>`;
const fab = $(".fab", sheet), panel = $(".sheet", sheet);
function openSheet(open) {
  root.classList.toggle("sheet-open", open); fab.setAttribute("aria-expanded", open); panel.inert = !open;
  if (open) $("input:checked, a", panel)?.focus(); else fab.focus();
}
fab.onclick = () => openSheet(!root.classList.contains("sheet-open"));
$("[data-close]", panel).onclick = () => openSheet(false);
const setFrom = t => {
  const v = t.type === "checkbox" ? t.checked : t.value;
  S[t.name] = typeof v === "boolean" || isNaN(v) || t.type === "color" ? v : +v;
  localStorage.lumen = JSON.stringify(S); apply();
};
panel.oninput = e => { if (e.target.name) setFrom(e.target); };

document.addEventListener("keydown", e => {
  if (e.key === "Escape" && root.classList.contains("sheet-open")) openSheet(false);
  const typing = /INPUT|TEXTAREA/.test(document.activeElement.tagName);
  if (e.key === "/" && !typing) { e.preventDefault(); $(".search input")?.focus(); }
});

function apply() {
  Object.assign(root.dataset, { theme: S.theme, bg: S.bg, v: S["v_" + STYLE] });
  root.style.cssText = `--per:${S.per};--ov:${S.ov};--ovo:${S.ovo}%;--blur:${S.blur}px`;
  root.dataset.rows = S.rows;
  renderFavs(); tick();
  $$("input[name]", panel).forEach(i => {
    if (i.type === "radio") i.checked = String(S[i.name]) === i.value;
    else if (i.type === "checkbox") i.checked = !!S[i.name];
    else i.value = S[i.name];
  });
}

const scrim = document.createElement("div");
scrim.className = "scrim";
document.body.prepend(scrim);
document.body.append(...sheet.children);
apply(); renderZone(); renderTodos(); renderNotes();
setInterval(tick, 1000);
document.fonts.ready.then(() => root.classList.add("ready"));
