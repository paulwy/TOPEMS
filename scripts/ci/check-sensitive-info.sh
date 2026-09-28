#!/usr/bin/env bash
# Gate O · Sensitive Information Scan — migrated from husky #2
# Scans staged diff (added/modified lines only) for potential secrets.
# Using diff-only scanning avoids false positives from pre-existing code.
set -euo pipefail

STAGED=$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null || echo "")
[ -z "$STAGED" ] && exit 0

MAX_SIZE=1048576  # 1MB

PATTERNS=(
  'password\s*=\s*["'"'"'"][^"'"'"'"]+["'"'"'"]'
  'secret\s*=\s*["'"'"'"][^"'"'"'"]+["'"'"'"]'
  'api[_-]?key\s*=\s*["'"'"'"][^"'"'"'"]+["'"'"'"]'
  'private[_-]?key\s*=\s*["'"'"'"][^"'"'"'"]+["'"'"'"]'
  'token\s*=\s*["'"'"'"][^"'"'"'"]+["'"'"'"]'
  'AWS_ACCESS_KEY_ID\s*=\s*["'"'"'"][A-Z0-9]{16,}["'"'"'"]'
  'AWS_SECRET_ACCESS_KEY\s*=\s*["'"'"'"][A-Za-z0-9/+=]{40,}["'"'"'"]'
  '-----BEGIN PRIVATE KEY-----'
  '-----BEGIN RSA PRIVATE KEY-----'
)

FOUND=""

for f in $STAGED; do
  [ -f "$f" ] || continue

  # Skip lockfiles, database, and documentation
  case "$f" in
    pnpm-lock.yaml|*-lock.yaml|database/postgres_data/*|docs/*|*.md) continue ;;
  esac

  # Check file extension for key/cert files
  case "$f" in
    *.key|*.pem|*.p12|*.pfx)
      FOUND="${FOUND}  - $f (key/cert file)\n"
      continue
      ;;
  esac

  # Check file size
  SIZE=$(wc -c < "$f" 2>/dev/null || echo 0)
  [ "$SIZE" -gt "$MAX_SIZE" ] && continue

  # Extract only added/modified lines from the staged diff
  # (lines starting with '+' but not '+++')
  DIFF_LINES=$(git diff --cached -- "$f" 2>/dev/null | grep '^+' | grep -v '^+++' || true)
  [ -z "$DIFF_LINES" ] && continue

  # 过滤值为变量引用（如 PGPASSWORD="$DB_PASSWORD"、secret="$VAR"）的赋值行，
  # 以及占位符提示行（如 echo "用法: DB_PASSWORD='<口令>' ..."）：
  # 两者都不是硬编码密钥，避免误报
  DIFF_LINES=$(printf '%s\n' "$DIFF_LINES" | grep -vE '^[+][^=]*=[[:space:]]*"?[$]|<(口令|password|DB_PASSWORD|TOPEMS_DB_PASSWORD|new_password)>' || true)
  [ -z "$DIFF_LINES" ] && continue

  for p in "${PATTERNS[@]}"; do
    if echo "$DIFF_LINES" | grep -qiE "$p" 2>/dev/null; then
      FOUND="${FOUND}  - $f (matched: $p)\n"
      break
    fi
  done
done

if [ -n "$FOUND" ]; then
  echo "⚠️  Potential sensitive information detected:"
  printf "$FOUND"
  echo "   If false positive, use --no-verify to skip."
  exit 1
fi

exit 0
