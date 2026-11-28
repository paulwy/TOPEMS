#!/usr/bin/env python3
"""
extract-live-routes.py — 静态抽取 TOPEMS 实际挂载路由

从 svc/*/src 与 lib/*/src 下的 Rust 源码中，通过正则匹配 `.route()` 调用，
抽取 (method, full_path, path, handler, crate, file, line) 三元组集合。

口径与 artifacts/audit/topems_routes_inventory.csv 一致：
  - 若 .route() 的路径参数已以 /api/ 开头 → full_path = path 本身（硬编码全路径）
  - 否则 → full_path = crate_prefix + path（crate 级前缀拼接）

输出：默认打印 CSV 到 stdout；可用 --out 写入文件。

用法：
  python3 scripts/dev/extract-live-routes.py            # stdout
  python3 scripts/dev/extract-live-routes.py --out /tmp/routes.csv
"""

from __future__ import annotations

import argparse
import csv
import os
import re
import sys
from pathlib import Path

# ─── crate → API 前缀映射（与审计 CSV 同口径） ────────────────────────────
# 规则：
#   - 路径参数以 /api/ 开头的，不拼前缀（full_path = path）
#   - 否则拼 crate_prefix + path
CRATE_PREFIX: dict[str, str] = {
    "ai": "/api/ai",
    "analytics": "/api/bi",          # analytics 对外走 /api/bi
    "communication": "/api/communication",
    "crm": "/api/crm",
    "ehs": "/api/ehs",
    "erp": "/api/erp",
    "finance": "/api/finance",
    "gis": "/api/gis",
    "hrm": "/api/hrm",
    "integration": "/api/integration",
    "lims": "/api/lims",
    "master-data": "/api/master-data",
    "mes": "/api/mes",
    "mobile": "/api/mobile",
    "monitor": "/api/monitor",
    "pdm": "/api/pdm",
    "plugin-registry": "/api/plugins",
    "pm": "/api/pm",
    "portal": "/api/portal",
    "qms": "/api/qms",
    "rd": "/api/rd",
    "scm": "/api/scm",
    "search": "/api/search",
    "server": "/api",
    "srm": "/api/srm",
    "ticket": "/api/ticket",
    "tms": "/api/tms",
    "unified-core": "/api/core",
    "wms": "/api/wms",
    # lib crates — 无前缀（路径本身即全路径或测试用）
    "shared-auth": "",
    "shared-bootstrap": "",
    "shared-core": "",
}

# ─── 正则：匹配 .route( ... ) 调用 ──────────────────────────────────────
# 捕获组：
#   1 = 路径字符串字面量内容
#   2 = HTTP 方法 (get/post/put/delete/patch)
#   3 = handler 表达式（括号内内容）
#
# 支持多行：.route(\n  "/path",\n  get(handler),\n)
# 路径字符串：支持普通 "..." 与原始 r"..." / r#"..."#
ROUTE_RE = re.compile(
    r'\.route\(\s*'
    # 路径字符串字面量（支持 r#"..."# 原始字符串与普通 "..."）
    r'(?:"(?P<path>[^"\\]*(?:\\.[^"\\]*)*)"'
    r'|r#"(?P<path_raw>[^"]*)"#)'
    r'\s*,\s*'
    # 方法调用：get(...) / post(...) / put(...) / delete(...) / patch(...)
    r'(?P<method>get|post|put|delete|patch)\s*\(\s*'
    # handler 表达式（非贪婪，到第一个未转义右括号前停止）
    r'(?P<handler>[^)]*?)'
    r'\s*\)'
    r'[\s,)]*',
    re.MULTILINE,
)


def resolve_crate(file_path: str, repo_root: str) -> str | None:
    """从文件路径推断 crate 名称。

    约定：
      svc/{crate}/src/...   → crate = {crate}
      lib/{crate}/src/...   → crate = {crate}
    """
    rel = os.path.relpath(file_path, repo_root)
    parts = rel.split(os.sep)
    if len(parts) >= 3 and parts[0] in ("svc", "lib"):
        return parts[1]
    return None


def compute_full_path(path: str, crate: str) -> str:
    """根据 crate 前缀规则计算 full_path。"""
    if path.startswith("/api/") or path.startswith("/api-docs"):
        # 硬编码全路径，不拼前缀
        return path
    prefix = CRATE_PREFIX.get(crate, "")
    if not prefix:
        return path
    # 拼接：prefix + path（注意 path 以 / 开头）
    return prefix.rstrip("/") + path


CHAIN_VERB_RE = re.compile(r"\s*\.\s*(?P<method>get|post|put|delete|patch)\s*\(", re.MULTILINE)


def _skip_balanced_call(text: str, open_paren_index: int) -> int:
    """从 `(` 位置开始找到与之配对的 `)`，返回右括号后的下标。"""
    depth = 0
    quote = ""
    escaped = False
    i = open_paren_index
    while i < len(text):
        ch = text[i]
        if quote:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == quote:
                quote = ""
        elif ch in ("\"", "'"):
            quote = ch
        elif ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
            if depth == 0:
                return i + 1
        i += 1
    return len(text)


def _iter_route_methods(match, content: str):
    """产出该 .route(...) 上的所有方法：首个方法 + 后续链式 `.verb(...)`。"""
    yield match.group("method").upper(), match.group("handler").strip()

    pos = match.end()
    while True:
        tail = CHAIN_VERB_RE.match(content, pos)
        if not tail:
            break
        open_paren = tail.end() - 1
        close_after = _skip_balanced_call(content, open_paren)
        handler = content[open_paren + 1 : close_after - 1].strip()
        yield tail.group("method").upper(), handler
        pos = close_after


def extract_from_file(filepath: str, repo_root: str) -> list[dict]:
    """从单个 Rust 文件抽取路由。"""
    crate = resolve_crate(filepath, repo_root)
    if crate is None:
        return []

    try:
        content = Path(filepath).read_text(encoding="utf-8")
    except (UnicodeDecodeError, PermissionError):
        return []

    # 跳过 #[cfg(test)] 模块内的路由（审计是否包含？审计 CSV 含 shared-auth tests）
    # 审计 CSV 确实包含 tests 目录下的路由，所以不跳过

    results = []
    for m in ROUTE_RE.finditer(content):
        path = m.group("path") if m.group("path") is not None else m.group("path_raw")

        # 计算行号：从文件开头到匹配位置的换行符数 + 1
        start = m.start()
        line = content.count("\n", 0, start) + 1

        # 链式方法：.route("/x", get(a).post(b).put(c).delete(d))
        # ROUTE_RE 只匹配到第一个方法调用；其后紧跟的 `.<verb>(...)` 属于同一路由，
        # 必须逐个补抽，否则这些方法在 live 集合里凭空消失（openapi 侧会被判“文档多出”）。
        for method, handler in _iter_route_methods(m, content):
            full_path = compute_full_path(path, crate)
            rel_file = os.path.relpath(filepath, repo_root)

            results.append({
                "method": method,
                "full_path": full_path,
                "path": path,
                "handler": handler,
                "crate": crate,
                "file": rel_file,
                "line": line,
            })

    return results


def find_rust_files(repo_root: str) -> list[str]:
    """找到所有需要扫描的 .rs 文件。"""
    targets = []
    # svc/*/src/**/*.rs
    svc_dir = Path(repo_root) / "svc"
    if svc_dir.is_dir():
        for crate_dir in sorted(svc_dir.iterdir()):
            src_dir = crate_dir / "src"
            if src_dir.is_dir():
                for rs_file in src_dir.rglob("*.rs"):
                    targets.append(str(rs_file))

    # lib/*/src/**/*.rs
    lib_dir = Path(repo_root) / "lib"
    if lib_dir.is_dir():
        for crate_dir in sorted(lib_dir.iterdir()):
            src_dir = crate_dir / "src"
            if src_dir.is_dir():
                for rs_file in src_dir.rglob("*.rs"):
                    targets.append(str(rs_file))

    return targets


def main():
    parser = argparse.ArgumentParser(description="静态抽取 TOPEMS 实际挂载路由")
    parser.add_argument(
        "--repo-root",
        default=os.getcwd(),
        help="仓库根目录（默认当前目录）",
    )
    parser.add_argument(
        "--out",
        default=None,
        help="输出 CSV 文件路径（默认 stdout）",
    )
    args = parser.parse_args()

    repo_root = os.path.abspath(args.repo_root)

    # 收集所有路由
    all_routes: list[dict] = []
    rust_files = find_rust_files(repo_root)

    for filepath in rust_files:
        routes = extract_from_file(filepath, repo_root)
        all_routes.extend(routes)

    # 去重：按 (method, full_path, file, line) 去重
    seen = set()
    unique = []
    for r in all_routes:
        key = (r["method"], r["full_path"], r["file"], r["line"])
        if key not in seen:
            seen.add(key)
            unique.append(r)

    # 输出
    fieldnames = ["method", "full_path", "path", "handler", "crate", "file", "line"]

    if args.out:
        with open(args.out, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(unique)
        print(f"抽取完成：{len(unique)} 条路由 → {args.out}", file=sys.stderr)
    else:
        writer = csv.DictWriter(sys.stdout, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(unique)
        print(f"\n# 抽取完成：{len(unique)} 条路由", file=sys.stderr)

    return 0


if __name__ == "__main__":
    sys.exit(main())
