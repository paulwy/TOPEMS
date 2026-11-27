#!/usr/bin/env python3
"""校验「路由真实路径」与「handler utoipa 注解 path」是否一致。

gen 只按注解 path 写 spec，注解 path 不等于真实挂载路径时，spec 里就是一条幻影路径（实测 404），
而真实路径反而没文档。默认只报告，--fix 反向改写注解 path 为真实路径。
"""
import argparse
import os
import re
import sys

METHODS = ("get", "post", "put", "delete", "patch")


def iter_routes(crate_root):
    for d, _, files in os.walk(crate_root):
        for name in sorted(files):
            if not name.endswith(".rs"):
                continue
            fp = os.path.join(d, name)
            src = open(fp).read()
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
                route_path = sm.group(1)
                rest = call[sm.end():]
                for mm in re.finditer(
                    r"\.?(%s)\s*\(\s*(?:handlers::|super::|crate::modules::[A-Za-z0-9_:]+::)?([A-Za-z0-9_]+)\s*\)"
                    % "|".join(METHODS), rest):
                    yield fp, route_path, mm.group(1), mm.group(2)


def live_path(route_path, domain="finance"):
    if route_path.startswith("/api/"):
        return "/api/%s%s" % (domain, route_path[4:])
    if route_path.startswith("/"):
        return "/api/%s%s" % (domain, route_path)
    return "/api/%s/%s" % (domain, route_path)


def find_fns(crate_root, fn):
    pat = re.compile(r"^(?:pub(?:\(crate\))? )?(?:async )?fn %s\b" % re.escape(fn), re.M)
    hits = []
    for d, _, files in os.walk(crate_root):
        for name in files:
            if not name.endswith(".rs"):
                continue
            fp = os.path.join(d, name)
            src = open(fp).read()
            for m in pat.finditer(src):
                hits.append((fp, src, m.start()))
    return hits


def ann_path_before(src, pos):
    """取 fn 前最近一个 utoipa::path 块里的 path。"""
    head = src[:pos]
    idx = head.rfind("#[utoipa::path(")
    if idx == -1 or "\n\n\n" in head[idx:]:
        return None, -1
    pm = re.search(r'path\s*=\s*"([^"]+)"', src[idx:pos])
    if not pm:
        return None, -1
    return pm.group(1), idx + pm.start(1) - 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--crate-root", required=True)
    ap.add_argument("--domain", default="finance")
    ap.add_argument("--fix", action="store_true")
    args = ap.parse_args()

    seen = set()
    bad = []
    for fp, route_path, method, fn in iter_routes(args.crate_root):
        want = live_path(route_path, args.domain)
        cands = find_fns(args.crate_root, fn)
        if not cands:
            continue
        same = [c for c in cands if os.path.dirname(c[0]) == os.path.dirname(fp)]
        cand = (same or cands)[0]
        ann, pos = ann_path_before(cand[1], cand[2])
        if ann is None:
            continue
        key = (cand[0], pos)
        if key in seen:
            continue
        seen.add(key)
        if ann != want:
            bad.append((cand[0], ann, want, method, fn, pos))

    print("注解 path 与真实路由不一致：%d 处" % len(bad))
    for fp, ann, want, method, fn, pos in bad:
        print("  %-55s %-6s %s -> %s  (%s)" % (os.path.relpath(fp, args.crate_root),
                                              method.upper(), ann, want, fn))

    if args.fix:
        fixed = 0
        for fp, ann, want, method, fn, pos in bad:
            src = open(fp).read()
            if src[pos:pos + len(ann)] != ann:
                # 位置可能被前一次改写移动，按 fn 重新定位
                cands = [c for c in find_fns(args.crate_root, fn) if c[0] == fp]
                if not cands:
                    continue
                cand = cands[0]
                ann2, pos2 = ann_path_before(cand[1], cand[2])
                if ann2 != ann:
                    continue
                src = cand[1]
                pos = pos2
            src = src[:pos] + want + src[pos + len(ann):]
            open(fp, "w").write(src)
            fixed += 1
        print("已改写 %d 处" % fixed)


if __name__ == "__main__":
    main()
