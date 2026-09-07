#!/usr/bin/env python3
"""Eureka REST 协议模拟服务器（本地集成测试用）。

背景：官方 springcloud/eureka 镜像为旧 v1 manifest（containerd v2.1 不再支持），
各镜像加速器对其返回 415/403，无法以容器方式运行真实 Eureka。
本服务器实现 Eureka REST 子集，用于验证 eureka_service_discovery 客户端的
register / discover / list_services / heartbeat / deregister / watch 交互逻辑。

仅存于内存，退出即清空。启动：python3 deploy/eureka-mock/server.py
"""
import json
from http.server import BaseHTTPRequestHandler, HTTPServer

REGISTRY: dict[str, dict[str, dict]] = {}  # app(大写) -> {instance_id -> instance}


class Handler(BaseHTTPRequestHandler):
    def _json(self, obj, status=200):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_body(self):
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0:
            return {}
        return json.loads(self.rfile.read(length))

    def _split(self):
        return [p for p in self.path.strip("/").split("/") if p]

    def do_POST(self):
        # POST /eureka/apps/{app}：注册实例
        parts = self._split()
        if len(parts) == 3 and parts[0] == "eureka" and parts[1] == "apps":
            body = self._read_body()
            inst = body.get("instance")
            if isinstance(inst, dict):
                iid = inst.get("instanceId", "")
                REGISTRY.setdefault(parts[2], {})[iid] = inst
                self._json({"ok": True})
                return
            self._json({"error": "missing instance"}, 400)
            return
        self._json({"error": "not found"}, 404)

    def do_PUT(self):
        # PUT /eureka/apps/{app}/{instanceId}：心跳续约
        parts = self._split()
        if len(parts) == 4 and parts[0] == "eureka" and parts[1] == "apps":
            app, iid = parts[2], parts[3]
            if app in REGISTRY and iid in REGISTRY[app]:
                self._json({"ok": True})
                return
            self._json({"error": "not found"}, 404)
            return
        self._json({"error": "not found"}, 404)

    def do_GET(self):
        parts = self._split()
        if parts == ["eureka", "apps"]:
            apps = [
                {"name": app, "instance": list(instances.values())}
                for app, instances in REGISTRY.items()
                if instances
            ]
            self._json({"applications": {"application": apps}})
            return
        if len(parts) == 3 and parts[0] == "eureka" and parts[1] == "apps":
            app = parts[2]
            instances = REGISTRY.get(app, {})
            if instances:
                self._json({"application": {"name": app, "instance": list(instances.values())}})
                return
            self._json({"error": "not found"}, 404)
            return
        self._json({"error": "not found"}, 404)

    def do_DELETE(self):
        # DELETE /eureka/apps/{app}/{instanceId}：注销实例
        parts = self._split()
        if len(parts) == 4 and parts[0] == "eureka" and parts[1] == "apps":
            app, iid = parts[2], parts[3]
            if app in REGISTRY and iid in REGISTRY[app]:
                del REGISTRY[app][iid]
                self._json({"ok": True})
                return
            self._json({"error": "not found"}, 404)
            return
        self._json({"error": "not found"}, 404)

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    HTTPServer(("127.0.0.1", 8761), Handler).serve_forever()
