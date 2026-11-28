"""Lumen prototype dev server: static files plus Wallhaven and search-suggestion pass-throughs.

Wallhaven's API sends no CORS headers, so a web page can't call it directly. The real
extension calls it through host_permissions; this server stands in for that during
prototyping. Run from this folder:  python3 serve.py   (serves http://localhost:5173)
"""
import json
import os
import re
import ssl
import subprocess
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

SUGGEST = {
    "google": "https://suggestqueries.google.com/complete/search?client=firefox&ie=utf-8&oe=utf-8&q=",
    "duckduckgo": "https://duckduckgo.com/ac/?type=list&q=",
    "bing": "https://api.bing.com/osjson.aspx?query=",
}
API = "https://wallhaven.cc/api/v1/search"
# python.org builds on macOS ship without CA certificates; fall back to the system bundle.
CTX = ssl.create_default_context(cafile="/etc/ssl/cert.pem" if os.path.exists("/etc/ssl/cert.pem") else None)


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        url = urllib.parse.urlparse(self.path)
        if url.path == "/api/suggest":
            return self.suggest(url)
        if url.path == "/api/collections":
            return self.collections()
        if url.path != "/api/wallhaven":
            return super().do_GET()
        q = urllib.parse.parse_qs(url.query).get("q", [""])[0][:100]
        # Fixed filters: general and anime categories, safe for work only, at least 1920x1080.
        params = urllib.parse.urlencode({"q": q, "categories": "110", "purity": "100", "atleast": "1920x1080", "sorting": "relevance"})
        try:
            req = urllib.request.Request(f"{API}?{params}", headers={"User-Agent": "Lumen-prototype"})
            with urllib.request.urlopen(req, timeout=10, context=CTX) as r:
                body, code = r.read(), 200
        except Exception as e:  # network down or Wallhaven error: say so, the page shows its error state
            body, code = json.dumps({"error": str(e)}).encode(), 502
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def suggest(self, url):
        params = urllib.parse.parse_qs(url.query)
        base, q = SUGGEST.get(params.get("engine", [""])[0]), params.get("q", [""])[0][:100]
        if not base or not q:
            return self.send_error(400)
        try:
            req = urllib.request.Request(base + urllib.parse.quote(q), headers={"User-Agent": "Lumen-prototype"})
            with urllib.request.urlopen(req, timeout=4, context=CTX) as r:
                data = json.loads(r.read().decode(r.headers.get_content_charset() or "utf-8"))
            body, code = json.dumps(data[:2]).encode(), 200
        except Exception as e:
            body, code = json.dumps({"error": str(e)}).encode(), 502
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def collections(self):
        # Same code as the live proxy, run on this checkout's collections/ folder (see collections-local.mjs).
        env = dict(os.environ)
        try:
            m = re.search(r'LUMEN_UNSPLASH_KEY\s*=\s*["\']([^"\']+)', open("config.local.js").read())
            if m:
                env["LUMEN_UNSPLASH_KEY"] = m.group(1)
        except OSError:
            pass
        try:
            out = subprocess.run(["node", "collections-local.mjs"], capture_output=True, timeout=120, env=env, check=True)
            body, code = out.stdout, 200
        except Exception as e:
            body, code = json.dumps({"error": str(e)}).encode(), 502
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        # Never write what someone typed in the search bar to the log.
        if getattr(self, "path", "").startswith("/api/suggest"):
            return
        super().log_message(fmt, *args)


if __name__ == "__main__":
    print("Lumen prototype on http://localhost:5173")
    ThreadingHTTPServer(("127.0.0.1", 5173), Handler).serve_forever()
