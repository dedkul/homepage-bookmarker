'use strict';
/* Lumen's service worker. Its only job: keep focus sounds and the timer chime alive after the new tab
   is gone. Sounds play in an offscreen page (offscreen.html); an alarm moves a Pomodoro on when no
   Lumen tab is open, and the offscreen page chimes. No network, no tabs, no browsing data. */
const OFFSCREEN = 'offscreen.html';
let creating = null;
async function ensureOffscreen() {
  const open = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] });
  if (open.length) return;
  creating ||= chrome.offscreen.createDocument({ url: OFFSCREEN, reasons: ['AUDIO_PLAYBACK'], justification: 'Plays focus sounds and the end-of-timer chime after the new tab is closed.' })
    .finally(() => { creating = null; });
  await creating;
}
const toOffscreen = async (m) => { await ensureOffscreen(); return chrome.runtime.sendMessage({ ...m, to: 'offscreen' }); };

chrome.runtime.onMessage.addListener((m, _sender, reply) => {
  if (m?.to !== 'bg') return;
  if (m.type === 'alarm') {
    // Chrome won't fire an alarm sooner than 30 seconds; a visible tab handles anything shorter.
    if (m.when) chrome.alarms.create('lumen-timer', { when: Math.max(m.when, Date.now() + 30e3) });
    else chrome.alarms.clear('lumen-timer');
    reply(true); return;
  }
  // Stopping when nothing is playing shouldn't open the offscreen page just to close it.
  if (m.type === 'stop' || m.type === 'vol') {
    chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] }).then((c) => (c.length ? chrome.runtime.sendMessage({ ...m, to: 'offscreen' }) : null)).then(reply, () => reply(null));
    return true;
  }
  toOffscreen(m).then(reply, () => reply(null));
  return true;
});

chrome.alarms.onAlarm.addListener(async (a) => {
  if (a.name !== 'lumen-timer') return;
  const r = await toOffscreen({ type: 'due' }).catch(() => null);
  if (r?.next) chrome.alarms.create('lumen-timer', { when: Math.max(r.next, Date.now() + 30e3) });
});
