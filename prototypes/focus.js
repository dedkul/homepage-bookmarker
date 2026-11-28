'use strict';
/* Lumen focus: timer state, focus log, generated sounds, mantras and quotes.
   Loaded before lumen.js on the new tab, and on its own by the extension's offscreen page (which
   keeps sounds and the end-of-timer chime going after the new tab is gone). So nothing here may
   touch the page or lumen.js's state: settings are read straight from storage. */

const FOCUS_DEF = { work: 25, short: 5, long: 15, rounds: 4, auto: true, chime: true, big: true, sound: 'off', vol: 0.5, withTimer: true };
// The extension swaps chime for one that plays in its offscreen page (see platform code in lumen.js).
const focusHooks = { chime: () => chime() };
const T_KEY = 'lumen.timer', LOG_KEY = 'lumen.flog';
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage full or blocked: the timer still runs in this tab */ } },
};
const fcfg = () => ({ ...FOCUS_DEF, ...((store.get('lumen.v09') || {}).focus || {}) });
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/* ---------- Timer ----------
   One timer shared by every Lumen tab through localStorage. kind: pomo (Pomodoro) or up (count up).
   Pomodoro running: end is when the phase ends; paused: left is what remains. Count up running:
   start + acc; paused: acc. id changes on every transition, so two tabs can't apply the same one twice. */
const T_IDLE = { kind: 'pomo', phase: 'work', round: 1, run: false, left: null, end: 0, start: 0, acc: 0, id: 0 };
const tGet = () => ({ ...T_IDLE, ...(store.get(T_KEY) || {}) });
const tPut = (t) => { t.id = Date.now() + Math.random(); store.set(T_KEY, t); return t; };
const phaseLen = (t, c = fcfg()) => (t.phase === 'work' ? c.work : t.phase === 'short' ? c.short : c.long) * 60e3;
const tLeft = (t, c) => Math.max(0, t.run ? t.end - Date.now() : t.left ?? phaseLen(t, c));
const tUp = (t) => t.acc + (t.run ? Date.now() - t.start : 0);
// Active: running, or paused partway. An untouched timer is idle and the clock shows the time.
const tActive = (t) => t.run || (t.kind === 'up' ? t.acc > 0 : t.left != null || t.phase !== 'work' || t.round > 1);
const tWorked = (t, c) => (t.kind === 'up' ? tUp(t) : t.phase === 'work' ? phaseLen(t, c) - tLeft(t, c) : 0);

function logFocus(ms) {
  const min = Math.floor(ms / 60e3); if (min < 1) return;
  const log = store.get(LOG_KEY) || {}, k = dayKey();
  log[k] = (log[k] || 0) + min;
  // Keep about a year; the stats only look back a week, but a year is cheap and nice to have later.
  const keys = Object.keys(log).sort(); while (keys.length > 400) delete log[keys.shift()];
  store.set(LOG_KEY, log);
}
function focusStats() {
  const log = store.get(LOG_KEY) || {}, d = new Date(), days = [];
  for (let i = 6; i >= 0; i--) { const x = new Date(d); x.setDate(d.getDate() - i); days.push({ k: dayKey(x), d: x, m: log[dayKey(x)] || 0 }); }
  let streak = 0; const x = new Date(d); if (!log[dayKey(x)]) x.setDate(x.getDate() - 1);
  while (log[dayKey(x)]) { streak++; x.setDate(x.getDate() - 1); }
  return { today: days[6].m, week: days.reduce((a, b) => a + b.m, 0), streak, days };
}
const fmtMin = (m) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`);
function fmtTimer(ms) {
  const sec = Math.ceil(ms / 1000), h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), x = sec % 60, p = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${p(m)}:${p(x)}` : `${m}:${p(x)}`;
}
const nextPhase = (t, c) => (t.phase !== 'work' ? { phase: 'work', round: t.phase === 'long' ? 1 : t.round + 1 } : t.round >= c.rounds ? { phase: 'long', round: t.round } : { phase: 'short', round: t.round });

// Moves a finished Pomodoro phase on. Runs under a lock so only one tab (or the offscreen page) applies it.
async function tDue() {
  const apply = () => {
    const t = tGet(), c = fcfg();
    if (t.kind !== 'pomo' || !t.run || t.end > Date.now()) return null;
    if (t.phase === 'work') logFocus(phaseLen(t, c));
    const n = { ...t, ...nextPhase(t, c), left: null };
    n.run = c.auto; n.end = c.auto ? Date.now() + phaseLen(n, c) : 0;
    tPut(n);
    return { ended: t.phase, next: n };
  };
  const r = navigator.locks ? await navigator.locks.request('lumen-timer', apply) : apply();
  if (r && fcfg().chime) focusHooks.chime();
  return r;
}
function tStart(kind) {
  const t = tGet(), c = fcfg();
  if (kind && kind !== t.kind) return tPut({ ...T_IDLE, kind, run: true, end: Date.now() + phaseLen(T_IDLE, c), start: Date.now() });
  if (t.kind === 'up') return tPut({ ...t, run: true, start: Date.now() });
  return tPut({ ...t, run: true, end: Date.now() + tLeft(t, c), left: null });
}
function tPause() {
  const t = tGet(); if (!t.run) return t;
  return t.kind === 'up' ? tPut({ ...t, run: false, acc: tUp(t) }) : tPut({ ...t, run: false, left: tLeft(t) });
}
// Reset and skip count the focus time already spent, so stopping early still shows in the stats.
function tReset(kind) { const t = tGet(); logFocus(tWorked(t)); return tPut({ ...T_IDLE, kind: kind || t.kind }); }
function tSkip() {
  const t = tGet(), c = fcfg(); if (t.kind !== 'pomo') return t;
  logFocus(tWorked(t, c));
  const n = { ...t, ...nextPhase(t, c), left: null, run: false, end: 0 };
  return tPut(n);
}

/* ---------- Sounds ----------
   Generated in the browser (Web Audio), so there are no files to download or license.
   Each sound is a few seconds of shaped noise, looped. */
const SOUNDS = [['off', 'Off'], ['rain', 'Rain'], ['ocean', 'Ocean waves'], ['brown', 'Brown noise'], ['pink', 'Pink noise'], ['white', 'White noise']];
let ac = null, voice = null;
const actx = () => (ac ||= new (window.AudioContext || window.webkitAudioContext)());
function noise(kind, secs = 8) {
  const ctx = actx(), n = ctx.sampleRate * secs, buf = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch); let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'white') d[i] = w * 0.25;
      else if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
      else { // pink (Paul Kellet's filter)
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.09; b6 = w * 0.115926;
      }
    }
    // Fade the loop's ends into each other so the seam doesn't click.
    const f = Math.floor(ctx.sampleRate * 0.05); for (let i = 0; i < f; i++) { const g = i / f; d[i] *= g; d[n - 1 - i] *= g; }
  }
  return buf;
}
function playSound(name, vol) {
  stopSound();
  if (!name || name === 'off') return;
  const ctx = actx(); ctx.resume();
  const src = ctx.createBufferSource(); src.loop = true;
  const out = ctx.createGain(); out.gain.value = 0;
  let node = src;
  const chain = (n) => { node.connect(n); node = n; };
  if (name === 'rain') {
    src.buffer = noise('pink');
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 500; chain(hp);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000; chain(lp);
  } else if (name === 'ocean') {
    src.buffer = noise('brown');
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; chain(lp);
    // Waves: a slow swell in loudness, about one every eight seconds.
    const swell = ctx.createGain(); swell.gain.value = 0.55; chain(swell);
    const lfo = ctx.createOscillator(), depth = ctx.createGain(); lfo.frequency.value = 0.12; depth.gain.value = 0.45;
    lfo.connect(depth).connect(swell.gain); lfo.start();
    src.onended = () => lfo.stop();
  } else src.buffer = noise(name);
  chain(out); out.connect(ctx.destination);
  src.start();
  out.gain.linearRampToValueAtTime(vol, ctx.currentTime + 1.2);
  voice = { src, out, name };
}
function setVolume(vol) { if (voice) voice.out.gain.setTargetAtTime(vol, actx().currentTime, 0.1); }
function stopSound() {
  if (!voice) return;
  const { src, out } = voice, ctx = actx(); voice = null;
  out.gain.cancelScheduledValues(ctx.currentTime); out.gain.setValueAtTime(out.gain.value, ctx.currentTime);
  out.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6); src.stop(ctx.currentTime + 0.65);
}
const soundOn = () => voice?.name || 'off';
// Two soft bell partials, about two seconds.
function chime() {
  try {
    const ctx = actx(); ctx.resume();
    [[659.25, 0.22], [987.77, 0.12], [1318.5, 0.05]].forEach(([f, g], i) => {
      const o = ctx.createOscillator(), a = ctx.createGain(), t0 = ctx.currentTime + i * 0.02;
      o.type = 'sine'; o.frequency.value = f; a.gain.setValueAtTime(0, t0); a.gain.linearRampToValueAtTime(g, t0 + 0.02);
      a.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.2); o.connect(a).connect(ctx.destination); o.start(t0); o.stop(t0 + 2.3);
    });
  } catch (e) { /* audio blocked until the page is clicked: the timer still moves on */ }
}

/* ---------- Mantras and quotes ----------
   Mantras are Lumen's own. Quotes are from public-domain writers; translations are the common
   older ones. One of each per day, the same in every tab; "show another" moves to the next. */
const MANTRAS = [
  'One thing at a time.', 'Small steps still count.', 'Start where you are.', 'Progress, not pressure.',
  'Rest is part of the work.', 'I choose what gets my attention.', 'Make it simple, then make it good.',
  'Finish one thing today.', 'Let the hard part be short.', 'Kind to myself, firm with my time.',
  'Show up. That is most of it.', 'Quiet mind, clear work.', 'Slow is smooth, smooth is fast.',
  'I am allowed to take breaks.', 'Notice, then return.', 'My pace is fine.', 'Soften the shoulders, unclench the jaw.',
  'One page at a time.', 'Begin before you feel ready.', 'Breathe in, begin.', 'Good enough is a fine place to start.',
  'Today I keep it light.', 'I can do hard things slowly.', 'Close the tabs I do not need.', 'Clear desk, clear head.',
  'Done today beats perfect someday.', 'Attention is a choice I make again.', 'Easy does it.', 'Work with care, then let it go.',
  'There is time for what matters.',
];
const QUOTES = [
  ['Well begun is half done.', 'Aristotle'],
  ['Our life is frittered away by detail. Simplify, simplify.', 'Henry David Thoreau'],
  ['While we are postponing, life speeds by.', 'Seneca'],
  ['To be everywhere is to be nowhere.', 'Seneca'],
  ['We suffer more often in imagination than in reality.', 'Seneca'],
  ['It is not that we have a short time to live, but that we waste a lot of it.', 'Seneca'],
  ['Very little is needed to make a happy life.', 'Marcus Aurelius'],
  ['Waste no more time arguing about what a good man should be. Be one.', 'Marcus Aurelius'],
  ['No man is free who is not master of himself.', 'Epictetus'],
  ['First say to yourself what you would be; and then do what you have to do.', 'Epictetus'],
  ['If you would be a reader, read; if a writer, write.', 'Epictetus'],
  ['The journey of a thousand miles begins with a single step.', 'Lao Tzu'],
  ['Adopt the pace of nature: her secret is patience.', 'Ralph Waldo Emerson'],
  ['The best way out is always through.', 'Robert Frost'],
  ['Energy and persistence conquer all things.', 'Benjamin Franklin'],
  ['Lost time is never found again.', 'Benjamin Franklin'],
  ['You may delay, but time will not.', 'Benjamin Franklin'],
  ['One today is worth two tomorrows.', 'Benjamin Franklin'],
  ['Knowing is not enough; we must apply.', 'Johann Wolfgang von Goethe'],
  ['Nothing is particularly hard if you divide it into small jobs.', 'Henry Ford'],
  ['Genius is one per cent inspiration, ninety-nine per cent perspiration.', 'Thomas Edison'],
  ['Do what you can, with what you have, where you are.', 'Theodore Roosevelt'],
  ['The shortest way to do many things is to do only one thing at once.', 'Samuel Smiles'],
  ['Patience and diligence, like faith, remove mountains.', 'William Penn'],
  ['He who has a why to live can bear almost any how.', 'Friedrich Nietzsche'],
  ['Rest is not idleness.', 'John Lubbock'],
  ['It is quality rather than quantity that matters.', 'Seneca'],
  ['Begin at once to live, and count each separate day as a separate life.', 'Seneca'],
  ['Little by little does the trick.', 'Aesop'],
];
