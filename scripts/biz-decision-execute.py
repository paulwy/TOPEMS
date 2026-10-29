#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
BIZ 204 处置执行器（预置，2026-10-30）
=====================================
读取 biz-final-review.csv 的 biz_decision 列，按决策分流并产出可执行批次：

- 接入候选      → artifacts/audit/orphan-review/biz-execute/bind/<svc>.csv
                  （含补绑目标文件建议：apps/web/src/api/<svc>/readOps{N+1}.ts）
- 内部保留      → 池 v74-rebuild-master.csv 标记 v74_tend=下线-内部保留
- 下线          → 池 v74-rebuild-master.csv 标记 v74_tend=下线-业务确认
- 其他/占位     → skipped 统计（不处置）

用法:
  python3 scripts/biz-decision-execute.py                 # 正式执行（写盘）
  python3 scripts/biz-decision-execute.py --dry-run       # 只统计/验证分流，不写盘
  python3 scripts/biz-decision-execute.py --sample N       # 用前 N 行样例（dry-run 验证逻辑）

输出:
  artifacts/audit/orphan-review/biz-execute/  (summary.md + bind/ + mark.csv)
"""
import argparse
import csv
import os
import shutil
import sys
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BIZ_CSV = os.path.join(ROOT, "artifacts/audit/orphan-review/offline-review/biz-final-review.csv")
POOL_CSV = os.path.join(ROOT, "artifacts/audit/orphan-review/v74-rebuild-master.csv")
OUT_DIR_DEFAULT = os.path.join(ROOT, "artifacts/audit/orphan-review/biz-execute")
API_DIR = os.path.join(ROOT, "apps/web/src/api")

# 决策词表（宽松匹配）
DECISION_BIND = ("接入", "接入候选", "接入补绑", "接入-", "接入 ")
DECISION_INTERNAL = ("内部保留", "内部", "保留内部")
DECISION_DOWN = ("下线", "不接", "不接入")

def classify(d: str):
    d = (d or "").strip()
    if any(d.startswith(k) for k in DECISION_BIND):
        return "bind"
    if any(d.startswith(k) for k in DECISION_INTERNAL):
        return "internal"
    if any(d.startswith(k) for k in DECISION_DOWN):
        return "down"
    return "skip"

def read_csv(p):
    with open(p, encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))

def write_csv(p, rows, fieldnames):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)

def next_readops(svc: str) -> str:
    """建议补绑目标文件：apps/web/src/api/<svc>/readOps{N}.ts（读最大序号+1）"""
    d = os.path.join(API_DIR, svc)
    max_n = 0
    if os.path.isdir(d):
        for fn in os.listdir(d):
            if fn.startswith("readOps") and fn.endswith(".ts"):
                num = fn[len("readOps"):-len(".ts")]
                if num.isdigit():
                    max_n = max(max_n, int(num))
    return f"apps/web/src/api/{svc}/readOps{max_n + 1}.ts" if max_n else f"apps/web/src/api/{svc}/readOps.ts"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="只统计不写盘")
    ap.add_argument("--sample", type=int, default=0, help="仅取前 N 行（验证用）")
    ap.add_argument("--biz-csv", default=BIZ_CSV, help="biz_decision csv 路径（默认终稿包）")
    ap.add_argument("--pool-csv", default=POOL_CSV, help="v74 池 csv 路径（默认 master）")
    ap.add_argument("--out-dir", default=OUT_DIR_DEFAULT, help="输出目录")
    args = ap.parse_args()

    rows = read_csv(args.biz_csv)
    if args.sample:
        rows = rows[: args.sample]

    bind, internal, down, skip = [], [], [], []
    for r in rows:
        c = classify(r.get("biz_decision", ""))
        ({"bind": bind, "internal": internal, "down": down, "skip": skip}[c]).append(r)

    # ---- 统计 ----
    print(f"读取 {len(rows)} 条（sample={args.sample or 'all'}）")
    print(f"  接入候选: {len(bind)}  内部保留: {len(internal)}  下线: {len(down)}  未填/占位: {len(skip)}")
    if bind:
        print("  接入按 svc:", dict(Counter(r['svc'] for r in bind).most_common()))
    if args.dry_run:
        print("[dry-run] 不写盘，验证通过")
        return 0

    # ---- 写盘：接入清单 ----
    by_svc = defaultdict(list)
    for r in bind:
        by_svc[r["svc"]].append(r)
    bind_fields = ["svc", "method", "path", "operation_id", "handler", "target_file"]
    for svc, lst in sorted(by_svc.items()):
        out = []
        for r in lst:
            row = {k: r.get(k, "") for k in ("svc", "method", "path", "operation_id", "handler")}
            row["target_file"] = next_readops(svc)
            out.append(row)
        write_csv(os.path.join(args.out_dir, "bind", f"{svc}.csv"), out, bind_fields)
    print(f"[write] bind/ 下 {len(by_svc)} 个 svc 清单")

    # ---- 写盘：标记清单 + 池更新（内部/下线） ----
    mark_fields = ["svc", "method", "path", "operation_id", "biz_decision", "v74_tend"]
    marks = []
    for r in internal + down:
        tend = "下线-内部保留" if r in internal else "下线-业务确认"
        marks.append({
            "svc": r["svc"], "method": r["method"], "path": r["path"],
            "operation_id": r["operation_id"], "biz_decision": r.get("biz_decision", ""),
            "v74_tend": tend,
        })
    if marks:
        write_csv(os.path.join(args.out_dir, "mark.csv"), marks, mark_fields)
        # 池更新（带备份）
        pool_path = args.pool_csv
        shutil.copyfile(pool_path, pool_path + ".bak-biz204")
        pool = read_csv(pool_path)
        pool_by_path = {(r["svc"], r["path"]): r for r in pool}
        updated = 0
        for m in marks:
            key = (m["svc"], m["path"])
            if key in pool_by_path:
                pool_by_path[key]["v74_tend"] = m["v74_tend"]
                updated += 1
        pool_fields = list(pool[0].keys())
        write_csv(pool_path, pool, pool_fields)
        print(f"[write] mark.csv {len(marks)} 条；池 v74_tend 更新 {updated}/{len(marks)}（备份 .bak-biz204）")
    else:
        print("[write] 无内部/下线标记")

    # ---- summary.md ----
    lines = [
        "# BIZ 204 处置执行批次（预置脚本产物）",
        "",
        f"- 输入: {len(rows)} 条（biz_decision 已分流）",
        f"- 接入候选: **{len(bind)}**（按 svc 见 bind/，目标文件 readOps 系列）",
        f"- 内部保留: {len(internal)} / 下线: {len(down)}（池 v74_tend 已标记）",
        f"- 未处置(占位): {len(skip)}",
        "",
        "## 接入补绑执行顺序（回传后）",
        "",
        "1. 按 bind/<svc>.csv 逐 svc 生成 TS 绑定（method 推导 + alias 映射 + stub 清洗，经验: fe-bind-pool-candidate-clean.md）",
        "2. 每批 `tsc --noEmit` + 重跑池核销 + 独立 commit",
        "3. 全部完成后重跑 `python3 scripts/rebuild-to-bind-pool.py` 核销池数值",
        "",
        "## 标记处置说明",
        "",
        "- 内部保留/下线仅改池 v74_tend 标记，**不删后端路由**",
    ]
    with open(os.path.join(args.out_dir, "summary.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print("[write] summary.md")
    return 0

if __name__ == "__main__":
    sys.exit(main())
