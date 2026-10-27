#!/usr/bin/env python3
"""Namespaced-aware i18n usage scanner.

For each source file:
  - detect useTranslation(...) calls and their destructured t-aliases
  - detect which namespace(s) each t-alias resolves to
  - extract string-literal arguments to t(...), i18n.t(...), and aliases
  - produce the effective runtime key (with ns prefix when needed)

Then for each locale file, mark runtime keys as used/unused.
"""
import json
import os
import re
import sys

ROOT = "/Users/air/TOPEMS"
WEB = os.path.join(ROOT, "apps/web")
LOCALE_ZH = os.path.join(WEB, "src/i18n/locales/zh")
LOCALE_EN = os.path.join(WEB, "src/i18n/locales/en")

# All known namespace names (derived from zh filenames)
ALL_NS = sorted(
    f[:-5] for f in os.listdir(LOCALE_ZH) if f.endswith(".json")
)
NS_SET = set(ALL_NS)


def flatten_to_nested(obj):
    result = {}
    for key, value in obj.items():
        if isinstance(value, dict) and not isinstance(value, list):
            nested = flatten_to_nested(value)
            if isinstance(result.get(key), dict):
                result[key] = deep_merge(result[key], nested)
            else:
                result[key] = nested
            continue
        parts = key.split(".")
        cur = result
        for i in range(len(parts) - 1):
            p = parts[i]
            if not isinstance(cur.get(p), dict):
                cur[p] = {}
            cur = cur[p]
        cur[parts[-1]] = value
    return result


def deep_merge(a, b):
    out = dict(a)
    for k, v in b.items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = deep_merge(out[k], v)
        else:
            out[k] = v
    return out


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


# ─── Regexes ──────────────────────────────────────────────────────

# Match: const { t } = useTranslation(...)
#        const { t: tAlias } = useTranslation(...)
USE_TR_RE = re.compile(
    r"const\s*{\s*t\s*(?::\s*([A-Za-z_$][\w$]*))?\s*}\s*=\s*useTranslation\(\s*([^)]*)\)"
)

# Match: i18n.t('...')  /  i18n.t("...")
I18N_T_RE = re.compile(r"""i18n\.t\(\s*(['"`])((?:\\.|(?!\1).)*?)\1""")

# Match bare t('...') — but we'll scan these per-alias context
BARE_T_RE = re.compile(r"""(?<![\w$])t\(\s*(['"`])((?:\\.|(?!\1).)*?)\1""")

# String literal extractor generic
STR_RE = re.compile(r"""(['"`])((?:\\.|(?!\1).)*?)\1""")


def parse_ns_arg(arg):
    """Parse the argument inside useTranslation(...).
    Returns list of ns names, or [] for default (translation) ns.
    """
    arg = arg.strip()
    if not arg:
        return []
    # array form: ['a', 'b']
    m = re.match(r"^\[(.*)\]$", arg)
    if m:
        items = STR_RE.findall(m.group(1))
        return [s for _, s in items if s in NS_SET]
    # single string
    m = re.match(r"""^(['"])(.*)\1$""", arg)
    if m:
        s = m.group(2)
        if s in NS_SET:
            return [s]
    return []


def scan_file(path):
    """Return a set of effective runtime keys used in this file."""
    try:
        src = open(path, "r", encoding="utf-8").read()
    except Exception:
        return set()

    used = set()

    # 1) Find useTranslation declarations and aliases
    # alias_name -> list of ns names (empty = default translation ns)
    alias_to_ns = {}
    for m in USE_TR_RE.finditer(src):
        alias = m.group(1) or "t"
        ns_list = parse_ns_arg(m.group(2))
        alias_to_ns.setdefault(alias, []).extend(ns_list)

    # 2) i18n.t('...') — these are always fully qualified (assume literal is already a runtime key)
    for m in I18N_T_RE.finditer(src):
        lit = m.group(2)
        if lit and not lit.startswith("$"):
            used.add(lit)
            # also capture template-literal static prefix before ${
            if "${" in lit:
                prefix = lit.split("${", 1)[0]
                if prefix.endswith(".") or prefix == "":
                    # conservative: add prefix minus trailing dot
                    used.add(prefix.rstrip("."))

    # 3) Bare t('...') and aliased tAlias('...')
    # We'll handle by position: find all calls to known aliases.
    # For simplicity: scan BARE_T_RE for 't' (default alias) and also
    # build a regex for each alias.
    def handle_literal(lit, ns_list):
        if not lit:
            return
        # Template literal with dynamic segment: extract static prefix and
        # mark ALL keys under that prefix as used (conservative).
        if "${" in lit:
            prefix = lit.split("${", 1)[0]
            if prefix.endswith("."):
                used.add(prefix.rstrip("."))
                # Also add "<ns>.<prefix>" for namespaced context
                for ns in ns_list:
                    used.add(f"{ns}.{prefix.rstrip('.')}")
            return
        # If literal already starts with a known ns, use as-is
        first = lit.split(".", 1)[0]
        if first in NS_SET:
            used.add(lit)
            return
        # Otherwise, prefix with each ns this alias is bound to
        if ns_list:
            for ns in ns_list:
                used.add(f"{ns}.{lit}")
        else:
            # default translation ns — literal is already a top-level key path
            used.add(lit)

    # bare t() calls
    for m in BARE_T_RE.finditer(src):
        lit = m.group(2)
        handle_literal(lit, alias_to_ns.get("t", []))

    # aliased t calls: for each alias != 't', find alias('...')
    for alias, ns_list in alias_to_ns.items():
        if alias == "t":
            continue
        pat = re.compile(rf"(?<![\w$]){re.escape(alias)}\(\s*(['\"`])((?:\\.|(?!\1).)*?)\1")
        for m in pat.finditer(src):
            lit = m.group(2)
            handle_literal(lit, ns_list)

    return used


def collect_all_used_keys():
    used = set()
    exclude_dirs = {"node_modules", "dist", "storybook-static", "locales", ".git"}
    for dp, _dirs, files in os.walk(WEB):
        if any(s in exclude_dirs for s in dp.split(os.sep)):
            continue
        for fn in files:
            if fn.endswith((".ts", ".tsx", ".js", ".jsx", ".mjs")):
                used |= scan_file(os.path.join(dp, fn))
    return used


def scan_namespace(ns, used_set):
    """Return (total, unused_list) for a given namespace."""
    path = os.path.join(LOCALE_ZH, f"{ns}.json")
    if not os.path.exists(path):
        return 0, []
    raw = json.load(open(path, "r", encoding="utf-8"))
    nested = flatten_to_nested(raw)
    runtime_keys = all_dotted_keys(nested)
    # Only keys starting with ns. (consistent with prior scan)
    runtime_keys = [k for k in runtime_keys if k.startswith(ns + ".")]
    unused = [k for k in runtime_keys if k not in used_set]
    return len(runtime_keys), sorted(unused)


def main():
    used = collect_all_used_keys()
    print(f"Total distinct used keys discovered: {len(used)}", file=sys.stderr)

    # Also include the broad substring blob match as a fallback for safety.
    blob_parts = []
    for dp, _dirs, files in os.walk(WEB):
        if any(s in {"node_modules", "dist", "storybook-static", "locales", ".git"} for s in dp.split(os.sep)):
            continue
        for fn in files:
            if fn.endswith((".ts", ".tsx", ".js", ".jsx", ".mjs")):
                try:
                    blob_parts.append(open(os.path.join(dp, fn), encoding="utf-8").read())
                except Exception:
                    pass
    blob = "\n".join(blob_parts)

    # Used "prefixes": any runtime key starting with one of these is used.
    # Covers template-literal dynamic keys like `ehs.dashboard.${id}`.
    used_prefixes = {k for k in used if "." in k}  # all used keys act as prefixes
    # Also add bare namespace prefixes that appeared in template literals
    # (already captured in used set by handle_literal).

    def is_used(rt_key):
        if rt_key in used:
            return True
        # Check every prefix of rt_key against the used set.
        # If any prefix (e.g. "ehs.dashboard") is used (from a template literal),
        # then all keys under it are considered used.
        parts = rt_key.split(".")
        for i in range(1, len(parts)):
            pref = ".".join(parts[:i])
            if pref in used:
                return True
        if rt_key in blob:
            return True
        return False

    results = {}
    for ns in ALL_NS:
        total, unused = scan_namespace(ns, used)
        if total == 0:
            continue
        unused = [k for k in unused if not is_used(k)]
        results[ns] = {"total": total, "unused": len(unused), "unused_keys": unused}
        print(f"  {ns}: total={total} unused={len(unused)}", file=sys.stderr)

    print(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
