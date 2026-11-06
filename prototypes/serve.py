"""Lumen prototype dev server: static files plus a Wallhaven search pass-through.

Wallhaven's API sends no CORS headers, so a web page can't call it directly. The real
extension calls it through host_permissions; this server stands in for that during
prototyping. Run from this folder:  python3 serve.py   (serves http://localhost:5173)
"""
import json
import os
import ssl
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

API = "https://wallhaven.cc/api/v1/search"
# python.org builds on macOS ship without CA certificates; fall back to the system bundle.
CTX = ssl.create_default_context(cafile="/etc/ssl/cert.pem" if os.path.exists("/etc/ssl/cert.pem") else None)


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        url = urllib.parse.urlparse(self.path)
        if url.path != "/api/wallhaven":
            return super().do_GET()
        q = urllib.parse.parse_qs(url.query).get("q", [""])[0][:100]
        # Fixed filters: general category, safe for work only, at least 1920x1080.
        params = urllib.parse.urlencode({"q": q, "categories": "100", "purity": "100", "atleast": "1920x1080", "sorting": "relevance"})
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


if __name__ == "__main__":
    print("Lumen prototype on http://localhost:5173")
    ThreadingHTTPServer(("127.0.0.1", 5173), Handler).serve_forever()
