// Lumen's Unsplash proxy. The extension calls this instead of Unsplash so the
// access key stays in Vercel (env UNSPLASH_ACCESS_KEY) and never ships in the bundle.
//   GET /api/unsplash?q=forest       search, returns Unsplash's JSON as-is
//   GET /api/unsplash?dl=<url>       the "photo was used" ping Unsplash requires
// Only Chrome extensions may call it from a browser. Set ALLOWED_ORIGINS
// (comma-separated chrome-extension://<id>) to lock it to Lumen's IDs.

const API = 'https://api.unsplash.com';

function allowedOrigin(origin) {
  if (!origin) return null;
  const list = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (list.length) return list.includes(origin) ? origin : null;
  return origin.startsWith('chrome-extension://') ? origin : null;
}

export async function GET(request) {
  const origin = allowedOrigin(request.headers.get('origin'));
  if (!origin) return new Response('Forbidden', { status: 403 });
  const cors = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Expose-Headers': 'X-Ratelimit-Remaining', Vary: 'Origin' };

  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return new Response('Server is missing UNSPLASH_ACCESS_KEY', { status: 500, headers: cors });
  const auth = { Authorization: 'Client-ID ' + key, 'Accept-Version': 'v1' };

  const params = new URL(request.url).searchParams;
  const dl = params.get('dl');
  if (dl) {
    // Only forward to Unsplash's own download endpoints, never an arbitrary URL.
    if (!/^https:\/\/api\.unsplash\.com\/photos\/[\w-]+\/download(\?|$)/.test(dl)) return new Response('Bad dl', { status: 400, headers: cors });
    const r = await fetch(dl, { headers: auth });
    return new Response(null, { status: r.ok ? 204 : r.status, headers: cors });
  }

  const q = (params.get('q') || 'wallpaper').slice(0, 100);
  const r = await fetch(`${API}/search/photos?query=${encodeURIComponent(q)}&per_page=18&orientation=landscape&content_filter=high`, { headers: auth });
  return new Response(await r.text(), {
    status: r.status,
    headers: { ...cors, 'Content-Type': 'application/json', 'X-Ratelimit-Remaining': r.headers.get('X-Ratelimit-Remaining') || '' },
  });
}
