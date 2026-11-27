#!/usr/bin/env python3
"""把被 spec 清理误删、但线上仍然存活的 (path, method) 从历史版本恢复回 spec。

背景：`fd5197008 fix(ci): OpenAPI 清理 370 条` 这类"清理"如果按生成器输出或
人工名单裁剪，很容易连真实路由一起删掉；同一 path 也可能只留下部分 method。
本脚本对每个"历史版本有、当前文件没有"的 operation 打一次真实请求，
只有 404/405 才判定为真删，其余一律恢复（并保留原 operation 定义）。

用法：
  python3 scripts/ci/restore_pruned_ops.py --base c0bc69540 --apply
  python3 scripts/ci/restore_pruned_ops.py --base-file /tmp/old.json --token-file /tmp/tok.txt --base-url http://127.0.0.1:8099

退出码：0 正常（无论是否恢复）；1 参数/文件错误。
"""
from __future__ import annotations

import argparse
import http.client
import json
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

HTTP_METHODS = ("get", "post", "put", "delete", "patch")
TENANT = "00000000-0000-0000-0000-000000000001"


def arg_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser()
    p.add_argument("--base", default="origin/main", help="历史版本 git ref")
    p.add_argument("--base-file", help="历史 spec 文件（优先于 --base）")
    p.add_argument("--spec", default="docs/api/openapi.json")
    p.add_argument("--base-url", default="http://127.0.0.1:8099")
    p.add_argument("--token-file", default="/tmp/tok17.txt")
    p.add_argument("--tenant", default=TENANT)
    p.add_argument("--concurrency", type=int, default=8)
    p.add_argument("--apply", action="store_true")
    return p


def load_base(args: argparse.Namespace) -> dict:
    if args.base_file:
        return json.load(open(args.base_file))
    raw = subprocess.check_output(["git", "show", f"{args.base}:{args.spec}"], text=True)
    return json.loads(raw)


def probe(host: str, port: int, token: str, tenant: str, path: str, method: str) -> int:
    conn = http.client.HTTPConnection(host, port, timeout=15)
    body = b"{}" if method != "get" else None
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Tenant-Id": tenant,
        "Content-Type": "application/json",
    }
    try:
        conn.request(method.upper(), path, body=body, headers=headers)
        resp = conn.getresponse()
        resp.read()
        return resp.status
    except Exception:
        return 0


def main() -> int:
    args = arg_parser().parse_args()
    base_paths = load_base(args)["paths"]
    cur = json.load(open(args.spec))
    cur_paths = cur["paths"]

    jobs = [
        (p, m)
        for p, item in base_paths.items()
        for m in item
        if m in HTTP_METHODS and m not in cur_paths.get(p, {})
    ]
    if not jobs:
        print("没有缺失的 operation，无需恢复")
        return 0

    token = open(args.token_file).read().strip()
    url = args.base_url.split("://", 1)[1]
    host, _, port_s = url.partition(":")
    port = int(port_s or 80)

    live: list[tuple[str, str]] = []
    dead: list[tuple[str, str, int]] = []
    with ThreadPoolExecutor(max_workers=args.concurrency) as ex:
        for (p, m), code in zip(
            jobs,
            ex.map(lambda j: probe(host, port, token, args.tenant, j[0], j[1]), jobs),
        ):
            if code in (404, 405):
                dead.append((p, m, code))
            else:
                live.append((p, m))

    print(f"缺失 operation {len(jobs)} / 线上存活 {len(live)} / 真删 {len(dead)}")
    for p, m, code in dead:
        print(f"  DEAD {m.upper():6} {p}  (HTTP {code})")

    if args.apply and live:
        for p, m in live:
            cur_paths.setdefault(p, {})[m] = base_paths[p][m]
        json.dump(cur, open(args.spec, "w"), ensure_ascii=False, separators=(",", ":"))
        print(f"已恢复 {len(live)} 个 operation，spec paths={len(cur_paths)}")
    elif live:
        print("干跑：加 --apply 写回 spec")
    return 0


if __name__ == "__main__":
    sys.exit(main())
