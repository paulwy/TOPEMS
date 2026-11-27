#!/usr/bin/env python3
"""把「已有 utoipa 注解、但没在 openapi.rs 的 paths(...) 里登记」的 handler 补登记。

gen 只输出登记过的 handler，注解写了不登记等于白写。默认 dry-run，--apply 落盘。
"""
import argparse
import os
import re

ANN = re.compile(r'#\[utoipa::path\(\s*(get|post|put|delete|patch),', re.M)
FN = re.compile(r'^(?:pub(?:\(crate\))? )?(?:async )?fn ([A-Za-z0-9_]+)', re.M)


def module_path(root, fp, crate_prefix="crate::modules"):
    rel = os.path.relpath(fp, root).replace(".rs", "")
    parts = [x for x in rel.split(os.sep) if x]
    if parts and parts[-1] == "mod":
        parts = parts[:-1]
    if os.path.basename(fp) == "mod.rs" and parts and parts[-1] == "mod":
        parts = parts[:-1]
    if not parts:
        return crate_prefix
    return crate_prefix + "::" + "::".join(parts)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--crate-root", required=True)
    ap.add_argument("--openapi", required=True)
    ap.add_argument("--crate-prefix", default="crate::modules")
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()

    oi = open(args.openapi).read()
    items = []
    for d, _, files in os.walk(args.crate_root):
        for name in sorted(files):
            if not name.endswith(".rs"):
                continue
            fp = os.path.join(d, name)
            src = open(fp).read()
            mp = module_path(args.crate_root, fp, args.crate_prefix)
            if not mp:
                continue
            for m in ANN.finditer(src):
                fn = FN.search(src, m.end())
                if fn:
                    items.append((mp + "::" + fn.group(1), fn.group(1), os.path.relpath(fp, args.crate_root)))

    seen, uniq = set(), []
    for it in items:
        if it[0] in seen:
            continue
        seen.add(it[0])
        uniq.append(it)

    missing = [it for it in uniq if ("\n        " + it[0] + ",") not in oi]
    print("注解 handler %d，未登记 %d" % (len(uniq), len(missing)))
    for reg, fn, fp in missing:
        print("  %s  (%s)" % (reg, fp))

    if not args.apply or not missing:
        return
    idx = oi.find("paths(")
    if idx == -1:
        raise SystemExit("openapi.rs 里找不到 paths(")
    depth, i = 0, idx + len("paths")
    while i < len(oi):
        if oi[i] == "(":
            depth += 1
        elif oi[i] == ")":
            depth -= 1
            if depth == 0:
                break
        i += 1
    lines = "".join("\n        %s," % it[0] for it in missing)
    open(args.openapi, "w").write(oi[:i] + lines + oi[i:])
    print("已登记 %d 条" % len(missing))


if __name__ == "__main__":
    main()
