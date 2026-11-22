// Lumen's Wallhaven proxy. Wallhaven's API sends no CORS headers, so the extension can't call it
// directly without asking for a host permission. Going through here needs none.
//   GET /api/wallhaven?q=forest   search, returns Wallhaven's JSON as-is
// Same origin rule as unsplash.js: only Chrome extensions (or ALLOWED_ORIGINS) may call it.
// Wallhaven allows 45 calls a minute per IP, shared by every Lumen user, so results are cached for an hour.

const API = 'https://wallhaven.cc/api/v1/search';

function allowedOrigin(origin) {
  if (!origin) return null;
  const list = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (list.length) return list.includes(origin) ? origin : null;
  return origin.startsWith('chrome-extension://') ? origin : null;
}

export async function GET(request) {
  const origin = allowedOrigin(request.headers.get('origin'));
  if (!origin) return new Response('Forbidden', { status: 403 });
  const cors = { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' };

  const q = (new URL(request.url).searchParams.get('q') || 'landscape').slice(0, 100);
  // Fixed filters, as in the prototype's serve.py: general and anime categories (no people), safe for work, at least 1920x1080.
  const params = new URLSearchParams({ q, categories: '110', purity: '100', atleast: '1920x1080', sorting: 'relevance' });
  const r = await fetch(`${API}?${params}`, { headers: { 'User-Agent': 'Lumen' } }).catch(() => null);
  if (!r) return new Response('Wallhaven unreachable', { status: 502, headers: cors });
  return new Response(await r.text(), {
    status: r.status,
    headers: { ...cors, 'Content-Type': 'application/json', ...(r.ok ? { 'Cache-Control': 'public, s-maxage=3600' } : {}) },
  });
}
