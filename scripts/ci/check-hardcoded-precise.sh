#!/usr/bin/env bash
# Gate E · Hardcoded CJK precise scan
# Scans staged .ts/.tsx files for hardcoded CJK strings using the precise scanner.
set -euo pipefail

STAGED_TS_TSX=$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null | grep -E '\.(ts|tsx)$' | tr '\n' ' ' || true)
[ -z "$STAGED_TS_TSX" ] && exit 0

if [ -f 'scripts/i18n/scan-hardcoded-precise.cjs' ]; then
  # shellcheck disable=SC2086  -- word-splitting is intentional for file list
  node scripts/i18n/scan-hardcoded-precise.cjs --strict --details 30 $STAGED_TS_TSX
fi

exit 0
