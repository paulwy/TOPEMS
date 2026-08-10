#!/usr/bin/env python3
"""
Analyze *_compat.rs files to identify redundant and dead code compat functions.

For each service that has a *_compat.rs file:
  1. Extract compat function paths (HTTP method + path) from utoipa::path annotations
     (both direct annotations and macro-based compat_path! invocations).
  2. Extract real handler utoipa paths from non-compat .rs files in the same service.
  3. Normalize paths so compat and real handler paths can be compared:
       - compat paths are typically full ("/api/finance/reports/export")
       - real handler paths may be relative ("/expenses"), service-prefixed ("/erp/purchase-orders"),
         or already full ("/api/ehs/...")
  4. Cross-reference with the triage result (p04-triage-result.json) to find which
     compat paths are NOT called by the frontend (unusedBackend).
  5. Classify each compat function:
       - dead_code:            duplicate of a real handler AND unused by frontend
       - redundant_but_used:   duplicate of a real handler but frontend DOES call this path
       - unused_but_unique:    unused by frontend but no real handler covers the same path

Output: /Users/xingzhai/TOPEMS/docs/audit/v73-compat-deadcode.json
"""

import json
import os
import re
import sys
from collections import defaultdict

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

PROJECT_ROOT = "/Users/xingzhai/TOPEMS"
SVC_DIR = os.path.join(PROJECT_ROOT, "svc")
TRIAGE_JSON = os.path.join(PROJECT_ROOT, "docs/audit/p04-triage-result.json")
OUTPUT_JSON = os.path.join(PROJECT_ROOT, "docs/audit/v73-compat-deadcode.json")

HTTP_METHODS = {"get", "post", "put", "delete", "patch", "head", "options", "trace", "connect"}


# ---------------------------------------------------------------------------
# Path helpers
# ---------------------------------------------------------------------------

def normalize_path(p):
    """Normalize a path for comparison.

    - Replace any path parameter {anything} with {param}
    - Strip trailing slash (except for root "/")
    """
    p = re.sub(r"\{[^}]+\}", "{param}", p)
    if len(p) > 1:
        p = p.rstrip("/")
    return p


def get_api_prefix(svc_dir):
    """Read the api_prefix value from the service's main.rs."""
    main_rs = os.path.join(svc_dir, "src", "main.rs")
    if not os.path.exists(main_rs):
        return None
    with open(main_rs, "r", encoding="utf-8") as f:
        content = f.read()
    m = re.search(r'api_prefix:\s*"([^"]+)"', content)
    return m.group(1) if m else None


def to_full_path(path, api_prefix):
    """Convert a utoipa path annotation to a full /api/... path.

    Three conventions exist across services:
      1. Already full:      "/api/finance/reports/export"  -> use as-is
      2. Service-prefixed:  "/erp/purchase-orders"         -> prepend "/api"
      3. Purely relative:   "/expenses"                    -> prepend full api_prefix

    The service-specific prefix is api_prefix without the leading "/api".
    e.g. api_prefix="/api/finance" -> service_specific="/finance"
    """
    if path.startswith("/api/"):
        return path

    service_specific = api_prefix[4:] if api_prefix.startswith("/api") else api_prefix

    if path == service_specific or path.startswith(service_specific + "/"):
        return "/api" + path

    return api_prefix + path


# ---------------------------------------------------------------------------
# utoipa::path extraction
# ---------------------------------------------------------------------------

def _find_fn_name_after(content, pos):
    """Find the function name starting at or after *pos* in *content*.

    Skips the closing ``]`` of the ``#[utoipa::path(...)]`` attribute, any
    additional ``#[...]`` attributes, doc comments (``///``), and whitespace
    before looking for ``pub [async] fn <name>``.
    """
    i = pos
    n = len(content)
    while i < n:
        # Skip whitespace
        while i < n and content[i] in " \t\n\r":
            i += 1
        if i >= n:
            break
        # Skip doc comments
        if content[i:i + 3] == "///":
            while i < n and content[i] != "\n":
                i += 1
            continue
        # Skip closing ] of the previous attribute
        if content[i] == "]":
            i += 1
            continue
        # Skip additional #[...] attributes
        if content[i:i + 2] == "#[":
            depth = 0
            while i < n:
                if content[i] == "[":
                    depth += 1
                elif content[i] == "]":
                    depth -= 1
                    if depth == 0:
                        i += 1
                        break
                i += 1
            continue
        # Try to match a function definition
        m = re.match(r"(?:pub\s+)?(?:async\s+)?fn\s+(\w+)", content[i:])
        if m:
            return m.group(1)
        break
    return None


def extract_utoipa_paths_from_content(content):
    """Extract all #[utoipa::path(...)] annotations from Rust source content.

    Uses parenthesis counting (respecting string literals) to find matching
    closing paren, so nested parentheses inside responses(...) etc. are handled.

    Returns a list of (function_name, method, path) tuples.
    """
    results = []
    idx = 0
    search_from = 0

    while True:
        start = content.find("#[utoipa::path", search_from)
        if start == -1:
            break

        paren_start = content.find("(", start)
        if paren_start == -1:
            break

        # Count parentheses to find the matching close, respecting string literals
        depth = 1
        i = paren_start + 1
        in_string = False
        while i < len(content) and depth > 0:
            c = content[i]
            if in_string:
                if c == "\\":
                    i += 2
                    continue
                if c == '"':
                    in_string = False
            else:
                if c == '"':
                    in_string = True
                elif c == "(":
                    depth += 1
                elif c == ")":
                    depth -= 1
            i += 1

        block_end = i  # position just after the closing ")"
        block_content = content[paren_start + 1:block_end - 1]

        # Find the function name that follows the attribute.
        # After the closing ")" of utoipa::path(...), the "]" of #[...] remains,
        # possibly followed by more attributes, doc comments, or whitespace.
        # Skip all of those before looking for the fn keyword.
        func_name = _find_fn_name_after(content, block_end)

        # --- Extract HTTP method ---
        method = None
        block_stripped = block_content.strip()
        # Try bare keyword form: first token is a method name (get, post, ...)
        first_token_match = re.match(r"(\w+)", block_stripped)
        if first_token_match:
            first_token = first_token_match.group(1).lower()
            if first_token in HTTP_METHODS:
                method = first_token.upper()
        # Fall back to method = "..." form
        if not method:
            m_match = re.search(r'method\s*=\s*"(\w+)"', block_content)
            if m_match:
                method = m_match.group(1).upper()

        # --- Extract path ---
        path = None
        p_match = re.search(r'path\s*=\s*"([^"]+)"', block_content)
        if p_match:
            path = p_match.group(1)

        if func_name and method and path:
            results.append((func_name, method, path))

        search_from = block_end

    return results


def extract_macro_compat_paths(content):
    """Extract compat_path! macro invocations (used by erp_finance_compat.rs).

    Matches both multi-line and single-line forms:
        compat_path!(name, method, "path", "tag");
        compat_path!(name, method, "path", "tag", "param");

    Returns a list of (function_name, method, path) tuples.
    """
    results = []
    pattern = (
        r'compat_path!\s*\(\s*'
        r'(\w+)\s*,\s*'          # function name
        r'(\w+)\s*,\s*'          # method
        r'"([^"]+)"\s*,\s*'      # path
        r'"[^"]*"'               # tag
        r'(?:\s*,\s*"[^"]*")?'   # optional param
        r'\s*\)'
    )
    for m in re.finditer(pattern, content, re.DOTALL):
        func_name = m.group(1)
        method = m.group(2).upper()
        path = m.group(3)
        results.append((func_name, method, path))
    return results


# ---------------------------------------------------------------------------
# Service-level scanning
# ---------------------------------------------------------------------------

def find_compat_files():
    """Find all *_compat.rs files under svc/ and group them by service name.

    Returns dict: { service_name: [absolute_path, ...] }
    """
    compat_files = defaultdict(list)
    for root, _dirs, files in os.walk(SVC_DIR):
        for f in files:
            if f.endswith("_compat.rs"):
                full_path = os.path.join(root, f)
                rel = os.path.relpath(full_path, SVC_DIR)
                svc_name = rel.split(os.sep)[0]
                compat_files[svc_name].append(full_path)
    return compat_files


def extract_compat_functions(compat_file_path):
    """Extract all compat functions from a single compat file.

    Handles both direct #[utoipa::path] annotations and compat_path! macros.
    Returns a list of dicts: { function, method, path, source }
    """
    with open(compat_file_path, "r", encoding="utf-8") as f:
        content = f.read()

    results = []

    # Standard direct annotations
    for func_name, method, path in extract_utoipa_paths_from_content(content):
        results.append({
            "function": func_name,
            "method": method,
            "path": path,
            "source": "direct",
        })

    # Macro-based annotations (compat_path!)
    for func_name, method, path in extract_macro_compat_paths(content):
        results.append({
            "function": func_name,
            "method": method,
            "path": path,
            "source": "macro",
        })

    return results


def extract_real_handlers(svc_dir, compat_file_paths):
    """Extract all real handler utoipa paths from non-compat .rs files in a service.

    Scans every .rs file under src/ except the compat files themselves.
    Returns a list of dicts: { function, method, path, source_file }
    """
    compat_abspath_set = {os.path.abspath(f) for f in compat_file_paths}
    results = []
    src_dir = os.path.join(svc_dir, "src")
    if not os.path.isdir(src_dir):
        return results

    for root, _dirs, files in os.walk(src_dir):
        for f in files:
            if not f.endswith(".rs"):
                continue
            full_path = os.path.abspath(os.path.join(root, f))
            if full_path in compat_abspath_set:
                continue
            try:
                with open(full_path, "r", encoding="utf-8") as fh:
                    content = fh.read()
            except (IOError, UnicodeDecodeError):
                continue
            for func_name, method, path in extract_utoipa_paths_from_content(content):
                results.append({
                    "function": func_name,
                    "method": method,
                    "path": path,
                    "source_file": os.path.relpath(full_path, svc_dir),
                })

    return results


# ---------------------------------------------------------------------------
# Triage data loading
# ---------------------------------------------------------------------------

def load_unused_backend():
    """Load unusedBackend items from the triage result JSON.

    The triage JSON has categories with either 'items' lists or 'byService'
    sub-dicts that contain per-service 'items' lists.

    Returns a set of (METHOD, normalized_path) tuples.
    """
    with open(TRIAGE_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)

    unused_set = set()
    categories = data.get("unusedBackend", {}).get("categories", {})

    for _cat_name, cat in categories.items():
        # Direct items list
        for item in cat.get("items", []):
            method = item.get("method", "").upper()
            norm_path = item.get("normalizedPath") or item.get("path", "")
            if method and norm_path:
                unused_set.add((method, normalize_path(norm_path)))

        # Per-service items (byService)
        for _svc, svc_data in cat.get("byService", {}).items():
            for item in svc_data.get("items", []):
                method = item.get("method", "").upper()
                norm_path = item.get("normalizedPath") or item.get("path", "")
                if method and norm_path:
                    unused_set.add((method, normalize_path(norm_path)))

    return unused_set


# ---------------------------------------------------------------------------
# Main analysis
# ---------------------------------------------------------------------------

def main():
    compat_files_by_svc = find_compat_files()
    unused_set = load_unused_backend()

    services_output = {}
    totals = {
        "total_compat": 0,
        "duplicate": 0,
        "unused": 0,
        "dead": 0,
    }

    for svc_name in sorted(compat_files_by_svc.keys()):
        compat_files = compat_files_by_svc[svc_name]
        svc_dir = os.path.join(SVC_DIR, svc_name)
        api_prefix = get_api_prefix(svc_dir)

        if not api_prefix:
            print(f"WARNING: No api_prefix found for service '{svc_name}', skipping.", file=sys.stderr)
            continue

        # --- Extract compat functions from all compat files in this service ---
        all_compat = []
        for cf in compat_files:
            all_compat.extend(extract_compat_functions(cf))

        # --- Extract real handlers ---
        real_handlers = extract_real_handlers(svc_dir, compat_files)

        # Build a lookup: (method, normalized_full_path) -> [function names]
        real_lookup = defaultdict(list)
        for rh in real_handlers:
            full_path = to_full_path(rh["path"], api_prefix)
            norm_path = normalize_path(full_path)
            key = (rh["method"], norm_path)
            real_lookup[key].append(rh["function"])

        # --- Classify each compat function ---
        dead_code = []
        redundant_but_used = []
        unused_but_unique = []
        active_unique = []

        for cf in all_compat:
            method = cf["method"]
            full_path = to_full_path(cf["path"], api_prefix)
            norm_path = normalize_path(full_path)
            key = (method, norm_path)

            is_duplicate = key in real_lookup
            is_unused = key in unused_set

            entry = {
                "function": cf["function"],
                "method": method,
                "path": full_path,
            }

            if is_duplicate:
                handlers = real_lookup[key]
                entry["real_handler"] = handlers[0]
                if len(handlers) > 1:
                    entry["real_handlers"] = handlers

            if is_duplicate and is_unused:
                entry["reason"] = "duplicate_of_real_handler + unused_by_frontend"
                dead_code.append(entry)
                totals["dead"] += 1
            elif is_duplicate and not is_unused:
                entry["reason"] = "duplicate_of_real_handler"
                redundant_but_used.append(entry)
            elif not is_duplicate and is_unused:
                entry["reason"] = "unused_by_frontend"
                unused_but_unique.append(entry)
            else:
                entry["reason"] = "active"
                active_unique.append(entry)

            if is_duplicate:
                totals["duplicate"] += 1
            if is_unused:
                totals["unused"] += 1

        totals["total_compat"] += len(all_compat)

        # Format compat_file field (string for single file, list for multiple)
        rel_compat_files = [os.path.relpath(f, PROJECT_ROOT) for f in compat_files]
        compat_file_field = rel_compat_files[0] if len(rel_compat_files) == 1 else rel_compat_files

        services_output[svc_name] = {
            "compat_file": compat_file_field,
            "api_prefix": api_prefix,
            "total_compat": len(all_compat),
            "total_real_handlers": len(real_handlers),
            "dead_code": dead_code,
            "redundant_but_used": redundant_but_used,
            "unused_but_unique": unused_but_unique,
            "active_unique": active_unique,
        }

    output = {
        "summary": {
            "total_compat_functions": totals["total_compat"],
            "duplicate_with_real_handler": totals["duplicate"],
            "unused_by_frontend": totals["unused"],
            "dead_code": totals["dead"],
        },
        "services": services_output,
    }

    os.makedirs(os.path.dirname(OUTPUT_JSON), exist_ok=True)
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    # --- Print summary to stdout ---
    print("=" * 70)
    print("COMPAT DEAD CODE ANALYSIS")
    print("=" * 70)
    print(f"Total compat functions:          {totals['total_compat']}")
    print(f"Duplicate with real handler:     {totals['duplicate']}")
    print(f"Unused by frontend:              {totals['unused']}")
    print(f"Dead code (both dup + unused):   {totals['dead']}")
    print()
    print(f"{'Service':<20} {'Compat':>7} {'Dead':>6} {'Redundant':>10} {'Unused':>8} {'Active':>7}")
    print("-" * 70)
    for svc_name in sorted(services_output.keys()):
        svc = services_output[svc_name]
        print(f"{svc_name:<20} {svc['total_compat']:>7} "
              f"{len(svc['dead_code']):>6} "
              f"{len(svc['redundant_but_used']):>10} "
              f"{len(svc['unused_but_unique']):>8} "
              f"{len(svc['active_unique']):>7}")
    print("-" * 70)
    print(f"\nReport written to: {OUTPUT_JSON}")


if __name__ == "__main__":
    main()
