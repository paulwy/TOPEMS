#!/usr/bin/env python3
"""
TOPEMS 2.4 性能测试验收脚本
验收标准：50 VUs 压力测试下服务稳定运行 3 分钟；核心 API 端点 P95 < 2s。

用法：
    python3 stress_acceptance.py --url http://localhost:8099 --concurrent 50 --duration 180

指标：
    - 每端点：请求数、成功率、p50/p95/p99 延迟（ms）、吞吐（req/s）
    - 服务稳定性：压测前后 health 探活
    - 达标判定：P95 < 2000ms 且成功率 >= 99%
"""

import argparse
import json
import statistics
import time
import concurrent.futures
import urllib.request
import urllib.error
import sys
from datetime import datetime
from collections import defaultdict

CORE_ENDPOINTS = [
    "/api/server/health",
    "/api/crm/customers",
    "/api/erp/sales-orders",
    "/api/finance/vouchers",
    "/api/qms/checks",
    "/api/scm/suppliers",
    "/api/wms/inventory",
    "/api/hrm/employees",
]


def percentile(data, p):
    if not data:
        return 0.0
    s = sorted(data)
    k = (len(s) - 1) * p / 100.0
    f = int(k)
    c = min(f + 1, len(s) - 1)
    return s[f] + (s[c] - s[f]) * (k - f)


def probe(url, timeout=5):
    """探活，返回 (ok, latency_ms)"""
    try:
        start = time.time()
        with urllib.request.urlopen(url + "/api/server/health", timeout=timeout) as r:
            r.read()
            return r.status == 200, (time.time() - start) * 1000
    except Exception:
        return False, -1


def main():
    parser = argparse.ArgumentParser(description="TOPEMS 50VU 压力测试验收")
    parser.add_argument("--url", default="http://localhost:8099")
    parser.add_argument("--concurrent", type=int, default=50)
    parser.add_argument("--duration", type=int, default=180)
    parser.add_argument("--endpoints", nargs="*", default=CORE_ENDPOINTS)
    parser.add_argument("--output", default="stress_acceptance_report.json")
    args = parser.parse_args()

    base = args.url.rstrip("/")
    print("=" * 80)
    print("  TOPEMS 性能验收压测（2.4）")
    print("=" * 80)
    print(f"目标: {base} | 并发: {args.concurrent} VU | 时长: {args.duration}s")
    print(f"端点数: {len(args.endpoints)}")

    # 压测前探活
    ok, _ = probe(base)
    if not ok:
        print(f"[FAIL] 压测前 health 探活失败: {base}/api/server/health")
        sys.exit(1)
    print(f"[OK] 压测前服务健康")

    start_time = time.time()
    end_time = start_time + args.duration
    per_endpoint = defaultdict(lambda: {"ok": 0, "fail": 0, "lat": []})
    total_req = 0
    total_ok = 0

    endpoint_idx = [0]

    def make_request():
        nonlocal total_req, total_ok
        ep = args.endpoints[endpoint_idx[0] % len(args.endpoints)]
        endpoint_idx[0] += 1
        url = base + ep
        try:
            req = urllib.request.Request(url)
            t0 = time.time()
            with urllib.request.urlopen(req, timeout=30) as resp:
                resp.read()
                lat = (time.time() - t0) * 1000
            s = per_endpoint[ep]
            if 200 <= resp.status < 300:
                s["ok"] += 1
                total_ok += 1
            else:
                s["fail"] += 1
            s["lat"].append(lat)
        except Exception:
            per_endpoint[ep]["fail"] += 1
        total_req += 1

    with concurrent.futures.ThreadPoolExecutor(max_workers=args.concurrent) as executor:
        futures = []
        while time.time() < end_time:
            futures.append(executor.submit(make_request))
            if len(futures) >= args.concurrent * 4:
                concurrent.futures.wait(futures, return_when=concurrent.futures.FIRST_COMPLETED)
                futures = [f for f in futures if not f.done()]
        concurrent.futures.wait(futures)

    actual_duration = time.time() - start_time

    # 压测后探活（服务稳定性）
    ok_after, _ = probe(base)
    stable = ok_after

    print()
    print("-" * 80)
    print(f"总请求: {total_req} | 成功: {total_ok} | 失败: {total_req - total_ok}")
    print(f"总成功率: {total_ok / total_req * 100:.2f}% | 吞吐: {total_req / actual_duration:.2f} req/s")
    print(f"实际时长: {actual_duration:.1f}s | 压测后服务健康: {'是' if stable else '否'}")
    print("-" * 80)
    print(f"{'端点':<38}{'请求':>7}{'成功率':>9}{'P50':>9}{'P95':>9}{'P99':>9}{'req/s':>9}  P95<2s")
    print("-" * 80)

    report = {
        "timestamp": datetime.now().isoformat(),
        "url": base,
        "concurrent": args.concurrent,
        "duration": actual_duration,
        "total_requests": total_req,
        "total_success": total_ok,
        "success_rate": total_ok / total_req * 100 if total_req else 0,
        "throughput_rps": total_req / actual_duration,
        "stable_after": stable,
        "endpoints": {},
        "acceptance": {},
    }

    all_pass = True
    for ep in args.endpoints:
        s = per_endpoint[ep]
        req = s["ok"] + s["fail"]
        rate = s["ok"] / req * 100 if req else 0
        lat = s["lat"]
        p50 = percentile(lat, 50) if lat else 0
        p95 = percentile(lat, 95) if lat else 0
        p99 = percentile(lat, 99) if lat else 0
        rps = req / actual_duration
        p95_ok = p95 < 2000
        rate_ok = rate >= 99
        ep_pass = p95_ok and rate_ok and req > 0
        if not ep_pass:
            all_pass = False
        mark = "PASS" if ep_pass else "FAIL"
        print(f"{ep:<38}{req:>7}{rate:>8.1f}%{p50:>8.0f}{p95:>9.0f}{p99:>9.0f}{rps:>9.1f}  {mark}")
        report["endpoints"][ep] = {
            "requests": req, "success_rate": rate,
            "p50_ms": round(p50, 2), "p95_ms": round(p95, 2), "p99_ms": round(p99, 2),
            "rps": round(rps, 2),
        }
        report["acceptance"][ep] = {
            "p95_lt_2s": p95_ok, "success_rate_ge_99": rate_ok, "pass": ep_pass,
        }

    stable_pass = stable
    overall = all_pass and stable_pass
    report["acceptance"]["overall"] = overall
    report["acceptance"]["service_stable"] = stable_pass

    print("-" * 80)
    print(f"验收结论: {'✅ 全部通过（P95<2s 且服务稳定）' if overall else '❌ 未通过'}")

    with open(args.output, "w") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print(f"报告已写入: {args.output}")

    sys.exit(0 if overall else 1)


if __name__ == "__main__":
    main()
