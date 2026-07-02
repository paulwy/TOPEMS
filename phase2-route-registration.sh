#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# Phase 2 Route Registration Script
# Adds lazy imports and route definitions for all new Phase 2 pages
# to the appropriate route files in the TOPEMS project.
#
# Strategy:
#   - Import insertions: perl -0777 with content-based matching
#   - Route insertions: find line number of '];' at end of routes array,
#     then use sed to insert new route lines before it
###############################################################################

BASE="/Users/air/TOPEMS/apps/web/src/routes"

echo "=== Phase 2 Route Registration ==="
echo ""

#------------------------------------------------------------------------------
# Helper: backup a file before modifying it
#------------------------------------------------------------------------------
backup() {
  local file="$1"
  if [ -f "$file" ]; then
    cp "$file" "${file}.bak"
    echo "  Backed up: ${file}.bak"
  fi
}

#------------------------------------------------------------------------------
# Helper: insert lines before a specific pattern using sed
# Usage: insert_before_pattern <file> <pattern> <lines_to_insert>
# Inserts the given lines BEFORE the first line matching the pattern.
#------------------------------------------------------------------------------
insert_before_pattern() {
  local file="$1"
  local pattern="$2"
  shift 2
  # Build sed command: for each line to insert, use 'i\' command
  local sed_cmd=""
  for line in "$@"; do
    sed_cmd="${sed_cmd}i\\
${line}
"
  done
  sed "${pattern}${sed_cmd}" "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
}

#------------------------------------------------------------------------------
# 1. routes/professional.ts — LIMS + QMS + EHS new pages
#------------------------------------------------------------------------------
echo "[1/6] Processing professional.ts ..."

FILE="${BASE}/professional.ts"
backup "$FILE"

# --- Insert lazy imports after the last import (HazardPage) ---
perl -i -0777 -pe \
  "s{(const HazardPage = lazy\(\(\) => import\([^)]+\)\);)\n(\nexport const professionalRoutes)}{\$1\n\n// LIMS new pages\nconst LimsTestMethodPage = lazy(() => import('../pages/lims/LimsTestMethodPage'));\nconst LimsProficiencyTestingPage = lazy(() => import('../pages/lims/LimsProficiencyTestingPage'));\nconst LimsUncertaintyPage = lazy(() => import('../pages/lims/LimsUncertaintyPage'));\nconst LimsInstrumentDetailPage = lazy(() => import('../pages/lims/LimsInstrumentDetailPage'));\n\n// QMS new pages\nconst QmsDashboardPage = lazy(() => import('../pages/qms/QmsDashboardPage'));\n\n// EHS new pages\nconst EhsOccupationalDiseasePage = lazy(() => import('../pages/ehs/EhsOccupationalDiseasePage'));\nconst EhsHazardousMaterialPage = lazy(() => import('../pages/ehs/EhsHazardousMaterialPage'));\n\$2}s" \
  "$FILE"

# --- Insert route definitions before the closing '];' ---
# Find the line number of '];' that closes the professionalRoutes array
# (it's the last '];' in the file)
CLOSING_LINE=$(grep -n '^];' "$FILE" | tail -1 | cut -d: -f1)

# Insert new route entries before the closing '];'
sed -i '' "${CLOSING_LINE}i\\
  // LIMS new pages\\
  { path: '/lims/test-methods', element: <LimsTestMethodPage />, module: 'lims', requiredPermissions: ['lims:read'], action: 'read' },\\
  { path: '/lims/proficiency-testing', element: <LimsProficiencyTestingPage />, module: 'lims', requiredPermissions: ['lims:read'], action: 'read' },\\
  { path: '/lims/uncertainty', element: <LimsUncertaintyPage />, module: 'lims', requiredPermissions: ['lims:read'], action: 'read' },\\
  { path: '/lims/instrument/:id', element: <LimsInstrumentDetailPage />, module: 'lims', requiredPermissions: ['lims:read'], action: 'read' },\\
  // QMS new pages\\
  { path: '/qms/dashboard', element: <QmsDashboardPage />, module: 'qms', requiredPermissions: ['qms:read'], action: 'read' },\\
  // EHS new pages\\
  { path: '/ehs/occupational-disease', element: <EhsOccupationalDiseasePage />, module: 'ehs', requiredPermissions: ['ehs:read'], action: 'read' },\\
  { path: '/ehs/hazardous-materials', element: <EhsHazardousMaterialPage />, module: 'ehs', requiredPermissions: ['ehs:read'], action: 'read' },
" "$FILE"

echo "  Done: professional.ts"

#------------------------------------------------------------------------------
# 2. routes/srm.ts — SRM new pages
#------------------------------------------------------------------------------
echo "[2/6] Processing srm.ts ..."

FILE="${BASE}/srm.ts"
backup "$FILE"

# --- Insert lazy imports after last import (SupplierDetailPage) ---
perl -i -0777 -pe \
  "s{(const SupplierDetailPage = lazy\(\(\) => import\([^)]+\)\);)\n(\nexport const srmRoutes)}{\$1\n\n// SRM new pages\nconst SrmCategoryPage = lazy(() => import('../pages/srm/SrmCategoryPage'));\nconst SrmSupplierProductPage = lazy(() => import('../pages/srm/SrmSupplierProductPage'));\nconst SrmScoringDimensionPage = lazy(() => import('../pages/srm/SrmScoringDimensionPage'));\n\$2}s" \
  "$FILE"

# --- Insert route definitions ---
CLOSING_LINE=$(grep -n '^];' "$FILE" | tail -1 | cut -d: -f1)
sed -i '' "${CLOSING_LINE}i\\
  { path: '/srm/categories', element: <SrmCategoryPage />, module: 'srm', requiredPermissions: ['srm:read'], action: 'read' },\\
  { path: '/srm/supplier-products', element: <SrmSupplierProductPage />, module: 'srm', requiredPermissions: ['srm:read'], action: 'read' },\\
  { path: '/srm/scoring-dimensions', element: <SrmScoringDimensionPage />, module: 'srm', requiredPermissions: ['srm:read'], action: 'read' },
" "$FILE"

echo "  Done: srm.ts"

#------------------------------------------------------------------------------
# 3. routes/scm.ts — SCM new pages
#------------------------------------------------------------------------------
echo "[3/6] Processing scm.ts ..."

FILE="${BASE}/scm.ts"
backup "$FILE"

# --- Insert lazy imports after last import (SupplierDetailPage) ---
perl -i -0777 -pe \
  "s{(const SupplierDetailPage = lazy\(\(\) => import\([^)]+\)\);)\n(\nexport const scmRoutes)}{\$1\n\n// SCM new pages\nconst ScmPriceComparisonPage = lazy(() => import('../pages/scm/ScmPriceComparisonPage'));\nconst ScmInventoryTurnoverPage = lazy(() => import('../pages/scm/ScmInventoryTurnoverPage'));\nconst ScmOverviewPage = lazy(() => import('../pages/scm/ScmOverviewPage'));\n\$2}s" \
  "$FILE"

# --- Insert route definitions ---
CLOSING_LINE=$(grep -n '^];' "$FILE" | tail -1 | cut -d: -f1)
sed -i '' "${CLOSING_LINE}i\\
  { path: '/scm/price-comparison', element: <ScmPriceComparisonPage />, module: 'scm', requiredPermissions: ['scm:read'], action: 'read' },\\
  { path: '/scm/inventory-turnover', element: <ScmInventoryTurnoverPage />, module: 'scm', requiredPermissions: ['scm:read'], action: 'read' },
" "$FILE"

echo "  Done: scm.ts"

#------------------------------------------------------------------------------
# 4. routes/finance.ts — Finance Dashboard
#------------------------------------------------------------------------------
echo "[4/6] Processing finance.ts ..."

FILE="${BASE}/finance.ts"
backup "$FILE"

# --- Insert lazy import after last import (VoucherTemplatePage) ---
perl -i -0777 -pe \
  "s{(const VoucherTemplatePage = lazy\(\(\) => import\([^)]+\)\);)\n(\nexport const financeRoutes)}{\$1\n\n// Finance new pages\nconst FinanceDashboardOverviewPage = lazy(() => import('../pages/finance/FinanceDashboardPage'));\n\$2}s" \
  "$FILE"

# --- Insert route definition ---
CLOSING_LINE=$(grep -n '^];' "$FILE" | tail -1 | cut -d: -f1)
sed -i '' "${CLOSING_LINE}i\\
  { path: '/finance/dashboard', element: <FinanceDashboardOverviewPage />, module: 'finance', requiredPermissions: ['finance:read'], action: 'read' },
" "$FILE"

echo "  Done: finance.ts"

#------------------------------------------------------------------------------
# 5. routes/hrm.ts — HRM Overview
#------------------------------------------------------------------------------
echo "[5/6] Processing hrm.ts ..."

FILE="${BASE}/hrm.ts"
backup "$FILE"

# --- Insert lazy import after last import (HrmReportsPage) ---
perl -i -0777 -pe \
  "s{(const HrmReportsPage = lazy\(\(\) => import\([^)]+\)\);)\n(\nexport const hrmRoutes)}{\$1\n\n// HRM new pages\nconst HrmOverviewPage = lazy(() => import('../pages/hrm/HrmOverviewPage'));\n\$2}s" \
  "$FILE"

# --- Insert route definition ---
CLOSING_LINE=$(grep -n '^];' "$FILE" | tail -1 | cut -d: -f1)
sed -i '' "${CLOSING_LINE}i\\
  { path: '/hrm/overview', element: <HrmOverviewPage />, module: 'hrm', requiredPermissions: ['hrm:read'], action: 'read' },
" "$FILE"

echo "  Done: hrm.ts"

#------------------------------------------------------------------------------
# 6. routes/rs.ts — RS Overview
#------------------------------------------------------------------------------
echo "[6/6] Processing rs.ts ..."

FILE="${BASE}/rs.ts"
backup "$FILE"

# --- Insert lazy import after last import (RsTestPage) ---
perl -i -0777 -pe \
  "s{(const RsTestPage = lazy\(\(\) => import\([^)]+\)\);)\n(\nexport const rsRoutes)}{\$1\n\n// RS new pages\nconst RsOverviewPage = lazy(() => import('../pages/rs/RsOverviewPage'));\n\$2}s" \
  "$FILE"

# --- Insert route definition ---
CLOSING_LINE=$(grep -n '^];' "$FILE" | tail -1 | cut -d: -f1)
sed -i '' "${CLOSING_LINE}i\\
  { path: '/rs/overview', element: <RsOverviewPage />, module: 'rs', requiredPermissions: ['rs:read'], action: 'read' },
" "$FILE"

echo "  Done: rs.ts"

echo ""
echo "=== Phase 2 Route Registration Complete ==="
echo "Modified files:"
echo "  - ${BASE}/professional.ts"
echo "  - ${BASE}/srm.ts"
echo "  - ${BASE}/scm.ts"
echo "  - ${BASE}/finance.ts"
echo "  - ${BASE}/hrm.ts"
echo "  - ${BASE}/rs.ts"
echo ""
echo "Backup files (.bak) created for each modified file."
