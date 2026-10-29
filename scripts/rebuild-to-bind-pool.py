#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
v74 to_bind 池重建脚本（2026-10-29）
=====================================
基于当前 origin/main 重新生成前端绑定池（后端 route × 前端 api 引用差集）。

背景：v73 池（2026-10-12）已过时（前端 19 天大量补绑），源 CSV 丢失；本脚本重建。

判定规则（沿用批 0 / v73 口径）：
- 后端真实 handler（utoipa path 宏）+ 前端无 api 调用 => to_bind 候选
- 优先级：写+weak => P0；写+无引用 => P1；读+weak => P2；读+无引用 => 下线候选
- 前端已有 api 调用 => 已绑定（移出池）

输出：artifacts/audit/orphan-review/v74-rebuild-master.csv
"""
import os
import re
import sys
import csv
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SVC_DIR = os.path.join(ROOT, "svc")
APPS = ["apps/web/src", "apps/mobile/src", "apps/desktop/src", "packages/api-client/src"]

# ── 后端路由提取（utoipa path 宏）─────────────────────────────
# 形如:
#   #[utoipa::path(
#       method = "GET",
#       path = "/api/xxx",
#       operation_id = "xxx",
#       ...
#   )]
#   pub async fn handler(...)
UTOPIA_RE = re.compile(
    r"#\[utoipa::path\((?P<body>(?:[^\[\]]|\[[^\[\]]*\])*?)\)\]"
    r"\s*(?:\n\s*pub\s+)?(?:async\s+)?fn\s+(?P<fn>\w+)",
    re.M,
)
PATH_RE = re.compile(r'path\s*=\s*"([^"]+)"')
METHOD_RE = re.compile(r'method\s*=\s*"([A-Z]+)"')
OPID_RE = re.compile(r'operation_id\s*=\s*"([^"]+)"')


def normalize(p: str) -> str:
    """路径归一化：去 /api 前缀、去参数占位符，转小写。"""
    p = p.strip()
    p = re.sub(r"^/api/", "", p)
    p = re.sub(r"\{(?:[^}]*)\}", "{}", p)
    p = re.sub(r"\$\{(?:[^}]*)\}", "{}", p)
    p = p.lower().strip("/")
    return p


def tail_segments(p: str) -> list:
    """取路径段序列（归一化后）。"""
    return [s for s in p.split("/") if s]


def write_marker(fn_src: str) -> bool:
    """启发式写库判定：fn 体内出现写操作关键词。"""
    pat = re.compile(
        r"\b(insert\s+into|update\s+|delete\s+from|upsert|"
        r"\.execute\(|\.execute_many\(|copy_from|save\b|\.insert\b|\.update\b|\.delete\b)",
        re.I,
    )
    return bool(pat.search(fn_src))


# Router::route 注册（非 utoipa，如 unified-core file/download）
# 严格：必须 axum 风格 .route("/path", get(handler))——method 包装器必填
ROUTE_RE = re.compile(
    r"\.route\(\s*[\`'\"]?(?P<path>/[^\`'\")\s]+)[\`'\"]?\s*,\s*(?P<wrap>get|post|put|delete|patch|any)\s*\(\s*(?P<fn>[a-zA-Z0-9_:]+)",
    re.I,
)


def extract_router_routes():
    """扫描 svc/*/src 提取 Router::route 注册（补充非 utoipa 路由）。"""
    routes = []
    seen = set()
    for svc_dir in sorted(os.listdir(SVC_DIR)):
        if svc_dir == "server":
            continue  # 聚合挂载层，非业务端点
        base = os.path.join(SVC_DIR, svc_dir)
        if not os.path.isdir(base):
            continue
        for root, _, files in os.walk(os.path.join(base, "src")):
            for f in files:
                if not f.endswith(".rs"):
                    continue
                fp = os.path.join(root, f)
                try:
                    text = open(fp, encoding="utf-8", errors="replace").read()
                except Exception:
                    continue
                for m in ROUTE_RE.finditer(text):
                    # 排除注释行
                    line_start = text.rfind("\n", 0, m.start()) + 1
                    line = text[line_start:m.start()]
                    if line.lstrip().startswith("//") or line.lstrip().startswith("///") or line.lstrip().startswith("/*"):
                        continue
                    path = m.group("path")
                    wrap = m.group("wrap")
                    fn = m.group("fn").split("::")[-1]  # 取模块路径最后段
                    method = wrap.upper()
                    key = (svc_dir, path)
                    if key in seen:
                        continue
                    seen.add(key)
                    fn_src = text[m.end(): m.end() + 2500]
                    is_write = write_marker(fn_src)
                    routes.append((svc_dir, method, path, fn, fn, is_write, fn_src))
    return routes


def extract_backend_routes():
    """扫描 svc/*/src 提取 utoipa 路由。返回 [(svc, method, raw_path, opid, fn, is_write, fn_src)]"""
    routes = []
    for svc_dir in sorted(os.listdir(SVC_DIR)):
        base = os.path.join(SVC_DIR, svc_dir)
        if not os.path.isdir(base):
            continue
        for root, _, files in os.walk(os.path.join(base, "src")):
            for f in files:
                if not f.endswith(".rs"):
                    continue
                fp = os.path.join(root, f)
                try:
                    text = open(fp, encoding="utf-8", errors="replace").read()
                except Exception:
                    continue
                for m in UTOPIA_RE.finditer(text):
                    body, fn = m.group("body"), m.group("fn")
                    pm = PATH_RE.search(body)
                    if not pm:
                        continue
                    raw = pm.group(1)
                    method = (METHOD_RE.search(body) or [None, "GET"])[1] if METHOD_RE.search(body) else "GET"
                    opid = OPID_RE.search(body).group(1) if OPID_RE.search(body) else fn
                    # 函数体：从 fn 声明后 2000 字符（粗略写库判定）
                    fn_src = text[m.end(): m.end() + 2500]
                    is_write = write_marker(fn_src)
                    routes.append((svc_dir, method, raw, opid, fn, is_write, fn_src))
    return routes


def extract_frontend_refs():
    """扫描前端提取 api 调用路径。返回 {norm_path: [(verb, raw, file)]}"""
    refs = defaultdict(list)
    # apiClient.<svc>.<verb>[<泛型嵌套>]('<path>' | `path`)——泛型可嵌套、路径可跨行
    api_re = re.compile(
        r"apiClient\.(?P<svc>[a-zA-Z0-9_]+)\.(?P<verb>get|post|put|patch|delete)"
        r"[^`'\"(]*\(\s*"
        r"[`'\"]?(?P<path>[^`'\")\s]+)",
        re.I,
    )
    fetch_re = re.compile(r"\b(fetch|axios)\s*\(\s*[`'\"]?(?P<path>/api/[^`'\")\s]+)")
    for app in APPS:
        base = os.path.join(ROOT, app)
        if not os.path.isdir(base):
            continue
        for root, _, files in os.walk(base):
            for f in files:
                if not (f.endswith(".ts") or f.endswith(".tsx")):
                    continue
                fp = os.path.join(root, f)
                try:
                    text = open(fp, encoding="utf-8", errors="replace").read()
                except Exception:
                    continue
                for m in api_re.finditer(text):
                    p = normalize(m.group("path"))
                    refs[p].append((m.group("verb").lower(), m.group("path"), os.path.relpath(fp, ROOT)))
                for m in fetch_re.finditer(text):
                    p = normalize(m.group("path"))
                    refs[p].append(("fetch", m.group("path"), os.path.relpath(fp, ROOT)))
    return refs


def extract_weak_refs():
    """前端非 api 调用的路径字符串引用（菜单/config/i18n/reactQuery 等）。返回 {norm_path}"""
    weak = set()
    weak_re = re.compile(r"[\`'\"](?P<path>/[a-zA-Z0-9_\-/{}.]+)[\`'\"]")
    for app in APPS:
        base = os.path.join(ROOT, app)
        if not os.path.isdir(base):
            continue
        for root, _, files in os.walk(base):
            for f in files:
                if not (f.endswith(".ts") or f.endswith(".tsx")):
                    continue
                fp = os.path.join(root, f)
                try:
                    text = open(fp, encoding="utf-8", errors="replace").read()
                except Exception:
                    continue
                # 排除 api 调用行（避免重复）
                for line in text.splitlines():
                    if "apiClient" in line and any(
                        v in line for v in (".get(", ".post(", ".put(", ".patch(", ".delete(")
                    ):
                        continue
                    for m in weak_re.finditer(line):
                        p = normalize(m.group("path"))
                        if len(p) > 3:  # 忽略太短片段
                            weak.add(p)
    return weak


def main():
    routes = extract_backend_routes()
    # 补充 Router::route（非 utoipa），按 (svc, path) 去重——utoipa 优先
    utoipa_paths = {(r[0], normalize(r[2])) for r in routes}
    for rr in extract_router_routes():
        if (rr[0], normalize(rr[2])) not in utoipa_paths:
            routes.append(rr)
    refs = extract_frontend_refs()
    weak = extract_weak_refs()

    print(f"后端路由（utoipa+Router::route）: {len(routes)} | 前端 api 调用路径: {len(refs)} | 弱引用片段: {len(weak)}")

    out = []
    stats = defaultdict(int)
    for svc, method, raw, opid, fn, is_write, _ in routes:
        norm = normalize(raw)
        bound = norm in refs or norm in weak and False  # 绑定仅看 api 调用
        is_bound = norm in refs
        # 尾段匹配（宽松：前端相对路径可能缺服务前缀）
        if not is_bound:
            for rp in refs:
                rp_segs = tail_segments(rp)
                b_segs = tail_segments(norm)
                n = min(len(rp_segs), len(b_segs), 3)
                if n >= 2 and rp_segs[-n:] == b_segs[-n:]:
                    is_bound = True
                    break
        if is_bound:
            continue  # 已绑定，移出池
        # 弱引用
        is_weak = norm in weak
        for w in weak:
            if not is_weak and tail_segments(w)[-2:] == tail_segments(norm)[-2:] and len(tail_segments(norm)) >= 2:
                is_weak = True
                break
        # 优先级
        if is_write and is_weak:
            pri = "P0"
        elif is_write:
            pri = "P1"
        elif is_weak:
            pri = "P2"
        else:
            pri = "下线候选"
        stats[svc] += 1
        out.append([svc, pri, method, raw, opid, fn, "write" if is_write else "read",
                    "weak" if is_weak else "none", "保留" if pri != "下线候选" else "待定"])

    out.sort(key=lambda r: (r[0], r[1]))
    csv_path = os.path.join(ROOT, "artifacts/audit/orphan-review/v74-rebuild-master.csv")
    os.makedirs(os.path.dirname(csv_path), exist_ok=True)
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["svc", "priority", "method", "path", "operation_id", "handler", "write", "frontend", "v74_tend"])
        w.writerows(out)

    print(f"to_bind 候选: {len(out)}（已绑定自动移出）")
    print("── 按服务分布 ──")
    for k, v in sorted(stats.items(), key=lambda x: -x[1]):
        print(f"  {k}: {v}")
    print("── 优先级分布 ──")
    for pri in ("P0", "P1", "P2", "下线候选"):
        n = sum(1 for r in out if r[1] == pri)
        print(f"  {pri}: {n}")
    print(f"\nCSV: {os.path.relpath(csv_path, ROOT)}")


if __name__ == "__main__":
    main()
