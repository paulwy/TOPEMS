#!/usr/bin/env python3
"""把「同一 handler 挂在多个路径」的别名克隆进 spec。

utoipa 一个 handler 只能声明一个 path，但同一 handler 常在多个路由上复用（历史别名、兼容路径）。
这些别名在 gen 输出里必然缺失；本脚本按「路由 → handler → 该 handler 已登记的注解 path」反查，
把注解 path 下的 operation 原样克隆到真实路由 path，并标注 x-alias-of 便于追溯。

默认 dry-run，--clone 写 spec。
"""
import argparse
import json
import os
import re

METHODS = ("get", "post", "put", "delete", "patch")


def parse_routes(fp):
    src = open(fp).read()
    out = []
    for m in re.finditer(r"\.route\(", src):
        i, depth = m.end(), 1
        while i < len(src) and depth:
            if src[i] == "(":
                depth += 1
            elif src[i] == ")":
                depth -= 1
            i += 1
        call = src[m.end():i - 1]
        sm = re.search(r'"([^"]+)"', call)
        if not sm:
            continue
        path = sm.group(1)
        for mm in re.finditer(r"\b(%s)\(\s*([A-Za-z0-9_:]+)\s*\)" % "|".join(METHODS), call[sm.end():]):
            out.append((path, mm.group(1), mm.group(2).split("::")[-1]))
    return out


def parse_annotations(crate_root):
    """(fn, method) -> annotation path"""
    ann = {}
    for d, _, files in os.walk(crate_root):
        for name in files:
            if not name.endswith(".rs"):
                continue
            src = open(os.path.join(d, name)).read()
            for m in re.finditer(r"#\[utoipa::path\((.*?)\)\]", src, re.S):
                body = m.group(1)
                mv = re.search(r"^\s*(%s)," % "|".join(METHODS), body, re.M)
                pv = re.search(r'path\s*=\s*"([^"]+)"', body)
                if not mv or not pv:
                    continue
                fm = re.search(r"^(?:pub(?:\(crate\))? )?(?:async )?fn ([A-Za-z0-9_]+)", src[m.end():], re.M)
                if fm:
                    ann.setdefault((fm.group(1), mv.group(1)), []).append(pv.group(1))
    return ann


def norm(p, prefix):
    if p.startswith("/api"):
        return p
    return prefix + p


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--routes", required=True)
    ap.add_argument("--modules", required=True, help="handler 定义所在目录")
    ap.add_argument("--prefix", required=True, help="路由挂载前缀，如 /api/core/flow")
    ap.add_argument("--spec", required=True)
    ap.add_argument("--clone", action="store_true")
    args = ap.parse_args()

    routes = parse_routes(args.routes)
    ann = parse_annotations(args.modules)
    spec = json.load(open(args.spec))
    paths = spec["paths"]

    cloned, unannotated, present = [], [], 0
    for path, method, fn in routes:
        target = norm(path, args.prefix)
        if method in paths.get(target, {}):
            present += 1
            continue
        cands = ann.get((fn, method)) or ann.get((fn, None))
        src_path = None
        for c in (ann.get((fn, method)) or []):
            if method in paths.get(norm(c, args.prefix if c.startswith("/") and not c.startswith("/api") else ""), {}):
                src_path = norm(c, args.prefix if not c.startswith("/api") else "")
                break
        if src_path is None:
            for c in ann.get((fn, method)) or []:
                full = c if c.startswith("/api") else args.prefix + c
                if method in paths.get(full, {}):
                    src_path = full
                    break
        if src_path is None:
            unannotated.append((method.upper(), target, fn))
            continue
        cloned.append((method.upper(), target, src_path, fn))

    print("路由 %d，已在 spec %d，可克隆别名 %d，无注解 %d" % (len(routes), present, len(cloned), len(unannotated)))
    for m, t, s, fn in cloned:
        print("  ~ %-6s %-58s <- %s (%s)" % (m, t, s, fn))
    for m, t, fn in unannotated:
        print("  ! %-6s %-58s %s" % (m, t, fn))

    if args.clone and cloned:
        for m, t, s, fn in cloned:
            op = json.loads(json.dumps(paths[s][m.lower()]))
            op["x-alias-of"] = s
            paths.setdefault(t, {})[m.lower()] = op
        json.dump(spec, open(args.spec, "w"), ensure_ascii=False, separators=(",", ":"))
        print("已克隆 %d 条别名进 spec" % len(cloned))


if __name__ == "__main__":
    main()
