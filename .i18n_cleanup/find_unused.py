#!/usr/bin/env python3
"""Find unused i18n keys in shared/pages/components namespaces.
Mirrors apps/web/src/i18n/index.ts:flattenToNested exactly.
"""
import json
import os
import sys

ROOT = "/Users/air/TOPEMS"
SRC_DIR = os.path.join(ROOT, "apps/web/src")
LOCALE_DIR = os.path.join(SRC_DIR, "i18n/locales/zh")


def deep_merge(target, src):
    result = dict(target)
    for k, v in src.items():
        if isinstance(v, dict) and isinstance(result.get(k), dict):
            result[k] = deep_merge(result[k], v)
        else:
            result[k] = v
    return result


def flatten_to_nested(obj):
    result = {}
    for key, value in obj.items():
        if isinstance(value, dict) and not isinstance(value, list):
            nested_value = flatten_to_nested(value)
            if isinstance(result.get(key), dict):
                result[key] = deep_merge(result[key], nested_value)
            else:
                result[key] = nested_value
            continue
        # leaf: split by dots
        parts = key.split(".")
        current = result
        for i in range(len(parts) - 1):
            part = parts[i]
            if not isinstance(current.get(part), dict):
                current[part] = {}
            current = current[part]
        current[parts[-1]] = value
    return result


def all_dotted_keys(obj, prefix=""):
    out = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            full = f"{prefix}.{k}" if prefix else k
            if isinstance(v, dict):
                out.extend(all_dotted_keys(v, full))
            else:
                out.append(full)
    return out


def load_source_blob():
    parts = []
    # Broad scan: all ts/tsx/js/jsx/mjs under apps/web, excluding build artifacts,
    # node_modules, and the locale JSON itself.
    WEB_ROOT = os.path.join(ROOT, "apps/web")
    EXCLUDE_DIR_SEGS = {"node_modules", "dist", "storybook-static", "locales", ".git"}
    for dirpath, _dirs, files in os.walk(WEB_ROOT):
        # prune
        if any(seg in EXCLUDE_DIR_SEGS for seg in dirpath.split(os.sep)):
            continue
        for fn in files:
            if fn.endswith((".ts", ".tsx", ".js", ".jsx", ".mjs")):
                p = os.path.join(dirpath, fn)
                try:
                    with open(p, "r", encoding="utf-8") as f:
                        parts.append(f.read())
                except Exception:
                    pass
    return "\n".join(parts)


# Whitelist: keys accessed via namespaced useTranslation('...') without prefix.
# Currently only pages.index.k0/k1/k2 in WorkflowSettingsPage via tPages().
WHITELIST_USED = {
    "pages.index.k0",
    "pages.index.k1",
    "pages.index.k2",
}


def main():
    blob = load_source_blob()
    print(f"Source blob size: {len(blob)} chars", file=sys.stderr)

    all_results = {}
    for ns in ["shared", "pages", "components"]:
        path = os.path.join(LOCALE_DIR, f"{ns}.json")
        with open(path, "r", encoding="utf-8") as f:
            raw = json.load(f)
        nested = flatten_to_nested(raw)
        runtime_keys = all_dotted_keys(nested)
        # Only keys that start with `ns.` (sanity filter)
        runtime_keys = [k for k in runtime_keys if k.startswith(ns + ".")]

        unused = []
        used = []
        for k in runtime_keys:
            if k in WHITELIST_USED or k in blob:
                used.append(k)
            else:
                unused.append(k)
        all_results[ns] = {
            "total": len(runtime_keys),
            "used": len(used),
            "unused": len(unused),
            "unused_keys": sorted(unused),
        }
        print(f"=== {ns}: total={len(runtime_keys)} used={len(used)} unused={len(unused)}", file=sys.stderr)

    print(json.dumps(all_results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
