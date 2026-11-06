/* Lumen · named states for Figma capture. Load figma.html?s=<state>. Nothing is saved.
   Photos are local copies of Unsplash photos (via Picsum) so the capture embeds them. */
(function () {
  const PHOTOS = [{"id": "ps_1018", "source": "unsplash", "thumb": "figma-assets/1018-t.jpg", "src": "figma-assets/1018.jpg", "color": "#2a2c2e", "credit": {"name": "Andrew Ridley", "link": "https://unsplash.com/photos/Kt5hRENuotI"}}, {"id": "ps_1015", "source": "unsplash", "thumb": "figma-assets/1015-t.jpg", "src": "figma-assets/1015.jpg", "color": "#2a2c2e", "credit": {"name": "Alexey Topolyanskiy", "link": "https://unsplash.com/photos/-oWyJoSqBRM"}}, {"id": "ps_1036", "source": "unsplash", "thumb": "figma-assets/1036-t.jpg", "src": "figma-assets/1036.jpg", "color": "#2a2c2e", "credit": {"name": "Wolfgang Lutz", "link": "https://unsplash.com/photos/yOujaSETXlo"}}, {"id": "ps_1043", "source": "unsplash", "thumb": "figma-assets/1043-t.jpg", "src": "figma-assets/1043.jpg", "color": "#2a2c2e", "credit": {"name": "Christian Joudrey", "link": "https://unsplash.com/photos/mWRR1xj95hg"}}, {"id": "ps_1044", "source": "unsplash", "thumb": "figma-assets/1044-t.jpg", "src": "figma-assets/1044.jpg", "color": "#2a2c2e", "credit": {"name": "Steve Carter", "link": "https://unsplash.com/photos/Ixp4YhCKZkI"}}, {"id": "ps_1039", "source": "unsplash", "thumb": "figma-assets/1039-t.jpg", "src": "figma-assets/1039.jpg", "color": "#2a2c2e", "credit": {"name": "Andrew Coelho", "link": "https://unsplash.com/photos/VB-w_3dnyvI"}}, {"id": "ps_1016", "source": "unsplash", "thumb": "figma-assets/1016-t.jpg", "src": "figma-assets/1016.jpg", "color": "#2a2c2e", "credit": {"name": "Philippe Wuyts", "link": "https://unsplash.com/photos/_h7aBovKia4"}}, {"id": "ps_1029", "source": "unsplash", "thumb": "figma-assets/1029-t.jpg", "src": "figma-assets/1029.jpg", "color": "#2a2c2e", "credit": {"name": "freddie marriage", "link": "https://unsplash.com/photos/utwYoEu9SU8"}}, {"id": "ps_1011", "source": "unsplash", "thumb": "figma-assets/1011-t.jpg", "src": "figma-assets/1011.jpg", "color": "#2a2c2e", "credit": {"name": "Roberto Nickson", "link": "https://unsplash.com/photos/7BjmDICVloE"}}, {"id": "ps_1019", "source": "unsplash", "thumb": "figma-assets/1019-t.jpg", "src": "figma-assets/1019.jpg", "color": "#2a2c2e", "credit": {"name": "Patrick Fore", "link": "https://unsplash.com/photos/V6s1cmE39XM"}}];
  const WALLHAVEN = [{"id": "mloml9", "thumb": "figma-assets/wh-mloml9.jpg", "src": "https://w.wallhaven.cc/full/ml/wallhaven-mloml9.jpg", "res": "3840x2160", "color": "#999999", "link": "https://wallhaven.cc/w/mloml9"}, {"id": "yqkwv7", "thumb": "figma-assets/wh-yqkwv7.jpg", "src": "https://w.wallhaven.cc/full/yq/wallhaven-yqkwv7.jpg", "res": "3840x2160", "color": "#999999", "link": "https://wallhaven.cc/w/yqkwv7"}, {"id": "2165dx", "thumb": "figma-assets/wh-2165dx.jpg", "src": "https://w.wallhaven.cc/full/21/wallhaven-2165dx.png", "res": "3840x2160", "color": "#424153", "link": "https://wallhaven.cc/w/2165dx"}, {"id": "d8vrwm", "thumb": "figma-assets/wh-d8vrwm.jpg", "src": "https://w.wallhaven.cc/full/d8/wallhaven-d8vrwm.jpg", "res": "3840x2160", "color": "#424153", "link": "https://wallhaven.cc/w/d8vrwm"}, {"id": "jel75p", "thumb": "figma-assets/wh-jel75p.jpg", "src": "https://w.wallhaven.cc/full/je/wallhaven-jel75p.jpg", "res": "4742x2667", "color": "#424153", "link": "https://wallhaven.cc/w/jel75p"}, {"id": "8g8q32", "thumb": "figma-assets/wh-8g8q32.jpg", "src": "https://w.wallhaven.cc/full/8g/wallhaven-8g8q32.jpg", "res": "1920x1080", "color": "#999999", "link": "https://wallhaven.cc/w/8g8q32"}, {"id": "gw1xel", "thumb": "figma-assets/wh-gw1xel.jpg", "src": "https://w.wallhaven.cc/full/gw/wallhaven-gw1xel.png", "res": "1920x1080", "color": "#000000", "link": "https://wallhaven.cc/w/gw1xel"}, {"id": "gw1em3", "thumb": "figma-assets/wh-gw1em3.jpg", "src": "https://w.wallhaven.cc/full/gw/wallhaven-gw1em3.png", "res": "3840x2160", "color": "#000000", "link": "https://wallhaven.cc/w/gw1em3"}];
  const favs = [['YouTube', 'https://youtube.com'], ['Gmail', 'https://mail.google.com'], ['GitHub', 'https://github.com'],
    ['Figma', 'https://figma.com'], ['Instagram', 'https://instagram.com'], ['Notion', 'https://notion.so']].map(([name, url]) => ({ name, url }));
  const base = () => ({
    layout: 'editorial', dock: { pos: 'bottom', autohide: false },
    bg: { mode: 'photo', color: '#111113', saved: ['#3b4a6b', '#8a5a44', '#33aa66'], glass: true, frost: 0.5, photos: PHOTOS.slice(0, 6), freq: 'tab', dim: 0.3, cur: 0, at: Date.now(), next: null },
    clock: { h24: false, zone2: true, tz: 'Asia/Kolkata' },
    favs: favs.map((f) => ({ ...f })),
    search: { engine: 'google', show: true, newTab: false, focus: false },
    notes: { show: true, open: false, done: 'bottom', items: [
      { t: 'Case study: lead with the **new-tab load time**, then the three layouts and why Strip exists', d: false, k: false },
      { t: 'Send the v0.9 screens to *Priya* for review', d: false, k: true },
      { t: 'Pick three wallpapers for the set, one each for ~~morning~~ day, evening and night', d: false, k: true },
      { t: 'Check the Unsplash guidelines', d: true, k: true }] },
  });
  const twelve = (s) => s.favs.push(...[['Linear', 'linear.app'], ['Vercel', 'vercel.com'], ['Reddit', 'reddit.com'], ['Maps', 'maps.google.com'], ['Calendar', 'calendar.google.com'], ['Spotify', 'open.spotify.com']].map(([name, d]) => ({ name, url: 'https://' + d })));
  const css = (t) => document.head.insertAdjacentHTML('beforeend', `<style>${t}</style>`);
  const settings = (sec, tab) => () => { lazyLoaded = true; window.LUMEN_WALLHAVEN = { landscape: WALLHAVEN }; if (tab) ui.bgTab = tab; openSettings(sec); document.activeElement.blur(); };
  const color = (s, c) => { s.bg.mode = 'color'; s.bg.color = c; };
  const S = {
    'editorial-photo': () => {},
    'editorial-search-focus': () => () => document.querySelector('[data-search] input').focus(),
    'editorial-add-hover': (s) => { s.favs = s.favs.slice(0, 5); return () => css('.fgrid .ghost button{opacity:1} .fgrid .fav.ghost{border-bottom-color:var(--line)}'); },
    'editorial-notes-open': (s) => { s.notes.open = true; },
    'notes-editing': (s) => { s.notes.open = true; return () => { const t = document.querySelector('[data-note="0"]'); t.focus(); t.setSelectionRange(t.value.length, t.value.length); }; },
    'notes-empty': (s) => { s.notes.open = true; s.notes.items = [{ t: '', d: false, k: false }]; },
    'dock-notes-open': (s) => { s.layout = 'dock'; s.bg.cur = 1; s.notes.open = true; },
    'editorial-color-ink': (s) => color(s, '#111113'),
    'editorial-color-paper': (s) => color(s, '#f7f7f5'),
    'dock-bottom-photo': (s) => { s.layout = 'dock'; s.bg.cur = 1; },
    'dock-tooltip': (s) => { s.layout = 'dock'; s.bg.cur = 1; return () => css('.dock .tile:nth-child(4) .tip{opacity:1;transform:none;transition:none} .dock .tile:nth-child(4){background:var(--fill)}'); },
    'dock-left-autohide-hidden': (s) => { s.layout = 'dock'; s.dock = { pos: 'left', autohide: true }; s.bg.cur = 5; },
    'dock-left-autohide-revealed': (s) => { s.layout = 'dock'; s.dock = { pos: 'left', autohide: true }; s.bg.cur = 5; return () => css('.dock{transform:none!important;transition:none!important} .dock-zone::after{opacity:0}'); },
    'dock-right-color-sand': (s) => { s.layout = 'dock'; s.dock = { pos: 'right', autohide: false }; color(s, '#ece5d8'); },
    'strip-photo': (s) => { s.layout = 'strip'; s.bg.cur = 3; },
    // Edge cases: a full set of 12 favorites in every layout
    'twelve-dock-bottom': (s) => { twelve(s); s.layout = 'dock'; s.bg.cur = 1; },
    'twelve-dock-bottom-two-rows': (s) => { twelve(s); s.layout = 'dock'; s.dock.rows = 2; s.bg.cur = 1; },
    'twelve-dock-left': (s) => { twelve(s); s.layout = 'dock'; s.dock.pos = 'left'; s.bg.cur = 5; },
    'twelve-dock-left-two-columns': (s) => { twelve(s); s.layout = 'dock'; s.dock.pos = 'left'; s.dock.rows = 2; s.bg.cur = 5; },
    // Odd count in two rows: the empty cell becomes an add slot on dock hover
    'eleven-dock-bottom-two-rows': (s) => { twelve(s); s.favs.pop(); s.layout = 'dock'; s.dock.rows = 2; s.bg.cur = 1; return () => css('.tile.slot{opacity:1;transition:none}'); },
    'eleven-dock-left-two-columns': (s) => { twelve(s); s.favs.pop(); s.layout = 'dock'; s.dock.pos = 'left'; s.dock.rows = 2; s.bg.cur = 5; return () => css('.tile.slot{opacity:1;transition:none}'); },
    'twelve-strip': (s) => { twelve(s); s.layout = 'strip'; s.bg.cur = 3; },
    'twelve-editorial': (s) => { twelve(s); },
    'strip-color-forest': (s) => { s.layout = 'strip'; color(s, '#1d2a23'); },
    'settings-layout-dock': (s) => { s.layout = 'dock'; s.bg.cur = 1; return settings('Layout'); },
    'settings-layout-editorial': () => settings('Layout'),
    'settings-background-color': (s) => { color(s, '#3b4a6b'); return settings('Background'); },
    'settings-background-color-error': (s) => { color(s, '#3b4a6b'); return () => { settings('Background')(); setTimeout(() => { const h = document.querySelector('[data-hex]'); h.value = 'ZZ12'; h.dispatchEvent(new Event('change', { bubbles: true })); }, 150); }; },
    'settings-background-photos': () => settings('Background', 'mine'),
    'settings-background-unsplash': () => () => { ui.uq = 'Mountains'; ui.results = PHOTOS.slice(); settings('Background', 'unsplash')(); },
    'settings-background-wallhaven': () => () => { ui.wq = 'landscape'; settings('Background', 'wallhaven')(); },
    'settings-clock': () => settings('Layout'),
    'settings-favorites': () => () => { settings('Favorites')(); css('.frow:nth-child(3) .acts{opacity:1} .frow:nth-child(3){background:var(--fill)}'); },
    'settings-search': () => settings('Search'),
    'settings-notes': () => settings('Notes'),
    'settings-favorite-adding': () => () => editFav(-1),
    'settings-favorite-editing': () => () => editFav(2),
    'toast-removed-undo': () => () => removeFav(5),
  };
  const name = new URLSearchParams(location.search).get('s') || 'editorial-photo';
  const s = base(), after = (S[name] || S['editorial-photo'])(s);
  const LOCAL_FAV = ["youtube.com", "mail.google.com", "github.com", "figma.com", "instagram.com", "notion.so"];
  window.LUMEN_FAVICON = (dom) => LOCAL_FAV.includes(dom) ? `figma-assets/fav-${dom}.png` : `https://www.google.com/s2/favicons?domain=${dom}&sz=64`; // local copies so the capture can embed them
  window.__lumenPreset = s; window.__lumenAfter = typeof after === 'function' ? after : null;
  window.LUMEN_STATES = Object.keys(S);
  document.title = name;
})();
