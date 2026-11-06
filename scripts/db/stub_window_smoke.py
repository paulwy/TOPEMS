#!/usr/bin/env python3
"""窗口冒烟 stub（本地演练用，不连库、不对外）。

模拟 dict-replay-window.sh smoke 需要的 3 个端点：
  GET  /api/master-data/dict/dict-types   -> 超管 77 类（含 4 个 legacy）；普通租户 0 类
  POST /api/communication/notification/notifications -> 200
  GET  /health -> 200

用法：python3 scripts/db/stub_window_smoke.py --port 18099
请求逐条打印 METHOD PATH STATUS，供演练留存。
"""
import argparse
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

DICT_URL = "/api/master-data/dict/dict-types"
NOTIFY_URL = "/api/communication/notification/notifications"
LEGACY = [{"code": c} for c in ("department_type", "education", "marital_status", "position_level")]


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        return

    def _send(self, code, payload):
        body = json.dumps(payload, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
        print(f"{self.command} {self.path.split('?')[0]} {code}", flush=True)

    def do_GET(self):
        if self.path == "/health":
            self._send(200, {"status": "ok"})
            return
        if self.path.split("?")[0] == DICT_URL:
            auth = self.headers.get("Authorization", "")
            if auth == "Bearer super":
                items = LEGACY + [{"code": "common_status"}, {"code": "currency"}]
                self._send(200, {"data": {"total": 77, "items": items}})
            elif auth == "Bearer tenant":
                self._send(200, {"data": {"total": 0, "items": []}})
            else:
                self._send(401, {"error": "unauthorized"})
            return
        self._send(404, {"error": "not found"})

    def do_POST(self):
        if self.path.split("?")[0] == NOTIFY_URL:
            n = int(self.headers.get("Content-Length", 0))
            if n:
                self.rfile.read(n)
            self._send(200, {"data": {"id": "stub-notify-0001"}})
            return
        self._send(404, {"error": "not found"})


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=18099)
    args = ap.parse_args()
    srv = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"stub listening on 127.0.0.1:{args.port}", flush=True)
    srv.serve_forever()


if __name__ == "__main__":
    main()
