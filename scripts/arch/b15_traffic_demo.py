#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
B15 流量构造与 --collect 工具链验证脚本。

启动一个本地 mock /metrics 端点，输出包含 topems_service_to_service_calls_total
（新双 label 格式：service=caller, target=callee），然后调用 service_topology.py
--collect 验证脚本能正确解析并生成边矩阵。

真实业务流量（erp 写→事件→search 投影、finance/wms/hrm/scm 各 1 链路）
需完整服务集群 + DB + Redis + 业务数据，本地演练环境无法覆盖——
本脚本仅验证 --collect 工具链可用性与输出格式正确性。
"""
import http.server
import json
import os
import subprocess
import sys
import threading
import time

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 模拟两个进程的 /metrics 输出：
# - crm:8029（调用方进程）：含出站埋点 service=crm-service,target=erp-service
# - erp:8010（被调方进程）：含入站埋点 service=crm-service（旧单 label 兼容）
MOCK_METRICS = {
    18029: """# HELP topems_service_to_service_calls_total Total number of service-to-service calls by calling service (service=调用方, target=被调方)
# TYPE topems_service_to_service_calls_total counter
topems_service_to_service_calls_total{service="crm-service",target="erp-service"} 3
topems_service_to_service_calls_total{service="crm-service",target="wms-service"} 2
topems_service_to_service_calls_total{service="crm-service",target="workflow-service"} 1
# HELP axum_http_requests_total HTTP requests
# TYPE axum_http_requests_total counter
axum_http_requests_total{method="GET",status="200"} 5
""",
    18010: """# HELP topems_service_to_service_calls_total Total number of service-to-service calls
# TYPE topems_service_to_service_calls_total counter
topems_service_to_service_calls_total{service="crm-service"} 3
topems_service_to_service_calls_total{service="search-service"} 1
# HELP axum_http_requests_total HTTP requests
# TYPE axum_http_requests_total counter
axum_http_requests_total{method="POST",status="200"} 4
""",
}


class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        body = MOCK_METRICS.get(self.server.server_address[1], "")
        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body.encode())

    def log_message(self, *args):
        pass


def main():
    # Start mock servers
    servers = []
    for port in MOCK_METRICS:
        s = http.server.HTTPServer(("127.0.0.1", port), Handler)
        threading.Thread(target=s.serve_forever, daemon=True).start()
        servers.append(s)
        print(f"[mock] /metrics on port {port}")

    time.sleep(0.3)

    # Run --collect
    specs = ",".join(f"crm:{p}" if p == 18029 else f"erp:{p}" for p in MOCK_METRICS)
    print(f"\n[collect] specs: {specs}")
    print("-" * 60)
    result = subprocess.run(
        [sys.executable, os.path.join(REPO, "scripts/arch/service_topology.py"),
         "--collect", specs],
        capture_output=True, text=True, cwd=REPO,
    )
    print(result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)
    print("-" * 60)

    # Show generated CSV
    csv_path = os.path.join(REPO, "docs/architecture/service-topology/service-dependency-matrix.runtime.csv")
    print(f"\n[output] {csv_path}")
    with open(csv_path) as f:
        print(f.read())

    for s in servers:
        s.shutdown()


if __name__ == "__main__":
    main()
