#!/usr/bin/env python3
"""Generic cleanup: remove unused keys from a locale dir (zh or en).

Usage:
  python3 cleanup_ns.py <locale_dir> <result_json> <ns_list>

result_json maps ns -> { unused_keys: [...] }
"""
import json
import os
import sys


def prune_nested(node, runtime_prefix, unused_set, removed_counter):
    keys_to_delete = []
    for k, v in list(node.items()):
        runtime_key = f"{runtime_prefix}.{k}"
        if isinstance(v, dict):
            if not v:
                continue
            prune_nested(v, runtime_key, unused_set, removed_counter)
            if not v:
                keys_to_delete.append(k)
                removed_counter[0] += 1
        else:
            if runtime_key in unused_set:
                keys_to_delete.append(k)
                removed_counter[0] += 1
    for k in keys_to_delete:
        del node[k]


def process_file(path, unused_set):
    with open(path, "r", encoding="utf-8") as f:
        raw = json.load(f)
    removed_counter = [0]
    new_raw = {}
    for top_key, top_val in raw.items():
        if "." in top_key:
            if top_key in unused_set:
                removed_counter[0] += 1
                continue
            new_raw[top_key] = top_val
        elif isinstance(top_val, dict):
            if not top_val:
                new_raw[top_key] = top_val
                continue
            prune_nested(top_val, top_key, unused_set, removed_counter)
            if not top_val:
                removed_counter[0] += 1
                continue
            new_raw[top_key] = top_val
        else:
            new_raw[top_key] = top_val
    with open(path, "w", encoding="utf-8") as f:
        json.dump(new_raw, f, ensure_ascii=False, indent=2)
        f.write("\n")
    return removed_counter[0]


def main():
    locale_dir = sys.argv[1]
    result_json = sys.argv[2]
    ns_list = sys.argv[3].split(",") if len(sys.argv) > 3 else None
    with open(result_json, "r", encoding="utf-8") as f:
        scan = json.load(f)

    grand_before = 0
    grand_after = 0
    grand_removed = 0
    for ns in scan:
        if ns_list and ns not in ns_list:
            continue
        unused = set(scan[ns]["unused_keys"])
        if not unused:
            continue
        path = os.path.join(locale_dir, f"{ns}.json")
        if not os.path.exists(path):
            print(f"  SKIP {ns}: file not found at {path}", file=sys.stderr)
            continue
        before = os.path.getsize(path)
        removed = process_file(path, unused)
        after = os.path.getsize(path)
        grand_before += before
        grand_after += after
        grand_removed += removed
        print(f"  {ns}: removed={removed}  {before} -> {after} bytes (saved {before-after})")

    print(f"\nTOTAL: removed={grand_removed}  {grand_before} -> {grand_after} bytes (saved {grand_before-grand_after})")


if __name__ == "__main__":
    main()
