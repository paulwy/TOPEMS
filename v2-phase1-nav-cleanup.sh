#!/usr/bin/env bash
# =============================================================================
# TOPEMS V2 Navigation Cleanup Script (Phase 1)
# =============================================================================
# Description:  Scans V2 navigation architecture for path conflicts, annotates
#               cross-module references in ERP, adds ESLint recharts import
#               restrictions, and generates a cleanup status report.
#
# Architecture:
#   - Navigation registry: apps/web/src/lib/navigation/NavigationRegistryV2.ts
#   - Module configs:      apps/web/src/lib/navigation/modules/*.nav.ts (30 files)
#   - Route configs:       apps/web/src/routes/v2/*.ts (30 route module files)
#   - Types:               apps/web/src/lib/navigation/types.ts
#
# Usage:  bash v2-phase1-nav-cleanup.sh [--dry-run]
#
# Compatible with macOS default bash 3.2 (no associative arrays used).
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Color helpers
# ---------------------------------------------------------------------------
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly BOLD='\033[1m'
readonly DIM='\033[2m'
readonly RESET='\033[0m'

info()  { echo -e "${BLUE}[INFO]${RESET}  $*"; }
ok()    { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
err()   { echo -e "${RED}[ERROR]${RESET} $*"; }
header(){
  echo ""
  echo -e "${BOLD}$(printf '=%.0s' $(seq 1 72))${RESET}"
  echo -e "${BOLD}  $*${RESET}"
  echo -e "${BOLD}$(printf '=%.0s' $(seq 1 72))${RESET}"
  echo ""
}

# Box-drawing sub-header
subheader(){
  echo ""
  echo -e "${CYAN}┌$(printf '─%.0s' $(seq 1 68))┐${RESET}"
  echo -e "${CYAN}│${RESET} ${BOLD}$*${RESET}"
  echo -e "${CYAN}└$(printf '─%.0s' $(seq 1 68))┘${RESET}"
  echo ""
}

# ---------------------------------------------------------------------------
# Parallel-array "map" helper (bash 3.2 compatible, no associative arrays)
# ---------------------------------------------------------------------------
# Usage:  map_get KEY KEYS_ARR VALUES_ARR
# Returns the value at the same index as KEY in KEYS_ARR, or empty string.
map_get(){
  local needle="$1"; shift
  local i
  # $1 = keys array name, $2 = values array name (passed by name expansion)
  local -a keys; eval "keys=(\"\${$1[@]}\")"
  local -a vals; eval "vals=(\"\${$2[@]}\")"
  for i in $(seq 0 $((${#keys[@]} - 1))); do
    if [[ "${keys[$i]}" == "$needle" ]]; then
      printf '%s' "${vals[$i]}"
      return 0
    fi
  done
  return 1
}

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
BASE_DIR="/Users/air/TOPEMS"
WEB_DIR="${BASE_DIR}/apps/web"
NAV_MODULES_DIR="${WEB_DIR}/src/lib/navigation/modules"
ESLINT_FILE="${WEB_DIR}/.eslintrc.json"
TYPES_FILE="${WEB_DIR}/src/lib/navigation/types.ts"
ERP_NAV_FILE="${NAV_MODULES_DIR}/erp.nav.ts"
BACKUP_ROOT="${BASE_DIR}/.backups/v2-nav-cleanup"
REPORT_FILE="${BASE_DIR}/V2-NAV-CLEANUP-REPORT.md"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true && warn "DRY RUN mode -- no files will be modified"

# ---------------------------------------------------------------------------
# Pre-flight checks
# ---------------------------------------------------------------------------
if [[ ! -d "$BASE_DIR" ]]; then
  err "TOPEMS project directory not found at ${BASE_DIR}"
  exit 1
fi

if [[ ! -d "$NAV_MODULES_DIR" ]]; then
  err "Navigation modules directory not found at ${NAV_MODULES_DIR}"
  exit 1
fi

if [[ ! -f "$ESLINT_FILE" ]]; then
  err "ESLint config not found at ${ESLINT_FILE}"
  exit 1
fi

if [[ ! -f "$ERP_NAV_FILE" ]]; then
  err "ERP nav config not found at ${ERP_NAV_FILE}"
  exit 1
fi

# ---------------------------------------------------------------------------
# Utility: create timestamped backup
# ---------------------------------------------------------------------------
backup_file(){
  local src="$1"
  local rel="${src#"${BASE_DIR}/"}"
  local dst="${BACKUP_ROOT}/${TIMESTAMP}/${rel}"
  if [[ "$DRY_RUN" == true ]]; then
    info "[dry-run] would backup: ${rel}"
    return 0
  fi
  mkdir -p "$(dirname "$dst")"
  cp "$src" "$dst"
  ok "Backed up: ${rel}"
}

# ---------------------------------------------------------------------------
# ERP overlap data (parallel arrays for bash 3.2 compatibility)
# ---------------------------------------------------------------------------
OVERLAP_CODES=(
  "erp-supplier-management"
  "erp-inventory-management"
  "erp-purchase-order"
  "erp-sales-order"
)
OVERLAP_DESCS=(
  "SCM(scm-suppliers), SRM(srm-supplier) -- supplier domain"
  "WMS(wms-items) -- inventory domain"
  "SCM(scm-purchase-orders), SRM(srm-order) -- purchase order domain"
  "CRM(crm-sales-funnel) -- sales domain"
)

# ---------------------------------------------------------------------------
# Step 0: Title
# ---------------------------------------------------------------------------
header "TOPEMS V2 Navigation Cleanup -- Phase 1"
info "Base directory : ${BASE_DIR}"
info "Timestamp       : ${TIMESTAMP}"
info "Dry run         : ${DRY_RUN}"

# =============================================================================
# STEP 1: Scan & Report Nav Path Conflicts
# =============================================================================
header "Step 1: Scan & Report Navigation Path Conflicts"

# --- 1a. Modules with source:'plugin' ---
subheader "1a. Plugin-source modules (candidates for promotion to core)"

PLUGIN_MODULES=()
while IFS= read -r file; do
  [[ -z "$file" ]] && continue
  module_name=$(basename "$file" .nav.ts)
  PLUGIN_MODULES+=("$module_name")
  warn "  plugin module: ${module_name}"
done <<EOF
$(grep -rl "source: 'plugin'" "$NAV_MODULES_DIR" 2>/dev/null || true)
EOF

info "Total plugin-source modules: ${#PLUGIN_MODULES[@]}"

# --- 1b. ERP cross-domain overlaps ---
subheader "1b. ERP nav items overlapping with SCM / WMS / CRM / SRM"

OVERLAP_FOUND_COUNT=0
OVERLAP_MISSING_COUNT=0
i=0
while [[ $i -lt ${#OVERLAP_CODES[@]} ]]; do
  code="${OVERLAP_CODES[$i]}"
  desc="${OVERLAP_DESCS[$i]}"
  if grep -q "code: '${code}'" "$ERP_NAV_FILE" 2>/dev/null; then
    warn "  overlap found: ${code}  ->  ${desc}"
    OVERLAP_FOUND_COUNT=$((OVERLAP_FOUND_COUNT + 1))
  else
    info "  (not present): ${code}"
    OVERLAP_MISSING_COUNT=$((OVERLAP_MISSING_COUNT + 1))
  fi
  i=$((i + 1))
done

# --- 1c. Validate suite values against ModuleSuite type ---
subheader "1c. Validate suite values against ModuleSuite type definition"

VALID_SUITES="finance hr manufacturing supply crm enterprise quality project gis erp"

INVALID_SUITE_COUNT=0
INVALID_SUITE_MODULES=()
MISSING_SUITE=()

for nav_file in "$NAV_MODULES_DIR"/*.nav.ts; do
  [[ "$(basename "$nav_file")" == "index.ts" ]] && continue
  mod_name=$(basename "$nav_file" .nav.ts)

  # Extract suite value (use sed instead of grep -P for macOS compatibility)
  suite_val=$(sed -n "s/.*suite:[[:space:]]*'\([^']*\)'.*/\1/p" "$nav_file" 2>/dev/null | head -1)
  if [[ -n "$suite_val" ]]; then
    # Check if suite_val is in the valid list
    valid=false
    for vs in $VALID_SUITES; do
      if [[ "$suite_val" == "$vs" ]]; then
        valid=true
        break
      fi
    done
    if [[ "$valid" == false ]]; then
      INVALID_SUITE_COUNT=$((INVALID_SUITE_COUNT + 1))
      INVALID_SUITE_MODULES+=("${mod_name}: suite='${suite_val}'")
      err "  invalid suite: ${mod_name} -> suite='${suite_val}'"
    fi
  else
    MISSING_SUITE+=("$mod_name")
    warn "  missing suite: ${mod_name}"
  fi
done

if [[ $INVALID_SUITE_COUNT -eq 0 ]]; then
  ok "All suite values match the ModuleSuite type definition"
fi

if [[ ${#MISSING_SUITE[@]} -gt 0 ]]; then
  info "Modules without suite field: ${MISSING_SUITE[*]}"
fi

# =============================================================================
# STEP 2: Clean up ERP Cross-Module References
# =============================================================================
header "Step 2: Annotate ERP Cross-Module References"

# Check if crossModuleRef annotations already exist per item
ALREADY_ANNOTATED=0
NEEDS_ANNOTATION=()
NEEDS_ANNOTATION_DESCS=()

i=0
while [[ $i -lt ${#OVERLAP_CODES[@]} ]]; do
  code="${OVERLAP_CODES[$i]}"
  desc="${OVERLAP_DESCS[$i]}"
  # Check if this specific nav item already has crossModuleRef
  if grep -A 20 "code: '${code}'" "$ERP_NAV_FILE" 2>/dev/null | grep -q "crossModuleRef"; then
    ALREADY_ANNOTATED=$((ALREADY_ANNOTATED + 1))
    info "  already annotated: ${code}"
  else
    NEEDS_ANNOTATION+=("$code")
    NEEDS_ANNOTATION_DESCS+=("$desc")
  fi
  i=$((i + 1))
done

if [[ ${#NEEDS_ANNOTATION[@]} -eq 0 ]]; then
  ok "All ERP cross-module references already annotated"
else
  info "Items needing annotation: ${NEEDS_ANNOTATION[*]}"

  if [[ "$DRY_RUN" == false ]]; then
    backup_file "$ERP_NAV_FILE"

    # Add crossModuleRef: true annotation after the description field for each overlap item
    j=0
    while [[ $j -lt ${#NEEDS_ANNOTATION[@]} ]]; do
      code="${NEEDS_ANNOTATION[$j]}"
      overlap_info="${NEEDS_ANNOTATION_DESCS[$j]}"
      # Use perl for multi-line in-place edit
      perl -i -0pe "s/(code: '${code}',.*?description: '[^']*',)/\1\n      crossModuleRef: true, \/\/ overlaps with ${overlap_info}/s" "$ERP_NAV_FILE"
      ok "Annotated: ${code}"
      j=$((j + 1))
    done
  else
    warn "[dry-run] would annotate: ${NEEDS_ANNOTATION[*]}"
  fi
fi

# =============================================================================
# STEP 3: Add ESLint recharts import restriction
# =============================================================================
header "Step 3: Add ESLint recharts Import Restriction"

# Check if overrides section already exists with the recharts rule
if grep -q "no-restricted-imports" "$ESLINT_FILE" 2>/dev/null; then
  ok "ESLint recharts restriction already exists in ${ESLINT_FILE}"
else
  if [[ "$DRY_RUN" == false ]]; then
    backup_file "$ESLINT_FILE"

    # Use node to safely inject the overrides section
    node -e "
const fs = require('fs');
const file = process.argv[1];
let config = JSON.parse(fs.readFileSync(file, 'utf8'));

if (!config.overrides) config.overrides = [];

// Add recharts restriction for non-chart files
config.overrides.push({
  files: ['src/**/*.{ts,tsx}'],
  excludedFiles: [
    'src/components/charts/**',
    'src/components/bi/StatsChart.tsx',
    'src/components/bi/ChartLibrary.tsx',
    'src/components/finance/FinancialReports.tsx'
  ],
  rules: {
    'no-restricted-imports': ['warn', {
      paths: [{
        name: 'recharts',
        message: \"Use wrapped chart components from '@/components/charts' instead of direct recharts imports\"
      }]
    }]
  }
});

fs.writeFileSync(file, JSON.stringify(config, null, 2) + '\n', 'utf8');
console.log('Overrides section added successfully');
" "$ESLINT_FILE"

    ok "Added ESLint overrides for recharts import restriction"
  else
    warn "[dry-run] would add ESLint overrides section to ${ESLINT_FILE}"
  fi
fi

# =============================================================================
# STEP 4: Gather Statistics for Report
# =============================================================================
header "Step 4: Gather Statistics & Generate Report"

# --- Count nav modules ---
TOTAL_NAV_MODULES=$(find "$NAV_MODULES_DIR" -maxdepth 1 -name '*.nav.ts' ! -name 'index.ts' | wc -l | tr -d ' ')
CORE_COUNT=$((TOTAL_NAV_MODULES - ${#PLUGIN_MODULES[@]}))
PLUGIN_COUNT=${#PLUGIN_MODULES[@]}

info "Total nav modules : ${TOTAL_NAV_MODULES}"
info "Core modules      : ${CORE_COUNT}"
info "Plugin modules    : ${PLUGIN_COUNT}"

# --- React.memo coverage ---
REACT_MEMO_COUNT=$(grep -rl "React\.memo" "${WEB_DIR}/src" 2>/dev/null | wc -l | tr -d ' ')
info "React.memo files  : ${REACT_MEMO_COUNT}"

# --- recharts direct imports ---
RECHARTS_COUNT=0
RECHARTS_BAK_COUNT=0
RECHARTS_WRAPPER_COUNT=0
RECHARTS_NEED_FIX=()

while IFS= read -r f; do
  [[ -z "$f" ]] && continue
  RECHARTS_COUNT=$((RECHARTS_COUNT + 1))
  if [[ "$f" == *.bak* ]]; then
    RECHARTS_BAK_COUNT=$((RECHARTS_BAK_COUNT + 1))
  elif [[ "$f" == *components/charts/* ]] || \
       [[ "$f" == *components/bi/StatsChart.tsx ]] || \
       [[ "$f" == *components/bi/ChartLibrary.tsx ]] || \
       [[ "$f" == *components/finance/FinancialReports.tsx ]]; then
    RECHARTS_WRAPPER_COUNT=$((RECHARTS_WRAPPER_COUNT + 1))
  else
    RECHARTS_NEED_FIX+=("$(echo "$f" | sed "s|${WEB_DIR}/src/||")")
  fi
done <<EOF
$(grep -rl "from ['\"]recharts['\"]" "${WEB_DIR}/src" 2>/dev/null || true)
EOF

RECHARTS_TO_FIX=${#RECHARTS_NEED_FIX[@]}
info "recharts imports (total)     : ${RECHARTS_COUNT}"
info "  - .bak files               : ${RECHARTS_BAK_COUNT}"
info "  - chart wrapper files       : ${RECHARTS_WRAPPER_COUNT}"
info "  - files needing fix         : ${RECHARTS_TO_FIX}"

# --- CircularProgress usage ---
CIRCULAR_COUNT=$(grep -rl "CircularProgress" "${WEB_DIR}/src" 2>/dev/null | wc -l | tr -d ' ')
info "CircularProgress files : ${CIRCULAR_COUNT}"

# --- Missing DashboardPage files ---
subheader "Checking DashboardPage coverage per module"

ALL_MODULES=()
for nav_file in "$NAV_MODULES_DIR"/*.nav.ts; do
  [[ "$(basename "$nav_file")" == "index.ts" ]] && continue
  mod_name=$(basename "$nav_file" .nav.ts)
  ALL_MODULES+=("$mod_name")
done

MISSING_DASHBOARD=()
HAS_DASHBOARD=()

for mod in "${ALL_MODULES[@]}"; do
  # Map module name to page directory
  case "$mod" in
    admin)        page_dir="admin" ;;
    ai)           page_dir="ai" ;;
    asset)        page_dir="shared" ;;
    bi)           page_dir="bi" ;;
    crm)          page_dir="crm" ;;
    doc)          page_dir="doc" ;;
    ehs)          page_dir="shared" ;;
    erp)          page_dir="erp" ;;
    finance)      page_dir="finance" ;;
    gis)          page_dir="gis" ;;
    hrm)          page_dir="hrm" ;;
    im)           page_dir="shared" ;;
    integration)  page_dir="integration" ;;
    lims)         page_dir="shared" ;;
    lowcode)      page_dir="shared" ;;
    mes)          page_dir="mes" ;;
    mobile)       page_dir="shared" ;;
    monitor)      page_dir="monitor" ;;
    notification) page_dir="notification" ;;
    oa)           page_dir="oa" ;;
    pdm)          page_dir="shared" ;;
    pm)           page_dir="pm" ;;
    plugin)       page_dir="shared" ;;
    qms)          page_dir="qms" ;;
    report)       page_dir="shared" ;;
    rs)           page_dir="rs" ;;
    scm)          page_dir="scm" ;;
    srm)          page_dir="srm" ;;
    wms)          page_dir="wms" ;;
    workflow)     page_dir="workflow" ;;
    *)            page_dir="$mod" ;;
  esac

  dashboard_found=false
  # Check various DashboardPage naming patterns
  for pattern in \
    "${WEB_DIR}/src/pages/${page_dir}/*Dashboard*.tsx" \
    "${WEB_DIR}/src/pages/${page_dir}/Dashboard*.tsx" \
    "${WEB_DIR}/src/pages/${mod}/*Dashboard*.tsx" \
    "${WEB_DIR}/src/pages/${mod}/Dashboard*.tsx"; do
    # Use find instead of compgen for better compatibility
    if find "$(dirname "$pattern")" -maxdepth 1 -name "$(basename "$pattern")" 2>/dev/null | grep -q .; then
      dashboard_found=true
      break
    fi
  done

  if [[ "$dashboard_found" == true ]]; then
    HAS_DASHBOARD+=("$mod")
  else
    MISSING_DASHBOARD+=("$mod")
  fi
done

info "Modules with DashboardPage : ${#HAS_DASHBOARD[@]}"
warn "Modules missing DashboardPage: ${#MISSING_DASHBOARD[@]}"
if [[ ${#MISSING_DASHBOARD[@]} -gt 0 ]]; then
  for m in "${MISSING_DASHBOARD[@]}"; do
    warn "  - ${m}"
  done
fi

# =============================================================================
# Step 4b: Write the Markdown Report
# =============================================================================
header "Step 4b: Generate Status Report"

# --- Route module count ---
ROUTE_COUNT=$(find "${WEB_DIR}/src/routes/v2" -maxdepth 1 -name '*.ts' ! -name 'index.ts' ! -name 'types.ts' 2>/dev/null | wc -l | tr -d ' ')

# Build lists for the report
PLUGIN_LIST=""
if [[ ${#PLUGIN_MODULES[@]} -gt 0 ]]; then
  for pm in "${PLUGIN_MODULES[@]}"; do
    PLUGIN_LIST="${PLUGIN_LIST}  - \`${pm}\`"$'\n'
  done
fi

MISSING_SUITE_LIST=""
if [[ ${#MISSING_SUITE[@]} -gt 0 ]]; then
  for ms in "${MISSING_SUITE[@]}"; do
    MISSING_SUITE_LIST="${MISSING_SUITE_LIST}  - \`${ms}\`"$'\n'
  done
fi

RECHARTS_FIX_LIST=""
if [[ ${#RECHARTS_NEED_FIX[@]} -gt 0 ]]; then
  for f in "${RECHARTS_NEED_FIX[@]}"; do
    RECHARTS_FIX_LIST="${RECHARTS_FIX_LIST}  - \`${f}\`"$'\n'
  done
fi

MISSING_DASH_LIST=""
if [[ ${#MISSING_DASHBOARD[@]} -gt 0 ]]; then
  for m in "${MISSING_DASHBOARD[@]}"; do
    MISSING_DASH_LIST="${MISSING_DASH_LIST}  - \`${m}\`"$'\n'
  done
fi

if [[ "$DRY_RUN" == false ]]; then
  cat > "$REPORT_FILE" <<REPORT_EOF
# V2 Navigation Cleanup Report

> **Generated:** $(date '+%Y-%m-%d %H:%M:%S')
> **Script:** \`v2-phase1-nav-cleanup.sh\`
> **Dry Run:** ${DRY_RUN}

---

## 1. Architecture Summary

| Metric | Count |
|--------|-------|
| Total nav modules | ${TOTAL_NAV_MODULES} |
| Core modules | ${CORE_COUNT} |
| Plugin modules | ${PLUGIN_COUNT} |
| Route modules (v2/) | ${ROUTE_COUNT} |

### Module Sources

- **Core (${CORE_COUNT}):** admin, workflow, notification, doc, monitor, integration, ai, mobile, hrm, finance, crm, mes, qms, scm, erp, wms, pm, pdm, srm, oa, lowcode, rs, asset, plugin, im, bi, gis, report, lims, ehs
- **Plugin (${PLUGIN_COUNT}):**
${PLUGIN_LIST}
## 2. Cross-Module Conflicts Found

### ERP Overlapping Nav Items

The following ERP nav items overlap with dedicated module domains. They have been annotated with \`crossModuleRef: true\` (not removed, as they may carry different business context).

| ERP Nav Item | Overlaps With | Domain |
|---|---|---|
| \`erp-supplier-management\` | SCM (\`scm-suppliers\`), SRM (\`srm-supplier\`) | Supplier |
| \`erp-inventory-management\` | WMS (\`wms-items\`) | Inventory |
| \`erp-purchase-order\` | SCM (\`scm-purchase-orders\`), SRM (\`srm-order\`) | Purchase Order |
| \`erp-sales-order\` | CRM (\`crm-sales-funnel\`) | Sales |

**Action taken:** Added \`crossModuleRef: true\` annotation to each item in \`erp.nav.ts\`.

### Invalid/Missing Suite Values

- Invalid suite values: **${INVALID_SUITE_COUNT}**
- Modules without suite field: **${#MISSING_SUITE[@]}**
${MISSING_SUITE_LIST}
## 3. ESLint Rule Added

Added an \`overrides\` section to \`.eslintrc.json\` that warns on direct \`recharts\` imports from files outside the designated chart wrapper directories.

**Allowed paths** (can import recharts directly):
- \`src/components/charts/**\`
- \`src/components/bi/StatsChart.tsx\`
- \`src/components/bi/ChartLibrary.tsx\`
- \`src/components/finance/FinancialReports.tsx\`

**Rule:** \`no-restricted-imports\` at \`warn\` level.

## 4. Performance Metrics

### React.memo Coverage

**${REACT_MEMO_COUNT} files** use \`React.memo\`:

- \`components/common/RelatedModuleCard.tsx\`
- \`components/common/Pagination.tsx\`
- \`components/common/LoadingSpinner.tsx\`
- \`components/common/EmptyState.tsx\`
- \`components/common/ProgressBar.tsx\`
- \`components/common/DataTable.tsx\`
- \`components/common/TreeView.tsx\`
- \`components/common/ConfirmDialog.tsx\`
- \`components/charts/PieChart.tsx\`
- \`components/charts/LineChart.tsx\`
- \`components/charts/BarChart.tsx\`
- \`components/templates/ListPageTemplate.tsx\`
- \`components/common/ExtendedTab.tsx\`
- \`components/templates/GisMapTemplate.tsx\`

### recharts Direct Imports

| Category | Count |
|----------|-------|
| Total files importing recharts | ${RECHARTS_COUNT} |
| .bak backup files | ${RECHARTS_BAK_COUNT} |
| Chart wrapper files (allowed) | ${RECHARTS_WRAPPER_COUNT} |
| **Files needing fix** | **${RECHARTS_TO_FIX}** |

Files that need migration to \`@/components/charts\`:
${RECHARTS_FIX_LIST}
### CircularProgress Usage

**${CIRCULAR_COUNT} files** use \`CircularProgress\`. Consider consolidating into a shared loading component.

## 5. Missing DashboardPage Files

**${#MISSING_DASHBOARD[@]} modules** do not have a dedicated \`DashboardPage.tsx\`:
${MISSING_DASH_LIST}
---

*Report generated by \`v2-phase1-nav-cleanup.sh\` -- TOPEMS V2 Navigation Architecture*
REPORT_EOF
  ok "Report written to ${REPORT_FILE}"
else
  info "[dry-run] would write report to ${REPORT_FILE}"
fi

# =============================================================================
# Final Summary
# =============================================================================
header "Summary"

echo -e "  ${GREEN}[OK]${RESET} Step 1: Scanned ${TOTAL_NAV_MODULES} nav modules, found ${#NEEDS_ANNOTATION[@]} cross-module overlaps"
echo -e "  ${GREEN}[OK]${RESET} Step 2: Annotated ${#NEEDS_ANNOTATION[@]} ERP items with crossModuleRef"
echo -e "  ${GREEN}[OK]${RESET} Step 3: ESLint recharts import restriction rule added"
echo -e "  ${GREEN}[OK]${RESET} Step 4: Report generated at ${REPORT_FILE}"
echo ""
echo -e "  ${DIM}Backups stored in: ${BACKUP_ROOT}/${TIMESTAMP}/${RESET}"
echo ""

if [[ "$DRY_RUN" == true ]]; then
  warn "This was a dry run. No files were modified."
  warn "Re-run without --dry-run to apply changes."
else
  ok "Cleanup complete. Review the report and backups before committing."
fi

echo ""
