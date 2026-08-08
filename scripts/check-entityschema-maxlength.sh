#!/usr/bin/env bash
# =============================================================================
# check-entityschema-maxlength.sh — CI 缓存包装脚本
# =============================================================================
#
# 缓存层: cache_layer_schema_naming
#   - apps/web/src/schema/
#   - apps/web/src/schemas/
#   - packages/shared-types/src/schema/（若存在）
#
# 被包装脚本: scripts/check-entityschema-maxlength.mjs
#
# 行为:
#   1. 计算缓存层 hash
#   2. 命中缓存 → 重放上次 stdout + 相同 exit code，跳过 node 执行
#   3. 未命中   → 执行 node 脚本，捕获 stdout 和 exit code，写入缓存
#
# 参数:
#   所有参数原样透传给 .mjs 脚本（例如 --strict）
#
# 缓存目录可通过 TOPEMS_CI_CACHE_DIR 环境变量覆盖
# =============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UTILS_FILE="${SCRIPT_DIR}/ci-cache-utils.sh"

if [[ ! -f "$UTILS_FILE" ]]; then
  echo "[check-entityschema-maxlength] ERROR: ci-cache-utils.sh not found at $UTILS_FILE" >&2
  exit 2
fi

# shellcheck source=./ci-cache-utils.sh
source "$UTILS_FILE"

SCRIPT_NAME="check-entityschema-maxlength"
NODE_SCRIPT="${SCRIPT_DIR}/check-entityschema-maxlength.mjs"

# 1. 计算分层 hash
_HASH=$(cache_layer_schema_naming "$SCRIPT_NAME")
_LAST_CACHE_HASH="$_HASH"

# 2. 尝试命中缓存
_CACHE_TMP="$(mktemp -t topems-cache-XXXXXX)"
trap 'rm -f "$_CACHE_TMP"' EXIT

set +e
check_cache "$SCRIPT_NAME" "$_HASH" > "$_CACHE_TMP" 2>&1
_CACHE_HIT=$?
set -e

if [[ "$_CACHE_HIT" -eq 0 ]]; then
  _LAST_LINE=""
  while IFS= read -r _line; do
    if [[ -n "$_LAST_LINE" ]]; then
      printf '%s\n' "$_LAST_LINE"
    fi
    _LAST_LINE="$_line"
  done < "$_CACHE_TMP"
  if [[ "$_LAST_LINE" =~ ^\[CACHE:EXIT:([0-9]+)\]$ ]]; then
    _exit_code="${BASH_REMATCH[1]}"
    printf '[CACHE HIT] %s (hash=%.12s) replay exit=%s\n' "$SCRIPT_NAME" "$_HASH" "$_exit_code" >&2
    exit "$_exit_code"
  else
    printf '%s\n' "$_LAST_LINE"
    printf '[CACHE HIT] %s (hash=%.12s) replay (fallback exit=0)\n' "$SCRIPT_NAME" "$_HASH" >&2
    exit 0
  fi
fi

# 3. 缓存未命中 → 执行实际脚本并捕获
_STDOUT_TMP="$(mktemp -t topems-stdout-XXXXXX)"
trap 'rm -f "$_CACHE_TMP" "$_STDOUT_TMP"' EXIT

set +e
node "$NODE_SCRIPT" "$@" > "$_STDOUT_TMP" 2>&1
_REAL_EXIT=$?
set -e

cat "$_STDOUT_TMP"

# 4. 写入缓存
write_cache "$SCRIPT_NAME" "$_HASH" "$_REAL_EXIT" "$_STDOUT_TMP"

printf '[CACHE WRITE] %s (hash=%.12s) exit=%s\n' "$SCRIPT_NAME" "$_HASH" "$_REAL_EXIT" >&2

exit "$_REAL_EXIT"
