// Lumen's Collections feed. Builds the Collections tab from the repo's collections/ folder,
// so adding or removing a wallpaper is a commit to master, not a Chrome Web Store update.
//   GET /api/collections   { collections: [{ id, name, photos: [{ id, source, thumb, src, color, page?, credit?, dl? }] }] }
// Each collections/<folder>/links.txt lists Wallhaven or Unsplash page links, one per line (# starts a comment).
// The result is cached at Vercel's edge for an hour, so GitHub, Wallhaven and Unsplash see about one call an hour.
// Same origin rule as unsplash.js and wallhaven.js.

const REPO = 'dedkul/homepage-bookmarker', BRANCH = 'master';
const MAX_PER_COLLECTION = 60;

function allowedOrigin(origin) {
  if (!origin) return null;
  const list = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (list.length) return list.includes(origin) ? origin : null;
  return origin.startsWith('chrome-extension://') ? origin : null;
}

// "windows-7" -> "Windows 7"
const title = (id) => id.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');

// A links.txt line -> { kind, id }, or null for anything that isn't a Wallhaven or Unsplash photo page.
export function parseLink(line) {
  let u; try { u = new URL(line.trim()); } catch (e) { return null; }
  const host = u.hostname.replace(/^www\./, ''), parts = u.pathname.split('/').filter(Boolean);
  if (host === 'wallhaven.cc' && parts[0] === 'w' && /^\w+$/.test(parts[1] || '')) return { kind: 'wallhaven', id: parts[1] };
  if (host === 'whvn.cc' && /^\w+$/.test(parts[0] || '')) return { kind: 'wallhaven', id: parts[0] };
  // Unsplash IDs are 11 characters; newer page links put a title in front ("misty-lake-AbC123xYz_9").
  if (host === 'unsplash.com' && parts[0] === 'photos' && (parts[1] || '').length >= 11) return { kind: 'unsplash', id: parts[1].slice(-11) };
  return null;
}

async function wallhaven(id) {
  const r = await fetch(`https://wallhaven.cc/api/v1/w/${id}`, { headers: { 'User-Agent': 'Lumen' } });
  if (!r.ok) return null;
  const w = (await r.json()).data;
  if (w.purity !== 'sfw') return null; // never serve anything Wallhaven doesn't mark safe for work
  return { id: 'wh_' + w.id, source: 'wallhaven', thumb: w.thumbs.large, src: w.path, color: w.colors[0] || '#222', page: w.url };
}

async function unsplash(id, key) {
  if (!key) return null;
  const r = await fetch(`https://api.unsplash.com/photos/${id}`, { headers: { Authorization: 'Client-ID ' + key, 'Accept-Version': 'v1' } });
  if (!r.ok) return null;
  const p = await r.json();
  return { id: 'us_' + p.id, source: 'unsplash', thumb: p.urls.small, src: p.urls.raw + '&w=2560&q=80&fm=jpg&fit=max', color: p.color, credit: { name: p.user.name, link: p.user.links.html }, dl: p.links.download_location };
}

export async function buildCollections({ list, read, unsplashKey }) {
  const out = [];
  for (const id of await list()) {
    const text = await read(id).catch(() => '');
    const links = text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).map(parseLink).filter(Boolean);
    const unique = links.filter((l, i) => links.findIndex((x) => x.kind === l.kind && x.id === l.id) === i).slice(0, MAX_PER_COLLECTION);
    // One at a time: Wallhaven allows 45 calls a minute, and this runs about once an hour.
    const photos = [];
    for (const l of unique) {
      const p = await (l.kind === 'wallhaven' ? wallhaven(l.id) : unsplash(l.id, unsplashKey)).catch(() => null);
      if (p) photos.push(p);
    }
    if (photos.length) out.push({ id, name: title(id), photos });
  }
  return { collections: out };
}

const gh = { headers: { 'User-Agent': 'Lumen', ...(process.env.GITHUB_TOKEN ? { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN } : {}) } };

export async function GET(request) {
  const origin = allowedOrigin(request.headers.get('origin'));
  if (!origin) return new Response('Forbidden', { status: 403 });
  const cors = { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' };

  try {
    const data = await buildCollections({
      list: async () => {
        const r = await fetch(`https://api.github.com/repos/${REPO}/contents/collections?ref=${BRANCH}`, gh);
        if (!r.ok) throw new Error('GitHub ' + r.status);
        return (await r.json()).filter((f) => f.type === 'dir' && /^[a-z0-9-]+$/.test(f.name)).map((f) => f.name);
      },
      read: async (id) => {
        const r = await fetch(`https://raw.githubusercontent.com/${REPO}/${BRANCH}/collections/${id}/links.txt`);
        return r.ok ? r.text() : '';
      },
      unsplashKey: process.env.UNSPLASH_ACCESS_KEY,
    });
    return new Response(JSON.stringify(data), {
      headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    });
  } catch (e) {
    return new Response('Collections unavailable', { status: 502, headers: cors });
  }
}
