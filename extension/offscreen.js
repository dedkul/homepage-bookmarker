'use strict';
/* Offscreen page: plays focus sounds and the chime (focus.js), and finishes a Pomodoro phase when the
   service worker's alarm fires. Shares localStorage and the timer lock with the new tab. */
chrome.runtime.onMessage.addListener((m, _sender, reply) => {
  if (m?.to !== 'offscreen') return;
  switch (m.type) {
    case 'play': playSound(m.name, m.vol); store.set('lumen.playing', m.name); break;
    case 'stop': stopSound(); store.set('lumen.playing', 'off'); break;
    case 'vol': setVolume(m.vol); break;
    case 'chime': chime(); break;
    case 'due':
      tDue().then(() => { const t = tGet(); reply({ next: t.kind === 'pomo' && t.run ? t.end : 0 }); });
      return true;
  }
  reply(true);
});
