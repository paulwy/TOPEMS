#!/usr/bin/env bash
# =============================================================================
# TOPEMS v2 Phase 3 — Architecture Improvements
# =============================================================================
# 1. Add getNavItemsGroupedByBusinessDomain() to NavigationRegistryV2
# 2. Enhance test setup (file mock)
# 3. Remove duplicate lazyWithRetry in routes/v2/types.ts
# 4. Add NavigationRegistryV2 unit test
# =============================================================================
set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
BASE_DIR="/Users/air/TOPEMS"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DRY_RUN="${DRY_RUN:-0}"

WEB_SRC="${BASE_DIR}/apps/web/src"
NAV_FILE="${WEB_SRC}/lib/navigation/NavigationRegistryV2.ts"
TYPES_FILE="${WEB_SRC}/routes/v2/types.ts"
UTILS_FILE="${WEB_SRC}/routes/utils.ts"
SETUP_FILE="${WEB_SRC}/test/setup.ts"
FILEMOCK_DIR="${WEB_SRC}/test/__mocks__"
FILEMOCK_FILE="${FILEMOCK_DIR}/fileMock.ts"
TEST_DIR="${WEB_SRC}/lib/navigation/__tests__"
TEST_FILE="${TEST_DIR}/NavigationRegistryV2.test.ts"
BACKUP_DIR="${BASE_DIR}/.backups/phase3-${TIMESTAMP}"

# ---------------------------------------------------------------------------
# Color helpers (macOS bash 3.2 compatible)
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

info()  { echo -e "${CYAN}[INFO]${RESET}  $*"; }
ok()    { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
err()   { echo -e "${RED}[ERROR]${RESET} $*"; exit 1; }

box_top()    { echo -e "${BOLD}┌─────────────────────────────────────────────────────────────────┐${RESET}"; }
box_bottom() { echo -e "${BOLD}└─────────────────────────────────────────────────────────────────┘${RESET}"; }
box_line()   { local msg="$1"; echo -e "${BOLD}│${RESET} $(printf '%-62s' "$msg") ${BOLD}│${RESET}"; }

dry_echo() {
  if [[ "$DRY_RUN" == "1" ]]; then
    echo -e "  ${DIM}[DRY-RUN] $*${RESET}"
  fi
}

run_cmd() {
  if [[ "$DRY_RUN" == "1" ]]; then
    echo -e "  ${DIM}[DRY-RUN] $*${RESET}"
  else
    "$@"
  fi
}

# ---------------------------------------------------------------------------
# Pre-flight checks
# ---------------------------------------------------------------------------
box_top
box_line "TOPEMS v2 Phase 3 — Architecture Improvements"
box_line "Timestamp: ${TIMESTAMP}"
box_line "Dry Run:   ${DRY_RUN}"
box_bottom
echo ""

for f in "$NAV_FILE" "$TYPES_FILE" "$UTILS_FILE"; do
  [[ -f "$f" ]] || err "Required file not found: $f"
done

[[ -f "$SETUP_FILE" ]] && info "Test setup file already exists, will preserve it"

# ---------------------------------------------------------------------------
# Step 0: Create backups
# ---------------------------------------------------------------------------
info "Creating timestamped backups at ${BACKUP_DIR}"
run_cmd mkdir -p "$BACKUP_DIR"
for f in "$NAV_FILE" "$TYPES_FILE" "$SETUP_FILE"; do
  [[ -f "$f" ]] && run_cmd cp "$f" "${BACKUP_DIR}/"
done

# Track line savings
LINES_SAVED=0

# =============================================================================
# STEP 1: Add getNavItemsGroupedByBusinessDomain() to NavigationRegistryV2
# =============================================================================
echo ""
box_top
box_line "STEP 1: Add getNavItemsGroupedByBusinessDomain() method"
box_bottom

# Check if method already exists (idempotent)
if grep -q 'getNavItemsGroupedByBusinessDomain' "$NAV_FILE" 2>/dev/null; then
  ok "Method already exists — skipping"
else
  info "Inserting getNavItemsGroupedByBusinessDomain() before getAllModuleCodes()"

  NEW_METHOD='
  getNavItemsGroupedByBusinessDomain(
    hasPermission?: (perm: string) => boolean
  ): Record<string, ModuleCardConfig[]> {
    const grouped: Record<string, ModuleCardConfig[]> = {};
    const allCards = this.getModuleCards(hasPermission);

    for (const card of allCards) {
      const domain = card.suite || '"'"'other'"'"';
      if (!grouped[domain]) {
        grouped[domain] = [];
      }
      grouped[domain].push(card);
    }

    return grouped;
  }

'

  if [[ "$DRY_RUN" == "1" ]]; then
    dry_echo "perl -i -pe insertion before getAllModuleCodes in ${NAV_FILE}"
  else
    # Use perl to insert before the getAllModuleCodes method
    # Match the line with "getAllModuleCodes" and insert before it
    perl -i -0pe "s/\n  (getAllModuleCodes\(\): string\[\])/\n${NEW_METHOD}  \1/" "$NAV_FILE"
  fi

  if [[ "$DRY_RUN" == "1" ]]; then
    ok "Method would be added (dry-run)"
    METHOD_LINES=$(echo "$NEW_METHOD" | wc -l | tr -d ' ')
    info "Lines to add: ${METHOD_LINES}"
  elif grep -q 'getNavItemsGroupedByBusinessDomain' "$NAV_FILE" 2>/dev/null; then
    ok "Method added successfully"
    METHOD_LINES=$(echo "$NEW_METHOD" | wc -l | tr -d ' ')
    info "Lines added: ${METHOD_LINES}"
  else
    err "Failed to add method"
  fi
fi

# =============================================================================
# STEP 2: Create test setup file (file mock only — setup.ts already exists)
# =============================================================================
echo ""
box_top
box_line "STEP 2: Create test setup files"
box_bottom

# setup.ts already exists with comprehensive mocks — only add fileMock
if [[ -f "$FILEMOCK_FILE" ]]; then
  ok "fileMock already exists — skipping"
else
  info "Creating ${FILEMOCK_DIR}/fileMock.ts"
  run_cmd mkdir -p "$FILEMOCK_DIR"

  FILEMOCK_CONTENT='export default {};
'

  if [[ "$DRY_RUN" == "1" ]]; then
    dry_echo "Create ${FILEMOCK_FILE}"
  else
    printf '%s' "$FILEMOCK_CONTENT" > "$FILEMOCK_FILE"
  fi

  if [[ "$DRY_RUN" == "1" ]]; then
    ok "fileMock.ts would be created (dry-run)"
  elif [[ -f "$FILEMOCK_FILE" ]]; then
    ok "fileMock.ts created"
  else
    err "Failed to create fileMock.ts"
  fi
fi

if [[ -f "$SETUP_FILE" ]]; then
  ok "setup.ts already exists (managed by phase7-1)"
else
  info "setup.ts not found — it should have been created in phase 7-1"
  warn "Skipping setup.ts creation (will be handled by the correct phase script)"
fi

# =============================================================================
# STEP 3: Remove duplicate lazyWithRetry from routes/v2/types.ts
# =============================================================================
echo ""
box_top
box_line "STEP 3: Remove duplicate lazyWithRetry"
box_bottom

# Verify the source of truth in utils.ts
if ! grep -q 'export const lazyWithRetry' "$UTILS_FILE"; then
  err "lazyWithRetry not found in utils.ts — cannot proceed safely"
fi

# Check if types.ts still has its own definition (not yet refactored)
if grep -q "const MAX_RETRIES = 3" "$TYPES_FILE" 2>/dev/null; then
  info "Duplicate lazyWithRetry found in types.ts — removing"

  # Count lines before
  LINES_BEFORE=$(wc -l < "$TYPES_FILE" | tr -d ' ')

  if [[ "$DRY_RUN" == "1" ]]; then
    dry_echo "Replace top section of ${TYPES_FILE} with import + re-export"
    dry_echo "Remove: import { lazy } from 'react';"
    dry_echo "Remove: import ErrorPage from '../../pages/shared/ErrorPage';"
    dry_echo "Remove: import { logger } from '@/utils/logger';"
    dry_echo "Remove: const MAX_RETRIES / RETRY_DELAY_MS / lazyWithRetry function (lines 3-37)"
    dry_echo "Add:    import { lazyWithRetry } from '../utils';"
    dry_echo "Add:    export { lazyWithRetry };"
  else
    # Create the replacement header
    # Original lines 1-37 are: imports + constants + lazyWithRetry function
    # We keep line 1 (type import from react) and line 2 (type import React)
    # But wait — the actual file has:
    #   line 1: import type { ComponentType, LazyExoticComponent, ReactElement } from 'react';
    #   line 2: import { lazy } from 'react';
    #   line 3: import ErrorPage from '../../pages/shared/ErrorPage';
    #   line 4: import { logger } from '@/utils/logger';
    #   line 5: (empty)
    #   line 6: const MAX_RETRIES = 3;
    #   line 7: const RETRY_DELAY_MS = 1000;
    #   line 8: (empty)
    #   line 9-36: lazyWithRetry function
    #   line 37: };  (end of function)
    #   line 38: (empty)
    #   line 39+: type definitions

    # Use perl to replace everything from "import { lazy }" through the lazyWithRetry closing
    # We match from line 2 through line 37 (the function definition + closing brace + semicolon + empty line)
    perl -i -0pe "s/^import \{ lazy \} from 'react';\n.*?^\};\n\nexport type PageTemplateType/import { lazyWithRetry } from '..\/utils';\n\nexport { lazyWithRetry };\n\nexport type PageTemplateType/ms" "$TYPES_FILE"
  fi

  # Verify the result
  if [[ "$DRY_RUN" == "1" ]]; then
    ok "Would replace duplicate lazyWithRetry with re-export (dry-run)"
    LINES_SAVED=$((LINES_SAVED + 32))
  else
    LINES_AFTER=$(wc -l < "$TYPES_FILE" | tr -d ' ')
    LINES_SAVED=$((LINES_SAVED + LINES_BEFORE - LINES_AFTER))

    # Validate the file still contains essential content
    if grep -q 'RouteConfig' "$TYPES_FILE" && grep -q 'flattenRoutes' "$TYPES_FILE" && grep -q "from '../utils'" "$TYPES_FILE"; then
      ok "Duplicate removed successfully"
      info "Lines before: ${LINES_BEFORE}, after: ${LINES_AFTER}, saved: $((LINES_BEFORE - LINES_AFTER))"
    else
      err "Validation failed — file may be corrupted. Restore from ${BACKUP_DIR}/"
    fi

    # Verify no remaining direct imports that are no longer needed
    if grep -q "import ErrorPage" "$TYPES_FILE" 2>/dev/null; then
      warn "ErrorPage import still present (may need manual cleanup)"
    fi
    if grep -q "import { lazy }" "$TYPES_FILE" 2>/dev/null; then
      warn "lazy import still present (may need manual cleanup)"
    fi
  fi
else
  ok "Already refactored — no duplicate found"
fi

# =============================================================================
# STEP 4: Create NavigationRegistryV2 unit test
# =============================================================================
echo ""
box_top
box_line "STEP 4: Create NavigationRegistryV2 unit test"
box_bottom

if [[ -f "$TEST_FILE" ]]; then
  ok "Test file already exists — skipping"
else
  info "Creating ${TEST_FILE}"
  run_cmd mkdir -p "$TEST_DIR"

  TEST_CONTENT='import { describe, it, expect, beforeEach, afterEach } from '\''vitest'\'';
import { NavigationRegistryV2 } from '\''../NavigationRegistryV2'\'';

describe('\''NavigationRegistryV2'\'', () => {
  let registry: NavigationRegistryV2;
  const registeredCodes: string[] = [];

  beforeEach(() => {
    registry = NavigationRegistryV2.getInstance();
  });

  afterEach(() => {
    // Clean up any modules registered during tests
    for (const code of registeredCodes) {
      registry.unregisterModule(code);
    }
    registeredCodes.length = 0;
  });

  it('\''should be a singleton'\'', () => {
    const instance1 = NavigationRegistryV2.getInstance();
    const instance2 = NavigationRegistryV2.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('\''should register and retrieve modules'\'', () => {
    registry.registerModule({
      code: '\''test-phase3'\'',
      name: '\''Test Module'\'',
      icon: '\''Test'\'',
      path: '\''/test-phase3'\'',
      source: '\''core'\'',
      navItems: [],
    });
    registeredCodes.push('\''test-phase3'\'');
    expect(registry.getModule('\''test-phase3'\'')).toBeDefined();
    expect(registry.getModule('\''test-phase3'\'')?.name).toBe('\''Test Module'\'');
  });

  it('\''should unregister modules'\'', () => {
    registry.registerModule({
      code: '\''test-remove'\'',
      name: '\''Remove Me'\'',
      icon: '\''Test'\'',
      path: '\''/test-remove'\'',
      source: '\''core'\'',
      navItems: [],
    });
    registeredCodes.push('\''test-remove'\'');
    expect(registry.getModule('\''test-remove'\'')).toBeDefined();
    registry.unregisterModule('\''test-remove'\'');
    expect(registry.getModule('\''test-remove'\'')).toBeUndefined();
  });

  it('\''should return all module codes'\'', () => {
    const codes = registry.getAllModuleCodes();
    expect(Array.isArray(codes)).toBe(true);
  });

  it('\''should group modules by business domain'\'', () => {
    registry.registerModule({
      code: '\''test-suite-a'\'',
      name: '\''Suite A'\'',
      icon: '\''Test'\'',
      path: '\''/test-suite-a'\'',
      source: '\''core'\'',
      suite: '\''finance'\'',
      navItems: [],
    });
    registeredCodes.push('\''test-suite-a'\'');

    registry.registerModule({
      code: '\''test-suite-b'\'',
      name: '\''Suite B'\'',
      icon: '\''Test'\'',
      path: '\''/test-suite-b'\'',
      source: '\''core'\'',
      suite: '\''finance'\'',
      navItems: [],
    });
    registeredCodes.push('\''test-suite-b'\'');

    registry.registerModule({
      code: '\''test-suite-c'\'',
      name: '\''Suite C'\'',
      icon: '\''Test'\'',
      path: '\''/test-suite-c'\'',
      source: '\''core'\'',
      suite: '\''hr'\'',
      navItems: [],
    });
    registeredCodes.push('\''test-suite-c'\'');

    registry.registerModule({
      code: '\''test-no-suite'\'',
      name: '\''No Suite'\'',
      icon: '\''Test'\'',
      path: '\''/test-no-suite'\'',
      source: '\''core'\'',
      navItems: [],
    });
    registeredCodes.push('\''test-no-suite'\'');

    const grouped = registry.getNavItemsGroupedByBusinessDomain();
    expect(grouped).toBeDefined();
    expect(grouped['\''finance'\'']).toBeDefined();
    expect(grouped['\''finance'\''].length).toBeGreaterThanOrEqual(2);
    expect(grouped['\''hr'\'']).toBeDefined();
    expect(grouped['\''other'\'']).toBeDefined();
    expect(grouped['\''other'\''].length).toBeGreaterThanOrEqual(1);
  });

  it('\''should respect permission filter when grouping'\'', () => {
    registry.registerModule({
      code: '\''test-perm'\'',
      name: '\''Perm Module'\'',
      icon: '\''Test'\'',
      path: '\''/test-perm'\'',
      source: '\''core'\'',
      permission: '\''admin.view'\'',
      navItems: [],
    });
    registeredCodes.push('\''test-perm'\'');

    const hasPermission = (perm: string) => perm !== '\''admin.view'\'';
    const grouped = registry.getNavItemsGroupedByBusinessDomain(hasPermission);

    // The test-perm module should NOT appear in any group
    const allCards = Object.values(grouped).flat();
    const found = allCards.find((c) => c.code === '\''test-perm'\'');
    expect(found).toBeUndefined();
  });

  it('\''should emit navigationUpdated event on register/unregister'\'', () => {
    const listener = vi.fn();
    registry.emitter.on('\''navigationUpdated'\'', listener);

    registry.registerModule({
      code: '\''test-event'\'',
      name: '\''Event Test'\'',
      icon: '\''Test'\'',
      path: '\''/test-event'\'',
      source: '\''core'\'',
      navItems: [],
    });
    registeredCodes.push('\''test-event'\'');
    expect(listener).toHaveBeenCalledWith('\''test-event'\'');

    registry.unregisterModule('\''test-event'\'');
    expect(listener).toHaveBeenCalledTimes(2);
    registry.emitter.off('\''navigationUpdated'\'', listener);
  });
});
'

  if [[ "$DRY_RUN" == "1" ]]; then
    dry_echo "Create ${TEST_FILE}"
  else
    printf '%s' "$TEST_CONTENT" > "$TEST_FILE"
  fi

  if [[ "$DRY_RUN" == "1" ]]; then
    TEST_LINES=$(echo "$TEST_CONTENT" | wc -l | tr -d ' ')
    ok "Test file would be created (dry-run, ${TEST_LINES} lines)"
  elif [[ -f "$TEST_FILE" ]]; then
    TEST_LINES=$(wc -l < "$TEST_FILE" | tr -d ' ')
    ok "Test file created (${TEST_LINES} lines)"
  else
    err "Failed to create test file"
  fi
fi

# =============================================================================
# SUMMARY
# =============================================================================
echo ""
box_top
box_line "SUMMARY"
box_bottom

echo ""
echo -e "  ${GREEN}+${RESET} NavigationRegistryV2.getNavItemsGroupedByBusinessDomain()"
if [[ -f "$FILEMOCK_FILE" ]]; then
  echo -e "  ${GREEN}+${RESET} test/__mocks__/fileMock.ts created"
else
  echo -e "  ${DIM}-${RESET} test/__mocks__/fileMock.ts (already existed or skipped)"
fi
if grep -q "from '../utils'" "$TYPES_FILE" 2>/dev/null; then
  echo -e "  ${GREEN}+${RESET} Duplicate lazyWithRetry removed from routes/v2/types.ts"
  echo -e "  ${GREEN}+${RESET} lazyWithRetry now re-exported from routes/utils.ts"
else
  echo -e "  ${DIM}-${RESET} lazyWithRetry already refactored or unchanged"
fi
if [[ -f "$TEST_FILE" ]]; then
  echo -e "  ${GREEN}+${RESET} NavigationRegistryV2.test.ts created"
else
  echo -e "  ${DIM}-${RESET} NavigationRegistryV2.test.ts (already existed or skipped)"
fi

echo ""
echo -e "  Lines saved: ${BOLD}${LINES_SAVED}${RESET}"
echo -e "  Backups:     ${DIM}${BACKUP_DIR}/${RESET}"

echo ""
box_top
box_line "Phase 3 complete."
box_bottom
