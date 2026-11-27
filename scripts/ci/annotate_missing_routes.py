#!/usr/bin/env python3
"""补齐「路由已挂载、但 handler 无 utoipa 注解」的端点注解。

思路：把 spec 里没有的 (method, path) 找出来，反查 handler 函数定义，插入最小可用注解，
再从 openapi.rs 登记。默认 dry-run，--apply 落盘。
"""
import argparse
import json
import os
import re
import sys

METHODS = ("get", "post", "put", "delete", "patch")


def load_spec_paths(path):
    with open(path) as f:
        return json.load(f)["paths"]


def iter_routes(crate_root):
    for root, _, files in os.walk(crate_root):
        for name in files:
            if not name.endswith(".rs"):
                continue
            full = os.path.join(root, name)
            src = open(full).read()
            for m in re.finditer(r"\.route\(", src):
                start = m.end()
                depth = 1
                i = start
                while i < len(src) and depth:
                    if src[i] == "(":
                        depth += 1
                    elif src[i] == ")":
                        depth -= 1
                    i += 1
                call = src[start:i - 1]
                strs = re.findall(r'"([^"]+)"', call)
                if not strs:
                    continue
                route_path = strs[0]
                rest = call[call.find('"') + len(route_path) + 2:]
                handlers = re.findall(r"\b(%s)\(\s*(?:handlers::)?([A-Za-z0-9_]+)\s*\)" % "|".join(METHODS), rest)
                for method, fn in handlers:
                    yield full, route_path, method, fn


def spec_path_for(route_path):
    if route_path.startswith("/api/"):
        return "/api/finance" + route_path
    if route_path.startswith("/"):
        return "/api/finance" + route_path
    return "/api/finance/" + route_path


def find_fn_def(crate_root, fn, near_dir=None, names=()):
    pat = re.compile(r"^(?:pub(?:\(crate\))? )?(?:async )?fn %s\b" % re.escape(fn), re.M)
    cands = []
    for root, _, files in os.walk(crate_root):
        for name in files:
            if not name.endswith(".rs"):
                continue
            full = os.path.join(root, name)
            src = open(full).read()
            for m in pat.finditer(src):
                pri = 0
                if near_dir and os.path.dirname(full) == near_dir:
                    pri = 3
                elif name == "handlers.rs":
                    pri = 2
                elif os.path.basename(full) in names:
                    pri = 2
                cands.append((pri, full, src, m.start()))
    if not cands:
        return None
    cands.sort(key=lambda c: -c[0])
    pri, full, src, pos = cands[0]
    return full, src, pos


def has_annotation(src, pos):
    head = src[max(0, pos - 1200):pos]
    # 同一 fn 前的注释块里出现 utoipa::path 即视为已注解
    seg = head[head.rfind("\n\n\n"):] if "\n\n\n" in head else head
    return "utoipa::path" in seg


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--crate", required=True)
    ap.add_argument("--spec", required=True)
    ap.add_argument("--domain", default="finance")
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()

    spec_paths = load_spec_paths(args.spec)
    todo = []
    for file, route_path, method, fn in iter_routes(args.crate):
        sp = spec_path_for(route_path)
        methods = spec_paths.get(sp, {})
        if method in methods:
            continue
        todo.append((file, sp, method, fn))

    todo = sorted(set(todo))
    print("待补注解端点：%d" % len(todo))
    applied = 0
    for file, sp, method, fn in todo:
        found = find_fn_def(args.crate, fn, os.path.dirname(file), {os.path.basename(file)})
        if not found:
            print("  跳过（无定义） %s %s -> %s" % (method.upper(), sp, fn))
            continue
        fpath, src, pos = found
        if has_annotation(src, pos):
            print("  跳过（已有注解但未进 spec） %s %s" % (method.upper(), sp))
            continue
        line_start = src.rfind("\n", 0, pos) + 1
        indent = ""
        ann = (
            '#[utoipa::path(\n'
            '%s    %s,\n'
            '%s    path = "%s",\n'
            '%s    tag = "Filled",\n'
            '%s    responses((status = 200, description = "ok")),\n'
            '%s)]\n' % (indent, method, indent, sp, indent, indent, indent)
        )
        if args.apply:
            src = src[:line_start] + ann + src[line_start:]
            open(fpath, "w").write(src)
        applied += 1
        print("  %s %s (%s)" % (method.upper(), sp, os.path.relpath(fpath, args.crate)))

    print("已插入：%d" % applied if args.apply else "（dry-run，未落盘）")


if __name__ == "__main__":
    main()
