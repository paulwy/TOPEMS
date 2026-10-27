#!/usr/bin/env python3
"""Remove unused keys from shared/pages/components JSON.

Preserves:
- Top-level key order
- 2-space indentation
- UTF-8 (ensure_ascii=False)
- Pre-existing empty nested objects
"""
import json
import os
import sys

ROOT = "/Users/air/TOPEMS"
LOCALE_DIR = os.path.join(ROOT, "apps/web/src/i18n/locales/zh")


def prune_nested(node, runtime_prefix, unused_set, removed_counter):
    """Recursively walk a nested dict. Remove leaves whose runtime key is unused.
    Remove sub-dicts that become empty after pruning (but not pre-existing empty dicts).
    Mutates node in place.
    """
    keys_to_delete = []
    for k, v in list(node.items()):
        runtime_key = f"{runtime_prefix}.{k}"
        if isinstance(v, dict):
            if not v:
                # pre-existing empty dict — leave it
                continue
            prune_nested(v, runtime_key, unused_set, removed_counter)
            if not v:
                # became empty after pruning — drop it
                keys_to_delete.append(k)
                removed_counter[0] += 1
        else:
            if runtime_key in unused_set:
                keys_to_delete.append(k)
                removed_counter[0] += 1
    for k in keys_to_delete:
        del node[k]


def process_file(ns, unused_set):
    path = os.path.join(LOCALE_DIR, f"{ns}.json")
    with open(path, "r", encoding="utf-8") as f:
        raw = json.load(f)

    removed_counter = [0]
    top_level_dropped = 0
    new_raw = {}

    for top_key, top_val in raw.items():
        if "." in top_key:
            # flat dotted key
            if top_key in unused_set:
                removed_counter[0] += 1
                top_level_dropped += 1
                continue
            new_raw[top_key] = top_val
        elif isinstance(top_val, dict):
            if not top_val:
                # pre-existing empty dict — keep
                new_raw[top_key] = top_val
                continue
            # nested dict: walk it
            prune_nested(top_val, top_key, unused_set, removed_counter)
            if not top_val:
                # became empty — drop
                top_level_dropped += 1
                continue
            new_raw[top_key] = top_val
        else:
            # top-level scalar (rare) — keep
            new_raw[top_key] = top_val

    # Write back with 2-space indent, ensure_ascii=False
    with open(path, "w", encoding="utf-8") as f:
        json.dump(new_raw, f, ensure_ascii=False, indent=2)
        f.write("\n")

    return top_level_dropped, removed_counter[0]


def main():
    result_path = os.path.join(ROOT, ".i18n_cleanup/result.json")
    with open(result_path, "r", encoding="utf-8") as f:
        scan = json.load(f)

    for ns in ["shared", "pages", "components"]:
        unused = set(scan[ns]["unused_keys"])
        before_size = os.path.getsize(os.path.join(LOCALE_DIR, f"{ns}.json"))
        top_dropped, leaf_dropped = process_file(ns, unused)
        after_size = os.path.getsize(os.path.join(LOCALE_DIR, f"{ns}.json"))
        print(f"=== {ns}.json ===")
        print(f"  top-level entries dropped: {top_dropped}")
        print(f"  leaf keys removed: {leaf_dropped}")
        print(f"  size: {before_size} -> {after_size} bytes (saved {before_size - after_size})")


if __name__ == "__main__":
    main()
