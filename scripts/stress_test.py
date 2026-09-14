#!/usr/bin/env python3
"""TOPEMS 性能压测工具（兼容历史 reports/stress_*.json 格式）。

支持三种场景：
  smoke   — 10 VUs，15 秒，快速验证服务可用性
  average — 20 VUs，60 秒，典型负载基准
  stress  — 50 VUs，180 秒，压力测试（验收标准）

用法：
  python3 scripts/stress_test.py --scenario smoke --base-url http://localhost:8099
  python3 scripts/stress_test.py --scenario stress --base-url http://localhost:8099 --output reports/stress_stress.json
"""
import argparse
import asyncio
import json
import statistics
import sys
import time
from datetime import datetime, timezone
from urllib.parse import urljoin

try:
    import httpx
except ImportError:
    print("需要 httpx: pip3 install httpx", file=sys.stderr)
    sys.exit(1)

# 压测端点配置（与历史报告对齐）
ENDPOINTS = [
    {"path": "/api/server/health", "method": "GET", "weight": 1},
    {"path": "/api/crm/customers", "method": "GET", "weight": 1},
    {"path": "/api/erp/sales-orders", "method": "GET", "weight": 1},
    {"path": "/api/finance/vouchers", "method": "GET", "weight": 1},
    {"path": "/api/ai/dsh/chat", "method": "POST", "weight": 1,
     "json": {"message": "性能测试", "session_id": "perf-test"}},
    {"path": "/api/bi/dashboard", "method": "GET", "weight": 1},
    {"path": "/api/portal/graphql", "method": "POST", "weight": 1,
     "json": {"query": "{ __typename }"}},
    {"path": "/api/hrm/employees", "method": "GET", "weight": 1},
]

SCENARIOS = {
    "smoke": {"vus": 10, "duration": 15},
    "average": {"vus": 20, "duration": 60},
    "stress": {"vus": 50, "duration": 180},
}


class EndpointStats:
    def __init__(self):
        self.requests = 0
        self.success = 0
        self.failures = 0
        self.latencies = []

    def record(self, ok: bool, latency_ms: float):
        self.requests += 1
        if ok:
            self.success += 1
        else:
            self.failures += 1
        self.latencies.append(latency_ms)

    def summary(self) -> dict:
        if not self.latencies:
            return {"requests": 0, "success_rate": 0.0, "p50_ms": 0, "p95_ms": 0, "p99_ms": 0, "rps": 0}
        sorted_lat = sorted(self.latencies)
        n = len(sorted_lat)
        p50 = sorted_lat[int(n * 0.50)] if n > 0 else 0
        p95 = sorted_lat[min(int(n * 0.95), n - 1)]
        p99 = sorted_lat[min(int(n * 0.99), n - 1)]
        return {
            "requests": self.requests,
            "success_rate": round(self.success / self.requests * 100, 2) if self.requests else 0.0,
            "p50_ms": round(p50, 2),
            "p95_ms": round(p95, 2),
            "p99_ms": round(p99, 2),
            "rps": round(self.requests / max(1, sum(self.latencies) / 1000 * self.requests), 2),
        }


async def worker(worker_id: int, base_url: str, duration: float, stats: dict, stop_event: asyncio.Event):
    """单个 VU 循环发请求直到时间到。"""
    deadline = time.time() + duration
    client = httpx.AsyncClient(timeout=10.0, limits=httpx.Limits(max_connections=10))
    endpoint_idx = 0
    try:
        while time.time() < deadline and not stop_event.is_set():
            ep = ENDPOINTS[endpoint_idx % len(ENDPOINTS)]
            endpoint_idx += 1
            url = urljoin(base_url, ep["path"])
            start = time.perf_counter()
            try:
                if ep["method"] == "GET":
                    resp = await client.get(url)
                else:
                    resp = await client.post(url, json=ep.get("json", {}))
                ok = resp.status_code < 500
                latency = (time.perf_counter() - start) * 1000
                stats[ep["path"]].record(ok, latency)
            except Exception as e:
                latency = (time.perf_counter() - start) * 1000
                stats[ep["path"]].record(False, latency)
                if worker_id == 0:
                    print(f"  [warn] {ep['path']} 请求失败: {e}", file=sys.stderr)
            await asyncio.sleep(0.001)  # 防止 CPU 打满
    finally:
        await client.aclose()


async def run_scenario(scenario: str, base_url: str, output: str = None):
    cfg = SCENARIOS[scenario]
    vus = cfg["vus"]
    duration = cfg["duration"]

    print(f"=== TOPEMS 性能压测 ===")
    print(f"场景: {scenario}  VUs: {vus}  时长: {duration}s  目标: {base_url}")
    print(f"端点: {len(ENDPOINTS)} 个")

    # 预热：检查服务可达
    print("\n[预热] 检查服务健康...")
    try:
        async with httpx.AsyncClient(timeout=5.0) as c:
            resp = await c.get(urljoin(base_url, "/api/server/health"))
            print(f"  健康检查: HTTP {resp.status_code}")
    except Exception as e:
        print(f"  [错误] 服务不可达: {e}", file=sys.stderr)
        print("  请先启动后端服务（cargo run -p topems-portal 或对应服务）", file=sys.stderr)
        sys.exit(1)

    stats = {ep["path"]: EndpointStats() for ep in ENDPOINTS}
    stop_event = asyncio.Event()

    print(f"\n[压测] 启动 {vus} 个 VU，运行 {duration} 秒...")
    start_time = time.time()
    workers = [asyncio.create_task(worker(i, base_url, duration, stats, stop_event)) for i in range(vus)]
    await asyncio.gather(*workers)
    total_duration = time.time() - start_time

    # 汇总
    total_requests = sum(s.requests for s in stats.values())
    total_success = sum(s.success for s in stats.values())
    all_latencies = [lat for s in stats.values() for lat in s.latencies]
    all_latencies.sort()

    report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "url": base_url,
        "scenario": scenario,
        "concurrent": vus,
        "duration": round(total_duration, 2),
        "total_requests": total_requests,
        "total_success": total_success,
        "success_rate": round(total_success / total_requests * 100, 2) if total_requests else 0.0,
        "throughput_rps": round(total_requests / total_duration, 2) if total_duration else 0,
        "global_p50_ms": round(all_latencies[int(len(all_latencies) * 0.50)], 2) if all_latencies else 0,
        "global_p95_ms": round(all_latencies[min(int(len(all_latencies) * 0.95), len(all_latencies) - 1)], 2) if all_latencies else 0,
        "global_p99_ms": round(all_latencies[min(int(len(all_latencies) * 0.99), len(all_latencies) - 1)], 2) if all_latencies else 0,
        "stable_after": total_success == total_requests,
        "endpoints": {path: s.summary() for path, s in stats.items()},
    }

    # 输出摘要
    print(f"\n=== 结果摘要 ===")
    print(f"总请求: {total_requests}  成功: {total_success}  成功率: {report['success_rate']}%")
    print(f"吞吐量: {report['throughput_rps']} RPS")
    print(f"全局 P50: {report['global_p50_ms']}ms  P95: {report['global_p95_ms']}ms  P99: {report['global_p99_ms']}ms")
    print(f"服务稳定: {'是' if report['stable_after'] else '否'}")

    # 验收标准检查（stress 场景）
    if scenario == "stress":
        p95_ok = report["global_p95_ms"] < 2000
        stable_ok = report["stable_after"] and total_duration >= 170  # 接近 180s
        print(f"\n=== 验收标准（50 VUs / 3min / P95<2s）===")
        print(f"  P95 < 2s: {'✅ 通过' if p95_ok else '❌ 未通过'} ({report['global_p95_ms']}ms)")
        print(f"  服务稳定: {'✅ 通过' if stable_ok else '❌ 未通过'} ({total_duration:.0f}s, 成功率 {report['success_rate']}%)")

    # 慢端点（P95 > 2s）
    slow = [(p, s["p95_ms"]) for p, s in report["endpoints"].items() if s["p95_ms"] > 2000]
    if slow:
        print(f"\n⚠️  慢端点（P95 > 2s）:")
        for path, p95 in slow:
            print(f"  {path}: P95={p95}ms")

    # 写报告
    if output:
        with open(output, "w") as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        print(f"\n报告已写入: {output}")

    return report


def main():
    parser = argparse.ArgumentParser(description="TOPEMS 性能压测工具")
    parser.add_argument("--scenario", choices=["smoke", "average", "stress"], default="smoke")
    parser.add_argument("--base-url", default="http://localhost:8099")
    parser.add_argument("--output", default=None, help="JSON 报告输出路径")
    args = parser.parse_args()

    output = args.output or f"tests/performance/reports/stress_{args.scenario}.json"
    asyncio.run(run_scenario(args.scenario, args.base_url, output))


if __name__ == "__main__":
    main()
