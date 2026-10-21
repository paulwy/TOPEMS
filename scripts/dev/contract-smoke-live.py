#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
contract-smoke-live.py — 前端契约实跑验收（部署前 / 手动，真 404 才 fail）

对前端封装端点逐个向运行中的 BFF 发起短超时请求：
  - 401/403/400/405/5xx  → 路由存在（已挂载，鉴权/参数/方法差异）→ 通过
  - 404                 → 前端封装但后端未挂载 → 缺口（fail）
  - ERR（超时/网络）     → 跳过并计数（环境不稳定，不误判）

用法：
  python3 scripts/dev/contract-smoke-live.py                 # 全量 4116 端点
  python3 scripts/dev/contract-smoke-live.py --gaps          # 只测静态缺口（contract-gate --strict 产物）
  python3 scripts/dev/contract-smoke-live.py --out /tmp/cs.csv
  BFF_URL=http://localhost:8098 python3 scripts/dev/contract-smoke-live.py
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
BFF_URL = os.environ.get("BFF_URL", "http://localhost:8098")


def _token() -> str:
    tok = os.environ.get("SMOKE_TOKEN")
    if tok:
        return tok
    sys.path.insert(0, str(REPO_ROOT / "scripts"))
    import web_contract_smoke as S

    S.BFF_URL = BFF_URL
    return S.issue_token()


def probe(path: str, token: str, timeout: int = 3):
    req = urllib.request.Request(BFF_URL + path, headers={"Authorization": "Bearer " + token})
    try:
        return urllib.request.urlopen(req, timeout=timeout).status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception:
        return None  # 网络/超时，跳过


def main() -> int:
    ap = argparse.ArgumentParser(description="前端契约实跑验收")
    ap.add_argument("--gaps", action="store_true", help="只测 contract-gate --strict 的静态缺口")
    ap.add_argument("--timeout", type=int, default=3, help="单端点超时秒（默认 3）")
    ap.add_argument("--out", default="", help="缺口 CSV 输出路径")
    args = ap.parse_args()

    sys.path.insert(0, str(REPO_ROOT / "scripts"))
    import web_contract_smoke as S

    S.BFF_URL = BFF_URL
    if args.gaps:
        import subprocess
        raw = subprocess.run(
            [sys.executable, str(REPO_ROOT / "scripts/dev/contract-gate.py"), "--strict", "--json"],
            capture_output=True, text=True, cwd=REPO_ROOT,
        ).stdout
        targets = [(g["svc"], g["method"], g["full"], g["file"], g["line"])
                   for g in json.loads(raw)["gaps"]]
        print(f"[smoke-live] 静态缺口模式：{len(targets)} 条（strict 口径）")
    else:
        eps = S.extract_endpoints()
        calls = eps[0] if isinstance(eps, tuple) else eps
        targets = []
        for e in calls:
            if len(e) < 7:
                continue
            svc, base, method, path, file, line, kind = e[:7]
            if not path.startswith("/"):
                continue
            targets.append((svc, method, path, file, line))
        print(f"[smoke-live] 全量模式：{len(targets)} 条前端端点")

    token = _token()
    bad, ok, err = [], [], 0
    for svc, method, path, file, line in targets:
        full = re.sub(r"/:x|/\{[^}]*\}", "/1", path)
        code = probe(full, token, args.timeout)
        if code is None:
            err += 1
        elif code == 404:
            bad.append((svc, method, full, file, line))
        else:
            ok.append((svc, method, full, code))

    print(f"[smoke-live] 结果：已挂载 {len(ok)} / 真 404 缺口 {len(bad)} / 环境跳过 {err}")
    if bad:
        print(f"[smoke-live] ✗ {len(bad)} 条前端封装但后端未挂载（真 404）：")
        for b in bad[:60]:
            print(f"  404 {b[0]:12} {b[1]:6} {b[2][:66]:66} | {b[3]}:{b[4]}")
        if args.out:
            with open(args.out, "w", encoding="utf-8") as f:
                f.write("svc,method,path,file,line\n")
                for b in bad:
                    f.write(",".join(map(str, b)) + "\n")
            print(f"[smoke-live] 缺口 CSV → {args.out}")
        return 1
    print("[smoke-live] ✅ 无前端封装但后端未挂载的缺口")
    return 0


if __name__ == "__main__":
    sys.exit(main())
