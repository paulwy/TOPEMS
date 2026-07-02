#!/usr/bin/env bash
# =============================================================================
# Phase 6-B: ESLint recharts restriction + createSafeLazy setup for 25+ routes
# =============================================================================
set -euo pipefail

PROJECT_ROOT="/Users/air/TOPEMS"
ROUTES_DIR="${PROJECT_ROOT}/apps/web/src/routes"
ESLINT_FILE="${PROJECT_ROOT}/apps/web/eslint.config.js"
BACKUP_SUFFIX=".bak.phase6-b"

# Counters
ESLINT_PATCHED=0
ROUTE_PATCHED=0
ROUTE_SKIPPED=0
ROUTE_ALREADY=0

echo "=== Phase 6-B: ESLint + createSafeLazy ==="
echo ""

# ─── Helper: backup ───────────────────────────────────────────────────────────
backup_if_needed() {
  local file="$1"
  if [[ ! -f "${file}${BACKUP_SUFFIX}" ]]; then
    cp "$file" "${file}${BACKUP_SUFFIX}"
    echo "  [backup] $(basename "$file")"
  fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# PART 1 — ESLint: add no-restricted-imports rule for recharts
# ═══════════════════════════════════════════════════════════════════════════════
echo ">>> Part 1: ESLint recharts restriction"
echo ""

if [[ -f "$ESLINT_FILE" ]]; then
  # Check if the rule already exists (idempotent)
  if grep -q "no-restricted-imports.*recharts" "$ESLINT_FILE" 2>/dev/null; then
    echo "  [skip] eslint.config.js already has recharts restriction"
  else
    backup_if_needed "$ESLINT_FILE"

    # Insert the new config block before the closing ...storybook line
    # Find the line with "...storybook.configs" and insert before it
    python3 - "$ESLINT_FILE" <<'PYEOF'
import sys

filepath = sys.argv[1]
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

marker = "  ...storybook.configs['flat/recommended'],"
new_block = """  // Phase 3.2 — 禁止直接引用 recharts，统一使用 @/components/charts
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [{
          name: 'recharts',
          message: '请使用 @/components/charts 导入图表组件，不要直接引用 recharts。详见 phase4-5-token-usage-guide.md',
        }],
      }],
    },
  },
"""

if marker in content and "no-restricted-imports" not in content:
    content = content.replace(marker, new_block + "\n" + marker)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print("  [patched] eslint.config.js — recharts restriction added")
else:
    print("  [skip] marker not found or rule already present")

PYEOF
    ESLINT_PATCHED=1
  fi
else
  echo "  [warn] eslint.config.js not found at $ESLINT_FILE"
fi

echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# PART 2 — routes/utils.ts: ensure createSafeLazy is exported
# ═══════════════════════════════════════════════════════════════════════════════
echo ">>> Part 2: Ensure createSafeLazy in routes/utils.ts"
echo ""

UTILS_FILE="${ROUTES_DIR}/utils.ts"

if grep -q "createSafeLazy" "$UTILS_FILE" 2>/dev/null; then
  echo "  [skip] utils.ts already exports createSafeLazy"
else
  backup_if_needed "$UTILS_FILE"

  python3 - "$UTILS_FILE" <<'PYEOF'
import sys

filepath = sys.argv[1]
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# Append createSafeLazy after the lazyWithRetry function (before the RouteConfig interface)
insert_marker = "export interface RouteConfig {"
new_code = """\
/**
 * Phase 3.6 — 创建带有自动 ErrorBoundary 保护的懒加载组件。
 * 当组件加载失败时，会渲染指定的 fallback 而非白屏。
 */
export const createSafeLazy = <T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  moduleName?: string
): LazyExoticComponent<T> => {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error(`[SafeLazy] Failed to load ${moduleName || 'unknown'}: ${errMsg}`);
      // Return ErrorPage as fallback instead of crashing
      return { default: ErrorPage as unknown as T };
    }
  });
};

"""

if insert_marker in content and "createSafeLazy" not in content:
    content = content.replace(insert_marker, new_code + insert_marker)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print("  [patched] utils.ts — createSafeLazy added")
else:
    print("  [skip] could not find insertion point or createSafeLazy already exists")

PYEOF
fi

echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# PART 3 — Patch all route files (25+ files, excluding index.ts)
# ═══════════════════════════════════════════════════════════════════════════════
echo ">>> Part 3: Patch route files"
echo ""

# All route files excluding utils.ts and index.ts
ROUTE_FILES=()
while IFS= read -r f; do
  ROUTE_FILES+=("$f")
done < <(find "$ROUTES_DIR" -maxdepth 1 -name "*.ts" ! -name "utils.ts" ! -name "index.ts" | sort)

echo "  Found ${#ROUTE_FILES[@]} route files to process"
echo ""

ROUTES_DIR="$ROUTES_DIR" python3 - <<'PYEOF'
import os
import re
import sys

routes_dir = os.environ.get("ROUTES_DIR", "")
backup_suffix = ".bak.phase6-b"

# All .ts files in routes_dir except utils.ts and index.ts
route_files = sorted([
    f for f in os.listdir(routes_dir)
    if f.endswith(".ts") and f not in ("utils.ts", "index.ts")
])

stats = {"patched": 0, "skipped": 0, "already": 0}
details = []

for fname in route_files:
    fpath = os.path.join(routes_dir, fname)

    with open(fpath, "r", encoding="utf-8") as f:
        content = f.read()

    # --- Check if already processed (idempotent) ---
    if "createSafeLazy" in content:
        stats["already"] += 1
        details.append(f"  [already] {fname}")
        continue

    # --- Skip files with no lazy usage at all ---
    if "lazy(" not in content and "lazyWithRetry" not in content:
        stats["skipped"] += 1
        details.append(f"  [skip]   {fname} (no lazy usage)")
        continue

    original = content
    module_name = fname.replace(".ts", "")  # e.g. "erp" from "erp.ts"

    # Determine which pattern the file uses
    has_lazy_with_retry_import = bool(re.search(r"import\s*\{[^}]*lazyWithRetry[^}]*\}\s*from\s*['\"]\.\/utils['\"]", content))
    has_react_lazy = bool(re.search(r"import\s+React[,\s]*\{[^}]*lazy[^}]*\}\s*from\s*['\"]react['\"]", content))
    has_standalone_lazy = bool(re.search(r"import\s*\{\s*lazy\s*\}\s*from\s*['\"]react['\"]", content))

    # ── Case A: File uses lazyWithRetry from ./utils ──
    if has_lazy_with_retry_import:
        # Merge createSafeLazy into existing import
        content = re.sub(
            r"(import\s*\{[^}]*lazyWithRetry)([^}]*\}\s*from\s*['\"]\.\/utils['\"];)",
            r"\1, createSafeLazy\2",
            content,
            count=1,
        )

        # Add safeLazy alias after "const lazy = lazyWithRetry;" line
        lazy_alias_line = "const lazy = lazyWithRetry;"
        safe_lazy_line = f"const safeLazy = (fn: () => Promise<any>) => createSafeLazy(fn, '{module_name}');"
        content = content.replace(
            lazy_alias_line,
            lazy_alias_line + "\n" + safe_lazy_line,
            1,
        )

    # ── Case B: File uses React lazy (no lazyWithRetry) ──
    elif has_react_lazy or has_standalone_lazy:
        # Add import for createSafeLazy from ./utils (lazyWithRetry not needed here
        # since existing code uses React's lazy directly — we only add safeLazy)
        utils_import_pattern = r"(import\s+type\s*\{\s*RouteConfig\s*\}\s*from\s*['\"]\.\/utils['\"];)"
        match = re.search(utils_import_pattern, content)
        if match:
            old_line = match.group(1)
            new_line = old_line + "\nimport { createSafeLazy } from './utils';"
            content = content.replace(old_line, new_line, 1)
        else:
            # No RouteConfig import — add after the first import
            first_import_end = content.find(";")
            if first_import_end != -1:
                insert_pos = first_import_end + 1
                content = (content[:insert_pos]
                           + "\nimport { createSafeLazy } from './utils';"
                           + content[insert_pos:])

        # Add safeLazy alias after the last import line (DO NOT add lazy = lazyWithRetry
        # since these files use React's lazy directly and it still works)
        import_lines = re.findall(r"^import\s+.*?;$", content, re.MULTILINE)
        if import_lines:
            last_import = import_lines[-1]
            last_import_end = content.rfind(last_import) + len(last_import)
            insert_text = f"\n\nconst safeLazy = (fn: () => Promise<any>) => createSafeLazy(fn, '{module_name}');"
            content = content[:last_import_end] + insert_text + content[last_import_end:]

    else:
        # No lazy pattern found at all
        stats["skipped"] += 1
        details.append(f"  [skip]   {fname} (no recognized lazy pattern)")
        continue

    # --- Add migration comment block at the end of imports/lazy defs ---
    migration_comment = f"""
// Phase 3.6: 渐进迁移指南 — 将 lazy(() => import(...)) 替换为 safeLazy 以获得自动 ErrorBoundary 保护
// 示例: const XxxPage = safeLazy(() => import('../pages/xxx/XxxPage'));
// 模块: {module_name}
"""
    # Insert before the first "export const" line
    export_match = re.search(r"\nexport\s+const\s+", content)
    if export_match and migration_comment not in content:
        insert_pos = export_match.start()
        content = content[:insert_pos] + migration_comment + content[insert_pos:]

    # Write if changed
    if content != original:
        # Backup
        bak_path = fpath + backup_suffix
        if not os.path.exists(bak_path):
            with open(fpath, "rb") as src:
                with open(bak_path, "wb") as dst:
                    dst.write(src.read())

        with open(fpath, "w", encoding="utf-8") as f:
            f.write(content)
        stats["patched"] += 1
        details.append(f"  [patched] {fname}")
    else:
        stats["skipped"] += 1
        details.append(f"  [skip]   {fname} (no changes needed)")

# Print details
for line in details:
    print(line)

print("")
print(f"  --- Statistics ---")
print(f"  Patched:  {stats['patched']}")
print(f"  Skipped:  {stats['skipped']}")
print(f"  Already:  {stats['already']}")

PYEOF

echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# PART 4 — Verify
# ═══════════════════════════════════════════════════════════════════════════════
echo ">>> Part 4: Verification"
echo ""

echo "  ESLint recharts rule:"
if grep -q "no-restricted-imports.*recharts" "$ESLINT_FILE" 2>/dev/null; then
  echo "    [OK] recharts restriction present"
else
  echo "    [MISSING] recharts restriction not found"
fi

echo ""
echo "  utils.ts createSafeLazy:"
if grep -q "createSafeLazy" "$UTILS_FILE"; then
  echo "    [OK] createSafeLazy exported"
else
  echo "    [MISSING] createSafeLazy not found"
fi

echo ""
echo "  Route files with createSafeLazy:"
safe_count=$(grep -rl "createSafeLazy" "$ROUTES_DIR" --include="*.ts" | grep -v "utils.ts" | grep -v "index.ts" | wc -l | tr -d ' ')
echo "    ${safe_count} files now reference createSafeLazy"

echo ""
echo "============================================"
echo "  Phase 6-B ESLint + SafeLazy: DONE"
echo "============================================"
