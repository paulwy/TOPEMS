#!/bin/bash
# frontend-lint pre-commit gate: eslint --fix + prettier --write on staged web src files.
# Runs inside lefthook's shell; delegated to Git Bash bash for cross-platform consistency.
set -e
cd "$(git rev-parse --show-toplevel)"

STAGED=$(git diff --cached --name-only --diff-filter=ACM | grep -E '^apps/web/src/.*\.(ts|tsx)$' || true)
[ -z "$STAGED" ] && exit 0

cd apps/web
FILES=$(echo "$STAGED" | sed 's|^apps/web/||' | tr -d '\r')

# shellcheck disable=SC2086
npx eslint $FILES --fix
# shellcheck disable=SC2086
npx prettier --write $FILES

cd "$(git rev-parse --show-toplevel)"
# git 2.50: tracked files under an ignored dir return exit 1 on `git add <path>`.
# STAGED paths all come from the index (tracked/staged), so -f only re-stages
# their modifications and never introduces new ignored files.
git add -f $(echo "$STAGED" | tr -d '\r')
