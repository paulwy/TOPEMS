#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Phase 3.4 -- Loading State Component Unification
# Unify CircularProgress usage across TOPEMS project with LoadingSpinner family
# =============================================================================

PROJECT_ROOT="/Users/air/TOPEMS"
SRC="${PROJECT_ROOT}/apps/web/src"
LOADING_SPINNER="${SRC}/components/common/LoadingSpinner.tsx"

# Color output helpers
info()  { echo -e "\033[1;34m[INFO]\033[0m  $*"; }
ok()    { echo -e "\033[1;32m[DONE]\033[0m  $*"; }
warn()  { echo -e "\033[1;33m[SKIP]\033[0m  $*"; }

# ---------------------------------------------------------------------------
# Step 0: Backup helper
# ---------------------------------------------------------------------------
backup() {
  local f="$1"
  if [[ -f "$f" ]]; then
    cp "$f" "${f}.bak.phase3-4"
    return 0
  else
    return 1
  fi
}

# ---------------------------------------------------------------------------
# Step 1: Enhance LoadingSpinner.tsx
# ---------------------------------------------------------------------------
info "Step 1: Enhancing LoadingSpinner.tsx with CenterLoading, InlineLoading, PageLoading ..."

backup "$LOADING_SPINNER" || true

python3 - "$LOADING_SPINNER" <<'PYEOF'
import sys

filepath = sys.argv[1]
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

new_components = '''

/**
 * 居中加载指示器（替代 CircularProgress 居中使用场景）
 */
export const CenterLoading: React.FC<{ size?: number; message?: string }> = ({ 
  size = 24, 
  message 
}) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 4, gap: 1 }}>
    <LoadingSpinner size={size === 16 ? 'sm' : size === 32 ? 'lg' : 'md'} />
    {message && <Typography variant="body2" color="text.secondary">{message}</Typography>}
  </Box>
);

/**
 * 行内加载指示器（用于按钮、列表项等行内场景）
 */
export const InlineLoading: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <LoadingSpinner size={size === 16 ? 'sm' : 'md'} />
);

/**
 * 页面级加载（用于 React.lazy + Suspense 的 fallback）
 */
export const PageLoading: React.FC = () => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
    <LoadingSpinner size="lg" />
  </Box>
);
'''

marker = "\nexport default LoadingSpinner;"
if marker in content:
    content = content.replace(marker, new_components + "\nexport default LoadingSpinner;")
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("  OK: LoadingSpinner.tsx enhanced")
else:
    print("  WARN: Could not find 'export default LoadingSpinner;' marker")
    sys.exit(1)
PYEOF

ok "Step 1 complete: LoadingSpinner.tsx enhanced"

# ---------------------------------------------------------------------------
# Step 2: Batch replace CircularProgress patterns in target files
# ---------------------------------------------------------------------------
info "Step 2: Replacing CircularProgress patterns in target page files ..."

python3 - "$SRC" <<'PYEOF'
import os, re, sys

SRC = sys.argv[1]

TARGET_FILES = [
    "pages/shared/PluginMarketplacePage.tsx",
    "pages/plugin/PluginDetailPage.tsx",
    "pages/lowcode/PageDesignerPage.tsx",
    "pages/lowcode/FormDesignerPage.tsx",
    "pages/lowcode/DataSourcePage.tsx",
    "pages/workflow/WorkflowDesignerPage.tsx",
    "pages/workflow/FlowWorkflowPage.tsx",
    "pages/srm/SrmSupplierPage.tsx",
    "pages/shared/ProfilePage.tsx",
    "pages/scm/MrpPlanPage.tsx",
    "pages/mobile/MobileTaskListPage.tsx",
    "pages/mes/ProductionDashboardPage.tsx",
    "pages/gis/GisTrackingPage.tsx",
    "pages/gis/GisFencePage.tsx",
    "pages/finance/FinanceInvoicePage.tsx",
    "pages/erp/VoucherManagementPage.tsx",
    "pages/erp/DatabaseManagementPage.tsx",
    "pages/bi/ReportBuilderPage.tsx",
    "pages/bi/DatasetPage.tsx",
    "pages/bi/BiPermissionPage.tsx",
    "pages/ai/AiDocumentAnalysisPage.tsx",
    "pages/ai/AiChatPage.tsx",
    "pages/admin/DictionaryManagementPage.tsx",
    "pages/admin/DatabaseStructurePage.tsx",
    "pages/workflow/FlowNotificationCenter.tsx",
    "pages/erp/DictManagementPage.tsx",
    "pages/erp/AuditLogPage.tsx",
    "pages/erp/FinancialReportPage.tsx",
    "pages/rs/RsExperimentDetailPage.tsx",
    "pages/bi/Gispage.tsx",
    "pages/plugin/PluginMarketplacePage.tsx",
    "pages/mes/MobileWorkstationPage.tsx",
    "pages/gis/index.tsx",
    "pages/admin/MigrationAdminPage.tsx",
    "pages/admin/PluginManagementPage.tsx",
]

stats = {
    "total_files": 0, "backed_up": 0, "replaced_patterns": 0,
    "replaced_imports": 0, "skipped_no_change": 0, "skipped_not_found": 0,
    "files_modified": 0,
}


def file_path(rel):
    return os.path.join(SRC, rel)


def do_backup(fpath):
    import shutil
    shutil.copy2(fpath, fpath + ".bak.phase3-4")


def has_circular_progress_tag(content):
    return bool(re.search(r'<CircularProgress[\s/>]', content))


def has_circular_progress_import(content):
    return bool(re.search(r'\bCircularProgress\b', content))


def remove_circular_progress_from_mui_import(content):
    pattern = r"import\s*(\{[^}]*\})\s*from\s*['\"]@mui/material['\"];?"

    def replacer(m):
        full = m.group(0)
        imports = m.group(1)
        imports = re.sub(r',\s*CircularProgress\b', '', imports)
        imports = re.sub(r'CircularProgress\s*,\s*', '', imports)
        imports = re.sub(r'\bCircularProgress\b', '', imports)
        imports = re.sub(r',\s*,', ',', imports)
        imports = re.sub(r'\{\s*,', '{', imports)
        imports = re.sub(r',\s*\}', '}', imports)
        return full.replace(m.group(1), imports)

    return re.sub(pattern, replacer, content, flags=re.DOTALL)


def add_import(content, component_name):
    import_line = f"import {{ {component_name} }} from '@/components/common/LoadingSpinner';"
    existing = re.search(
        r"(import\s*\{[^}]*\}\s*from\s*['\"]@/components/common/LoadingSpinner['\"];?)",
        content, re.DOTALL,
    )
    if existing:
        old = existing.group(1)
        if component_name not in old:
            new_import = old.replace('{', f'{{ {component_name}, ', 1)
            content = content.replace(old, new_import)
        return content

    pc = re.search(r"(import\s*\{[^}]*\}\s*from\s*['\"]@/components/common['\"];?)", content)
    if pc:
        content = content.replace(pc.group(0), pc.group(0) + "\n" + import_line)
        return content

    last_import = list(re.finditer(r"^import\s+.+?;?\s*$", content, re.MULTILINE))
    if last_import:
        pos = last_import[-1].end()
        content = content[:pos] + "\n" + import_line + content[pos:]
    else:
        content = import_line + "\n" + content
    return content


def find_balanced_braces(text, start):
    """
    Starting at position `start` which should point to the first '{' of '{{',
    find the matching '}}' and return the end position (after '}}').
    Handles nested braces.
    """
    depth = 0
    i = start
    while i < len(text):
        c = text[i]
        # Skip string literals
        if c in ('"', "'", '`'):
            quote = c
            i += 1
            while i < len(text) and text[i] != quote:
                if text[i] == '\\':
                    i += 1
                i += 1
            i += 1
            continue
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return i + 1
        i += 1
    return None


def find_all_box_circular_progress(content):
    """
    Find all occurrences of:
      <Box sx={{ ...centering props... }}>...<CircularProgress [size={N}]/>...</Box>
    where the inner content between > and </Box> contains ONLY CircularProgress + whitespace,
    and CircularProgress has NO custom sx prop.
    
    Also finds:
      <Stack ... alignItems: 'center' ...><CircularProgress /><Typography>...</Typography></Stack>
      <div style={{ ...centering... }}><CircularProgress /></div>
    
    Returns list of (start_pos, end_pos, replacement) tuples.
    """
    results = []
    
    # Scan for <Box tags
    box_pat = re.compile(r'<Box\b')
    for m in box_pat.finditer(content):
        start = m.start()
        pos = m.end()
        
        # Find sx={{ in the opening tag
        sx_search = re.search(r'\bsx=\{\{', content[pos:pos + 500])
        if not sx_search:
            continue
        
        sx_start_abs = pos + sx_search.start()  # absolute pos of first '{' in {{
        
        # Find matching }}
        sx_end_abs = find_balanced_braces(content, sx_start_abs)
        if sx_end_abs is None:
            continue
        
        sx_value = content[sx_start_abs:sx_end_abs]
        sx_inner = content[sx_start_abs + 2:sx_end_abs - 2]  # content between {{ and }}
        
        # Check centering conditions
        has_text_align = bool(re.search(r"textAlign:\s*['\"]center['\"]", sx_inner))
        has_flex = bool(re.search(r"display:\s*['\"]flex['\"]", sx_inner))
        has_justify = bool(re.search(r"justifyContent:\s*['\"]center['\"]", sx_inner))
        
        is_centering = has_text_align or (has_flex and has_justify)
        if not is_centering:
            continue
        
        # Find closing > of Box tag
        after_sx = content[sx_end_abs:]
        gt = re.match(r'\s*>', after_sx)
        if not gt:
            continue
        tag_close = sx_end_abs + gt.end()
        
        # Find matching </Box>
        depth = 1
        search_pos = tag_close
        close_pos = None
        inner_open = re.compile(r'<Box\b')
        inner_close = re.compile(r'</Box\s*>')
        
        while depth > 0 and search_pos < len(content):
            next_open = inner_open.search(content, search_pos)
            next_close = inner_close.search(content, search_pos)
            
            if next_close is None:
                break
            
            if next_open and next_open.start() < next_close.start():
                depth += 1
                search_pos = next_open.end()
            else:
                depth -= 1
                if depth == 0:
                    close_pos = next_close.end()
                search_pos = next_close.end()
        
        if close_pos is None:
            continue
        
        # Check inner content
        inner = content[tag_close:close_pos - len("</Box>")]
        inner_stripped = inner.strip()
        
        # Inner should be just <CircularProgress [size={N}] />
        # NOT: <CircularProgress sx={{...}} /> or <CircularProgress ... sx=... />
        cp_match = re.match(
            r'<CircularProgress(?:\s+size=\{(\d+)\})?\s*/>',
            inner_stripped,
        )
        if not cp_match:
            continue
        
        # Verify no sx on CircularProgress
        if 'sx=' in inner_stripped:
            continue
        
        size_val = cp_match.group(1)
        if size_val:
            replacement = f'<CenterLoading size={size_val} />'
        else:
            replacement = '<CenterLoading />'
        
        results.append((start, close_pos, replacement))
    
    # Scan for <Stack ...> with CircularProgress + Typography
    # Use a non-greedy approach: find <Stack, then look for sx= and >
    stack_pat = re.compile(r'<Stack\b')
    for m in stack_pat.finditer(content):
        start = m.start()
        tag_region = content[m.end():m.end() + 1000]

        # Find sx={{ in the opening tag
        sx_search = re.search(r'\bsx=\{\{', tag_region)
        if not sx_search:
            continue

        sx_start_abs = m.end() + sx_search.start()
        sx_end_abs = find_balanced_braces(content, sx_start_abs)
        if sx_end_abs is None:
            continue

        sx_inner = content[sx_start_abs + 2:sx_end_abs - 2]
        if "alignItems" not in sx_inner:
            continue

        # Find closing > of Stack tag
        after_sx = content[sx_end_abs:]
        gt = re.match(r'\s*>', after_sx)
        if not gt:
            continue
        tag_close = sx_end_abs + gt.end()

        # Find closing </Stack>
        depth = 1
        search_pos = tag_close
        close_pos = None
        inner_open = re.compile(r'<Stack\b')
        inner_close = re.compile(r'</Stack\s*>')

        while depth > 0 and search_pos < len(content):
            next_open = inner_open.search(content, search_pos)
            next_close = inner_close.search(content, search_pos)
            if next_close is None:
                break
            if next_open and next_open.start() < next_close.start():
                depth += 1
                search_pos = next_open.end()
            else:
                depth -= 1
                if depth == 0:
                    close_pos = next_close.end()
                search_pos = next_close.end()

        if close_pos is None:
            continue

        inner = content[tag_close:close_pos - len("</Stack>")].strip()
        cp_typo = re.match(
            r'<CircularProgress\s*/>\s*<Typography[^>]*>\s*加载中\.\.\.\s*</Typography>',
            inner, re.DOTALL,
        )
        if cp_typo:
            results.append((start, close_pos, '<CenterLoading message="加载中..." />'))
    
    # Scan for <div style={{ centering }}>...<CircularProgress />...</div>
    div_pat = re.compile(r"<div\b")
    for m in div_pat.finditer(content):
        start = m.start()
        tag_region = content[m.end():m.end() + 1000]

        style_search = re.search(r'\bstyle=\{\{', tag_region)
        if not style_search:
            continue

        brace_start = m.end() + style_search.start()  # position of first {
        brace_end = find_balanced_braces(content, brace_start)
        if brace_end is None:
            continue

        style_inner = content[brace_start + 2:brace_end - 2]

        has_flex = bool(re.search(r"display:\s*['\"]flex['\"]", style_inner))
        has_justify = bool(re.search(r"justifyContent:\s*['\"]center['\"]", style_inner))
        if not (has_flex and has_justify):
            continue

        # Find closing >
        after_style = content[brace_end:]
        gt = re.match(r'\s*>', after_style)
        if not gt:
            continue
        tag_close = brace_end + gt.end()

        # Find </div> -- use depth-aware search for nested divs
        depth = 1
        search_pos = tag_close
        close_pos = None
        div_open = re.compile(r'<div\b')
        div_close = re.compile(r'</div\s*>')

        while depth > 0 and search_pos < len(content):
            next_open = div_open.search(content, search_pos)
            next_close = div_close.search(content, search_pos)
            if next_close is None:
                break
            if next_open and next_open.start() < next_close.start():
                depth += 1
                search_pos = next_open.end()
            else:
                depth -= 1
                if depth == 0:
                    close_pos = next_close.end()
                search_pos = next_close.end()

        if close_pos is None:
            continue

        inner = content[tag_close:close_pos - len("</div>")].strip()
        cp_match = re.match(r'<CircularProgress\s*/>', inner)
        if cp_match:
            results.append((start, close_pos, '<CenterLoading />'))
    
    # Sort by start position (descending) so we can replace from end to start
    results.sort(key=lambda x: x[0], reverse=True)
    return results


def process_file(relpath):
    fpath = file_path(relpath)
    stats["total_files"] += 1

    if not os.path.exists(fpath):
        stats["skipped_not_found"] += 1
        print(f"  SKIP (not found): {relpath}")
        return

    with open(fpath, 'r', encoding='utf-8') as f:
        original = f.read()

    content = original

    # Find all replaceable patterns
    replacements = find_all_box_circular_progress(content)
    patterns_replaced = len(replacements)
    needs_center_loading = patterns_replaced > 0

    # Apply replacements from end to start (to preserve positions)
    for start, end, repl in replacements:
        content = content[:start] + repl + content[end:]

    # Check if CircularProgress is still used in JSX
    cp_still_used = has_circular_progress_tag(content)

    if not cp_still_used and has_circular_progress_import(content):
        content = remove_circular_progress_from_mui_import(content)
        stats["replaced_imports"] += 1

    if needs_center_loading:
        content = add_import(content, 'CenterLoading')

    if content != original:
        do_backup(fpath)
        stats["backed_up"] += 1
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
        stats["replaced_patterns"] += patterns_replaced
        stats["files_modified"] += 1
        print(f"  OK: {relpath} ({patterns_replaced} patterns replaced)")
    else:
        stats["skipped_no_change"] += 1
        print(f"  SKIP (no matching patterns): {relpath}")


for relpath in TARGET_FILES:
    process_file(relpath)

print()
print("=" * 60)
print("Phase 3.4 Replacement Statistics")
print("=" * 60)
print(f"  Total files processed:   {stats['total_files']}")
print(f"  Files modified:          {stats['files_modified']}")
print(f"  Files backed up:         {stats['backed_up']}")
print(f"  Patterns replaced:       {stats['replaced_patterns']}")
print(f"  Import lines cleaned:    {stats['replaced_imports']}")
print(f"  Skipped (no change):     {stats['skipped_no_change']}")
print(f"  Skipped (not found):     {stats['skipped_not_found']}")
print("=" * 60)
PYEOF

echo ""
ok "Phase 3.4 Loading Unification: DONE"
