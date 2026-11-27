#!/usr/bin/env python3
"""按「路由真实路径」反向校准 handler 注解：path 与 method 都对上，缺注解就插。

与 check_route_annotations 的区别：这里把注解 path 先按 normalize_path 规则归一，再和路由算出的
真实路径比较，避免把「相对路径写成 /xxx」误判成不一致；并且会改 method，不只改 path。
"""
import argparse
import os
import re

METHODS = ("get", "post", "put", "delete", "patch")


def norm(p, domain):
    """注解 path 的归一化：/api/... 原样，其余相对路径挂到 /api/<domain> 下。"""
    if p.startswith("/api"):
        return p
    return "/api/%s%s" % (domain, p)


def live(route_path, domain):
    """路由相对 finance router 的真实路径。"""
    return "/api/%s%s" % (domain, route_path)


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
                for mm in re.finditer(r"\b(%s)\(\s*(?:handlers::|super::|crate::modules::[A-Za-z0-9_:]+::)?([A-Za-z0-9_]+)\s*\)"
                                      % "|".join(METHODS), call[sm.end():]):
                    yield fp, route_path, mm.group(1), mm.group(2)


def find_fn(crate_root, fp, fn):
    pat = re.compile(r"^(?:pub(?:\(crate\))? )?(?:async )?fn %s\b" % re.escape(fn), re.M)
    near = os.path.dirname(fp)
    cands = []
    for d, _, files in os.walk(crate_root):
        for name in files:
            if not name.endswith(".rs"):
                continue
            f2 = os.path.join(d, name)
            src = open(f2).read()
            for m in pat.finditer(src):
                cands.append((0 if os.path.dirname(f2) == near else 1, f2, src, m.start()))
    if not cands:
        return None
    cands.sort(key=lambda c: c[0])
    return cands[0]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--crate-root", required=True)
    ap.add_argument("--domain", default="finance")
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()

    done, fixes, inserts = set(), [], []
    for fp, route_path, method, fn in iter_routes(args.crate_root):
        want = live(route_path, args.domain)
        if "cqrs_routes" in fp:
            continue
        found = find_fn(args.crate_root, fp, fn)
        if not found:
            continue
        _, f2, src, pos = found
        key = (f2, fn)
        if key in done:
            continue
        done.add(key)
        idx = src.rfind("#[utoipa::path(", 0, pos)
        has = False
        if idx != -1:
            end = src.find(")]", idx)
            gap = src[end + 2:pos] if end != -1 else ""
            if end != -1 and "fn " not in gap and "struct " not in gap and "impl " not in gap:
                has = True
        if not has:
            inserts.append((f2, fn, want, method, pos))
            continue
        pv = re.search(r'path\s*=\s*"([^"]+)"', src[idx:pos])
        mv = re.search(r"^\s*(%s)," % "|".join(METHODS), src[idx:pos], re.M)
        if not pv or not mv:
            continue
        if norm(pv.group(1), args.domain) != want or mv.group(1) != method:
            fixes.append((f2, fn, pv.group(1), mv.group(1), want, method, idx + pv.start(1) - 1, idx + mv.start(1)))

    print("需插入注解 %d，需修正 %d" % (len(inserts), len(fixes)))
    for f2, fn, want, method, _ in inserts:
        print("  + %-6s %-58s %s" % (method.upper(), want, fn))
    for f2, fn, old, meth, want, method, _, _ in fixes:
        print("  ~ %-6s %s -> %-58s %s" % (meth.upper(), old, want, fn))

    if not args.apply:
        return
    for f2, fn, want, method, pos in inserts:
        s = open(f2).read()
        m = re.compile(r"^(?:pub(?:\(crate\))? )?(?:async )?fn %s\b" % re.escape(fn), re.M).search(s)
        if not m:
            continue
        s = s[:m.start()] + '#[utoipa::path(\n    %s,\n    path = "%s",\n    tag = "Filled",\n    responses((status = 200, description = "ok")),\n)]\n' % (method, want) + s[m.start():]
        open(f2, "w").write(s)
    for f2, fn, old, meth, want, method, ppos, mpos in sorted(fixes, key=lambda x: -x[6]):
        s = open(f2).read()
        # 先改 method（位置靠前的一般是 method），再改 path（从后往前避免位移）
        if s[mpos:mpos + len(meth)] != meth or s[ppos:ppos + len(old)] != old:
            continue
        if ppos > mpos:
            s = s[:ppos] + want + s[ppos + len(old):]
            s = s[:mpos] + method + s[mpos + len(meth):]
        else:
            s = s[:mpos] + method + s[mpos + len(meth):]
            s = s[:ppos] + want + s[ppos + len(old):]
        open(f2, "w").write(s)
    print("已插入 %d，已修正 %d" % (len(inserts), len(fixes)))


if __name__ == "__main__":
    main()
