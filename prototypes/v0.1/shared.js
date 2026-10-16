// Shared prototype behaviour: clocks, favorites, tasks, notes, and the "Customize" panel.
// Placeholder data only. No real extension APIs are used here.
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const FAVS = [
  ["YouTube", "youtube.com", "#ff0033"], ["Gmail", "mail.google.com", "#ea4335"], ["GitHub", "github.com", "#24292f"],
  ["Figma", "figma.com", "#a259ff"], ["Instagram", "instagram.com", "#e1306c"], ["Notion", "notion.so", "#111111"],
  ["Linear", "linear.app", "#5e6ad2"], ["Reddit", "reddit.com", "#ff4500"], ["Dribbble", "dribbble.com", "#ea4c89"],
  ["X", "x.com", "#000000"], ["Spotify", "open.spotify.com", "#1db954"], ["ChatGPT", "chatgpt.com", "#10a37f"],
  ["Behance", "behance.net", "#1769ff"], ["Amazon", "amazon.com", "#ff9900"], ["Maps", "maps.google.com", "#34a853"],
  ["Netflix", "netflix.com", "#e50914"],
];
// One optional second clock (the main clock is always local time). null = none.
let Z = JSON.parse(localStorage.zone || "null") ?? { n: "New York", tz: "America/New_York" };
const ALL_TZ = Intl.supportedValuesOf("timeZone");

const S = Object.assign({ rows: 2, per: 6, bg: "aurora", theme: "dark", h24: false, newtab: false, ov: "#000000", ovo: 0, blur: 0 },
  JSON.parse(localStorage.proto || "{}"));
const save = () => { localStorage.proto = JSON.stringify(S); apply(); };

const fmt = (tz, o) => new Intl.DateTimeFormat([], { timeZone: tz, ...o }).format(new Date());
const offset = tz => new Intl.DateTimeFormat("en", { timeZone: tz, timeZoneName: "shortOffset" })
  .formatToParts().find(p => p.type === "timeZoneName").value;

function tick() {
  const o = { hour: "numeric", minute: "2-digit", hour12: !S.h24 };
  const h = new Date().getHours();
  $$("[data-clock]").forEach(e => e.textContent = fmt(undefined, o).replace(/\s?[AP]M/i, ""));
  $$("[data-ampm]").forEach(e => e.textContent = S.h24 ? "" : h < 12 ? "AM" : "PM");
  $$("[data-date]").forEach(e => e.textContent = fmt(undefined, { weekday: "long", month: "long", day: "numeric" }));
  $$("[data-greet]").forEach(e => e.textContent = h < 5 ? "Good night" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");
  $$("[data-tz]").forEach(e => e.textContent = fmt(e.dataset.tz, o));
}

// Rendered only when the zone changes, so tick() doesn't wipe the edit form.
const storeZone = () => { localStorage.zone = JSON.stringify(Z); renderWorld(); };
function renderWorld() {
  $$("[data-world]").forEach(el => {
    el.innerHTML = Z
      ? `<div class="zone"><span>${esc(Z.n)}</span><b data-tz="${Z.tz}"></b><small>${offset(Z.tz)}</small>
         <button class="zbtn" type="button" data-act="edit">Edit</button></div>`
      : `<button class="zbtn add-zone" type="button" data-act="edit">+ Add a second time zone</button>`;
    el.onclick = e => { if (e.target.dataset.act === "edit") editZone(el); };
  });
  tick();
}
function editZone(el) {
  el.innerHTML = `<form class="zform"><input name="n" placeholder="Label, e.g. Home" aria-label="Label" required value="${Z ? esc(Z.n) : ""}">
    <input name="tz" list="tzs" placeholder="Time zone, e.g. Asia/Kolkata" aria-label="Time zone" required value="${Z ? Z.tz : ""}">
    <datalist id="tzs">${ALL_TZ.map(t => `<option value="${t}">`).join("")}</datalist>
    <div><button>Save</button>${Z ? '<button type="button" data-act="del">Remove</button>' : ""}<button type="button" data-act="cancel">Cancel</button></div></form>`;
  const f = $("form", el);
  f.n.focus();
  f.tz.oninput = () => f.tz.setCustomValidity("");
  el.onclick = e => { const a = e.target.dataset.act; if (a === "del") Z = null; if (a) storeZone(); };
  f.onsubmit = e => {
    e.preventDefault();
    if (!ALL_TZ.includes(f.tz.value)) { f.tz.setCustomValidity("Pick a time zone from the list"); f.tz.reportValidity(); return; }
    Z = { n: f.n.value.trim(), tz: f.tz.value }; storeZone();
  };
}

function renderFavs() {
  $$("[data-favs]").forEach(el => {
    const n = S.rows * S.per;
    el.innerHTML = FAVS.slice(0, n - 1).map(([t, h, c]) =>
      `<a class="fav" href="https://${h}" ${S.newtab ? 'target="_blank"' : ""}>
        <span class="ico"><img src="https://www.google.com/s2/favicons?domain=${h}&sz=128" alt=""
          onerror="this.nextElementSibling.hidden=false;this.remove()"><i hidden style="--c:${c}">${t[0]}</i></span>
        <span class="lbl">${t}</span></a>`).join("") +
      `<button class="fav add" type="button"><span class="ico">+</span><span class="lbl">Add</span></button>`;
  });
}

let T = JSON.parse(localStorage.todos || "null") ||
  [{ t: "Pick a layout direction", d: false }, { t: "Update the Figma log", d: false }, { t: "Water the plants", d: true }];
function renderTodos() {
  const s = () => { localStorage.todos = JSON.stringify(T); renderTodos(); };
  $$("[data-todo]").forEach(el => {
    el.innerHTML = `<ul>${T.map((x, i) => `<li class="${x.d ? "done" : ""}"><label><input type="checkbox" data-i="${i}" ${x.d ? "checked" : ""}><span>${esc(x.t)}</span></label></li>`).join("")}</ul>
      <form><input placeholder="Add a task…" aria-label="Add a task"></form>`;
    el.onchange = e => { const i = e.target.dataset.i; if (i != null) { T[i].d = e.target.checked; s(); } };
    $("form", el).onsubmit = e => { e.preventDefault(); const v = e.target[0].value.trim(); if (v) { T.push({ t: v, d: false }); s(); } };
  });
}

function renderNotes() {
  $$("[data-notes]").forEach(el => {
    el.innerHTML = `<textarea aria-label="Notes" placeholder="Jot something down…"></textarea>`;
    const ta = $("textarea", el);
    ta.value = localStorage.notes ?? "Ideas: try a video background with a poster frame.";
    ta.oninput = () => localStorage.notes = ta.value;
  });
}

// Customize panel: stands in for the real settings UI so layouts can be compared live.
const seg = (k, l, opts) => `<fieldset><legend>${l}</legend>${opts.map(v =>
  `<label><input type="radio" name="${k}" value="${v}"><span>${v === true ? "on" : v === false ? "off" : v}</span></label>`).join("")}</fieldset>`;
const panel = document.createElement("div");
panel.className = "tweaks";
panel.innerHTML = `<button class="gear" type="button" aria-label="Customize">
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg></button>
  <form hidden><h4>Customize</h4>
  ${seg("rows", "Favorite rows", [1, 2])}${seg("per", "Per row", [4, 5, 6, 8])}
  ${seg("bg", "Background", ["aurora", "dusk", "photo", "plain"])}${seg("theme", "Theme", ["dark", "light"])}
  <fieldset class="adj"><legend>Background overlay</legend>
    <label>Colour <input type="color" name="ov"></label>
    <label>Opacity <input type="range" name="ovo" min="0" max="90"></label>
    <label>Blur <input type="range" name="blur" min="0" max="30"></label></fieldset>
  ${seg("h24", "24-hour clock", [false, true])}${seg("newtab", "Open favorites in new tab", [false, true])}
  <a href="index.html">← All variants</a></form>`;
panel.onchange = e => {
  const { name, value } = e.target;
  S[name] = value === "true" ? true : value === "false" ? false : isNaN(value) ? value : +value;
  save();
};
panel.oninput = e => { if (e.target.type === "range" || e.target.type === "color") panel.onchange(e); };
// Overlay layer between the background and the content; blur uses backdrop-filter here only for the prototype.
const scrim = document.createElement("div");
scrim.className = "scrim";
$(".gear", panel).onclick = () => { const f = $("form", panel); f.hidden = !f.hidden; };

function apply() {
  const d = document.documentElement;
  d.dataset.theme = S.theme; d.dataset.bg = S.bg; d.style.setProperty("--per", S.per);
  d.style.setProperty("--ov", S.ov); d.style.setProperty("--ovo", S.ovo + "%"); d.style.setProperty("--blur", S.blur + "px");
  renderFavs(); tick();
  $$("input", panel).forEach(i => i.type === "radio" ? i.checked = String(S[i.name]) === i.value : i.value = S[i.name]);
}

document.body.prepend(scrim);
document.body.append(panel);
apply(); renderWorld(); renderTodos(); renderNotes();
setInterval(tick, 1000);
