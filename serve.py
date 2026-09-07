#!/usr/bin/env python3
"""Local static server with Vercel-style clean URLs (no .html in the address bar).

Usage:
  python3 serve.py
  python3 serve.py 5500
"""

from __future__ import annotations

import argparse
import os
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlsplit


REDIRECTS = {
    "/upcoming-trips": "/explore-trips",
    "/upcoming-trips/": "/explore-trips",
    "/index.html": "/",
    "/trips": "/explore-trips",
    "/trips/": "/explore-trips",
    "/about": "/our-story",
    "/about/": "/our-story",
    "/gallery": "/captured-journeys",
    "/gallery/": "/captured-journeys",
    "/testimonials": "/travel-stories",
    "/testimonials/": "/travel-stories",
    "/contact": "/lets-connect",
    "/contact/": "/lets-connect",
}


class CleanURLHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        **getattr(SimpleHTTPRequestHandler, "extensions_map", {}),
        ".html": "text/html; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".svg": "image/svg+xml",
        ".webp": "image/webp",
        ".woff2": "font/woff2",
    }

    def do_GET(self):  # noqa: N802
        if self._handle_clean_url():
            return
        super().do_GET()

    def do_HEAD(self):  # noqa: N802
        if self._handle_clean_url():
            return
        super().do_HEAD()

    def _handle_clean_url(self) -> bool:
        parts = urlsplit(self.path)
        path = unquote(parts.path)
        query = f"?{parts.query}" if parts.query else ""

        if path in REDIRECTS:
            self.send_response(301)
            self.send_header("Location", REDIRECTS[path] + query)
            self.end_headers()
            return True

        # /page.html → /page
        if path.endswith(".html") and path != "/index.html":
            clean = path[: -len(".html")]
            local = self.translate_path(path)
            if os.path.isfile(local):
                self.send_response(301)
                self.send_header("Location", clean + query)
                self.end_headers()
                return True

        # /page → page.html
        if path != "/" and not os.path.splitext(path)[1]:
            html_path = path.rstrip("/") + ".html"
            local = self.translate_path(html_path)
            if os.path.isfile(local):
                self.path = html_path + query
                return False

        return False

    def log_message(self, fmt: str, *args) -> None:
        sys_stderr = __import__("sys").stderr
        sys_stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve TRAVELRAYZ with clean URLs")
    parser.add_argument("port", nargs="?", type=int, default=5500)
    args = parser.parse_args()

    root = os.path.dirname(os.path.abspath(__file__))
    handler = partial(CleanURLHandler, directory=root)
    server = ThreadingHTTPServer(("127.0.0.1", args.port), handler)
    print(f"Serving {root}")
    print(f"Open http://127.0.0.1:{args.port}/  (clean URLs enabled)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
