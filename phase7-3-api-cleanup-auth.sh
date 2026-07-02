#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Phase 7-3 — API Cleanup + Service Registry + Error Handler
#
# Changes:
#   1. client.ts — remove notification 401 fake-success & related dead code
#   2. config/serviceRegistry.ts — unified service registry (new)
#   3. utils/errorHandler.ts — global error handler (new)
#   4. store/index.ts — add errorHandler export
#
# Note: authStore.ts already exists and is more complete than the template.
# Note: client.ts has no [HRM DEBUG]/[NOTIFICATION DEBUG] console.log residuals;
#       debug logging is already normalized via apiLogger.
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
python3 "$SCRIPT_DIR/phase7-3-apply.py"
